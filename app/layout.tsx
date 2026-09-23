import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "IDX Dashboard",
  description: "Near-real-time Indonesia Stock Exchange market data & analytics",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" className="dark">
      <body>{children}</body>
    </html>
  );
}
