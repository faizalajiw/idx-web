import type { Metadata } from "next";
import "./globals.css";
import { Sidebar, Topbar, SidebarProvider } from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "Market Labs",
  description:
    "Near-real-time Indonesia Stock Exchange market data, analytics & quant research",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" className="dark">
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
