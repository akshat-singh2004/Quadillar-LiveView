"use client";

import { useEffect, useMemo, useState } from "react";
import { useActiveRole } from "@/context/RoleContext";
import { fetchDashboardSnapshot } from "@/app/lib/services";
import { exportBcfIssuePackage } from "@/lib/bim/bcfExporter";
import { exportOpenDataBundle } from "@/lib/cobie/openDataExporter";
import type { DashboardSnapshot } from "@/types/construction";

export const useCurrentRole = useActiveRole;

interface CommandAction {
  id: string;
  label: string;
  description: string;
  shortcut?: string;
  roles: Array<
    | "Client / Asset Owner"
    | "General Contractor (GC) / Lead Consultant"
    | "Specialty Trade Contractor"
    | "Site Superintendent / Resident Project Engineer"
    | "Architect of Record (AOR) / Structural Engineer of Record (SEOR) / MEP Consultant"
    | "Certified Special Inspector (Third-Party Testing Agency)"
    | "Independent Commissioning Agent (CxA)"
    | "Authority Having Jurisdiction (AHJ) / Municipal Building Official"
    | "Facilities Operations Director / Asset Custodian"
  >;
}

const actions: CommandAction[] = [
  { id: "rfi", label: "Create New Site Query (RFI)", description: "Open a new transmittal and technical clarification workflow.", shortcut: "R", roles: ["General Contractor (GC) / Lead Consultant", "Site Superintendent / Resident Project Engineer", "Architect of Record (AOR) / Structural Engineer of Record (SEOR) / MEP Consultant"] },
  { id: "publish", label: "Promote Document to Published (GFC)", description: "Move a controlled document to the approved site-ready state.", shortcut: "P", roles: ["General Contractor (GC) / Lead Consultant", "Architect of Record (AOR) / Structural Engineer of Record (SEOR) / MEP Consultant"] },
  { id: "cube", label: "Log 7-Day / 28-Day Concrete Cube Test", description: "Capture material quality test records and compressive strength results.", shortcut: "C", roles: ["Certified Special Inspector (Third-Party Testing Agency)", "General Contractor (GC) / Lead Consultant"] },
  { id: "co", label: "Authorize Pending Change Order (Client Only)", description: "Advance approval for contract variation and owner sign-off.", shortcut: "O", roles: ["Client / Asset Owner"] },
  { id: "bcf", label: "Export BCF Issue Package (.bcfzip)", description: "Compile active site issues for Revit, Archicad, and Solibri workflows.", shortcut: "B", roles: ["Architect of Record (AOR) / Structural Engineer of Record (SEOR) / MEP Consultant", "General Contractor (GC) / Lead Consultant"] },
  { id: "cobie", label: "Export ISO 19650 COBie Dataset (.csv)", description: "Generate the open COBie package for downstream CAFM and CMMS systems.", shortcut: "E", roles: ["General Contractor (GC) / Lead Consultant", "Facilities Operations Director / Asset Custodian"] },
  { id: "dpr", label: "Log DPR", description: "Open the Daily Progress Report workspace.", shortcut: "D", roles: ["General Contractor (GC) / Lead Consultant", "Site Superintendent / Resident Project Engineer"] },
  { id: "qr", label: "Scan QR", description: "Open the site QR scanner.", shortcut: "Q", roles: ["General Contractor (GC) / Lead Consultant", "Site Superintendent / Resident Project Engineer", "Specialty Trade Contractor"] },
  { id: "role-architect", label: "Switch Role: Architect", description: "Open the architect portal.", shortcut: "A", roles: ["Client / Asset Owner", "General Contractor (GC) / Lead Consultant"] },
  { id: "dossier", label: "Export Executive Dossier", description: "Open the executive console for pitch export.", shortcut: "X", roles: ["Client / Asset Owner", "General Contractor (GC) / Lead Consultant"] },
];

