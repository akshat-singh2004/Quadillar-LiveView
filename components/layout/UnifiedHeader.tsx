"use client";

import React, { useState, useEffect } from "react";
import { useSidebar } from "@/context/SidebarContext";
import {
  PanelLeftClose,
  PanelLeftOpen,
  FolderKanban,
  ChevronDown,
  LogOut,
  ShieldCheck,
  Search,
} from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import { useRouter } from "next/navigation";

export function UnifiedHeader() {
  const { isExpanded, toggleSidebar } = useSidebar();
  const [projects, setProjects] = useState<any[]>([]);
  const [currentProject, setCurrentProject] = useState<string>("GOMTI-NAGAR-PH1-FITOUT");
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function fetchProjects() {
      const { data } = await (supabase as any)
        .from("projects")
        .select("project_id, project_name")
        .order("created_at", { ascending: false });

      if (data && data.length > 0) {
        setProjects(data);
        setCurrentProject(data[0].project_id);
      }
    }
    void fetchProjects();
  }, []);

  const handleProjectSelect = (id: string) => {
    setCurrentProject(id);
    setMenuOpen(false);
    router.push(`/?project_id=${id}`);
  };

  return (
    <header className="h-14 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md px-4 flex items-center justify-between font-mono text-xs select-none sticky top-0 z-20">
      <div className="flex items-center gap-2">
        {/* Top-Bar Withdrawal / Draw Toggle */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleSidebar();
          }}
          className="p-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer shrink-0 mr-1"
          title={isExpanded ? "Withdraw Sidebar" : "Draw Sidebar"}
          aria-label="Toggle Sidebar"
        >
          {isExpanded ? (
            <PanelLeftClose className="w-4 h-4" />
          ) : (
            <PanelLeftOpen className="w-4 h-4 text-cyan-400" />
          )}
        </button>

        {/* Project Selector Menu */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-900 text-zinc-200 transition cursor-pointer"
          >
            <FolderKanban className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="font-bold truncate max-w-[180px] sm:max-w-xs">{currentProject}</span>
            <ChevronDown className="w-3 h-3 text-zinc-500 shrink-0" />
          </button>

          {menuOpen && (
            <div className="absolute top-full left-0 mt-1 w-64 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl p-1 z-50">
              <div className="text-[10px] text-zinc-500 uppercase px-2 py-1 font-bold">
                Registered Projects
              </div>
              {projects.map((p: any) => (
                <button
                  key={p.project_id}
                  type="button"
                  onClick={() => handleProjectSelect(p.project_id)}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs truncate transition flex items-center justify-between ${
                    currentProject === p.project_id
                      ? "bg-cyan-500/10 text-cyan-300 font-bold"
                      : "text-zinc-300 hover:bg-zinc-900 hover:text-white"
                  }`}
                >
                  <span className="truncate">{p.project_name || p.project_id}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-emerald-400 text-[10px] font-bold uppercase tracking-wider hidden sm:inline-flex items-center gap-1.5">
          <ShieldCheck className="w-3 h-3" />
          <span>RLS Enforced</span>
        </span>
      </div>
    </header>
  );
}

export default UnifiedHeader;
