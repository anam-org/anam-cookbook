import { cookies } from "next/headers";
import { findVariant, formatPrice } from "@/lib/catalog";

// The visitor's cart lives in a cookie, so the Add to cart button, the cart
// page and the assistant all read and change the same cart.

type Line = { variantId: number; quantity: number };

export type CartSummary = {
  itemCount: number;
  total: string;
  items: { variantId: number; title: string; quantity: number; linePrice: string }[];
};

const COOKIE = "cart";

async function readLines(): Promise<Line[]> {
  const raw = (await cookies()).get(COOKIE)?.value;
  try {
    const lines = JSON.parse(raw ?? "[]");
    return Array.isArray(lines)
      ? lines.filter((line) => findVariant(line.variantId) && line.quantity > 0)
      : [];
  } catch {
    return [];
  }
}

async function writeLines(lines: Line[]) {
  (await cookies()).set(COOKIE, JSON.stringify(lines), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
}

export async function getCart() {
  return summarize(await readLines());
}

function summarize(lines: Line[]): CartSummary {
  let total = 0;
  const items = lines.map((line) => {
    const { product, variant } = findVariant(line.variantId)!;
    total += variant.price * line.quantity;
    const options = variant.options.join(" / ");
    return {
      variantId: variant.id,
      title: options === "Default Title" ? product.title : `${product.title} (${options})`,
      quantity: line.quantity,
      linePrice: formatPrice(variant.price * line.quantity),
    };
  });
  return {
    itemCount: lines.reduce((count, line) => count + line.quantity, 0),
    total: formatPrice(total),
    items,
  };
}

export class CartError extends Error {}

export async function addToCart(variantId: number, quantity: number) {
  const found = findVariant(variantId);
  if (!found) throw new CartError("Unknown variant.");
  if (!found.variant.available) throw new CartError("That option is sold out.");
  const lines = await readLines();
  const line = lines.find((candidate) => candidate.variantId === variantId);
  if (line) line.quantity += quantity;
  else lines.push({ variantId, quantity });
  await writeLines(lines);
  return summarize(lines);
}
