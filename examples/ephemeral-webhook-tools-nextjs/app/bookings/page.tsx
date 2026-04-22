"use client";

import Link from "next/link";
import { BookingsPanel } from "../_components/bookings-panel";

export default function BookingsPage() {
  return (
    <main className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <header className="max-w-4xl mx-auto flex items-center justify-between px-6 py-6">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 text-sm"
          >
            ← Back
          </Link>
          <h1 className="text-xl font-semibold tracking-tight">Bookings</h1>
        </div>
      </header>

      <section className="max-w-4xl mx-auto px-6">
        <BookingsPanel />
      </section>
    </main>
  );
}
