"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  Shield,
  Wind,
  Activity,
  DollarSign,
  Cpu,
  FileCheck,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Save,
  Loader2,
  Radio,
  Lock,
  Building2,
  SlidersHorizontal,
} from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import { useActiveRole } from "@/context/RoleContext";

type SettingsTab =
  | "statutory_hse"
  | "commercial_baseline"
  | "agent_daemons"
  | "evidentiary_65b"
  | "rera_profile"
  | "ground_truth";

interface SystemSettingsState {
  // HSE & Engineering Boundaries
  anemometer_cutoff_kmh: number;
  anemometer_gust_sustain_sec: number;
  confined_space_o2_min: number;
  confined_space_o2_max: number;
  confined_space_lel_max: number;
  confined_space_h2s_max_ppm: number;
  rebar_scrap_ceiling_pct: number;
  default_rebar_grade: string;
  nominal_bar_factor: number;

  // Commercial & Contractual Baseline
  sanctioned_bac_inr: number;
  retention_deduction_pct: number;
  toc_snag_threshold_pct: number;
  defects_liability_days: number;
  emb_tolerance_variance_pct: number;

  // Autonomous Agent Daemons
  argus_sync_interval_sec: number;
  argus_auto_revoke_ptw: boolean;
  aegis_crane_buffer_m: number;
  hermes_shift_start_time: string;
  hermes_ot_rate_multiplier: number;

  // Evidentiary Vault & Section 65B
  merkle_batch_interval: string;
  hash_algorithm: string;
  certifying_authority_name: string;
  certifying_authority_designation: string;

  // RERA Profile
  rera_registration_no: string;
  rera_jurisdiction: string;
  local_municipal_authority: string;

  // System Core
  strict_ground_truth_mode: boolean;
}

const DEFAULT_SETTINGS: SystemSettingsState = {
  anemometer_cutoff_kmh: 38.0,
  anemometer_gust_sustain_sec: 15,
  confined_space_o2_min: 19.5,
  confined_space_o2_max: 23.5,
  confined_space_lel_max: 10.0,
  confined_space_h2s_max_ppm: 10.0,
  rebar_scrap_ceiling_pct: 3.0,
  default_rebar_grade: "Fe 500D TMT",
  nominal_bar_factor: 162.2,

  sanctioned_bac_inr: 0,
  retention_deduction_pct: 5.0,
  toc_snag_threshold_pct: 100.0,
  defects_liability_days: 365,
  emb_tolerance_variance_pct: 1.5,

  argus_sync_interval_sec: 30,
  argus_auto_revoke_ptw: true,
  aegis_crane_buffer_m: 15.0,
  hermes_shift_start_time: "08:00",
  hermes_ot_rate_multiplier: 1.5,

  merkle_batch_interval: "DAILY_SHIFT_END",
  hash_algorithm: "SHA-256 FIPS-180-4",
  certifying_authority_name: "Principal Architect & Quality Director",
  certifying_authority_designation: "Authorized Section 65B Certifier",

  rera_registration_no: "",
  rera_jurisdiction: "UP-RERA (Uttar Pradesh Real Estate Regulatory Authority)",
  local_municipal_authority: "Lucknow Municipal Corporation (LMC) / LDA",

  strict_ground_truth_mode: true,
};

