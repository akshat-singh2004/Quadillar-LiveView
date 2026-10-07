"use server";

import { createClient } from "@/lib/supabase/server";

export interface UserProfileContext {
  id: string;
  email: string | null;
  full_name: string;
  role: string;
  organization_id: string | null;
  organization_name?: string | null;
}

/**
 * Action 1: getActiveUserContext
 * Fetches the authenticated user session and queries public.user_profiles
 * to retrieve their identity and authority role.
 */
export async function getActiveUserContext(): Promise<UserProfileContext | null> {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return null;
  }

  // Query public.user_profiles based on actual JSON schema
  const { data: userProfile, error: profileError } = await supabase
    .from("user_profiles")
    .select("id, full_name, default_role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    console.error("[AUTH ACTION] Error fetching profile:", profileError.message);
  }

  return {
    id: user.id,
    email: user.email ?? null,
    full_name: userProfile?.full_name || user.user_metadata?.full_name || "Authorized User",
    role: userProfile?.default_role || "authenticated",
    organization_id: null,
    organization_name: null,
  };
}

/**
 * Action 2: fetchAuthorizedProjects
 * Queries public.projects with automatic Row-Level Security (RLS) partition filtering.
 * Returns only the projects that the authenticated user or their organization is authorized to view.
 */
export async function fetchAuthorizedProjects() {
  const supabase = await createClient();

  // The projects table uses 'project_id' and 'created_at' based on the schema
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[PROJECT ACTION] Error fetching projects:", error.message);
    return [];
  }

  // Map project_id to id to satisfy existing frontend component types
  return (data ?? []).map((project) => ({
    ...project,
    id: project.project_id,
  }));
}