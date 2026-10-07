// components/setup/ScopeAssignmentMatrix.tsx
"use client";

import React, { useState, useMemo } from "react";
import {
  ShieldCheck,
  Lock,
  ToggleLeft,
  ToggleRight,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  Building2,
  FileSpreadsheet,
  Check,
  X,
  Layers,
  ArrowRight,
  KeyRound,
  Sparkles,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Type Definitions
// ---------------------------------------------------------------------------

export interface ProjectModule {
  id: string;
  name: string;
  code: string;
  description: string;
  isCore: boolean;
  enabled: boolean;
  clauseRef: string;
}

export type QmsAuthorityLevel =
  | "Data Entry Only"
  | "Submit RA Bill"
  | "Safety Officer";

export interface SubcontractorEntity {
  id: string;
  name: string;
  panGst: string;
  trade: string;
}

export interface SubcontractorBinding {
  id: string;
  subcontractorId: string;
  assignedSubheads: string[];
  authorityLevel: QmsAuthorityLevel;
  status: "RLS Policy Active" | "Pending Provisioning";
}

// ---------------------------------------------------------------------------
// Seed Data
// ---------------------------------------------------------------------------

const INITIAL_MODULES: ProjectModule[] = [
  // Core Modules (Locked ON)
  {
    id: "mod-mb",
    name: "Measurement Book (MB)",
    code: "MOD-MB-01",
    description: "CPWD Form 23 zero-trust digital measurement ledger with dual sign-off.",
    isCore: true,
    enabled: true,
    clauseRef: "CPWD Cl. 7 / Form 23",
  },
  {
    id: "mod-dpr",
    name: "DPR & Hindrance",
    code: "MOD-DPR-02",
    description: "Daily production logs, labor muster, and statutory hindrance registers.",
    isCore: true,
    enabled: true,
    clauseRef: "CPWD Cl. 5 / FIDIC 8.4",
  },
  {
    id: "mod-ncr",
    name: "NCR / Quality Gate",
    code: "MOD-NCR-03",
    description: "Non-conformance reports, root-cause tagging, and payment freeze interlocks.",
    isCore: true,
    enabled: true,
    clauseRef: "ISO 9001 / IS:456",
  },
  // Optional Toggles
  {
    id: "mod-10cc",
    name: "Clause 10CC Escalation Tracker",
    code: "MOD-ESC-04",
    description: "RBI wholesale price index (WPI) escalation formula calculator.",
    isCore: false,
    enabled: true,
    clauseRef: "CPWD Cl. 10CC",
  },
  {
    id: "mod-4d-bim",
    name: "4D BIM Telemetry",
    code: "MOD-BIM-05",
    description: "Spatial IFC progress mapping linked with WBS critical path schedule.",
    isCore: false,
    enabled: true,
    clauseRef: "ISO 19650-2",
  },
  {
    id: "mod-drone",
    name: "Drone Scan CDE",
    code: "MOD-DRN-06",
    description: "Photogrammetry point-cloud orthomosaic overlays for volumetric checks.",
    isCore: false,
    enabled: true,
    clauseRef: "MoCA UAS Rules",
  },
  {
    id: "mod-ptw",
    name: "PTW & Safety Gate",
    code: "MOD-HSE-07",
    description: "High-risk permit-to-work digital clearance prior to task execution.",
    isCore: false,
    enabled: true,
    clauseRef: "BOCW Act / OSHA 1926",
  },
  {
    id: "mod-ipc",
    name: "IPC & Statutory Waterfall",
    code: "MOD-IPC-08",
    description: "Interim payment certificates with statutory TDS, GST, and retention clawbacks.",
    isCore: false,
    enabled: true,
    clauseRef: "FIDIC Cl. 14 / Cl. 7",
  },
  {
    id: "mod-mat-rec",
    name: "Material Reconciliation",
    code: "MOD-MAT-09",
    description: "Theoretical vs. actual consumption auditing with 2x penal recovery rates.",
    isCore: false,
    enabled: false,
    clauseRef: "CPWD Cl. 42",
  },
  {
    id: "mod-dlp-pbg",
    name: "Defect Liability & PBG Escrow",
    code: "MOD-DLP-10",
    description: "Defect liability period countdown and automated bank guarantee expiration triggers.",
    isCore: false,
    enabled: false,
    clauseRef: "FIDIC Cl. 11 / Cl. 4.2",
  },
  {
    id: "mod-cobie",
    name: "Submittals & Progressive COBie",
    code: "MOD-COB-11",
    description: "FM asset component data extraction directly from approved shop drawings.",
    isCore: false,
    enabled: false,
    clauseRef: "BS 1192-4 / COBie v2.4",
  },
  {
    id: "mod-stripping",
    name: "Formwork Stripping Clearance",
    code: "MOD-FMW-12",
    description: "Concrete maturity-based deshuttering safety clearance gate.",
    isCore: false,
    enabled: false,
    clauseRef: "IS 456:2000 Cl. 11.3",
  },
];

const ENLISTED_SUBCONTRACTORS: SubcontractorEntity[] = [
  {
    id: "sub-apex",
    name: "Apex Interiors & Millwork LLP",
    panGst: "07AAACR1234F1Z8",
    trade: "Carpentry, Joinery & False Ceilings",
  },
  {
    id: "sub-sterling",
    name: "Sterling Foundation Works Pvt Ltd",
    panGst: "07AABCS5678G2Z1",
    trade: "Piling, Deep Excavation & Concrete Substructure",
  },
  {
    id: "sub-voltas",
    name: "Voltas Electro-Mech Engineering Ltd",
    panGst: "07AACCV9012H1Z5",
    trade: "HT/LT Substations, Cable Trays & Earthing",
  },
  {
    id: "sub-shree",
    name: "Shree Civil & Concrete Contractors",
    panGst: "07AABCS3456K1Z9",
    trade: "Superstructure RCC, Shuttering & Masonry",
  },
  {
    id: "sub-flowtech",
    name: "FlowTech Plumbing & Firefighting Corp",
    panGst: "07AABCF7890L1Z3",
    trade: "Piping, Sanitary Fixtures & Hydrant Networks",
  },
];

const STANDARD_BOQ_SUBHEADS = [
  "Subhead 2: Earthwork in Excavation",
  "Subhead 4: Plain Cement Concrete (PCC)",
  "Subhead 5: Reinforced Cement Concrete (RCC)",
  "Subhead 6: Brick Work & Masonry",
  "Subhead 9: Woodwork & Joinery",
  "Subhead 11: Flooring, Tiling & Cladding",
  "Subhead 12: Electrical Installations & Wiring",
  "Subhead 18: Plumbing & Sanitary Installations",
  "Subhead 21: Aluminium Works & Structural Glazing",
];

const INITIAL_BINDINGS: SubcontractorBinding[] = [
  {
    id: "bind-001",
    subcontractorId: "sub-apex",
    assignedSubheads: ["Subhead 9: Woodwork & Joinery", "Subhead 11: Flooring, Tiling & Cladding"],
    authorityLevel: "Submit RA Bill",
    status: "RLS Policy Active",
  },
  {
    id: "bind-002",
    subcontractorId: "sub-sterling",
    assignedSubheads: ["Subhead 2: Earthwork in Excavation", "Subhead 4: Plain Cement Concrete (PCC)"],
    authorityLevel: "Submit RA Bill",
    status: "RLS Policy Active",
  },
  {
    id: "bind-003",
    subcontractorId: "sub-voltas",
    assignedSubheads: ["Subhead 12: Electrical Installations & Wiring"],
    authorityLevel: "Submit RA Bill",
    status: "RLS Policy Active",
  },
  {
    id: "bind-004",
    subcontractorId: "sub-shree",
    assignedSubheads: ["Subhead 5: Reinforced Cement Concrete (RCC)"],
    authorityLevel: "Submit RA Bill",
    status: "RLS Policy Active",
  },
  {
    id: "bind-005",
    subcontractorId: "sub-flowtech",
    assignedSubheads: ["Subhead 18: Plumbing & Sanitary Installations"],
    authorityLevel: "Data Entry Only",
    status: "RLS Policy Active",
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ScopeAssignmentMatrix() {
  const [modules, setModules] = useState<ProjectModule[]>(INITIAL_MODULES);
  const [bindings, setBindings] = useState<SubcontractorBinding[]>(INITIAL_BINDINGS);
  const [activeSubheadDropdown, setActiveSubheadDropdown] = useState<string | null>(null);
  const [isEnforcing, setIsEnforcing] = useState(false);
  const [enforceSuccess, setEnforceSuccess] = useState(false);

  // Toggle optional modules
  const handleToggleModule = (moduleId: string) => {
    setModules((prev) =>
      prev.map((mod) => {
        if (mod.id === moduleId) {
          if (mod.isCore) return mod; // Locked ON
          return { ...mod, enabled: !mod.enabled };
        }
        return mod;
      })
    );
  };

  // Add new binding row
  const handleAddBinding = () => {
    const newBinding: SubcontractorBinding = {
      id: `bind-${Date.now()}`,
      subcontractorId: ENLISTED_SUBCONTRACTORS[0].id,
      assignedSubheads: [],
      authorityLevel: "Data Entry Only",
      status: "Pending Provisioning",
    };
    setBindings((prev) => [...prev, newBinding]);
  };

  // Remove binding row
  const handleRemoveBinding = (id: string) => {
    setBindings((prev) => prev.filter((b) => b.id !== id));
  };

  // Update field in binding row
  const handleUpdateBinding = (
    id: string,
    field: keyof SubcontractorBinding,
    value: any
  ) => {
    setBindings((prev) =>
      prev.map((b) => (b.id === id ? { ...b, [field]: value } : b))
    );
  };

  // Toggle subhead selection for a binding
  const handleToggleSubheadSelection = (bindingId: string, subhead: string) => {
    setBindings((prev) =>
      prev.map((b) => {
        if (b.id !== bindingId) return b;
        const exists = b.assignedSubheads.includes(subhead);
        const updated = exists
          ? b.assignedSubheads.filter((s) => s !== subhead)
          : [...b.assignedSubheads, subhead];
        return { ...b, assignedSubheads: updated };
      })
    );
  };

  // Enforce RLS Matrix Action
  const handleEnforceRLS = () => {
    setIsEnforcing(true);
    setTimeout(() => {
      setIsEnforcing(false);
      setEnforceSuccess(true);
      // Set all to RLS Policy Active
      setBindings((prev) =>
        prev.map((b) => ({ ...b, status: "RLS Policy Active" }))
      );
      setTimeout(() => setEnforceSuccess(false), 4500);
    }, 1200);
  };

  // Telemetry computation
  const activeCount = useMemo(
    () => modules.filter((m) => m.enabled).length,
    [modules]
  );

  const assignedSubheadsSet = useMemo(() => {
    const set = new Set<string>();
    bindings.forEach((b) => b.assignedSubheads.forEach((s) => set.add(s)));
    return set;
  }, [bindings]);

  const unassignedSubheads = useMemo(() => {
    return STANDARD_BOQ_SUBHEADS.filter((s) => !assignedSubheadsSet.has(s));
  }, [assignedSubheadsSet]);

  return (
    <div className="bg-zinc-900 border border-zinc-800 shadow-2xl overflow-hidden">
      {/* =====================================================================
          ENFORCEMENT SUCCESS BANNER
          ===================================================================== */}
      {enforceSuccess && (
        <div className="bg-emerald-950/80 border-b border-emerald-800/80 p-4 text-emerald-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
            <div>
              <div className="text-xs font-mono font-bold tracking-wider uppercase">
                Supabase Row-Level Security Matrix Enforced & Deployed
              </div>
              <div className="text-xs text-emerald-300/90 mt-0.5">
                Dynamic RLS policies synchronized across {bindings.length} vendor tenant schemas. Active scope partition applied to public.measurement_book_entries and public.boq_items.
              </div>
            </div>
          </div>
          <span className="text-[10px] font-mono uppercase bg-emerald-900/60 border border-emerald-700/80 text-emerald-300 px-2.5 py-1">
            STATUS: ACTIVE
          </span>
        </div>
      )}

      {/* =====================================================================
          SPLIT-PANE LAYOUT
          ===================================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-12 min-h-[640px]">
        {/* ===================================================================
            LEFT PANE: MODULE TOGGLES (col-span-1 md:col-span-4)
            =================================================================== */}
        <div className="col-span-1 md:col-span-4 p-6 border-r border-zinc-800 bg-zinc-900 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                  Statutory Module Toggles
                </span>
                <h3 className="text-base font-bold text-zinc-100 mt-0.5">
                  Project Feature Governance
                </h3>
              </div>
              <span className="text-xs font-mono font-bold px-2 py-0.5 bg-zinc-950 border border-zinc-800 text-zinc-300">
                {activeCount}/{modules.length} ACTIVE
              </span>
            </div>

            <p className="text-xs text-zinc-400 mt-3 leading-relaxed">
              Mandatory core governance engines remain locked under CPWD/FIDIC statutory directives. Supplementary QMS and telemetry modules can be configured per contract tier.
            </p>

            {/* Modules List */}
            <div className="mt-5 space-y-3">
              {modules.map((mod) => (
                <div
                  key={mod.id}
                  className={`p-3 border transition-colors ${
                    mod.enabled
                      ? "bg-zinc-950/80 border-zinc-800"
                      : "bg-zinc-900/50 border-zinc-800/60 opacity-65"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-zinc-100">
                          {mod.name}
                        </span>
                        {mod.isCore ? (
                          <span className="inline-flex items-center gap-1 text-[9px] font-mono uppercase bg-zinc-800 border border-zinc-700 text-zinc-300 px-1.5 py-0.2">
                            <Lock className="h-2.5 w-2.5 text-zinc-400" />
                            Core Locked
                          </span>
                        ) : (
                          <span className="text-[9px] font-mono uppercase text-zinc-500">
                            {mod.clauseRef}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-400 leading-snug">
                        {mod.description}
                      </p>
                    </div>

                    {/* Toggle Control */}
                    <div>
                      {mod.isCore ? (
                        <div
                          title="Mandatory Core Module (Cannot be toggled OFF)"
                          className="cursor-not-allowed opacity-80"
                        >
                          <ToggleRight className="h-6 w-6 text-emerald-500" />
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleToggleModule(mod.id)}
                          className="focus:outline-none transition-colors"
                          title={mod.enabled ? "Disable Module" : "Enable Module"}
                        >
                          {mod.enabled ? (
                            <ToggleRight className="h-6 w-6 text-emerald-500 hover:text-emerald-400" />
                          ) : (
                            <ToggleLeft className="h-6 w-6 text-zinc-600 hover:text-zinc-500" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Left Footer telemetry */}
          <div className="mt-6 pt-4 border-t border-zinc-800 flex items-center justify-between text-[11px] font-mono text-zinc-500">
            <span>CORE RATIO: 3/3 (100%)</span>
            <span>AUDIT LOG: ENABLED</span>
          </div>
        </div>

        {/* ===================================================================
            RIGHT PANE: BOQ SUBHEAD BINDING & RLS MATRIX (col-span-1 md:col-span-8)
            =================================================================== */}
        <div className="col-span-1 md:col-span-8 p-6 bg-zinc-950 flex flex-col justify-between">
          <div>
            {/* Header with Add Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
              <div>
                <span className="text-xs font-mono uppercase tracking-wider text-zinc-400">
                  Row-Level Security (RLS) Configuration
                </span>
                <h3 className="text-base font-bold text-zinc-100 mt-0.5">
                  Subcontractor BOQ Scope Binding Matrix
                </h3>
              </div>

              <button
                type="button"
                onClick={handleAddBinding}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-medium transition-colors"
              >
                <Plus className="h-3.5 w-3.5 text-zinc-400" />
                Add Subcontractor Binding
              </button>
            </div>

            {/* Unassigned Subheads Alert Box if any */}
            {unassignedSubheads.length > 0 && (
              <div className="mt-4 p-3 bg-amber-950/20 border border-amber-800/40 text-xs text-amber-300/90 flex items-start gap-2.5">
                <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-semibold text-amber-200">
                    Unassigned Baseline Subheads Detected ({unassignedSubheads.length}):
                  </span>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {unassignedSubheads.map((sub) => (
                      <span
                        key={sub}
                        className="font-mono text-[10px] px-2 py-0.5 bg-zinc-900 border border-amber-700/50 text-amber-300"
                      >
                        {sub}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Subcontractor Binding Table */}
            <div className="mt-5 border border-zinc-800 overflow-x-auto bg-zinc-900/30">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-900/90 text-zinc-400 font-mono text-[11px] uppercase tracking-wider">
                    <th className="py-3 px-4">Subcontractor / Vendor</th>
                    <th className="py-3 px-4">Assigned BOQ Subhead</th>
                    <th className="py-3 px-4">QMS Authority Level</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-3 text-center w-12">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800 font-sans">
                  {bindings.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-zinc-500 italic">
                        No subcontractor bindings defined. Click &ldquo;Add Subcontractor Binding&rdquo; to begin.
                      </td>
                    </tr>
                  ) : (
                    bindings.map((b) => {
                      const selectedEntity = ENLISTED_SUBCONTRACTORS.find(
                        (e) => e.id === b.subcontractorId
                      );
                      const isDropdownOpen = activeSubheadDropdown === b.id;

                      return (
                        <tr
                          key={b.id}
                          className="hover:bg-zinc-900/50 transition-colors"
                        >
                          {/* Column 1: Subcontractor / Vendor Dropdown */}
                          <td className="py-3 px-4 align-top w-[28%]">
                            <div className="space-y-1">
                              <select
                                value={b.subcontractorId}
                                onChange={(e) =>
                                  handleUpdateBinding(
                                    b.id,
                                    "subcontractorId",
                                    e.target.value
                                  )
                                }
                                className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 text-xs px-2.5 py-1.5 focus:outline-none focus:border-zinc-700"
                              >
                                {ENLISTED_SUBCONTRACTORS.map((sc) => (
                                  <option key={sc.id} value={sc.id}>
                                    {sc.name}
                                  </option>
                                ))}
                              </select>
                              {selectedEntity && (
                                <div className="text-[10px] font-mono text-zinc-500 pl-0.5">
                                  GST: {selectedEntity.panGst}
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Column 2: Assigned BOQ Subhead Multi-select */}
                          <td className="py-3 px-4 align-top w-[36%] relative">
                            <div>
                              {/* Trigger button */}
                              <button
                                type="button"
                                onClick={() =>
                                  setActiveSubheadDropdown(
                                    isDropdownOpen ? null : b.id
                                  )
                                }
                                className="w-full text-left bg-zinc-950 border border-zinc-800 hover:border-zinc-700 text-zinc-200 text-xs px-2.5 py-1.5 flex items-center justify-between transition-colors"
                              >
                                <span className="truncate">
                                  {b.assignedSubheads.length === 0 ? (
                                    <span className="text-zinc-500 italic">
                                      Select Subheads...
                                    </span>
                                  ) : (
                                    `${b.assignedSubheads.length} Subhead${
                                      b.assignedSubheads.length > 1 ? "s" : ""
                                    } Bound`
                                  )}
                                </span>
                                <ChevronDown className="h-3.5 w-3.5 text-zinc-500 ml-2 shrink-0" />
                              </button>

                              {/* Multi-select Dropdown Popover */}
                              {isDropdownOpen && (
                                <div className="absolute z-20 left-4 right-4 mt-1 bg-zinc-900 border border-zinc-700 shadow-xl max-h-56 overflow-y-auto p-2 space-y-1">
                                  <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-zinc-800 px-1 text-[10px] font-mono text-zinc-400 uppercase">
                                    <span>Select CPWD DSR Subheads</span>
                                    <button
                                      type="button"
                                      onClick={() => setActiveSubheadDropdown(null)}
                                      className="hover:text-zinc-200"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </div>
                                  {STANDARD_BOQ_SUBHEADS.map((subhead) => {
                                    const checked = b.assignedSubheads.includes(subhead);
                                    return (
                                      <div
                                        key={subhead}
                                        onClick={() =>
                                          handleToggleSubheadSelection(b.id, subhead)
                                        }
                                        className={`flex items-center justify-between px-2 py-1 text-xs cursor-pointer select-none transition-colors ${
                                          checked
                                            ? "bg-zinc-800 text-zinc-100"
                                            : "hover:bg-zinc-800/50 text-zinc-400"
                                        }`}
                                      >
                                        <span className="truncate pr-2">{subhead}</span>
                                        {checked ? (
                                          <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                                        ) : (
                                          <div className="h-3.5 w-3.5 border border-zinc-700 shrink-0" />
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                              {/* Selected Chips */}
                              <div className="flex flex-wrap gap-1 mt-1.5">
                                {b.assignedSubheads.map((sub) => (
                                  <span
                                    key={sub}
                                    className="inline-flex items-center gap-1 text-[10px] font-mono bg-zinc-950 border border-zinc-800 text-zinc-300 px-1.5 py-0.5"
                                  >
                                    <span className="truncate max-w-[140px]">
                                      {sub.replace(/^Subhead\s*/, "SH-")}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleToggleSubheadSelection(b.id, sub)
                                      }
                                      className="text-zinc-500 hover:text-zinc-300"
                                    >
                                      <X className="h-2.5 w-2.5" />
                                    </button>
                                  </span>
                                ))}
                              </div>
                            </div>
                          </td>

                          {/* Column 3: QMS Authority Level Dropdown */}
                          <td className="py-3 px-4 align-top w-[20%]">
                            <select
                              value={b.authorityLevel}
                              onChange={(e) =>
                                handleUpdateBinding(
                                  b.id,
                                  "authorityLevel",
                                  e.target.value as QmsAuthorityLevel
                                )
                              }
                              className="w-full bg-zinc-950 border border-zinc-800 text-zinc-100 text-xs px-2 py-1.5 focus:outline-none focus:border-zinc-700"
                            >
                              <option value="Data Entry Only">Data Entry Only</option>
                              <option value="Submit RA Bill">Submit RA Bill</option>
                              <option value="Safety Officer">Safety Officer</option>
                            </select>
                            <div className="text-[10px] font-mono text-zinc-500 mt-1 pl-0.5">
                              {b.authorityLevel === "Submit RA Bill"
                                ? "Full Commercial Access"
                                : b.authorityLevel === "Safety Officer"
                                ? "PTW Clearances Only"
                                : "Read/Write Measurements"}
                            </div>
                          </td>

                          {/* Column 4: Status Pill */}
                          <td className="py-3 px-4 align-top w-[14%] whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-1 border ${
                                b.status === "RLS Policy Active"
                                  ? "bg-emerald-950/40 border-emerald-800/60 text-emerald-400"
                                  : "bg-amber-950/40 border-amber-800/60 text-amber-400"
                              }`}
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                  b.status === "RLS Policy Active"
                                    ? "bg-emerald-400"
                                    : "bg-amber-400"
                                }`}
                              />
                              {b.status}
                            </span>
                          </td>

                          {/* Column 5: Action (Delete) */}
                          <td className="py-3 px-3 align-top text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveBinding(b.id)}
                              className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-zinc-900 border border-transparent hover:border-zinc-800 transition-colors"
                              title="Delete Binding"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* ===================================================================
              ACTION FOOTER
              =================================================================== */}
          <div className="mt-8 pt-5 border-t border-zinc-800 space-y-3">
            <button
              type="button"
              disabled={isEnforcing}
              onClick={handleEnforceRLS}
              className={`w-full py-3 uppercase font-bold tracking-widest text-sm transition-colors flex items-center justify-center gap-2 ${
                isEnforcing
                  ? "bg-zinc-800 text-zinc-500 cursor-wait"
                  : "bg-emerald-600 hover:bg-emerald-500 text-zinc-100"
              }`}
            >
              {isEnforcing ? (
                <>
                  <KeyRound className="h-4 w-4 animate-spin text-zinc-400" />
                  <span>Generating Postgres Dynamic Policies...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4 text-zinc-100" />
                  <span>Enforce Scope & Activate RLS Matrix</span>
                </>
              )}
            </button>

            {/* Warning Text: Small mono string below button */}
            <p className="text-[11px] font-mono text-zinc-500 text-center tracking-tight">
              WARNING: Subcontractors will be strictly isolated to assigned subheads via Supabase RLS. Ensure all baseline BOQ items are assigned.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