export default function SystemSettingsConsole() {
  const { project } = useActiveRole();
  const projectId =
    (project as any)?.project_id || (project as any)?.id || "GOMTI-NAGAR-PH1-FITOUT";
  const projectName =
    (project as any)?.project_name || (project as any)?.name || "Active Contract";

  const [activeTab, setActiveTab] = useState<SettingsTab>("statutory_hse");
  const [settings, setSettings] = useState<SystemSettingsState>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    async function loadSettings() {
      setLoading(true);
      try {
        const { data, error } = await (supabase as any)
          .from("project_system_settings")
          .select("config")
          .eq("project_id", projectId)
          .maybeSingle();

        if (error && error.code !== "PGRST116") {
          console.warn("Settings fetch fallback:", error.message);
        }

        if (data?.config) {
          setSettings((prev) => ({ ...prev, ...data.config }));
        }
      } catch (err: any) {
        console.error("Error loading settings:", err);
      } finally {
        setLoading(false);
      }
    }

    if (projectId) {
      loadSettings();
    }
  }, [projectId]);

  const handleSave = () => {
    startTransition(async () => {
      setFeedback(null);
      try {
        const { error } = await (supabase as any).from("project_system_settings").upsert(
          {
            project_id: projectId,
            config: settings,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "project_id" }
        );

        if (error) throw error;
        setFeedback({
          type: "success",
          text: "System configurations committed to project state.",
        });
      } catch (err: any) {
        setFeedback({
          type: "error",
          text: err.message || "Failed to commit system settings.",
        });
      }
    });
  };

  const updateSetting = <K extends keyof SystemSettingsState>(
    key: K,
    value: SystemSettingsState[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950 font-mono text-xs text-zinc-400">
        <Loader2 className="mr-2 h-4 w-4 animate-spin text-cyan-400" />
        INITIALIZING CONTROL PLANE REGISTRY...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-6 font-mono text-xs text-zinc-100 select-none space-y-6">
      {/* HEADER */}
      <header className="flex flex-col justify-between gap-4 border-b border-zinc-800 pb-5 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-cyan-400">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>PLATFORM GOVERNANCE & CONTROL PLANE • {projectId}</span>
          </div>
          <h1 className="mt-1 text-xl font-bold uppercase text-white">
            System Settings &amp; Statutory Calibration
          </h1>
          <p className="mt-0.5 font-sans text-[11px] text-zinc-400">
            {projectName} • Engineering thresholds, statutory boundary parameters, and autonomous agent policies.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={isPending}
          className="flex items-center gap-2 bg-emerald-500 px-5 py-2.5 font-bold uppercase tracking-wider text-zinc-950 transition hover:bg-emerald-400 disabled:opacity-50"
        >
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          <span>{isPending ? "Committing..." : "Save Settings"}</span>
        </button>
      </header>

      {/* FEEDBACK BANNER */}
      {feedback && (
        <div
          className={`flex items-center gap-2 border p-3 ${
            feedback.type === "success"
              ? "border-emerald-800 bg-emerald-950/80 text-emerald-300"
              : "border-rose-800 bg-rose-950/80 text-rose-300"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* NAVIGATION TABS */}
      <nav className="flex flex-wrap gap-2 border-b border-zinc-800 pb-3">
        {[
          { id: "statutory_hse", label: "1. HSE & Engineering Bounds", icon: Shield },
          { id: "commercial_baseline", label: "2. Commercial & Baseline", icon: DollarSign },
          { id: "agent_daemons", label: "3. Agent Governors", icon: Cpu },
          { id: "evidentiary_65b", label: "4. Section 65B Vault", icon: FileCheck },
          { id: "rera_profile", label: "5. RERA & Municipal", icon: Building2 },
          { id: "ground_truth", label: "6. Core & Ground Truth", icon: Radio },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as SettingsTab)}
              className={`flex items-center gap-2 border px-4 py-2 text-[11px] font-bold uppercase transition ${
                active
                  ? "border-cyan-500 bg-cyan-950/50 text-cyan-300"
                  : "border-zinc-800 bg-zinc-900/40 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* TAB CONTENT PANELS */}
      <main className="space-y-6">
        {/* DOMAIN 1: HSE & ENGINEERING BOUNDARIES */}
        {activeTab === "statutory_hse" && (
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
              <div className="flex items-center gap-2 border-b border-zinc-800 pb-2 text-rose-400 font-bold uppercase text-[11px]">
                <Wind className="h-4 w-4" />
                <span>Working At Height &amp; Wind Cutoff (IS 3696 / IS 13367)</span>
              </div>
              <div>
                <label className="text-[10px] text-zinc-400 uppercase">
                  Anemometer Cutoff Velocity (km/h)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={settings.anemometer_cutoff_kmh}
                  onChange={(e) => updateSetting("anemometer_cutoff_kmh", parseFloat(e.target.value) || 0)}
                  className="mt-1 w-full border border-zinc-800 bg-zinc-950 px-3 py-2 text-white outline-none focus:border-rose-500"
                />
                <p className="mt-1 text-[10px] text-zinc-400">
                  Beaufort Force 5 upper gate. Trips height PTW suspension.
                </p>
              </div>
              <div>
                <label className="text-[10px] text-zinc-400 uppercase">
                  Gust Sustain Window (Seconds)
                </label>
                <input
                  type="number"
                  value={settings.anemometer_gust_sustain_sec}
                  onChange={(e) => updateSetting("anemometer_gust_sustain_sec", parseInt(e.target.value, 10) || 0)}
                  className="mt-1 w-full border border-zinc-800 bg-zinc-950 px-3 py-2 text-white outline-none focus:border-rose-500"
                />
              </div>
            </div>

            <div className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
              <div className="flex items-center gap-2 border-b border-zinc-800 pb-2 text-amber-400 font-bold uppercase text-[11px]">
                <Activity className="h-4 w-4" />
                <span>Atmospheric Limits (IS 11972 / BOCW Rule 218)</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-zinc-400 uppercase">Min Oxygen (O₂ % Vol)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={settings.confined_space_o2_min}
                    onChange={(e) => updateSetting("confined_space_o2_min", parseFloat(e.target.value) || 0)}
                    className="mt-1 w-full border border-zinc-800 bg-zinc-950 px-3 py-2 text-white outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-400 uppercase">Max Oxygen (O₂ % Vol)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={settings.confined_space_o2_max}
                    onChange={(e) => updateSetting("confined_space_o2_max", parseFloat(e.target.value) || 0)}
                    className="mt-1 w-full border border-zinc-800 bg-zinc-950 px-3 py-2 text-white outline-none focus:border-amber-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-zinc-400 uppercase">LEL Max (% Flammability)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={settings.confined_space_lel_max}
                    onChange={(e) => updateSetting("confined_space_lel_max", parseFloat(e.target.value) || 0)}
                    className="mt-1 w-full border border-zinc-800 bg-zinc-950 px-3 py-2 text-white outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-400 uppercase">H₂S Max (PPM Toxic Ceiling)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={settings.confined_space_h2s_max_ppm}
                    onChange={(e) => updateSetting("confined_space_h2s_max_ppm", parseFloat(e.target.value) || 0)}
                    className="mt-1 w-full border border-zinc-800 bg-zinc-950 px-3 py-2 text-white outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/40 p-5 md:col-span-2">
              <div className="flex items-center gap-2 border-b border-zinc-800 pb-2 text-cyan-400 font-bold uppercase text-[11px]">
                <Layers className="h-4 w-4" />
                <span>Rebar Nesting &amp; Structural Tolerances (IS 1786 / IS 2502)</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-[10px] text-zinc-400 uppercase">Max Scrap Ceiling (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={settings.rebar_scrap_ceiling_pct}
                    onChange={(e) => updateSetting("rebar_scrap_ceiling_pct", parseFloat(e.target.value) || 0)}
                    className="mt-1 w-full border border-zinc-800 bg-zinc-950 px-3 py-2 text-white outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-400 uppercase">Design Rebar Grade</label>
                  <input
                    type="text"
                    value={settings.default_rebar_grade}
                    onChange={(e) => updateSetting("default_rebar_grade", e.target.value)}
                    className="mt-1 w-full border border-zinc-800 bg-zinc-950 px-3 py-2 text-white outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-400 uppercase">Unit Weight Formula Divisor</label>
                  <input
                    type="number"
                    step="0.1"
                    value={settings.nominal_bar_factor}
                    onChange={(e) => updateSetting("nominal_bar_factor", parseFloat(e.target.value) || 0)}
                    className="mt-1 w-full border border-zinc-800 bg-zinc-950 px-3 py-2 text-white outline-none focus:border-cyan-500"
                  />
                  <p className="mt-1 text-[10px] text-zinc-400">d² / 162.2 kg/m derivation constant</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* DOMAIN 2: COMMERCIAL & CONTRACTUAL BASELINE */}
        {activeTab === "commercial_baseline" && (
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
              <div className="flex items-center gap-2 border-b border-zinc-800 pb-2 text-emerald-400 font-bold uppercase text-[11px]">
                <DollarSign className="h-4 w-4" />
                <span>Commercial Valuation &amp; EVM Baseline</span>
              </div>
              <div>
                <label className="text-[10px] text-zinc-400 uppercase">
                  Sanctioned Budget at Completion / BAC (₹ INR)
                </label>
                <input
                  type="number"
                  value={settings.sanctioned_bac_inr}
                  onChange={(e) => updateSetting("sanctioned_bac_inr", parseFloat(e.target.value) || 0)}
                  className="mt-1 w-full border border-zinc-800 bg-zinc-950 px-3 py-2 text-white outline-none focus:border-emerald-500 font-mono"
                />
                <p className="mt-1 text-[10px] text-zinc-400">
                  Canonical contract baseline. Feeds S-Curve EAC &amp; CPI calculations.
                </p>
              </div>
              <div>
                <label className="text-[10px] text-zinc-400 uppercase">
                  Statutory Retention Deduction (% per RA Bill)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={settings.retention_deduction_pct}
                  onChange={(e) => updateSetting("retention_deduction_pct", parseFloat(e.target.value) || 0)}
                  className="mt-1 w-full border border-zinc-800 bg-zinc-950 px-3 py-2 text-white outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
              <div className="flex items-center gap-2 border-b border-zinc-800 pb-2 text-cyan-400 font-bold uppercase text-[11px]">
                <Lock className="h-4 w-4" />
                <span>Taking-Over Certificate (TOC) &amp; Measurement Book</span>
              </div>
              <div>
                <label className="text-[10px] text-zinc-400 uppercase">
                  Mandatory Snag Clearance Rate for TOC Release (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={settings.toc_snag_threshold_pct}
                  onChange={(e) => updateSetting("toc_snag_threshold_pct", parseFloat(e.target.value) || 0)}
                  className="mt-1 w-full border border-zinc-800 bg-zinc-950 px-3 py-2 text-white outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="text-[10px] text-zinc-400 uppercase">
                  Defects Liability Period / DLP (Calendar Days)
                </label>
                <input
                  type="number"
                  value={settings.defects_liability_days}
                  onChange={(e) => updateSetting("defects_liability_days", parseInt(e.target.value, 10) || 0)}
                  className="mt-1 w-full border border-zinc-800 bg-zinc-950 px-3 py-2 text-white outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="text-[10px] text-zinc-400 uppercase">
                  e-MB Laser Variance Tolerance (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={settings.emb_tolerance_variance_pct}
                  onChange={(e) => updateSetting("emb_tolerance_variance_pct", parseFloat(e.target.value) || 0)}
                  className="mt-1 w-full border border-zinc-800 bg-zinc-950 px-3 py-2 text-white outline-none focus:border-cyan-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* DOMAIN 3: AUTONOMOUS AGENT DAEMONS */}
        {activeTab === "agent_daemons" && (
          <div className="grid gap-6 md:grid-cols-3">
            <div className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
              <div className="flex items-center gap-2 border-b border-zinc-800 pb-2 text-cyan-400 font-bold uppercase text-[11px]">
                <Wind className="h-4 w-4" />
                <span>Argus (Weather Interlock)</span>
              </div>
              <div>
                <label className="text-[10px] text-zinc-400 uppercase">Poll Frequency (Seconds)</label>
                <input
                  type="number"
                  value={settings.argus_sync_interval_sec}
                  onChange={(e) => updateSetting("argus_sync_interval_sec", parseInt(e.target.value, 10) || 0)}
                  className="mt-1 w-full border border-zinc-800 bg-zinc-950 px-3 py-2 text-white outline-none focus:border-cyan-500"
                />
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="text-zinc-300">Auto-Revoke Height PTW</span>
                <input
                  type="checkbox"
                  checked={settings.argus_auto_revoke_ptw}
                  onChange={(e) => updateSetting("argus_auto_revoke_ptw", e.target.checked)}
                  className="h-4 w-4 rounded accent-cyan-500"
                />
              </div>
            </div>

            <div className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
              <div className="flex items-center gap-2 border-b border-zinc-800 pb-2 text-emerald-400 font-bold uppercase text-[11px]">
                <Shield className="h-4 w-4" />
                <span>Aegis (Spatial Safety Lock)</span>
              </div>
              <div>
                <label className="text-[10px] text-zinc-400 uppercase">
                  Crane Exclusion Buffer (Meters)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={settings.aegis_crane_buffer_m}
                  onChange={(e) => updateSetting("aegis_crane_buffer_m", parseFloat(e.target.value) || 0)}
                  className="mt-1 w-full border border-zinc-800 bg-zinc-950 px-3 py-2 text-white outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
              <div className="flex items-center gap-2 border-b border-zinc-800 pb-2 text-amber-400 font-bold uppercase text-[11px]">
                <Cpu className="h-4 w-4" />
                <span>Hermes (Muster Sync)</span>
              </div>
              <div>
                <label className="text-[10px] text-zinc-400 uppercase">Daily Shift Start Cutoff</label>
                <input
                  type="time"
                  value={settings.hermes_shift_start_time}
                  onChange={(e) => updateSetting("hermes_shift_start_time", e.target.value)}
                  className="mt-1 w-full border border-zinc-800 bg-zinc-950 px-3 py-2 text-white outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="text-[10px] text-zinc-400 uppercase">Statutory OT Multiplier</label>
                <input
                  type="number"
                  step="0.1"
                  value={settings.hermes_ot_rate_multiplier}
                  onChange={(e) => updateSetting("hermes_ot_rate_multiplier", parseFloat(e.target.value) || 0)}
                  className="mt-1 w-full border border-zinc-800 bg-zinc-950 px-3 py-2 text-white outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* DOMAIN 4: EVIDENTIARY VAULT & SECTION 65B */}
        {activeTab === "evidentiary_65b" && (
          <div className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
            <div className="flex items-center gap-2 border-b border-zinc-800 pb-2 text-cyan-400 font-bold uppercase text-[11px]">
              <FileCheck className="h-4 w-4" />
              <span>Section 65B Indian Evidence Act / BSA 2023 Cryptographic Seal</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] text-zinc-400 uppercase">Merkle Tree Batch Cadence</label>
                <select
                  value={settings.merkle_batch_interval}
                  onChange={(e) => updateSetting("merkle_batch_interval", e.target.value)}
                  className="mt-1 w-full border border-zinc-800 bg-zinc-950 px-3 py-2 text-white outline-none focus:border-cyan-500"
                >
                  <option value="REALTIME_POUR">Realtime Commit (Each Inspection)</option>
                  <option value="DAILY_SHIFT_END">End-of-Shift Daily Batch (Hermes Seal)</option>
                  <option value="WEEKLY_CONSOLIDATED">Weekly Milestone Consolidate</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-zinc-400 uppercase">Hash Standard</label>
                <input
                  type="text"
                  disabled
                  value={settings.hash_algorithm}
                  className="mt-1 w-full border border-zinc-800 bg-zinc-900 px-3 py-2 text-zinc-400 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="text-[10px] text-zinc-400 uppercase">Certifying Authority Title</label>
                <input
                  type="text"
                  value={settings.certifying_authority_name}
                  onChange={(e) => updateSetting("certifying_authority_name", e.target.value)}
                  className="mt-1 w-full border border-zinc-800 bg-zinc-950 px-3 py-2 text-white outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="text-[10px] text-zinc-400 uppercase">Legal Custody Designation</label>
                <input
                  type="text"
                  value={settings.certifying_authority_designation}
                  onChange={(e) => updateSetting("certifying_authority_designation", e.target.value)}
                  className="mt-1 w-full border border-zinc-800 bg-zinc-950 px-3 py-2 text-white outline-none focus:border-cyan-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* DOMAIN 5: RERA PROFILE */}
        {activeTab === "rera_profile" && (
          <div className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
            <div className="flex items-center gap-2 border-b border-zinc-800 pb-2 text-emerald-400 font-bold uppercase text-[11px]">
              <Building2 className="h-4 w-4" />
              <span>RERA Statutory Profile &amp; Local Jurisdiction</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-[10px] text-zinc-400 uppercase">RERA Registration Reference</label>
                <input
                  type="text"
                  placeholder="e.g. UPRERAPRJ123456"
                  value={settings.rera_registration_no}
                  onChange={(e) => updateSetting("rera_registration_no", e.target.value)}
                  className="mt-1 w-full border border-zinc-800 bg-zinc-950 px-3 py-2 text-white outline-none focus:border-emerald-500 font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] text-zinc-400 uppercase">State Authority</label>
                <input
                  type="text"
                  value={settings.rera_jurisdiction}
                  onChange={(e) => updateSetting("rera_jurisdiction", e.target.value)}
                  className="mt-1 w-full border border-zinc-800 bg-zinc-950 px-3 py-2 text-white outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="text-[10px] text-zinc-400 uppercase">Municipal Clearinghouse</label>
                <input
                  type="text"
                  value={settings.local_municipal_authority}
                  onChange={(e) => updateSetting("local_municipal_authority", e.target.value)}
                  className="mt-1 w-full border border-zinc-800 bg-zinc-950 px-3 py-2 text-white outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* DOMAIN 6: GROUND TRUTH ENFORCER */}
        {activeTab === "ground_truth" && (
          <div className="space-y-4 rounded-xl border border-rose-950/60 bg-zinc-900/40 p-6">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div>
                <div className="flex items-center gap-2 text-rose-400 font-bold uppercase text-[11px]">
                  <Radio className="h-4 w-4 animate-pulse" />
                  <span>Strict Ground Truth Enforcement</span>
                </div>
                <p className="mt-1 text-zinc-400 font-sans text-xs">
                  Prohibits demonstration fallbacks across all dashboards. Requires zero-state rendering for unseeded telemetry.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.strict_ground_truth_mode}
                  onChange={(e) => updateSetting("strict_ground_truth_mode", e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
            </div>
            <div className="rounded border border-zinc-800 bg-zinc-950 p-4 font-mono text-[11px] text-zinc-400 space-y-2">
              <div className="flex justify-between">
                <span>Production Lockdown:</span>
                <span className={settings.strict_ground_truth_mode ? "text-emerald-400 font-bold" : "text-amber-400"}>
                  {settings.strict_ground_truth_mode ? "ENFORCED (ZERO MOCKS)" : "PERMISSIVE (DEMO FALLBACKS ALLOWED)"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Active Scope Project:</span>
                <span className="text-zinc-200">{projectId}</span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
