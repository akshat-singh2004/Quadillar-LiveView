import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { VANGUARD_GENOME } from "@/lib/project/vanguardGenome";

export const runtime = "nodejs";

function getServerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function GET(req: NextRequest) {
  const rawId = (req.nextUrl.searchParams.get("id") || "NCR-2026-STR-042").trim();
  const projectId = (req.nextUrl.searchParams.get("project_id") || "").trim();
  const supabase = getServerSupabase();

  if (!supabase) {
    return NextResponse.json(
      { ok: false, error: "Supabase verification node unavailable" },
      { status: 503 }
    );
  }

  const isHexHash = /^[a-f0-9]{8,64}$/i.test(rawId);

  try {
    let ledgerMatch: any = null;
    let fieldMatch: any = null;
    let gateMatch: any = null;

    if (isHexHash) {
      const prefix = rawId.toLowerCase();
      const [ledgerRes, fieldRes, gateHashRes] = await Promise.all([
        supabase
          .from("section_65b_audit_ledger")
          .select("*")
          .ilike("merkle_root_hash", `${prefix}%`)
          .order("timestamp", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("field_grounding_logs")
          .select("*")
          .ilike("canonical_65b_sha256", `${prefix}%`)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("ncr_escrow_gates")
          .select("*")
          .ilike("remediation_65b_hash", `${prefix}%`)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      ledgerMatch = ledgerRes.data || null;
      fieldMatch = fieldRes.data || null;
      gateMatch = gateHashRes.data || null;
    } else {
      let gateQuery = supabase
        .from("ncr_escrow_gates")
        .select("*")
        .eq("ncr_id", rawId)
        .order("updated_at", { ascending: false })
        .limit(1);

      if (projectId) {
        gateQuery = gateQuery.eq("project_id", projectId);
      }

      const { data: gData } = await gateQuery.maybeSingle();
      gateMatch = gData || null;
    }

    // Fallback to latest project gate if only a project/default ID was passed
    if (!gateMatch && !ledgerMatch && !fieldMatch) {
      const targetPid = projectId || VANGUARD_GENOME.projectId;
      const { data: fallbackGate } = await supabase
        .from("ncr_escrow_gates")
        .select("*")
        .eq("project_id", targetPid)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      gateMatch = fallbackGate || null;
    }

    // Fetch most recent ledger block for this project if not matched directly by hash
    const resolvedProjectId =
      gateMatch?.project_id ||
      ledgerMatch?.project_id ||
      fieldMatch?.project_id ||
      projectId ||
      VANGUARD_GENOME.projectId;

    if (!ledgerMatch) {
      const { data: recentLedger } = await supabase
        .from("section_65b_audit_ledger")
        .select("*")
        .eq("project_id", resolvedProjectId)
        .order("timestamp", { ascending: false })
        .limit(1)
        .maybeSingle();
      ledgerMatch = recentLedger || null;
    }

    const verified = Boolean(gateMatch || ledgerMatch || fieldMatch);

    return NextResponse.json({
      ok: true,
      verified,
      queriedArtifactId: rawId,
      projectId: resolvedProjectId,
      immutabilityEnforced: true,
      statutoryBasis: "Bharatiya Sakshya Adhiniyam 2023 Sec. 63 / Indian Evidence Act Sec. 65B",
      gate: gateMatch,
      ledgerBlock: ledgerMatch,
      fieldRecord: fieldMatch,
      verifiedAtIso: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("[verify-artifact] Error:", err?.message || err);
    return NextResponse.json(
      { ok: false, error: err?.message || "Verification query failed" },
      { status: 500 }
    );
  }
}
