// A small made-up catalogue. In a real store this comes from your commerce
// platform; the assistant only ever sees it through the same endpoints your
// pages use.

export type Variant = {
  id: number;
  /** One value per product option, in the same order as `options`. */
  options: string[];
  price: number; // cents
  available: boolean;
};

export type Product = {
  handle: string;
  title: string;
  type: string;
  description: string;
  options: { name: string; values: string[] }[];
  variants: Variant[];
};

export type ProductSummary = {
  handle: string;
  title: string;
  type: string;
  price: string;
  available: boolean;
};

export type ProductDetails = ProductSummary & {
  description: string;
  options: { name: string; values: string[] }[];
  variants: { id: number; title: string; options: string[]; price: string; available: boolean }[];
};

export const STORE_NAME = "Trailhead Supply";

const products: Product[] = [
  {
    handle: "trail-runner-shoe",
    title: "Trail Runner Shoe",
    type: "Shoes",
    description:
      "A light trail shoe with a grippy lugged sole and a waterproof membrane. Runs true to size.",
    options: [
      { name: "Size", values: ["8", "9", "10", "11"] },
      { name: "Colour", values: ["Moss", "Slate"] },
    ],
    variants: variantsFor(1000, [["8", "9", "10", "11"], ["Moss", "Slate"]], 12900, ["11 / Slate"]),
  },
  {
    handle: "packable-rain-shell",
    title: "Packable Rain Shell",
    type: "Jackets",
    description:
      "A 2.5-layer waterproof jacket that packs into its own pocket. Fully taped seams and an adjustable hood.",
    options: [{ name: "Size", values: ["S", "M", "L"] }],
    variants: variantsFor(2000, [["S", "M", "L"]], 15900, ["M"]),
  },
  {
    handle: "waxed-field-jacket",
    title: "Waxed Field Jacket",
    type: "Jackets",
    description:
      "Waxed cotton with a cord collar and four bellows pockets. Shower-proof rather than waterproof; re-wax once a year.",
    options: [{ name: "Size", values: ["S", "M", "L"] }],
    variants: variantsFor(3000, [["S", "M", "L"]], 24900, []),
  },
  {
    handle: "merino-crew-socks",
    title: "Merino Crew Socks",
    type: "Socks",
    description: "Cushioned merino wool socks for hiking. One size fits UK 6 to 11.",
    options: [{ name: "Title", values: ["Default Title"] }],
    variants: variantsFor(4000, [["Default Title"]], 1800, []),
  },
  {
    handle: "insulated-bottle",
    title: "Insulated Bottle 750 ml",
    type: "Bottles",
    description: "Double-walled steel bottle. Keeps drinks cold for 24 hours or hot for 12.",
    options: [{ name: "Colour", values: ["Sand", "Ink"] }],
    variants: variantsFor(5000, [["Sand", "Ink"]], 3400, []),
  },
  {
    handle: "trail-daypack-20l",
    title: "Trail Daypack 20 L",
    type: "Bags",
    description:
      "A 20 litre daypack with a ventilated back panel, hip belt pockets and a hydration sleeve.",
    options: [{ name: "Title", values: ["Default Title"] }],
    variants: variantsFor(6000, [["Default Title"]], 8900, []),
  },
];

/** Every combination of option values, with the listed ones sold out. */
function variantsFor(firstId: number, values: string[][], price: number, soldOut: string[]) {
  const combos = values.reduce<string[][]>(
    (all, next) => all.flatMap((combo) => next.map((value) => [...combo, value])),
    [[]],
  );
  return combos.map((options, index) => ({
    id: firstId + index,
    options,
    price,
    available: !soldOut.includes(options.join(" / ")),
  }));
}

export function formatPrice(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
}

function summary(product: Product): ProductSummary {
  return {
    handle: product.handle,
    title: product.title,
    type: product.type,
    price: formatPrice(Math.min(...product.variants.map((variant) => variant.price))),
    available: product.variants.some((variant) => variant.available),
  };
}

export function listProducts() {
  return products.map(summary);
}

const STOPWORDS = new Set(["and", "any", "for", "have", "something", "the", "with", "you"]);

export function searchProducts(query: string, maxPrice?: number) {
  // A naive keyword match, best matches first. Swap in your platform's search.
  const words = query
    .toLowerCase()
    .split(/\W+/)
    .filter((word) => word.length > 2 && !STOPWORDS.has(word))
    .map((word) => word.replace(/s$/, ""));
  return products
    .map((product) => {
      const text = `${product.title} ${product.type} ${product.description}`.toLowerCase();
      return { product, score: words.filter((word) => text.includes(word)).length };
    })
    .filter(({ score }) => score > 0)
    .filter(
      ({ product }) =>
        maxPrice === undefined ||
        Math.min(...product.variants.map((variant) => variant.price)) <= maxPrice * 100,
    )
    .sort((a, b) => b.score - a.score)
    .map(({ product }) => summary(product));
}

export function getProduct(handle: string): ProductDetails | null {
  const product = products.find((candidate) => candidate.handle === handle);
  if (!product) return null;
  return {
    ...summary(product),
    description: product.description,
    options: product.options,
    variants: product.variants.map((variant) => ({
      id: variant.id,
      title: variant.options.join(" / "),
      options: variant.options,
      price: formatPrice(variant.price),
      available: variant.available,
    })),
  };
}

export function findVariant(id: number) {
  for (const product of products) {
    const variant = product.variants.find((candidate) => candidate.id === id);
    if (variant) return { product, variant };
  }
  return null;
}
