import QuadmaxKernelFloatingWidget from "@/components/QuadmaxKernelFloatingWidget";
import LiveviewThemeQuickToggle from "@/components/LiveviewThemeQuickToggle";
import { LiveviewThemeProvider } from "@/lib/theme/liveviewTheme";
import { QuadMaxOverlay } from "@/components/copilot/QuadMaxOverlay";

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
    <html lang="en" className="dark bg-zinc-950 text-zinc-100 antialiased" suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen bg-zinc-950 text-zinc-100`}><LiveviewThemeProvider><LiveviewThemeQuickToggle />
        <RoleProvider>
          <AppShell>
            {children}
          </AppShell>
        </RoleProvider>
        
        <QuadMaxOverlay />
      <QuadmaxKernelFloatingWidget /></LiveviewThemeProvider></body>
    </html>
  );
}
