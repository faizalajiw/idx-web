import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar, Topbar, SidebarProvider } from "@/components/Sidebar";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Market Labs",
  description:
    "Near-real-time Indonesia Stock Exchange market data, analytics & quant research",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" className={`dark ${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <SidebarProvider>
          <Sidebar />
          <div className="lg:pl-60">
            <Topbar />
            {children}
          </div>
        </SidebarProvider>
      </body>
    </html>
  );
}
