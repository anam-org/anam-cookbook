import type { AnamClient, ToolCallHandler, ToolCallStartedPayload } from "@anam-ai/js-sdk";
import type { AddResult, CartSummary } from "@/lib/cart";
import type { ProductDetails, ProductSummary } from "@/lib/catalog";

// Browser-side handlers for the client tools in src/config/assistant.ts.
// Each one calls the store's own endpoints and returns plain text for the
// persona's LLM to read: facts first, and what to do next when it fails.

export const CART_UPDATED = "cart:updated";

/** The store answered with an error, so nothing changed. */
class StoreError extends Error {}

async function getJson<T>(url: string, signal: AbortSignal, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, signal });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new StoreError(body.error ?? `Request failed with ${response.status}`);
  }
  return response.json();
}

/** The product handle in the address bar, when the shopper is on a product page. */
function productOnScreen() {
  return location.pathname.match(/^\/products\/([\w-]+)$/)?.[1] ?? "";
}

/** The one variant matching the options the persona passed, if there is exactly one. */
function pickVariant(product: ProductDetails, wanted: Record<string, string>) {
  if (product.variants.length === 1) return { variant: product.variants[0] };
  // Option names match without case, and "Color" finds "Colour".
  const normalise = (name: string) => name.trim().toLowerCase().replace("colour", "color");
  const value = (name: string) => {
    const key = Object.keys(wanted).find((given) => normalise(given) === normalise(name));
    return key ? String(wanted[key]).trim().toLowerCase() : "";
  };
  const missing = product.options.filter(
    (option) => option.values.length > 1 && !value(option.name),
  );
  if (missing.length > 0) return { missing };
  const variant = product.variants.find((candidate) =>
    product.options.every(
      (option, index) =>
        option.values.length === 1 || candidate.options[index].toLowerCase() === value(option.name),
    ),
  );
  return { variant };
}

/** `callSignal` is aborted when the call ends. */
export function registerShoppingTools(
  client: AnamClient,
  ui: { showProducts(products: ProductSummary[]): void },
  callSignal: AbortSignal,
) {
  const running = new Map<string, AbortController>();

  /**
   * Gives each tool call one signal for all of its requests. It's aborted
   * when the call ends, when the SDK reports the tool call failed, or 6
   * seconds after the tool call started. That's inside the tools' 8-second
   * timeout, so the persona hears what happened, and a handler that's still
   * running can't change the cart or the cards afterwards.
   */
  function toolHandler(
    run: (args: ToolCallStartedPayload["arguments"], signal: AbortSignal) => Promise<string>,
  ): ToolCallHandler {
    return {
      onStart: async ({ arguments: args, toolCallId }) => {
        const failed = new AbortController();
        running.set(toolCallId, failed);
        const signal = AbortSignal.any([callSignal, failed.signal, AbortSignal.timeout(6_000)]);
        try {
          return await run(args, signal);
        } finally {
          running.delete(toolCallId);
        }
      },
      onFail: async ({ toolCallId }) => running.get(toolCallId)?.abort(),
    };
  }

  let latestSearch = 0;

  const stops = [
    client.registerToolCallHandler(
      "search_products",
      toolHandler(async (args, signal) => {
        const search = ++latestSearch;
        const params = new URLSearchParams({ q: String(args.query ?? "") });
        if (args.max_price) params.set("max_price", String(args.max_price));
        const { products } = await getJson<{ products: ProductSummary[] }>(
          `/api/products?${params}`,
          signal,
        );
        // A slow older search mustn't replace the cards from a newer one.
        if (search !== latestSearch) return "A newer search replaced these results.";
        const shown = products.slice(0, 3);
        // Clear the old cards too when nothing matches.
        ui.showProducts(shown);
        if (shown.length === 0) {
          return `No products match "${args.query}". Try a broader word, or ask what they need it for.`;
        }
        return [
          `${shown.length} shown as cards beside you:`,
          ...shown.map(
            (product) =>
              `- ${product.title} (handle: ${product.handle}): from ${product.price}${product.available ? "" : ", SOLD OUT"}`,
          ),
        ].join("\n");
      }),
    ),

    client.registerToolCallHandler(
      "get_product",
      toolHandler(async (args, signal) => {
        const handle = String(args.handle || productOnScreen());
        if (!handle) return "Error: handle is required. Search for the product first.";
        const product = await getJson<ProductDetails>(
          `/api/products/${encodeURIComponent(handle)}`,
          signal,
        );
        const soldOut = product.variants.filter((variant) => !variant.available);
        const prices = new Set(product.variants.map((variant) => variant.price));
        return [
          `${product.title}: from ${product.price}.`,
          product.available ? "In stock." : "SOLD OUT in every option.",
          ...product.options
            .filter((option) => option.name !== "Title")
            .map((option) => `${option.name}: ${option.values.join(", ")}`),
          prices.size > 1
            ? `Prices: ${product.variants.map((variant) => `${variant.title} ${variant.price}`).join("; ")}`
            : "",
          soldOut.length > 0 && product.available
            ? `Sold out: ${soldOut.map((variant) => variant.title).join("; ")}`
            : "",
          `Description: ${product.description}`,
        ]
          .filter(Boolean)
          .join("\n");
      }),
    ),

    client.registerToolCallHandler(
      "add_to_cart",
      toolHandler(async (args, signal) => {
        const handle = String(args.handle || productOnScreen());
        if (!handle) return "Error: handle is required.";
        const product = await getJson<ProductDetails>(
          `/api/products/${encodeURIComponent(handle)}`,
          signal,
        );
        const { variant, missing } = pickVariant(product, args.options ?? {});
        if (missing) {
          return `Not added. Ask which ${missing
            .map((option) => `${option.name} (${option.values.join(", ")})`)
            .join(" and ")} they want.`;
        }
        if (!variant) return `Not added: no ${product.title} matches ${JSON.stringify(args.options)}.`;
        if (!variant.available) {
          const others = product.variants.filter((candidate) => candidate.available);
          return `Not added: ${product.title} in ${variant.title} is sold out. Available: ${
            others.map((candidate) => candidate.title).join("; ") || "none"
          }.`;
        }
        let cart: AddResult;
        try {
          // The server checks the quantity and says how many it added.
          cart = await getJson<AddResult>("/api/cart/add", signal, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ variantId: variant.id, quantity: args.quantity ?? 1 }),
          });
        } catch (error) {
          if (error instanceof StoreError) throw error;
          // A timeout or network error: the add may still have gone through,
          // so refresh the header's count either way.
          window.dispatchEvent(new CustomEvent(CART_UPDATED));
          return "Not sure it was added: the store didn't answer. Call get_cart to check before adding it again.";
        }
        // Tells the header's cart count to refresh.
        window.dispatchEvent(new CustomEvent(CART_UPDATED));
        const options = variant.title === "Default Title" ? "" : ` (${variant.title})`;
        return `Added ${cart.added} × ${product.title}${options}, ${variant.price} each. The cart now has ${cart.itemCount} items, ${cart.total} in total.`;
      }),
    ),

    client.registerToolCallHandler(
      "get_cart",
      toolHandler(async (_args, signal) => {
        const cart = await getJson<CartSummary>("/api/cart", signal);
        if (cart.itemCount === 0) return "The cart is empty.";
        return [
          `${cart.itemCount} items, ${cart.total} in total:`,
          ...cart.items.map((item) => `- ${item.quantity} × ${item.title}: ${item.linePrice}`),
        ].join("\n");
      }),
    ),
  ];

  return () => stops.forEach((stop) => stop());
}
