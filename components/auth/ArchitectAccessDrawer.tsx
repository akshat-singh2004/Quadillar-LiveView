"use client";

import { useEffect, useState } from "react";
import { Building2, Check, ChevronRight, Clock3, Loader2, ShieldCheck, UserRound, X } from "lucide-react";
import { supabase } from "@/app/lib/supabase";

const SESSION_KEY = "quadillar_personnel_session";
const DEFAULT_PROJECT_ID = "PRJ-LKO-TOWER-A";
const ARCHITECT_ROLES = ["ARCHITECT", "CLIENT_ADMIN", "PMC_LEAD", "ADMIN"] as const;

type VisitorRequest = {
  id: string;
  name: string;
  email: string;
  organization: string;
  purpose: string;
};

type PersonnelSession = {
  role?: string;
  primary_role?: string;
  project_id?: string;
  personnel_id?: string;
};

type ModuleKey = "DASHBOARD" | "BIM_VIEWER" | "DPR" | "POUR_CARDS" | "SAFETY_PTW" | "FINANCE_BILLS";

const modules: Array<{ key: ModuleKey; label: string }> = [
  { key: "DASHBOARD", label: "Dashboard & Site Telemetry" },
  { key: "BIM_VIEWER", label: "3D BIM & Reality Tours" },
  { key: "DPR", label: "Daily Progress Reports" },
  { key: "POUR_CARDS", label: "Quality Pour Cards & Cube Tests" },
  { key: "SAFETY_PTW", label: "Safety Permits & Formwork Stripping" },
  { key: "FINANCE_BILLS", label: "Measurement Book & Financial Bills" },
];

function readSession(): PersonnelSession | null {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) as PersonnelSession : null;
  } catch {
    return null;
  }
}

export function isModuleAllowed(moduleKey: string, role?: string, allowedModules?: string[]): boolean {
  if (!role) return false;
  if ((ARCHITECT_ROLES as readonly string[]).includes(role)) return true;
  if (!allowedModules || allowedModules.length === 0) return moduleKey === "DASHBOARD";
  return allowedModules.includes(moduleKey);
}

function normalizeRequest(row: Record<string, unknown>): VisitorRequest {
  return {
    id: String(row.id),
    name: String(row.name ?? row.full_name ?? "Unnamed visitor"),
    email: String(row.email ?? "No email provided"),
    organization: String(row.organization ?? row.organization_name ?? "Independent visitor"),
    purpose: String(row.purpose ?? row.purpose_of_visit ?? "No purpose provided"),
  };
}

