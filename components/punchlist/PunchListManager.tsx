// components/punchlist/PunchListManager.tsx
"use client";

import React, { useState, useMemo, useEffect, useTransition, useCallback } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Camera,
  Plus,
  X,
  ShieldAlert,
  ShieldCheck,
  Building2,
  FileCheck,
  Loader2,
} from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import {
  logSnagTicket,
  updateSnagStatus,
  sanctionTakingOverCertificate,
} from "@/app/actions/punch-actions";

// ---------------------------------------------------------------------------
// Type Definitions
// ---------------------------------------------------------------------------

export type DisciplineType =
  | "Architectural/Civil"
  | "MEP Services"
  | "Soft Furnishings & Joinery";

export type SnagSeverity = "CAT-A CRITICAL" | "CAT-B MINOR";

export type AuditStatus =
  | "Open"
  | "Rectified - Pending Re-Inspection"
  | "Closed & Approved";

export interface PunchItem {
  id: string;
  rawId: string;
  location: string;
  discipline: DisciplineType;
  defectSpecification: string;
  severity: SnagSeverity;
  subcontractor: string;
  evidenceStatus: "Photo Uploaded" | "Missing Photographic Proof";
  auditStatus: AuditStatus;
  loggedDate: string;
}

export interface PunchListManagerProps {
  projectId?: string;
  projectName?: string;
  initialSnags?: any[];
  initialItems?: PunchItem[];
  items?: PunchItem[];
  criticalCatACount?: number;
}

function normalizeDbSnag(dbItem: any): PunchItem {
  const isCatA =
    dbItem.severity_tier === "CATEGORY_A" ||
    dbItem.severity_tier === "CAT-A CRITICAL";

  const isPhoto =
    dbItem.evidence_status === "PHOTO_UPLOADED" ||
    dbItem.evidence_status === "Photo Uploaded";

  let auditStatus: AuditStatus = "Open";
  if (dbItem.status === "CLOSED" || dbItem.status === "Closed & Approved") {
    auditStatus = "Closed & Approved";
  } else if (
    dbItem.status === "RECTIFIED" ||
    dbItem.status === "Rectified - Pending Re-Inspection"
  ) {
    auditStatus = "Rectified - Pending Re-Inspection";
  }

  return {
    id: dbItem.ticket_id || dbItem.id || `SNG-${Math.floor(1000 + Math.random() * 9000)}`,
    rawId: dbItem.id,
    location: dbItem.location_room || dbItem.location || "General Site Front",
    discipline: (dbItem.trade_discipline || dbItem.discipline || "Architectural/Civil") as DisciplineType,
    defectSpecification: dbItem.defect_description || dbItem.defectSpecification || "Defect details pending",
    severity: isCatA ? "CAT-A CRITICAL" : "CAT-B MINOR",
    subcontractor: dbItem.subcontractor_name || dbItem.subcontractor || "Assigned Subcontractor",
    evidenceStatus: isPhoto ? "Photo Uploaded" : "Missing Photographic Proof",
    auditStatus,
    loggedDate: dbItem.created_at
      ? new Date(dbItem.created_at).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10),
  };
}

