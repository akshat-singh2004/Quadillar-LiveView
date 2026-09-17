"use client";

import { useMemo, useState } from "react";
import type { PunchListItem, PunchListStatus } from "@/types/construction";

const tradeOptions = ["Masonry", "Plumbing", "Electrical", "HVAC", "Finishing"] as const;
const priorityOptions = ["High Priority", "Medium", "Low"] as const;
const statusOptions: PunchListStatus[] = ["Open", "In Progress", "Ready for Inspection", "Pending_Reinspection", "Closed"];

type PunchListTableProps = {
  items: PunchListItem[];
  onStatusChange?: (punchItemId: string, nextStatus: PunchListStatus) => void;
  onSelect?: (item: PunchListItem) => void;
};

export function PunchListTable({ items, onStatusChange, onSelect }: PunchListTableProps) {
  const [tradeFilter, setTradeFilter] = useState<string>("All");
  const [priorityFilter, setPriorityFilter] = useState<string>("All");
  const [locationFilter, setLocationFilter] = useState<string>("All");

  const filtered = useMemo(() => {
    return items.filter((item) => {
      const tradeMatch = tradeFilter === "All" || (item.trade ?? "Masonry") === tradeFilter;
      const priorityMatch = priorityFilter === "All" || item.priority === priorityFilter;
      const zoneMatch = locationFilter === "All" || (item.locationZone ?? item.spaceLocationCode) === locationFilter;
      return tradeMatch && priorityMatch && zoneMatch;
    });
  }, [items, tradeFilter, priorityFilter, locationFilter]);

  const zones = useMemo(() => Array.from(new Set(items.map((item) => item.locationZone ?? item.spaceLocationCode))), [items]);

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <select value={tradeFilter} onChange={(event) => setTradeFilter(event.target.value)} style={controlStyle}>
          <option value="All">All trades</option>
          {tradeOptions.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
        <select value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value)} style={controlStyle}>
          <option value="All">All priorities</option>
          {priorityOptions.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
        <select value={locationFilter} onChange={(event) => setLocationFilter(event.target.value)} style={controlStyle}>
          <option value="All">All zones</option>
          {zones.map((zone) => <option key={zone} value={zone}>{zone}</option>)}
        </select>
      </div>

      <div style={{ overflowX: "auto", background: "rgba(15,23,42,0.8)", border: "1px solid rgba(148,163,184,0.18)", borderRadius: 22 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 980 }}>
          <thead>
            <tr style={{ background: "rgba(15,23,42,0.95)" }}>
              {[
                "Item",
                "Trade",
                "Zone",
                "Priority",
                "Status",
                "Assignee",
                "Photo",
                "Action",
              ].map((heading) => (
                <th key={heading} style={{ padding: "14px 16px", textAlign: "left", color: "#94a3b8", fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", borderBottom: "1px solid rgba(148,163,184,0.18)" }}>{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => (
              <tr key={item.punchItemId} style={{ borderBottom: "1px solid rgba(148,163,184,0.12)" }}>
                <td style={{ padding: "14px 16px", color: "#f8fafc", fontWeight: 700, cursor: "pointer" }} onClick={() => onSelect?.(item)}>{item.issueDescription}</td>
                <td style={{ padding: "14px 16px", color: "#e2e8f0" }}>{item.trade ?? item.assignedTaskTeamId}</td>
                <td style={{ padding: "14px 16px", color: "#e2e8f0" }}>{item.locationZone ?? item.spaceLocationCode}</td>
                <td style={{ padding: "14px 16px" }}><span style={{ ...badgeStyle, background: item.priority === "High Priority" ? "rgba(239,68,68,0.12)" : item.priority === "Medium" ? "rgba(245,158,11,0.12)" : "rgba(34,197,94,0.12)", color: item.priority === "High Priority" ? "#fca5a5" : item.priority === "Medium" ? "#fbbf24" : "#86efac" }}>{item.priority}</span></td>
                <td style={{ padding: "14px 16px" }}><span style={{ ...badgeStyle, background: item.status === "Closed" ? "rgba(34,197,94,0.12)" : item.status === "Ready for Inspection" ? "rgba(96,165,250,0.12)" : item.status === "In Progress" ? "rgba(245,158,11,0.12)" : "rgba(239,68,68,0.12)", color: item.status === "Closed" ? "#86efac" : item.status === "Ready for Inspection" ? "#93c5fd" : item.status === "In Progress" ? "#fbbf24" : "#fca5a5" }}>{item.status ?? item.rectificationStatus}</span></td>
                <td style={{ padding: "14px 16px", color: "#e2e8f0" }}>{item.assignee ?? "Site Engineer"}</td>
                <td style={{ padding: "14px 16px" }}>
                  {item.beforePhotoUrl || item.afterPhotoUrl ? (
                    <div style={{ display: "flex", gap: 8 }}>
                      {item.beforePhotoUrl && <img src={item.beforePhotoUrl} alt="Before fix" style={{ width: 38, height: 38, borderRadius: 8, objectFit: "cover" }} />}
                      {item.afterPhotoUrl && <img src={item.afterPhotoUrl} alt="After fix" style={{ width: 38, height: 38, borderRadius: 8, objectFit: "cover" }} />}
                    </div>
                  ) : <span style={{ color: "#94a3b8" }}>No photo</span>}
                </td>
                <td style={{ padding: "14px 16px" }}>
                  <select value={item.status ?? item.rectificationStatus} onChange={(event) => onStatusChange?.(item.punchItemId, event.target.value as PunchListStatus)} style={{ background: "rgba(15,23,42,0.95)", border: "1px solid rgba(148,163,184,0.18)", color: "#f8fafc", borderRadius: 10, padding: "8px 10px" }}>
                    {statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const controlStyle: React.CSSProperties = {
  width: "100%",
  background: "rgba(15,23,42,0.8)",
  border: "1px solid rgba(148,163,184,0.18)",
  borderRadius: 12,
  padding: "10px 12px",
  color: "#f8fafc",
};

const badgeStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  borderRadius: 999,
  padding: "6px 10px",
  fontSize: 10,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  fontWeight: 700,
};
