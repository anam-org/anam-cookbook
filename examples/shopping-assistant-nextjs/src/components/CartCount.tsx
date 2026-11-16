"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CART_UPDATED } from "@/lib/shopping-tools";

export function CartCount() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    const refresh = () =>
      fetch("/api/cart")
        .then((response) => response.json())
        .then((cart) => setCount(cart.itemCount))
        .catch(() => {});
    refresh();
    window.addEventListener(CART_UPDATED, refresh);
    return () => window.removeEventListener(CART_UPDATED, refresh);
  }, []);

  return (
    <Link href="/cart" className="rounded-full bg-stone-100 px-4 py-2 text-sm font-medium hover:bg-stone-200">
      Cart{count ? ` (${count})` : ""}
    </Link>
  );
}