export function PunchListManager({
  projectId = "GOMTI-NAGAR-PH1-FITOUT",
  projectName = "Gomti Nagar Extension Commercial Hub Ph-1",
  initialSnags,
  initialItems,
}: PunchListManagerProps) {
  const [isPending, startTransition] = useTransition();
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const [items, setItems] = useState<PunchItem[]>(() => {
    if (initialSnags && initialSnags.length > 0) return initialSnags.map(normalizeDbSnag);
    if (initialItems && initialItems.length > 0) return initialItems;
    return [];
  });

  // Filter States
  const [selectedZone, setSelectedZone] = useState<string>("All Zones");
  const [selectedSeverity, setSelectedSeverity] = useState<string>("All Severities");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newItem, setNewItem] = useState({
    location: "Level 04 / Core Shear Wall B2-C5",
    discipline: "Architectural/Civil" as DisciplineType,
    defectSpecification: "Surface honeycombing and voiding exceeding 50mm depth at construction joint.",
    severity: "CAT-A CRITICAL" as SnagSeverity,
    subcontractor: "Falcon Structural RCC Works",
    evidenceStatus: "Photo Uploaded" as "Photo Uploaded" | "Missing Photographic Proof",
  });

  const loadSnags = useCallback(async () => {
    const { data } = await (supabase as any)
      .from("punch_list_items")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    if (data && data.length > 0) {
      setItems(data.map(normalizeDbSnag));
    } else {
      setItems([]);
    }
  }, [projectId]);

  useEffect(() => {
    void loadSnags();

    const channel = supabase
      .channel(`punch_list_${projectId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "punch_list_items" },
        () => void loadSnags()
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [projectId, loadSnags]);

  // Handle Status Update with Server Action
  const handleStatusChange = (item: PunchItem, newStatus: AuditStatus) => {
    const dbNextStatus =
      newStatus === "Closed & Approved"
        ? "CLOSED"
        : newStatus === "Rectified - Pending Re-Inspection"
          ? "RECTIFIED"
          : "OPEN";

    startTransition(async () => {
      const res = await updateSnagStatus(
        item.rawId || item.id,
        projectId,
        item.id,
        dbNextStatus as any
      );

      if (res.success) {
        setItems((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, auditStatus: newStatus } : i))
        );
        setFeedbackMessage(`Ticket ${item.id} status updated to ${newStatus}.`);
        setTimeout(() => setFeedbackMessage(null), 3500);
      } else {
        alert(res.error || "Failed to update defect status.");
      }
    });
  };

  // Handle Create Ticket with Server Action
  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.location.trim() || !newItem.defectSpecification.trim()) return;

    startTransition(async () => {
      const res = await logSnagTicket({
        projectId,
        locationRoom: newItem.location.trim(),
        tradeDiscipline: newItem.discipline,
        defectDescription: newItem.defectSpecification.trim(),
        severityTier: newItem.severity === "CAT-A CRITICAL" ? "CATEGORY_A" : "CATEGORY_B",
        assignedSubcontractor: newItem.subcontractor.trim() || "Falcon Structural RCC Works",
        reportedBy: "Lead QA/QC Auditor",
      });

      if (res.success) {
        setIsModalOpen(false);
        setFeedbackMessage(`Defect ticket registered under FIDIC Clause 11.`);
        setTimeout(() => setFeedbackMessage(null), 3500);
        loadSnags();
      } else {
        alert(res.error || "Failed to log defect ticket.");
      }
    });
  };

  // Handle Taking-Over Certificate Issuance
  const handleGenerateTOC = () => {
    startTransition(async () => {
      const res = await sanctionTakingOverCertificate(projectId, projectName);
      if (res.success) {
        setFeedbackMessage(
          `SUCCESS: Taking-Over Certificate (${res.tocRef}) officially sanctioned and sealed into the project ledger. Initial 50% Retention Release unlocked.`
        );
      } else {
        alert(res.error || "TOC Sanction Failed.");
      }
    });
  };

  // Filter Logic
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (selectedZone !== "All Zones" && item.discipline !== selectedZone) {
        return false;
      }
      if (
        selectedSeverity === "Category A (Structural / Life Safety)" &&
        item.severity !== "CAT-A CRITICAL"
      ) {
        return false;
      }
      if (
        selectedSeverity === "Category B (Aesthetic / Superficial)" &&
        item.severity !== "CAT-B MINOR"
      ) {
        return false;
      }
      return true;
    });
  }, [items, selectedZone, selectedSeverity]);

  // Active Category A Unresolved Count
  const activeCatACount = useMemo(() => {
    return items.filter(
      (item) => item.severity === "CAT-A CRITICAL" && item.auditStatus !== "Closed & Approved"
    ).length;
  }, [items]);

  return (
    <div className="bg-zinc-900 border border-zinc-800 font-sans">
      {/* BANNER NOTIFICATION */}
      {feedbackMessage && (
        <div className="p-3 bg-cyan-950/80 border-b border-cyan-800 text-cyan-300 text-xs font-mono flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-cyan-400" />
          <span>{feedbackMessage}</span>
        </div>
      )}

      {/* FILTER & ACTION BAR */}
      <div className="p-4 border-b border-zinc-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4 font-mono text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Zone:</span>
            <select
              value={selectedZone}
              onChange={(e) => setSelectedZone(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 text-zinc-200 px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:border-zinc-700"
            >
              <option value="All Zones">All Zones &amp; Disciplines</option>
              <option value="Architectural/Civil">Architectural/Civil</option>
              <option value="MEP Services">MEP Services</option>
              <option value="Soft Furnishings & Joinery">Soft Furnishings &amp; Joinery</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">Severity:</span>
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 text-zinc-200 px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:border-zinc-700"
            >
              <option value="All Severities">All Severities</option>
              <option value="Category A (Structural / Life Safety)">
                Category A (Structural / Life Safety)
              </option>
              <option value="Category B (Aesthetic / Superficial)">
                Category B (Aesthetic / Superficial)
              </option>
            </select>
          </div>

          <div className="text-zinc-500 text-[11px] hidden sm:block">
            Showing {filteredItems.length} of {items.length} snags
          </div>
        </div>

        <div>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="bg-zinc-100 text-zinc-950 hover:bg-zinc-300 font-bold uppercase tracking-wider text-xs px-4 py-2 flex items-center gap-1.5 transition-colors cursor-pointer font-mono"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Log New Defect Ticket</span>
          </button>
        </div>
      </div>

      {/* TABLE */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse font-mono text-xs">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-950/70 text-[10px] text-zinc-500 uppercase tracking-wider">
              <th className="py-3 px-4 font-normal whitespace-nowrap">Snag ID &amp; Location</th>
              <th className="py-3 px-4 font-normal whitespace-nowrap">Discipline &amp; Trade</th>
              <th className="py-3 px-4 font-normal">Defect Specification</th>
              <th className="py-3 px-4 font-normal text-center whitespace-nowrap">Severity</th>
              <th className="py-3 px-4 font-normal whitespace-nowrap">Assigned Subcontractor</th>
              <th className="py-3 px-4 font-normal text-center whitespace-nowrap">Evidence Status</th>
              <th className="py-3 px-4 font-normal text-center whitespace-nowrap">Audit Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60">
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-zinc-500 font-sans text-xs">
                  No pre-handover defect tickets logged for this project.
                </td>
              </tr>
            ) : (
              filteredItems.map((item) => {
                const isCatA = item.severity === "CAT-A CRITICAL";
                const isEvidenceUploaded = item.evidenceStatus === "Photo Uploaded";
                const isClosed = item.auditStatus === "Closed & Approved";
                const isPendingReinspect = item.auditStatus === "Rectified - Pending Re-Inspection";

                return (
                  <tr
                    key={item.id}
                    className={`hover:bg-zinc-800/30 transition-colors ${isCatA && !isClosed ? "bg-rose-950/10" : ""
                      }`}
                  >
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-bold text-zinc-100">{item.id}</div>
                      <div className="text-[11px] text-zinc-400 font-sans">{item.location}</div>
                    </td>

                    <td className="py-3 px-4 text-zinc-300 whitespace-nowrap">
                      {item.discipline}
                    </td>

                    <td className="py-3 px-4 text-zinc-200 font-sans text-xs min-w-[260px]">
                      {item.defectSpecification}
                    </td>

                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-mono border uppercase tracking-wider font-bold ${isCatA
                            ? "bg-rose-950/60 border-rose-800 text-rose-400"
                            : "bg-amber-950/60 border-amber-800 text-amber-400"
                          }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${isCatA ? "bg-rose-500 animate-pulse" : "bg-amber-500"
                            }`}
                        />
                        <span>{item.severity}</span>
                      </span>
                    </td>

                    <td className="py-3 px-4 text-zinc-300 whitespace-nowrap font-sans">
                      {item.subcontractor}
                    </td>

                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-mono border uppercase tracking-wider font-bold ${isEvidenceUploaded
                            ? "bg-emerald-950/60 border-emerald-800 text-emerald-400"
                            : "bg-zinc-950 border-zinc-800 text-zinc-500"
                          }`}
                      >
                        <Camera className="h-3 w-3" />
                        <span>{item.evidenceStatus}</span>
                      </span>
                    </td>

                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <select
                        disabled={isPending}
                        value={item.auditStatus}
                        onChange={(e) => handleStatusChange(item, e.target.value as AuditStatus)}
                        className={`text-[11px] font-mono border px-2 py-1 focus:outline-none cursor-pointer disabled:opacity-50 ${isClosed
                            ? "bg-emerald-950/40 border-emerald-800 text-emerald-300 font-bold"
                            : isPendingReinspect
                              ? "bg-amber-950/40 border-amber-800 text-amber-300 font-bold"
                              : "bg-zinc-950 border-zinc-700 text-zinc-300"
                          }`}
                      >
                        <option value="Open">Open</option>
                        <option value="Rectified - Pending Re-Inspection">
                          Rectified - Pending Re-Inspection
                        </option>
                        <option value="Closed & Approved">Closed &amp; Approved</option>
                      </select>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* TAKING-OVER CERTIFICATE (TOC) INTERLOCK FOOTER */}
      <div className="border-t border-zinc-800">
        {activeCatACount > 0 ? (
          <div className="bg-rose-950/20 border-t border-rose-800/40 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 font-mono text-xs">
            <div className="flex items-center gap-3">
              <ShieldAlert className="h-5 w-5 text-rose-500 shrink-0" />
              <div>
                <div className="font-bold text-rose-400 uppercase tracking-wider">
                  TOC ISSUANCE FROZEN: {activeCatACount} Critical Category-A snags unresolved
                </div>
                <div className="text-[11px] text-zinc-400 font-sans mt-0.5">
                  FIDIC Clause 11 / CPWD Clause 48 mandate: Zero structural or life-safety Category-A defects must remain prior to Taking-Over inspection clearance.
                </div>
              </div>
            </div>

            <button
              type="button"
              disabled
              className="bg-emerald-600 opacity-40 cursor-not-allowed text-zinc-100 font-bold uppercase tracking-wider text-xs px-6 py-2.5 font-mono whitespace-nowrap"
            >
              Generate Taking-Over Defect Clearance
            </button>
          </div>
        ) : (
          <div className="bg-emerald-950/20 border-t border-emerald-800/40 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 font-mono text-xs">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0" />
              <div>
                <div className="font-bold text-emerald-400 uppercase tracking-wider">
                  STATUTORY CLEARANCE ACHIEVED: Eligible for Taking-Over Certificate &amp; 50% Retention Release
                </div>
                <div className="text-[11px] text-zinc-400 font-sans mt-0.5">
                  All mandatory Category-A life safety defects closed and approved by SEOR &amp; Architect inspection ledger.
                </div>
              </div>
            </div>

            <button
              type="button"
              disabled={isPending}
              onClick={handleGenerateTOC}
              className="bg-emerald-600 hover:bg-emerald-500 text-zinc-100 font-bold uppercase tracking-wider text-xs px-6 py-2.5 font-mono whitespace-nowrap cursor-pointer transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Generate Taking-Over Defect Clearance</span>
            </button>
          </div>
        )}
      </div>

      {/* MODAL: Log New Defect Ticket */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-sans">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 p-6 shadow-2xl font-mono text-xs">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-100">
                Log New Pre-Handover Defect Ticket
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-100 p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="mt-4 space-y-3">
              <div>
                <label className="block text-zinc-400 text-[10px] uppercase mb-1">
                  Location &amp; Room Tag *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Room 305 (Level 03 East Wing)"
                  value={newItem.location}
                  onChange={(e) => setNewItem({ ...newItem, location: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 px-3 py-1.5 text-zinc-100 font-mono focus:outline-none focus:border-zinc-600"
                />
              </div>

              <div>
                <label className="block text-zinc-400 text-[10px] uppercase mb-1">
                  Discipline &amp; Trade *
                </label>
                <select
                  value={newItem.discipline}
                  onChange={(e) =>
                    setNewItem({ ...newItem, discipline: e.target.value as DisciplineType })
                  }
                  className="w-full bg-zinc-950 border border-zinc-800 px-3 py-1.5 text-zinc-100 font-mono focus:outline-none focus:border-zinc-600"
                >
                  <option value="Architectural/Civil">Architectural/Civil</option>
                  <option value="MEP Services">MEP Services</option>
                  <option value="Soft Furnishings & Joinery">Soft Furnishings &amp; Joinery</option>
                </select>
              </div>

              <div>
                <label className="block text-zinc-400 text-[10px] uppercase mb-1">
                  Defect Specification *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Describe non-conforming issue, tolerances, or missing fittings..."
                  value={newItem.defectSpecification}
                  onChange={(e) =>
                    setNewItem({ ...newItem, defectSpecification: e.target.value })
                  }
                  className="w-full bg-zinc-950 border border-zinc-800 px-3 py-1.5 text-zinc-100 font-mono focus:outline-none focus:border-zinc-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 text-[10px] uppercase mb-1">
                    Severity Tier *
                  </label>
                  <select
                    value={newItem.severity}
                    onChange={(e) =>
                      setNewItem({ ...newItem, severity: e.target.value as SnagSeverity })
                    }
                    className="w-full bg-zinc-950 border border-zinc-800 px-2.5 py-1.5 text-zinc-100 font-mono"
                  >
                    <option value="CAT-A CRITICAL">Category A (Blocks TOC)</option>
                    <option value="CAT-B MINOR">Category B (Superficial)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-400 text-[10px] uppercase mb-1">
                    Evidence Status
                  </label>
                  <select
                    value={newItem.evidenceStatus}
                    onChange={(e) =>
                      setNewItem({
                        ...newItem,
                        evidenceStatus: e.target.value as any,
                      })
                    }
                    className="w-full bg-zinc-950 border border-zinc-800 px-2.5 py-1.5 text-zinc-100 font-mono"
                  >
                    <option value="Photo Uploaded">Photo Uploaded</option>
                    <option value="Missing Photographic Proof">Missing Photographic Proof</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 text-[10px] uppercase mb-1">
                  Assigned Subcontractor
                </label>
                <input
                  type="text"
                  placeholder="e.g. Falcon Structural RCC Works"
                  value={newItem.subcontractor}
                  onChange={(e) => setNewItem({ ...newItem, subcontractor: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 px-3 py-1.5 text-zinc-100 font-mono focus:outline-none focus:border-zinc-600"
                />
              </div>

              <div className="pt-3 border-t border-zinc-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isPending}
                  className="px-3 py-1.5 border border-zinc-700 text-zinc-300 hover:text-zinc-100 uppercase text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-1.5 bg-zinc-100 hover:bg-zinc-300 text-zinc-950 font-bold uppercase text-xs flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Log Ticket</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default PunchListManager;