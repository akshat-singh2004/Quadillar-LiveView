"use client";

import { useMemo, useState } from "react";
import type { PermissionTier, StakeholderMember } from "@/types/construction";

const permissionColors: Record<PermissionTier, string> = {
  "Full Admin": "#a78bfa",
  "Editor / Approver": "#38bdf8",
  "Field Reporter": "#34d399",
  "Read & Comment": "#fbbf24",
};

const defaultMembers: StakeholderMember[] = [
  { id: "member-1", name: "Priya Nair", role: "Project Director", organization: "Client / Asset Owner", packageName: "Portfolio Oversight", permissionTier: "Full Admin", active: true, email: "priya.nair@quadillar.co" },
  { id: "member-2", name: "Arun Mehta", role: "Design Manager", organization: "Architect Studio", packageName: "Facade & MEP Coordination", permissionTier: "Editor / Approver", active: true, email: "arun.mehta@architectstudio.co" },
  { id: "member-3", name: "Sara Ali", role: "Site Engineer", organization: "CoreBuild Contractors", packageName: "Civil & Superstructure", permissionTier: "Field Reporter", active: true, email: "sara.ali@corebuild.in" },
  { id: "member-4", name: "Jonas Reed", role: "QA Manager", organization: "Third-Party Testing", packageName: "Quality & Compliance", permissionTier: "Read & Comment", active: false, email: "jonas.reed@qacorp.net" },
];

