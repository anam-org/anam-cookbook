import { useEffect, useState } from "react";
import type { CartSummary } from "@/lib/cart";
import { CART_UPDATED } from "@/lib/shopping-tools";

/** The visitor's cart, fetched again whenever something dispatches CART_UPDATED. */
export function useCart() {
  const [cart, setCart] = useState<CartSummary | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let latest: AbortController | undefined;
    const refresh = () => {
      // Cancel the previous request, so an older answer can't overwrite a newer one.
      latest?.abort();
      const request = (latest = new AbortController());
      fetch("/api/cart", { signal: request.signal })
        .then((response) => {
          if (!response.ok) throw new Error(`Cart request failed with ${response.status}`);
          return response.json();
        })
        .then((next: CartSummary) => {
          setCart(next);
          setFailed(false);
        })
        .catch(() => {
          if (!request.signal.aborted) setFailed(true);
        });
    };
    refresh();
    window.addEventListener(CART_UPDATED, refresh);
    return () => {
      latest?.abort();
      window.removeEventListener(CART_UPDATED, refresh);
    };
  }, []);

  return { cart, failed, retry: () => window.dispatchEvent(new CustomEvent(CART_UPDATED)) };
}
