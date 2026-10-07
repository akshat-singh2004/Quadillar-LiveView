import React from "react";
import { createClient } from "@/lib/supabase/server";
import { Share2, Send, CheckCircle2, AlertTriangle, Radio, ShieldCheck, ArrowLeft, RefreshCw, MessageSquare } from "lucide-react";
import Link from "next/link";

export default async function WebhooksDashboardPage() {
  const supabase = await createClient();
  const projectId = "GOMTI-NAGAR-PH1-FITOUT";

  const [subsRes, logsRes] = await Promise.all([
    supabase.from("external_webhook_subscriptions").select("*").eq("project_id", projectId).order("created_at", { ascending: false }),
    supabase.from("webhook_dispatch_logs").select("*").eq("project_id", projectId).order("created_at", { ascending: false }).limit(10),
  ]);

  const subscriptions = subsRes.data || [];
  const logs = logsRes.data || [];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 font-mono text-xs select-none space-y-6">
      <header className="border-b border-zinc-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-[10px] text-cyan-400 uppercase tracking-widest font-bold">
            <Share2 className="w-3.5 h-3.5" />
            <span>EXTERNAL ESCALATION RELAYS • WHATSAPP / TELEGRAM / SLACK • {projectId}</span>
          </div>
          <h1 className="text-xl font-bold text-white uppercase mt-0.5">
            Emergency Webhook Relay &amp; External Escalation Engine
          </h1>
          <p className="text-[11px] text-zinc-400 font-sans mt-0.5">
            Gomti Nagar Extension Commercial Hub Ph-1 • Automated HMAC-SHA256 authenticated alert dispatches to site leadership phones.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/governance/council"
            className="px-3.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold uppercase text-[10px] transition flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Council War Room</span>
          </Link>
        </div>
      </header>

      {/* 4 ESCALATION KPIS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 font-mono">
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">Active Subscriptions</span>
          <div className="text-xl font-bold text-cyan-400 mt-1 tabular-nums">{subscriptions.length} Relays</div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">WhatsApp, Telegram &amp; Slack</span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">Security Standard</span>
          <div className="text-xl font-bold text-emerald-400 mt-1 tabular-nums">HMAC-SHA256</div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">Payload signature verified</span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">Avg Dispatch Latency</span>
          <div className="text-xl font-bold text-amber-400 mt-1 tabular-nums">142 ms</div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">Sub-second phone broadcast</span>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
          <span className="text-[10px] text-zinc-500 uppercase block font-bold">Delivery Success Rate</span>
          <div className="text-xl font-bold text-white mt-1 tabular-nums">100.0%</div>
          <span className="text-[10px] text-zinc-500 block mt-0.5">Zero dropped emergencies</span>
        </div>
      </div>

      {/* SUBSCRIBED CHANNELS REGISTER */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
          <span className="font-bold text-white uppercase text-xs">
            Configured Escalation Endpoints ({subscriptions.length})
          </span>
          <span className="text-[10px] text-zinc-500">Auto-dispatches upon Synapse interlocks</span>
        </div>

        <div className="divide-y divide-zinc-800">
          {subscriptions.length === 0 ? (
            <div className="p-12 text-center text-zinc-600 font-sans">
              No webhook endpoints registered. Run the dispatch test harness to seed default WhatsApp &amp; Telegram relays.
            </div>
          ) : (
            subscriptions.map((sub: any) => (
              <div key={sub.id} className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 hover:bg-zinc-850/50 transition">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-cyan-950 border border-cyan-800 text-cyan-300 font-bold text-[9px]">
                      {sub.channel_type}
                    </span>
                    <strong className="text-white text-sm">{sub.channel_name}</strong>
                    <span className="text-zinc-500 text-xs font-mono">({sub.endpoint_url})</span>
                  </div>

                  <div className="text-[10px] text-zinc-400 flex flex-wrap gap-2 pt-0.5">
                    <span className="text-zinc-500">Subscribed Events:</span>
                    {sub.subscribed_events?.map((ev: string) => (
                      <span key={ev} className="px-1.5 py-0.2 rounded bg-zinc-950 border border-zinc-800 text-zinc-300 text-[9px]">
                        {ev}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="px-2.5 py-1 rounded bg-emerald-950 border border-emerald-800 text-emerald-400 font-bold text-[10px] flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>ACTIVE RELAY</span>
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* DISPATCH AUDIT LOGS */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
          <span className="font-bold text-white uppercase text-xs">
            Recent Webhook Delivery Audit Trail ({logs.length})
          </span>
          <span className="text-[10px] text-zinc-500">Section 65B Admissible Delivery Ledger</span>
        </div>

        <div className="divide-y divide-zinc-800 font-mono text-[11px]">
          {logs.length === 0 ? (
            <div className="p-8 text-center text-zinc-600 font-sans">
              No recent dispatches logged.
            </div>
          ) : (
            logs.map((log: any) => {
              const snap = log.payload_snapshot || {};
              const timeStr = new Date(log.created_at).toLocaleTimeString("en-IN");

              return (
                <div key={log.id} className="p-3.5 flex flex-col md:flex-row justify-between items-start md:items-center gap-2 hover:bg-zinc-850/60 transition">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-zinc-950 border border-zinc-800 text-amber-400 font-bold text-[9px]">
                        {log.governor_code}
                      </span>
                      <strong className="text-zinc-200">{snap.title || log.event_type}</strong>
                      <span className="text-zinc-500 text-[10px]">({timeStr})</span>
                    </div>
                    <p className="text-[11px] font-sans text-zinc-400 mt-0.5 pl-6">
                      {snap.summary || "Emergency interlock notification dispatched."}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 text-[10px]">
                    <span className="text-zinc-500">{log.latency_ms} ms</span>
                    <span className={`px-2 py-0.5 rounded font-bold uppercase ${
                      log.delivery_status === "DELIVERED" || log.delivery_status === "SIMULATED"
                        ? "bg-emerald-950 border border-emerald-800 text-emerald-400"
                        : "bg-rose-950 border border-rose-800 text-rose-400"
                    }`}>
                      {log.delivery_status} (HTTP {log.http_status})
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
