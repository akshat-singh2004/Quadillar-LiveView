// app/dashboard/project/[id]/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/app/lib/supabase";
import ImageUploader from "@/app/components/ImageUploader";

export default function ProjectPage() {
  const params = useParams();
  const id = params.id as string;

  const [project, setProject] = useState<any>(null);
  const [updates, setUpdates] = useState<any[]>([]);
  const [images, setImages] = useState<any[]>([]);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);

  const [currentRole, setCurrentRole] = useState("");
  const [currentUserId, setCurrentUserId] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [updateText, setUpdateText] = useState("");
  const [progressInput, setProgressInput] = useState(0);

  const fetchProject = useCallback(async () => {
    const { data } = await supabase
      .from("projects")
      .select("*")
      .eq("id", id)
      .single();

    if (data) {
      setProject(data);
      setProgressInput(data.progress || 0);
    }
    return data;
  }, [id]);

  const fetchUpdates = useCallback(async () => {
    const { data } = await supabase
      .from("updates")
      .select("*")
      .eq("project_id", id)
      .order("created_at", { ascending: false });

    if (data) {
      setUpdates(data);
    }
  }, [id]);

  const fetchImages = useCallback(async () => {
    const { data } = await supabase
      .from("project_images")
      .select("*")
      .eq("project_id", id)
      .order("created_at", { ascending: false });

    if (data) {
      setImages(data);
    }
  }, [id]);

  const fetchMilestones = useCallback(async () => {
    const { data, error } = await supabase
      .from("project_milestones")
      .select("*")
      .eq("project_id", id)
      .order("created_at", { ascending: true });

    if (error) {
      console.error(error);
      return;
    }

    setMilestones(data || []);
  }, [id]);

  const fetchMembers = useCallback(async () => {
    const { data, error } = await supabase
      .from("project_members")
      .select("*")
      .eq("project_id", id);

    if (error) {
      console.error(error);
      return;
    }

    // Map through user_profiles instead of deprecated profiles table
    const enrichedMembers = await Promise.all(
      (data || []).map(async (member) => {
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("id, full_name, default_role")
          .eq("id", member.user_id)
          .maybeSingle();

        return {
          ...member,
          email: profile?.full_name || member.user_id.slice(0, 8),
          role: member.role || profile?.default_role || "viewer",
        };
      })
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || "");

    const currentMember = enrichedMembers.find(
      (member) => member.user_id === user?.id
    );

    if (project?.owner_id === user?.id) {
      setCurrentRole("owner");
    } else {
      setCurrentRole(currentMember?.role || "viewer");
    }
    setMembers(enrichedMembers);
  }, [id, project?.owner_id]);

  const fetchLogs = useCallback(async () => {
    const { data, error } = await supabase
      .from("activity_logs")
      .select("*")
      .eq("project_id", id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      return;
    }

    setLogs(data || []);
  }, [id]);

  useEffect(() => {
    const initialize = async () => {
      await fetchProject();
      await fetchUpdates();
      await fetchImages();
      await fetchMilestones();
      await fetchMembers();
      await fetchLogs();
    };

    initialize();

    const channel = supabase
      .channel(`project-realtime-${id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "updates" },
        () => fetchUpdates()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "projects" },
        () => fetchProject()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "project_members" },
        () => fetchMembers()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "project_images" },
        () => fetchImages()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "activity_logs" },
        () => fetchLogs()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "project_milestones" },
        () => fetchMilestones()
      )
      .subscribe((status) => {
        console.log("SUB STATUS:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, fetchProject, fetchUpdates, fetchImages, fetchMilestones, fetchMembers, fetchLogs]);

  const updateMilestoneProgress = async (milestoneId: string, progress: number) => {
    const status =
      progress >= 100
        ? "completed"
        : progress > 0
          ? "in_progress"
          : "pending";

    const { error } = await supabase
      .from("project_milestones")
      .update({ progress, status })
      .eq("id", milestoneId);

    if (error) {
      console.error(error);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const milestone = milestones.find((m) => m.id === milestoneId);

    await supabase.from("activity_logs").insert([
      {
        project_id: id,
        user_email: user?.email,
        action: `updated ${milestone?.title || "milestone"} progress to ${progress}%`,
      },
    ]);
  };

  const assignMilestone = async (milestoneId: string, userId: string) => {
    const { error } = await supabase
      .from("project_milestones")
      .update({ assigned_to: userId })
      .eq("id", milestoneId);

    if (error) {
      console.error(error);
    }
  };

  const approveMilestone = async (milestoneId: string) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase
      .from("project_milestones")
      .update({
        approved: true,
        approved_by: user?.id,
        approved_at: new Date().toISOString(),
      })
      .eq("id", milestoneId);

    if (error) {
      console.error(error);
      return;
    }

    await supabase.from("activity_logs").insert([
      {
        project_id: id,
        user_email: user?.email,
        action: "approved milestone",
      },
    ]);
  };

  const reopenMilestone = async (milestoneId: string) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase
      .from("project_milestones")
      .update({
        approved: false,
        approved_by: null,
        approved_at: null,
      })
      .eq("id", milestoneId);

    if (error) {
      console.error(error);
      return;
    }

    await supabase.from("activity_logs").insert([
      {
        project_id: id,
        user_email: user?.email,
        action: "reopened milestone",
      },
    ]);
  };

  const addUpdate = async () => {
    if (!updateText.trim()) return;

    const { error } = await supabase.from("updates").insert([
      {
        project_id: id,
        text: updateText,
      },
    ]);

    if (error) {
      alert(error.message);
      return;
    }

    setUpdateText("");
    const {
      data: { user },
    } = await supabase.auth.getUser();

    await supabase.from("activity_logs").insert([
      {
        project_id: id,
        user_email: user?.email,
        action: "posted an update",
      },
    ]);
    fetchUpdates();
  };

  const inviteMember = async () => {
    if (!memberEmail.trim()) {
      alert("Enter user name or ID");
      return;
    }

    // Safely query user_profiles by UUID or full_name
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      memberEmail.trim()
    );

    let profileQuery = supabase
      .from("user_profiles")
      .select("id, full_name, default_role");

    if (isUuid) {
      profileQuery = profileQuery.eq("id", memberEmail.trim());
    } else {
      profileQuery = profileQuery.ilike("full_name", `%${memberEmail.trim()}%`);
    }

    const { data: profile, error } = await profileQuery.maybeSingle();

    if (error || !profile) {
      alert("User profile not found in user_profiles register.");
      return;
    }

    const { error: memberError } = await supabase.from("project_members").insert([
      {
        project_id: id,
        user_id: profile.id,
        role: profile.default_role || "editor",
      },
    ]);

    if (memberError) {
      alert(memberError.message);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    await supabase.from("activity_logs").insert([
      {
        project_id: id,
        user_email: user?.email,
        action: `added member ${profile.full_name || memberEmail}`,
      },
    ]);
    alert("Member added successfully");

    setMemberEmail("");
    fetchMembers();
  };

  const updateProgress = async () => {
    const { error } = await supabase
      .from("projects")
      .update({ progress: progressInput })
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    fetchProject();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    await supabase.from("activity_logs").insert([
      {
        project_id: id,
        user_email: user?.email,
        action: `updated progress to ${progressInput}%`,
      },
    ]);
  };

  const uploadCoverImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0];
      if (!file) return;

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const filePath = `${user.id}/${id}/cover-${Date.now()}-${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from("project-images")
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage
        .from("project-images")
        .getPublicUrl(filePath);

      const imageUrl = data.publicUrl;

      const { error: dbError } = await supabase
        .from("projects")
        .update({ cover_image: imageUrl })
        .eq("id", id);

      if (dbError) {
        throw dbError;
      }

      fetchProject();

      await supabase.from("activity_logs").insert([
        {
          project_id: id,
          user_email: user?.email,
          action: "updated cover image",
        },
      ]);

      alert("Cover image updated");
    } catch (error) {
      console.error(error);
      alert("Upload failed");
    }
  };

  const deleteImage = async (image: any) => {
    try {
      const imageUrl = image.image_url;
      const urlParts = imageUrl.split("/project-images/");
      const filePath = urlParts[1];

      const { error: storageError } = await supabase.storage
        .from("project-images")
        .remove([filePath]);

      if (storageError) {
        throw storageError;
      }

      const { error: dbError } = await supabase
        .from("project_images")
        .delete()
        .eq("id", image.id);

      if (dbError) {
        throw dbError;
      }

      fetchImages();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      await supabase.from("activity_logs").insert([
        {
          project_id: id,
          user_email: user?.email,
          action: `deleted image ${image.file_name}`,
        },
      ]);
      alert("Image deleted");
    } catch (error) {
      console.error(error);
      alert("Delete failed");
    }
  };

  if (!project) {
    return <div className="p-5 font-mono text-zinc-400">Loading project...</div>;
  }

  return (
    <div className="p-5 font-sans">
      {project.cover_image && (
        <img
          src={project.cover_image}
          alt="Cover"
          className="w-full h-72 object-cover rounded mb-5"
        />
      )}
      <h1 className="text-3xl font-bold font-mono tracking-tight text-zinc-100">
        {project.project_name || project.title || "Project Overview"}
      </h1>

      <div className="mt-3">
        <div>
          <p className="mb-2 font-mono text-xs text-zinc-400">
            Progress: {project.progress || 0}%
          </p>

          <div className="w-full h-4 bg-gray-800 rounded">
            <div
              className="h-4 bg-emerald-500 rounded transition-all duration-300"
              style={{
                width: `${project.progress || 0}%`,
              }}
            />
          </div>
        </div>

        <div className="mt-2 flex gap-2 font-mono text-xs">
          <input
            type="number"
            disabled={currentRole !== "owner" && currentRole !== "editor"}
            value={progressInput}
            onChange={(e) => setProgressInput(Number(e.target.value))}
            min={0}
            max={100}
            className="border border-zinc-700 px-3 py-2 bg-black text-white w-24 rounded focus:outline-none"
          />

          <button
            onClick={updateProgress}
            disabled={currentRole !== "owner" && currentRole !== "editor"}
            className={`px-4 py-2 rounded font-bold uppercase tracking-wider ${currentRole === "owner" || currentRole === "editor"
                ? "bg-white text-black hover:bg-zinc-200"
                : "bg-gray-700 text-gray-400 cursor-not-allowed"
              }`}
          >
            Save Progress
          </button>
        </div>
      </div>

      <div className="mt-5 font-mono text-xs">
        <input
          type="file"
          accept="image/*"
          onChange={uploadCoverImage}
          className="text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-zinc-800 file:text-zinc-200 hover:file:bg-zinc-700"
        />
      </div>

      <div className="mt-5">
        <textarea
          value={updateText}
          onChange={(e) => setUpdateText(e.target.value)}
          placeholder="Write project update..."
          className="w-full border border-gray-700 bg-zinc-900 text-white p-3 rounded font-mono text-xs focus:outline-none focus:border-zinc-500"
        />

        <button
          onClick={addUpdate}
          disabled={currentRole !== "owner" && currentRole !== "editor"}
          className={`mt-3 px-4 py-2 rounded font-mono text-xs font-bold uppercase tracking-wider ${currentRole === "owner" || currentRole === "editor"
              ? "bg-white text-black hover:bg-zinc-200"
              : "bg-gray-700 text-gray-400 cursor-not-allowed"
            }`}
        >
          Post Update
        </button>
      </div>

      {currentRole === "owner" && (
        <div className="mt-5 font-mono text-xs">
          <input
            type="text"
            placeholder="Invite member by name or UUID"
            value={memberEmail}
            onChange={(e) => setMemberEmail(e.target.value)}
            className="border border-gray-700 bg-zinc-900 text-white p-2 rounded focus:outline-none focus:border-zinc-500 w-72"
          />

          <button
            onClick={inviteMember}
            className="ml-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-white font-bold uppercase tracking-wider"
          >
            Add Member
          </button>
        </div>
      )}

      {(currentRole === "owner" || currentRole === "editor") && (
        <div className="mt-5">
          <ImageUploader projectId={id} milestones={milestones} />
        </div>
      )}

      <div className="mt-8 font-mono">
        <h2 className="text-xl font-bold mb-4 text-zinc-100">Project Milestones</h2>

        <div className="flex flex-col gap-3 text-xs">
          {milestones.map((milestone) => (
            <div
              key={milestone.id}
              className="border border-zinc-700 bg-zinc-900 p-4 rounded"
            >
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-semibold text-zinc-200">{milestone.title}</p>
                  <p className="text-sm text-gray-400 mt-1 uppercase">{milestone.status}</p>
                  <p className="text-sm mt-2 text-zinc-300">
                    {milestone.approved ? "Approved ✓" : "Pending Approval"}
                  </p>

                  <select
                    disabled={currentRole !== "owner" && currentRole !== "editor"}
                    value={milestone.assigned_to || ""}
                    onChange={(e) => assignMilestone(milestone.id, e.target.value)}
                    className="mt-3 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-sm text-zinc-100 focus:outline-none"
                  >
                    <option value="">Assign Member</option>
                    {members.map((member) => (
                      <option key={member.user_id} value={member.user_id}>
                        {member.email}
                      </option>
                    ))}
                  </select>

                  {!milestone.approved &&
                    (currentRole === "owner" || currentRole === "editor") && (
                      <button
                        onClick={() => approveMilestone(milestone.id)}
                        className="mt-3 ml-2 bg-emerald-600 hover:bg-emerald-700 px-3 py-1 rounded text-sm text-white font-bold"
                      >
                        Approve
                      </button>
                    )}

                  {milestone.approved && currentRole === "owner" && (
                    <button
                      onClick={() => reopenMilestone(milestone.id)}
                      className="mt-3 ml-2 bg-rose-600 hover:bg-rose-700 px-3 py-1 rounded text-sm text-white font-bold"
                    >
                      Reopen
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    disabled={
                      milestone.approved ||
                      currentRole === "viewer" ||
                      (milestone.assigned_to &&
                        milestone.assigned_to !== currentUserId &&
                        currentRole !== "owner")
                    }
                    defaultValue={milestone.progress || 0}
                    onBlur={(e) =>
                      updateMilestoneProgress(milestone.id, Number(e.target.value))
                    }
                    className="w-20 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-right text-zinc-100 tabular-nums"
                  />
                  <span className="text-zinc-400">%</span>
                </div>
              </div>

              <div className="w-full h-3 bg-gray-800 rounded mt-3">
                <div
                  className="h-3 bg-blue-500 rounded"
                  style={{
                    width: `${milestone.progress || 0}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 font-mono">
        <h2 className="text-xl font-bold mb-3 text-zinc-100">Team Members</h2>

        <div className="flex flex-col gap-3 text-xs">
          {members.map((member) => (
            <div
              key={member.id}
              className="border border-zinc-700 p-3 rounded bg-zinc-900 flex justify-between items-center"
            >
              <p className="text-zinc-200 font-semibold">{member.email}</p>
              <p className="text-xs text-zinc-400 uppercase tracking-wider">{member.role}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 font-mono">
        <h2 className="text-xl font-bold mb-4 text-zinc-100">Activity Feed</h2>

        <div className="flex flex-col gap-3 text-xs">
          {logs.map((log) => (
            <div
              key={log.id}
              className="border border-zinc-700 bg-zinc-900 p-3 rounded"
            >
              <p className="text-zinc-200">
                <span className="font-semibold text-emerald-400">{log.user_email}</span>{" "}
                {log.action}
              </p>
              <p className="text-[10px] text-zinc-500 mt-1">
                {new Date(log.created_at).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 font-mono text-xs">
        {updates.map((update) => (
          <div key={update.id} className="border border-zinc-800 bg-zinc-950 p-3 mb-3">
            <p className="text-zinc-200">{update.text}</p>
            <p className="text-[10px] text-zinc-500 mt-2">
              {new Date(update.created_at).toLocaleString()}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-10 font-mono">
        <h2 className="text-xl font-bold mb-4 text-zinc-100">Uploaded Images</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {images.map((image) => (
            <div key={image.id} className="border border-zinc-800 p-2 bg-zinc-900">
              <img
                src={image.image_url}
                alt={image.file_name}
                className="w-full h-48 object-cover rounded"
              />
              <p className="mt-2 text-xs break-all text-zinc-400">{image.file_name}</p>
              {(currentRole === "owner" || currentRole === "editor") && (
                <button
                  onClick={() => deleteImage(image)}
                  className="mt-2 bg-rose-600 hover:bg-rose-700 px-3 py-1 rounded text-white text-xs font-bold uppercase"
                >
                  Delete
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}