export function CommandPalette() {
  const { role, project } = useActiveRole();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const roleLabel = (role as any)?.label ?? (typeof role === "string" ? role : "");
  const roleId = (role as any)?.id ?? "";
  const projectId = (project as any)?.project_id || (project as any)?.id || "proj-1";

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((current) => !current);
      }
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedQuery(query), 220);
    return () => window.clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchDashboardSnapshot(projectId);
        setSnapshot(data);
      } catch {
        // Fallback gracefully
      }
    }
    void load();
  }, [projectId]);

  const visibleActions = useMemo(() => {
    return actions.filter((action) => {
      if (!roleLabel && !roleId) return true;
      return (
        action.roles.includes(roleLabel as any) ||
        action.roles.some((r) =>
          r.toLowerCase().includes(roleLabel.toLowerCase()) ||
          (roleId && r.toLowerCase().includes(roleId.toLowerCase()))
        )
      );
    });
  }, [roleLabel, roleId]);

  const searchResults = useMemo(() => {
    if (!snapshot || !debouncedQuery.trim()) return [];
    const normalized = debouncedQuery.trim().toLowerCase();
    const records: Array<{ title: string; type: string; detail: string }> = [];

    snapshot.cdeItems?.forEach((item) => {
      if ([item.title, item.container, item.id].join(" ").toLowerCase().includes(normalized)) {
        records.push({ title: item.title, type: "CDE Document", detail: `${item.state} • ${item.container}` });
      }
    });

    snapshot.rfis?.forEach((item) => {
      if ([item.title, item.id, item.currentOwner, item.ballInCourt].join(" ").toLowerCase().includes(normalized)) {
        records.push({ title: item.title, type: "RFI", detail: `${item.status} • ${item.currentOwner}` });
      }
    });

    snapshot.changeOrders?.forEach((item) => {
      if ([item.title, item.id, item.status].join(" ").toLowerCase().includes(normalized)) {
        records.push({ title: item.title, type: "Change Order", detail: `${item.status} • ${item.amount}` });
      }
    });

    snapshot.materialTests?.forEach((item) => {
      if ([item.grade, item.id, item.status].join(" ").toLowerCase().includes(normalized)) {
        records.push({ title: `${item.grade} Concrete Test`, type: "Material Test", detail: `${item.status} • 28d ${item.twentyEightDayStrength} MPa` });
      }
    });

    snapshot.projectTasks?.forEach((item) => {
      if ([item.title, item.id, item.status, item.discipline].join(" ").toLowerCase().includes(normalized)) records.push({ title: item.title, type: "Schedule Task", detail: `${item.status} • ${item.completionPercent}%` });
    });
    snapshot.workInspectionRequests?.forEach((item) => {
      if ([item.title, item.id, item.wirNumber, item.status, item.targetGridLocation].join(" ").toLowerCase().includes(normalized)) records.push({ title: item.title, type: "WIR Inspection", detail: `${item.status} • ${item.targetGridLocation}` });
    });
    snapshot.facilityAssets?.forEach((item) => {
      if ([item.assetTag, item.assetName, item.id].join(" ").toLowerCase().includes(normalized)) records.push({ title: item.assetName, type: "Team / Asset", detail: item.assetTag });
    });

    return records.slice(0, 8);
  }, [snapshot, debouncedQuery]);

  const runAction = (action: CommandAction) => {
    if (action.id === "bcf") {
      const exportData = exportBcfIssuePackage([
        {
          issueId: "BCF-001",
          title: "MEP coordination conflict at Level 02 corridor",
          description: "Electrical tray intersects HVAC duct at corridor elbow zone.",
          status: "Open",
          discipline: "MEP",
          location: "FL-02 / Corridor 3",
          coordinate: { x: 12.8, y: 15.5, z: 3.2 },
          camera: { viewPointX: 12.8, viewPointY: 16.1, viewPointZ: 5.4, upVectorX: 0, upVectorY: 1, upVectorZ: 0, cameraDirectionX: 0, cameraDirectionY: -0.5, cameraDirectionZ: -1 },
        },
      ]);
      const blob = new Blob([exportData.xml], { type: "application/xml" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = exportData.filename;
      link.click();
      URL.revokeObjectURL(link.href);
    }

    if (action.id === "cobie") {
      const exportData = exportOpenDataBundle(projectId, snapshot?.cdeItems ?? [], snapshot?.submittals ?? []);
      const blob = new Blob([exportData.csv], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "quadillar-open-data-export.csv";
      link.click();
      URL.revokeObjectURL(link.href);
    }

    const routes: Record<string, string> = { dpr: "/site/dpr", qr: "/site/qr", "role-architect": "/portal/architect", dossier: "/executive" };
    if (routes[action.id]) window.location.assign(routes[action.id]);

    setOpen(false);
    setQuery("");
  };

  if (!open) return null;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0, 0, 0, 0.72)", zIndex: 80, display: "grid", placeItems: "center", padding: 20 }} onClick={() => setOpen(false)}>
      <div style={{ width: "min(760px, 92vw)", maxHeight: "78vh", overflow: "hidden", borderRadius: 18, border: "1px solid #404040", background: "#0a0a0a", boxShadow: "0 25px 80px rgba(0,0,0,0.5)" }} onClick={(event) => event.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid #262626", padding: "14px 16px" }}>
          <span style={{ border: "1px solid #404040", borderRadius: 8, padding: "4px 8px", color: "#f5f5f5", fontSize: 12, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>⌘K</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search records, documents, RFIs, COBie assets, tests..."
            autoFocus
            style={{ flex: 1, background: "transparent", border: "none", color: "#f5f5f5", fontSize: 16, outline: "none" }}
          />
        </div>

        <div style={{ maxHeight: "52vh", overflowY: "auto", padding: 12 }}>
          {searchResults.length > 0 || debouncedQuery.trim() ? (
            <div style={{ marginBottom: 12 }}>
              <div style={{ color: "#a3a3a3", fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 8 }}>Global search</div>
              {searchResults.length === 0 ? (
                <div style={{ color: "#d4d4d4", padding: "10px 8px" }}>No matching records found.</div>
              ) : searchResults.map((item) => (
                <button key={`${item.type}-${item.title}`} type="button" onClick={() => setOpen(false)} style={{ width: "100%", textAlign: "left", display: "flex", justifyContent: "space-between", background: "#111111", border: "1px solid #262626", borderRadius: 12, padding: "12px 14px", marginBottom: 8, color: "#f5f5f5", cursor: "pointer" }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{item.title}</div>
                    <div style={{ color: "#a3a3a3", fontSize: 12 }}>{item.type}</div>
                  </div>
                  <div style={{ color: "#d4d4d4", fontSize: 12 }}>{item.detail}</div>
                </button>
              ))}
            </div>
          ) : null}

          <div style={{ color: "#a3a3a3", fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase", marginBottom: 8 }}>Quick actions</div>
          {visibleActions.map((action) => (
            <button key={action.id} type="button" onClick={() => runAction(action)} style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#111111", border: "1px solid #262626", borderRadius: 12, padding: "12px 14px", marginBottom: 8, color: "#f5f5f5", cursor: "pointer", textAlign: "left" }}>
              <div>
                <div style={{ fontWeight: 700 }}>{action.label}</div>
                <div style={{ color: "#a3a3a3", fontSize: 12 }}>{action.description}</div>
              </div>
              {action.shortcut ? <span style={{ border: "1px solid #404040", borderRadius: 8, padding: "4px 8px", fontSize: 11, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>{action.shortcut}</span> : null}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}