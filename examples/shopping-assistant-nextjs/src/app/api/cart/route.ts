import { NextResponse } from "next/server";
import { getCart } from "@/lib/cart";

export async function GET() {
  return NextResponse.json(await getCart());
}
