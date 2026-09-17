"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type TenantProfile = { id: string; name: string; logo: string; primary: string; accent: string };
export const tenantProfiles: TenantProfile[] = [
  { id: "quadillar", name: "Quadillar Developments", logo: "QL", primary: "#22d3ee", accent: "#34d399" },
  { id: "apex", name: "Apex Infrastructure", logo: "AI", primary: "#f59e0b", accent: "#f97316" },
  { id: "northstar", name: "Northstar Capital", logo: "NS", primary: "#a78bfa", accent: "#818cf8" },
];
const BrandingContext = createContext<{ tenant: TenantProfile; setTenant: (id: string) => void }>({ tenant: tenantProfiles[0], setTenant: () => undefined });
export function TenantBrandingProvider({ children }: { children: ReactNode }) { const [tenantId, setTenantId] = useState("quadillar"); const tenant = tenantProfiles.find((profile) => profile.id === tenantId) ?? tenantProfiles[0]; useEffect(() => { const stored = window.localStorage.getItem("quadillar-tenant"); if (stored) setTenantId(stored); }, []); useEffect(() => { document.documentElement.style.setProperty("--primary-brand", tenant.primary); document.documentElement.style.setProperty("--accent-brand", tenant.accent); window.localStorage.setItem("quadillar-tenant", tenant.id); }, [tenant]); return <BrandingContext.Provider value={{ tenant, setTenant: setTenantId }}>{children}</BrandingContext.Provider>; }
export function useTenantBranding() { return useContext(BrandingContext); }