export function StakeholderMatrix() {
  const [members, setMembers] = useState<StakeholderMember[]>(defaultMembers);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [newMember, setNewMember] = useState({
    name: "",
    role: "Site Supervisor",
    organization: "Contractor",
    packageName: "Civil & Superstructure",
    permissionTier: "Field Reporter" as PermissionTier,
    email: "",
  });

  const groupSummary = useMemo(() => ({
    active: members.filter((member) => member.active).length,
    total: members.length,
    admin: members.filter((member) => member.permissionTier === "Full Admin").length,
  }), [members]);

  const toggleActive = (id: string) => {
    setMembers((current) => current.map((member) => member.id === id ? { ...member, active: !member.active } : member));
  };

  const updatePermission = (id: string, permissionTier: PermissionTier) => {
    setMembers((current) => current.map((member) => member.id === id ? { ...member, permissionTier } : member));
  };

  const addMember = () => {
    if (!newMember.name.trim() || !newMember.email.trim()) return;
    setMembers((current) => [
      ...current,
      {
        id: `member-${Date.now()}`,
        name: newMember.name,
        role: newMember.role,
        organization: newMember.organization,
        packageName: newMember.packageName,
        permissionTier: newMember.permissionTier,
        active: true,
        email: newMember.email,
      },
    ]);
    setNewMember({ name: "", role: "Site Supervisor", organization: "Contractor", packageName: "Civil & Superstructure", permissionTier: "Field Reporter", email: "" });
    setIsInviteOpen(false);
  };

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ color: "#7dd3fc", fontSize: 12, letterSpacing: "0.16em", textTransform: "uppercase" }}>Stakeholder matrix</div>
          <h2 style={{ margin: "8px 0 0", fontSize: 28 }}>Project team permissions</h2>
        </div>
        <button
          type="button"
          onClick={() => setIsInviteOpen(true)}
          style={{ border: "1px solid rgba(96,165,250,0.38)", background: "rgba(96,165,250,0.12)", color: "#eff6ff", borderRadius: 999, padding: "10px 16px", fontWeight: 800, cursor: "pointer" }}
        >
          Invite Project Stakeholder
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
        <div style={{ background: "rgba(15,23,42,0.8)", border: "1px solid rgba(148,163,184,0.25)", borderRadius: 18, padding: 18 }}>
          <div style={{ color: "#a5f3fc", fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase" }}>Active</div>
          <div style={{ fontSize: 28, fontWeight: 800, marginTop: 8 }}>{groupSummary.active}</div>
        </div>
        <div style={{ background: "rgba(15,23,42,0.8)", border: "1px solid rgba(148,163,184,0.25)", borderRadius: 18, padding: 18 }}>
          <div style={{ color: "#a5f3fc", fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase" }}>Total team</div>
          <div style={{ fontSize: 28, fontWeight: 800, marginTop: 8 }}>{groupSummary.total}</div>
        </div>
        <div style={{ background: "rgba(15,23,42,0.8)", border: "1px solid rgba(148,163,184,0.25)", borderRadius: 18, padding: 18 }}>
          <div style={{ color: "#a5f3fc", fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase" }}>Admins</div>
          <div style={{ fontSize: 28, fontWeight: 800, marginTop: 8 }}>{groupSummary.admin}</div>
        </div>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
          <thead>
            <tr style={{ color: "#a5f3fc", fontSize: 12, letterSpacing: "0.14em", textTransform: "uppercase" }}>
              <th style={{ textAlign: "left", padding: "12px 10px", borderBottom: "1px solid rgba(148,163,184,0.2)" }}>Name</th>
              <th style={{ textAlign: "left", padding: "12px 10px", borderBottom: "1px solid rgba(148,163,184,0.2)" }}>Organization</th>
              <th style={{ textAlign: "left", padding: "12px 10px", borderBottom: "1px solid rgba(148,163,184,0.2)" }}>Package</th>
              <th style={{ textAlign: "left", padding: "12px 10px", borderBottom: "1px solid rgba(148,163,184,0.2)" }}>Access</th>
              <th style={{ textAlign: "left", padding: "12px 10px", borderBottom: "1px solid rgba(148,163,184,0.2)" }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={member.id} style={{ borderBottom: "1px solid rgba(148,163,184,0.12)" }}>
                <td style={{ padding: "12px 10px" }}>
                  <div style={{ fontWeight: 700 }}>{member.name}</div>
                  <div style={{ color: "#94a3b8", fontSize: 12 }}>{member.role}</div>
                </td>
                <td style={{ padding: "12px 10px", color: "#cbd5e1" }}>{member.organization}</td>
                <td style={{ padding: "12px 10px", color: "#cbd5e1" }}>{member.packageName}</td>
                <td style={{ padding: "12px 10px" }}>
                  <select
                    value={member.permissionTier}
                    onChange={(event) => updatePermission(member.id, event.target.value as PermissionTier)}
                    aria-label={`Permission tier for ${member.name}`}
                    style={{ background: `${permissionColors[member.permissionTier]}22`, border: `1px solid ${permissionColors[member.permissionTier]}`, color: permissionColors[member.permissionTier], borderRadius: 999, padding: "6px 10px", fontSize: 11, fontWeight: 800 }}
                  >
                    <option>Full Admin</option>
                    <option>Editor / Approver</option>
                    <option>Field Reporter</option>
                    <option>Read & Comment</option>
                  </select>
                </td>
                <td style={{ padding: "12px 10px" }}>
                  <button
                    type="button"
                    onClick={() => toggleActive(member.id)}
                    style={{
                      border: "1px solid rgba(148,163,184,0.24)",
                      background: member.active ? "rgba(34,197,94,0.16)" : "rgba(239,68,68,0.12)",
                      color: member.active ? "#bbf7d0" : "#fca5a5",
                      borderRadius: 999,
                      padding: "7px 12px",
                      cursor: "pointer",
                      fontWeight: 800,
                    }}
                  >
                    {member.active ? "Active" : "Inactive"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isInviteOpen ? (
        <div style={{ position: "fixed", inset: 0, background: "rgba(2,6,23,0.8)", display: "grid", placeItems: "center", padding: 24, zIndex: 100 }}>
          <div style={{ width: "min(540px, 100%)", background: "#0f172a", border: "1px solid rgba(148,163,184,0.25)", borderRadius: 22, padding: 22 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
              <div>
                <div style={{ color: "#7dd3fc", fontSize: 12, letterSpacing: "0.14em", textTransform: "uppercase" }}>Invite stakeholder</div>
                <h3 style={{ margin: "8px 0 0", fontSize: 26 }}>Add project team member</h3>
              </div>
              <button type="button" onClick={() => setIsInviteOpen(false)} style={{ background: "transparent", border: "none", color: "#e2e8f0", fontSize: 24, cursor: "pointer" }}>✕</button>
            </div>

            <div style={{ display: "grid", gap: 12, marginTop: 18 }}>
              <input value={newMember.name} onChange={(event) => setNewMember((current) => ({ ...current, name: event.target.value }))} placeholder="Full name" style={{ background: "#020817", border: "1px solid rgba(148,163,184,0.25)", borderRadius: 12, padding: "12px 14px", color: "#f8fafc" }} />
              <input value={newMember.email} onChange={(event) => setNewMember((current) => ({ ...current, email: event.target.value }))} placeholder="Email address" style={{ background: "#020817", border: "1px solid rgba(148,163,184,0.25)", borderRadius: 12, padding: "12px 14px", color: "#f8fafc" }} />
              <input value={newMember.role} onChange={(event) => setNewMember((current) => ({ ...current, role: event.target.value }))} placeholder="Role" style={{ background: "#020817", border: "1px solid rgba(148,163,184,0.25)", borderRadius: 12, padding: "12px 14px", color: "#f8fafc" }} />
              <select value={newMember.organization} onChange={(event) => setNewMember((current) => ({ ...current, organization: event.target.value }))} style={{ background: "#020817", border: "1px solid rgba(148,163,184,0.25)", borderRadius: 12, padding: "12px 14px", color: "#f8fafc" }}>
                <option>Client / Asset Owner</option>
                <option>Architect Studio</option>
                <option>CoreBuild Contractors</option>
                <option>Third-Party Testing</option>
              </select>
              <select value={newMember.packageName} onChange={(event) => setNewMember((current) => ({ ...current, packageName: event.target.value }))} style={{ background: "#020817", border: "1px solid rgba(148,163,184,0.25)", borderRadius: 12, padding: "12px 14px", color: "#f8fafc" }}>
                <option>Civil & Superstructure</option>
                <option>MEP & Services</option>
                <option>Finishes & Facade</option>
                <option>Quality & Compliance</option>
              </select>
              <select value={newMember.permissionTier} onChange={(event) => setNewMember((current) => ({ ...current, permissionTier: event.target.value as PermissionTier }))} style={{ background: "#020817", border: "1px solid rgba(148,163,184,0.25)", borderRadius: 12, padding: "12px 14px", color: "#f8fafc" }}>
                <option>Full Admin</option>
                <option>Editor / Approver</option>
                <option>Field Reporter</option>
                <option>Read & Comment</option>
              </select>

              <button type="button" onClick={addMember} style={{ marginTop: 8, border: "1px solid rgba(34,197,94,0.38)", background: "rgba(34,197,94,0.12)", color: "#ecfdf5", borderRadius: 12, padding: "12px 14px", fontWeight: 800, cursor: "pointer" }}>
                Add stakeholder
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
