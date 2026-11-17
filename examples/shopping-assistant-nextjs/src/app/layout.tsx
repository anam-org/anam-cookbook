import type { Metadata } from "next";
import Link from "next/link";
import { AssistantDock } from "@/components/AssistantDock";
import { CartCount } from "@/components/CartCount";
import { STORE_NAME } from "@/lib/catalog";
import "./globals.css";

export const metadata: Metadata = {
  title: STORE_NAME,
  description: "A video shopping assistant that searches the catalogue and adds to the cart",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body className="bg-stone-50 text-stone-900 antialiased">
        <header className="flex items-center justify-between border-b border-stone-200 bg-white px-4 py-4 md:px-10">
          <Link href="/" className="text-lg font-semibold">
            {STORE_NAME}
          </Link>
          <CartCount />
        </header>
        <main className="mx-auto max-w-5xl px-4 py-8 pb-96 md:px-10">{children}</main>
        <AssistantDock />
      </body>
    </html>
  );
}
