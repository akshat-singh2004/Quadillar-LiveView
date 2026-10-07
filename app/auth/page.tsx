"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/app/lib/supabase";
import { ShieldCheck, AlertTriangle, ArrowRight, Lock, CheckCircle2 } from "lucide-react";

export default function AuthPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMessage("Please enter both email and password.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password: password.trim(),
      });

      if (authError) {
        throw authError;
      }

      const user = authData?.user;
      if (user) {
        try {
          await (supabase as any).from("user_profiles").upsert([
            {
              id: user.id,
              full_name: user.email?.split("@")[0] || "Authorized User",
              default_role: "architect",
              email: user.email,
            },
          ]);
        } catch (profileErr) {
          console.warn("[AUTH] Profile table upsert notice:", profileErr);
        }
      }

      setSuccessMessage("Account created successfully. Redirecting to workspace...");
      setTimeout(() => router.push("/dashboard"), 1000);
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to create account. Verify Supabase Auth settings.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMessage("Please provide email and password.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });

      if (error) {
        throw error;
      }

      setSuccessMessage("Authentication verified. Loading LiveView dashboard...");
      setTimeout(() => router.push("/dashboard"), 800);
    } catch (err: any) {
      setErrorMessage(err?.message || "Invalid credentials or network timeout.");
    } finally {
      setIsLoading(false);
    }
  };

  // Immediate Dev / Demo Access Bypass
  const handleDemoBypass = () => {
    setIsLoading(true);
    setSuccessMessage("Demo Session Authorized: Project Director Role Granted.");
    setTimeout(() => {
      router.push("/dashboard");
    }, 600);
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-4 font-mono">
      <div className="bg-zinc-900/90 border border-zinc-800 p-8 rounded-2xl w-full max-w-sm flex flex-col gap-5 shadow-2xl backdrop-blur-sm">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Lock className="w-3.5 h-3.5" />
            <span>Quadillar LiveView</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            Enterprise Site Telemetry
          </h1>
          <p className="text-[11px] text-zinc-500 font-sans mt-0.5">
            Statutory Construction &amp; Engineering Gateway
          </p>
        </div>

        {errorMessage && (
          <div className="p-3 bg-rose-950/40 border border-rose-800/80 text-rose-300 text-xs flex items-center gap-2 rounded">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3 bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2 rounded">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        <form className="space-y-3">
          <div>
            <label className="text-[10px] text-zinc-400 block mb-1 uppercase font-semibold">User Email</label>
            <input
              type="email"
              placeholder="engineer@quadillar.com"
              disabled={isLoading}
              className="w-full p-2.5 rounded bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-cyan-500 disabled:opacity-50"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="text-[10px] text-zinc-400 block mb-1 uppercase font-semibold">Security Password</label>
            <input
              type="password"
              placeholder="••••••••••••"
              disabled={isLoading}
              className="w-full p-2.5 rounded bg-zinc-950 border border-zinc-800 text-xs text-white focus:outline-none focus:border-cyan-500 disabled:opacity-50"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="pt-2 space-y-2">
            <button
              type="submit"
              disabled={isLoading}
              onClick={handleLogin}
              className="w-full bg-cyan-500 hover:bg-cyan-400 text-zinc-950 p-2.5 rounded text-xs font-bold uppercase tracking-wider transition disabled:opacity-50"
            >
              {isLoading ? "Authenticating..." : "Authorize & Sign In"}
            </button>

            <button
              type="button"
              disabled={isLoading}
              onClick={handleSignup}
              className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 p-2.5 rounded text-xs font-bold uppercase tracking-wider transition disabled:opacity-50"
            >
              Register Engineer Account
            </button>
          </div>
        </form>

        <div className="border-t border-zinc-800 pt-3">
          <button
            type="button"
            onClick={handleDemoBypass}
            className="w-full py-2 bg-emerald-950/40 hover:bg-emerald-950/70 border border-emerald-800/80 text-emerald-400 text-[11px] font-bold uppercase rounded flex items-center justify-center gap-1.5 transition"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Instant Demo / Dev Access &rarr;</span>
          </button>
        </div>
      </div>
    </main>
  );
}
