"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useDemoContext } from "@/context/DemoContext";
import { PORTAL_LABELS, resolvePortalWindow } from "@/lib/auth/portalGate";
import { tenantProfiles, useTenantBranding } from "@/context/TenantBrandingContext";

const portalButtons = [
  { key: "client", label: "Client Executive Window", href: "/portal/client" },
  { key: "architect", label: "Architect Command Center", href: "/portal/architect" },
  { key: "contractor", label: "Contractor Execution Hub", href: "/portal/contractor" },
] as const;

export function PortalHeader() {
  const pathname = usePathname();
  const activePortal = resolvePortalWindow(pathname);
  const { isDemoMode, toggleDemoMode } = useDemoContext();
  const { tenant, setTenant } = useTenantBranding();

  const handleSeed = async () => {
    try {
      await fetch("/api/seed", { method: "POST" });
      window.location.reload();
    } catch (error) {
      console.error("Seed failed", error);
    }
  };

  return (
    <div style={{ position: "sticky", top: 0, zIndex: 40, background: "rgba(9,9,11,0.82)", borderBottom: "1px solid rgba(255,255,255,0.06)", backdropFilter: "blur(24px)" }}>
      <div style={{ maxWidth: 1440, margin: "0 auto", padding: "12px 22px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ color: "var(--primary-brand)", fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase" }}>{tenant.logo} · {tenant.name}</div>
            <div style={{ fontWeight: 500, color: "#f5f5f5", marginTop: 4, letterSpacing: "-0.03em" }}>{PORTAL_LABELS[activePortal]}</div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <select value={tenant.id} onChange={(event) => setTenant(event.target.value)} aria-label="Switch tenant" style={{ background: "rgba(255,255,255,0.05)", color: "#f5f5f5", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 999, padding: "8px 12px" }}>
              {tenantProfiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}
            </select>
            <button
              type="button"
              onClick={toggleDemoMode}
              style={{
                background: isDemoMode ? "rgba(251,191,36,0.14)" : "rgba(34,197,94,0.12)",
                color: "#f5f5f5",
                border: `1px solid ${isDemoMode ? "rgba(251,191,36,0.4)" : "rgba(34,197,94,0.32)"}`,
                borderRadius: 999,
                padding: "9px 14px",
                fontWeight: 800,
                cursor: "pointer",
                boxShadow: isDemoMode ? "0 0 0 1px rgba(251,191,36,0.22), 0 0 22px rgba(251,191,36,0.18)" : "0 0 0 1px rgba(34,197,94,0.15), 0 0 18px rgba(34,197,94,0.12)",
              }}
            >
              {isDemoMode ? "[⚡ DEMO / PITCH MODE]" : "[🟢 LIVE TELEMETRY]"}
            </button>

            <button
              type="button"
              onClick={handleSeed}
              style={{
                background: "rgba(255,255,255,0.05)",
                color: "#f5f5f5",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 999,
                padding: "8px 14px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Seed full project demo
            </button>

            {portalButtons.map((button) => {
              const isActive = activePortal === button.key;
              return (
                <Link
                  key={button.key}
                  href={button.href}
                  style={{
                    textDecoration: "none",
                    borderRadius: 999,
                    padding: "8px 12px",
                    fontWeight: 500,
                    border: `1px solid ${isActive ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.06)"}`,
                    background: isActive ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.02)",
                    color: isActive ? "#f5f5f5" : "#d4d4d4",
                  }}
                >
                  {button.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
