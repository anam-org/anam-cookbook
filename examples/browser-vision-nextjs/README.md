# Browser vision with Sightline

An Anam avatar that can see the page the user is on. [Sightline](https://github.com/Smidge/sightline) reads accessible headings, controls and status messages and turns it into a short text outline. The persona gets that outline whenever the user moves around, and it can ring controls on screen while it walks the user through a task.

The app is a made-up hosting dashboard called Acme Cloud, with Projects, API keys and Settings pages. Ask Mia "how do I create an API key?" from any page and she'll guide you there one step at a time.

This is a local demo. The session-token endpoint has no authentication or usage limits. Do not expose it publicly until you add both; anyone who can reach it can create sessions charged to your Anam account.

## Setup

You'll need Node.js 22 or later (24 LTS recommended) and pnpm 10 or later.

1. Copy `.env.example` to `.env.local` and add your API key:

```bash
cp .env.example .env.local
```

2. Install dependencies:

```bash
pnpm install
```

3. Run the development server:

```bash
pnpm dev
```

4. Open [http://localhost:3000](http://localhost:3000), click **Talk to Mia** and ask how to do something, such as "How do I create an API key?" or "Where do I turn off email notifications?"

## How it works

- `src/lib/browser-vision.ts` is the whole integration. `giveBrowserVision(client)` registers two client tools and watches the page. Each time the user navigates, opens or closes a dialog, or an alert or status message appears, it sends the new outline with `client.addContext()`.
- `src/config/persona.ts` defines the persona, the `look_at_screen` and `highlight` client tools, and a system prompt that explains the `[screen]` messages.
- `src/components/AvatarDock.tsx` starts the session and calls `giveBrowserVision`. It lives in the root layout, so the session survives navigation, and it is marked `data-avatar-dock` so the outline never describes it.
- `src/components/Dialog.tsx` marks the rest of the app `inert` while it's open, so the persona only sees the dialog.

Sightline omits text-field values. Values rendered elsewhere, such as submitted names and status messages, can appear. Inspect the outline before using it on pages with sensitive data.

## Checks

Run `pnpm test` for regression tests covering highlighting, session-token errors and avatar session cleanup. Run `pnpm lint` and `pnpm build` after changing the example. The tests use a stand-in Anam client; test a live session separately.
