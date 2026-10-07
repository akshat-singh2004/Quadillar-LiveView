"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabase";
import {
  Search,
  Command,
  FileSpreadsheet,
  Receipt,
  ShieldAlert,
  Compass,
  FileText,
  X,
  Layers,
  ArrowRight,
  HardHat,
  CheckSquare,
  Banknote,
  Gavel,
} from "lucide-react";

interface SearchHit {
  category: "PROJECT" | "DRAWING" | "NCR_DEFECT" | "PTW_PERMIT" | "PUNCH_SNAG" | "RA_BILL" | "CLAIM";
  id: string;
  code: string;
  title: string;
  subtitle: string;
  route: string;
}

export function GlobalSearchBar() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    } else {
      setQuery("");
      setResults([]);
    }
  }, [open]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      const q = `%${query.trim()}%`;
      const hits: SearchHit[] = [];

      try {
        // 1. Projects
        const { data: pData } = await (supabase as any)
          .from("projects")
          .select("project_id, project_name")
          .or(`project_name.ilike.${q},project_id.ilike.${q}`)
          .limit(3);

        (pData || []).forEach((p: any) => {
          hits.push({
            category: "PROJECT",
            id: String(p.project_id),
            code: p.project_id,
            title: p.project_name,
            subtitle: "Contract Anchor",
            route: `/?project_id=${p.project_id}`,
          });
        });

        // 2. CDE Drawings
        const { data: dData } = await (supabase as any)
          .from("cde_drawing_packages")
          .select("id, drawing_number, drawing_title, revision")
          .or(`drawing_number.ilike.${q},drawing_title.ilike.${q}`)
          .limit(3);

        (dData || []).forEach((d: any) => {
          hits.push({
            category: "DRAWING",
            id: String(d.id),
            code: `${d.drawing_number} (Rev ${d.revision || "R1"})`,
            title: d.drawing_title,
            subtitle: "ISO 19650 GFC Sheet",
            route: `/cde/viewer/${d.drawing_number}`,
          });
        });

        // 3. Quality NCR Register
        const { data: ncrData } = await (supabase as any)
          .from("quality_ncr_register")
          .select("id, ncr_number, grid_location, issue_description, withholding_amount_inr")
          .or(`ncr_number.ilike.${q},issue_description.ilike.${q},grid_location.ilike.${q}`)
          .limit(3);

        (ncrData || []).forEach((n: any) => {
          hits.push({
            category: "NCR_DEFECT",
            id: String(n.id),
            code: n.ncr_number,
            title: n.issue_description,
            subtitle: `${n.grid_location || "Site"} • Lien: ₹${Number(n.withholding_amount_inr || 0).toLocaleString("en-IN")}`,
            route: "/quality/ncr",
          });
        });

        // 4. Safety Permits to Work
        const { data: ptwData } = await (supabase as any)
          .from("safety_ptw_register")
          .select("id, permit_number, permit_category, location_zone")
          .or(`permit_number.ilike.${q},location_zone.ilike.${q},permit_category.ilike.${q}`)
          .limit(3);

        (ptwData || []).forEach((pt: any) => {
          hits.push({
            category: "PTW_PERMIT",
            id: String(pt.id),
            code: pt.permit_number,
            title: `${pt.permit_category} Clearance`,
            subtitle: `Zone: ${pt.location_zone}`,
            route: "/site/permits",
          });
        });

        // 5. Punch List Snags
        const { data: punchData } = await (supabase as any)
          .from("punch_list_items")
          .select("id, ticket_id, defect_description, location_room")
          .or(`ticket_id.ilike.${q},defect_description.ilike.${q},location_room.ilike.${q}`)
          .limit(3);

        (punchData || []).forEach((pn: any) => {
          hits.push({
            category: "PUNCH_SNAG",
            id: String(pn.id),
            code: pn.ticket_id,
            title: pn.defect_description,
            subtitle: pn.location_room,
            route: "/site/punch-list",
          });
        });

        // 6. Running Account Bills
        const { data: billData } = await (supabase as any)
          .from("running_account_bills")
          .select("id, ra_bill_number, gross_work_done, status")
          .or(`ra_bill_number.ilike.${q},status.ilike.${q}`)
          .limit(3);

        (billData || []).forEach((b: any) => {
          hits.push({
            category: "RA_BILL",
            id: String(b.id),
            code: b.ra_bill_number,
            title: `Running Account Bill ${b.ra_bill_number} [${b.status}]`,
            subtitle: `Gross: ₹${Number(b.gross_work_done || 0).toLocaleString("en-IN")}`,
            route: "/finance/ra-bills",
          });
        });

        setResults(hits);
      } catch {
        // Safe failover
      } finally {
        setSearching(false);
      }
    }, 180);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (route: string) => {
    setOpen(false);
    router.push(route);
  };

  const getCategoryIcon = (category: SearchHit["category"]) => {
    switch (category) {
      case "PROJECT":
        return <Layers className="w-4 h-4 text-cyan-400" />;
      case "DRAWING":
        return <Compass className="w-4 h-4 text-amber-400" />;
      case "NCR_DEFECT":
        return <ShieldAlert className="w-4 h-4 text-rose-400" />;
      case "PTW_PERMIT":
        return <HardHat className="w-4 h-4 text-emerald-400" />;
      case "PUNCH_SNAG":
        return <CheckSquare className="w-4 h-4 text-sky-400" />;
      case "RA_BILL":
        return <Banknote className="w-4 h-4 text-emerald-400" />;
      case "CLAIM":
        return <Gavel className="w-4 h-4 text-purple-400" />;
      default:
        return <FileText className="w-4 h-4 text-zinc-400" />;
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded text-zinc-400 hover:text-zinc-200 transition font-mono text-xs cursor-pointer"
      >
        <Search className="w-3.5 h-3.5 text-zinc-500" />
        <span className="hidden sm:inline">Search platform...</span>
        <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] bg-zinc-950 border border-zinc-800 text-zinc-500 rounded">
          <Command className="w-2.5 h-2.5" /> K
        </kbd>
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-start justify-center pt-20 p-4 font-mono text-xs select-none">
          <div className="w-full max-w-2xl bg-zinc-950 border border-zinc-700 shadow-2xl rounded-xl overflow-hidden">
            <div className="flex items-center px-4 py-3 border-b border-zinc-800 bg-zinc-900/60 gap-3">
              <Search className="w-4 h-4 text-cyan-400 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search across Contracts, Drawings, NCRs, Permits, Snags, and Bills..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full bg-transparent text-sm text-white placeholder:text-zinc-600 focus:outline-none"
              />
              {query && (
                <button type="button" onClick={() => setQuery("")} className="text-zinc-500 hover:text-white cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="max-h-96 overflow-y-auto p-2 space-y-1">
              {searching ? (
                <div className="p-8 text-center text-zinc-500 text-xs">
                  Searching federated project ledger...
                </div>
              ) : results.length > 0 ? (
                results.map((hit) => (
                  <button
                    key={`${hit.category}_${hit.id}`}
                    type="button"
                    onClick={() => handleSelect(hit.route)}
                    className="w-full p-2.5 bg-zinc-900/50 hover:bg-zinc-850 rounded border border-zinc-800/80 hover:border-cyan-500/50 flex items-center justify-between text-left transition group cursor-pointer"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="p-2 rounded bg-zinc-950 border border-zinc-800 shrink-0">
                        {getCategoryIcon(hit.category)}
                      </div>
                      <div className="truncate">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-xs group-hover:text-cyan-400 transition truncate">
                            {hit.code}
                          </span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-950 border border-zinc-800 text-zinc-400 uppercase font-bold">
                            {hit.category.replace(/_/g, " ")}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-300 font-sans truncate">{hit.title}</p>
                        <span className="text-[10px] text-zinc-500">{hit.subtitle}</span>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-cyan-400 shrink-0 ml-2" />
                  </button>
                ))
              ) : query.trim() ? (
                <div className="p-8 text-center text-zinc-500">
                  Zero matching records found for &quot;{query}&quot;.
                </div>
              ) : (
                <div className="p-6 text-center text-zinc-600 text-[11px] space-y-1">
                  <div>Search across GFC drawings, active NCR liens, PTW permits, and RA bill ledgers.</div>
                  <div className="text-[10px] text-zinc-500">Quick jumps: ARCH, PTW, NCR, RA-01, or SNG</div>
                </div>
              )}
            </div>

            <div className="px-4 py-2 bg-zinc-900 border-t border-zinc-800 text-[10px] text-zinc-500 flex justify-between">
              <span>Navigate with mouse or arrow keys</span>
              <span>ESC to close</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default GlobalSearchBar;
