// components/setup/BIMDsrMapper.tsx
"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  UploadCloud,
  FileCode,
  CheckCircle2,
  AlertTriangle,
  Search,
  Layers,
  ArrowRight,
  Database,
  Plus,
  Trash2,
  FileSpreadsheet,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Type Definitions
// ---------------------------------------------------------------------------

export interface ExtractedModelElement {
  id: string;
  elementType: string;
  material: string;
  quantity: number;
  unit: "cum" | "sqm" | "m" | "MT";
  mappedDsrCode?: string;
  mappedDsrDescription?: string;
  mappedRateInr?: number;
}

export interface DsrReferenceItem {
  code: string;
  subhead: string;
  description: string;
  unit: "cum" | "sqm" | "m" | "MT";
  rateInr: number;
}

// ---------------------------------------------------------------------------
// DSR Reference Database (CPWD DSR 2023)
// ---------------------------------------------------------------------------

const DSR_DATABASE: DsrReferenceItem[] = [
  {
    code: "CPWD DSR 4.1.3",
    subhead: "Subhead 4: Concrete Work",
    description: "PCC 1:4:8 (1 cement : 4 coarse sand : 8 graded stone aggregate)",
    unit: "cum",
    rateInr: 5120,
  },
  {
    code: "CPWD DSR 5.1.2",
    subhead: "Subhead 5: Reinforced Cement Concrete",
    description: "RCC M25 in footing, base of column, raft foundation",
    unit: "cum",
    rateInr: 6850,
  },
  {
    code: "CPWD DSR 5.2.2",
    subhead: "Subhead 5: Reinforced Cement Concrete",
    description: "RCC M25 Grade in Beams, Lintels, Columns & Suspended Floors",
    unit: "cum",
    rateInr: 7420,
  },
  {
    code: "CPWD DSR 5.33.1",
    subhead: "Subhead 5: Centering & Shuttering",
    description: "Centering & shuttering including propping for suspended floors & roofs",
    unit: "sqm",
    rateInr: 640,
  },
  {
    code: "CPWD DSR 6.1.1",
    subhead: "Subhead 6: Masonry Work",
    description: "AAC Block Masonry 200mm in Superstructure with Cement Mortar 1:4",
    unit: "cum",
    rateInr: 4280,
  },
];

// Initial Parsed Elements from .IFC / .RVT Model
const INITIAL_ELEMENTS: ExtractedModelElement[] = [
  {
    id: "elem-01",
    elementType: "Structural Foundation (Raft Bay A)",
    material: "Concrete M25",
    quantity: 145.5,
    unit: "cum",
    mappedDsrCode: "CPWD DSR 5.1.2",
    mappedDsrDescription: "RCC M25 in footing, base of column, raft foundation",
    mappedRateInr: 6850,
  },
  {
    id: "elem-02",
    elementType: "Structural Columns (Grid B4-B8 L01-L03)",
    material: "Concrete M25",
    quantity: 88.2,
    unit: "cum",
    mappedDsrCode: "CPWD DSR 5.2.2",
    mappedDsrDescription: "RCC M25 Grade in Beams, Lintels, Columns & Suspended Floors",
    mappedRateInr: 7420,
  },
  {
    id: "elem-03",
    elementType: "Suspended Slab Shuttering (Level 02)",
    material: "Formwork Plywood 18mm",
    quantity: 340.0,
    unit: "sqm",
    mappedDsrCode: "CPWD DSR 5.33.1",
    mappedDsrDescription: "Centering & shuttering including propping for suspended floors & roofs",
    mappedRateInr: 640,
  },
  {
    id: "elem-04",
    elementType: "Perimeter Partition Walls (Level 02)",
    material: "AAC Block 200mm",
    quantity: 112.0,
    unit: "cum",
    // Unmapped element initially to showcase the interlock
    mappedDsrCode: undefined,
    mappedDsrDescription: undefined,
    mappedRateInr: undefined,
  },
];

// ---------------------------------------------------------------------------
// Client Component: BIMDsrMapper
// ---------------------------------------------------------------------------

