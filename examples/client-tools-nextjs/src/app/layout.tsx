import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Client Tools Demo",
  description: "Demonstrate client-side tools with Anam avatars",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-gray-100 min-h-screen">{children}</body>
    </html>
  );
}
