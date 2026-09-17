import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { RoleProvider } from "@/context/RoleContext";
import { UnifiedHeader } from "@/components/layout/UnifiedHeader";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Quadillar LiveView | CDE & Command Interface",
  description: "Enterprise project governance, CDE, and site operations control",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark bg-zinc-950 text-zinc-100 antialiased">
      <body className={`${inter.className} min-h-screen bg-zinc-950 text-zinc-100`}>
        <RoleProvider>
          <UnifiedHeader />
          <main className="pt-12 min-h-screen">
            {children}
          </main>
        </RoleProvider>
      </body>
    </html>
  );
}