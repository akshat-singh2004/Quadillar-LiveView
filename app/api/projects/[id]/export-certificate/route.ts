import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params;

  const [projectRes, ledgerRes] = await Promise.all([
    supabase.from('projects').select('*').eq('project_id', projectId).single(),
    supabase.from('hermes_audit_ledger').select('*').eq('project_id', projectId).order('sequence_index', { ascending: true })
  ]);

  const project = projectRes.data;
  const ledger = ledgerRes.data || [];

  if (!project) {
    return new NextResponse('Project not found', { status: 404 });
  }

  const terminalRoot = ledger[ledger.length - 1]?.merkle_node_hash || 'UNSEALED';
  const genesisRoot = ledger[0]?.prev_deed_hash || 'GENESIS';

  const certificateText = `================================================================================
  CERTIFICATE OF ELECTRONIC EVIDENCE UNDER SECTION 63 OF THE BHARATIYA SAKSHYA
  ADHINIYAM, 2023 (CORRESPONDING TO SECTION 65B OF THE INDIAN EVIDENCE ACT, 1872)
================================================================================

1. IDENTIFICATION OF ELECTRONIC RECORD:
   - Project Identifier : ${project.project_id}
   - Project Name       : ${project.project_name}
   - Sanctioned Value   : INR ${Number(project.contract_value).toLocaleString('en-IN')}
   - Primary Principal  : ${project.client_entity_name}
   - Lead Contractor    : ${project.contractor_entity_name}

2. SYSTEM REPUTATION & INTEGRITY:
   Records were generated, stored, and verified in the ordinary course of operations
   by Quadillar LiveView telemetry engines with Row-Level Security and pg_advisory_xact_lock
   concurrency isolation. Current status: ${project.status}.

3. CRYPTOGRAPHIC PROOF CHAIN:
   - Total Chained Nodes : ${ledger.length}
   - Genesis Anchor      : ${genesisRoot}
   - Terminal Merkle Root: ${terminalRoot}

Issued by Quadillar ConTech Pvt. Ltd.
Attestation Date: ${new Date().toISOString()}
================================================================================`;

  return new NextResponse(certificateText, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': `attachment; filename="SECTION_63_BSA_${projectId}.txt"`
    }
  });
}
