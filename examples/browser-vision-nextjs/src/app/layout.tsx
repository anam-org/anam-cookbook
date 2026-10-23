import type { Metadata } from "next";
import { AvatarDock } from "@/components/AvatarDock";
import { Sidebar } from "@/components/Sidebar";
import "./globals.css";

export const metadata: Metadata = {
  title: "Acme Cloud",
  description: "An Anam avatar that can see the page, powered by Sightline",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body className="bg-white text-zinc-900 antialiased">
        {/* Dialogs mark #app inert; the avatar dock stays outside it. */}
        <div id="app" className="flex min-h-screen">
          <Sidebar />
          <main className="min-w-0 flex-1 px-10 py-8">{children}</main>
        </div>
        <AvatarDock />
      </body>
    </html>
  );
}
