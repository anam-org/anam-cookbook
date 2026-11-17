"use client";

import Link from "next/link";
import { useCart } from "@/lib/use-cart";

export function CartCount() {
  const count = useCart().cart?.itemCount;

  return (
    <Link href="/cart" className="rounded-full bg-stone-100 px-4 py-2 text-sm font-medium hover:bg-stone-200">
      Cart{count ? ` (${count})` : ""}
    </Link>
  );
}
