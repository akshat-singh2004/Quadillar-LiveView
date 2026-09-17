import { VirtualInspectionRoom } from "@/components/site/VirtualInspectionRoom";

export default function VirtualInspectionPage() {
  return (
    <main className="min-h-screen bg-[#09090b] text-neutral-100">
      <div className="mx-auto max-w-7xl px-4 py-8 lg:px-8">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <div className="text-[11px] font-medium tracking-[0.18em] text-neutral-400 uppercase">Telepresence Hub</div>
            <h1 className="mt-2 text-4xl font-medium tracking-tight text-neutral-100">Remote Live Site Inspection Room</h1>
          </div>
          <a href="/dashboard" className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] font-medium tracking-[0.12em] text-neutral-200 uppercase no-underline">
            Back to dashboard
          </a>
        </div>

        <VirtualInspectionRoom
          hostEngineer="A. Mehta"
          remoteInspector="M. Shetty"
          location="North Tower / Level 07"
          durationMinutes={48}
          projectName="Project 01 / Core Shell"
        />
      </div>
    </main>
  );
}
