import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

// Run the real TypeScript handlers with controlled SDK and network boundaries.
function load(source, modules, globals = {}) {
  const code = ts.transpileModule(readFileSync(new URL(source, import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const exports = {};
  vm.runInNewContext(code, {
    exports, console: { error() {} }, AbortSignal, AbortController,
    require(name) {
      assert.ok(name in modules, `Unexpected import: ${name}`);
      return modules[name];
    },
    ...globals,
  });
  return exports;
}

function vision() {
  const a = { name: "Save" }, b = { name: "Cancel" };
  // Sightline 0.2.1 prunes refs omitted from the final outline, including truncation.
  const state = {
    outline: { text: 'button "Save" [ref=e1]\nbutton "Cancel" [ref=e2]', refs: new Map([["e1", a], ["e2", b]]) },
    highlighted: null,
  };
  const handlers = new Map();
  const { giveBrowserVision } = load("../src/lib/browser-vision.ts", {
    "@anam-ai/js-sdk": { AnamEvent: {}, MessageRole: {} },
    "@smidge/sightline": {
      createSightline: () => ({ capture: () => state.outline, highlight: el => { state.highlighted = el; } }),
      describeElement: el => ({ name: el.name }),
    },
  });
  giveBrowserVision({
    registerToolCallHandler: (name, handler) => { handlers.set(name, handler); return () => {}; },
    addListener() {},
  });
  return { state, a, b, call: args => handlers.get("highlight").onStart({ arguments: args }) };
}

test("highlight uses a current matching ref, and recovers from a wrong ref", async () => {
  const { state, a, call } = vision();
  assert.equal(await call({ name: '"Save"', ref: "[ref=e1]" }), "Highlighted.");
  assert.equal(state.highlighted, a);
  state.highlighted = null;
  assert.equal(await call({ name: "Save", ref: "e2" }), "Highlighted.");
  assert.equal(state.highlighted, a);
});

test("highlight rejects controls outside the current outline and ref-as-name requests", async () => {
  const { state, call } = vision();
  for (const args of [{ name: "Hidden" }, { name: "Hidden", ref: "e3" }, { name: "e1" }]) {
    assert.match(await call(args), /^Not found/);
    assert.equal(state.highlighted, null);
  }
});

test("duplicate names require a matching ref; stale controls cannot be highlighted", async () => {
  const { state, a, b, call } = vision();
  b.name = "Save";
  assert.match(await call({ name: "Save" }), /^Not found/);
  assert.equal(await call({ name: "Save", ref: "e2" }), "Highlighted.");
  assert.equal(state.highlighted, b);
  state.highlighted = null;
  state.outline = { text: 'button "Cancel" [ref=e4]', refs: new Map([["e4", { name: "Cancel" }]]) };
  assert.match(await call({ name: a.name, ref: "e1" }), /^Not found/);
  assert.equal(state.highlighted, null);
});

function tokenRoute(fetch, key = "test-key") {
  return load("../src/app/api/session-token/route.ts", {
    "next/server": { NextResponse: { json: (body, options) => ({ body, status: options?.status ?? 200 }) } },
    "@/config/persona": { personaConfig: {} },
  }, { fetch, process: { env: { ANAM_API_KEY: key } } }).POST;
}

test("token route returns JSON for network, parsing, and missing-token failures", async () => {
  for (const fetch of [
    async () => { throw new Error("offline"); },
    async () => ({ ok: true, json: async () => { throw new Error("invalid JSON"); } }),
    async () => ({ ok: true, json: async () => ({}) }),
  ]) {
    const result = await tokenRoute(fetch)();
    assert.equal(result.status, 500);
    assert.equal(result.body.error, "Failed to get session token");
  }
});

test("token route handles missing config, upstream rejection, and success", async () => {
  assert.equal((await tokenRoute(() => assert.fail("must not fetch"), "")()).status, 500);
  assert.equal((await tokenRoute(async () => ({ ok: false, status: 429 }))()).status, 429);
  const result = await tokenRoute(async (_url, options) => {
    assert.equal(options.headers.Authorization, "Bearer test-key");
    assert.ok(options.signal instanceof AbortSignal);
    return { ok: true, json: async () => ({ sessionToken: "session" }) };
  })();
  assert.equal(result.status, 200);
  assert.equal(result.body.sessionToken, "session");
});

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function dock(fetch) {
  const states = [], clients = [], effects = [];
  const { AvatarDock } = load("../src/components/AvatarDock.tsx", {
    react: {
      useState: value => [value, next => states.push(next)],
      useRef: value => ({ current: value }),
      useEffect: effect => effects.push(effect()),
    },
    "react/jsx-runtime": { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
    "@/lib/browser-vision": { giveBrowserVision: client => () => { client.visionStops++; } },
    "@anam-ai/js-sdk": {
      AnamEvent: { CONNECTION_ESTABLISHED: "open", CONNECTION_CLOSED: "close" },
      ConnectionClosedCode: { NORMAL: "normal" },
      createClient: () => {
        const stream = deferred(), events = new Map();
        const client = {
          stream, events, stops: 0, visionStops: 0,
          addListener: (event, callback) => events.set(event, callback),
          streamToVideoElement: () => stream.promise,
          stopStreaming: async () => { client.stops++; },
        };
        clients.push(client);
        return client;
      },
    },
  }, { fetch });
  const tree = AvatarDock();
  function findStart(node) {
    if (!node || typeof node !== "object") return;
    if (node.type === "button") return node.props.onClick;
    for (const child of [node.props?.children].flat()) {
      const result = findStart(child);
      if (result) return result;
    }
  }
  return { start: findStart(tree), unmount: () => effects.forEach(fn => fn()), states, clients };
}

const tokenResponse = () => ({ ok: true, json: async () => ({ sessionToken: "test" }) });
const flush = () => new Promise(resolve => setImmediate(resolve));

test("a failed stream is stopped; old events and rejections cannot affect a retry", async () => {
  const app = dock(async () => tokenResponse());
  const first = app.start();
  await flush();
  app.clients[0].stream.reject(new Error("stream failed"));
  await first;
  assert.equal(app.clients[0].stops, 1);
  assert.equal(app.clients[0].visionStops, 1);
  assert.equal(app.states.at(-1), "error");
  const second = app.start();
  await flush();
  const count = app.states.length;
  app.clients[0].events.get("open")();
  app.clients[0].events.get("close")("normal");
  assert.equal(app.states.length, count);
  app.clients[1].events.get("open")();
  assert.equal(app.states.at(-1), "connected");
  app.unmount();
  app.clients[1].stream.reject(new Error("late failure"));
  await second;
  assert.equal(app.clients[1].stops, 1);
  assert.equal(app.states.at(-1), "connected");
});

test("unmount cancels token fetch and never creates a late client", async () => {
  const request = deferred();
  let signal;
  const app = dock((_url, options) => { signal = options.signal; return request.promise; });
  const start = app.start();
  app.unmount();
  assert.equal(signal.aborted, true);
  request.resolve(tokenResponse());
  await start;
  assert.equal(app.clients.length, 0);
});

test("vision waits for the greeting and cleans up watching and tools", () => {
  const listeners = new Map(), handlers = new Map(), contexts = [];
  let watchOptions, watchCallback, stopped = false, streaming = true;
  const { giveBrowserVision } = load("../src/lib/browser-vision.ts", {
    "@anam-ai/js-sdk": { AnamEvent: { MESSAGE_STREAM_EVENT_RECEIVED: "message" }, MessageRole: { PERSONA: "persona" } },
    "@smidge/sightline": {
      createSightline: () => ({
        watch(callback, options) {
          watchCallback = callback;
          watchOptions = options;
          callback({ outline: { text: "initial page" } });
          return () => { stopped = true; };
        },
      }),
    },
  });
  const cleanup = giveBrowserVision({
    registerToolCallHandler: (name, handler) => { handlers.set(name, handler); return () => handlers.delete(name); },
    addListener: (event, callback) => listeners.set(event, callback),
    removeListener: event => listeners.delete(event),
    isStreaming: () => streaming,
    addContext: message => contexts.push(message),
  });
  assert.equal(contexts.length, 0);
  listeners.get("message")({ role: "user" });
  assert.equal(watchCallback, undefined);
  listeners.get("message")({ role: "persona" });
  assert.equal(watchOptions.updates, false);
  assert.equal(listeners.size, 0);
  assert.equal(contexts[0], "[screen] initial page");
  streaming = false;
  watchCallback({ outline: { text: "later" } });
  assert.equal(contexts.length, 1);
  cleanup();
  assert.equal(stopped, true);
  assert.equal(handlers.size, 0);
});

test("highlight matches quoted outline names and rejects unnamed controls", async () => {
  const { state, a, call } = vision();
  a.name = 'Open "draft"';
  assert.equal(await call({ name: "Open 'draft'", ref: "e1" }), "Highlighted.");
  state.highlighted = null;
  a.name = "";
  assert.match(await call({ name: "", ref: "e1" }), /^Not found/);
  assert.equal(state.highlighted, null);
});

test("dock gives a useful error for a non-JSON token response", async () => {
  const app = dock(async () => ({ ok: false, json: async () => { throw new Error("HTML response"); } }));
  await app.start();
  assert.ok(app.states.includes("Failed to get session token"));
  assert.equal(app.clients.length, 0);
});
