"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import type { GovernorSnapshot } from "@/lib/engines/molecularGovernor";

interface NavItem {
  label: string;
  href: string;
}

interface NavCluster {
  title: string;
  items: NavItem[];
}

const CLUSTERS: NavCluster[] = [
  {
    title: "Command & Spatial",
    items: [
      { label: "Command Center", href: "/" },
      { label: "3D Digital Twin", href: "/site/digital-twin" },
      { label: "360° Reality Tour", href: "/site/360-tour" },
      { label: "Site GIS & Radar", href: "/site/gis" },
      { label: "LiDAR Scan vs BIM", href: "/quality/scan-vs-bim" },
    ],
  },
  {
    title: "Field & Safety",
    items: [
      { label: "Site Report (DPR)", href: "/site/dpr" },
      { label: "Gate & Weighbridge", href: "/site/gate-inward" },
      { label: "Biometric Labor", href: "/site/labor" },
      { label: "Permit to Work (PTW)", href: "/safety/ptw" },
      { label: "Wind & Crane Stability", href: "/site/wind-stability" },
      { label: "Plant & Machinery", href: "/operations/plant-machinery" },
    ],
  },
  {
    title: "Quality & Concrete",
    items: [
      { label: "Pour Cards", href: "/quality/pour-cards" },
      { label: "Concrete Maturity", href: "/engineering/concrete-maturity" },
      { label: "NCR & Defect Liens", href: "/quality/ncr" },
      { label: "NDT & Lab Cores", href: "/site/ndt" },
      { label: "Rebar BBS", href: "/engineering/bbs" },
      { label: "BIM Clashes", href: "/engineering/clashes" },
    ],
  },
  {
    title: "Schedule & Commercial",
    items: [
      { label: "Master Schedule", href: "/schedule/gantt" },
      { label: "EVM S-Curve", href: "/executive/evm-scurve" },
      { label: "Measurement Book (eMB)", href: "/finance/measurement-book" },
      { label: "Material Recon (Cl. 42)", href: "/materials/reconciliation" },
      { label: "Hindrance & EOT", href: "/commercial/hindrance-eot" },
      { label: "RA Bills & Escrow", href: "/finance/ra-bills" },
      { label: "Payment Applications", href: "/finance/payment-applications" },
      { label: "Milestones", href: "/milestones" },
    ],
  },
  {
    title: "Audit & Handover",
    items: [
      { label: "BSA Sec 63 Audit Vault", href: "/closeout/audit-vault" },
      { label: "Punch List", href: "/handover/punch-list" },
      { label: "As-Built Handover", href: "/handover/as-built" },
      { label: "RERA Compliance", href: "/compliance/rera" },
      { label: "Claims & Disputes", href: "/contracts/claims-disputes" },
      { label: "Variations", href: "/contracts/variations" },
      { label: "Settings", href: "/settings" },
    ],
  },
];

const formatInr = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

export default function DesktopCommandWorkspace({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [snapshot, setSnapshot] = useState<GovernorSnapshot | null>(null);

  useEffect(() => {
    let mounted = true;
    fetch("/api/governor/evaluate?mode=stress-test")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (mounted && data?.snapshot) setSnapshot(data.snapshot);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const violationCount = snapshot?.violations.length ?? 0;
  const frozenInr = snapshot?.escrow.frozenInr ?? 0;

  return (
    <div className="flex min-h-dvh bg-zinc-950 text-zinc-100">
      {/* Left 5-Cluster Collapsible Rail */}
      <aside
        className={`${
          collapsed ? "w-16" : "w-64"
        } shrink-0 border-r border-zinc-800/80 bg-zinc-950 transition-all duration-150 flex flex-col`}
      >
        <div className="flex h-14 items-center justify-between border-b border-zinc-800/80 px-4">
          {!collapsed && (
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold tracking-tight text-white">Quadillar LiveView</div>
              <div className="truncate text-[10px] font-mono uppercase tracking-wider text-zinc-400">
                6 Zones • BSA Sec 63
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            aria-label="Toggle navigation rail"
            className="rounded-md border border-zinc-800 px-2 py-1 text-xs font-mono text-zinc-400 hover:bg-zinc-900 hover:text-white"
          >
            {collapsed ? ">>" : "<<"}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-2.5 py-3 space-y-5">
          {CLUSTERS.map((cluster) => (
            <div key={cluster.title}>
              {!collapsed && (
                <div className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
                  {cluster.title}
                </div>
              )}
              <div className="space-y-0.5">
                {cluster.items.map((item) => {
                  const active = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={item.label}
                      className={`flex items-center rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
                        active
                          ? "bg-zinc-800 text-white"
                          : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
                      }`}
                    >
                      <span className="truncate">{collapsed ? item.label.slice(0, 2).toUpperCase() : item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      {/* Main Content + Sticky Governor Bar */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-zinc-800/80 bg-zinc-950/90 px-6 backdrop-blur">
          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-zinc-300">GOVERNOR ENGINE ONLINE</span>
            {snapshot && (
              <span className="hidden xl:inline text-zinc-500">
                HASH {snapshot.bsaSec63Ledger.rowHash.slice(0, 12)}…
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {violationCount > 0 ? (
              <Link
                href="/finance/ra-bills"
                className="inline-flex items-center gap-2 rounded-full border border-red-500/40 bg-red-950/60 px-3 py-1 text-xs font-mono font-semibold text-red-200 hover:bg-red-900/60"
              >
                <span>{violationCount} INTERLOCKS</span>
                <span className="text-red-400">•</span>
                <span>FROZEN {formatInr(frozenInr)}</span>
              </Link>
            ) : (
              <span className="rounded-full border border-emerald-500/30 bg-emerald-950/50 px-3 py-1 text-xs font-mono text-emerald-300">
                ALL GATES CLEARED
              </span>
            )}
          </div>
        </header>

        <main className="flex-1 min-w-0 p-6">{children}</main>
      </div>
    </div>
  );
}
