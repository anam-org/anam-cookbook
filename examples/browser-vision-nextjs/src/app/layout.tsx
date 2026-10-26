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
        {/* Dialogs mark the app and avatar dock inert while open. */}
        <div id="app" className="flex min-h-screen flex-col md:flex-row">
          <Sidebar />
          <main className="min-w-0 flex-1 px-4 py-6 pb-80 md:px-10 md:py-8 md:pb-80">{children}</main>
        </div>
        <AvatarDock />
      </body>
    </html>
  );
}
