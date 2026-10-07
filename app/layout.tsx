import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { RoleProvider } from "@/context/RoleContext";
import { AppShell } from "@/components/layout/AppShell";

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
          <AppShell>
            {children}
          </AppShell>
        </RoleProvider>
      </body>
    </html>
  );
}
