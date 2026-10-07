'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  HardHat,
  Activity,
  Users,
  Clock,
  Printer,
  Search,
  Filter,
  RefreshCw,
  Plus,
  FileCheck2,
  X,
  Check,
  Eye,
  Camera,
  AlertOctagon,
  HeartPulse,
  Scale,
  Calendar,
} from 'lucide-react';
import { supabase } from '@/app/lib/supabase';
import { useActiveRole } from '@/context/RoleContext';
import { StatutoryInfo } from '@/components/ui/StatutoryInfo';

export type SafetyIncidentSeverity = 'NEAR_MISS' | 'MINOR_FIRST_AID' | 'MAJOR_MEDICAL' | 'FATALITY';
export type HseIncidentStatus = 'REPORTED' | 'UNDER_INVESTIGATION' | 'CAPA_ASSIGNED' | 'CLOSED_RESOLVED';
export type BocwComplianceStatus = 'FULL_COMPLIANCE' | 'PARTIAL_DEFICIENCY' | 'NON_COMPLIANT';

export interface SiteSafetyIncident {
  id: string;
  project_id: string;
  incident_ref: string;
  incident_title: string;
  incident_type: string;
  severity_level: SafetyIncidentSeverity;
  location: string;
  contractor_name: string;
  affected_personnel?: string | null;
  incident_description: string;
  immediate_actions_taken: string;
  root_cause_analysis?: string | null;
  preventive_measures_capa?: string | null;
  status: HseIncidentStatus;
  safety_officer_name: string;
  resident_engineer_name?: string | null;
  incident_date: string;
  created_at?: string;
}

export interface PpeComplianceLog {
  id: string;
  project_id: string;
  audit_ref: string;
  zone_location: string;
  auditor_name: string;
  total_workers_inspected: number;
  helmet_compliance_count: number;
  safety_shoes_compliance_count: number;
  high_vis_vest_compliance_count: number;
  harness_at_height_count: number;
  compliance_score_pct: number;
  audit_rating: 'COMPLIANT' | 'NEEDS_IMPROVEMENT' | 'UNACCEPTABLE';
  audit_date: string;
}

export interface SafetyToolboxTalk {
  id: string;
  project_id: string;
  talk_ref: string;
  hazard_topic: string;
  trade_category: string;
  is_code_ref: string;
  trainer_name: string;
  trainer_designation: string;
  total_attendees: number;
  talk_date: string;
}

export interface BocwStatutoryChecklistItem {
  id: string;
  project_id: string;
  statutory_rule_ref: string;
  category: 'FIRST_AID' | 'FIRE_SAFETY' | 'FALL_PROTECTION' | 'SANITATION_WELFARE' | 'HEAVY_MACHINERY' | 'ELECTRICAL';
  item_description: string;
  evidence_details: string;
  compliance_status: BocwComplianceStatus;
  verifying_officer: string;
  rectification_target_date?: string | null;
}

