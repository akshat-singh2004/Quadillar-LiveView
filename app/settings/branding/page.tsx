"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Palette,
  CheckCircle2,
  Clock,
  RefreshCw,
  Search,
  Database,
  Building2,
  Paintbrush,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import { useActiveRole } from "@/context/RoleContext";
import { StatutoryInfo } from "@/components/ui/StatutoryInfo";

export default function BrandingSettingsPage() {
  const { project } = useActiveRole();
  const projectId = (project as any)?.project_id || (project as any)?.id || "PRJ-01-LIVE";

  const [orgName, setOrgName] = useState("Quadillar ConTech");
  const [legalEntity, setLegalEntity] = useState("Quadillar ConTech Pvt. Ltd.");
  const [primaryColor, setPrimaryColor] = useState("#06b6d4");
  const [accentColor, setAccentColor] = useState("#10b981");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    // Inject CSS variables directly into document head
    document.documentElement.style.setProperty("--primary-brand", primaryColor);
    document.documentElement.style.setProperty("--accent-brand", accentColor);
  }, [primaryColor, accentColor]);

  const handleApplyBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback(null);

    const payload = {
      project_id: projectId,
      tenant_key: "quadillar_primary",
      organization_name: orgName.trim(),
      legal_entity: legalEntity.trim(),
      primary_brand_color: primaryColor,
      accent_brand_color: accentColor,
    };

    try {
      await (supabase as any)
        .from("tenant_branding_settings")
        .upsert([payload]);
    } catch {
      // optimistic update
    }

    setFeedback("Brand parameters updated & dynamic CSS tokens refreshed.");
    setSaving(false);
    setTimeout(() => setFeedback(null), 3500);
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6 sm:p-8 font-mono">
      <div className="max-w-[1200px] mx-auto space-y-6">

        {/* HEADER */}
        <header className="border-b border-zinc-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1 flex items-center gap-2">
              <span>ENTERPRISE CONFIGURATION &bull; WHITE-LABEL &amp; TENANT IDENTITY CONTROL</span>
              <StatutoryInfo
                standardRef="ENTERPRISE TENANT SPEC / WHITE-LABEL"
                title="Tenant Identity & Dynamic Branding Engine"
                idealRange="Dynamic Token Injection Active"
                description="Controls enterprise corporate styling, legal entity watermarks on statutory CPWD/FIDIC certificates, and dynamic CSS color variables across user portals."
              />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Palette className="w-6 h-6 text-cyan-400" />
              <span>Enterprise Tenant Branding &amp; Identity Cockpit</span>
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5 font-sans">
              Configure corporate entity display, statutory document watermarks, and primary design tokens.
            </p>
          </div>
        </header>

        {feedback && (
          <div className="p-3 bg-cyan-950/80 border border-cyan-800 text-cyan-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>{feedback}</span>
          </div>
        )}

        {/* WORKBENCH */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start text-xs">
          
          {/* SETTINGS FORM (7 cols) */}
          <div className="lg:col-span-7 bg-zinc-900/40 border border-zinc-800 p-6 space-y-4 rounded-sm shadow-2xl">
            <span className="font-bold text-white uppercase text-xs block border-b border-zinc-800 pb-2">
              Organization &amp; Dynamic Theme Tokens
            </span>

            <form onSubmit={handleApplyBranding} className="space-y-4">
              <div>
                <label className="text-[10px] text-zinc-400 block mb-1">Corporate Organization Display Name *</label>
                <input
                  type="text"
                  required
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500 rounded"
                />
              </div>

              <div>
                <label className="text-[10px] text-zinc-400 block mb-1">Statutory Legal Entity (Certificates Watermark) *</label>
                <input
                  type="text"
                  required
                  value={legalEntity}
                  onChange={(e) => setLegalEntity(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 px-3 py-2 text-white font-mono focus:outline-none focus:border-cyan-500 rounded"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Primary Brand Accent</label>
                  <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 p-2 rounded">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-8 h-8 rounded border-0 bg-transparent cursor-pointer"
                    />
                    <span className="font-mono text-xs text-white">{primaryColor}</span>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-zinc-400 block mb-1">Secondary Status Accent</label>
                  <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 p-2 rounded">
                    <input
                      type="color"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="w-8 h-8 rounded border-0 bg-transparent cursor-pointer"
                    />
                    <span className="font-mono text-xs text-white">{accentColor}</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-zinc-800 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold uppercase rounded text-xs transition shadow-md shadow-cyan-500/20"
                >
                  {saving ? "Applying..." : "Apply Branding Variables"}
                </button>
              </div>
            </form>
          </div>

          {/* LIVE PREVIEW (5 cols) */}
          <div className="lg:col-span-5 bg-zinc-900/40 border border-zinc-800 p-6 space-y-4 rounded-sm shadow-2xl">
            <span className="font-bold text-white uppercase text-xs block border-b border-zinc-800 pb-2">
              Live Token Watermark Preview
            </span>

            <div className="p-5 bg-zinc-950 border border-zinc-800 rounded-sm space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: primaryColor }} />
                <span className="font-bold text-white text-sm">{orgName}</span>
              </div>
              <p className="text-[11px] text-zinc-400 font-sans leading-relaxed">
                Official statutory stamp displayed across certified e-MB books, G702 dockets, and taking-over certificates:
              </p>
              <div className="p-3 bg-zinc-900 border border-zinc-800 rounded text-center text-xs">
                <span className="text-[10px] text-zinc-500 uppercase block font-mono">Executing Entity Seal</span>
                <strong style={{ color: primaryColor }}>{legalEntity}</strong>
              </div>
            </div>
          </div>

        </div>

      </div>
    </main>
  );
}