export function BIMDsrMapper() {
  const router = useRouter();

  // Elements State
  const [elements, setElements] = useState<ExtractedModelElement[]>(INITIAL_ELEMENTS);
  const [selectedElementIds, setSelectedElementIds] = useState<string[]>([]);
  const [activeModelFile, setActiveModelFile] = useState<string>("Gomti-Nagar-TowerA-Rev04.ifc");

  // DSR Search State
  const [searchQuery, setSearchQuery] = useState("Subhead 6");
  const [selectedDsrCode, setSelectedDsrCode] = useState<string>("CPWD DSR 6.1.1");
  const [committedSuccess, setCommittedSuccess] = useState(false);

  // Filtered DSR Reference Items
  const filteredDsrList = useMemo(() => {
    if (!searchQuery.trim()) return DSR_DATABASE;
    const q = searchQuery.toLowerCase();
    return DSR_DATABASE.filter(
      (item) =>
        item.code.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.subhead.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  // Selected DSR Object
  const activeDsrItem = useMemo(() => {
    return (
      DSR_DATABASE.find((item) => item.code === selectedDsrCode) ||
      filteredDsrList[0] ||
      DSR_DATABASE[0]
    );
  }, [selectedDsrCode, filteredDsrList]);

  // Batch Select Toggle
  const handleToggleSelectElement = (id: string) => {
    setSelectedElementIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedElementIds.length === elements.length) {
      setSelectedElementIds([]);
    } else {
      setSelectedElementIds(elements.map((e) => e.id));
    }
  };

  // Assign Selected DSR Item to Selected Elements
  const handleAssignMapping = () => {
    if (selectedElementIds.length === 0) {
      alert("Please select one or more extracted model elements to map.");
      return;
    }
    if (!activeDsrItem) return;

    setElements((prev) =>
      prev.map((elem) => {
        if (selectedElementIds.includes(elem.id)) {
          return {
            ...elem,
            mappedDsrCode: activeDsrItem.code,
            mappedDsrDescription: activeDsrItem.description,
            mappedRateInr: activeDsrItem.rateInr,
          };
        }
        return elem;
      })
    );
    setSelectedElementIds([]);
  };

  // Unmap an element
  const handleUnmapElement = (id: string) => {
    setElements((prev) =>
      prev.map((elem) =>
        elem.id === id
          ? {
              ...elem,
              mappedDsrCode: undefined,
              mappedDsrDescription: undefined,
              mappedRateInr: undefined,
            }
          : elem
      )
    );
  };

  // Derived Metrics
  const unmappedElementsCount = useMemo(() => {
    return elements.filter((e) => !e.mappedDsrCode).length;
  }, [elements]);

  const mappedElements = useMemo(() => {
    return elements.filter((e) => Boolean(e.mappedDsrCode));
  }, [elements]);

  const totalBaselineBoqValue = useMemo(() => {
    return mappedElements.reduce((sum, item) => {
      return sum + item.quantity * (item.mappedRateInr || 0);
    }, 0);
  }, [mappedElements]);

  // Interlock Rule: Button must be disabled if there are unmapped elements
  const isInterlockActive = unmappedElementsCount > 0;

  const handleCommitBaseline = () => {
    if (isInterlockActive) {
      alert("Interlock Violation: All extracted BIM elements must be mapped to CPWD DSR codes before committing baseline BOQ.");
      return;
    }
    setCommittedSuccess(true);
    setTimeout(() => {
      alert("Baseline BOQ successfully committed to Contract Ledger. Initialized CPWD Form 23 Measurement Ledger.");
      router.push("/finance/measurement-book");
    }, 1200);
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 shadow-2xl grid grid-cols-1 md:grid-cols-12 overflow-hidden font-sans">
      {/* ===================================================================
          LEFT PANE: Model Element Extraction (col-span-6)
          =================================================================== */}
      <div className="col-span-1 md:col-span-6 p-6 space-y-5 border-b md:border-b-0 md:border-r border-zinc-800">
        {/* Upload Zone */}
        <div className="border-2 border-dashed border-zinc-700 hover:border-zinc-500 bg-zinc-950/60 p-5 text-center cursor-pointer transition-colors font-mono">
          <UploadCloud className="h-6 w-6 text-zinc-400 mx-auto mb-2" />
          <div className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
            3D BIM Volumetric Ingestion (.IFC / .RVT)
          </div>
          <p className="text-[11px] text-zinc-400 font-sans mt-0.5">
            Drag and drop architectural or structural model to parse spatial geometries.
          </p>

          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-zinc-900 border border-zinc-800 text-[11px] text-emerald-400">
            <FileCode className="h-3.5 w-3.5 text-emerald-400" />
            <span className="font-bold">{activeModelFile}</span>
            <span className="text-zinc-500">• 42.8 MB</span>
          </div>
        </div>

        {/* Extracted Data Table */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between font-mono text-xs">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-zinc-400" />
              <span className="font-bold uppercase tracking-wider text-zinc-200">
                Extracted Model Elements ({elements.length})
              </span>
            </div>
            <button
              type="button"
              onClick={handleSelectAll}
              className="text-[10px] uppercase text-zinc-400 hover:text-zinc-200 underline cursor-pointer"
            >
              {selectedElementIds.length === elements.length ? "Deselect All" : "Select All"}
            </button>
          </div>

          <div className="border border-zinc-800 overflow-x-auto bg-zinc-950/80">
            <table className="w-full text-left border-collapse font-mono text-xs">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900 text-[10px] text-zinc-400 uppercase tracking-wider">
                  <th className="py-2.5 px-3 w-8 text-center">
                    <input
                      type="checkbox"
                      checked={selectedElementIds.length === elements.length && elements.length > 0}
                      onChange={handleSelectAll}
                      className="rounded-none border-zinc-700 bg-zinc-950 text-emerald-600 focus:ring-0 cursor-pointer"
                    />
                  </th>
                  <th className="py-2.5 px-3 font-normal">Element Type</th>
                  <th className="py-2.5 px-3 font-normal">Material</th>
                  <th className="py-2.5 px-3 font-normal text-right">Quantity</th>
                  <th className="py-2.5 px-3 font-normal text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {elements.map((elem) => {
                  const isSelected = selectedElementIds.includes(elem.id);
                  const isMapped = Boolean(elem.mappedDsrCode);

                  return (
                    <tr
                      key={elem.id}
                      className={`hover:bg-zinc-800/30 transition-colors ${
                        isSelected ? "bg-zinc-800/40" : ""
                      }`}
                    >
                      <td className="py-2.5 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectElement(elem.id)}
                          className="rounded-none border-zinc-700 bg-zinc-950 text-emerald-600 focus:ring-0 cursor-pointer"
                        />
                      </td>

                      <td className="py-2.5 px-3">
                        <div className="font-bold text-zinc-200">{elem.elementType}</div>
                        {isMapped && (
                          <div className="text-[10px] text-emerald-400 truncate max-w-[200px]">
                            → {elem.mappedDsrCode}
                          </div>
                        )}
                      </td>

                      <td className="py-2.5 px-3 text-zinc-400 font-sans text-xs">
                        {elem.material}
                      </td>

                      <td className="py-2.5 px-3 text-right font-bold text-zinc-100 tabular-nums whitespace-nowrap">
                        {elem.quantity.toFixed(2)} {elem.unit}
                      </td>

                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 text-[9px] font-bold border uppercase tracking-wider ${
                            isMapped
                              ? "bg-emerald-950/60 border-emerald-800 text-emerald-400"
                              : "bg-amber-950/60 border-amber-800 text-amber-400 animate-pulse"
                          }`}
                        >
                          {isMapped ? "Mapped ✓" : "Unmapped"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="text-[11px] text-zinc-500 font-mono flex items-center justify-between pt-1">
            <span>Selected: {selectedElementIds.length} element(s)</span>
            {unmappedElementsCount > 0 ? (
              <span className="text-amber-400 font-bold flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                <span>{unmappedElementsCount} element(s) require CPWD DSR assignment</span>
              </span>
            ) : (
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                <span>All elements successfully reconciled</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ===================================================================
          RIGHT PANE: CPWD DSR Mapping & BOQ Generation (col-span-6)
          =================================================================== */}
      <div className="col-span-1 md:col-span-6 bg-zinc-950 p-6 flex flex-col justify-between space-y-5 font-mono text-xs">
        <div className="space-y-4">
          {/* Header & Search */}
          <div>
            <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
              <Database className="h-4 w-4 text-emerald-400" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-200">
                CPWD DSR Reconciler &amp; BOQ Generator
              </h2>
            </div>

            {/* DSR Code Search */}
            <div className="mt-3 relative">
              <Search className="h-3.5 w-3.5 absolute left-3 top-2.5 text-zinc-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search CPWD standard codes (e.g. Subhead 5 RCC, DSR 6.1)..."
                className="w-full bg-zinc-900 border border-zinc-800 pl-8 pr-3 py-2 text-zinc-100 font-mono text-xs focus:outline-none focus:border-zinc-600"
              />
            </div>
          </div>

          {/* DSR Item Selector & Mapping Assignment Panel */}
          <div className="bg-zinc-900 border border-zinc-800 p-3.5 space-y-3">
            <div className="text-[10px] uppercase font-bold text-zinc-400">
              Matching CPWD DSR Standard Schedule
            </div>

            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {filteredDsrList.map((dsr) => {
                const isSelected = activeDsrItem?.code === dsr.code;

                return (
                  <div
                    key={dsr.code}
                    onClick={() => setSelectedDsrCode(dsr.code)}
                    className={`p-2 border text-left cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-zinc-950 border-emerald-800 text-zinc-100"
                        : "bg-zinc-950/40 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-400">{dsr.code}</span>
                      <span className="font-bold text-zinc-200 tabular-nums">
                        ₹ {dsr.rateInr.toLocaleString("en-IN")} / {dsr.unit}
                      </span>
                    </div>
                    <div className="text-[11px] font-sans text-zinc-300 line-clamp-1 mt-0.5">
                      {dsr.description}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Mapping Assignment Action */}
            <div className="pt-2 border-t border-zinc-800 flex items-center justify-between gap-3">
              <span className="text-[10px] text-zinc-400 font-sans">
                Target: {selectedElementIds.length} element(s) selected
              </span>

              <button
                type="button"
                onClick={handleAssignMapping}
                disabled={selectedElementIds.length === 0}
                className="bg-zinc-100 hover:bg-zinc-300 disabled:opacity-30 disabled:cursor-not-allowed text-zinc-950 font-bold uppercase tracking-wider text-[10px] px-3.5 py-1.5 transition-colors cursor-pointer"
              >
                Assign DSR Code to Selected
              </button>
            </div>
          </div>

          {/* Mapped BOQ Ledger */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold uppercase tracking-wider text-zinc-200 flex items-center gap-1.5">
                <FileSpreadsheet className="h-3.5 w-3.5 text-zinc-400" />
                Mapped BOQ Ledger (Running Schedule)
              </span>
              <span className="text-zinc-500 text-[10px]">{mappedElements.length} BOQ Lines</span>
            </div>

            <div className="border border-zinc-800 overflow-x-auto bg-zinc-950">
              <table className="w-full text-left border-collapse font-mono text-[11px]">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-900/80 text-[9px] text-zinc-500 uppercase tracking-wider">
                    <th className="py-2 px-2.5 font-normal">DSR Code</th>
                    <th className="py-2 px-2.5 font-normal">Description</th>
                    <th className="py-2 px-2.5 font-normal text-right">Qty</th>
                    <th className="py-2 px-2 font-normal text-center">Unit</th>
                    <th className="py-2 px-2.5 font-normal text-right">Rate (₹)</th>
                    <th className="py-2 px-2.5 font-normal text-right">Amount (₹)</th>
                    <th className="py-2 px-1.5 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {mappedElements.map((item) => {
                    const amount = item.quantity * (item.mappedRateInr || 0);

                    return (
                      <tr key={item.id} className="hover:bg-zinc-900/50">
                        <td className="py-2 px-2.5 font-bold text-zinc-200 whitespace-nowrap">
                          {item.mappedDsrCode}
                        </td>
                        <td className="py-2 px-2.5 text-zinc-300 font-sans text-xs max-w-[140px] truncate">
                          {item.mappedDsrDescription}
                        </td>
                        <td className="py-2 px-2.5 text-right font-bold text-zinc-200 tabular-nums">
                          {item.quantity.toFixed(1)}
                        </td>
                        <td className="py-2 px-2 text-center text-zinc-400">{item.unit}</td>
                        <td className="py-2 px-2.5 text-right text-zinc-300 tabular-nums">
                          {item.mappedRateInr?.toLocaleString("en-IN")}
                        </td>
                        <td className="py-2 px-2.5 text-right font-bold text-emerald-400 tabular-nums whitespace-nowrap">
                          ₹ {amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                        </td>
                        <td className="py-2 px-1.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleUnmapElement(item.id)}
                            className="text-zinc-600 hover:text-rose-400 p-0.5 transition-colors"
                            title="Unmap DSR Code"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Running Total Card */}
            <div className="p-3 bg-zinc-900 border border-zinc-800 flex items-center justify-between">
              <span className="text-zinc-400 text-xs font-bold uppercase tracking-wider">
                Total Baseline BOQ Value:
              </span>
              <span className="text-sm sm:text-base font-bold text-emerald-400 tabular-nums">
                ₹ {totalBaselineBoqValue.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* ===================================================================
            ACTION FOOTER: Commit Baseline BOQ to Contract Ledger
            =================================================================== */}
        <div className="pt-4 border-t border-zinc-800 space-y-2">
          {committedSuccess ? (
            <div className="bg-emerald-950/90 border border-emerald-700 text-emerald-300 p-3 text-center text-xs font-mono font-bold flex items-center justify-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <span>BOQ Committed. Activating Digital Measurement Book Ledger...</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleCommitBaseline}
              disabled={isInterlockActive}
              className={`w-full py-3 uppercase font-bold tracking-widest text-sm transition-all font-mono ${
                isInterlockActive
                  ? "bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700/50"
                  : "bg-emerald-600 hover:bg-emerald-500 text-zinc-100 cursor-pointer shadow-none"
              }`}
            >
              Commit Baseline BOQ to Contract Ledger
            </button>
          )}

          <div className="text-[10px] text-zinc-500 text-center font-mono">
            {isInterlockActive
              ? `Interlock Active: ${unmappedElementsCount} element(s) unmapped. Cannot lock baseline.`
              : "Reconciliation Complete: All volumetric geometries mapped to standard DSR items."}
          </div>
        </div>
      </div>
    </div>
  );
}

export default BIMDsrMapper;
