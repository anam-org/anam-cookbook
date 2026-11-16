import type { AnamClient } from "@anam-ai/js-sdk";
import type { CartSummary } from "@/lib/cart";
import type { ProductDetails, ProductSummary } from "@/lib/catalog";

// Browser-side handlers for the client tools in src/config/assistant.ts.
// Each one calls the store's own endpoints and returns plain text for the
// persona's LLM to read: facts first, and what to do next when it fails.

export const CART_UPDATED = "cart:updated";

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error ?? `Request failed with ${response.status}`);
  return body as T;
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

export function registerShoppingTools(
  client: AnamClient,
  ui: { showProducts(products: ProductSummary[]): void },
) {
  const stops = [
    client.registerToolCallHandler("search_products", {
      onStart: async ({ arguments: args }) => {
        const params = new URLSearchParams({ q: String(args.query ?? "") });
        if (args.max_price) params.set("max_price", String(args.max_price));
        const { products } = await getJson<{ products: ProductSummary[] }>(`/api/products?${params}`);
        const shown = products.slice(0, 3);
        if (shown.length === 0) {
          return `No products match "${args.query}". Try a broader word, or ask what they need it for.`;
        }
        ui.showProducts(shown);
        return [
          `${shown.length} shown as cards beside you:`,
          ...shown.map(
            (product) =>
              `- ${product.title} (handle: ${product.handle}): from ${product.price}${product.available ? "" : ", SOLD OUT"}`,
          ),
        ].join("\n");
      },
    }),

    client.registerToolCallHandler("get_product", {
      onStart: async ({ arguments: args }) => {
        const handle = String(args.handle || productOnScreen());
        if (!handle) return "Error: handle is required. Search for the product first.";
        const product = await getJson<ProductDetails>(`/api/products/${encodeURIComponent(handle)}`);
        const soldOut = product.variants.filter((variant) => !variant.available);
        return [
          `${product.title}: from ${product.price}.`,
          product.available ? "In stock." : "SOLD OUT in every option.",
          ...product.options
            .filter((option) => option.name !== "Title")
            .map((option) => `${option.name}: ${option.values.join(", ")}`),
          soldOut.length > 0 && product.available
            ? `Sold out: ${soldOut.map((variant) => variant.title).join("; ")}`
            : "",
          `Description: ${product.description}`,
        ]
          .filter(Boolean)
          .join("\n");
      },
    }),

    client.registerToolCallHandler("add_to_cart", {
      onStart: async ({ arguments: args }) => {
        const handle = String(args.handle || productOnScreen());
        if (!handle) return "Error: handle is required.";
        const product = await getJson<ProductDetails>(`/api/products/${encodeURIComponent(handle)}`);
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
        const quantity = Number(args.quantity) > 0 ? Math.round(Number(args.quantity)) : 1;
        const cart = await getJson<CartSummary>("/api/cart/add", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ variantId: variant.id, quantity }),
        });
        // Tells the header's cart count to refresh.
        window.dispatchEvent(new CustomEvent(CART_UPDATED));
        const options = variant.title === "Default Title" ? "" : ` (${variant.title})`;
        return `Added ${quantity} × ${product.title}${options}, ${variant.price} each. The cart now has ${cart.itemCount} items, ${cart.total} in total.`;
      },
    }),

    client.registerToolCallHandler("get_cart", {
      onStart: async () => {
        const cart = await getJson<CartSummary>("/api/cart");
        if (cart.itemCount === 0) return "The cart is empty.";
        return [
          `${cart.itemCount} items, ${cart.total} in total:`,
          ...cart.items.map((item) => `- ${item.quantity} × ${item.title}: ${item.linePrice}`),
        ].join("\n");
      },
    }),
  ];

  return () => stops.forEach((stop) => stop());
}
