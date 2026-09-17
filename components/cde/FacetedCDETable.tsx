"use client";

import { useEffect, useMemo, useState } from "react";
import type { CdeItem } from "@/types/construction";
import { canPromoteCdeItem } from "@/lib/workflow/engine";
import { updateCdeItemState } from "@/app/lib/services";

type SortKey = "id" | "revision" | "uniclass" | "timestamp";

type FacetedCDETableProps = {
  items: CdeItem[];
};

const divisionOptions = ["03 Concrete", "05 Metals", "22 Plumbing", "23 HVAC", "26 Electrical"] as const;
const stateOptions = ["WIP", "Shared", "Published", "Archived"] as const;

function inferDivision(item: CdeItem) {
  const text = (item.container + " " + (item.metadata && typeof item.metadata === "object" ? String((item.metadata as any).uniclass ?? "") : "")).toLowerCase();
  if (text.includes("concrete")) return "03 Concrete";
  if (text.includes("metal") || text.includes("steel")) return "05 Metals";
  if (text.includes("plumb") || text.includes("water")) return "22 Plumbing";
  if (text.includes("hvac") || text.includes("mech")) return "23 HVAC";
  if (text.includes("elect") || text.includes("power")) return "26 Electrical";
  return "03 Concrete";
}

function inferDiscipline(item: CdeItem) {
  return item.container.split("/")[1]?.trim() ?? "General";
}

