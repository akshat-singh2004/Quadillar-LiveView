"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  FolderPlus,
  KeyRound,
  Users,
  Sliders,
  Link2,
  HelpCircle,
  Settings,
  CheckCircle2,
  Building2,
  Copy,
  ArrowUpRight,
  FileCheck2,
} from "lucide-react";
import { useActiveProject } from "@/context/ProjectContext";
import { SCOPE_DOMAINS, ScopeDomainId } from "@/lib/agents/portfolioSentinelMesh";

type WorkspaceTab =
  | "PROJECTS"
  | "ONBOARD_PROJECT"
  | "DELEGATE_BENCHMARKS"
  | "LINKTREE"
  | "FAQS"
  | "SETTINGS";

interface DelegatedMember {
  id: string;
  email: string;
  roleTitle: string;
  bimModelScope: string;
  domain: ScopeDomainId;
  kpiTarget: string;
  endorsedAt: string;
}

interface PaymentBenchmark {
  id: string;
  milestoneName: string;
  digitalRule: string;
  raTranchePct: number;
  status: "VERIFIED_RELEASED" | "GATED_PENDING";
}

const REQUIRED_DOCS_BY_TYPE: Record<string, string[]> = {
  "Commercial High-Rise": [
    "Tender Award / Letter of Acceptance (LOA) Endorsement",
    "UP-LDA / Development Authority Sanctioned Building Plan",
    "Structural Proof-Check Certificate & GFC Foundation Drawings",
    "Fire NOC & High-Rise Aviation Height Clearance",
  ],
  "Institutional Campus": [
    "Institutional EPC Concession & Tender Endorsement",
    "Geotechnical Soil Investigation Report (IS 2911)",
    "Federated LOD-400 Architectural + MEP BIM Baseline",
    "GRIHA / Environmental Clearance Compliance Dossier",
  ],
  "Healthcare & Cleanroom": [
    "Hospital / Cleanroom Tender Endorsement & Clinical Brief",
    "AERB Radiation / ISO Class-5 HVAC Pressure Zoning Plan",
    "Medical Gas & Fire-Life-Safety Statutory Approval",
  ],
  "Industrial & Logistics": [
    "Industrial Plot Allotment & Tender Endorsement",
    "PEB / Long-Span Structural Load & Floor Flatness Spec",
    "PESO / Pollution Control Board Consent to Establish",
  ],
};

