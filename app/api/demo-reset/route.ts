import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { VANGUARD_GENOME } from "@/lib/project/vanguardGenome";

export const runtime = "nodejs";

function getServerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function POST(req: Request) {
  const secret = process.env.ADMIN_SEED_TOKEN;
  const authorized = secret
    ? req.headers.get("authorization") === `Bearer ${secret}`
    : req.headers.get("x-quadillar-reset") === "confirm";
  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized demo reset request" }, { status: 401 });
  }
  const now = new Date().toISOString();
  const supabase = getServerSupabase();

  if (supabase) {
    try {
      await supabase.from("field_grounding_logs").delete().neq("id", "__keep_none__");
      await supabase.from("ncr_escrow_gates").upsert(
        {
          ncr_id: "NCR-2026-STR-042",
          project_id: VANGUARD_GENOME.projectId,
          bim_zone_id: "BIT-4-TG03",
          bit_id: "BIT-4",
          structural_element: "Tower A / BIT-4 – Level 3 Transfer Girder (M50)",
          concrete_grade: "M50",
          is_code_clause: "IS 456:2000 Cl. 17.4.3",
          gate_status: "LOCKED",
          withholding_lien_inr: 450000,
          blocking_reason:
            "28-day concrete cube compressive strength 41.2 MPa (< 46.0 MPa IS 456 acceptance) + post-deshuttering honeycombing on Transfer Girder TG-03.",
          core_readings_mpa: null,
          verified_mean_mpa: null,
          lab_certificate_ref: null,
          remediation_65b_hash: null,
          updated_at: now,
        },
        { onConflict: "ncr_id" }
      );
    } catch {}
  }

  return NextResponse.json({ ok: true, reset_at: now });
}
