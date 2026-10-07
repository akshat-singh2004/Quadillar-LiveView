'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  Compass,
  Layers,
  FileCheck2,
  RefreshCw,
  Plus,
  Send,
  ExternalLink,
  CheckCircle2,
  Building2,
} from 'lucide-react';
import { supabase } from '@/app/lib/supabase';
import { useActiveRole } from '@/context/RoleContext';
import { StatutoryInfo } from '@/components/ui/StatutoryInfo';

export interface Transmittal {
  id: string;
  transmittal_number: string;
  subject: string;
  sender_organization: string;
  recipient_organization: string;
  purpose_of_issue: 'FOR_CONSTRUCTION' | 'FOR_INFORMATION' | 'FOR_REVIEW' | 'AS_BUILT';
  transmitted_date: string;
  acknowledgement_status: 'SENT_PENDING_ACK' | 'ACKNOWLEDGED_RECEIVED';
}

export default function DrawingsMasterPage() {
  const { project } = useActiveRole();
  const activeProjectId = (project as any)?.project_id || (project as any)?.id || "GOMTI-NAGAR-PH1-FITOUT";
  const projectName = (project as any)?.project_name || (project as any)?.name || 'Active Contract';

  const [transmittals, setTransmittals] = useState<Transmittal[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from('drawing_transmittals')
        .select('*')
        .eq('project_id', activeProjectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTransmittals(data || []);
    } catch (err: any) {
      console.error('Failed to load transmittals:', err);
    } finally {
      setLoading(false);
    }
  }, [activeProjectId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6 sm:p-8 font-mono">
      <div className="max-w-[1650px] mx-auto space-y-6">

        {/* HEADER BAR */}
        <header className="border-b border-zinc-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-1 flex items-center">
              COMMON DATA ENVIRONMENT (CDE) • ISO 19650-2 TRANSMITTAL LOG
              <StatutoryInfo
                standardRef="ISO 19650-2 / DIN 1356"
                title="Electronic Document Transmittals"
                idealRange="Status: A1 For Construction"
                description="Governs the legally binding distribution of drawings and specifications between Architect, SEOR, and General Contractor. All site execution must reference acknowledged transmittals."
              />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Compass className="w-6 h-6 text-cyan-400" />
              <span>GFC Drawing Register &amp; Transmittal Log</span>
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5 font-sans">
              Scope: <strong className="text-zinc-200">{projectName}</strong> • ISO 19650 document distribution, statutory revision control, and spatial blueprint canvas gateway.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => void loadData()}
              className="p-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <Link
              href="/drawings/gfc-canvas"
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs uppercase rounded transition flex items-center gap-1.5"
            >
              <Layers className="w-4 h-4" />
              <span>Open Spatial Floor Canvas</span>
            </Link>
          </div>
        </header>

        {/* 3 SUMMARY METRIC TILES */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="bg-zinc-900/60 border border-zinc-800 p-4">
            <span className="text-[10px] text-zinc-500 uppercase block">Registered Transmittals</span>
            <div className="text-2xl font-bold text-white mt-1">{transmittals.length} Transmittals</div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Electronic CDE log</span>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4">
            <span className="text-[10px] text-zinc-500 uppercase block">GFC Construction Releases</span>
            <div className="text-2xl font-bold text-emerald-400 mt-1">
              {transmittals.filter((t) => t.purpose_of_issue === 'FOR_CONSTRUCTION').length} Releases
            </div>
            <span className="text-[10px] text-zinc-500 mt-1 block">Approved for field execution</span>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 p-4">
            <span className="text-[10px] text-zinc-500 uppercase block">CDE Standard</span>
            <div className="text-2xl font-bold text-cyan-400 mt-1">ISO 19650-2</div>
            <span className="text-[10px] text-zinc-500 mt-1 block">BIM Container Governance</span>
          </div>
        </div>

        {/* TRANSMITTALS TABLE */}
        <div className="bg-zinc-900/40 border border-zinc-800 p-5 space-y-4">
          <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
            <span className="text-white font-bold text-xs uppercase block">
              Official Document Transmittal History ({transmittals.length})
            </span>
          </div>

          {transmittals.length === 0 ? (
            <div className="p-12 text-center border border-zinc-850 bg-zinc-950 text-xs text-zinc-500">
              Zero document transmittals on record.
            </div>
          ) : (
            <div className="overflow-x-auto border border-zinc-800 text-xs">
              <table className="w-full text-left">
                <thead className="bg-zinc-950 border-b border-zinc-800 text-[10px] text-zinc-400 uppercase">
                  <tr>
                    <th className="p-3">Transmittal No</th>
                    <th className="p-3">Subject / Document Scope</th>
                    <th className="p-3">Issuing Agency</th>
                    <th className="p-3">Recipient</th>
                    <th className="p-3 text-center">Purpose of Issue</th>
                    <th className="p-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 bg-zinc-950/40">
                  {transmittals.map((t) => (
                    <tr key={t.id} className="hover:bg-zinc-900/50 transition">
                      <td className="p-3 font-bold text-cyan-400">{t.transmittal_number}</td>
                      <td className="p-3 text-zinc-200 font-sans font-medium">{t.subject}</td>
                      <td className="p-3 text-zinc-400">{t.sender_organization}</td>
                      <td className="p-3 text-zinc-400">{t.recipient_organization}</td>
                      <td className="p-3 text-center">
                        <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-zinc-800 text-zinc-300">
                          {t.purpose_of_issue.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-emerald-950 text-emerald-400 border border-emerald-800">
                          {t.acknowledgement_status.replace(/_/g, ' ')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </main>
  );
}
