"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Projects" },
  { href: "/api-keys", label: "API keys" },
  { href: "/settings", label: "Settings" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex shrink-0 flex-col gap-3 border-b border-zinc-200 bg-zinc-50 px-3 py-4 md:w-56 md:gap-6 md:border-r md:border-b-0 md:py-5">
      <div className="flex items-center gap-2 px-2 font-semibold">
        <span className="h-5 w-5 rounded-md bg-indigo-600" aria-hidden />
        Acme Cloud
      </div>
      <nav aria-label="Main" className="flex flex-wrap gap-0.5 md:flex-col">
        {links.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            aria-current={pathname === href ? "page" : undefined}
            className="rounded-md px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100 aria-[current=page]:bg-white aria-[current=page]:text-zinc-900 aria-[current=page]:shadow-sm"
          >
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
