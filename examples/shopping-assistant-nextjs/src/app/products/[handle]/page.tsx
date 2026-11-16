import { notFound } from "next/navigation";
import { AddToCartForm } from "@/components/AddToCartForm";
import { getProduct, listProducts } from "@/lib/catalog";

export function generateStaticParams() {
  return listProducts().map((product) => ({ handle: product.handle }));
}

export default async function ProductPage({ params }: PageProps<"/products/[handle]">) {
  const product = getProduct((await params).handle);
  if (!product) notFound();

  return (
    <article className="max-w-xl space-y-4">
      <span className="text-xs uppercase tracking-wide text-stone-500">{product.type}</span>
      <h1 className="text-2xl font-semibold">{product.title}</h1>
      <p className="text-stone-700">{product.description}</p>
      <AddToCartForm product={product} />
    </article>
  );
}
