"use client";

import { useState } from "react";
import type { ProductDetails } from "@/lib/catalog";
import { CART_UPDATED } from "@/lib/shopping-tools";

export function AddToCartForm({ product }: { product: ProductDetails }) {
  const choices = product.options.filter((option) => option.values.length > 1);
  const [selected, setSelected] = useState(() => product.variants[0].options);
  const [message, setMessage] = useState("");
  const variant = product.variants.find(
    (candidate) => candidate.options.join() === selected.join(),
  );

  async function add() {
    if (!variant) return;
    const response = await fetch("/api/cart/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ variantId: variant.id, quantity: 1 }),
    });
    const body = await response.json().catch(() => ({}));
    setMessage(response.ok ? "Added to your cart." : body.error ?? "Couldn't add it.");
    if (response.ok) window.dispatchEvent(new CustomEvent(CART_UPDATED));
  }

  return (
    <div className="space-y-4">
      {choices.map((option) => {
        const index = product.options.indexOf(option);
        return (
          <label key={option.name} className="block text-sm">
            <span className="mb-1 block font-medium">{option.name}</span>
            <select
              value={selected[index]}
              onChange={(event) =>
                setSelected(selected.map((value, i) => (i === index ? event.target.value : value)))
              }
              className="rounded-lg border border-stone-300 px-3 py-2"
            >
              {option.values.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
        );
      })}
      <p className="text-lg">{variant?.price}</p>
      <button
        onClick={add}
        disabled={!variant?.available}
        className="rounded-lg bg-stone-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-50"
      >
        {variant?.available ? "Add to cart" : "Sold out"}
      </button>
      <p role="status" className="text-sm text-stone-600">
        {message}
      </p>
    </div>
  );
}