export function FacetedCDETable({ items }: FacetedCDETableProps) {
  const [localItems, setLocalItems] = useState(items);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("timestamp");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [selectedState, setSelectedState] = useState<(typeof stateOptions)[number] | "All">("All");
  const [selectedDivision, setSelectedDivision] = useState<(typeof divisionOptions)[number] | "All">("All");
  const [selectedDiscipline, setSelectedDiscipline] = useState<string>("All");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => setLocalItems(items), [items]);

  const effectiveItems = useMemo(() => {
    const normalized = localItems.filter((item) => {
      const matchesQuery = !search || [item.title, item.id, item.container, item.submittedBy, String((item.metadata as any)?.uniclass ?? "")].join(" ").toLowerCase().includes(search.toLowerCase());
      const matchesState = selectedState === "All" || item.state === selectedState;
      const matchesDivision = selectedDivision === "All" || inferDivision(item) === selectedDivision;
      const matchesDiscipline = selectedDiscipline === "All" || inferDiscipline(item) === selectedDiscipline;
      return matchesQuery && matchesState && matchesDivision && matchesDiscipline;
    });

    const sorted = [...normalized].sort((a, b) => {
      const direction = sortDirection === "asc" ? 1 : -1;

      if (sortKey === "id") return a.id.localeCompare(b.id) * direction;
      if (sortKey === "revision") return (a.revision - b.revision) * direction;
      if (sortKey === "uniclass") {
        const left = String((a.metadata as any)?.uniclass ?? "");
        const right = String((b.metadata as any)?.uniclass ?? "");
        return left.localeCompare(right) * direction;
      }

      return (new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()) * direction;
    });

    return sorted;
  }, [localItems, search, selectedState, selectedDivision, selectedDiscipline, sortKey, sortDirection]);

  const disciplines = useMemo(() => Array.from(new Set(localItems.map(inferDiscipline))), [localItems]);

  const promoteItem = async (item: CdeItem) => {
    const nextState = stateOptions[stateOptions.indexOf(item.state) + 1];
    if (!nextState) return;
    const gate = canPromoteCdeItem({ ...item, status: nextState === "Shared" && item.state === "WIP" ? "InReview" : item.status }, nextState);
    if (!gate.allowed) return;
    const optimistic = { ...item, state: nextState, updatedAt: new Date().toISOString() };
    setLocalItems((current) => current.map((entry) => (entry.id === item.id ? optimistic : entry)));
    const saved = await updateCdeItemState(item.id, nextState, { revision: item.revision, revisionCode: item.revisionCode, status: nextState === "Published" ? "Approved" : nextState === "Shared" ? "InReview" : item.status, approved: nextState === "Published" ? true : item.approved }, { role: "architect", name: "CDE Table" });
    if (!saved) setLocalItems((current) => current.map((entry) => (entry.id === item.id ? item : entry)));
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDirection("desc");
  };

  const toggleSelected = (id: string) => {
    setSelectedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  };

  const handleBatchAction = (mode: "promote" | "manifest" | "archive") => {
    const selected = effectiveItems.filter((item) => selectedIds.includes(item.id));
    if (!selected.length) return;
    console.info(`${mode} selected`, selected.map((item) => item.id));
  };

  return (
    <div style={{ background: "#0a0a0a", border: "1px solid #262626", borderRadius: 18, padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 18 }}>
        <div>
          <div style={{ color: "#a3a3a3", fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase" }}>Document register</div>
          <h3 style={{ margin: "8px 0 0", fontSize: 24, letterSpacing: "-0.04em" }}>Faceted CDE table</h3>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" onClick={() => handleBatchAction("promote")} style={{ background: "#111111", border: "1px solid #404040", borderRadius: 10, color: "#f5f5f5", padding: "8px 12px", cursor: "pointer" }}>Batch promote</button>
          <button type="button" onClick={() => handleBatchAction("manifest")} style={{ background: "#111111", border: "1px solid #404040", borderRadius: 10, color: "#f5f5f5", padding: "8px 12px", cursor: "pointer" }}>Transmittal manifest</button>
          <button type="button" onClick={() => handleBatchAction("archive")} style={{ background: "#111111", border: "1px solid #404040", borderRadius: 10, color: "#f5f5f5", padding: "8px 12px", cursor: "pointer" }}>Archive package</button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search document or code"
          style={{ background: "#0f0f0f", border: "1px solid #404040", borderRadius: 10, padding: "10px 12px", width: 260, color: "#f5f5f5" }}
        />
        <select value={selectedState} onChange={(event) => setSelectedState(event.target.value as any)} style={{ background: "#0f0f0f", border: "1px solid #404040", borderRadius: 10, padding: "10px 12px", color: "#f5f5f5" }}>
          <option value="All">All states</option>
          {stateOptions.map((state) => <option key={state} value={state}>{state}</option>)}
        </select>
        <select value={selectedDivision} onChange={(event) => setSelectedDivision(event.target.value as any)} style={{ background: "#0f0f0f", border: "1px solid #404040", borderRadius: 10, padding: "10px 12px", color: "#f5f5f5" }}>
          <option value="All">All divisions</option>
          {divisionOptions.map((division) => <option key={division} value={division}>{division}</option>)}
        </select>
        <select value={selectedDiscipline} onChange={(event) => setSelectedDiscipline(event.target.value)} style={{ background: "#0f0f0f", border: "1px solid #404040", borderRadius: 10, padding: "10px 12px", color: "#f5f5f5" }}>
          <option value="All">All disciplines</option>
          {disciplines.map((discipline) => <option key={discipline} value={discipline}>{discipline}</option>)}
        </select>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #262626" }}>
              <th style={{ textAlign: "left", padding: "10px 8px", color: "#a3a3a3", fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase" }}>
                <input type="checkbox" checked={selectedIds.length === effectiveItems.length && effectiveItems.length > 0} onChange={() => setSelectedIds(selectedIds.length === effectiveItems.length ? [] : effectiveItems.map((item) => item.id))} />
              </th>
              <th style={{ textAlign: "left", padding: "10px 8px", color: "#a3a3a3", fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase" }}><button type="button" onClick={() => toggleSort("id")} style={{ background: "transparent", border: "none", color: "inherit", cursor: "pointer", font: "inherit" }}>Document ID</button></th>
              <th style={{ textAlign: "left", padding: "10px 8px", color: "#a3a3a3", fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase" }}><button type="button" onClick={() => toggleSort("revision")} style={{ background: "transparent", border: "none", color: "inherit", cursor: "pointer", font: "inherit" }}>Revision</button></th>
              <th style={{ textAlign: "left", padding: "10px 8px", color: "#a3a3a3", fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase" }}><button type="button" onClick={() => toggleSort("uniclass")} style={{ background: "transparent", border: "none", color: "inherit", cursor: "pointer", font: "inherit" }}>Uniclass</button></th>
              <th style={{ textAlign: "left", padding: "10px 8px", color: "#a3a3a3", fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase" }}><button type="button" onClick={() => toggleSort("timestamp")} style={{ background: "transparent", border: "none", color: "inherit", cursor: "pointer", font: "inherit" }}>Updated</button></th>
              <th style={{ textAlign: "left", padding: "10px 8px", color: "#a3a3a3", fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase" }}>State</th>
              <th style={{ padding: "10px 8px" }} />
            </tr>
          </thead>
          <tbody>
            {effectiveItems.map((item) => (
              <tr key={item.id} style={{ borderBottom: "1px solid #171717" }}>
                <td style={{ padding: "12px 8px" }}><input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => toggleSelected(item.id)} /></td>
                <td style={{ padding: "12px 8px", fontWeight: 700 }}>{item.title}</td>
                <td style={{ padding: "12px 8px", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>R{item.revision}</td>
                <td style={{ padding: "12px 8px", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>{String((item.metadata as any)?.uniclass ?? "EF_20_10")}</td>
                <td style={{ padding: "12px 8px", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>{new Date(item.updatedAt).toLocaleString("en-IN")}</td>
                <td style={{ padding: "12px 8px" }}>
                  <span style={{ background: item.state === "Published" ? "#171717" : "#111111", border: "1px solid #404040", color: "#f5f5f5", borderRadius: 999, padding: "5px 8px", fontSize: 11 }}>{item.state}</span>
                </td>
                <td style={{ padding: "12px 8px", textAlign: "right" }}>
                  {stateOptions[stateOptions.indexOf(item.state) + 1] && (
                    <button type="button" onClick={() => void promoteItem(item)} style={{ background: "#f5f5f5", border: "none", borderRadius: 8, color: "#111111", padding: "7px 10px", cursor: "pointer", fontSize: 11, fontWeight: 700 }}>
                      Advance to {stateOptions[stateOptions.indexOf(item.state) + 1]}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
