import { NextResponse } from "next/server";
import { addToCart, CartError } from "@/lib/cart";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const variantId = Number(body.variantId);
  const requested = Math.round(Number(body.quantity ?? 1));
  const quantity = Number.isFinite(requested) ? Math.min(Math.max(requested, 1), 20) : 1;
  if (!Number.isInteger(variantId)) {
    return NextResponse.json({ error: "variantId is required." }, { status: 400 });
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
