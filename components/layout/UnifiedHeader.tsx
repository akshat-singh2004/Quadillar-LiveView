"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  ChevronDown,
  Compass,
  FileCheck,
  FileSpreadsheet,
  FileText,
  HardHat,
  Layers,
  Receipt,
  Scale,
  ShieldAlert,
  Truck,
  Users,
  Wrench,
  CheckCircle2
} from "lucide-react";
import { useActiveRole } from "@/context/RoleContext";

export function UnifiedHeader() {
  const pathname = usePathname();
  const roleContext = useActiveRole() as any;
  const project = roleContext?.project;
  const role = roleContext?.role;
  const tier = roleContext?.tier;
  const setRole = roleContext?.setRole ?? roleContext?.switchRole ?? roleContext?.onRoleSelect;
  const setProject = roleContext?.setProject ?? roleContext?.switchProject ?? roleContext?.onProjectSelect;

  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [projectMenuOpen, setProjectMenuOpen] = useState(false);

  const projectId = project?.project_id || project?.id || "PRJ-1BHK-GOMTI";
  const projectName = project?.project_name || project?.name || "1BHK Gomti Nagar Fit-Out";
  const roleId = (role as { id?: string })?.id || "";
  const roleLabel = (role as { label?: string })?.label || (typeof role === "string" ? role : "Select Authority");
  const activeTier = tier || project?.tier || "RESIDENTIAL";

  const navigationItems = [
    { label: "Executive Console", href: "/executive", icon: Building2 },
    { label: "Daily Progress (DPR)", href: "/operations/dpr", icon: FileText },
    { label: "Gate Inward & Logistics", href: "/site/gate-inward", icon: Truck },
    { label: "Measurement (e-MB)", href: "/finance/measurement-book", icon: FileSpreadsheet },
    { label: "RA Billing Ledger", href: "/finance/ra-bills", icon: Receipt },
    { label: "Quality & NCR", href: "/quality/ncr", icon: ShieldAlert },
    { label: "Safety & PTW", href: "/safety/ptw", icon: HardHat },
    { label: "Punch List & TOC", href: "/handover/punch-list", icon: FileCheck },
    { label: "CDE Redlines", href: "/drawings/redlines", icon: Compass },
    { label: "Master Gantt", href: "/schedule/gantt", icon: Layers },
  ];

  const projects = [
    { id: "PRJ-LKO-TOWER-A", project_id: "PRJ-LKO-TOWER-A", name: "Tower A Core & Shell", project_name: "Tower A Core & Shell", tier: "COMMERCIAL" },
    { id: "PRJ-1BHK-GOMTI", project_id: "PRJ-1BHK-GOMTI", name: "1BHK Gomti Nagar Fit-Out", project_name: "1BHK Gomti Nagar Fit-Out", tier: "RESIDENTIAL" },
  ];

  const roles = [
    { id: "PRINCIPAL_ARCHITECT", label: "Principal Architect / Director", category: "Design" },
    { id: "PMC_LEAD", label: "PMC Project Lead", category: "Governance" },
    { id: "QS_BILLING", label: "Quantity Surveyor / Billing", category: "Commercial" },
    { id: "RESIDENT_SEOR", label: "Resident Site Engineer (SEOR)", category: "Site" },
    { id: "SPECIALTY_CONTRACTOR", label: "Specialty Contractor Lead", category: "Execution" },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-800 bg-zinc-950/95 backdrop-blur-md">
      {/* TOP BRAND & CONTEXT STRIP */}
      <div className="mx-auto flex h-14 max-w-[1650px] items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="flex items-center gap-2 group">
            <div className="h-7 w-7 rounded-lg bg-cyan-500 flex items-center justify-center font-black text-zinc-950 text-xs shadow-md shadow-cyan-950/50 group-hover:scale-105 transition-transform">
              QL
            </div>
            <span className="font-mono text-xs font-black tracking-widest text-white uppercase">
              LIVEVIEW<span className="text-cyan-400">.OS</span>
            </span>
          </Link>

          <span className="h-4 w-px bg-zinc-800" />

          {/* PROJECT SELECTOR */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setProjectMenuOpen(!projectMenuOpen);
                setRoleMenuOpen(false);
              }}
              className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/80 px-2.5 py-1 text-xs text-zinc-200 hover:border-zinc-700 transition"
            >
              <span className={`h-2 w-2 rounded-full ${activeTier === "COMMERCIAL" ? "bg-cyan-400" : "bg-emerald-400"}`} />
              <span className="font-semibold">{projectName}</span>
              <span className="font-mono text-[9px] text-zinc-500 uppercase">({activeTier})</span>
              <ChevronDown className="w-3 h-3 text-zinc-500" />
            </button>

            {projectMenuOpen && (
              <div className="absolute left-0 mt-1.5 w-64 rounded-xl border border-zinc-800 bg-zinc-950 p-1.5 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-2 py-1 text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                  Select Active Contract
                </div>
                {projects.map((p) => {
                  const isSelected = projectId === p.id || projectId === p.project_id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        if (typeof setProject === "function") setProject(p);
                        setProjectMenuOpen(false);
                      }}
                      className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-left transition ${
                        isSelected ? "bg-cyan-500/10 text-cyan-400 font-bold" : "text-zinc-300 hover:bg-zinc-900"
                      }`}
                    >
                      <span>{p.name}</span>
                      <span className="font-mono text-[9px] text-zinc-500">{p.tier}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ROLE PERSONA SWITCHER */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setRoleMenuOpen(!roleMenuOpen);
              setProjectMenuOpen(false);
            }}
            className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/80 px-3 py-1.5 text-xs text-zinc-200 hover:border-zinc-700 transition"
          >
            <span className="text-zinc-500 text-[10px] uppercase font-mono">Role:</span>
            <span className="font-bold text-cyan-400">{roleLabel}</span>
            <ChevronDown className="w-3 h-3 text-zinc-500" />
          </button>

          {roleMenuOpen && (
            <div className="absolute right-0 mt-1.5 w-72 rounded-xl border border-zinc-800 bg-zinc-950 p-1.5 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="px-2 py-1 text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                Switch Authority Persona
              </div>
              {roles.map((r) => {
                const isSelected = roleId === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => {
                      if (typeof setRole === "function") setRole(r as any);
                      setRoleMenuOpen(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-xs text-left transition ${
                      isSelected ? "bg-cyan-500/10 text-cyan-400 font-bold" : "text-zinc-300 hover:bg-zinc-900"
                    }`}
                  >
                    <div>
                      <div>{r.label}</div>
                      <div className="text-[10px] text-zinc-500">{r.category}</div>
                    </div>
                    {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* UNIFIED HORIZONTAL SUB-NAVIGATION */}
      <div className="border-t border-zinc-800/80 bg-zinc-950 px-4 sm:px-6">
        <nav className="mx-auto flex max-w-[1650px] space-x-1 overflow-x-auto py-2 scrollbar-none">
          {navigationItems.map((item) => {
            const isActive = pathname === item.href || (item.href === "/safety/ptw" && pathname === "/site/safety-ptw");
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  isActive
                    ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-bold"
                    : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? "text-cyan-400" : "text-zinc-500"}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}