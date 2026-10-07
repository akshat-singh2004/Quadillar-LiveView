"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabase";
import { useActiveRole } from "@/context/RoleContext";
import {
    Users,
    UserPlus,
    ShieldCheck,
    CheckCircle2,
    AlertCircle,
    ArrowRight,
    AtSign,
    Trash2,
    Award,
} from "lucide-react";

interface EnrolledStakeholder {
    user_id: string;
    username: string;
    full_name: string;
    role: string;
    trade_package: string;
    can_sign_pour_cards: boolean;
    can_certify_ipc: boolean;
    signing_limit: number;
}

export default function StakeholderEnrolmentPage() {
    const router = useRouter();
    const { project } = useActiveRole();
    const activeProjectId = project?.project_id || project?.id || "";

    const [stakeholders, setStakeholders] = useState<EnrolledStakeholder[]>([]);
    const [targetUsername, setTargetUsername] = useState("");
    const [selectedRole, setSelectedRole] = useState("SEOR");
    const [tradePackage, setTradePackage] = useState("Structural Works");
    const [canSignPour, setCanSignPour] = useState(false);
    const [canCertifyIpc, setCanCertifyIpc] = useState(false);
    const [signingLimit, setSigningLimit] = useState("");

    const [searching, setSearching] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Load existing assigned stakeholders
    useEffect(() => {
        async function loadStakeholders() {
            if (!activeProjectId) return;
            const { data } = await (supabase as any)
                .from("project_stakeholders")
                .select(`
          user_id,
          contractual_role,
          assigned_trade_packages,
          can_sign_pour_cards,
          can_certify_ipc,
          financial_signing_limit,
          user_profiles (username, full_name)
        `)
                .eq("project_id", activeProjectId);

            if (data && data.length > 0) {
                setStakeholders(
                    data.map((row: any) => ({
                        user_id: row.user_id,
                        username: row.user_profiles?.username || "unknown",
                        full_name: row.user_profiles?.full_name || "Unassigned",
                        role: row.contractual_role || "SEOR",
                        trade_package: row.assigned_trade_packages?.[0] || "General",
                        can_sign_pour_cards: Boolean(row.can_sign_pour_cards),
                        can_certify_ipc: Boolean(row.can_certify_ipc),
                        signing_limit: Number(row.financial_signing_limit) || 0,
                    }))
                );
            }
        }
        void loadStakeholders();
    }, [activeProjectId]);

    const handleSearchAndAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!targetUsername.trim()) return;

        setSearching(true);
        setErrorMsg(null);

        try {
            const sanitized = targetUsername.trim().toLowerCase().replace(/^@/, "");

            // 1. Look up user by username
            const { data, error } = await (supabase as any).rpc("get_user_by_username", {
                target_username: sanitized,
            });

            if (error || !data || data.length === 0) {
                setErrorMsg(`User @${sanitized} not found. Ensure they have registered an account.`);
                setSearching(false);
                return;
            }

            const foundUser = data[0];

            // Prevent duplicate assignment
            if (stakeholders.some((s) => s.user_id === foundUser.id)) {
                setErrorMsg(`@${sanitized} is already enrolled in this project.`);
                setSearching(false);
                return;
            }

            const newMember: EnrolledStakeholder = {
                user_id: foundUser.id,
                username: foundUser.username,
                full_name: foundUser.full_name,
                role: selectedRole,
                trade_package: tradePackage,
                can_sign_pour_cards: canSignPour,
                can_certify_ipc: canCertifyIpc,
                signing_limit: parseFloat(signingLimit) || 0,
            };

            setStakeholders((prev) => [...prev, newMember]);
            setTargetUsername("");
            setSigningLimit("");
            setCanSignPour(false);
            setCanCertifyIpc(false);
        } catch (err: any) {
            setErrorMsg(err.message || "Failed to find user.");
        } finally {
            setSearching(false);
        }
    };

    const handleRemove = (userId: string) => {
        setStakeholders((prev) => prev.filter((s) => s.user_id !== userId));
    };

    const handleCommitStakeholders = async () => {
        if (!activeProjectId) {
            setErrorMsg("No active project resolved.");
            return;
        }

        setLoading(true);
        setErrorMsg(null);

        try {
            if (stakeholders.length > 0) {
                const payload = stakeholders.map((s) => ({
                    project_id: activeProjectId,
                    user_id: s.user_id,
                    contractual_role: s.role,
                    assigned_trade_packages: [s.trade_package],
                    can_sign_pour_cards: s.can_sign_pour_cards,
                    can_certify_ipc: s.can_certify_ipc,
                    financial_signing_limit: s.signing_limit,
                    status: "ACTIVE",
                }));

                const { error } = await (supabase as any)
                    .from("project_stakeholders")
                    .upsert(payload, { onConflict: "project_id,user_id" });

                if (error) throw error;
            }

            // Update project stage
            await (supabase as any)
                .from("projects")
                .update({ status: "READY_TO_COMMENCE" })
                .eq("project_id", activeProjectId);

            router.push("/setup/ntp");
        } catch (err: any) {
            setErrorMsg(err.message || "Failed to commit stakeholder assignments.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6 sm:p-10 font-sans">
            <div className="max-w-5xl mx-auto space-y-6">

                {/* HEADER */}
                <div className="border-b border-zinc-800 pb-5">
                    <div className="flex items-center gap-2 text-[11px] font-mono text-cyan-400 font-bold uppercase tracking-wider mb-1">
                        <Users className="w-4 h-4" />
                        <span>Gate 4 • Stakeholder Responsibility Matrix (RACI)</span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
                        Enrol Project Stakeholders &amp; Authorities
                    </h1>
                    <p className="text-xs text-zinc-400 font-mono mt-1">
                        Active Scope: <strong className="text-zinc-200">{project?.project_name || "Unassigned"}</strong> • Assign verified accounts by unique handle to delegate signing authority.
                    </p>
                </div>

                {errorMsg && (
                    <div className="p-3 bg-rose-950/40 border border-rose-800 text-rose-300 text-xs font-mono flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                        <span>{errorMsg}</span>
                    </div>
                )}

                {/* ADD STAKEHOLDER FORM */}
                <form onSubmit={handleSearchAndAdd} className="bg-zinc-900/40 border border-zinc-800 p-6 space-y-4">
                    <div className="text-xs font-mono font-bold uppercase text-zinc-400 border-b border-zinc-800 pb-2 flex justify-between items-center">
                        <span>+ Assign Authority by Handle</span>
                        <span className="text-[10px] text-zinc-500 font-mono">Requires Pre-Registered Profile</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-[11px] font-mono text-zinc-400 mb-1">
                                Unique Handle (@username) <span className="text-cyan-400">*</span>
                            </label>
                            <div className="relative">
                                <AtSign className="absolute left-3 top-2.5 w-4 h-4 text-zinc-600" />
                                <input
                                    type="text"
                                    required
                                    placeholder="username"
                                    value={targetUsername}
                                    onChange={(e) => setTargetUsername(e.target.value)}
                                    className="w-full bg-zinc-950 border border-zinc-800 pl-9 pr-3 py-2 text-xs text-cyan-400 font-mono focus:outline-none focus:border-cyan-500"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-[11px] font-mono text-zinc-400 mb-1">
                                Contractual Role <span className="text-cyan-400">*</span>
                            </label>
                            <select
                                value={selectedRole}
                                onChange={(e) => setSelectedRole(e.target.value)}
                                className="w-full bg-zinc-950 border border-zinc-800 px-3 py-2 text-xs text-zinc-200 focus:outline-none font-mono"
                            >
                                <option value="SEOR">Resident Site Engineer (SEOR)</option>
                                <option value="PMC_LEAD">PMC Project Lead</option>
                                <option value="QS_BILLING">Quantity Surveyor / Billing</option>
                                <option value="SUB_CONTRACTOR">Specialty Trade Contractor</option>
                                <option value="NABL_LAB">NABL Testing Laboratory</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-[11px] font-mono text-zinc-400 mb-1">
                                Assigned Trade Package
                            </label>
                            <input
                                type="text"
                                placeholder="e.g. Structural Concrete / HVAC"
                                value={tradePackage}
                                onChange={(e) => setTradePackage(e.target.value)}
                                className="w-full bg-zinc-950 border border-zinc-800 px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                            />
                        </div>
                    </div>

                    {/* PERMISSIONS STRIP */}
                    <div className="pt-2 grid grid-cols-1 sm:grid-cols-3 gap-4 items-center font-mono text-xs">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={canSignPour}
                                onChange={(e) => setCanSignPour(e.target.checked)}
                            />
                            <span className="text-zinc-300">Authorize Pour Card Sign-Off</span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={canCertifyIpc}
                                onChange={(e) => setCanCertifyIpc(e.target.checked)}
                            />
                            <span className="text-zinc-300">Authorize RA Bill IPC Release</span>
                        </label>

                        <div>
                            <input
                                type="number"
                                placeholder="Financial Limit ₹ (Optional)"
                                value={signingLimit}
                                onChange={(e) => setSigningLimit(e.target.value)}
                                className="w-full bg-zinc-950 border border-zinc-800 px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end pt-1">
                        <button
                            type="submit"
                            disabled={searching}
                            className="px-4 py-2 bg-zinc-900 border border-zinc-700 hover:border-cyan-500 text-cyan-400 font-mono text-xs font-bold transition flex items-center gap-1.5"
                        >
                            <UserPlus className="w-3.5 h-3.5" />
                            <span>{searching ? "Verifying..." : "+ Add to Project Roster"}</span>
                        </button>
                    </div>
                </form>

                {/* ROSTER TABLE */}
                <div className="bg-zinc-900/40 border border-zinc-800 p-6 space-y-4 font-mono text-xs">
                    <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
                        <span className="font-bold text-white uppercase text-xs">
                            Configured Project Authorities ({stakeholders.length})
                        </span>
                        <span className="text-zinc-500 text-[10px]">ISO 19650 Governance RACI</span>
                    </div>

                    {stakeholders.length === 0 ? (
                        <div className="p-8 text-center text-zinc-600 border border-zinc-850">
                            No additional stakeholders enrolled. The Project Creator currently holds primary execution authority.
                        </div>
                    ) : (
                        <div className="overflow-x-auto border border-zinc-800">
                            <table className="w-full text-left font-mono text-xs">
                                <thead className="bg-zinc-900 border-b border-zinc-800 text-[10px] text-zinc-400 uppercase">
                                    <tr>
                                        <th className="p-2.5">User</th>
                                        <th className="p-2.5">Role</th>
                                        <th className="p-2.5">Trade Package</th>
                                        <th className="p-2.5 text-center">Pour Cards</th>
                                        <th className="p-2.5 text-center">IPC Release</th>
                                        <th className="p-2.5 text-right">Limit (INR)</th>
                                        <th className="p-2.5 text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-800/60 bg-zinc-950/40">
                                    {stakeholders.map((s) => (
                                        <tr key={s.user_id}>
                                            <td className="p-2.5">
                                                <span className="text-cyan-400 font-bold block">@{s.username}</span>
                                                <span className="text-zinc-400 text-[11px] font-sans">{s.full_name}</span>
                                            </td>
                                            <td className="p-2.5 text-zinc-300 font-bold">{s.role}</td>
                                            <td className="p-2.5 text-zinc-400">{s.trade_package}</td>
                                            <td className="p-2.5 text-center">
                                                {s.can_sign_pour_cards ? (
                                                    <span className="text-emerald-400 font-bold">YES</span>
                                                ) : (
                                                    <span className="text-zinc-600">NO</span>
                                                )}
                                            </td>
                                            <td className="p-2.5 text-center">
                                                {s.can_certify_ipc ? (
                                                    <span className="text-emerald-400 font-bold">YES</span>
                                                ) : (
                                                    <span className="text-zinc-600">NO</span>
                                                )}
                                            </td>
                                            <td className="p-2.5 text-right text-emerald-400">
                                                {s.signing_limit > 0 ? `₹${s.signing_limit.toLocaleString()}` : "UNLIMITED"}
                                            </td>
                                            <td className="p-2.5 text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemove(s.user_id)}
                                                    className="text-zinc-600 hover:text-rose-400 p-1"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* SUBMIT BUTTON */}
                <div className="flex justify-end pt-2">
                    <button
                        type="button"
                        disabled={loading}
                        onClick={handleCommitStakeholders}
                        className="px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold font-mono text-xs uppercase tracking-wider flex items-center gap-2 transition disabled:opacity-50"
                    >
                        <span>{loading ? "Locking Authority Matrix..." : "Confirm Roster & Proceed to Notice to Proceed"}</span>
                        <ArrowRight className="w-4 h-4" />
                    </button>
                </div>

            </div>
        </main>
    );
}