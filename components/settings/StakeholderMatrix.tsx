"use client";

import React, { useState } from "react";
import {
  UserPlus,
  Shield,
  ShieldCheck,
  ShieldAlert,
  FileCheck,
  AlertTriangle,
  X,
  Search,
  CheckCircle2,
  Clock,
  Ban,
  Filter,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Type Definitions
// ---------------------------------------------------------------------------

export type StakeholderStatus = "Active" | "Pending" | "Suspended";

export interface StakeholderRecord {
  id: string;
  name: string;
  organization: string;
  role: string;
  statutoryId: string;
  status: StakeholderStatus;
  joinedDate: string;
  email: string;
}

// ---------------------------------------------------------------------------
// Initial Operational Mock Dataset
// ---------------------------------------------------------------------------

const INITIAL_STAKEHOLDERS: StakeholderRecord[] = [
  {
    id: "STK-001",
    name: "Akshat Singh Rathore",
    organization: "Quadillar ConTech Pvt. Ltd. (Lucknow)",
    role: "Director / Principal Architect",
    statutoryId: "CoA: CA/2026/89412 • CIN: U74200UP2026PTC",
    status: "Active",
    joinedDate: "2026-01-15",
    email: "akshat@quadillar.com",
  },
  {
    id: "STK-002",
    name: "Aryan Singh",
    organization: "Quadillar ConTech Pvt. Ltd. (Lucknow)",
    role: "Director / Commercial Lead",
    statutoryId: "GSTIN: 09AABCQ8421K1Z2 • DIN: 09842135",
    status: "Active",
    joinedDate: "2026-01-15",
    email: "aryan@quadillar.com",
  },
  {
    id: "STK-003",
    name: "Ar. Sunita Malhotra",
    organization: "Malhotra & Associates Studio (New Delhi)",
    role: "Principal Architect",
    statutoryId: "CoA: CA/2012/54890",
    status: "Active",
    joinedDate: "2026-02-01",
    email: "s.malhotra@malhotra-arch.in",
  },
  {
    id: "STK-004",
    name: "Er. R. Singhania",
    organization: "Singhania Infra Projects (Kanpur)",
    role: "General Contractor (EPC Lead)",
    statutoryId: "GSTIN: 09AAACS4128D1Z9",
    status: "Active",
    joinedDate: "2026-02-10",
    email: "singhania@infraprojects.co.in",
  },
  {
    id: "STK-005",
    name: "Client Finance Desk",
    organization: "Uttar Pradesh Housing Board (U.P. CIC)",
    role: "Client Representative",
    statutoryId: "TAN: LKNP01248G • CIN: L45201UP",
    status: "Pending",
    joinedDate: "2026-03-04",
    email: "finance.cic@uphb.gov.in",
  },
  {
    id: "STK-006",
    name: "Er. Vikramaditya Verma",
    organization: "Verma Geotechnical & QA Lab (Lucknow)",
    role: "Resident Engineer (IS:456 QMS)",
    statutoryId: "NABL: TC-8412/2026",
    status: "Active",
    joinedDate: "2026-03-12",
    email: "v.verma@vermaqalab.com",
  },
  {
    id: "STK-007",
    name: "Rajeshwar Dayal",
    organization: "Apex Facades & Glazing Ltd. (Noida)",
    role: "Specialist Subcontractor",
    statutoryId: "GSTIN: 09AABCA9912F1Z8",
    status: "Suspended",
    joinedDate: "2026-01-20",
    email: "r.dayal@apexfacades.com",
  },
];

// ---------------------------------------------------------------------------
// Interactive Client Component: StakeholderMatrix
// ---------------------------------------------------------------------------

export function StakeholderMatrix() {
  const [stakeholders, setStakeholders] = useState<StakeholderRecord[]>(INITIAL_STAKEHOLDERS);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [isProvisionModalOpen, setIsProvisionModalOpen] = useState(false);
  const [auditTarget, setAuditTarget] = useState<StakeholderRecord | null>(null);

  // Form State for Provisioning
  const [formData, setFormData] = useState({
    name: "",
    organization: "",
    location: "Lucknow",
    role: "Principal Architect",
    statutoryId: "",
    email: "",
    status: "Active" as StakeholderStatus,
  });

  const filteredStakeholders = stakeholders.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.organization.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.statutoryId.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === "ALL" ? true : item.status.toUpperCase() === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleRevoke = (id: string) => {
    setStakeholders((prev) =>
      prev.map((s) => {
        if (s.id === id) {
          const newStatus: StakeholderStatus = s.status === "Suspended" ? "Active" : "Suspended";
          return { ...s, status: newStatus };
        }
        return s;
      })
    );
  };

  const handleAudit = (stakeholder: StakeholderRecord) => {
    setAuditTarget(stakeholder);
  };

  const handleProvisionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.organization.trim()) return;

    const fullOrg = formData.location
      ? `${formData.organization.trim()} (${formData.location.trim()})`
      : formData.organization.trim();

    const newRecord: StakeholderRecord = {
      id: `STK-${String(stakeholders.length + 1).padStart(3, "0")}`,
      name: formData.name.trim(),
      organization: fullOrg,
      role: formData.role.trim(),
      statutoryId: formData.statutoryId.trim() || "PENDING_VERIFICATION",
      status: formData.status,
      joinedDate: new Date().toISOString().split("T")[0],
      email: formData.email.trim(),
    };

    setStakeholders((prev) => [newRecord, ...prev]);
    setFormData({
      name: "",
      organization: "",
      location: "Lucknow",
      role: "Principal Architect",
      statutoryId: "",
      email: "",
      status: "Active",
    });
    setIsProvisionModalOpen(false);
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800">
      {/* Table Action Bar & Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between px-5 py-4 border-b border-zinc-800/50 gap-4">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-100 font-mono">
            Multi-Tenant Stakeholder Directory &amp; Credential Matrix
          </h2>
          <p className="text-xs text-zinc-400 font-mono mt-0.5">
            Role-Based Access Control (RBAC) &amp; Statutory Identity Verification Ledger
          </p>
        </div>

        {/* Action Gateway: Provision New Stakeholder */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsProvisionModalOpen(true)}
            className="bg-zinc-100 text-zinc-950 hover:bg-zinc-300 font-bold uppercase tracking-wider text-xs px-4 py-2.5 flex items-center gap-2 transition-colors cursor-pointer shadow-none font-mono"
          >
            <UserPlus className="h-4 w-4" />
            <span>Provision New Stakeholder</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Utility Bar */}
      <div className="px-5 py-3 border-b border-zinc-800/50 bg-zinc-950/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
        <div className="relative flex-1 max-w-md">
          <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, organization, statutory ID..."
            className="w-full bg-zinc-900 border border-zinc-800 pl-9 pr-3 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-zinc-600 font-mono"
          />
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setStatusFilter("ALL")}
            className={`px-3 py-1 border transition-colors cursor-pointer ${
              statusFilter === "ALL"
                ? "bg-zinc-800 text-zinc-100 border-zinc-600 font-bold"
                : "bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-zinc-200"
            }`}
          >
            All ({stakeholders.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("ACTIVE")}
            className={`px-3 py-1 border transition-colors cursor-pointer ${
              statusFilter === "ACTIVE"
                ? "bg-emerald-950/60 text-emerald-400 border-emerald-800 font-bold"
                : "bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-zinc-200"
            }`}
          >
            Active ({stakeholders.filter((s) => s.status === "Active").length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("PENDING")}
            className={`px-3 py-1 border transition-colors cursor-pointer ${
              statusFilter === "PENDING"
                ? "bg-amber-950/60 text-amber-400 border-amber-800 font-bold"
                : "bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-zinc-200"
            }`}
          >
            Pending ({stakeholders.filter((s) => s.status === "Pending").length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("SUSPENDED")}
            className={`px-3 py-1 border transition-colors cursor-pointer ${
              statusFilter === "SUSPENDED"
                ? "bg-rose-950/60 text-rose-400 border-rose-800 font-bold"
                : "bg-zinc-950 text-zinc-400 border-zinc-800 hover:text-zinc-200"
            }`}
          >
            Suspended ({stakeholders.filter((s) => s.status === "Suspended").length})
          </button>
        </div>
      </div>

      {/* Main Borderless Dense Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-zinc-800/60 bg-zinc-950/60 text-[11px] text-zinc-500 font-mono uppercase tracking-wider">
              <th className="py-2.5 px-4 font-normal text-left whitespace-nowrap">Stakeholder Name</th>
              <th className="py-2.5 px-4 font-normal text-left">Organization &amp; Location</th>
              <th className="py-2.5 px-4 font-normal text-left">Role &amp; Clearance</th>
              <th className="py-2.5 px-4 font-normal text-left whitespace-nowrap">Statutory ID</th>
              <th className="py-2.5 px-4 font-normal text-center whitespace-nowrap">System Status</th>
              <th className="py-2.5 px-4 font-normal text-right whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50 text-xs font-mono">
            {filteredStakeholders.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-zinc-500 font-mono text-xs">
                  No stakeholders match the specified filter query.
                </td>
              </tr>
            ) : (
              filteredStakeholders.map((s) => {
                const isActive = s.status === "Active";
                const isPending = s.status === "Pending";
                const isSuspended = s.status === "Suspended";

                return (
                  <tr
                    key={s.id}
                    className={`transition-colors ${
                      isSuspended
                        ? "bg-rose-950/20 hover:bg-rose-950/30"
                        : "hover:bg-zinc-800/20"
                    }`}
                  >
                    {/* STAKEHOLDER NAME (text-zinc-100) */}
                    <td className="py-3 px-4 text-left whitespace-nowrap">
                      <div className="font-semibold text-zinc-100 text-xs">
                        {s.name}
                      </div>
                      <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
                        {s.email || s.id}
                      </div>
                    </td>

                    {/* ORGANIZATION & LOCATION (text-zinc-400) */}
                    <td className="py-3 px-4 text-left text-zinc-400">
                      <div className="line-clamp-1">{s.organization}</div>
                    </td>

                    {/* ROLE & CLEARANCE */}
                    <td className="py-3 px-4 text-left whitespace-nowrap">
                      <span className="px-2 py-0.5 bg-zinc-950 border border-zinc-800 text-zinc-300 text-[11px] font-mono">
                        {s.role}
                      </span>
                    </td>

                    {/* STATUTORY ID (mono) */}
                    <td className="py-3 px-4 text-left whitespace-nowrap font-mono text-xs text-zinc-300">
                      <span className="text-zinc-400 select-all">{s.statutoryId}</span>
                    </td>

                    {/* SYSTEM STATUS (semantic dots: emerald Active, amber Pending, rose Suspended) */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-mono border uppercase tracking-wider font-bold ${
                          isActive
                            ? "bg-emerald-950/50 border-emerald-800 text-emerald-400"
                            : isPending
                            ? "bg-amber-950/50 border-amber-800 text-amber-400"
                            : "bg-rose-950/50 border-rose-800 text-rose-400"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            isActive
                              ? "bg-emerald-500"
                              : isPending
                              ? "bg-amber-500 animate-pulse"
                              : "bg-rose-500"
                          }`}
                        />
                        {s.status}
                      </span>
                    </td>

                    {/* ACTIONS (Matte buttons: 'Revoke', 'Audit') */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2 font-mono text-[11px]">
                        <button
                          type="button"
                          onClick={() => handleAudit(s)}
                          className="bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-2.5 py-1 border border-zinc-700 uppercase font-semibold transition-colors cursor-pointer"
                        >
                          Audit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRevoke(s.id)}
                          className={`px-2.5 py-1 border uppercase font-semibold transition-colors cursor-pointer ${
                            isSuspended
                              ? "bg-emerald-950/60 hover:bg-emerald-900 border-emerald-700 text-emerald-400"
                              : "bg-rose-950/60 hover:bg-rose-900 border-rose-800 text-rose-400"
                          }`}
                        >
                          {isSuspended ? "Restore" : "Revoke"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Directory Ledger Footer */}
      <div className="px-5 py-3 border-t border-zinc-800/50 bg-zinc-950/50 text-[11px] text-zinc-500 font-mono flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-zinc-400">Active (Verified KYC)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            <span className="text-zinc-400">Pending Attestation</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-rose-500" />
            <span className="text-zinc-400">Revoked / Suspended</span>
          </span>
        </div>
        <span>HSM Directory Hash: SECP256K1-AUTH-VALIDATED</span>
      </div>

      {/* ===================================================================
          MODAL: Provision New Stakeholder
          =================================================================== */}
      {isProvisionModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-100 font-mono">
                  Provision New Project Stakeholder
                </h3>
                <p className="text-xs text-zinc-400 font-mono mt-0.5">
                  Multi-Tenant RBAC Identity Issuance (ISO 19650-2 Protocol)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsProvisionModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-100 p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleProvisionSubmit} className="p-5 space-y-4 font-mono text-xs">
              <div>
                <label className="block text-zinc-400 text-[11px] uppercase tracking-wider mb-1">
                  Full Stakeholder Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Ar. Raghav Sharma"
                  className="w-full bg-zinc-950 border border-zinc-800 px-3 py-2 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 text-[11px] uppercase tracking-wider mb-1">
                    Organization *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.organization}
                    onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                    placeholder="e.g., Apex Structural LLP"
                    className="w-full bg-zinc-950 border border-zinc-800 px-3 py-2 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 text-[11px] uppercase tracking-wider mb-1">
                    Location / Branch
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="e.g., Lucknow"
                    className="w-full bg-zinc-950 border border-zinc-800 px-3 py-2 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 text-[11px] uppercase tracking-wider mb-1">
                    Role &amp; Clearance *
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 px-3 py-2 text-zinc-100 focus:outline-none focus:border-zinc-600 font-mono"
                  >
                    <option value="Director / Principal Architect">Director / Principal Architect</option>
                    <option value="Director / Commercial Lead">Director / Commercial Lead</option>
                    <option value="Principal Architect">Principal Architect</option>
                    <option value="General Contractor (EPC Lead)">General Contractor (EPC Lead)</option>
                    <option value="Client Representative">Client Representative</option>
                    <option value="Resident Engineer (IS:456 QMS)">Resident Engineer (IS:456 QMS)</option>
                    <option value="Specialist Subcontractor">Specialist Subcontractor</option>
                    <option value="Billing Surveyor">Billing Surveyor</option>
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-400 text-[11px] uppercase tracking-wider mb-1">
                    Initial System Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as StakeholderStatus })}
                    className="w-full bg-zinc-950 border border-zinc-800 px-3 py-2 text-zinc-100 focus:outline-none focus:border-zinc-600 font-mono"
                  >
                    <option value="Active">Active</option>
                    <option value="Pending">Pending Verification</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-zinc-400 text-[11px] uppercase tracking-wider mb-1">
                  Statutory ID (CoA, GSTIN, CIN, DIN) *
                </label>
                <input
                  type="text"
                  required
                  value={formData.statutoryId}
                  onChange={(e) => setFormData({ ...formData, statutoryId: e.target.value })}
                  placeholder="e.g., CoA: CA/2026/12345 • GSTIN: 09..."
                  className="w-full bg-zinc-950 border border-zinc-800 px-3 py-2 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 font-mono"
                />
              </div>

              <div>
                <label className="block text-zinc-400 text-[11px] uppercase tracking-wider mb-1">
                  Official Email Address
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="name@organization.com"
                  className="w-full bg-zinc-950 border border-zinc-800 px-3 py-2 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 font-mono"
                />
              </div>

              <div className="pt-3 border-t border-zinc-800 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsProvisionModalOpen(false)}
                  className="px-4 py-2 border border-zinc-700 bg-zinc-800 text-zinc-300 hover:text-zinc-100 uppercase tracking-wider text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-zinc-100 hover:bg-zinc-300 text-zinc-950 uppercase tracking-wider text-xs font-bold cursor-pointer"
                >
                  Confirm Provisioning
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================
          MODAL: Audit Verification Inspection
          =================================================================== */}
      {auditTarget && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-100 font-mono">
                  Cryptographic Audit Inspection
                </h3>
                <p className="text-xs text-zinc-400 font-mono mt-0.5">
                  Tenant Member: {auditTarget.id}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAuditTarget(null)}
                className="text-zinc-400 hover:text-zinc-100 p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-3 font-mono text-xs">
              <div className="bg-zinc-950 p-3 border border-zinc-800 space-y-2">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Signatory:</span>
                  <span className="text-zinc-200 font-bold">{auditTarget.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Designation:</span>
                  <span className="text-zinc-300">{auditTarget.role}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Organization:</span>
                  <span className="text-zinc-300">{auditTarget.organization}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Statutory Proof:</span>
                  <span className="text-emerald-400 font-bold">{auditTarget.statutoryId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Authorization Status:</span>
                  <span className={auditTarget.status === "Active" ? "text-emerald-400" : "text-amber-400"}>
                    {auditTarget.status.toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="text-[11px] text-zinc-400 space-y-1">
                <div className="flex justify-between">
                  <span>Provisioned Timestamp:</span>
                  <span className="text-zinc-300">{auditTarget.joinedDate} 09:30:00 UTC</span>
                </div>
                <div className="flex justify-between">
                  <span>Hardware Key ID:</span>
                  <span className="text-zinc-300">YubiKey 5-NFC [HSM-LKO]</span>
                </div>
                <div className="flex justify-between">
                  <span>SHA-256 Ledger Digest:</span>
                  <span className="text-zinc-500 truncate max-w-[180px]">
                    0x7e8b...912a
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-zinc-800 flex justify-end">
                <button
                  type="button"
                  onClick={() => setAuditTarget(null)}
                  className="px-4 py-2 bg-zinc-100 hover:bg-zinc-300 text-zinc-950 uppercase tracking-wider text-xs font-bold cursor-pointer"
                >
                  Dismiss Audit View
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default StakeholderMatrix;
