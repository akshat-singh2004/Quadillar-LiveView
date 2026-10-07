"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Building2,
  Calculator,
  Calendar,
  CheckCircle2,
  Clock,
  Coins,
  Copy,
  Download,
  Edit3,
  ExternalLink,
  Eye,
  FileCheck,
  FileSpreadsheet,
  FileText,
  Filter,
  Fingerprint,
  Gavel,
  Hammer,
  HelpCircle,
  Info,
  Layers,
  Lock,
  Package,
  Percent,
  Plus,
  Printer,
  QrCode,
  RefreshCw,
  Scale,
  Search,
  Settings2,
  Shield,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Stamp,
  TrendingDown,
  TrendingUp,
  Truck,
  UserCheck,
  Wrench,
  X,
  Zap,
} from "lucide-react";
import { supabase } from "@/app/lib/supabase";

// ---------------------------------------------------------------------------
// TYPES & DOMAIN INTERFACES
// ---------------------------------------------------------------------------
export interface ContractVariationOrder {
  id: string;
  vo_number: string;
  project_id: string;
  title: string;
  initiating_authority: string;
  cost_delta: number;
  eot_days_claimed: number;
  eot_days_approved: number;
  status: "Draft" | "In Review" | "Sanctioned" | "Rejected";
  created_at?: string;
}

export interface ContractDeviationItem {
  id: string;
  vo_id?: string | null;
  boq_item_ref: string;
  description: string;
  agreement_qty: number;
  executed_qty: number;
  deviation_limit_pct: number;
  agreement_rate: number;
  market_rate: number | null;
  deviation_type: "Substructure" | "Superstructure";
  created_at?: string;
}

export interface ExtraItemRateAnalysis {
  id: string;
  vo_id?: string | null;
  item_code: string;
  description: string;
  unit: string;
  material_cost: number;
  carriage_cost?: number;
  labour_cost: number;
  machinery_cost: number;
  water_electric_surcharge: number; // default 1.0%
  cp_oh_margin: number; // default 15.0%
  sanctioned_unit_rate: number;
  created_at?: string;
}

export interface DigitalSignOffTier {
  roleTitle: string;
  officialName: string;
  designation: string;
  department: string;
  status: "SIGNED" | "PENDING" | "RECOMMENDED";
  timestamp: string;
  digitalFingerprint: string;
  ipAddress: string;
}

// ---------------------------------------------------------------------------
// STATUTORY SEED DATA (Matches 20260918_contract_variations.sql)
// ---------------------------------------------------------------------------
const SEED_VARIATION_ORDERS: any[] = [];

const SEED_DEVIATION_ITEMS: any[] = [];

const SEED_EXTRA_ITEMS: any[] = [];

const SANCTIONED_CONTRACT_BASE_SUM = 147500000; // ₹14.75 Cr
const ORIGINAL_CONTRACT_PERIOD_DAYS = 720; // 24 months

// ---------------------------------------------------------------------------
// FORMATTING UTILITIES
// ---------------------------------------------------------------------------
function fmtINR(val: number, compact = false): string {
  if (compact) {
    if (Math.abs(val) >= 10000000) {
      return `₹${(val / 10000000).toFixed(2)} Cr`;
    }
    if (Math.abs(val) >= 100000) {
      return `₹${(val / 100000).toFixed(2)} L`;
    }
  }
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(val);
}

function fmtQty(val: number, decimals = 2): string {
  return Number(val || 0).toLocaleString("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function fmtDate(d?: string | Date): string {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return String(d);
  }
}

function fmtDateTime(d?: string | Date): string {
  if (!d) return "—";
  try {
    const dt = new Date(d);
    return `${dt.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })} ${dt.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    })} IST`;
  } catch {
    return String(d);
  }
}

