import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Custom LLM with Anam",
  description: "Use your own language model with Anam avatar streaming",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-100 min-h-screen">{children}</body>
    </html>
  );
}