export function ArchitectAccessDrawer({ inline = false }: { inline?: boolean }) {
  const [session, setSession] = useState<PersonnelSession | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [open, setOpen] = useState(false);
  const [requests, setRequests] = useState<VisitorRequest[]>([]);
  const [selectedModules, setSelectedModules] = useState<Record<string, string[]>>({});
  const [validity, setValidity] = useState<Record<string, number>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canReview = Boolean(session && (ARCHITECT_ROLES as readonly string[]).includes(session.primary_role ?? session.role ?? ""));
  const projectId = session?.project_id ?? DEFAULT_PROJECT_ID;

  const fetchRequests = async () => {
    if (!canReview) return;
    const { data, error: queryError } = await supabase.from("visitor_access_requests").select("*").eq("project_id", projectId).eq("status", "PENDING_APPROVAL").order("created_at", { ascending: true });
    if (queryError) {
      setError(queryError.message);
      return;
    }
    setRequests((data ?? []).map((row) => normalizeRequest(row as Record<string, unknown>)));
  };

  useEffect(() => {
    const updateSession = () => {
      const next = readSession();
      setSession(next);
      if (!next || !(ARCHITECT_ROLES as readonly string[]).includes(next.primary_role ?? next.role ?? "")) setOpen(false);
    };
    updateSession();
    setHydrated(true);
    window.addEventListener("quadillar:auth-changed", updateSession);
    return () => window.removeEventListener("quadillar:auth-changed", updateSession);
  }, []);

  useEffect(() => {
    if (!canReview) return;
    void fetchRequests();
    const channel = supabase.channel(`architect-visitor-queue-${projectId}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "visitor_access_requests", filter: `project_id=eq.${projectId}` }, () => void fetchRequests()).on("postgres_changes", { event: "UPDATE", schema: "public", table: "visitor_access_requests", filter: `project_id=eq.${projectId}` }, () => void fetchRequests()).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [canReview, projectId]);

  const modulesFor = (requestId: string) => selectedModules[requestId] ?? [];
  const toggleModule = (requestId: string, moduleKey: ModuleKey) => setSelectedModules((current) => ({ ...current, [requestId]: modulesFor(requestId).includes(moduleKey) ? modulesFor(requestId).filter((key) => key !== moduleKey) : [...modulesFor(requestId), moduleKey] }));

  const reject = async (request: VisitorRequest) => {
    setBusyId(request.id);
    setError(null);
    const { error: updateError } = await supabase.from("visitor_access_requests").update({ status: "REJECTED", reviewed_by: session?.personnel_id ?? null }).eq("id", request.id).eq("status", "PENDING_APPROVAL");
    if (updateError) setError(updateError.message);
    else setRequests((current) => current.filter((item) => item.id !== request.id));
    setBusyId(null);
  };

  const approve = async (request: VisitorRequest) => {
    setBusyId(request.id);
    setError(null);
    const { error: rpcError } = await supabase.rpc("architect_approve_visitor_pass", { p_request_id: request.id, p_architect_personnel_id: session?.personnel_id ?? "", p_allowed_modules: modulesFor(request.id), p_valid_hours: validity[request.id] ?? 24 });
    if (rpcError) setError(rpcError.message);
    else setRequests((current) => current.filter((item) => item.id !== request.id));
    setBusyId(null);
  };

  if (!hydrated || !canReview) return null;
  return <>
    <button type="button" onClick={() => { setOpen(true); setError(null); void fetchRequests(); }} className={`${inline ? "relative" : "fixed right-4 top-28 z-40"} inline-flex items-center gap-2 rounded-full border border-black/[0.06] bg-white/90 px-3 py-2 text-xs font-medium text-zinc-800 shadow-sm backdrop-blur-xl transition hover:bg-white dark:border-white/[0.08] dark:bg-zinc-900/90 dark:text-zinc-100 dark:hover:bg-zinc-900`}><ShieldCheck size={15} className="text-emerald-600" />Clearance Desk<span className="grid min-w-5 place-items-center rounded-full bg-rose-500 px-1.5 py-0.5 font-mono tabular-nums text-[10px] text-white">{requests.length}</span></button>
    <div className={`fixed inset-0 z-[70] transition ${open ? "visible" : "invisible pointer-events-none"}`} aria-hidden={!open}><button type="button" aria-label="Close Site Clearance Desk" onClick={() => setOpen(false)} className="absolute inset-0 bg-black/20 backdrop-blur-sm" /><aside role="dialog" aria-modal="true" aria-labelledby="clearance-desk-title" className={`absolute right-0 top-0 h-full w-full max-w-xl overflow-y-auto bg-[#FBFBFD] p-5 shadow-2xl transition-transform duration-300 dark:bg-zinc-950 sm:p-7 ${open ? "translate-x-0" : "translate-x-full"}`}><div className="flex items-start justify-between gap-4"><div><div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500"><Building2Icon />Architect review desk</div><h2 id="clearance-desk-title" className="mt-2 text-2xl font-semibold tracking-tight text-zinc-950 dark:text-white">Pending visitor access</h2><p className="mt-1 text-xs text-zinc-500">{projectId} · {requests.length} awaiting review</p></div><button type="button" onClick={() => setOpen(false)} className="rounded-xl p-2 text-zinc-500 hover:bg-black/[0.05] dark:hover:bg-white/[0.08]" aria-label="Close drawer"><X size={18} /></button></div>{error ? <div role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-medium text-rose-800">{error}</div> : null}<div className="mt-6 space-y-4">{requests.length === 0 ? <div className="rounded-2xl border border-dashed border-black/[0.1] bg-white p-8 text-center dark:border-white/[0.1] dark:bg-zinc-900"><UserRound size={24} className="mx-auto text-zinc-400" /><p className="mt-3 text-sm font-medium text-zinc-800 dark:text-zinc-100">No pending visitor requests</p><p className="mt-1 text-xs text-zinc-500">New requests will appear here automatically.</p></div> : requests.map((request) => <article key={request.id} className="rounded-2xl border border-black/[0.06] bg-white p-5 shadow-sm dark:border-white/[0.08] dark:bg-zinc-900"><div className="flex items-start justify-between gap-3"><div><h3 className="font-semibold text-zinc-950 dark:text-white">{request.name}</h3><p className="mt-1 text-xs text-zinc-500">{request.email}</p><p className="text-xs text-zinc-500">{request.organization}</p></div><span className="rounded-lg bg-amber-50 px-2 py-1 text-[10px] font-medium text-amber-800 dark:bg-amber-400/10 dark:text-amber-200">Pending</span></div><p className="mt-4 rounded-xl bg-zinc-50 p-3 text-xs leading-5 text-zinc-600 dark:bg-white/[0.05] dark:text-zinc-300">{request.purpose}</p><div className="mt-4"><div className="mb-2 text-xs font-semibold text-zinc-800 dark:text-zinc-100">Grant module access</div><div className="space-y-2">{modules.map((module) => <label key={module.key} className="flex cursor-pointer items-center gap-2.5 text-xs text-zinc-700 dark:text-zinc-300"><input type="checkbox" checked={modulesFor(request.id).includes(module.key)} onChange={() => toggleModule(request.id, module.key)} className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-400" />{module.label}</label>)}</div></div><div className="mt-5 flex items-center justify-between gap-3"><label className="flex items-center gap-2 text-xs font-medium text-zinc-600 dark:text-zinc-300"><Clock3 size={14} />Valid for<select value={validity[request.id] ?? 24} onChange={(event) => setValidity((current) => ({ ...current, [request.id]: Number(event.target.value) }))} className="rounded-lg border border-black/[0.08] bg-white px-2 py-1.5 text-xs dark:border-white/[0.1] dark:bg-zinc-950"><option value={8}>8 Hours</option><option value={24}>24 Hours</option><option value={168}>7 Days</option></select></label></div><div className="mt-5 flex gap-2"><button type="button" disabled={busyId === request.id} onClick={() => void reject(request)} className="rounded-xl px-3 py-2 text-xs font-medium text-rose-700 transition hover:bg-rose-50 disabled:opacity-50 dark:text-rose-300 dark:hover:bg-rose-400/10">Reject</button><button type="button" disabled={busyId === request.id} onClick={() => void approve(request)} className="ml-auto inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-900 px-4 py-2 text-xs font-medium text-white transition hover:bg-zinc-800 active:scale-[0.98] disabled:opacity-60 dark:bg-white dark:text-zinc-900">{busyId === request.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}Approve & Grant Custom Views<ChevronRight size={14} /></button></div></article>)}</div></aside></div>
  </>;
}

function Building2Icon() { return <Building2 size={14} />; }

export default ArchitectAccessDrawer;
