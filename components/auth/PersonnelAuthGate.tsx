"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { AlertCircle, ArrowLeft, ArrowRight, Building2, Clock, Compass, KeyRound, Loader2, ShieldCheck, Sparkles, UserCheck } from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import { type ConTechRole, useRoleController } from "@/components/liveview/RoleSwitcherBanner";

const SESSION_KEY = "quadillar_personnel_session";
const DEFAULT_PROJECT_ID = "PRJ-LKO-TOWER-A";

type ClearanceStep = 1 | 2 | "3A" | "3B" | "WAITING_APPROVAL";
type ClearanceRole = ConTechRole | "ARCHITECT";
type VisitorForm = { name: string; email: string; phone: string; organization: string; purpose: string };
type PersonnelSession = Record<string, unknown> & { full_name: string; email: string; personnel_id: string; project_id: string; role: ClearanceRole };

const roleOptions: Array<{ value: ClearanceRole; label: string; description: string }> = [
  { value: "PMC_ENGINEER", label: "PMC Engineer", description: "Project controls" },
  { value: "QA_QC_ENGINEER", label: "QA / QC Engineer", description: "Quality assurance" },
  { value: "SAFETY_OFFICER", label: "Safety Officer", description: "Safety clearances" },
  { value: "QS_ENGINEER", label: "QS Engineer", description: "Commercial records" },
  { value: "SITE_ENGINEER", label: "Site Engineer", description: "Site execution" },
  { value: "CONTRACTOR", label: "Contractor", description: "Delivery partner" },
  { value: "CLIENT_ADMIN", label: "Client Admin", description: "Owner oversight" },
];

function readStoredSession(): PersonnelSession | null {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<PersonnelSession>;
    if (!value.full_name || !value.email || !value.personnel_id || !value.project_id || !value.role) return null;
    return value as PersonnelSession;
  } catch {
    return null;
  }
}

function rpcSession(value: unknown, fallback: PersonnelSession): PersonnelSession {
  const candidate = Array.isArray(value) ? value[0] : value;
  const result = candidate && typeof candidate === "object" ? candidate as Record<string, unknown> : {};
  return {
    ...fallback,
    ...result,
    full_name: String(result.full_name ?? result.name ?? fallback.full_name),
    email: String(result.email ?? fallback.email),
    personnel_id: String(result.personnel_id ?? fallback.personnel_id),
    project_id: String(result.project_id ?? fallback.project_id),
    role: String(result.role ?? fallback.role) as ConTechRole,
  };
}

function fieldClass(mono = false) {
  return `mt-1.5 h-11 w-full rounded-xl border border-black/[0.08] bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 dark:border-white/[0.1] dark:bg-zinc-950 dark:text-white dark:focus:ring-zinc-700${mono ? " font-mono tabular-nums uppercase" : ""}`;
}

function Panel({ children }: { children: ReactNode }) {
  return <section className="w-full max-w-md space-y-6 rounded-3xl border border-black/[0.06] bg-white/95 p-8 shadow-2xl shadow-black/10 backdrop-blur-2xl dark:border-white/[0.08] dark:bg-zinc-900/95">{children}</section>;
}

