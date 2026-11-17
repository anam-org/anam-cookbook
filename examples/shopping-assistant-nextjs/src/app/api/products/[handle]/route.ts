import { NextResponse } from "next/server";
import { getProduct } from "@/lib/catalog";

export async function GET(_request: Request, { params }: RouteContext<"/api/products/[handle]">) {
  const product = getProduct((await params).handle);
  if (!product) return NextResponse.json({ error: "No product with that handle." }, { status: 404 });
  return NextResponse.json(product);
}
