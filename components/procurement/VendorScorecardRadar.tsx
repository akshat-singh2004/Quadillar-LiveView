"use client";

import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Tooltip } from "recharts";
import type { VendorScorecard } from "@/types/construction";

export function vendorCompositeScore(vendor: VendorScorecard) {
  return vendor.safety * 0.25 + vendor.quality * 0.35 + vendor.scheduleAdherence * 0.25 + vendor.commercialCooperation * 0.15;
}

export function vendorCategory(score: number) {
  if (score >= 85) return { label: "Tier 1 (Preferred)", color: "#34d399" };
  if (score >= 70) return { label: "Satisfactory", color: "#60a5fa" };
  if (score >= 50) return { label: "Under Observation", color: "#fbbf24" };
  return { label: "Blacklisted / Hold Payments", color: "#f87171" };
}

export function VendorScorecardRadar({ vendor }: { vendor: VendorScorecard }) {
  const data = [
    { subject: "Safety", score: vendor.safety },
    { subject: "Quality", score: vendor.quality },
    { subject: "Schedule", score: vendor.scheduleAdherence },
    { subject: "Commercial", score: vendor.commercialCooperation },
  ];
  return <div style={{ width: "100%", height: 250 }}><ResponsiveContainer><RadarChart data={data} cx="50%" cy="50%" outerRadius="70%"><PolarGrid stroke="rgba(148,163,184,0.25)" /><PolarAngleAxis dataKey="subject" tick={{ fill: "#cbd5e1", fontSize: 11 }} /><PolarRadiusAxis domain={[0, 100]} tick={{ fill: "#94a3b8", fontSize: 10 }} /><Radar dataKey="score" stroke="#67e8f9" fill="#22d3ee" fillOpacity={0.2} strokeWidth={2} /><Tooltip contentStyle={{ background: "#0f172a", border: "1px solid rgba(148,163,184,0.25)", borderRadius: 10, color: "#f8fafc" }} /></RadarChart></ResponsiveContainer></div>;
}
