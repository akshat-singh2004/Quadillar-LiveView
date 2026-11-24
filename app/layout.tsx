import QuadmaxKernelFloatingWidget from "@/components/QuadmaxKernelFloatingWidget";
import QuadmaxAutonomousOperator from "@/components/QuadmaxAutonomousOperator";
import LiveviewThemeQuickToggle from "@/components/LiveviewThemeQuickToggle";
import { LiveviewThemeProvider } from "@/lib/theme/liveviewTheme";

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { RoleProvider } from "@/context/RoleContext";
import { AppShell } from "@/components/layout/AppShell";
import { GovernorProvider } from "@/context/GovernorContext";
import { SwRegistrar } from "@/components/offline/SwRegistrar";
import { GovernorAlertListener } from "@/components/governor/GovernorAlertListener";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { GovernorGlobalBar } from "@/components/governor/GovernorGlobalBar";
import MobileFieldDock from "@/components/layout/MobileFieldDock";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  manifest: "/manifest.webmanifest",
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
          <GovernorProvider>
          <SwRegistrar />
          <GovernorAlertListener />
          <CommandPalette />
          <GovernorGlobalBar />
          <div className="pb-16 lg:pb-0">
          <AppShell>
            {children}
          </AppShell>
          </div>
          <MobileFieldDock />
        </GovernorProvider>
        </RoleProvider>
        
      <QuadmaxAutonomousOperator />
            <QuadmaxKernelFloatingWidget /></LiveviewThemeProvider></body>
    </html>
  );
}
