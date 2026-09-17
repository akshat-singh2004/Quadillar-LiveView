"use client";

export function QualityTelemetryWidget() {
  const poured = 184;
  const planned = 240;
  const resolved = 18;
  const open = 7;
  const resolutionRate = Math.round((resolved / (resolved + open)) * 100);

  return <section className="mt-6 grid gap-3 md:grid-cols-2"><div className="surface-shell px-5 py-4"><div className="text-[11px] font-medium tracking-[0.14em] text-neutral-400 uppercase">Today&apos;s Active Concrete Pours</div><div className="mt-3 flex items-end justify-between gap-4"><div className="text-3xl font-medium text-emerald-300">{poured} <span className="text-base text-neutral-500">/ {planned} m³</span></div><span className="text-[11px] font-mono text-neutral-400">{Math.round((poured / planned) * 100)}% executed</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-emerald-400" style={{ width: `${(poured / planned) * 100}%` }} /></div><div className="mt-2 text-[11px] font-mono text-neutral-500">3 live tickets · M30 podium slab</div></div><div className="surface-shell px-5 py-4"><div className="text-[11px] font-medium tracking-[0.14em] text-neutral-400 uppercase">DLP Warranty Ticket Resolution Rate</div><div className="mt-3 flex items-center gap-5"><div className="grid h-20 w-20 place-items-center rounded-full" style={{ background: `conic-gradient(#34d399 ${resolutionRate}%, rgba(255,255,255,.08) 0)` }}><div className="grid h-14 w-14 place-items-center rounded-full bg-neutral-950 text-lg font-medium">{resolutionRate}%</div></div><div className="text-sm text-neutral-300"><div><span className="text-emerald-300">{resolved}</span> resolved</div><div className="mt-1"><span className="text-amber-200">{open}</span> open / verification</div></div></div></div></section>;
}
