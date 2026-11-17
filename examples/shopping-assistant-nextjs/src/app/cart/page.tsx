"use client";

import { useCart } from "@/lib/use-cart";

export default function CartPage() {
  const { cart, failed, retry } = useCart();

  if (!cart) {
    if (!failed) return <p>Loading your cart…</p>;
    return (
      <p role="alert">
        Couldn&apos;t load your cart.{" "}
        <button onClick={retry} className="font-medium underline">
          Try again
        </button>
      </p>
    );
  }
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
