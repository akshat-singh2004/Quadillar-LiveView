"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSidebar } from "@/context/SidebarContext";
import {
  Compass,
  Layers,
  FileText,
  Users,
  Truck,
  Wrench,
  HardHat,
  FlaskConical,
  Thermometer,
  ShieldAlert,
  Clock,
  Calendar,
  Award,
  Calculator,
  Scale,
  FileDiff,
  PackageCheck,
  Landmark,
  TrendingUp,
  Receipt,
  ClipboardCheck,
  FileSpreadsheet,
  Fingerprint,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Camera,
  Activity,
  Scissors,
  Box,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: any;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const NAVIGATION_SECTIONS: NavSection[] = [
  {
    title: "1. Executive & Spatial CDE",
    items: [
      { label: "Master Command Center", href: "/", icon: Activity },
      { label: "3D BIM Digital Twin", href: "/site/digital-twin", icon: Box },
      { label: "Site GIS & Crane Radar", href: "/site/gis", icon: Compass },
      { label: "360° Reality Tour", href: "/site/360-tour", icon: Camera },
    ],
  },
  {
    title: "2. Field Telemetry & Labor",
    items: [
      { label: "Daily Progress Report (DPR)", href: "/site/dpr", icon: FileText },
      { label: "Gate Inward & Weighbridge", href: "/site/gate-inward", icon: Truck },
      { label: "Plant & Machinery (P&M)", href: "/operations/plant-machinery", icon: Wrench },
      { label: "Biometric Labor Muster", href: "/site/labor", icon: Users },
      { label: "Permit to Work (PTW)", href: "/safety/ptw", icon: HardHat },
      { label: "Hindrance Register & EOT", href: "/commercial/hindrance-eot", icon: Clock },
      { label: "Master Schedule (CPM)", href: "/schedule/gantt", icon: Calendar },
      { label: "EVM S-Curve Cashflow", href: "/executive/evm-scurve", icon: TrendingUp },
      { label: "Governed Milestones", href: "/milestones", icon: Award },
    ],
  },
  {
    title: "3. Structural Quality & Materials",
    items: [
      { label: "Pour Cards & IS 516 Cubes", href: "/quality/pour-cards", icon: FlaskConical },
      { label: "Rebar BBS & Billet Nesting", href: "/engineering/bbs", icon: Scissors },
      { label: "Geotechnical & Pile Load", href: "/engineering/geotechnical", icon: Activity },
      { label: "Concrete Maturity & Stripping", href: "/engineering/concrete-maturity", icon: Thermometer },
      { label: "NCR Quality Debit Liens", href: "/quality/ncr", icon: ShieldAlert },
      { label: "Material Recon (Cl. 42)", href: "/materials/reconciliation", icon: PackageCheck },
    ],
  },
  {
    title: "4. Commercial & Legal Handover",
    items: [
      { label: "Measurement Book (e-MB)", href: "/finance/measurement-book", icon: Calculator },
      { label: "Running Account (RA) Bills", href: "/finance/ra-bills", icon: Receipt },
      { label: "Retainage Waterfall Ledger", href: "/finance/payment-applications", icon: Landmark },
      { label: "Contract Variations (VO)", href: "/contracts/variations", icon: FileDiff },
      { label: "Claims & Dispute Board (DAB)", href: "/contracts/claims-disputes", icon: Scale },
      { label: "RERA QPR Form 1 & 2", href: "/compliance/rera", icon: FileSpreadsheet },
      { label: "TOC & Snag Clearance", href: "/handover/punch-list", icon: ClipboardCheck },
      { label: "Section 65B Audit Vault", href: "/closeout/audit-vault", icon: Fingerprint },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { isExpanded, toggleSidebar } = useSidebar();
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  const toggleSection = (title: string) => {
    setCollapsedSections((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  return (
    <aside
      className={`sticky top-0 h-screen shrink-0 border-r border-zinc-800 bg-zinc-950 flex flex-col select-none font-mono text-xs transition-all duration-300 ease-in-out z-30 ${
        isExpanded ? "w-72" : "w-16"
      }`}
    >
      {/* BRAND & WITHDRAWAL HEADER */}
      <div
        className={`h-14 border-b border-zinc-800 flex items-center shrink-0 bg-zinc-950 px-3 ${
          isExpanded ? "justify-between" : "justify-center"
        }`}
      >
        {isExpanded ? (
          <>
            <div className="flex items-center gap-2 overflow-hidden pl-1">
              <div>
                <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">QUADILLAR OS</div>
                <div className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5 mt-0.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="truncate">LiveView.OS Core</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleSidebar();
              }}
              className="p-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
              title="Withdraw Sidebar"
              aria-label="Withdraw Sidebar"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleSidebar();
            }}
            className="p-2 rounded-lg border border-zinc-800 bg-zinc-900 text-cyan-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Draw Sidebar"
            aria-label="Draw Sidebar"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* NAVIGATION SECTIONS */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-3.5 scrollbar-thin scrollbar-thumb-zinc-800 overflow-x-hidden">
        {NAVIGATION_SECTIONS.map((sec) => {
          const isCollapsed = collapsedSections[sec.title];

          return (
            <div key={sec.title} className="space-y-1">
              {isExpanded ? (
                <button
                  type="button"
                  onClick={() => toggleSection(sec.title)}
                  className="w-full flex items-center justify-between text-[10px] uppercase font-bold text-zinc-500 hover:text-zinc-300 py-1 px-2 tracking-wider cursor-pointer"
                >
                  <span className="truncate">{sec.title}</span>
                  <ChevronDown
                    className={`w-3 h-3 transition-transform shrink-0 ${isCollapsed ? "-rotate-90" : ""}`}
                  />
                </button>
              ) : (
                <div className="h-px bg-zinc-850 my-2 mx-1" />
              )}

              {(!isCollapsed || !isExpanded) && (
                <div className="space-y-0.5">
                  {sec.items.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        title={item.label}
                        className={`flex items-center rounded-xl transition ${
                          isExpanded ? "gap-2.5 px-3 py-2" : "justify-center p-2.5"
                        } ${
                          isActive
                            ? "bg-emerald-500/10 text-emerald-400 font-bold border border-emerald-500/30"
                            : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
                        }`}
                      >
                        <Icon
                          className={`w-4 h-4 shrink-0 ${isActive ? "text-emerald-400" : "text-zinc-500"}`}
                        />
                        {isExpanded && <span className="truncate">{item.label}</span>}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* FOOTER AUDIT INDICATOR */}
      <div
        className={`p-3 border-t border-zinc-800 bg-zinc-950 text-[10px] text-zinc-500 flex items-center shrink-0 ${
          isExpanded ? "justify-between" : "justify-center"
        }`}
      >
        {isExpanded ? (
          <>
            <span>RLS ACTIVE</span>
            <span className="text-emerald-400 font-bold">GROUND TRUTH STRICT</span>
          </>
        ) : (
          <span
            className="h-2 w-2 rounded-full bg-emerald-400"
            title="Postgres RLS Active • Strict Ground Truth"
          />
        )}
      </div>
    </aside>
  );
}

export default Sidebar;
