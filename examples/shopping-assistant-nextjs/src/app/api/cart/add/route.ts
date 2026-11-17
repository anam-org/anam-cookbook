import { NextResponse } from "next/server";
import { addToCart, CartError, MAX_QUANTITY } from "@/lib/cart";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: "Send a JSON object." }, { status: 400 });
  }
  const { variantId, quantity = 1 } = body;
  if (!Number.isSafeInteger(variantId)) {
    return NextResponse.json({ error: "variantId is required." }, { status: 400 });
  }
  // Reject a bad quantity rather than change it, so the caller never reports
  // a different number from the one that went into the cart.
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QUANTITY) {
    return NextResponse.json(
      { error: `quantity must be a whole number from 1 to ${MAX_QUANTITY}.` },
      { status: 400 },
    );
  }
  try {
    return NextResponse.json(await addToCart(variantId, quantity));
  } catch (error) {
    if (error instanceof CartError) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }
    throw error;
  }
}
