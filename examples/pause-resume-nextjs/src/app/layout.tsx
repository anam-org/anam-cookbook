import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Anam Pause / Resume Demo",
  description: "Simulate pause and resume for a turnkey Anam session",
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
