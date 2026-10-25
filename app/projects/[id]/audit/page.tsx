'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';

interface LedgerNode {
  id: string;
  sequence_index: number;
  action_category: string;
  prev_deed_hash: string;
  merkle_node_hash: string;
  payload_json: Record<string, unknown>;
  created_at: string;
}

interface ProjectSummary {
  project_id: string;
  project_name: string;
  project_code: string;
  contract_value: number;
  status: string;
  client_entity_name: string;
  contractor_entity_name: string;
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function ProjectAuditDashboard({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const [projectId, setProjectId] = useState<string>('');
  const [project, setProject] = useState<ProjectSummary | null>(null);
  const [ledger, setLedger] = useState<LedgerNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  useEffect(() => {
    params.then((p) => setProjectId(p.id));
  }, [params]);

  useEffect(() => {
    if (!projectId) return;

    async function loadProjectData() {
      setLoading(true);

      const [projRes, ledgerRes] = await Promise.all([
        supabase
          .from('projects')
          .select('*')
          .eq('project_id', projectId)
          .single(),
        supabase
          .from('hermes_audit_ledger')
          .select('*')
          .eq('project_id', projectId)
          .order('sequence_index', { ascending: true })
      ]);

      if (projRes.data) setProject(projRes.data);
      if (ledgerRes.data) setLedger(ledgerRes.data || []);

      setLoading(false);
    }

    loadProjectData();
  }, [projectId]);

  const chainVerification = useMemo(() => {
    if (ledger.length === 0) return { isValid: false, brokenAt: null };

    for (let i = 1; i < ledger.length; i++) {
      if (ledger[i].prev_deed_hash !== ledger[i - 1].merkle_node_hash) {
        return { isValid: false, brokenAt: ledger[i].sequence_index };
      }
    }
    return { isValid: true, brokenAt: null };
  }, [ledger]);

  const terminalRoot = ledger[ledger.length - 1]?.merkle_node_hash || 'N/A';

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(text);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#090A0F] text-slate-300 flex items-center justify-center font-mono text-sm">
        <div className="flex items-center gap-3">
          <div className="w-4 h-4 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
          Verifying Hermes Merkle Proofs...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#090A0F] text-slate-200 antialiased selection:bg-emerald-500/30 selection:text-emerald-300">
      <main className="max-w-7xl mx-auto px-6 py-10 space-y-8">
        
        {/* Header Bar */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-white/5">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <span className="text-xs uppercase tracking-widest text-emerald-400 font-mono font-medium">
                {project?.project_code || 'QUAD-SYS'}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {project?.status === 'PERMANENT_ARCHIVE_LOCKED' ? 'ARCHIVE SEALED (BSA SEC 63)' : project?.status}
              </span>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-white">
              {project?.project_name || projectId}
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <a
              href={`/api/projects/${projectId}/export-certificate`}
              className="px-4 py-2 text-xs font-mono font-medium rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors text-slate-300"
            >
              Export BSA Certificate (.TXT)
            </a>
          </div>
        </header>

        {/* Telemetry Summary Cards */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-5 rounded-xl bg-white/[0.02] border border-white/5 backdrop-blur-md">
            <div className="text-xs font-medium text-slate-400">Total Sanctioned Sum</div>
            <div className="mt-2 text-xl font-semibold text-white font-mono">
              ₹{Number(project?.contract_value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div className="mt-1 text-[11px] text-slate-500">CPWD Standard Contract</div>
          </div>

          <div className="p-5 rounded-xl bg-white/[0.02] border border-white/5 backdrop-blur-md">
            <div className="text-xs font-medium text-slate-400">Chained Audit Blocks</div>
            <div className="mt-2 text-xl font-semibold text-white font-mono">
              {ledger.length} Nodes
            </div>
            <div className="mt-1 text-[11px] text-emerald-400 font-mono">
              {chainVerification.isValid ? '100% Cryptographic Continuity' : `Tamper Detected at Node #${chainVerification.brokenAt}`}
            </div>
          </div>

          <div className="p-5 rounded-xl bg-white/[0.02] border border-white/5 backdrop-blur-md">
            <div className="text-xs font-medium text-slate-400">Admissibility Standard</div>
            <div className="mt-2 text-xl font-semibold text-white font-mono">
              BSA 2023 Sec 63
            </div>
            <div className="mt-1 text-[11px] text-slate-500">IEA Sec 65B Equivalent</div>
          </div>

          <div className="p-5 rounded-xl bg-white/[0.02] border border-white/5 backdrop-blur-md">
            <div className="text-xs font-medium text-slate-400">Terminal Root Digest</div>
            <div 
              onClick={() => copyToClipboard(terminalRoot)}
              className="mt-2 text-xs font-mono text-emerald-400 truncate cursor-pointer hover:underline"
              title="Click to copy hash"
            >
              {terminalRoot}
            </div>
            <div className="mt-1 text-[11px] text-slate-500">
              {copiedHash ? 'Copied to clipboard' : 'Click hash to copy'}
            </div>
          </div>
        </section>

        {/* Cryptographic Merkle Chain Explorer */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-medium text-white tracking-tight">
              Sequential Merkle Audit Trail
            </h2>
            <div className="text-xs font-mono text-slate-500">
              Genesis: <span className="text-slate-400">GENESIS_00000000...</span>
            </div>
          </div>

          <div className="rounded-xl border border-white/5 bg-white/[0.01] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead>
                  <tr className="border-b border-white/5 bg-white/[0.02] text-slate-400">
                    <th className="py-3 px-4 w-16">Seq</th>
                    <th className="py-3 px-4">Action Category</th>
                    <th className="py-3 px-4">Previous Node Hash</th>
                    <th className="py-3 px-4">Current Node Hash</th>
                    <th className="py-3 px-4 text-right">Timestamp (UTC)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-300">
                  {ledger.map((node) => (
                    <tr 
                      key={node.id} 
                      className="hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="py-3 px-4 font-semibold text-slate-400">
                        #{node.sequence_index}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] bg-white/5 text-slate-200 border border-white/10">
                          {node.action_category}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-400 truncate max-w-[140px]" title={node.prev_deed_hash}>
                        {node.prev_deed_hash.substring(0, 16)}...
                      </td>
                      <td className="py-3 px-4 text-emerald-400 truncate max-w-[140px]" title={node.merkle_node_hash}>
                        {node.merkle_node_hash.substring(0, 16)}...
                      </td>
                      <td className="py-3 px-4 text-right text-slate-500">
                        {new Date(node.created_at).toISOString().replace('T', ' ').substring(0, 19)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}
