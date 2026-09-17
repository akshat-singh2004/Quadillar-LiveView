"use client";

export function OperationalReadinessKpis() {
  const active = 3;
  const idle = 1;
  const fleetTotal = active + idle;
  const commissioningSigned = 1;
  const commissioningTotal = 3;
  const readiness = Math.round((commissioningSigned / commissioningTotal) * 100);
  const activeAngle = (active / fleetTotal) * 360;

  return <section className="mt-6 grid gap-3 md:grid-cols-2">
    <div className="surface-shell px-5 py-4"><div className="flex items-center justify-between gap-3"><div><div className="text-[11px] font-medium tracking-[0.14em] text-neutral-400 uppercase">Fleet Operating Efficiency</div><div className="mt-2 text-sm text-neutral-300">Active versus idle heavy machinery</div></div><a href="/site/equipment" className="text-[11px] font-medium tracking-[0.12em] text-sky-300 uppercase no-underline">Open fleet</a></div><div className="mt-4 flex items-center gap-5"><div className="relative h-24 w-24 shrink-0 rounded-full" style={{ background: `conic-gradient(#34d399 0deg ${activeAngle}deg, #f59e0b ${activeAngle}deg 360deg)` }}><div className="absolute inset-[9px] grid place-items-center rounded-full bg-[#09090b] text-xl font-medium text-neutral-100">{Math.round((active / fleetTotal) * 100)}%</div></div><div className="grid gap-2 text-xs"><span className="text-emerald-300">● {active} active</span><span className="text-amber-300">● {idle} idle</span><span className="font-mono text-neutral-500">4 assets reporting</span></div></div></div>
    <div className="surface-shell px-5 py-4"><div className="flex items-center justify-between gap-3"><div><div className="text-[11px] font-medium tracking-[0.14em] text-neutral-400 uppercase">Commissioning Readiness</div><div className="mt-2 text-sm text-neutral-300">MEP test packs signed off</div></div><a href="/quality/commissioning" className="text-[11px] font-medium tracking-[0.12em] text-sky-300 uppercase no-underline">Open T&C</a></div><div className="mt-5 flex items-center gap-4"><div className="text-3xl font-medium tracking-tight text-emerald-300">{readiness}%</div><div className="flex-1"><div className="h-2 overflow-hidden rounded-full bg-white/[0.08]"><div className="h-full rounded-full bg-gradient-to-r from-sky-400 to-emerald-400" style={{ width: `${readiness}%` }} /></div><div className="mt-2 text-[11px] font-mono tracking-[0.08em] text-neutral-500">{commissioningSigned} of {commissioningTotal} certificates witnessed</div></div></div></div>
  </section>;
}