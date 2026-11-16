import { NextResponse, type NextRequest } from "next/server";
import { searchProducts } from "@/lib/catalog";

export function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q") ?? "";
  const maxPrice = Number(request.nextUrl.searchParams.get("max_price"));
  const products = searchProducts(query, maxPrice > 0 ? maxPrice : undefined);
  return NextResponse.json({ products });
}
