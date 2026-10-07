#!/usr/bin/env bash
set -e

echo -e "\033[1;36m[+] Creating directory components/layout...\033[0m"
mkdir -p components/layout

# -----------------------------------------------------------------------------
# 1. COMPONENT: components/layout/CouncilNavigationShell.tsx
# Persistent navigation sidebar with categorized governance chambers & live links
# -----------------------------------------------------------------------------
cat << 'NAV_SHELL' > components/layout/CouncilNavigationShell.tsx
"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShieldCheck,
  Flame,
  HardHat,
  Users,
  Wrench,
  DollarSign,
  Layers,
  Clock,
  Box,
  Radio,
  BookOpen,
  Scale,
  Cpu,
} from "lucide-react";

interface NavItem {
  name: string;
  href: string;
  governor: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface NavChamber {
  title: string;
  items: NavItem[];
}

const chambers: NavChamber[] = [
  {
    title: "Chamber I: Structural & Quality",
    items: [
      { name: "IS 456 Cube Crushing", href: "/quality/cubes", governor: "Aegis", icon: ShieldCheck },
      { name: "Digital Pour Cards", href: "/quality/pour-cards", governor: "Aegis", icon: Layers },
      { name: "Thermal Hydration", href: "/quality/thermal-hydration", governor: "Daedalus", icon: Flame },
    ],
  },
  {
    title: "Chamber II: HSE, Workforce & Fleet",
    items: [
      { name: "Safety PTW & 4-Gas", href: "/safety/ptw", governor: "Argus", icon: HardHat },
      { name: "Biometric Labor Muster", href: "/labor/muster", governor: "Plutus", icon: Users },
      { name: "Plant & Machinery OEE", href: "/fleet/telematics", governor: "Ananke", icon: Wrench },
    ],
  },
  {
    title: "Chamber III: Commercial & Schedule",
    items: [
      { name: "Interim Payment (IPC)", href: "/commercial/ra-bills", governor: "Midas", icon: DollarSign },
      { name: "Material Reconciliation", href: "/materials/reconciliation", governor: "Vulcan", icon: Layers },
      { name: "Delay Forensics & EOT", href: "/commercial/hindrance-eot", governor: "Chronos / Themis", icon: Clock },
    ],
  },
  {
    title: "Chamber IV: Spatial & Apex Governance",
    items: [
      { name: "3D BIM Clash Forensics", href: "/spatial/clashes", governor: "Minerva", icon: Box },
      { name: "Executive War Room", href: "/governance/council", governor: "Hermes", icon: Radio },
      { name: "Daily Dossiers (DPR)", href: "/governance/dpr", governor: "Council", icon: BookOpen },
      { name: "Arbitral Claim Binders", href: "/governance/arbitration", governor: "Themis / Hermes", icon: Scale },
    ],
  },
];

export function CouncilNavigationShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-zinc-950 text-zinc-100 font-mono text-xs antialiased">
      {/* PERSISTENT SIDEBAR */}
      <aside className="w-64 border-r border-zinc-800/80 bg-zinc-950 flex flex-col justify-between shrink-0 select-none hidden md:flex">
        <div className="p-4 space-y-6">
          {/* HEADER BRANDING */}
          <div className="space-y-1 border-b border-zinc-800 pb-3">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-emerald-400" />
              <span className="font-bold text-white text-xs tracking-wider uppercase">
                Quadillar LiveView
              </span>
            </div>
            <p className="text-[10px] text-zinc-400 tracking-tight">
              Autonomous Governance Council
            </p>
          </div>

          {/* CHAMBER SECTIONS */}
          <div className="space-y-5">
            {chambers.map((chamber) => (
              <div key={chamber.title} className="space-y-1">
                <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider block px-2">
                  {chamber.title}
                </span>

                <div className="space-y-0.5">
                  {chamber.items.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-[11px] transition ${
                          isActive
                            ? "bg-zinc-800 text-white font-bold"
                            : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? "text-emerald-400" : "text-zinc-400"}`} />
                          <span className="truncate">{item.name}</span>
                        </div>
                        <span className="text-[8px] text-zinc-400 shrink-0 font-mono">
                          {item.governor}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* FOOTER METADATA */}
        <div className="p-4 border-t border-zinc-800/80 bg-zinc-950/50 space-y-1 text-[9px] text-zinc-400">
          <div className="flex justify-between items-center text-zinc-300">
            <span>Synapse Event Bus</span>
            <span className="text-emerald-400 font-bold">10/10 Online</span>
          </div>
          <div>Jurisdiction: CPWD / FIDIC / Sec. 65B</div>
        </div>
      </aside>

      {/* MAIN CONTENT VIEWPORT */}
      <main className="flex-1 overflow-y-auto min-w-0">
        {children}
      </main>
    </div>
  );
}
NAV_SHELL

echo -e "\033[1;36m[+] Verifying full workspace TypeScript compilation with 'npx tsc --noEmit'...\033[0m"
npx tsc --noEmit

echo -e "\033[1;32m[✓] Council Navigation Shell deployed cleanly with ZERO errors!\033[0m"
