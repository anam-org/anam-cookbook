"use client";

import { useEffect, useState } from "react";
import type { CartSummary } from "@/lib/cart";
import { CART_UPDATED } from "@/lib/shopping-tools";

export default function CartPage() {
  const [cart, setCart] = useState<CartSummary | null>(null);

  useEffect(() => {
    const refresh = () =>
      fetch("/api/cart")
        .then((response) => response.json())
        .then(setCart)
        .catch(() => {});
    refresh();
    window.addEventListener(CART_UPDATED, refresh);
    return () => window.removeEventListener(CART_UPDATED, refresh);
  }, []);

  if (!cart) return <p>Loading your cart…</p>;
  if (cart.itemCount === 0) return <h1 className="text-2xl font-semibold">Your cart is empty</h1>;

  return (
    <>
      <h1 className="mb-6 text-2xl font-semibold">Your cart</h1>
      <ul className="divide-y divide-stone-200 rounded-2xl border border-stone-200 bg-white">
        {cart.items.map((item) => (
          <li key={item.variantId} className="flex justify-between p-4">
            <span>
              {item.quantity} × {item.title}
            </span>
            <span>{item.linePrice}</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-right font-medium">Total {cart.total}</p>
    </>
  );
}
