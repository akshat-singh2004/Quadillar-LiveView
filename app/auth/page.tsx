"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Globe, KeyRound, ArrowRight, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

export default function AuthGatewayPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [fullName, setFullName] = useState("");
  const [firmName, setFirmName] = useState("Quadillar Architectural & EPC Studio");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatusMsg(null);

    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName, firm_name: firmName } },
        });
        if (error) throw error;
        localStorage.setItem(
          "quadillar-user-profile-v1",
          JSON.stringify({ email, fullName: fullName || email.split("@")[0], firmName })
        );
        router.push("/workspace");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        localStorage.setItem(
          "quadillar-user-profile-v1",
          JSON.stringify({ email, fullName: email.split("@")[0], firmName })
        );
        router.push("/workspace");
      }
    } catch (err: any) {
      setStatusMsg(err?.message || "Authentication failed — check credentials or use Google OAuth.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleOAuth = async () => {
    setLoading(true);
    setStatusMsg(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/workspace` },
      });
      if (error) throw error;
    } catch (err: any) {
      setStatusMsg(err?.message || "Google OAuth redirect unavailable in local mode.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-4 font-mono">
      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 bg-zinc-900/75 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl">
        {/* Left Brand & Cross-Device Architecture Column */}
        <div className="lg:col-span-5 bg-zinc-950 p-6 md:p-8 border-b lg:border-b-0 lg:border-r border-zinc-800 flex flex-col justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-[10px] font-bold text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" />
              CROSS-DEVICE CLOUD IDENTITY
            </div>
            <h1 className="text-2xl font-bold text-white mt-4 tracking-tight">
              QUADILLAR LIVEVIEW
            </h1>
            <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
              Unified Construction Operating System. Sign in once across desktop, site tablet, or VR terminal to manage BIM models, Project Tokens, and Digital-to-Physical Payment Benchmarks.
            </p>
          </div>

          <div className="flex flex-col gap-2.5 text-[11px] text-zinc-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Universal OAuth2 & JWT Credentials across devices</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Cryptographic Project Token & Tender Endorsement</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Digital BIM Benchmarks coupled to RA Escrow</span>
            </div>
          </div>
        </div>

        {/* Right Sign-In / Sign-Up Form */}
        <div className="lg:col-span-7 p-6 md:p-8 flex flex-col justify-center gap-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setMode("signin")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  mode === "signin"
                    ? "bg-zinc-100 text-zinc-950"
                    : "bg-zinc-950 text-zinc-400 border border-zinc-800"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setMode("signup")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  mode === "signup"
                    ? "bg-zinc-100 text-zinc-950"
                    : "bg-zinc-950 text-zinc-400 border border-zinc-800"
                }`}
              >
                Create Principal Account
              </button>
            </div>
            <span className="text-[10px] text-zinc-500">SSO / JWT SYNC</span>
          </div>

          <button
            type="button"
            onClick={handleGoogleOAuth}
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl bg-zinc-950 hover:bg-zinc-900 border border-zinc-700 text-zinc-100 font-bold text-xs flex items-center justify-center gap-2 transition"
          >
            <Globe className="w-4 h-4 text-emerald-400" />
            Continue with Google Workspace / OAuth
          </button>

          <form onSubmit={handleEmailAuth} className="flex flex-col gap-3 text-xs">
            {mode === "signup" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] text-zinc-400 uppercase font-bold">Full Name</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Ar. Akshat Singh Rathore"
                    className="mt-1 w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-100 outline-none focus:border-zinc-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-zinc-400 uppercase font-bold">
                    Firm / Organization
                  </label>
                  <input
                    type="text"
                    required
                    value={firmName}
                    onChange={(e) => setFirmName(e.target.value)}
                    className="mt-1 w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-100 outline-none focus:border-zinc-500"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-[10px] text-zinc-400 uppercase font-bold">
                Work Email (Cross-Device Credential)
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="principal@quadillar.com"
                className="mt-1 w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-100 outline-none focus:border-zinc-500"
              />
            </div>

            <div>
              <label className="text-[10px] text-zinc-400 uppercase font-bold">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="mt-1 w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-zinc-100 outline-none focus:border-zinc-500"
              />
            </div>

            {statusMsg && (
              <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 text-[11px]">
                {statusMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-zinc-100 hover:bg-white text-zinc-950 font-bold text-xs flex items-center justify-center gap-2 transition"
            >
              <KeyRound className="w-4 h-4" />
              {mode === "signup" ? "Create Account & Enter Studio" : "Sign In to Studio"}
            </button>
          </form>

          <div className="pt-2 border-t border-zinc-800 flex items-center justify-between text-[11px]">
            <span className="text-zinc-500">Presenting live without email verification?</span>
            <button
              type="button"
              onClick={() => {
                localStorage.setItem(
                  "quadillar-user-profile-v1",
                  JSON.stringify({
                    email: "principal@quadillar.com",
                    fullName: "Principal Architect",
                    firmName: "Quadillar ConTech Pvt. Ltd.",
                  })
                );
                router.push("/workspace");
              }}
              className="text-emerald-400 font-bold hover:underline inline-flex items-center gap-1"
            >
              Enter Workspace Hub <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