async function generateSha256Hash(payload: string): Promise<string> {
  try {
    if (typeof window !== "undefined" && window.crypto && window.crypto.subtle) {
      const msgBuffer = new TextEncoder().encode(payload);
      const hashBuffer = await window.crypto.subtle.digest("SHA-256", msgBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    }
  } catch (e) {
    console.warn("SubtleCrypto unavailable, using deterministic hex generator:", e);
  }
  // Deterministic 64-char hex fallback
  let h1 = 0xdeadbeef,
    h2 = 0x41c6ce57,
    h3 = 0x8badf00d,
    h4 = 0xabad1dea;
  for (let i = 0; i < payload.length; i++) {
    const ch = payload.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
    h3 = Math.imul(h3 ^ ch, 2246822507);
    h4 = Math.imul(h4 ^ ch, 3266489909);
  }
  const p1 = (h1 >>> 0).toString(16).padStart(8, "0") + (h2 >>> 0).toString(16).padStart(8, "0");
  const p2 = (h3 >>> 0).toString(16).padStart(8, "0") + (h4 >>> 0).toString(16).padStart(8, "0");
  return (p1 + p2 + p1 + p2).slice(0, 64);
}

// ---------------------------------------------------------------------------
// STATUTORY TOOLTIP POPUP
// ---------------------------------------------------------------------------
function StatutoryTooltip({
  title,
  clauseRef,
  text,
  children,
}: {
  title: string;
  clauseRef: string;
  text: string;
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className="p-1 text-zinc-400 hover:text-amber-400 transition-colors focus:outline-none"
        aria-label={`Statutory info for ${title}`}
      >
        {children ?? <Info className="w-3.5 h-3.5" />}
      </button>

      {open && (
        <div
          role="tooltip"
          className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-80 bg-zinc-900/98 border border-zinc-700/80 rounded-xl p-3.5 shadow-2xl backdrop-blur-md text-xs pointer-events-none animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-zinc-800">
            <span className="font-semibold text-zinc-200">{title}</span>
            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-amber-950/70 text-amber-300 border border-amber-800/60">
              {clauseRef}
            </span>
          </div>
          <p className="text-zinc-400 leading-relaxed text-[11px]">{text}</p>
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-transparent border-t-zinc-900" />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// MAIN DASHBOARD COMPONENT
// ---------------------------------------------------------------------------
export default function VariationsDeviationsDashboard() {
  const [projectId] = useState("a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11");
  const [activeTab, setActiveTab] = useState<"DEVIATIONS" | "EI_BUILDER" | "EOT_CALCULATOR">("DEVIATIONS");
  const [contractSum] = useState(SANCTIONED_CONTRACT_BASE_SUM);
  const [contractPeriodDays, setContractPeriodDays] = useState(ORIGINAL_CONTRACT_PERIOD_DAYS);
  const [contractorRequestedEot, setContractorRequestedEot] = useState(45);
  const [engineerCertifiedEot, setEngineerCertifiedEot] = useState(32);

  // Core Data States
  const [variationOrders, setVariationOrders] = useState<ContractVariationOrder[]>(SEED_VARIATION_ORDERS);
  const [deviationItems, setDeviationItems] = useState<ContractDeviationItem[]>(SEED_DEVIATION_ITEMS);
  const [extraItems, setExtraItems] = useState<ExtraItemRateAnalysis[]>(SEED_EXTRA_ITEMS);

  // UI / Filter States
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "Substructure" | "Superstructure">("ALL");
  const [breachFilter, setBreachFilter] = useState<"ALL" | "BREACHING" | "APPROACHING" | "SAFE">("ALL");

  // Modals / Drawers
  const [editingItem, setEditingItem] = useState<ContractDeviationItem | null>(null);
  const [newExecutedQty, setNewExecutedQty] = useState<string>("");
  const [isEiDrawerOpen, setIsEiDrawerOpen] = useState(false);
  const [isProformaModalOpen, setIsProformaModalOpen] = useState(false);

  // Three-Tier Digital Sign-Off Workflow State
  const [signOffs, setSignOffs] = useState<Record<number, DigitalSignOffTier>>({
    1: {
      roleTitle: "Prepared & Checked by Site Quantity Surveyor / RE",
      officialName: "Vikas Bansal, FCA (Lead QS)",
      designation: "Resident Commercial Engineer & Lead QS",
      department: "Commercial & Cost Control Wing",
      status: "SIGNED",
      timestamp: "2026-09-18T08:30:00+05:30",
      digitalFingerprint: "QS-SIG-84920481-OK",
      ipAddress: "192.168.1.104",
    },
    2: {
      roleTitle: "Recommended & Verified by Executive Engineer / PMC",
      officialName: "Er. Amresh Kumar Tiwari",
      designation: "Executive Engineer (Civil), Commercial Div. I",
      department: "Office of the Engineer-in-Charge",
      status: "SIGNED",
      timestamp: "2026-09-18T09:15:00+05:30",
      digitalFingerprint: "EE-REC-93820194-VERIFIED",
      ipAddress: "192.168.1.112",
    },
    3: {
      roleTitle: "Sanctioned & Approved by Managing Director / Employer",
      officialName: "Mr. Vikram Agarwal",
      designation: "Managing Director, Employer Representative",
      department: "Quadillar Infrastructure Executive Board",
      status: "PENDING",
      timestamp: "",
      digitalFingerprint: "PENDING-FINAL-SANCTION-STAMP",
      ipAddress: "—",
    },
  });

  // Dynamic Cryptographic Audit Stamp State
  const [auditRecord, setAuditRecord] = useState({
    docRef: "CPWD/DSR/CL12/LKO-TWR-A/2026/04-REV2",
    sha256Hash: "8f9b20481e3a7c6d5b4a9284756192837465019283746501928374650192a12c",
    vaultNode: "Quadillar CDE Vault Node #LKO-01 (ISO 19650-2 Certified)",
    timestamp: "2026-09-18T10:50:00+05:30",
    ipAddress: "192.168.1.120 [CDE Gateway Node LKO-01]",
    isSealed: true,
  });
  const [isGeneratingStamp, setIsGeneratingStamp] = useState(false);

  // EI Builder Form State
  const [eiForm, setEiForm] = useState({
    item_code: `EI/LKO/${new Date().getFullYear()}/004`,
    vo_id: "",
    description: "",
    unit: "m2",
    material_cost: 1850,
    carriage_cost: 120,
    labour_skilled_days: 0.25,
    labour_skilled_rate: 950,
    labour_unskilled_days: 0.15,
    labour_unskilled_rate: 620,
    machinery_cost: 150,
  });

  const [optimisticToast, setOptimisticToast] = useState<{ message: string; type: "success" | "info" | "error" } | null>(
    null
  );

  // -------------------------------------------------------------------------
  // SUPABASE CLIENT FETCHING & REALTIME SYNCHRONIZATION
  // -------------------------------------------------------------------------
  const fetchActiveData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const { data: vosData, error: vosError } = await supabase
        .from("contract_variation_orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (!vosError && vosData && vosData.length > 0) {
        setVariationOrders(vosData as ContractVariationOrder[]);
      }

      const { data: devData, error: devError } = await supabase
        .from("contract_deviation_items")
        .select("*")
        .order("created_at", { ascending: true });

      if (!devError && devData && devData.length > 0) {
        setDeviationItems(devData as ContractDeviationItem[]);
      }

      const { data: eiData, error: eiError } = await supabase
        .from("extra_item_rate_analyses")
        .select("*")
        .order("created_at", { ascending: false });

      if (!eiError && eiData && eiData.length > 0) {
        setExtraItems(eiData as ExtraItemRateAnalysis[]);
      }
    } catch (err) {
      console.warn("Using statutory seed fallback for variations, deviations & EI analyses:", err);
    } finally {
      if (!isSilent) setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchActiveData();

    const channel = supabase
      .channel("contract_commercial_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "contract_deviation_items" },
        (payload) => {
          if (payload.eventType === "UPDATE") {
            setDeviationItems((prev) =>
              prev.map((item) => (item.id === payload.new.id ? (payload.new as ContractDeviationItem) : item))
            );
            triggerToast("Remote deviation synchronized via Supabase Realtime", "info");
          } else if (payload.eventType === "INSERT") {
            setDeviationItems((prev) => [...prev, payload.new as ContractDeviationItem]);
          } else if (payload.eventType === "DELETE") {
            setDeviationItems((prev) => prev.filter((item) => item.id === payload.old.id));
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "extra_item_rate_analyses" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setExtraItems((prev) => [payload.new as ExtraItemRateAnalysis, ...prev]);
            triggerToast("New Extra Item rate analysis synced from network", "info");
          } else if (payload.eventType === "UPDATE") {
            setExtraItems((prev) =>
              prev.map((item) => (item.id === payload.new.id ? (payload.new as ExtraItemRateAnalysis) : item))
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchActiveData]);

  const triggerToast = (message: string, type: "success" | "info" | "error" = "success") => {
    setOptimisticToast({ message, type });
    setTimeout(() => {
      setOptimisticToast((curr) => (curr?.message === message ? null : curr));
    }, 4500);
  };

  // -------------------------------------------------------------------------
  // DYNAMIC COMPUTATION: SCHEDULE F RATE-SPLITTING
  // -------------------------------------------------------------------------
  const computedItems = useMemo(() => {
    return deviationItems.map((item) => {
      const agmtQty = Number(item.agreement_qty) || 0;
      const execQty = Number(item.executed_qty) || 0;
      const limitPct = Number(item.deviation_limit_pct) || (item.deviation_type === "Substructure" ? 100 : 30);

      const permissibleLimitQty = agmtQty * (1 + limitPct / 100);
      const excessBeyondLimit = Math.max(0, execQty - permissibleLimitQty);
      const qtyAtAgreementRate = Math.min(execQty, permissibleLimitQty);

      const billingAgreementAmt = qtyAtAgreementRate * (Number(item.agreement_rate) || 0);
      const effectiveMarketRate = Number(item.market_rate) || Number(item.agreement_rate) || 0;
      const billingMarketAmt = excessBeyondLimit * effectiveMarketRate;
      const totalItemBilling = billingAgreementAmt + billingMarketAmt;

      const baselineBillingAmt = execQty * (Number(item.agreement_rate) || 0);
      const rateVarianceDelta = totalItemBilling - baselineBillingAmt;

      const isBreaching = execQty > permissibleLimitQty;
      const consumptionPct = permissibleLimitQty > 0 ? (execQty / permissibleLimitQty) * 100 : 0;
      const isApproaching = !isBreaching && consumptionPct >= 85.0;

      const deviationQty = execQty - agmtQty;
      const deviationPct = agmtQty > 0 ? ((execQty - agmtQty) / agmtQty) * 100 : 0;

      return {
        ...item,
        deviationQty,
        deviationPct,
        permissibleLimitQty,
        excessBeyondLimit,
        qtyAtAgreementRate,
        billingAgreementAmt,
        billingMarketAmt,
        totalItemBilling,
        rateVarianceDelta,
        consumptionPct,
        isBreaching,
        isApproaching,
      };
    });
  }, [deviationItems]);

  // -------------------------------------------------------------------------
  // EXECUTIVE KPI METRICS
  // -------------------------------------------------------------------------
  const kpis = useMemo(() => {
    const approvedVOs = variationOrders.filter((v) => v.status === "Sanctioned");
    const netVoCostDelta = approvedVOs.reduce((acc, curr) => acc + Number(curr.cost_delta || 0), 0);

    const netDeviatedExposure = contractSum + netVoCostDelta;
    const exposureVariancePct = ((netDeviatedExposure - contractSum) / contractSum) * 100;

    const breachingItems = computedItems.filter((i) => i.isBreaching);
    const breachingCount = breachingItems.length;
    const superstructureBreaches = breachingItems.filter((i) => i.deviation_type === "Superstructure").length;
    const substructureBreaches = breachingItems.filter((i) => i.deviation_type === "Substructure").length;
    const approachingCount = computedItems.filter((i) => i.isApproaching).length;

    const totalAgreementBaseline = computedItems.reduce((acc, curr) => acc + curr.agreement_qty * curr.agreement_rate, 0);
    const totalExecutedCurrent = computedItems.reduce((acc, curr) => acc + curr.totalItemBilling, 0);
    const netDeviationDelta = totalExecutedCurrent - totalAgreementBaseline;

    const totalAgreementBilled = computedItems.reduce((acc, curr) => acc + curr.billingAgreementAmt, 0);
    const totalMarketBilled = computedItems.reduce((acc, curr) => acc + curr.billingMarketAmt, 0);
    const totalExcessQuantityValue = computedItems.reduce((acc, curr) => acc + curr.rateVarianceDelta, 0);

    return {
      contractSum,
      netDeviatedExposure,
      exposureVariancePct,
      netVoCostDelta,
      netDeviationDelta,
      breachingCount,
      superstructureBreaches,
      substructureBreaches,
      approachingCount,
      totalAgreementBaseline,
      totalExecutedCurrent,
      totalAgreementBilled,
      totalMarketBilled,
      totalExcessQuantityValue,
    };
  }, [contractSum, variationOrders, computedItems]);

  // -------------------------------------------------------------------------
  // DYNAMIC COST-STACKING FORMULA (CPWD Works Manual Rate Analysis Norms)
  // -------------------------------------------------------------------------
  const eiCalculated = useMemo(() => {
    const matTotal = Number(eiForm.material_cost || 0) + Number(eiForm.carriage_cost || 0);
    const labTotal =
      Number(eiForm.labour_skilled_days || 0) * Number(eiForm.labour_skilled_rate || 0) +
      Number(eiForm.labour_unskilled_days || 0) * Number(eiForm.labour_unskilled_rate || 0);
    const machTotal = Number(eiForm.machinery_cost || 0);

    const subtotalA = matTotal + labTotal + machTotal;
    const waterElectricCharge = subtotalA * 0.01;
    const primeCost = subtotalA + waterElectricCharge;
    const cpOhAmount = primeCost * 0.15;
    const finalDerivedRate = primeCost + cpOhAmount;

    return {
      matTotal,
      labTotal,
      machTotal,
      subtotalA,
      waterElectricCharge,
      primeCost,
      cpOhAmount,
      finalDerivedRate,
    };
  }, [eiForm]);

  // -------------------------------------------------------------------------
  // CLAUSE 12.1 EXTENSION OF TIME (EOT) MATHEMATICAL CEILING
  // -------------------------------------------------------------------------
  const eotMath = useMemo(() => {
    const positiveVariations = variationOrders
      .filter((v) => v.cost_delta > 0 && v.status === "Sanctioned")
      .reduce((a, v) => a + Number(v.cost_delta), 0);

    const netVarValue = Math.max(0, kpis.netVoCostDelta);
    const variationRatio = contractSum > 0 ? netVarValue / contractSum : 0;
    const permissibleEotDays = Math.round(contractPeriodDays * variationRatio);

    const requestedDelta = contractorRequestedEot - permissibleEotDays;
    const isExceedingCeiling = requestedDelta > 0;

    return {
      netVarValue,
      positiveVariations,
      variationRatioPct: variationRatio * 100,
      permissibleEotDays,
      requestedDelta,
      isExceedingCeiling,
    };
  }, [variationOrders, kpis.netVoCostDelta, contractSum, contractPeriodDays, contractorRequestedEot]);

  // -------------------------------------------------------------------------
  // FILTERED DEVIATIONS
  // -------------------------------------------------------------------------
  const filteredItems = useMemo(() => {
    return computedItems.filter((item) => {
      if (typeFilter !== "ALL" && item.deviation_type !== typeFilter) return false;
      if (breachFilter === "BREACHING" && !item.isBreaching) return false;
      if (breachFilter === "APPROACHING" && !item.isApproaching) return false;
      if (breachFilter === "SAFE" && (item.isBreaching || item.isApproaching)) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return item.boq_item_ref.toLowerCase().includes(q) || item.description.toLowerCase().includes(q);
      }
      return true;
    });
  }, [computedItems, typeFilter, breachFilter, searchQuery]);

  // -------------------------------------------------------------------------
  // HANDLERS: EXTRA ITEM MUTATION
  // -------------------------------------------------------------------------
  const handleSaveExtraItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const newEiId = `e-${Date.now()}`;
    const derivedRate = Math.round(eiCalculated.finalDerivedRate * 100) / 100;

    const newRecord: ExtraItemRateAnalysis = {
      id: newEiId,
      vo_id: eiForm.vo_id || null,
      item_code: eiForm.item_code,
      description: eiForm.description,
      unit: eiForm.unit,
      material_cost: Number(eiCalculated.matTotal),
      carriage_cost: Number(eiForm.carriage_cost || 0),
      labour_cost: Number(eiCalculated.labTotal),
      machinery_cost: Number(eiForm.machinery_cost || 0),
      water_electric_surcharge: 1.0,
      cp_oh_margin: 15.0,
      sanctioned_unit_rate: derivedRate,
      created_at: new Date().toISOString(),
    };

    setExtraItems((prev) => [newRecord, ...prev]);
    setIsEiDrawerOpen(false);
    triggerToast(`Extra item ${newRecord.item_code} created @ ${fmtINR(derivedRate)}/${newRecord.unit}`, "success");

    try {
      const { error } = await supabase.from("extra_item_rate_analyses").insert([
        {
          item_code: newRecord.item_code,
          vo_id: newRecord.vo_id || null,
          description: newRecord.description,
          unit: newRecord.unit,
          material_cost: newRecord.material_cost,
          labour_cost: newRecord.labour_cost,
          machinery_cost: newRecord.machinery_cost,
          water_electric_surcharge: 1.0,
          cp_oh_margin: 15.0,
          sanctioned_unit_rate: newRecord.sanctioned_unit_rate,
        },
      ]);
      if (error) throw error;
    } catch (err) {
      console.warn("Direct Supabase insert failed, preserved in local memory:", err);
    }
  };

  // -------------------------------------------------------------------------
  // HANDLERS: THREE-TIER APPROVAL SIGN-OFF
  // -------------------------------------------------------------------------
  const handleToggleSignTier = (tierNum: number) => {
    setSignOffs((prev) => {
      const current = prev[tierNum];
      if (!current) return prev;

      const newStatus = current.status === "SIGNED" ? "PENDING" : "SIGNED";
      const now = new Date();
      const updatedTier: DigitalSignOffTier = {
        ...current,
        status: newStatus,
        timestamp: newStatus === "SIGNED" ? now.toISOString() : "",
        digitalFingerprint:
          newStatus === "SIGNED"
            ? `${tierNum === 1 ? "QS-SIG" : tierNum === 2 ? "EE-REC" : "MD-SANC"}-${now.getTime().toString(36).toUpperCase()}-VERIFIED`
            : "PENDING-FINAL-SANCTION-STAMP",
        ipAddress: newStatus === "SIGNED" ? `192.168.1.${100 + tierNum * 6}` : "—",
      };

      triggerToast(
        newStatus === "SIGNED"
          ? `${current.roleTitle} certified & audit-stamped!`
          : `${current.roleTitle} sign-off reset to PENDING`,
        newStatus === "SIGNED" ? "success" : "info"
      );

      return { ...prev, [tierNum]: updatedTier };
    });
  };

  // -------------------------------------------------------------------------
  // HANDLERS: AUDIT STAMP GENERATOR (Dynamic Cryptographic Hash)
  // -------------------------------------------------------------------------
  const handleRegenerateAuditStamp = async () => {
    setIsGeneratingStamp(true);
    const freshTimestamp = new Date().toISOString();
    const freshIp = "192.168.1.120 [CDE Gateway Node LKO-01]";
    const payload = `${auditRecord.docRef}|Sum=${contractSum}|Exec=${kpis.totalExecutedCurrent}|Dev=${kpis.netDeviationDelta}|EI=${extraItems.length}|EOT=${eotMath.permissibleEotDays}|T1=${signOffs[1].status}|T2=${signOffs[2].status}|T3=${signOffs[3].status}|Time=${freshTimestamp}|Node=LKO-01`;
    const newHash = await generateSha256Hash(payload);

    setAuditRecord((prev) => ({
      ...prev,
      sha256Hash: newHash,
      timestamp: freshTimestamp,
      ipAddress: freshIp,
      isSealed: true,
    }));

    setIsGeneratingStamp(false);
    triggerToast("Dynamic SHA-256 Audit Stamp regenerated & cryptographically sealed", "success");
  };

  // -------------------------------------------------------------------------
  // HANDLERS: EXPORT STANDALONE HTML DOCKET PACKET
  // -------------------------------------------------------------------------
  const handleExportHtmlPacket = () => {
    const docketEl = document.getElementById("statutory-proforma-print-container");
    if (!docketEl) {
      triggerToast("Unable to locate proforma docket element", "error");
      return;
    }

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>CPWD Form 48-A Statutory Sanction Docket - ${auditRecord.docRef}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background: #ffffff;
      color: #000000;
      padding: 24px;
      font-size: 11px;
      line-height: 1.45;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
      margin-bottom: 12px;
      font-size: 10px;
    }
    th, td {
      border: 1px solid #333333;
      padding: 6px 8px;
    }
    th {
      background-color: #f0f0f0;
      font-weight: bold;
      text-align: left;
    }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .font-bold { font-weight: bold; }
    .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
    .no-print { display: none !important; }
    @page { size: A4 landscape; margin: 10mm; }
  </style>
</head>
<body>
  ${docketEl.innerHTML}
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Statutory-Sanction-Docket-Form48A-${new Date().toISOString().slice(0, 10)}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    triggerToast("Standalone Form 48-A HTML archive exported successfully", "success");
  };

  // -------------------------------------------------------------------------
  // HANDLERS: EXPORT FINANCIAL ABSTRACT CSV
  // -------------------------------------------------------------------------
  const handleExportCsv = () => {
    const rows = [
      ["CENTRAL PUBLIC WORKS DEPARTMENT - STATUTORY DEVIATION & EXTRA ITEM SANCTION DOCKET"],
      ["Agreement Reference", "EE/CD-I/LKO/AGMT-2024-25/18", "Project", "Tower A Core & Shell (G+14)"],
      ["Original Contract Sum", contractSum, "Revised Net Exposure", kpis.netDeviatedExposure],
      [],
      ["SECTION A: SCHEDULE F DEVIATION STATEMENT ABSTRACT"],
      [
        "BOQ Item Ref",
        "Scope Category",
        "Description",
        "Agmt Qty",
        "Exec Qty",
        "Limit Qty",
        "Excess Qty Beyond Limit",
        "Agmt Rate (INR)",
        "Market Rate (INR)",
        "Original Contract Amount (INR)",
        "Gross Permissible Deviation Value (INR)",
        "Actual Executed Amount (INR)",
        "Net Financial Excess/Saving (INR)",
        "Statutory Status",
      ],
      ...computedItems.map((it) => [
        it.boq_item_ref,
        `${it.deviation_type} (${it.deviation_limit_pct}%)`,
        `"${it.description.replace(/"/g, '""')}"`,
        it.agreement_qty,
        it.executed_qty,
        it.permissibleLimitQty,
        it.excessBeyondLimit,
        it.agreement_rate,
        it.market_rate || it.agreement_rate,
        it.agreement_qty * it.agreement_rate,
        it.permissibleLimitQty * it.agreement_rate,
        it.totalItemBilling,
        it.totalItemBilling - it.agreement_qty * it.agreement_rate,
        it.isBreaching ? "BREACH (Cl. 12.3)" : it.isApproaching ? "APPROACHING" : "PERMISSIBLE",
      ]),
      [],
      ["SECTION B: EXTRA ITEM RATE ANALYSES"],
      [
        "Item Code",
        "Technical Description",
        "Unit",
        "Material + Cartage (INR)",
        "Labour Constants (INR)",
        "Machinery T&P (INR)",
        "Subtotal A (INR)",
        "1% Water & Electricity (INR)",
        "15% CP & OH Margin (INR)",
        "Derived Sanctioned Rate (INR)",
      ],
      ...extraItems.map((ei) => {
        const mat = Number(ei.material_cost || 0) + Number(ei.carriage_cost || 0);
        const lab = Number(ei.labour_cost || 0);
        const mach = Number(ei.machinery_cost || 0);
        const subA = mat + lab + mach;
        const we = subA * 0.01;
        const prime = subA + we;
        const cpOh = prime * 0.15;
        const derived = ei.sanctioned_unit_rate || prime + cpOh;
        return [
          ei.item_code,
          `"${ei.description.replace(/"/g, '""')}"`,
          ei.unit,
          mat,
          lab,
          mach,
          subA,
          we,
          cpOh,
          derived,
        ];
      }),
      [],
      ["SECTION C: CLAUSE 12.1 EXTENSION OF TIME CERTIFICATION"],
      ["Contract Period (Days)", contractPeriodDays],
      ["Permissible EOT Ceiling (Days)", eotMath.permissibleEotDays],
      ["Contractor Claimed EOT (Days)", contractorRequestedEot],
      ["Engineer Certified EOT (Days)", engineerCertifiedEot],
      ["Audit Status", eotMath.isExceedingCeiling ? "EXCEEDS CEILING" : "WITHIN CEILING"],
      [],
      ["VERIFICATION & AUDIT RECORD"],
      ["SHA-256 Hash", auditRecord.sha256Hash],
      ["Timestamp", auditRecord.timestamp],
      ["Node IP", auditRecord.ipAddress],
    ];

    const csvString = "data:text/csv;charset=utf-8," + rows.map((e) => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvString);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Deviation-ExtraItem-Abstract-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerToast("Financial abstract exported to CSV", "success");
  };

  // -------------------------------------------------------------------------
  // HANDLERS: PRINT AND SAVE PROFORMA
  // -------------------------------------------------------------------------
  const handleTriggerPrint = () => {
    setIsProformaModalOpen(true);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  // -------------------------------------------------------------------------
  // RENDER
  // -------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 sm:p-6 lg:p-8 selection:bg-amber-500/20 selection:text-amber-300">
      {/* Real-time Toast Banner */}
      {optimisticToast && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md animate-in slide-in-from-bottom-3 duration-200">
          <div
            className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border text-xs font-medium backdrop-blur-md ${
              optimisticToast.type === "success"
                ? "bg-emerald-950/90 border-emerald-600/60 text-emerald-200"
                : optimisticToast.type === "error"
                ? "bg-rose-950/90 border-rose-600/60 text-rose-200"
                : "bg-zinc-900/95 border-zinc-700 text-zinc-200"
            }`}
          >
            {optimisticToast.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : optimisticToast.type === "error" ? (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            ) : (
              <RefreshCw className="w-4 h-4 text-amber-400 animate-spin shrink-0" />
            )}
            <span>{optimisticToast.message}</span>
            <button
              onClick={() => setOptimisticToast(null)}
              className="ml-auto text-zinc-400 hover:text-white"
              aria-label="Dismiss notification"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------
          HEADER (Enterprise Solid Matte, No Header Gradients)
         --------------------------------------------------------------------- */}
      <div className="mb-6 border-b border-zinc-800/80 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div>
          <div className="flex items-center gap-2.5 text-[11px] font-semibold tracking-wider text-amber-400 uppercase mb-1.5">
            <Scale className="w-4 h-4 text-amber-400" />
            <span>Commercial Governance · CPWD GCC Clause 12 &amp; FIDIC Clause 13</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
            Variations, Deviations &amp; EI Engine
            <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-zinc-900 border border-zinc-700 text-zinc-300 flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-400" /> Live Synchronized
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-3xl leading-relaxed">
            Schedule F deviation monitoring (30% / 100%) · First-principles Extra Item rate builder with mandated 15%
            CP&amp;OH · Statutory Sanction Proforma &amp; Approval Workflow.
          </p>
        </div>

        {/* Global Action Bar */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Statutory Proforma Preview Trigger Button */}
          <button
            onClick={() => setIsProformaModalOpen(true)}
            className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-amber-400 border border-amber-500/40 text-xs font-semibold px-3.5 py-2 rounded-xl transition shadow-lg shadow-black/40"
          >
            <Stamp className="w-4 h-4 text-amber-400" />
            <span>Statutory Sanction Docket</span>
          </button>

          <button
            onClick={() => setIsEiDrawerOpen(true)}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold px-3.5 py-2 rounded-xl transition shadow-lg shadow-amber-950/40"
          >
            <Plus className="w-4 h-4" />
            <span>New Extra Item (EI)</span>
          </button>

          <button
            onClick={handleTriggerPrint}
            className="flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 text-xs font-medium px-3 py-2 rounded-xl transition"
            title="Trigger browser print dialogue directly"
          >
            <Printer className="w-3.5 h-3.5 text-zinc-400" />
            <span>Print Docket</span>
          </button>

          <button
            onClick={() => {
              setRefreshing(true);
              fetchActiveData(true);
            }}
            disabled={refreshing}
            className="flex items-center gap-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 text-xs font-medium px-3 py-2 rounded-xl transition disabled:opacity-50"
            title="Sync latest Supabase changes"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${refreshing ? "animate-spin" : ""}`} />
            <span>{refreshing ? "Syncing..." : "Sync"}</span>
          </button>
        </div>
      </div>

      {/* ---------------------------------------------------------------------
          NAVIGATION TABS
         --------------------------------------------------------------------- */}
      <div className="flex items-center gap-1 border-b border-zinc-800 mb-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab("DEVIATIONS")}
          className={`pb-3 px-4 text-xs font-semibold flex items-center gap-2 transition border-b-2 whitespace-nowrap ${
            activeTab === "DEVIATIONS"
              ? "border-amber-400 text-amber-400"
              : "border-transparent text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <Scale className="w-4 h-4" />
          <span>Schedule F Deviations Ledger</span>
          <span className="bg-zinc-800 text-zinc-400 text-[10px] px-1.5 py-0.5 rounded-full">
            {computedItems.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("EI_BUILDER")}
          className={`pb-3 px-4 text-xs font-semibold flex items-center gap-2 transition border-b-2 whitespace-nowrap ${
            activeTab === "EI_BUILDER"
              ? "border-amber-400 text-amber-400"
              : "border-transparent text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <Calculator className="w-4 h-4" />
          <span>Extra Item (EI) Rate Analyses</span>
          <span className="bg-amber-950/60 text-amber-300 border border-amber-800/40 text-[10px] px-1.5 py-0.5 rounded-full">
            {extraItems.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("EOT_CALCULATOR")}
          className={`pb-3 px-4 text-xs font-semibold flex items-center gap-2 transition border-b-2 whitespace-nowrap ${
            activeTab === "EOT_CALCULATOR"
              ? "border-amber-400 text-amber-400"
              : "border-transparent text-zinc-400 hover:text-zinc-200"
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Clause 12.1 EOT Proportional Tool</span>
          <span className="bg-blue-950/60 text-blue-300 border border-blue-800/40 text-[10px] px-1.5 py-0.5 rounded-full">
            {eotMath.permissibleEotDays}d Limit
          </span>
        </button>
      </div>

      {/* ---------------------------------------------------------------------
          TAB 1: SCHEDULE F DEVIATION TABULATOR
         --------------------------------------------------------------------- */}
      {activeTab === "DEVIATIONS" && (
        <div className="space-y-6">
          {/* Executive KPI Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-2xl p-4 flex flex-col justify-between shadow-sm">
              <div>
                <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
                  <span className="font-medium">Sanctioned Contract Sum</span>
                  <Coins className="w-4 h-4 text-zinc-400" />
                </div>
                <div className="text-2xl font-bold text-white tracking-tight tabular-nums">
                  {fmtINR(kpis.contractSum, true)}
                </div>
                <div className="text-[11px] text-zinc-400 mt-1 flex items-center gap-1.5">
                  <span>Net Exposure:</span>
                  <span className="font-semibold text-zinc-200">{fmtINR(kpis.netDeviatedExposure, true)}</span>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-zinc-800/60 flex items-center justify-between text-[11px]">
                <span className="text-zinc-400">Total Deviation:</span>
                <span
                  className={`font-semibold tabular-nums flex items-center gap-0.5 ${
                    kpis.exposureVariancePct >= 0 ? "text-rose-400" : "text-emerald-400"
                  }`}
                >
                  {kpis.exposureVariancePct >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                  {kpis.exposureVariancePct >= 0 ? "+" : ""}
                  {kpis.exposureVariancePct.toFixed(2)}%
                </span>
              </div>
            </div>

            <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-2xl p-4 flex flex-col justify-between shadow-sm">
              <div>
                <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
                  <div className="flex items-center gap-1">
                    <span className="font-medium">Schedule F Breaches</span>
                    <StatutoryTooltip
                      title="Schedule F Limits"
                      clauseRef="CPWD Cl. 12.2"
                      text="Specifies deviation limits: 100% for substructure items and 30% for superstructure. Quantities executed beyond these thresholds require market rate determination under Clause 12.3."
                    />
                  </div>
                  <ShieldAlert
                    className={`w-4 h-4 ${kpis.breachingCount > 0 ? "text-rose-400" : "text-emerald-400"}`}
                  />
                </div>
                <div className="flex items-baseline gap-2">
                  <span
                    className={`text-2xl font-bold tracking-tight tabular-nums ${
                      kpis.breachingCount > 0 ? "text-rose-400" : "text-emerald-400"
                    }`}
                  >
                    {kpis.breachingCount}
                  </span>
                  <span className="text-xs text-zinc-400">Item{kpis.breachingCount !== 1 ? "s" : ""} Over Limit</span>
                </div>
                <div className="text-[11px] text-zinc-400 mt-1">
                  Superstructure: <span className="text-zinc-200 font-semibold">{kpis.superstructureBreaches}</span> ·
                  Substructure: <span className="text-zinc-200 font-semibold">{kpis.substructureBreaches}</span>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-zinc-800/60 flex items-center justify-between text-[11px]">
                <span className="text-zinc-400">Approaching Limit (&gt;85%):</span>
                <span className="text-amber-400 font-semibold tabular-nums">{kpis.approachingCount} items</span>
              </div>
            </div>

            <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-2xl p-4 flex flex-col justify-between shadow-sm">
              <div>
                <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
                  <span className="font-medium">Net Variation Impact</span>
                  {kpis.netVoCostDelta >= 0 ? (
                    <TrendingUp className="w-4 h-4 text-rose-400" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-emerald-400" />
                  )}
                </div>
                <div
                  className={`text-2xl font-bold tracking-tight tabular-nums ${
                    kpis.netVoCostDelta > 0
                      ? "text-rose-400"
                      : kpis.netVoCostDelta < 0
                      ? "text-emerald-400"
                      : "text-zinc-200"
                  }`}
                >
                  {kpis.netVoCostDelta >= 0 ? "+" : ""}
                  {fmtINR(kpis.netVoCostDelta, true)}
                </div>
                <div className="text-[11px] text-zinc-400 mt-1">
                  {kpis.netVoCostDelta > 0 ? (
                    <span className="text-rose-400 font-medium">Cost Overrun on Sanctioned VOs</span>
                  ) : (
                    <span className="text-emerald-400 font-medium">Net Cost Savings Realized</span>
                  )}
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-zinc-800/60 flex items-center justify-between text-[11px]">
                <span className="text-zinc-400">Clause 12 Permissible Limit:</span>
                <span className="text-zinc-300 font-medium font-mono">±10% to ±20%</span>
              </div>
            </div>

            <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-2xl p-4 flex flex-col justify-between shadow-sm">
              <div>
                <div className="flex items-center justify-between text-xs text-zinc-400 mb-1">
                  <div className="flex items-center gap-1">
                    <span className="font-medium">Bifurcated Market Exposure</span>
                    <StatutoryTooltip
                      title="Dual-Rate Bifurcation"
                      clauseRef="CPWD Cl. 12.3"
                      text="Billing is bifurcated: work within Schedule F limit pays at contract rate. Excess volumes are billed at market-analyzed rate, introducing differential cost exposure."
                    />
                  </div>
                  <FileSpreadsheet className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-2xl font-bold text-amber-300 tracking-tight tabular-nums">
                  {fmtINR(kpis.totalMarketBilled, true)}
                </div>
                <div className="text-[11px] text-zinc-400 mt-1">
                  Payable at Agreement Rate:{" "}
                  <span className="text-zinc-200 font-semibold">{fmtINR(kpis.totalAgreementBilled, true)}</span>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-zinc-800/60 flex items-center justify-between text-[11px]">
                <span className="text-zinc-400">Rate Differential Premium:</span>
                <span className="text-amber-400 font-semibold tabular-nums">
                  +{fmtINR(kpis.totalExcessQuantityValue, true)}
                </span>
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-zinc-900/90 p-3 rounded-2xl border border-zinc-800/80">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-400" />
              <input
                type="text"
                placeholder="Search by BOQ item ref or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-amber-500/80 transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-2.5 text-zinc-500 hover:text-zinc-300"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 bg-zinc-950 border border-zinc-800 rounded-xl p-1 text-xs">
                <button
                  onClick={() => setTypeFilter("ALL")}
                  className={`px-2.5 py-1 rounded-lg font-medium transition ${
                    typeFilter === "ALL" ? "bg-zinc-800 text-white" : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  All Types
                </button>
                <button
                  onClick={() => setTypeFilter("Substructure")}
                  className={`px-2.5 py-1 rounded-lg font-medium transition ${
                    typeFilter === "Substructure" ? "bg-zinc-800 text-amber-300" : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  Substructure (100%)
                </button>
                <button
                  onClick={() => setTypeFilter("Superstructure")}
                  className={`px-2.5 py-1 rounded-lg font-medium transition ${
                    typeFilter === "Superstructure" ? "bg-zinc-800 text-blue-300" : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  Superstructure (30%)
                </button>
              </div>

              <select
                value={breachFilter}
                onChange={(e) => setBreachFilter(e.target.value as any)}
                className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-amber-500/80 cursor-pointer"
              >
                <option value="ALL">All Thresholds</option>
                <option value="BREACHING">Breaching Limit (&gt;100%)</option>
                <option value="APPROACHING">Approaching Limit (&gt;85%)</option>
                <option value="SAFE">Within Permissible Limit</option>
              </select>
            </div>
          </div>

          {/* Deviation Table */}
          <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800/90 bg-zinc-900/95 text-zinc-400 font-semibold tracking-wider uppercase text-[10px]">
                    <th className="px-4 py-3.5">BOQ Code &amp; Scope</th>
                    <th className="px-4 py-3.5">Description</th>
                    <th className="px-4 py-3.5 text-right">Agmt Qty</th>
                    <th className="px-4 py-3.5 text-right">Exec Qty</th>
                    <th className="px-4 py-3.5 text-right">Limit Qty</th>
                    <th className="px-4 py-3.5 text-center min-w-[140px]">Limit Gauge</th>
                    <th className="px-4 py-3.5 text-right">Excess Qty</th>
                    <th className="px-4 py-3.5 text-right">Agmt Rate</th>
                    <th className="px-4 py-3.5 text-right">Market Rate</th>
                    <th className="px-4 py-3.5 text-right">Total Billing</th>
                    <th className="px-4 py-3.5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {loading ? (
                    <tr>
                      <td colSpan={11} className="py-12 text-center text-zinc-500">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-amber-400" />
                        Loading Schedule F deviation items...
                      </td>
                    </tr>
                  ) : filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="py-12 text-center text-zinc-500">
                        No deviation items match the selected filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item) => {
                      const hasMarketRate = item.excessBeyondLimit > 0 && item.market_rate;
                      return (
                        <tr
                          key={item.id}
                          className={`hover:bg-zinc-800/40 transition-colors group ${
                            item.isBreaching ? "bg-rose-950/10" : item.isApproaching ? "bg-amber-950/10" : ""
                          }`}
                        >
                          <td className="px-4 py-3 font-mono">
                            <div className="font-semibold text-zinc-200 group-hover:text-amber-300 transition-colors">
                              {item.boq_item_ref}
                            </div>
                            <span
                              className={`inline-block mt-0.5 text-[9px] font-medium px-1.5 py-0.5 rounded border ${
                                item.deviation_type === "Substructure"
                                  ? "bg-amber-950/40 text-amber-300 border-amber-800/50"
                                  : "bg-blue-950/40 text-blue-300 border-blue-800/50"
                              }`}
                            >
                              {item.deviation_type} ({item.deviation_limit_pct}%)
                            </span>
                          </td>

                          <td className="px-4 py-3 max-w-xs">
                            <div className="text-zinc-300 font-medium line-clamp-2 leading-relaxed">
                              {item.description}
                            </div>
                            {item.isBreaching && (
                              <div className="mt-1 flex items-center gap-1 text-[10px] text-rose-400 font-medium">
                                <AlertTriangle className="w-3 h-3 shrink-0" />
                                <span>Breached Schedule F threshold</span>
                              </div>
                            )}
                          </td>

                          <td className="px-4 py-3 text-right font-mono text-zinc-400 tabular-nums">
                            {fmtQty(item.agreement_qty)}
                          </td>

                          <td className="px-4 py-3 text-right font-mono tabular-nums">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingItem(item);
                                setNewExecutedQty(String(item.executed_qty));
                              }}
                              className={`font-semibold px-2 py-0.5 rounded hover:bg-zinc-800 transition inline-flex items-center gap-1 ${
                                item.isBreaching
                                  ? "text-rose-400 underline decoration-rose-500/40 underline-offset-2"
                                  : item.isApproaching
                                  ? "text-amber-400"
                                  : "text-zinc-200"
                              }`}
                              title="Click to revise executed quantity optimistically"
                            >
                              <span>{fmtQty(item.executed_qty)}</span>
                              <Edit3 className="w-3 h-3 opacity-0 group-hover:opacity-100 text-zinc-400" />
                            </button>
                          </td>

                          <td className="px-4 py-3 text-right font-mono text-zinc-400 tabular-nums">
                            {fmtQty(item.permissibleLimitQty)}
                          </td>

                          <td className="px-4 py-3">
                            <div className="space-y-1">
                              <div className="flex justify-between text-[10px] font-mono tabular-nums">
                                <span
                                  className={
                                    item.isBreaching
                                      ? "text-rose-400 font-bold"
                                      : item.isApproaching
                                      ? "text-amber-400 font-semibold"
                                      : "text-zinc-400"
                                  }
                                >
                                  {item.consumptionPct.toFixed(1)}%
                                </span>
                                <span className="text-zinc-500">
                                  {item.isBreaching ? "OVER LIMIT" : item.isApproaching ? "APPROACHING" : "SAFE"}
                                </span>
                              </div>
                              <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-300 ${
                                    item.isBreaching
                                      ? "bg-rose-500"
                                      : item.isApproaching
                                      ? "bg-amber-400"
                                      : "bg-emerald-500"
                                  }`}
                                  style={{ width: `${Math.min(item.consumptionPct, 100)}%` }}
                                />
                              </div>
                            </div>
                          </td>

                          <td className="px-4 py-3 text-right font-mono tabular-nums">
                            {item.excessBeyondLimit > 0 ? (
                              <span className="text-rose-400 font-semibold">+{fmtQty(item.excessBeyondLimit)}</span>
                            ) : (
                              <span className="text-zinc-600">—</span>
                            )}
                          </td>

                          <td className="px-4 py-3 text-right font-mono text-zinc-300 tabular-nums">
                            ₹{item.agreement_rate.toLocaleString("en-IN")}
                          </td>

                          <td className="px-4 py-3 text-right font-mono tabular-nums">
                            {item.market_rate ? (
                              <div className="flex flex-col items-end">
                                <span className="text-amber-300 font-semibold">
                                  ₹{item.market_rate.toLocaleString("en-IN")}
                                </span>
                                <span className="text-[9px] text-zinc-500">Clause 12.3</span>
                              </div>
                            ) : (
                              <span className="text-zinc-500 italic text-[11px]">Agmt Rate</span>
                            )}
                          </td>

                          <td className="px-4 py-3 text-right font-mono tabular-nums">
                            <div className="font-bold text-white">{fmtINR(item.totalItemBilling)}</div>
                            {hasMarketRate && (
                              <div className="text-[10px] text-amber-400 font-medium">
                                Incl. {fmtINR(item.billingMarketAmt)} @ Mkt
                              </div>
                            )}
                          </td>

                          <td className="px-4 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingItem(item);
                                setNewExecutedQty(String(item.executed_qty));
                              }}
                              className="px-2.5 py-1 text-[11px] font-medium text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded border border-zinc-700/80 transition"
                            >
                              Revise Qty
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
        </div>
      )}

      {/* ---------------------------------------------------------------------
          TAB 2: EXTRA ITEM (EI) RATE ANALYSIS BUILDER
         --------------------------------------------------------------------- */}
      {activeTab === "EI_BUILDER" && (
        <div className="space-y-6">
          <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-start gap-3.5">
              <div className="p-3 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-xl shrink-0">
                <Calculator className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-white">First-Principles Extra Item Rate Analysis Engine</h2>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-amber-300 border border-zinc-700">
                    CPWD Works Manual Ch. 10
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-1 max-w-2xl leading-relaxed">
                  Formula: Subtotal A (Material + Carriage + Labour + Machinery) + 1% Water &amp; Electricity Charges +
                  15% Contractor&apos;s Profit &amp; Overheads (CP &amp; OH).
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsEiDrawerOpen(true)}
              className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-lg shadow-amber-950/40 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Analyze New Extra Item</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {extraItems.map((ei) => {
              const baseCost = Number(ei.material_cost || 0) + Number(ei.carriage_cost || 0) + Number(ei.labour_cost || 0) + Number(ei.machinery_cost || 0);
              const weAmt = baseCost * 0.01;
              const prime = baseCost + weAmt;
              const cpOh = prime * 0.15;
              const derived = ei.sanctioned_unit_rate || (prime + cpOh);

              return (
                <div
                  key={ei.id}
                  className="bg-zinc-900/90 border border-zinc-800/80 hover:border-zinc-700 rounded-2xl p-5 flex flex-col justify-between transition-colors shadow-sm space-y-4"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-xs font-bold text-amber-300">{ei.item_code}</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-300">
                        Unit: {ei.unit}
                      </span>
                    </div>
                    <h3 className="text-xs font-medium text-zinc-200 line-clamp-2 leading-relaxed mb-3">
                      {ei.description}
                    </h3>

                    <div className="space-y-1.5 bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-3 text-[11px]">
                      <div className="flex justify-between text-zinc-400">
                        <span>Material + Carriage:</span>
                        <span className="text-zinc-200 font-mono font-medium">
                          {fmtINR(Number(ei.material_cost || 0) + Number(ei.carriage_cost || 0))}
                        </span>
                      </div>
                      <div className="flex justify-between text-zinc-400">
                        <span>Labour Constants:</span>
                        <span className="text-zinc-200 font-mono font-medium">{fmtINR(Number(ei.labour_cost || 0))}</span>
                      </div>
                      <div className="flex justify-between text-zinc-400">
                        <span>Machinery &amp; T&amp;P:</span>
                        <span className="text-zinc-200 font-mono font-medium">{fmtINR(Number(ei.machinery_cost || 0))}</span>
                      </div>
                      <div className="border-t border-zinc-800 pt-1 flex justify-between text-zinc-300 font-medium">
                        <span>Subtotal A:</span>
                        <span className="font-mono">{fmtINR(baseCost)}</span>
                      </div>
                      <div className="flex justify-between text-zinc-400">
                        <span>Water &amp; Electricity (1%):</span>
                        <span className="font-mono">+{fmtINR(weAmt)}</span>
                      </div>
                      <div className="flex justify-between text-amber-400/90 font-medium">
                        <span className="flex items-center gap-1">
                          <span>15% CP &amp; OH:</span>
                          <StatutoryTooltip
                            title="Mandatory 15% CP & OH"
                            clauseRef="CPWD Works Manual Ch. 10"
                            text="Contractor's Profit and Overhead charges are statutorily fixed at exactly 15% on Prime Cost. Cannot be reduced or negotiated downwards per CPWD circulars."
                          />
                        </span>
                        <span className="font-mono">+{fmtINR(cpOh)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-zinc-800/80 flex items-baseline justify-between">
                    <div>
                      <div className="text-[10px] text-zinc-500 uppercase tracking-wide">Derived Sanctioned Rate</div>
                      <div className="text-lg font-bold text-white tabular-nums font-mono">
                        {fmtINR(derived)}
                        <span className="text-xs text-zinc-400 font-normal">/{ei.unit}</span>
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/50 text-emerald-300 font-semibold">
                      Sanctioned
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------
          TAB 3: CLAUSE 12.1 EXTENSION OF TIME (EOT) CALCULATOR
         --------------------------------------------------------------------- */}
      {activeTab === "EOT_CALCULATOR" && (
        <div className="space-y-6">
          <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-2xl p-5 shadow-sm space-y-3">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-400" />
                    Clause 12.1 Proportional Schedule Extension Ceiling
                  </h2>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-blue-300 border border-zinc-700">
                    Statutory Rule
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-1 max-w-3xl leading-relaxed">
                  Under CPWD GCC Clause 12.1, time extension admissible on account of variations is proportional to the
                  financial value of the variation compared to the original contract sum.
                </p>
              </div>

              <div className="bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2.5 font-mono text-xs text-zinc-300 shrink-0">
                <span className="text-blue-400 font-semibold">Permissible EOT (Days)</span> = Contract Period × (Net
                Variation Value / Original Agreement Value)
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-5 bg-zinc-900/90 border border-zinc-800/80 rounded-2xl p-5 space-y-4 shadow-sm">
              <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-2 border-b border-zinc-800 pb-2">
                <Settings2 className="w-4 h-4 text-zinc-400" />
                <span>Contract &amp; Variation Parameters</span>
              </h3>

              <div className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-zinc-400 mb-1 font-medium">Original Contract Sum (₹)</label>
                  <input
                    type="number"
                    disabled
                    value={contractSum}
                    className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl px-3.5 py-2 font-mono text-zinc-400 cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-zinc-300 mb-1 font-medium">
                    Original Contract Period (Calendar Days)
                  </label>
                  <input
                    type="number"
                    value={contractPeriodDays}
                    onChange={(e) => setContractPeriodDays(Number(e.target.value) || 1)}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2 font-mono text-white focus:outline-none focus:border-blue-500 transition"
                  />
                  <span className="text-[10px] text-zinc-500 mt-0.5 block">
                    Equivalent to {Math.round((contractPeriodDays / 30) * 10) / 10} months completion window.
                  </span>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-zinc-300 font-medium">Net Sanctioned Variation Value (₹)</label>
                    <span className="text-[10px] text-amber-400 font-mono">
                      {fmtINR(eotMath.netVarValue, true)}
                    </span>
                  </div>
                  <input
                    type="number"
                    disabled
                    value={eotMath.netVarValue}
                    className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl px-3.5 py-2 font-mono text-zinc-300 cursor-not-allowed"
                  />
                  <span className="text-[10px] text-zinc-500 mt-0.5 block">
                    Represents {eotMath.variationRatioPct.toFixed(2)}% net financial expansion of original contract.
                  </span>
                </div>

                <div className="pt-2 border-t border-zinc-800/80">
                  <label className="block text-zinc-300 mb-1 font-medium flex items-center justify-between">
                    <span>Contractor Requested EOT (Days)</span>
                    <span className="text-rose-400 font-mono font-bold">{contractorRequestedEot} Days</span>
                  </label>
                  <input
                    type="number"
                    value={contractorRequestedEot}
                    onChange={(e) => setContractorRequestedEot(Number(e.target.value) || 0)}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2 font-mono text-white focus:outline-none focus:border-rose-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-zinc-300 mb-1 font-medium flex items-center justify-between">
                    <span>Engineer Certified EOT (Days)</span>
                    <span className="text-emerald-400 font-mono font-bold">{engineerCertifiedEot} Days</span>
                  </label>
                  <input
                    type="number"
                    value={engineerCertifiedEot}
                    onChange={(e) => setEngineerCertifiedEot(Number(e.target.value) || 0)}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2 font-mono text-white focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>
              </div>
            </div>

            <div className="lg:col-span-7 bg-zinc-900/90 border border-zinc-800/80 rounded-2xl p-5 flex flex-col justify-between shadow-sm space-y-5">
              <div>
                <h3 className="text-xs font-bold text-zinc-200 uppercase tracking-wider flex items-center gap-2 border-b border-zinc-800 pb-2 mb-4">
                  <Scale className="w-4 h-4 text-amber-400" />
                  <span>Statutory Admissibility &amp; Ceiling Verdict</span>
                </h3>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
                    <div className="text-[10px] text-zinc-400 uppercase tracking-wide flex items-center gap-1">
                      <span>Permissible Ceiling</span>
                      <StatutoryTooltip
                        title="Clause 12.1 Schedule Ceiling"
                        clauseRef="CPWD Cl. 12.1"
                        text="Calculated strictly using proportional financial expansion. No extension of time beyond this calculated ceiling can be granted without documented concurrent delays or client default."
                      />
                    </div>
                    <div className="text-3xl font-bold text-blue-400 font-mono mt-1">
                      {eotMath.permissibleEotDays} <span className="text-sm font-normal text-zinc-400">Days</span>
                    </div>
                    <div className="text-[10px] text-zinc-500 mt-1">
                      {contractPeriodDays}d × ({fmtINR(eotMath.netVarValue, true)} / {fmtINR(contractSum, true)})
                    </div>
                  </div>

                  <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
                    <div className="text-[10px] text-zinc-400 uppercase tracking-wide">Contractor Claim</div>
                    <div className="text-3xl font-bold text-white font-mono mt-1">
                      {contractorRequestedEot} <span className="text-sm font-normal text-zinc-400">Days</span>
                    </div>
                    <div className="text-[10px] text-zinc-500 mt-1">
                      Certified: <span className="text-emerald-400 font-semibold">{engineerCertifiedEot} Days</span>
                    </div>
                  </div>
                </div>

                <div
                  className={`rounded-xl p-4 border flex items-start gap-3 ${
                    eotMath.isExceedingCeiling
                      ? "bg-rose-950/20 border-rose-800/60 text-rose-200"
                      : "bg-emerald-950/20 border-emerald-800/60 text-emerald-200"
                  }`}
                >
                  {eotMath.isExceedingCeiling ? (
                    <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold">
                        {eotMath.isExceedingCeiling
                          ? `Exceeds Statutory Ceiling by +${eotMath.requestedDelta} Days`
                          : "Within Permissible Statutory Ceiling"}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                          eotMath.isExceedingCeiling ? "bg-rose-900/60 text-rose-300" : "bg-emerald-900/60 text-emerald-300"
                        }`}
                      >
                        {eotMath.isExceedingCeiling ? "AUDIT DISALLOWANCE" : "STATUTORY SAFE"}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-300 mt-1 leading-relaxed">
                      {eotMath.isExceedingCeiling
                        ? `The requested claim of ${contractorRequestedEot} days exceeds the Clause 12.1 ceiling (${eotMath.permissibleEotDays} days). Under CPWD Works Audit standards, excess days must be backed by contemporaneous delay records or rejected.`
                        : `Contractor requested claim of ${contractorRequestedEot} days is fully within the statutory allowable ceiling of ${eotMath.permissibleEotDays} days.`}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-zinc-950/70 border border-zinc-800 rounded-xl p-4">
                <div className="text-xs font-semibold text-zinc-300 mb-2 flex items-center justify-between">
                  <span>Variation Orders — EOT Claims Allocation</span>
                  <span className="text-[10px] text-zinc-500 font-mono">{variationOrders.length} Registered VOs</span>
                </div>
                <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                  {variationOrders.map((vo) => (
                    <div
                      key={vo.id}
                      className="flex items-center justify-between bg-zinc-900/80 border border-zinc-800/80 rounded-lg px-3 py-2 text-xs"
                    >
                      <div className="min-w-0 pr-3">
                        <div className="font-mono font-semibold text-amber-300 truncate">{vo.vo_number}</div>
                        <div className="text-[11px] text-zinc-400 truncate max-w-sm">{vo.title}</div>
                      </div>
                      <div className="text-right shrink-0 font-mono text-[11px]">
                        <div className="text-zinc-200">
                          Claimed: <span className="font-semibold text-white">{vo.eot_days_claimed}d</span>
                        </div>
                        <div className="text-emerald-400">
                          Approved: <span className="font-semibold">{vo.eot_days_approved}d</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------
          MODAL: REVISE EXECUTED QUANTITY (DEVIATION ITEMS)
         --------------------------------------------------------------------- */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-zinc-900 border border-zinc-700/80 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-amber-400" /> Revise Executed Quantity
                </h3>
                <span className="text-xs font-mono text-zinc-400">{editingItem.boq_item_ref}</span>
              </div>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-zinc-950/70 border border-zinc-800 rounded-xl p-3 text-xs space-y-1.5">
              <div className="text-zinc-300 font-medium">{editingItem.description}</div>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800/80 text-[11px]">
                <div>
                  <span className="text-zinc-500">Agreement Qty: </span>
                  <span className="text-zinc-200 font-mono font-semibold">{fmtQty(editingItem.agreement_qty)}</span>
                </div>
                <div>
                  <span className="text-zinc-500">Schedule F Limit: </span>
                  <span className="text-amber-400 font-mono font-semibold">
                    {editingItem.deviation_limit_pct}% ({editingItem.deviation_type})
                  </span>
                </div>
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const parsedQty = parseFloat(newExecutedQty);
                if (isNaN(parsedQty) || parsedQty < 0) return;
                const prev = editingItem.executed_qty;
                const id = editingItem.id;
                setDeviationItems((p) => p.map((it) => (it.id === id ? { ...it, executed_qty: parsedQty } : it)));
                setEditingItem(null);
                triggerToast(`Quantity updated optimistically to ${fmtQty(parsedQty)}`, "success");
                supabase.from("contract_deviation_items").update({ executed_qty: parsedQty }).eq("id", id).then();
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  New Cumulative Executed Quantity
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={newExecutedQty}
                  onChange={(e) => setNewExecutedQty(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm font-mono text-white focus:outline-none focus:border-amber-500 transition"
                  placeholder="Enter new executed volume..."
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 text-xs font-medium text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium text-zinc-950 bg-amber-400 hover:bg-amber-300 rounded-xl font-semibold shadow-lg shadow-amber-950/40 transition"
                >
                  Confirm &amp; Recalculate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------
          SLIDE-OVER DRAWER: EXTRA ITEM (EI) RATE BUILDER
         --------------------------------------------------------------------- */}
      {isEiDrawerOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex justify-end backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-zinc-900 border-l border-zinc-700/80 w-full max-w-xl h-full overflow-y-auto p-6 shadow-2xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-zinc-800 pb-4 mb-5">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Calculator className="w-5 h-5 text-amber-400" />
                    First-Principles EI Rate Builder
                  </h3>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    CPWD Works Manual Ch. 10 · 15% CP&amp;OH Mandated Statutory Ceiling
                  </p>
                </div>
                <button
                  onClick={() => setIsEiDrawerOpen(false)}
                  className="text-zinc-400 hover:text-white p-1 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveExtraItem} id="ei-builder-form" className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-300 font-medium mb-1">EI Item Code *</label>
                    <input
                      type="text"
                      required
                      value={eiForm.item_code}
                      onChange={(e) => setEiForm({ ...eiForm, item_code: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-300 font-medium mb-1">Unit of Measurement *</label>
                    <input
                      type="text"
                      required
                      value={eiForm.unit}
                      onChange={(e) => setEiForm({ ...eiForm, unit: e.target.value })}
                      placeholder="e.g. m2, m3, MT, Rmt"
                      className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-300 font-medium mb-1">Linked Variation Order (Optional)</label>
                  <select
                    value={eiForm.vo_id}
                    onChange={(e) => setEiForm({ ...eiForm, vo_id: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-zinc-200 focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    <option value="">Unlinked (Standalone Extra Item)</option>
                    {variationOrders.map((vo) => (
                      <option key={vo.id} value={vo.id}>
                        {vo.vo_number} — {vo.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-300 font-medium mb-1">Full Technical Description *</label>
                  <textarea
                    required
                    rows={2}
                    value={eiForm.description}
                    onChange={(e) => setEiForm({ ...eiForm, description: e.target.value })}
                    placeholder="Full specification, IS code, workmanship and testing specifications..."
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500 resize-none"
                  />
                </div>

                {/* Step 1: Material & Carriage */}
                <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3.5 space-y-3">
                  <div className="font-semibold text-zinc-200 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5 text-amber-400" />
                      1. Material Cost &amp; Carriage
                    </span>
                    <span className="font-mono text-amber-400">{fmtINR(eiCalculated.matTotal)}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-zinc-400 block mb-1">Base Material Cost (₹)</label>
                      <input
                        type="number"
                        step="any"
                        value={eiForm.material_cost}
                        onChange={(e) => setEiForm({ ...eiForm, material_cost: Number(e.target.value) })}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 font-mono text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-zinc-400 block mb-1">Carriage / Cartage (₹)</label>
                      <input
                        type="number"
                        step="any"
                        value={eiForm.carriage_cost}
                        onChange={(e) => setEiForm({ ...eiForm, carriage_cost: Number(e.target.value) })}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 font-mono text-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Step 2: Labour Constants */}
                <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3.5 space-y-3">
                  <div className="font-semibold text-zinc-200 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Hammer className="w-3.5 h-3.5 text-blue-400" />
                      2. Labour Constants
                    </span>
                    <span className="font-mono text-blue-400">{fmtINR(eiCalculated.labTotal)}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] text-zinc-400 block mb-1">Skilled Man-days / Unit</label>
                      <div className="flex gap-1.5">
                        <input
                          type="number"
                          step="0.01"
                          value={eiForm.labour_skilled_days}
                          onChange={(e) => setEiForm({ ...eiForm, labour_skilled_days: Number(e.target.value) })}
                          className="w-1/2 bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 font-mono text-white"
                        />
                        <input
                          type="number"
                          value={eiForm.labour_skilled_rate}
                          onChange={(e) => setEiForm({ ...eiForm, labour_skilled_rate: Number(e.target.value) })}
                          className="w-1/2 bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 font-mono text-zinc-300"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[11px] text-zinc-400 block mb-1">Unskilled Man-days / Unit</label>
                      <div className="flex gap-1.5">
                        <input
                          type="number"
                          step="0.01"
                          value={eiForm.labour_unskilled_days}
                          onChange={(e) => setEiForm({ ...eiForm, labour_unskilled_days: Number(e.target.value) })}
                          className="w-1/2 bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 font-mono text-white"
                        />
                        <input
                          type="number"
                          value={eiForm.labour_unskilled_rate}
                          onChange={(e) => setEiForm({ ...eiForm, labour_unskilled_rate: Number(e.target.value) })}
                          className="w-1/2 bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1.5 font-mono text-zinc-300"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Step 3: Machinery / Tools & Plant */}
                <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3.5 space-y-2">
                  <div className="font-semibold text-zinc-200 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Wrench className="w-3.5 h-3.5 text-zinc-400" />
                      3. Machinery, Equipment &amp; T&amp;P
                    </span>
                    <span className="font-mono text-zinc-200">{fmtINR(eiCalculated.machTotal)}</span>
                  </div>
                  <div>
                    <label className="text-[11px] text-zinc-400 block mb-1">T&amp;P / Equipment Hire &amp; Fuel (₹)</label>
                    <input
                      type="number"
                      step="any"
                      value={eiForm.machinery_cost}
                      onChange={(e) => setEiForm({ ...eiForm, machinery_cost: Number(e.target.value) })}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 font-mono text-white"
                    />
                  </div>
                </div>

                {/* Statutory Cost Stacking Recap */}
                <div className="bg-zinc-900 border border-zinc-700/80 rounded-xl p-4 space-y-2 font-mono text-xs">
                  <div className="flex justify-between text-zinc-400 font-sans">
                    <span>Subtotal A (Material + Labour + Mach):</span>
                    <span className="font-mono text-white">{fmtINR(eiCalculated.subtotalA)}</span>
                  </div>
                  <div className="flex justify-between text-zinc-400 font-sans">
                    <span>Water &amp; Electricity Surcharge (Auto 1%):</span>
                    <span className="font-mono text-zinc-300">+{fmtINR(eiCalculated.waterElectricCharge)}</span>
                  </div>
                  <div className="border-t border-zinc-800 pt-1.5 flex justify-between text-zinc-300 font-sans">
                    <span>Cumulative Prime Cost:</span>
                    <span className="font-mono text-white font-bold">{fmtINR(eiCalculated.primeCost)}</span>
                  </div>
                  <div className="flex justify-between text-amber-400 font-sans font-medium">
                    <span>Mandatory 15% CP &amp; OH:</span>
                    <span className="font-mono font-bold">+{fmtINR(eiCalculated.cpOhAmount)}</span>
                  </div>
                  <div className="border-t-2 border-amber-500/40 pt-2 flex items-baseline justify-between text-white font-sans">
                    <span className="font-bold text-sm">Derived Sanctioned Rate:</span>
                    <span className="text-xl font-bold text-amber-300 font-mono">
                      {fmtINR(eiCalculated.finalDerivedRate)}
                      <span className="text-xs text-zinc-400 font-normal">/{eiForm.unit}</span>
                    </span>
                  </div>
                </div>
              </form>
            </div>

            <div className="pt-4 border-t border-zinc-800 flex items-center justify-end gap-3 mt-4">
              <button
                type="button"
                onClick={() => setIsEiDrawerOpen(false)}
                className="px-4 py-2.5 text-xs font-medium text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="ei-builder-form"
                className="px-5 py-2.5 text-xs font-bold text-zinc-950 bg-amber-400 hover:bg-amber-300 rounded-xl shadow-lg shadow-amber-950/40 transition"
              >
                Save &amp; Sanction Extra Item
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------
          MODAL: STATUTORY SANCTION PROFORMA & DIGITAL APPROVAL DOCKET
          (Full Screen Interactive Preview + @media print Optimized Document)
         --------------------------------------------------------------------- */}
      {isProformaModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 flex flex-col items-center justify-start overflow-y-auto p-2 sm:p-4 md:p-6 backdrop-blur-md">
          {/* Floating Action Bar for Screen (Hidden during print) */}
          <div className="no-print w-full max-w-6xl bg-zinc-900 border border-zinc-700/80 rounded-2xl p-4 mb-4 shadow-2xl flex flex-wrap items-center justify-between gap-4 sticky top-2 z-50">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Stamp className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>CPWD Form 48-A Statutory Sanction Docket</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800/40">
                    A4 / A3 Landscape Print Certified
                  </span>
                </h3>
                <div className="text-[11px] text-zinc-400 flex items-center gap-3 mt-0.5">
                  <span>Consolidated Schedule F deviations, Extra Item rate sheets &amp; Clause 12.1 EOT certificate.</span>
                  <span className="text-zinc-600">|</span>
                  <span className="font-mono text-[10px] text-amber-400 flex items-center gap-1">
                    <Fingerprint className="w-3 h-3 text-amber-400" />
                    Hash: {auditRecord.sha256Hash.slice(0, 16)}...
                  </span>
                </div>
              </div>
            </div>

            {/* Interactive Action Bar Controls */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleRegenerateAuditStamp}
                disabled={isGeneratingStamp}
                className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs font-semibold px-3 py-2 rounded-xl transition shadow-sm disabled:opacity-50"
                title="Recompute live SHA-256 cryptographic verification hash"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isGeneratingStamp ? "animate-spin" : ""}`} />
                <span>{isGeneratingStamp ? "Computing..." : "Regenerate Audit Seal"}</span>
              </button>

              <button
                type="button"
                onClick={handleExportCsv}
                className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs font-semibold px-3 py-2 rounded-xl transition shadow-sm"
                title="Export Section A and Section B abstract to CSV"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>Export CSV</span>
              </button>

              <button
                type="button"
                onClick={handleExportHtmlPacket}
                className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs font-semibold px-3 py-2 rounded-xl transition shadow-sm"
                title="Download standalone, self-contained Form 48-A HTML archive"
              >
                <Download className="w-3.5 h-3.5 text-blue-400" />
                <span>Download HTML Packet</span>
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center gap-2 bg-amber-400 hover:bg-amber-300 text-zinc-950 text-xs font-bold px-4 py-2 rounded-xl transition shadow-md shadow-amber-950/30"
                title="Trigger browser print dialogue directly (A4 Landscape / Save as PDF)"
              >
                <Printer className="w-4 h-4" />
                <span>Print / Save PDF</span>
              </button>

              <button
                type="button"
                onClick={() => setIsProformaModalOpen(false)}
                className="p-2 text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-xl transition ml-1"
                aria-label="Close proforma view"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* -------------------------------------------------------------------
              PRINTABLE DOCKET SHEET (CPWD FORM 48-A STATUTORY PROFORMA)
              Converts to high-contrast, black-and-white standard documentation
             ------------------------------------------------------------------- */}
          <div
            id="statutory-proforma-print-container"
            className="proforma-docket-sheet w-full max-w-6xl bg-white text-zinc-900 p-6 sm:p-10 rounded-2xl shadow-2xl border border-zinc-300 text-xs leading-relaxed space-y-6"
          >
            {/* Docket Header */}
            <div className="border-b-2 border-zinc-900 pb-4">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-[10px] font-bold tracking-widest uppercase text-zinc-600">
                    Central Public Works Department · Directorate of Works · Commercial Wing
                  </div>
                  <h1 className="text-lg sm:text-xl font-bold tracking-tight text-black mt-0.5">
                    FORM 48-A: STATUTORY DEVIATION STATEMENT &amp; VARIATION SANCTION PROFORMA
                  </h1>
                  <div className="text-[11px] text-zinc-700 font-serif italic mt-0.5">
                    Prepared under CPWD General Conditions of Contract Clause 12 &amp; FIDIC Red Book Clause 13 (Variations and Adjustments)
                  </div>
                </div>

                <div className="text-right font-mono text-[10px] text-zinc-600 shrink-0">
                  <div>Ref: <strong className="text-black">{auditRecord.docRef}</strong></div>
                  <div>Date: <strong className="text-black">{fmtDate(auditRecord.timestamp)}</strong></div>
                  <div>Zone: <strong className="text-black">UP Lucknow Zone · Commercial Div. I</strong></div>
                </div>
              </div>

              {/* Project Meta Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-zinc-100/90 rounded-xl p-3 mt-4 border border-zinc-300 text-[11px]">
                <div>
                  <span className="text-zinc-500 block font-sans text-[10px]">Project Name:</span>
                  <span className="font-bold text-black">Tower A Core &amp; Shell (G+14 Commercial Complex)</span>
                </div>
                <div>
                  <span className="text-zinc-500 block font-sans text-[10px]">Agreement Number:</span>
                  <span className="font-bold text-black font-mono">EE/CD-I/LKO/AGMT-2024-25/18</span>
                </div>
                <div>
                  <span className="text-zinc-500 block font-sans text-[10px]">Original Contract Sum:</span>
                  <span className="font-bold text-black font-mono">{fmtINR(contractSum)}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block font-sans text-[10px]">Revised Net Exposure:</span>
                  <span className="font-bold text-black font-mono">
                    {fmtINR(kpis.netDeviatedExposure)} ({kpis.exposureVariancePct >= 0 ? "+" : ""}
                    {kpis.exposureVariancePct.toFixed(2)}%)
                  </span>
                </div>
              </div>

              {/* Triple Certification Status Alert */}
              <div className="mt-3">
                {signOffs[1].status === "SIGNED" && signOffs[2].status === "SIGNED" && signOffs[3].status === "SIGNED" ? (
                  <div className="bg-emerald-50 border border-emerald-300 rounded-xl px-3.5 py-2 text-emerald-900 text-[11px] font-bold flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-700" />
                      TRIPLE CERTIFIED &amp; STATUTORILY SANCTIONED UNDER FIDIC CL. 13 &amp; CPWD CL. 12
                    </span>
                    <span className="font-mono text-[10px] text-emerald-800">
                      Seal Verification ID: {auditRecord.sha256Hash.slice(0, 20).toUpperCase()}
                    </span>
                  </div>
                ) : (
                  <div className="bg-amber-50 border border-amber-300 rounded-xl px-3.5 py-2 text-amber-900 text-[11px] font-semibold flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-amber-700" />
                      PROVISIONAL DOCKET · AWAITING STATUTORY SIGN-OFF STAMPS FROM PENDING TIERS
                    </span>
                    <span className="font-mono text-[10px] text-amber-800">
                      QS: {signOffs[1].status} | EE: {signOffs[2].status} | MD: {signOffs[3].status}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* -----------------------------------------------------------------
                SECTION A: SCHEDULE F DEVIATION STATEMENT ABSTRACT
                Shows: BOQ Ref, Original Contract Amount, Gross Permissible
                Deviation Value, Actual Executed Amount, Net Financial Excess/Saving
               ----------------------------------------------------------------- */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between border-b border-zinc-400 pb-1">
                <h2 className="text-xs font-bold uppercase tracking-wider text-black flex items-center gap-2">
                  <span>Section A: Schedule F Deviation Statement Abstract</span>
                  <span className="text-[10px] font-normal text-zinc-600 font-mono">
                    (Clause 12.2 Limits: 100% Substructure / 30% Superstructure)
                  </span>
                </h2>
                <span className="text-[10px] font-mono text-zinc-600 font-bold">
                  {computedItems.length} Monitored Items
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-[10px] border-collapse border border-zinc-300">
                  <thead>
                    <tr className="bg-zinc-200 text-zinc-900 font-bold border-b border-zinc-400">
                      <th className="p-1.5 border border-zinc-300">BOQ Ref</th>
                      <th className="p-1.5 border border-zinc-300">Scope &amp; Cl. 12 Limit</th>
                      <th className="p-1.5 border border-zinc-300">Item Description</th>
                      <th className="p-1.5 border border-zinc-300 text-right">Agmt Qty &amp; Rate</th>
                      <th className="p-1.5 border border-zinc-300 text-right">Exec Qty &amp; Mkt Rate</th>
                      <th className="p-1.5 border border-zinc-300 text-right">Original Contract Amount (₹)</th>
                      <th className="p-1.5 border border-zinc-300 text-right">Gross Permissible Value (₹)</th>
                      <th className="p-1.5 border border-zinc-300 text-right">Actual Executed Amount (₹)</th>
                      <th className="p-1.5 border border-zinc-300 text-right">Net Excess / Saving (₹)</th>
                      <th className="p-1.5 border border-zinc-300 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-300 font-mono">
                    {computedItems.map((it) => {
                      const origContractAmt = it.agreement_qty * it.agreement_rate;
                      const grossPermissibleVal = it.permissibleLimitQty * it.agreement_rate;
                      const actualExecutedAmt = it.totalItemBilling;
                      const netFinancialDelta = actualExecutedAmt - origContractAmt;

                      return (
                        <tr key={it.id} className={it.isBreaching ? "bg-rose-50/70" : ""}>
                          <td className="p-1.5 border border-zinc-300 font-bold">{it.boq_item_ref}</td>
                          <td className="p-1.5 border border-zinc-300 font-sans whitespace-nowrap">
                            {it.deviation_type} ({it.deviation_limit_pct}%)
                          </td>
                          <td className="p-1.5 border border-zinc-300 font-sans max-w-xs truncate" title={it.description}>
                            {it.description}
                          </td>
                          <td className="p-1.5 border border-zinc-300 text-right text-zinc-700 whitespace-nowrap">
                            {fmtQty(it.agreement_qty)} @ ₹{it.agreement_rate.toLocaleString("en-IN")}
                          </td>
                          <td className="p-1.5 border border-zinc-300 text-right font-bold text-black whitespace-nowrap">
                            {fmtQty(it.executed_qty)}
                            {it.market_rate && it.excessBeyondLimit > 0 ? (
                              <span className="text-[9px] text-amber-800 block">
                                (Excess: +{fmtQty(it.excessBeyondLimit)} @ ₹{it.market_rate.toLocaleString("en-IN")})
                              </span>
                            ) : null}
                          </td>
                          <td className="p-1.5 border border-zinc-300 text-right text-zinc-700">
                            {fmtINR(origContractAmt)}
                          </td>
                          <td className="p-1.5 border border-zinc-300 text-right text-zinc-800 font-medium">
                            {fmtINR(grossPermissibleVal)}
                          </td>
                          <td className="p-1.5 border border-zinc-300 text-right font-bold text-black">
                            {fmtINR(actualExecutedAmt)}
                          </td>
                          <td
                            className={`p-1.5 border border-zinc-300 text-right font-bold ${
                              netFinancialDelta > 0 ? "text-rose-700" : netFinancialDelta < 0 ? "text-emerald-700" : "text-zinc-600"
                            }`}
                          >
                            {netFinancialDelta >= 0 ? "+" : ""}
                            {fmtINR(netFinancialDelta)}
                          </td>
                          <td className="p-1.5 border border-zinc-300 text-center font-sans font-bold text-[9px] whitespace-nowrap">
                            {it.isBreaching ? (
                              <span className="text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded">BREACH (Cl. 12.3)</span>
                            ) : it.isApproaching ? (
                              <span className="text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded">APPROACHING</span>
                            ) : (
                              <span className="text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">PERMISSIBLE</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-zinc-100 font-bold border-t-2 border-zinc-600 font-mono text-[10px]">
                      <td colSpan={3} className="p-2 border border-zinc-300 font-sans text-right">
                        Abstract Financial Totals:
                      </td>
                      <td colSpan={2} className="p-2 border border-zinc-300 font-sans text-zinc-600 text-center">
                        Total Monitored Scope ({computedItems.length} Items)
                      </td>
                      <td className="p-2 border border-zinc-300 text-right text-zinc-900">
                        {fmtINR(kpis.totalAgreementBaseline)}
                      </td>
                      <td className="p-2 border border-zinc-300 text-right text-zinc-900">
                        {fmtINR(computedItems.reduce((acc, it) => acc + it.permissibleLimitQty * it.agreement_rate, 0))}
                      </td>
                      <td className="p-2 border border-zinc-300 text-right text-black font-bold text-[11px]">
                        {fmtINR(kpis.totalExecutedCurrent)}
                      </td>
                      <td
                        className={`p-2 border border-zinc-300 text-right font-bold text-[11px] ${
                          kpis.netDeviationDelta >= 0 ? "text-rose-800" : "text-emerald-800"
                        }`}
                      >
                        {kpis.netDeviationDelta >= 0 ? "+" : ""}
                        {fmtINR(kpis.netDeviationDelta)}
                      </td>
                      <td className="p-2 border border-zinc-300 text-center text-amber-900 font-sans text-[9px]">
                        Mkt: {fmtINR(kpis.totalMarketBilled)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* -----------------------------------------------------------------
                SECTION B: EXTRA ITEM (EI) RATE ANALYSIS SHEET
                Shows: Material + Carriage, Labour Constants, Machinery T&P,
                Subtotal A, 1% W&E Surcharge, 15% CP&OH Margin, Derived Rate
               ----------------------------------------------------------------- */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between border-b border-zinc-400 pb-1">
                <h2 className="text-xs font-bold uppercase tracking-wider text-black flex items-center gap-2">
                  <span>Section B: Extra Item (EI) Rate Analysis Sanction Sheet</span>
                  <span className="text-[10px] font-normal text-zinc-600 font-mono">
                    (Formula: Subtotal A + 1% W&amp;E + 15% CP&amp;OH Mandatory Margin per CPWD Works Manual Ch. 10)
                  </span>
                </h2>
                <span className="text-[10px] font-mono text-zinc-600 font-bold">
                  {extraItems.length} Extra Items
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-[10px] border-collapse border border-zinc-300">
                  <thead>
                    <tr className="bg-zinc-200 text-zinc-900 font-bold border-b border-zinc-400">
                      <th className="p-1.5 border border-zinc-300">EI Item Code</th>
                      <th className="p-1.5 border border-zinc-300">Technical Description &amp; Specification</th>
                      <th className="p-1.5 border border-zinc-300 text-center">Unit</th>
                      <th className="p-1.5 border border-zinc-300 text-right">Material + Carriage</th>
                      <th className="p-1.5 border border-zinc-300 text-right">Labour Constants</th>
                      <th className="p-1.5 border border-zinc-300 text-right">Machinery T&amp;P</th>
                      <th className="p-1.5 border border-zinc-300 text-right">Subtotal A</th>
                      <th className="p-1.5 border border-zinc-300 text-right">1% W&amp;E</th>
                      <th className="p-1.5 border border-zinc-300 text-right">15% CP&amp;OH</th>
                      <th className="p-1.5 border border-zinc-300 text-right">Derived Rate (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-300 font-mono">
                    {extraItems.map((ei) => {
                      const mat = Number(ei.material_cost || 0) + Number(ei.carriage_cost || 0);
                      const lab = Number(ei.labour_cost || 0);
                      const mach = Number(ei.machinery_cost || 0);
                      const subA = mat + lab + mach;
                      const we = subA * 0.01;
                      const prime = subA + we;
                      const cpOh = prime * 0.15;
                      const derived = ei.sanctioned_unit_rate || prime + cpOh;

                      return (
                        <tr key={ei.id}>
                          <td className="p-1.5 border border-zinc-300 font-bold text-black">{ei.item_code}</td>
                          <td className="p-1.5 border border-zinc-300 font-sans max-w-sm">{ei.description}</td>
                          <td className="p-1.5 border border-zinc-300 text-center font-bold">{ei.unit}</td>
                          <td className="p-1.5 border border-zinc-300 text-right">{fmtINR(mat)}</td>
                          <td className="p-1.5 border border-zinc-300 text-right">{fmtINR(lab)}</td>
                          <td className="p-1.5 border border-zinc-300 text-right">{fmtINR(mach)}</td>
                          <td className="p-1.5 border border-zinc-300 text-right font-bold text-zinc-900">{fmtINR(subA)}</td>
                          <td className="p-1.5 border border-zinc-300 text-right">+{fmtINR(we)}</td>
                          <td className="p-1.5 border border-zinc-300 text-right text-amber-900 font-bold">
                            +{fmtINR(cpOh)}
                          </td>
                          <td className="p-1.5 border border-zinc-300 text-right font-bold text-black text-xs">
                            {fmtINR(derived)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-zinc-100 font-bold border-t-2 border-zinc-500 font-sans text-[10px]">
                      <td colSpan={3} className="p-2 border border-zinc-300 text-right">
                        Extra Item Rate Analysis Abstract:
                      </td>
                      <td colSpan={7} className="p-2 border border-zinc-300 text-zinc-600 font-mono text-[9px]">
                        CPWD Works Manual Ch. 10 Norms Enforced · Prime Cost = Subtotal A + 1% W&amp;E · Statutory 15% CP&amp;OH Margin Capping Applied
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* -----------------------------------------------------------------
                SECTION C: CLAUSE 12.1 STATUTORY COMPLIANCE & EOT CERTIFICATE
                Summary of admissible time extensions calculated under Clause 12.1
               ----------------------------------------------------------------- */}
            <div className="space-y-2.5 bg-zinc-50 border border-zinc-300 rounded-xl p-4">
              <div className="flex items-center justify-between border-b border-zinc-300 pb-1.5">
                <h2 className="text-xs font-bold uppercase tracking-wider text-black flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-800" />
                  <span>Section C: Clause 12.1 Compliance &amp; Admissible Extension of Time Certificate</span>
                </h2>
                <span className="text-[10px] font-mono text-zinc-600 font-semibold">
                  Proportional Ceilings Enforced
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-[11px] font-mono">
                <div className="p-2 bg-white border border-zinc-300 rounded-lg">
                  <span className="text-zinc-500 block font-sans text-[10px]">Original Contract Period:</span>
                  <span className="font-bold text-black">{contractPeriodDays} Calendar Days</span>
                </div>
                <div className="p-2 bg-white border border-zinc-300 rounded-lg">
                  <span className="text-zinc-500 block font-sans text-[10px]">Net Sanctioned Variation:</span>
                  <span className="font-bold text-black">{fmtINR(eotMath.netVarValue, true)}</span>
                </div>
                <div className="p-2 bg-white border border-zinc-300 rounded-lg">
                  <span className="text-zinc-500 block font-sans text-[10px]">Permissible EOT Ceiling:</span>
                  <span className="font-bold text-blue-800">{eotMath.permissibleEotDays} Calendar Days</span>
                </div>
                <div className="p-2 bg-white border border-zinc-300 rounded-lg">
                  <span className="text-zinc-500 block font-sans text-[10px]">Engineer Recommended:</span>
                  <span className="font-bold text-emerald-800">{engineerCertifiedEot} Calendar Days</span>
                </div>
              </div>

              <div className="p-2.5 bg-white border border-zinc-300 rounded-lg flex items-center justify-between font-mono text-[10px]">
                <div>
                  <span className="text-zinc-500 font-sans">Statutory Ceiling Formula: </span>
                  <span className="font-bold text-black">
                    EOT = {contractPeriodDays}d × ({fmtINR(eotMath.netVarValue, true)} / {fmtINR(contractSum, true)}) = {eotMath.permissibleEotDays} Days
                  </span>
                </div>
                <div>
                  <span
                    className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                      eotMath.isExceedingCeiling ? "bg-rose-100 text-rose-800 border border-rose-300" : "bg-emerald-100 text-emerald-800 border border-emerald-300"
                    }`}
                  >
                    {eotMath.isExceedingCeiling ? "AUDIT DISALLOWANCE NOTICE" : "STATUTORILY ADMISSIBLE"}
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-zinc-700 leading-relaxed font-serif pt-1">
                <strong>Statutory Compliance Declaration:</strong> It is certified that the quantities of work, deviations,
                and extra items detailed above in Section A and Section B have been executed or ordered under written instructions
                in strict accordance with CPWD Works Manual Chapter 10, CPWD General Conditions of Contract Clause 12, and FIDIC
                Red Book Clause 13. Quantities executing beyond Schedule F deviation thresholds (100% substructure and 30% superstructure)
                have been derived based on verified market rate analyses with statutory 15% CP&amp;OH capping. The extension of time
                recommended of {engineerCertifiedEot} calendar days is strictly within the mathematical proportional ceiling of{" "}
                {eotMath.permissibleEotDays} days calculated under Clause 12.1.
              </p>
            </div>

            {/* -----------------------------------------------------------------
                THREE-TIER DIGITAL APPROVAL SIGN-OFF BLOCKS
                1. Site Quantity Surveyor / Resident Engineer (Prepared & Checked)
                2. Consultant Architect / Executive Engineer (Recommended & Verified)
                3. Managing Director / Employer Representative (Sanctioned & Approved)
               ----------------------------------------------------------------- */}
            <div className="space-y-2 pt-2 border-t-2 border-zinc-900">
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-2">
                <span>Official Three-Tier Verification &amp; Sanction Sign-Offs</span>
                <span className="font-mono text-[9px] text-zinc-400 font-normal">
                  ISO 19650-2 CDE Compliant Digital Signatures
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Tier 1: Site Quantity Surveyor / Resident Engineer (Prepared & Checked) */}
                <div className="sign-off-card border border-zinc-400 rounded-xl p-3.5 flex flex-col justify-between bg-zinc-50/60 relative">
                  <div>
                    <div className="text-[10px] font-bold uppercase text-zinc-600">{signOffs[1].roleTitle}</div>
                    <div className="text-xs font-bold text-black mt-1">{signOffs[1].officialName}</div>
                    <div className="text-[10px] text-zinc-500">{signOffs[1].designation}</div>
                    <div className="text-[10px] text-zinc-500">{signOffs[1].department}</div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-zinc-300 flex items-center justify-between text-[10px]">
                    {signOffs[1].status === "SIGNED" ? (
                      <div>
                        <div className="font-mono text-emerald-800 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>PREPARED &amp; CHECKED</span>
                        </div>
                        <div className="text-zinc-500 font-mono text-[9px]">{fmtDateTime(signOffs[1].timestamp)}</div>
                      </div>
                    ) : (
                      <div className="no-print">
                        <button
                          type="button"
                          onClick={() => handleToggleSignTier(1)}
                          className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-[10px] rounded-lg transition"
                        >
                          Sign Tier 1 (QS)
                        </button>
                      </div>
                    )}

                    <div className="text-right font-mono text-[9px] text-zinc-400">
                      <div>{signOffs[1].digitalFingerprint}</div>
                      <div>IP: {signOffs[1].ipAddress}</div>
                    </div>
                  </div>
                </div>

                {/* Tier 2: Consultant Architect / Executive Engineer (Recommended & Verified) */}
                <div className="sign-off-card border border-zinc-400 rounded-xl p-3.5 flex flex-col justify-between bg-zinc-50/60 relative">
                  <div>
                    <div className="text-[10px] font-bold uppercase text-zinc-600">{signOffs[2].roleTitle}</div>
                    <div className="text-xs font-bold text-black mt-1">{signOffs[2].officialName}</div>
                    <div className="text-[10px] text-zinc-500">{signOffs[2].designation}</div>
                    <div className="text-[10px] text-zinc-500">{signOffs[2].department}</div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-zinc-300 flex items-center justify-between text-[10px]">
                    {signOffs[2].status === "SIGNED" ? (
                      <div>
                        <div className="font-mono text-emerald-800 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>RECOMMENDED &amp; VERIFIED</span>
                        </div>
                        <div className="text-zinc-500 font-mono text-[9px]">{fmtDateTime(signOffs[2].timestamp)}</div>
                      </div>
                    ) : (
                      <div className="no-print">
                        <button
                          type="button"
                          onClick={() => handleToggleSignTier(2)}
                          className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-[10px] rounded-lg transition"
                        >
                          Sign Tier 2 (EE)
                        </button>
                      </div>
                    )}

                    <div className="text-right font-mono text-[9px] text-zinc-400">
                      <div>{signOffs[2].digitalFingerprint}</div>
                      <div>IP: {signOffs[2].ipAddress}</div>
                    </div>
                  </div>
                </div>

                {/* Tier 3: Managing Director / Employer Representative (Sanctioned & Approved) */}
                <div
                  className={`sign-off-card border rounded-xl p-3.5 flex flex-col justify-between relative ${
                    signOffs[3].status === "SIGNED"
                      ? "border-emerald-500 bg-emerald-50/40"
                      : "border-amber-400 bg-amber-50/30"
                  }`}
                >
                  <div>
                    <div className="text-[10px] font-bold uppercase text-zinc-600">{signOffs[3].roleTitle}</div>
                    <div className="text-xs font-bold text-black mt-1">{signOffs[3].officialName}</div>
                    <div className="text-[10px] text-zinc-500">{signOffs[3].designation}</div>
                    <div className="text-[10px] text-zinc-500">{signOffs[3].department}</div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-zinc-300 flex items-center justify-between text-[10px]">
                    {signOffs[3].status === "SIGNED" ? (
                      <div>
                        <div className="font-mono text-emerald-800 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>SANCTIONED &amp; APPROVED</span>
                        </div>
                        <div className="text-zinc-500 font-mono text-[9px]">{fmtDateTime(signOffs[3].timestamp)}</div>
                      </div>
                    ) : (
                      <div className="no-print">
                        <button
                          type="button"
                          onClick={() => handleToggleSignTier(3)}
                          className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold text-[10px] rounded-lg shadow transition flex items-center gap-1.5"
                        >
                          <Stamp className="w-3.5 h-3.5" />
                          <span>Apply MD Sanction Stamp</span>
                        </button>
                      </div>
                    )}

                    <div className="text-right font-mono text-[9px] text-zinc-500">
                      <div>{signOffs[3].digitalFingerprint}</div>
                      {signOffs[3].ipAddress !== "—" && <div>IP: {signOffs[3].ipAddress}</div>}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* -----------------------------------------------------------------
                AUDIT STAMP & DOCUMENT VERIFICATION FOOTER
                Dynamic timestamp, IP record, and SHA-256 verification hash
               ----------------------------------------------------------------- */}
            <div className="border-t border-zinc-300 pt-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-[9px] text-zinc-600 font-mono">
              <div className="flex items-center gap-2">
                <Fingerprint className="w-4 h-4 text-zinc-700 shrink-0" />
                <span>
                  SHA-256 Verification Hash: <strong className="text-black">{auditRecord.sha256Hash}</strong>
                </span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span>Timestamp: <strong>{fmtDateTime(auditRecord.timestamp)}</strong></span>
                <span>IP: <strong>{auditRecord.ipAddress}</strong></span>
                <span className="px-1.5 py-0.5 rounded bg-zinc-200 text-zinc-800 font-bold">
                  ISO 19650-2 CDE Sealed
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------------------
          GLOBAL PRINT MEDIA STYLESHEET
          High-Contrast Black & White Standard Documentation (A4 / A3 Landscape)
         --------------------------------------------------------------------- */}
      <style jsx global>{`
        @media print {
          /* Hide non-printable interface containers and floating UI */
          nav,
          header,
          aside,
          .no-print,
          button,
          .screen-toast {
            display: none !important;
          }

          /* Force pure black-and-white standard document typography */
          body,
          html {
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
            font-size: 9pt !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* Printable proforma container expands to full printable width */
          .proforma-docket-sheet {
            max-width: 100% !important;
            width: 100% !important;
            border: none !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
            color: #000000 !important;
            background: #ffffff !important;
          }

          @page {
            size: A4 landscape;
            margin: 8mm 10mm 10mm 10mm;
          }

          /* Tables in print: strict black border lines & clean header shading */
          table {
            width: 100% !important;
            border-collapse: collapse !important;
            page-break-inside: auto !important;
          }

          tr {
            page-break-inside: avoid !important;
            page-break-after: auto !important;
          }

          th,
          td {
            border: 1px solid #222222 !important;
            color: #000000 !important;
            padding: 4px 6px !important;
          }

          th {
            background-color: #f0f0f0 !important;
            font-weight: bold !important;
          }

          .sign-off-card {
            page-break-inside: avoid !important;
            border: 1px solid #333333 !important;
            background: #ffffff !important;
            color: #000000 !important;
          }
        }
      `}</style>
    </div>
  );
}