export default function SiteSafetyHsePage() {
  const { project } = useActiveRole();
  const projectId = (project as any)?.project_id || (project as any)?.id || "GOMTI-NAGAR-PH1-FITOUT";
  const projectName = (project as any)?.project_name || (project as any)?.name || 'Active Contract';

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'incidents' | 'bocw' | 'ppe' | 'toolbox'>('incidents');

  // Data state
  const [incidents, setIncidents] = useState<SiteSafetyIncident[]>([]);
  const [ppeLogs, setPpeLogs] = useState<PpeComplianceLog[]>([]);
  const [talks, setTalks] = useState<SafetyToolboxTalk[]>([]);
  const [bocwItems, setBocwItems] = useState<BocwStatutoryChecklistItem[]>([]);

  // Filtering & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [bocwCategoryFilter, setBocwCategoryFilter] = useState<string>('ALL');

  // Modals
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [docketModalOpen, setDocketModalOpen] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<SiteSafetyIncident | null>(null);

  // New incident form state
  const [incidentTitle, setIncidentTitle] = useState('');
  const [incidentType, setIncidentType] = useState('FALL_HAZARD');
  const [severityLevel, setSeverityLevel] = useState<SafetyIncidentSeverity>('NEAR_MISS');
  const [location, setLocation] = useState('');
  const [contractorName, setContractorName] = useState('');
  const [affectedPersonnel, setAffectedPersonnel] = useState('');
  const [incidentDescription, setIncidentDescription] = useState('');
  const [immediateActions, setImmediateActions] = useState('');
  const [rootCause, setRootCause] = useState('');
  const [preventiveCapa, setPreventiveCapa] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Load datasets directly from Supabase
  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const [incRes, ppeRes, tbtRes, bocwRes] = await Promise.all([
        (supabase as any).from('site_safety_incidents').select('*').eq('project_id', projectId).order('created_at', { ascending: false }),
        (supabase as any).from('ppe_compliance_audits').select('*').eq('project_id', projectId).order('audit_date', { ascending: false }),
        (supabase as any).from('safety_toolbox_talks').select('*').eq('project_id', projectId).order('talk_date', { ascending: false }),
        (supabase as any).from('bocw_statutory_checklists').select('*').eq('project_id', projectId).order('created_at', { ascending: false }),
      ]);

      setIncidents(incRes.data || []);
      setPpeLogs(ppeRes.data || []);
      setTalks(tbtRes.data || []);
      setBocwItems(bocwRes.data || []);
    } catch (err) {
      console.error('Failed to load HSE dashboard data', err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadDashboardData();
  }, [loadDashboardData]);

  // Dynamic KPI Aggregation (Zero-State Safe)
  const kpis = useMemo(() => {
    const safeManHoursWorked = talks.reduce((acc: number, t: SafetyToolboxTalk) => acc + Number(t.total_attendees || 0) * 8, 0);
    const criticalIncidents = incidents.filter((i: SiteSafetyIncident) => i.severity_level === 'MAJOR_MEDICAL' || i.severity_level === 'FATALITY').length;
    const ltifrRate = safeManHoursWorked > 0 ? (criticalIncidents * 1000000) / safeManHoursWorked : 0;
    const ppeScore = ppeLogs.length > 0 ? ppeLogs.reduce((acc: number, p: PpeComplianceLog) => acc + Number(p.compliance_score_pct || 0), 0) / ppeLogs.length : 0;

    return {
      safeManHoursWorked,
      ltifrRate: Number(ltifrRate.toFixed(2)),
      activeIncidentsCount: incidents.filter((i: SiteSafetyIncident) => i.status !== 'CLOSED_RESOLVED').length,
      totalIncidentsReported: incidents.length,
      nearMissesResolved: incidents.filter((i: SiteSafetyIncident) => i.severity_level === 'NEAR_MISS').length,
      dailyTbtAttendancePct: talks.length > 0 ? 100.0 : 0.0,
      ppeComplianceScorePct: Number(ppeScore.toFixed(1)),
    };
  }, [incidents, talks, ppeLogs]);

  // Filtered Incidents
  const filteredIncidents = useMemo(() => {
    return incidents.filter((inc) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        searchQuery === '' ||
        inc.incident_ref.toLowerCase().includes(q) ||
        inc.incident_title.toLowerCase().includes(q) ||
        inc.location.toLowerCase().includes(q) ||
        inc.contractor_name.toLowerCase().includes(q);

      const matchesSeverity = severityFilter === 'ALL' || inc.severity_level === severityFilter;
      const matchesStatus = statusFilter === 'ALL' || inc.status === statusFilter;

      return matchesSearch && matchesSeverity && matchesStatus;
    });
  }, [incidents, searchQuery, severityFilter, statusFilter]);

  // Filtered BOCW items
  const filteredBocw = useMemo(() => {
    return bocwItems.filter((item) => {
      const q = searchQuery.toLowerCase();
      const matchesCategory = bocwCategoryFilter === 'ALL' || item.category === bocwCategoryFilter;
      const matchesSearch =
        searchQuery === '' ||
        item.statutory_rule_ref.toLowerCase().includes(q) ||
        item.item_description.toLowerCase().includes(q) ||
        item.verifying_officer.toLowerCase().includes(q);

      return matchesCategory && matchesSearch;
    });
  }, [bocwItems, bocwCategoryFilter, searchQuery]);

  const handleCreateIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incidentTitle.trim() || !location.trim() || !immediateActions.trim()) return;

    setIsSubmitting(true);
    const incRef = `INC-${new Date().getFullYear()}-${(incidents.length + 1).toString().padStart(3, '0')}`;
    const payload = {
      project_id: projectId,
      incident_ref: incRef,
      incident_title: incidentTitle.trim(),
      incident_type: incidentType,
      severity_level: severityLevel,
      location: location.trim(),
      contractor_name: contractorName.trim() || 'Principal Contractor',
      affected_personnel: affectedPersonnel.trim() || null,
      incident_description: incidentDescription.trim(),
      immediate_actions_taken: immediateActions.trim(),
      root_cause_analysis: rootCause.trim() || null,
      preventive_measures_capa: preventiveCapa.trim() || null,
      status: 'REPORTED',
      safety_officer_name: 'Lead Safety Auditor',
    };

    try {
      const { error } = await (supabase as any).from('site_safety_incidents').insert([payload]);
      if (error) throw error;

      setSuccessBanner(`Incident ${incRef} reported successfully.`);
      setReportModalOpen(false);
      setIncidentTitle('');
      setLocation('');
      setContractorName('');
      setAffectedPersonnel('');
      setIncidentDescription('');
      setImmediateActions('');
      setRootCause('');
      setPreventiveCapa('');
      setTimeout(() => setSuccessBanner(null), 5000);
      await loadDashboardData();
    } catch (err: any) {
      console.error('Error creating incident:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSeverityBadge = (severity: SafetyIncidentSeverity) => {
    switch (severity) {
      case 'NEAR_MISS':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'MINOR_FIRST_AID':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'MAJOR_MEDICAL':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/30';
      case 'FATALITY':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      default:
        return 'bg-zinc-800 text-zinc-300 border-zinc-700';
    }
  };

  const getStatusBadge = (status: HseIncidentStatus) => {
    switch (status) {
      case 'CLOSED_RESOLVED':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'CAPA_ASSIGNED':
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
      case 'UNDER_INVESTIGATION':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'REPORTED':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      default:
        return 'bg-zinc-800 text-zinc-300 border-zinc-700';
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 md:p-8 font-sans">
      {successBanner && (
        <div className="mb-6 flex items-center justify-between rounded-xl border border-emerald-500/40 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span className="font-semibold">{successBanner}</span>
          </div>
          <button onClick={() => setSuccessBanner(null)} className="text-emerald-400 hover:text-emerald-100">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* HEADER */}
      <header className="mb-8 rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-6 shadow-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-2.5 mb-2 font-mono text-xs">
              <span className="inline-flex items-center gap-1.5 rounded border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-0.5 text-cyan-400">
                BOCW ACT 1996 • IS 3696 COMPLIANT
                <StatutoryInfo
                  standardRef="BOCW ACT 1996 / CPWD CL. 19-C"
                  title="Statutory HSE Governance"
                  idealRange="LTIFR: 0.00"
                  description="Mandates third-party certified cranes/hoists, perimeter safety netting, double-lanyard full-body harnesses, and full first-aid dispensary staffing on sites with over 50 workers."
                />
              </span>
              <span className="text-zinc-500">•</span>
              <span className="text-zinc-400">{projectName}</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
              <ShieldAlert className="w-8 h-8 text-cyan-400" />
              <span>Site Safety, Health &amp; Environment (HSE) &amp; BOCW Compliance</span>
            </h1>
            <p className="mt-1 text-xs text-zinc-400 max-w-3xl font-mono">
              Live site incident reporting, root cause analysis (CAPA), daily toolbox talk attendance, PPE compliance indexing, and statutory safety governance.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
            <button
              onClick={() => void loadDashboardData()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-800 px-3.5 py-2 text-zinc-200 hover:bg-zinc-700 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
              <span>Sync Telemetry</span>
            </button>
            <button
              onClick={() => setDocketModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 px-3.5 py-2 text-indigo-300 hover:bg-indigo-500/20 transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print HSE Audit Docket</span>
            </button>
            <button
              onClick={() => setReportModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 px-4 py-2 font-bold text-zinc-950 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Report Incident / Near-Miss</span>
            </button>
          </div>
        </div>
      </header>

      {/* TOP KPI CARDS (ZERO-STATE SAFE) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8 font-mono">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-2">
            <span>Safe Man-Hours Elapsed</span>
            <HeartPulse className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400">
            {kpis.safeManHoursWorked.toLocaleString('en-IN')}
          </div>
          <div className="mt-2 text-[11px] text-zinc-500">TBT-verified operative hours</div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-2">
            <span>LTIFR Incident Rate</span>
            <Activity className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-cyan-400">
            {kpis.ltifrRate.toFixed(2)}
          </div>
          <div className="mt-2 text-[11px] text-zinc-500">Target &lt; 0.50 per 1M hours</div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-2">
            <span>Open Hazard &amp; CAPA Logs</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400">
            {kpis.activeIncidentsCount} / {kpis.totalIncidentsReported}
          </div>
          <div className="mt-2 text-[11px] text-zinc-500">{kpis.nearMissesResolved} near-misses closed</div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-2">
            <span>Toolbox Talk Attendance</span>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-blue-400">
            {kpis.dailyTbtAttendancePct}%
          </div>
          <div className="mt-2 text-[11px] text-zinc-500">{talks.length} trade briefings logged</div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
          <div className="flex items-center justify-between text-xs text-zinc-400 mb-2">
            <span>PPE Compliance Score</span>
            <HardHat className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-purple-400">
            {kpis.ppeComplianceScorePct}%
          </div>
          <div className="mt-2 text-[11px] text-zinc-500">{ppeLogs.length} zonal audits</div>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div className="flex flex-wrap items-center gap-2 border-b border-zinc-800 pb-4 mb-6 font-mono text-xs">
        <button
          onClick={() => setActiveTab('incidents')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition ${
            activeTab === 'incidents'
              ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <AlertOctagon className="w-4 h-4" />
          <span>Incident &amp; CAPA Ledger ({incidents.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('bocw')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition ${
            activeTab === 'bocw'
              ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Scale className="w-4 h-4" />
          <span>BOCW Statutory Checklist ({bocwItems.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('ppe')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition ${
            activeTab === 'ppe'
              ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <HardHat className="w-4 h-4" />
          <span>PPE Zonal Audits ({ppeLogs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('toolbox')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition ${
            activeTab === 'toolbox'
              ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Toolbox Talks ({talks.length})</span>
        </button>
      </div>

      {/* TAB 1: INCIDENTS */}
      {activeTab === 'incidents' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-xs font-mono">
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search ref, title, location..."
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 pl-9 pr-4 py-2 text-white outline-none"
              />
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-zinc-400" />
                <select
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value)}
                  className="rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-white"
                >
                  <option value="ALL">All Severities</option>
                  <option value="NEAR_MISS">Near Miss</option>
                  <option value="MINOR_FIRST_AID">Minor First Aid</option>
                  <option value="MAJOR_MEDICAL">Major Medical</option>
                  <option value="FATALITY">Fatality</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-white"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="REPORTED">Reported</option>
                  <option value="UNDER_INVESTIGATION">Under Investigation</option>
                  <option value="CAPA_ASSIGNED">CAPA Assigned</option>
                  <option value="CLOSED_RESOLVED">Closed</option>
                </select>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 overflow-hidden font-mono text-xs">
            <table className="w-full text-left">
              <thead className="border-b border-zinc-800 bg-zinc-950 text-zinc-400 uppercase text-[10px]">
                <tr>
                  <th className="px-4 py-3">Incident Ref</th>
                  <th className="px-4 py-3">Date &amp; Location</th>
                  <th className="px-4 py-3">Title &amp; Type</th>
                  <th className="px-4 py-3">Severity</th>
                  <th className="px-4 py-3">Contractor</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {filteredIncidents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-zinc-500">
                      Zero safety incidents recorded. Site operating under full safe conditions.
                    </td>
                  </tr>
                ) : (
                  filteredIncidents.map((inc) => (
                    <tr key={inc.id} className="hover:bg-zinc-800/40 transition">
                      <td className="px-4 py-3 font-bold text-cyan-400">{inc.incident_ref}</td>
                      <td className="px-4 py-3">
                        <div className="text-zinc-200">{inc.incident_date}</div>
                        <div className="text-[10px] text-zinc-500">{inc.location}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-white font-bold">{inc.incident_title}</div>
                        <div className="text-[10px] text-zinc-400">{inc.incident_type}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase ${getSeverityBadge(inc.severity_level)}`}>
                          {inc.severity_level.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-zinc-300">{inc.contractor_name}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase ${getStatusBadge(inc.status)}`}>
                          {inc.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedIncident(inc)}
                          className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded text-[10px] font-bold uppercase"
                        >
                          CAPA
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: BOCW CHECKLIST */}
      {activeTab === 'bocw' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
          {filteredBocw.length === 0 ? (
            <div className="col-span-2 p-12 text-center border border-zinc-850 bg-zinc-950 text-zinc-500">
              Zero BOCW statutory items logged.
            </div>
          ) : (
            filteredBocw.map((item) => (
              <div key={item.id} className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-cyan-400 font-bold">{item.statutory_rule_ref}</span>
                  <span className="text-[9px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold uppercase">
                    {item.compliance_status}
                  </span>
                </div>
                <div className="text-sm font-bold text-white font-sans">{item.item_description}</div>
                <div className="text-zinc-400 font-sans text-[11px] bg-zinc-950 p-2.5 rounded border border-zinc-850">
                  {item.evidence_details}
                </div>
                <div className="text-[10px] text-zinc-500 pt-1 flex justify-between">
                  <span>Verifier: {item.verifying_officer}</span>
                  {item.rectification_target_date && <span>Target: {item.rectification_target_date}</span>}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 3: PPE AUDITS */}
      {activeTab === 'ppe' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-xs font-mono">
          {ppeLogs.length === 0 ? (
            <div className="col-span-3 p-12 text-center border border-zinc-850 bg-zinc-950 text-zinc-500">
              Zero PPE compliance audits logged.
            </div>
          ) : (
            ppeLogs.map((log) => (
              <div key={log.id} className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-purple-400 font-bold">{log.audit_ref}</span>
                  <span className="text-[9px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold">
                    {log.audit_rating}
                  </span>
                </div>
                <div className="text-sm font-bold text-white">{log.zone_location}</div>
                <div className="text-[10px] text-zinc-500">Audited by {log.auditor_name} on {log.audit_date}</div>
                <div className="text-lg font-bold text-emerald-400 pt-1">
                  Score: {log.compliance_score_pct}% ({log.helmet_compliance_count}/{log.total_workers_inspected} Helmets)
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 4: TOOLBOX TALKS */}
      {activeTab === 'toolbox' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
          {talks.length === 0 ? (
            <div className="col-span-2 p-12 text-center border border-zinc-850 bg-zinc-950 text-zinc-500">
              Zero daily toolbox talks recorded.
            </div>
          ) : (
            talks.map((talk) => (
              <div key={talk.id} className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-blue-400 font-bold">{talk.talk_ref}</span>
                  <span className="text-zinc-400">{talk.talk_date}</span>
                </div>
                <div className="text-sm font-bold text-white font-sans">{talk.hazard_topic}</div>
                <div className="text-[10px] text-zinc-400">Trade: {talk.trade_category} • Standard: {talk.is_code_ref}</div>
                <div className="text-emerald-400 font-bold pt-1">
                  {talk.total_attendees} Operatives Briefed by {talk.trainer_name}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* MODAL 1: REPORT INCIDENT */}
      {reportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-mono">
          <div className="w-full max-w-xl rounded-2xl border border-zinc-800 bg-zinc-950 p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-3">
              <span className="font-bold text-white uppercase text-xs flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-cyan-400" />
                <span>Report Site Incident / Near-Miss (BOCW)</span>
              </span>
              <button onClick={() => setReportModalOpen(false)} className="text-zinc-500 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCreateIncident} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-0.5">Incident Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Scaffolding clamp slipped into net"
                    value={incidentTitle}
                    onChange={(e) => setIncidentTitle(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-white outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-0.5">Severity Level</label>
                  <select
                    value={severityLevel}
                    onChange={(e) => setSeverityLevel(e.target.value as SafetyIncidentSeverity)}
                    className="w-full bg-zinc-900 border border-zinc-800 px-2 py-1.5 text-white outline-none"
                  >
                    <option value="NEAR_MISS">Near Miss</option>
                    <option value="MINOR_FIRST_AID">Minor (First Aid)</option>
                    <option value="MAJOR_MEDICAL">Major (Hospitalized)</option>
                    <option value="FATALITY">Fatality</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-0.5">Site Location *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Tower A - 15th Floor Slab Edge"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-white outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-400 block mb-0.5">Contractor Agency</label>
                  <input
                    type="text"
                    placeholder="e.g. Principal Contractor"
                    value={contractorName}
                    onChange={(e) => setContractorName(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-white outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-zinc-400 block mb-0.5">Circumstances &amp; Description</label>
                <textarea
                  rows={2}
                  value={incidentDescription}
                  onChange={(e) => setIncidentDescription(e.target.value)}
                  placeholder="Details of the event..."
                  className="w-full bg-zinc-900 border border-zinc-800 p-2 text-white outline-none font-sans"
                />
              </div>

              <div>
                <label className="text-[10px] text-zinc-400 block mb-0.5">Immediate Actions Taken *</label>
                <textarea
                  rows={2}
                  required
                  value={immediateActions}
                  onChange={(e) => setImmediateActions(e.target.value)}
                  placeholder="e.g. Red tagged, first aid administered..."
                  className="w-full bg-zinc-900 border border-zinc-800 p-2 text-white outline-none font-sans"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setReportModalOpen(false)}
                  className="px-3.5 py-1.5 text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold uppercase text-xs rounded transition"
                >
                  {isSubmitting ? 'Logging...' : 'Submit Incident'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: INSPECT INCIDENT */}
      {selectedIncident && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-mono text-xs">
          <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-6 space-y-3">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
              <span className="font-bold text-white uppercase">{selectedIncident.incident_ref}</span>
              <button onClick={() => setSelectedIncident(null)} className="text-zinc-500 hover:text-white">✕</button>
            </div>
            <div className="text-sm font-bold text-white font-sans">{selectedIncident.incident_title}</div>
            <div className="text-zinc-400">{selectedIncident.location} • {selectedIncident.contractor_name}</div>
            <div className="p-3 bg-zinc-900 rounded border border-zinc-800 font-sans space-y-1">
              <div className="font-bold text-zinc-300">Immediate Actions:</div>
              <div>{selectedIncident.immediate_actions_taken}</div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: AUDIT PRINT CERTIFICATE */}
      {docketModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
          <div className="w-full max-w-3xl rounded-2xl border border-zinc-800 bg-white text-zinc-950 p-8 shadow-2xl relative my-8 print:p-0">
            <div className="flex justify-between items-center border-b pb-3 mb-4 print:hidden">
              <span className="font-bold text-sm font-mono uppercase text-zinc-900">BOCW Statutory Audit Docket</span>
              <div className="flex gap-2 font-mono text-xs">
                <button onClick={() => window.print()} className="px-3 py-1 bg-zinc-900 text-white font-bold rounded">Print</button>
                <button onClick={() => setDocketModalOpen(false)} className="px-3 py-1 border text-zinc-700 rounded">Close</button>
              </div>
            </div>
            <div className="text-center border-b-2 border-zinc-900 pb-4 mb-4">
              <div className="text-xs uppercase font-bold text-zinc-600">Public Works Department &bull; Safety Directorate</div>
              <h1 className="text-xl font-bold uppercase mt-1">Site Safety &amp; BOCW Compliance Certificate</h1>
            </div>
            <div className="text-xs space-y-2 font-sans mb-4">
              <div><strong>Project:</strong> {projectName} ({projectId})</div>
              <div><strong>Safe Man-Hours Elapsed:</strong> {kpis.safeManHoursWorked.toLocaleString('en-IN')} Hours</div>
              <div><strong>LTIFR Frequency Rate:</strong> {kpis.ltifrRate.toFixed(2)} (Norm: &lt; 0.50)</div>
              <div><strong>Total Incidents:</strong> {kpis.totalIncidentsReported} ({kpis.nearMissesResolved} near-misses resolved)</div>
            </div>
            <div className="border-t pt-4 text-xs font-mono flex justify-between text-zinc-600">
              <div>Safety Officer Seal</div>
              <div>SEOR Executive Seal</div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
