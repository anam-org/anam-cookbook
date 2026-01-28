import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Anam Persona Demo",
  description: "Talk to an AI persona using Anam",
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
