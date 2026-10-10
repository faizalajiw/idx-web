import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar, Topbar } from "@/components/Sidebar";

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

// Dijalankan sebelum paint supaya tema & state sidebar tidak berkedip (FOUC).
const THEME_SCRIPT = `(function(){try{var r=document.documentElement;var t=localStorage.getItem('ml-theme');var dark=t?t==='dark':true;r.classList.toggle('dark',dark);r.classList.toggle('light',!dark);if(localStorage.getItem('ml-sidebar-collapsed')==='1'){r.classList.add('sidebar-collapsed');}}catch(e){}})();`;

export const metadata: Metadata = {
  title: "Market Labs",
  description:
    "Near-real-time Indonesia Stock Exchange market data, analytics & quant research",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="id"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
      <body>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
        <Sidebar />
        <div className="app-main">
          <Topbar />
          {children}
        </div>
      </body>
    </html>
  );
}
