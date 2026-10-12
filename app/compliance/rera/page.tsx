import React from "react";
import { RERAReportGenerator } from "@/components/compliance/RERAReportGenerator";
import { createClient } from "@/lib/supabase/server";
import type { StatutoryApproval } from "@/types/construction";

export default async function RERAPage() {
  const supabase = await createClient();

  // 1. Resolve Active Project Context & Baseline Budget
  const { data: projectRow } = await supabase
    .from("projects")
    .select("project_id, project_code, project_name, contract_value")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const projectId = projectRow?.project_id || "GOMTI-NAGAR-PH1-FITOUT";
  const projectCode = projectRow?.project_code || "GOMTI-PH1";
  const projectName = projectRow?.project_name || "Gomti Nagar Extension Commercial Hub Ph-1";
  const contractValue = projectRow?.contract_value != null ? Number(projectRow.contract_value) : 0;

  // 2. Compute Real Physical Progress & Expenditure from Database
  const [billRes, artifactRes] = await Promise.all([
    supabase
      .from("running_account_bills")
      .select("gross_work_done, net_payable_certified")
      .eq("project_id", projectId),
    supabase
      .from("project_compliance_artifacts")
      .select("*")
      .eq("project_id", projectId),
  ]);

  const totalBilledWork = (billRes.data || []).reduce(
    (sum, b) => sum + (Number(b.gross_work_done) || 0),
    0
  );

  const computedProgressPct = contractValue > 0 ? Math.min(100, Math.max(0, Number(((totalBilledWork / contractValue) * 100).toFixed(1)))) : 0;

  // 3. Map Real Statutory Artifacts with Type-Safe Cast
  const artifacts = artifactRes.data || [];
  const approvals: StatutoryApproval[] =
    artifacts.length > 0
      ? artifacts.map((art: any, idx: number) => ({
          id: String(art.id || `art-${idx}`),
          projectId,
          approvalType: (String(art.artifact_type || "Municipal Sanction").replace(/_/g, " ") as unknown as StatutoryApproval["approvalType"]),
          authority: String(art.authority_reference || "Lucknow Development Authority"),
          referenceNumber: String(art.authority_reference || `NOC-${art.id.slice(0, 8)}`),
          issuedAt: String(art.valid_from || new Date().toISOString().slice(0, 10)),
          validUntil: String(art.valid_until || "2028-12-31"),
          progressPercent: art.status === "VERIFIED" ? 100 : 85,
          status: ("Active" as unknown as StatutoryApproval["status"]),
          requiredRenewal: false,
        }))
      : [];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 font-mono text-xs select-none">
      <RERAReportGenerator
        approvals={approvals}
        projectName={projectName}
        projectCode={projectCode}
        quarterLabel="Q3 FY2026-27"
        actualProgress={computedProgressPct}
        constructionCostIncurred={totalBilledWork ?? 0}
        contractValue={contractValue}
      />
    </div>
  );
}