export default function StudioWorkspacePage() {
  const router = useRouter();
  const { allProjects, activeProject, selectProject, registerProject } = useActiveProject();
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("ONBOARD_PROJECT");

  const [userProfile, setUserProfile] = useState({
    fullName: "Principal Architect",
    firmName: "Quadillar ConTech Pvt. Ltd.",
    email: "principal@quadillar.com",
    coaNumber: "CA/2026/QUADILLAR-01",
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem("quadillar-user-profile-v1");
      if (saved) setUserProfile((prev) => ({ ...prev, ...JSON.parse(saved) }));
    } catch {}
  }, []);

  // Wizard State: New Project vs. Existing Project
  const [onboardingMode, setOnboardingMode] = useState<"NEW" | "EXISTING">("NEW");
  const [existingTokenInput, setExistingTokenInput] = useState("QDL-PRJ-VGDN-2026");
  const [projectName, setProjectName] = useState("");
  const [projectLocation, setProjectLocation] = useState("Gomti Nagar Extension, Lucknow");
  const [projectType, setProjectType] = useState<string>("Commercial High-Rise");
  const [contractCr, setContractCr] = useState("320.0");
  const [bimFileName, setBimFileName] = useState("Vanguard_Phase2_LOD400.ifc");
  const [specialReqs, setSpecialReqs] = useState<string[]>([
    "Seismic Zone III/IV Detailing",
    "Post-Tensioned Transfer Girders",
  ]);
  const [checkedDocs, setCheckedDocs] = useState<Record<string, boolean>>({
    "Tender Award / Letter of Acceptance (LOA) Endorsement": true,
    "UP-LDA / Development Authority Sanctioned Building Plan": true,
  });
  const [tenderEndorsed, setTenderEndorsed] = useState(true);
  const [mintedToken, setMintedToken] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState(false);

  // Delegation & Digital-to-Physical Payment Benchmarks State
  const [delegateEmail, setDelegateEmail] = useState("");
  const [delegateModel, setDelegateModel] = useState("BIT-4 Transfer Girder & Podium Structural IFC");
  const [delegateDomain, setDelegateDomain] = useState<ScopeDomainId>("STRUCTURAL_IS456");
  const [delegateKpi, setDelegateKpi] = useState("0 Unresolved NCRs • ±2.0mm Gridline Tolerance");
  const [delegations, setDelegations] = useState<DelegatedMember[]>([
    {
      id: "DEL-01",
      email: "aryan.cmo@quadillar.com",
      roleTitle: "Director & Commercial Lead",
      bimModelScope: "Full Campus BOQ & RA Escrow Ledger",
      domain: "COMMERCIAL_ESCROW",
      kpiTarget: "100% CPWD Cl. 42 & Escrow Gate Compliance",
      endorsedAt: "Active Token",
    },
    {
      id: "DEL-02",
      email: "str.lead@quadillar.com",
      roleTitle: "Senior Structural Engineer",
      bimModelScope: "BIT-4 Transfer Girder TG-03 & BIT-3 Core",
      domain: "STRUCTURAL_IS456",
      kpiTarget: "M50 Core Strength ≥ 42.5 MPa (IS 456 Cl. 17.4.3)",
      endorsedAt: "Active Token",
    },
  ]);

  const [benchmarks, setBenchmarks] = useState<PaymentBenchmark[]>([
    {
      id: "BM-01",
      milestoneName: "Tranche 1: Substructure & Piling Sign-Off",
      digitalRule: "IS 2911 Pile Settlement < 12mm + 100% Weighbridge Match",
      raTranchePct: 20,
      status: "VERIFIED_RELEASED",
    },
    {
      id: "BM-02",
      milestoneName: "Tranche 2: Podium & Level 3 Transfer Girder TG-03",
      digitalRule: "IS 456:2000 Cl. 17.4.3 M50 Cube/Core Pass + ±2mm LiDAR",
      raTranchePct: 30,
      status: "GATED_PENDING",
    },
    {
      id: "BM-03",
      milestoneName: "Tranche 3: MEP 14-Bar Hydrotest & Multi-Ray Plenum Scan",
      digitalRule: "24GHz mmWave Gypsum Cavity Clear + Zero Navisworks Clash",
      raTranchePct: 25,
      status: "GATED_PENDING",
    },
    {
      id: "BM-04",
      milestoneName: "Tranche 4: As-Built Revit Delta Sync & COBie Handover",
      digitalRule: "100% As-Built IFC Reconciliation + BSA Sec. 63 Ledger Seal",
      raTranchePct: 25,
      status: "GATED_PENDING",
    },
  ]);
  const [newBmName, setNewBmName] = useState("");
  const [newBmRule, setNewBmRule] = useState("");
  const [newBmPct, setNewBmPct] = useState("10");

  const mandatoryDocs = REQUIRED_DOCS_BY_TYPE[projectType] || REQUIRED_DOCS_BY_TYPE["Commercial High-Rise"];

  const toggleSpecialReq = (req: string) => {
    setSpecialReqs((prev) =>
      prev.includes(req) ? prev.filter((r) => r !== req) : [...prev, req]
    );
  };

  const handleMintProjectToken = (e: React.FormEvent) => {
    e.preventDefault();
    const slug = (projectName || "LKO-APEX-TOWER")
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 18);
    const token =
      onboardingMode === "EXISTING" && existingTokenInput.trim()
        ? existingTokenInput.trim().toUpperCase()
        : `QDL-PRJ-${slug.slice(0, 6)}-${Math.floor(1000 + Math.random() * 9000)}`;

    const newId = slug.startsWith("LKO-") ? slug : `LKO-${slug}`;
    const valCr = parseFloat(contractCr) || 320.0;

    registerProject({
      projectId: newId,
      code: `PRJ-${(allProjects.length + 1).toString().padStart(2, "0")}`,
      name: projectName || "Apex Commercial & Tech Center",
      subtitle: `${projectLocation} • ${projectType} • BIM: ${bimFileName}`,
      location: projectLocation,
      architectLead: userProfile.fullName,
      contractValueCr: valCr,
      retentionCr: Number((valCr * 0.05).toFixed(2)),
      certifiedCr: onboardingMode === "EXISTING" ? Number((valCr * 0.42).toFixed(2)) : 0,
      physicalPct: onboardingMode === "EXISTING" ? 42.0 : 4.5,
      cpi: 1.012,
      lidarRmsMm: 1.5,
      status: "NOMINAL",
      activeAlerts: [],
    });

    setMintedToken(token);
  };

  const handleAddDelegation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!delegateEmail.trim()) return;
    setDelegations((prev) => [
      {
        id: `DEL-${Date.now()}`,
        email: delegateEmail.trim(),
        roleTitle: "Endorsed Project Collaborator",
        bimModelScope: delegateModel,
        domain: delegateDomain,
        kpiTarget: delegateKpi,
        endorsedAt: mintedToken || "QDL-PRJ-VGDN-2026",
      },
      ...prev,
    ]);
    setDelegateEmail("");
  };

  const handleAddBenchmark = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBmName.trim() || !newBmRule.trim()) return;
    setBenchmarks((prev) => [
      ...prev,
      {
        id: `BM-${Date.now()}`,
        milestoneName: newBmName.trim(),
        digitalRule: newBmRule.trim(),
        raTranchePct: Number(newBmPct) || 10,
        status: "GATED_PENDING",
      },
    ]);
    setNewBmName("");
    setNewBmRule("");
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col lg:flex-row font-mono">
      {/* Canva-Style Left Workspace Rail */}
      <aside className="w-full lg:w-72 bg-zinc-950 border-b lg:border-b-0 lg:border-r border-zinc-800 p-4 flex flex-col justify-between gap-4 shrink-0">
        <div className="flex flex-col gap-4">
          <div className="p-3 rounded-2xl bg-zinc-900/80 border border-zinc-800">
            <div className="text-[10px] text-emerald-400 font-bold uppercase">
              AUTHENTICATED STUDIO
            </div>
            <div className="text-sm font-bold text-white mt-0.5 truncate">
              {userProfile.fullName}
            </div>
            <div className="text-[10px] text-zinc-400 truncate">{userProfile.firmName}</div>
          </div>

          <button
            type="button"
            onClick={() => setActiveTab("ONBOARD_PROJECT")}
            className="w-full py-2.5 px-3 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 font-bold text-xs flex items-center justify-center gap-2 transition"
          >
            <FolderPlus className="w-4 h-4" />
            + Add / Join Project Token
          </button>

          <nav className="flex flex-col gap-1 text-xs">
            {[
              { id: "ONBOARD_PROJECT", label: "New / Existing Project", icon: KeyRound },
              { id: "PROJECTS", label: `Portfolio (${allProjects.length} Sites)`, icon: Building2 },
              { id: "DELEGATE_BENCHMARKS", label: "Delegation & Benchmarks", icon: Sliders },
              { id: "LINKTREE", label: "Firm Linktree & Credentials", icon: Link2 },
              { id: "FAQS", label: "FAQs & IS-Code Playbook", icon: HelpCircle },
              { id: "SETTINGS", label: "Account & Device Settings", icon: Settings },
            ].map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id as WorkspaceTab)}
                  className={`w-full px-3 py-2.5 rounded-xl flex items-center gap-2.5 text-left font-bold transition ${
                    active
                      ? "bg-zinc-900 border border-zinc-700 text-white"
                      : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/50"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="pt-3 border-t border-zinc-800 flex flex-col gap-2 text-[11px]">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="w-full py-2 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 font-bold flex items-center justify-between"
          >
            <span>Open Command Center</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
          <a
            href="/auth"
            className="text-center text-[10px] text-zinc-500 hover:text-zinc-300"
          >
            Switch Account / Sign Out
          </a>
        </div>
      </aside>

      {/* Main Workspace Content Area */}
      <main className="flex-1 p-4 md:p-8 max-w-6xl mx-auto w-full flex flex-col gap-6">
        {/* TAB 1: NEW OR EXISTING PROJECT WIZARD + TOKEN MINTING */}
        {activeTab === "ONBOARD_PROJECT" && (
          <div className="flex flex-col gap-5">
            <div className="border-b border-zinc-800 pb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">
                  PROJECT ONBOARDING & CRYPTOGRAPHIC TOKEN ENGINE
                </span>
                <h1 className="text-2xl font-bold text-white mt-1">
                  Register New Tender or Link Existing Project
                </h1>
              </div>

              <div className="flex gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setOnboardingMode("NEW")}
                  className={`px-3.5 py-2 rounded-xl font-bold border transition ${
                    onboardingMode === "NEW"
                      ? "bg-zinc-100 text-zinc-950 border-white"
                      : "bg-zinc-900 text-zinc-300 border-zinc-800"
                  }`}
                >
                  New Project (Tender Won)
                </button>
                <button
                  type="button"
                  onClick={() => setOnboardingMode("EXISTING")}
                  className={`px-3.5 py-2 rounded-xl font-bold border transition ${
                    onboardingMode === "EXISTING"
                      ? "bg-zinc-100 text-zinc-950 border-white"
                      : "bg-zinc-900 text-zinc-300 border-zinc-800"
                  }`}
                >
                  Existing Project / Token
                </button>
              </div>
            </div>

            <form
              onSubmit={handleMintProjectToken}
              className="grid grid-cols-1 lg:grid-cols-12 gap-5 text-xs"
            >
              {/* Left 7 Cols: BIM, Type & Special Requirements */}
              <div className="lg:col-span-7 bg-zinc-900/70 border border-zinc-800 rounded-2xl p-5 flex flex-col gap-4">
                <div className="font-bold text-sm text-white">
                  1. Project Genome, BIM Model & Special Requirements
                </div>

                {onboardingMode === "EXISTING" && (
                  <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800">
                    <label className="text-[10px] text-emerald-400 uppercase font-bold">
                      Existing Project Token (or Generate New for Legacy Site)
                    </label>
                    <input
                      type="text"
                      value={existingTokenInput}
                      onChange={(e) => setExistingTokenInput(e.target.value)}
                      placeholder="QDL-PRJ-XXXX-XXXX"
                      className="mt-1 w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-zinc-100 font-bold"
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-zinc-400 uppercase font-bold">
                      Project / Building Title
                    </label>
                    <input
                      type="text"
                      required
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      placeholder="e.g. Gomti Horizon Corporate Tower"
                      className="mt-1 w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-100"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400 uppercase font-bold">
                      Site Coordinates / Location
                    </label>
                    <input
                      type="text"
                      required
                      value={projectLocation}
                      onChange={(e) => setProjectLocation(e.target.value)}
                      className="mt-1 w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-100"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] text-zinc-400 uppercase font-bold">
                      Project Classification
                    </label>
                    <select
                      value={projectType}
                      onChange={(e) => setProjectType(e.target.value)}
                      className="mt-1 w-full bg-zinc-950 border border-zinc-800 rounded-xl px-2.5 py-2 text-zinc-100"
                    >
                      {Object.keys(REQUIRED_DOCS_BY_TYPE).map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400 uppercase font-bold">
                      EPC Baseline (₹ Cr)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={contractCr}
                      onChange={(e) => setContractCr(e.target.value)}
                      className="mt-1 w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-100"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400 uppercase font-bold">
                      Master BIM (.IFC / .GLB)
                    </label>
                    <label className="mt-1 w-full bg-zinc-950 hover:bg-zinc-900 border border-dashed border-zinc-700 rounded-xl px-3 py-2 text-zinc-300 flex items-center justify-between cursor-pointer truncate">
                      <span className="truncate">{bimFileName}</span>
                      <input
                        type="file"
                        accept=".ifc,.glb,.gltf,.rvt"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) setBimFileName(f.name);
                        }}
                      />
                    </label>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-zinc-400 uppercase font-bold">
                    Special Engineering & Governance Requirements
                  </span>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {[
                      "Seismic Zone III/IV Detailing",
                      "Post-Tensioned Transfer Girders",
                      "GRIHA 5-Star Envelope",
                      "ISO Class-5 Cleanroom",
                      "Multi-Ray LiDAR + Thermal IR",
                      "1:1 Meta Quest 3S VR Twin",
                    ].map((req) => {
                      const active = specialReqs.includes(req);
                      return (
                        <button
                          key={req}
                          type="button"
                          onClick={() => toggleSpecialReq(req)}
                          className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold transition ${
                            active
                              ? "bg-zinc-100 text-zinc-950 border-white"
                              : "bg-zinc-950 text-zinc-400 border-zinc-800"
                          }`}
                        >
                          {active ? "✓ " : "+ "}
                          {req}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Right 5 Cols: Dynamic Statutory Papers & Tender Endorsement */}
              <div className="lg:col-span-5 bg-zinc-900/70 border border-zinc-800 rounded-2xl p-5 flex flex-col justify-between gap-4">
                <div className="flex flex-col gap-3">
                  <div className="font-bold text-sm text-white flex items-center gap-2">
                    <FileCheck2 className="w-4 h-4 text-emerald-400" />
                    2. Required Papers & Tender Endorsement
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    Auto-configured for <strong>{projectType}</strong> ({specialReqs.length} special requirements):
                  </p>

                  <div className="flex flex-col gap-2">
                    {mandatoryDocs.map((doc) => (
                      <label
                        key={doc}
                        className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 flex items-start gap-2.5 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={Boolean(checkedDocs[doc])}
                          onChange={(e) =>
                            setCheckedDocs((prev) => ({ ...prev, [doc]: e.target.checked }))
                          }
                          className="mt-0.5 accent-emerald-500"
                        />
                        <span className="text-[11px] text-zinc-200 leading-snug">{doc}</span>
                      </label>
                    ))}
                  </div>

                  <label className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/35 flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      required
                      checked={tenderEndorsed}
                      onChange={(e) => setTenderEndorsed(e.target.checked)}
                      className="mt-0.5 accent-emerald-500"
                    />
                    <span className="text-[10.5px] text-emerald-200 leading-relaxed">
                      <strong>Principal Endorsement:</strong> I confirm {userProfile.firmName} holds valid tender award / client authorization for this project.
                    </span>
                  </label>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 px-4 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 font-bold text-xs transition"
                >
                  Verify Papers & Mint Project Token
                </button>
              </div>
            </form>

            {/* Minted Project Token Banner */}
            {mintedToken && (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/40 flex flex-wrap items-center justify-between gap-4 text-xs">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-emerald-400 uppercase">
                    ✓ PROJECT REGISTERED & TOKEN SEALED
                  </span>
                  <div className="text-base font-bold text-white flex items-center gap-2">
                    <span>TOKEN: {mintedToken}</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(mintedToken);
                        setCopiedToken(true);
                      }}
                      className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-[10px] text-zinc-200 inline-flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" />
                      {copiedToken ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <span className="text-[11px] text-zinc-300">
                    Use this token to endorse team members or link existing site telemetry.
                  </span>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab("DELEGATE_BENCHMARKS")}
                    className="px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-100 font-bold"
                  >
                    Delegate & Set Benchmarks →
                  </button>
                  <button
                    type="button"
                    onClick={() => router.push("/")}
                    className="px-3.5 py-2 rounded-xl bg-emerald-500 text-zinc-950 font-bold"
                  >
                    Launch Live Command Center →
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: CREDENTIAL DELEGATION & DIGITAL-TO-PHYSICAL PAYMENT BENCHMARKS */}
        {activeTab === "DELEGATE_BENCHMARKS" && (
          <div className="flex flex-col gap-6 text-xs">
            <div className="border-b border-zinc-800 pb-4">
              <span className="text-[10px] font-bold text-emerald-400 uppercase">
                ACTIVE PROJECT: {activeProject.code} • {activeProject.name}
              </span>
              <h1 className="text-2xl font-bold text-white mt-1">
                Credential Delegation & Digital-to-Physical Payment Benchmarks
              </h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Left 6 Cols: Endorse Existing Accounts by Credential */}
              <div className="lg:col-span-6 bg-zinc-900/70 border border-zinc-800 rounded-2xl p-4 flex flex-col gap-3">
                <div className="font-bold text-sm text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-zinc-300" />
                  1. Endorse Existing Accounts & Assign BIM Scope
                </div>

                <form onSubmit={handleAddDelegation} className="flex flex-col gap-2.5">
                  <input
                    type="email"
                    required
                    value={delegateEmail}
                    onChange={(e) => setDelegateEmail(e.target.value)}
                    placeholder="Collaborator registered email (e.g. mep.lead@firm.com)"
                    className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-100"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={delegateDomain}
                      onChange={(e) => setDelegateDomain(e.target.value as ScopeDomainId)}
                      className="bg-zinc-950 border border-zinc-800 rounded-xl px-2.5 py-2 text-zinc-100"
                    >
                      {SCOPE_DOMAINS.filter((s) => s.id !== "ALL_SCOPES").map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={delegateModel}
                      onChange={(e) => setDelegateModel(e.target.value)}
                      placeholder="BIM Model / Zone Scope"
                      className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-100"
                    />
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={delegateKpi}
                      onChange={(e) => setDelegateKpi(e.target.value)}
                      placeholder="Assigned KPI Target"
                      className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-100"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 font-bold"
                    >
                      Endorse
                    </button>
                  </div>
                </form>

                <div className="flex flex-col gap-2 pt-2 border-t border-zinc-800">
                  {delegations.map((d) => (
                    <div
                      key={d.id}
                      className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-col gap-1"
                    >
                      <div className="flex justify-between font-bold text-white">
                        <span>{d.email}</span>
                        <span className="text-[10px] text-emerald-400">{d.endorsedAt}</span>
                      </div>
                      <div className="text-[11px] text-zinc-300">Model: {d.bimModelScope}</div>
                      <div className="text-[10px] text-zinc-400">KPI: {d.kpiTarget}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right 6 Cols: Digital Benchmarks -> Physical RA Payment Tranches */}
              <div className="lg:col-span-6 bg-zinc-900/70 border border-zinc-800 rounded-2xl p-4 flex flex-col gap-3">
                <div className="font-bold text-sm text-white flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  2. Digital Benchmarks → Physical Payment Release Gates
                </div>

                <form onSubmit={handleAddBenchmark} className="grid grid-cols-12 gap-2">
                  <input
                    type="text"
                    value={newBmName}
                    onChange={(e) => setNewBmName(e.target.value)}
                    placeholder="Milestone Name"
                    className="col-span-5 bg-zinc-950 border border-zinc-800 rounded-xl px-2.5 py-2 text-zinc-100"
                  />
                  <input
                    type="text"
                    value={newBmRule}
                    onChange={(e) => setNewBmRule(e.target.value)}
                    placeholder="Digital BIM / IS-Code Benchmark"
                    className="col-span-5 bg-zinc-950 border border-zinc-800 rounded-xl px-2.5 py-2 text-zinc-100"
                  />
                  <button
                    type="submit"
                    className="col-span-2 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 font-bold"
                  >
                    + Add
                  </button>
                </form>

                <div className="flex flex-col gap-2">
                  {benchmarks.map((b) => {
                    const inrValue = ((activeProject.contractValueCr * b.raTranchePct) / 100).toFixed(2);
                    return (
                      <div
                        key={b.id}
                        className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-col gap-1"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-white">{b.milestoneName}</span>
                          <span
                            className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                              b.status === "VERIFIED_RELEASED"
                                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                                : "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                            }`}
                          >
                            {b.raTranchePct}% (₹{inrValue} Cr) •{" "}
                            {b.status === "VERIFIED_RELEASED" ? "RELEASED" : "GATED"}
                          </span>
                        </div>
                        <div className="text-[10.5px] text-zinc-400">
                          Digital Rule: <span className="text-zinc-200">{b.digitalRule}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: PORTFOLIO PROJECTS */}
        {activeTab === "PROJECTS" && (
          <div className="flex flex-col gap-4 text-xs">
            <h1 className="text-2xl font-bold text-white">
              Registered Portfolio Sites ({allProjects.length})
            </h1>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {allProjects.map((p) => (
                <div
                  key={p.projectId}
                  onClick={() => {
                    selectProject(p.projectId);
                    router.push("/");
                  }}
                  className="p-4 rounded-2xl bg-zinc-900/75 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-600 cursor-pointer flex flex-col justify-between gap-2 transition"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">
                      {p.code}: {p.name}
                    </span>
                    <span className="text-[10px] text-emerald-400 font-bold">
                      ₹{p.contractValueCr.toFixed(0)} Cr • {p.physicalPct}%
                    </span>
                  </div>
                  <div className="text-[11px] text-zinc-400">{p.subtitle}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: FIRM LINKTREE & CREDENTIALS */}
        {activeTab === "LINKTREE" && (
          <div className="max-w-xl mx-auto w-full bg-zinc-900/75 border border-zinc-800 rounded-3xl p-6 flex flex-col gap-4 text-xs">
            <div className="text-center">
              <div className="text-[10px] text-emerald-400 font-bold uppercase">
                VERIFIED PRACTICE LINKTREE & STATUTORY DIRECTORY
              </div>
              <h1 className="text-xl font-bold text-white mt-1">{userProfile.firmName}</h1>
              <p className="text-zinc-400 mt-0.5">
                {userProfile.fullName} • Reg: {userProfile.coaNumber}
              </p>
            </div>

            <div className="flex flex-col gap-2">
              {[
                { label: "Master Portfolio Command Center (10 Sites)", href: "/" },
                { label: "Federated 3D BIM & Multi-Ray Digital Twin", href: "/site/digital-twin" },
                { label: "BSA Sec. 63 / Sec. 65B Notarized Evidence Vault", href: "/closeout/audit-vault" },
                { label: "Structural IS 456 / SonReb NDT Register", href: "/site/ndt" },
                { label: "Commercial RA Billing & UP-LDA Escrow Ledger", href: "/finance/ra-bills" },
              ].map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="p-3.5 rounded-xl bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 text-zinc-100 font-bold flex items-center justify-between transition"
                >
                  <span>{link.label}</span>
                  <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: FAQS */}
        {activeTab === "FAQS" && (
          <div className="flex flex-col gap-3 text-xs">
            <h1 className="text-2xl font-bold text-white">
              Platform FAQs & Digital Benchmark Architecture
            </h1>
            {[
              {
                q: "How does a Project Token connect a new or existing project?",
                a: "Once a Principal uploads the BIM model and endorses tender documents, LiveView mints a SHA-256 Project Token (QDL-PRJ-XXXX-XXXX). Existing accounts enter that token to inherit scoped BIM access and KPI rules.",
              },
              {
                q: "How are physical RA payments tied to digital BIM benchmarks?",
                a: "Each payment tranche is bound to an objective digital rule (e.g., IS 456:2000 Cl. 17.4.3 compressive strength ≥ 42.5 MPa or ±2.0 mm LiDAR alignment). If telemetry fails, the Quality-to-Escrow Kill Switch automatically holds disbursement.",
              },
              {
                q: "What if an on-site variation works structurally even if it differs from the original plan?",
                a: "In the 3D BIM Digital Twin, the engineer can approve the field variation as the new As-Built baseline and export a Revit Dynamo / IFC Delta Patch so downstream MEP models update automatically.",
              },
            ].map((item) => (
              <div
                key={item.q}
                className="p-4 rounded-2xl bg-zinc-900/75 border border-zinc-800 flex flex-col gap-1.5"
              >
                <div className="font-bold text-white">{item.q}</div>
                <div className="text-zinc-400 leading-relaxed">{item.a}</div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 6: ACCOUNT SETTINGS */}
        {activeTab === "SETTINGS" && (
          <div className="max-w-xl bg-zinc-900/75 border border-zinc-800 rounded-2xl p-5 flex flex-col gap-3 text-xs">
            <h1 className="text-lg font-bold text-white">Account & Cross-Device Profile Settings</h1>
            <div>
              <label className="text-[10px] text-zinc-400 uppercase font-bold">Principal Name</label>
              <input
                type="text"
                value={userProfile.fullName}
                onChange={(e) => setUserProfile({ ...userProfile, fullName: e.target.value })}
                className="mt-1 w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-100"
              />
            </div>
            <div>
              <label className="text-[10px] text-zinc-400 uppercase font-bold">Firm Name</label>
              <input
                type="text"
                value={userProfile.firmName}
                onChange={(e) => setUserProfile({ ...userProfile, firmName: e.target.value })}
                className="mt-1 w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-100"
              />
            </div>
            <button
              type="button"
              onClick={() =>
                localStorage.setItem("quadillar-user-profile-v1", JSON.stringify(userProfile))
              }
              className="py-2.5 px-4 rounded-xl bg-zinc-100 text-zinc-950 font-bold"
            >
              Save Cross-Device Profile
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
