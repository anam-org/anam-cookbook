import Link from "next/link";
import { listProducts } from "@/lib/catalog";

export default function Home() {
  return (
    <>
      <h1 className="mb-6 text-2xl font-semibold">Gear for the trail</h1>
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {listProducts().map((product) => (
          <li key={product.handle}>
            <Link
              href={`/products/${product.handle}`}
              className="block rounded-2xl border border-stone-200 bg-white p-5 hover:border-stone-400"
            >
              <span className="text-xs uppercase tracking-wide text-stone-500">{product.type}</span>
              <span className="mt-1 block font-medium">{product.title}</span>
              <span className="text-stone-600">from {product.price}</span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
