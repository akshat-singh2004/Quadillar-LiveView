"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useGovernor } from "@/context/GovernorContext";

const DOCK_TABS = [
  { label: "Capture", href: "/site/dpr" },
  { label: "Spatial", href: "/site/digital-twin" },
  { label: "Holds", href: "/quality/ncr", showBadge: true },
  { label: "RA/Gate", href: "/finance/ra-bills" },
];

export default function MobileFieldDock() {
  const pathname = usePathname();
  const { snapshot } = useGovernor();
  const holdsCount = snapshot.violations.length;

  return (
    <nav
      aria-label="Field Capture Navigation"
      className="lg:hidden fixed bottom-0 inset-x-0 z-50 border-t border-zinc-800 bg-zinc-950/95 backdrop-blur pb-[env(safe-area-inset-bottom)]"
    >
      <div className="grid grid-cols-4 h-16">
        {DOCK_TABS.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`relative flex flex-col items-center justify-center gap-1 text-xs font-semibold transition-colors ${
                active ? "text-white bg-zinc-900" : "text-zinc-400 active:bg-zinc-900/60"
              }`}
            >
              {active && <span className="absolute top-0 inset-x-3 h-0.5 rounded-full bg-emerald-400" />}
              <span className="tracking-tight">{tab.label}</span>
              {tab.showBadge && holdsCount > 0 && (
                <span className="absolute top-1.5 right-3 inline-flex min-w-[18px] h-[18px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-mono font-bold text-white">
                  {holdsCount}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