export function PersonnelAuthGate() {
  const { setRole } = useRoleController();
  const [currentStep, setCurrentStep] = useState<ClearanceStep>(1);
  const [projectId, setProjectId] = useState(DEFAULT_PROJECT_ID);
  const [selectedRole, setSelectedRole] = useState<ClearanceRole | "">("");
  const [personnelId, setPersonnelId] = useState("");
  const [visitorForm, setVisitorForm] = useState<VisitorForm>({ name: "", email: "", phone: "", organization: "", purpose: "" });
  const [visitorToken, setVisitorToken] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [session, setSession] = useState<PersonnelSession | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(true);

  useEffect(() => {
    const stored = readStoredSession();
    setSession(stored);
    setDrawerOpen(!stored);
    if (stored) setRole(stored.role);
    setHydrated(true);
    const onAuthChanged = () => {
      const next = readStoredSession();
      setSession(next);
      setDrawerOpen(!next);
      if (next) setRole(next.role);
    };
    window.addEventListener("quadillar:auth-changed", onAuthChanged);
    return () => window.removeEventListener("quadillar:auth-changed", onAuthChanged);
  }, [setRole]);

  useEffect(() => {
    if (currentStep !== "WAITING_APPROVAL" || !visitorToken) return;
    const channel = supabase.channel(`visitor-access-${visitorToken}`).on("postgres_changes", { event: "UPDATE", schema: "public", table: "visitor_access_requests", filter: `id=eq.${visitorToken}` }, (payload) => {
      const record = payload.new as Record<string, unknown>;
      if (String(record.status).toUpperCase() !== "APPROVED") return;
      const approvedSession: PersonnelSession = {
        ...record,
        full_name: String(record.full_name ?? visitorForm.name),
        email: String(record.email ?? visitorForm.email),
        personnel_id: String(record.personnel_id ?? `GUEST-${visitorToken.slice(0, 8).toUpperCase()}`),
        project_id: String(record.project_id ?? projectId),
        role: "CONTRACTOR",
      };
      window.localStorage.setItem(SESSION_KEY, JSON.stringify(approvedSession));
      setSession(approvedSession);
      setRole(approvedSession.role);
      window.dispatchEvent(new CustomEvent("quadillar:auth-changed", { detail: approvedSession }));
      setDrawerOpen(false);
    }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [currentStep, projectId, setRole, visitorForm.email, visitorForm.name, visitorToken]);

  const reset = () => {
    setErrorMessage(null);
    setCurrentStep(1);
    setSelectedRole("");
    setPersonnelId("");
    setVisitorToken(null);
  };

  const verifyProject = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!projectId.trim()) {
      setErrorMessage("Enter the project identification code to continue.");
      return;
    }
    setErrorMessage(null);
    setProjectId(projectId.trim().toUpperCase());
    setCurrentStep(2);
  };

  const selectRole = (role: ClearanceRole) => {
    setSelectedRole(role);
    setErrorMessage(null);
    setCurrentStep("3A");
  };

  const verifyPersonnel = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedRole || !personnelId.trim()) {
      setErrorMessage("Enter your custom personnel identification number.");
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);
    const { data, error } = await supabase.rpc("verify_staged_personnel_credentials", { p_project_id: projectId, p_role: selectedRole, p_personnel_id: personnelId.trim().toUpperCase() });
    if (error) {
      setErrorMessage(error.message);
      setIsLoading(false);
      return;
    }
    const fallback: PersonnelSession = { full_name: personnelId.trim().toUpperCase(), email: "", personnel_id: personnelId.trim().toUpperCase(), project_id: projectId, role: selectedRole as ConTechRole };
    const nextSession = rpcSession(data, fallback);
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(nextSession));
    setSession(nextSession);
    setRole(nextSession.role);
    window.dispatchEvent(new CustomEvent("quadillar:auth-changed", { detail: nextSession }));
    setIsLoading(false);
    setDrawerOpen(false);
  };

  const submitVisitor = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!visitorForm.name.trim() || !visitorForm.email.trim() || !visitorForm.phone.trim() || !visitorForm.organization.trim() || !visitorForm.purpose.trim()) {
      setErrorMessage("Complete every visitor field before submitting the request.");
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);
    const { data, error } = await supabase.rpc("request_visitor_access", { p_project_id: projectId, p_name: visitorForm.name.trim(), p_email: visitorForm.email.trim().toLowerCase(), p_phone: visitorForm.phone.trim(), p_organization: visitorForm.organization.trim(), p_purpose: visitorForm.purpose.trim() });
    if (error) {
      setErrorMessage(error.message);
      setIsLoading(false);
      return;
    }
    const result = Array.isArray(data) ? data[0] : data;
    const token = result && typeof result === "object" && (result as Record<string, unknown>).id ? String((result as Record<string, unknown>).id) : typeof data === "string" ? data : null;
    if (!token) {
      setErrorMessage("The project owner did not return an access token. Please try again.");
      setIsLoading(false);
      return;
    }
    setVisitorToken(token);
    setCurrentStep("WAITING_APPROVAL");
    setIsLoading(false);
  };

  const signOut = () => {
    window.localStorage.removeItem(SESSION_KEY);
    setSession(null);
    setDrawerOpen(true);
    reset();
    window.dispatchEvent(new Event("quadillar:auth-changed"));
  };

  if (!hydrated) return null;
  return <>
    {session && !drawerOpen ? <div className="fixed right-4 top-16 z-40 flex max-w-[calc(100vw-2rem)] items-center gap-2 rounded-2xl border border-black/[0.06] bg-white/90 px-3 py-2 text-xs text-zinc-700 shadow-sm backdrop-blur-xl dark:border-white/[0.08] dark:bg-zinc-900/90 dark:text-zinc-200"><span className="flex items-center gap-1.5 font-medium"><UserCheck size={14} className="text-emerald-600" />{session.full_name}</span><span className="rounded-lg bg-black/[0.04] px-2 py-1 font-mono tabular-nums dark:bg-white/[0.08]">{session.personnel_id}</span><span className="hidden rounded-lg bg-black/[0.04] px-2 py-1 font-mono tabular-nums sm:inline">{session.project_id}</span><button type="button" onClick={() => { setDrawerOpen(true); setCurrentStep(1); }} className="ml-1 whitespace-nowrap text-zinc-500 underline-offset-2 hover:text-zinc-900 hover:underline dark:hover:text-white">Switch Role / Switch User</button><button type="button" onClick={signOut} className="rounded-lg p-1.5 text-zinc-500 hover:bg-rose-50 hover:text-rose-700" aria-label="Sign out"><ArrowLeft size={14} /></button></div> : null}
    <div className={`fixed inset-0 z-[60] flex items-center justify-center bg-[#FBFBFD]/80 p-4 backdrop-blur-2xl transition-opacity duration-300 dark:bg-[#000000]/80 ${drawerOpen ? "opacity-100" : "pointer-events-none opacity-0"}`} aria-hidden={!drawerOpen}><Panel>
      <header><div className="mb-3 inline-flex items-center gap-2 text-[10px] font-semibold tracking-[0.16em] text-zinc-500"><ShieldCheck size={14} />QUADILLAR LIVEVIEW - SITE IDENTITY</div><h1 className="text-2xl font-semibold tracking-tight text-zinc-950 dark:text-white">Personnel Clearance Portal</h1><p className="mt-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">Establish a verified project identity before entering site control surfaces.</p></header>
      {currentStep === 1 ? <form onSubmit={verifyProject} className="space-y-5"><label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">Project Code<input value={projectId} onChange={(event) => setProjectId(event.target.value)} className={fieldClass(true)} placeholder="PRJ-LKO-TOWER-A" autoComplete="off" /></label>{errorMessage ? <ErrorBanner message={errorMessage} /> : null}<PrimaryButton loading={isLoading}>Continue to Role Selection<ArrowRight size={15} /></PrimaryButton></form> : null}
      {currentStep === 2 ? <div className="space-y-5"><div className="flex items-center justify-between rounded-xl bg-zinc-100 px-3 py-2 text-xs dark:bg-white/[0.06]"><span className="font-mono tabular-nums text-zinc-700 dark:text-zinc-200">{projectId}</span><button type="button" onClick={() => { setCurrentStep(1); setErrorMessage(null); }} className="font-medium text-zinc-500 underline-offset-2 hover:text-zinc-900 hover:underline dark:hover:text-white">Change</button></div><button type="button" onClick={() => selectRole("ARCHITECT")} className="w-full rounded-2xl border border-zinc-700 bg-zinc-900 p-5 text-left text-white shadow-lg transition hover:bg-zinc-800 active:scale-[0.98] dark:border-zinc-700 dark:bg-zinc-800"><Compass size={22} className="mb-3 text-amber-300" /><span className="block text-base font-semibold">Project Owner / Architect</span><span className="mt-1 block text-xs text-zinc-300">Full governance, custom view delegation & statutory sign-offs</span></button><div><div className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-white"><Building2 size={16} />Site Execution & Quality Teams</div><div className="grid grid-cols-2 gap-2">{roleOptions.filter((role) => role.value !== "ARCHITECT").map((role) => <button key={role.value} type="button" onClick={() => selectRole(role.value)} className="min-h-20 rounded-xl border border-black/[0.07] bg-white px-3 py-3 text-left transition hover:border-zinc-400 hover:shadow-sm active:scale-[0.98] dark:border-white/[0.08] dark:bg-zinc-950"><span className="block text-xs font-semibold text-zinc-900 dark:text-white">{role.label}</span><span className="mt-1 block text-[10px] text-zinc-500">{role.description}</span></button>)}</div></div><button type="button" onClick={() => { setCurrentStep("3B"); setErrorMessage(null); }} className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 text-left text-xs font-semibold text-amber-900 transition hover:bg-amber-100 active:scale-[0.98] dark:border-amber-500/20 dark:bg-amber-400/10 dark:text-amber-200"><Sparkles size={16} /><span><strong className="block">Request Visitor Pass</strong><span className="font-normal">Awaiting Architect approval for designated views</span></span></button></div> : null}
      {currentStep === "3A" ? <form onSubmit={verifyPersonnel} className="space-y-5"><StepPills projectId={projectId} role={selectedRole} />{selectedRole === "ARCHITECT" ? <div className="flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900 dark:bg-amber-400/10 dark:text-amber-200"><Compass size={15} />Architect Authentication</div> : null}<label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">{selectedRole === "ARCHITECT" ? "Enter your Architect Personnel ID" : "Custom Personnel ID"}<span className="ml-1 cursor-help text-zinc-400" title="Must be globally unique across all site personnel">ⓘ</span><input required value={personnelId} onChange={(event) => setPersonnelId(event.target.value)} className={fieldClass(true)} placeholder={selectedRole === "ARCHITECT" ? "e.g., ARCH-001" : "ARCH-001 or QC-LEAD-07"} /></label>{selectedRole === "ARCHITECT" ? <p className="-mt-2 text-xs text-zinc-500">Direct cryptographic match against project credentials</p> : null}{errorMessage ? <ErrorBanner message={errorMessage} /> : null}<div className="flex gap-2"><BackButton onClick={() => setCurrentStep(2)} /><PrimaryButton loading={isLoading}>Verify & Enter Workspace<ArrowRight size={15} /></PrimaryButton></div></form> : null}
      {currentStep === "3B" ? <form onSubmit={submitVisitor} className="space-y-4"><StepPills projectId={projectId} role="CUSTOM VISITOR" /><VisitorInput label="Full Name" value={visitorForm.name} onChange={(value) => setVisitorForm((current) => ({ ...current, name: value }))} required /><VisitorInput label="Email" type="email" value={visitorForm.email} onChange={(value) => setVisitorForm((current) => ({ ...current, email: value }))} required /><VisitorInput label="Phone / WhatsApp" value={visitorForm.phone} onChange={(value) => setVisitorForm((current) => ({ ...current, phone: value }))} required /><VisitorInput label="Organization" value={visitorForm.organization} onChange={(value) => setVisitorForm((current) => ({ ...current, organization: value }))} required /><label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">Purpose of Visit<textarea required value={visitorForm.purpose} onChange={(event) => setVisitorForm((current) => ({ ...current, purpose: event.target.value }))} rows={3} className="mt-1.5 w-full rounded-xl border border-black/[0.08] bg-white px-3 py-2.5 text-sm outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 dark:border-white/[0.1] dark:bg-zinc-950 dark:text-white" /></label>{errorMessage ? <ErrorBanner message={errorMessage} /> : null}<div className="flex gap-2"><BackButton onClick={() => setCurrentStep(2)} /><PrimaryButton loading={isLoading}>Submit Request to Project Owner<ArrowRight size={15} /></PrimaryButton></div></form> : null}
      {currentStep === "WAITING_APPROVAL" ? <div className="space-y-6 text-center"><div className="relative mx-auto grid h-20 w-20 place-items-center"><span className="absolute inset-0 animate-ping rounded-full bg-amber-400/20" /><span className="absolute inset-2 rounded-full border border-amber-400/50" /><span className="absolute inset-5 rounded-full bg-amber-400" /><Clock className="relative z-10 text-amber-950" size={19} /></div><div><h2 className="text-lg font-semibold tracking-tight text-zinc-950 dark:text-white">Request Submitted to Project Architect</h2><p className="mt-2 text-sm leading-6 text-zinc-500 dark:text-zinc-400">Keep this window open. Your clearance will activate automatically when approved.</p></div><div className="rounded-2xl bg-amber-50 p-4 text-left dark:bg-amber-400/10"><div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-700 dark:text-amber-300"><KeyRound size={14} />Assigned Access Token</div><div className="mt-2 break-all font-mono tabular-nums text-sm font-semibold text-amber-950 dark:text-amber-100">{visitorToken}</div></div></div> : null}
    </Panel></div>
  </>;
}

function StepPills({ projectId, role }: { projectId: string; role: string }) { return <div className="flex flex-wrap gap-2"><span className="rounded-lg bg-zinc-100 px-2.5 py-1.5 font-mono tabular-nums text-[10px] text-zinc-700 dark:bg-white/[0.08] dark:text-zinc-200">{projectId}</span><span className="rounded-lg bg-zinc-100 px-2.5 py-1.5 text-[10px] font-semibold text-zinc-700 dark:bg-white/[0.08] dark:text-zinc-200">{role}</span></div>; }
function ErrorBanner({ message }: { message: string }) { return <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-medium text-rose-800"><AlertCircle size={15} className="mt-0.5 shrink-0" />{message}</div>; }
function PrimaryButton({ children, loading }: { children: ReactNode; loading: boolean }) { return <button type="submit" disabled={loading} className="flex h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-xl bg-zinc-900 px-4 text-xs font-medium text-white transition-all hover:bg-zinc-800 active:scale-[0.98] disabled:cursor-wait disabled:opacity-60 dark:bg-white dark:text-zinc-900">{loading ? <><Loader2 size={15} className="animate-spin" />Verifying clearance...</> : children}</button>; }
function BackButton({ onClick }: { onClick: () => void }) { return <button type="button" onClick={onClick} className="flex h-11 items-center justify-center gap-1.5 rounded-xl bg-black/[0.04] px-4 text-xs font-medium text-zinc-700 transition hover:bg-black/[0.07] active:scale-[0.98] dark:bg-white/[0.08] dark:text-zinc-200"><ArrowLeft size={15} />Back</button>; }
function VisitorInput({ label, value, onChange, type = "text", required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean }) { return <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">{label}<input required={required} type={type} value={value} onChange={(event) => onChange(event.target.value)} className={fieldClass()} /></label>; }

export default PersonnelAuthGate;
