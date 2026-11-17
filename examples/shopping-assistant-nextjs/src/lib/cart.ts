import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { findVariant, formatPrice } from "@/lib/catalog";

// The cart lives on the server under a random ID kept in a cookie, so the
// Add to cart button, the cart page and the assistant all read and change the
// same cart. The carts are in memory, so they're lost when the server
// restarts. A real store uses its platform's cart instead.

export const MAX_QUANTITY = 20;
const MAX_CARTS = 10_000;
const COOKIE = "cart";

/** Variant ID to quantity. */
type Cart = Map<number, number>;

export type CartSummary = {
  itemCount: number;
  total: string;
  items: { variantId: number; title: string; quantity: number; linePrice: string }[];
};

/** The cart after an add, with the quantity the server actually added. */
export type AddResult = CartSummary & { added: number };

// Kept on globalThis so every route, and Next.js dev reloads, share the carts.
const shared = globalThis as typeof globalThis & { carts?: Map<string, Cart> };
const carts = (shared.carts ??= new Map<string, Cart>());

/** The visitor's cart. The cookie holds only an ID, so there's nothing in it to tamper with. */
async function currentCart() {
  const jar = await cookies();
  let id = jar.get(COOKIE)?.value ?? "";
  let cart = carts.get(id);
  if (!cart) {
    id = randomUUID();
    cart = new Map();
    jar.set(COOKIE, id, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 14,
    });
  }
  // Most recently used last, so the oldest cart goes when there are too many.
  carts.delete(id);
  carts.set(id, cart);
  const oldest = carts.keys().next().value;
  if (carts.size > MAX_CARTS && oldest) carts.delete(oldest);
  return cart;
}

/** Creates the cart on the first visit, so it exists before the first add. */
export async function getCart() {
  return summarize(await currentCart());
}

function summarize(cart: Cart): CartSummary {
  let total = 0;
  let itemCount = 0;
  const items = [...cart].map(([variantId, quantity]) => {
    const { product, variant } = findVariant(variantId)!;
    total += variant.price * quantity;
    itemCount += quantity;
    const options = variant.options.join(" / ");
    return {
      variantId,
      title: options === "Default Title" ? product.title : `${product.title} (${options})`,
      quantity,
      linePrice: formatPrice(variant.price * quantity),
    };
  });
  return { itemCount, total: formatPrice(total), items };
}

export class CartError extends Error {}

/**
 * Nothing awaits between reading the line and writing it back, so two adds
 * at the same moment both count.
 */
export async function addToCart(variantId: number, quantity: number): Promise<AddResult> {
  const found = findVariant(variantId);
  if (!found) throw new CartError("Unknown variant.");
  if (!found.variant.available) throw new CartError("That option is sold out.");
  const cart = await currentCart();
  const newQuantity = (cart.get(variantId) ?? 0) + quantity;
  if (newQuantity > MAX_QUANTITY) {
    throw new CartError(`The cart can hold at most ${MAX_QUANTITY} of each item.`);
  }
  cart.set(variantId, newQuantity);
  return { ...summarize(cart), added: quantity };
}
