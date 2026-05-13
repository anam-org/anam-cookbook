import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Anam Transparent Background Demo",
  description: "Client-side canvas green-screen keying for Anam avatars.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
