"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/app/lib/supabase";
import ImageUploader from "@/app/components/ImageUploader";

export default function ProjectPage() {
  const params = useParams();
  const id = params.id as string;

  const [project, setProject] = useState<any>(null);
  const [updates, setUpdates] = useState<any[]>([]);
  const [images, setImages] = useState<any[]>([]);
  const [milestones, setMilestones] =
  useState<any[]>([]);
  const [members, setMembers] =
  useState<any[]>([]);

const [logs, setLogs] =
  useState<any[]>([]);

const [currentRole, setCurrentRole] =
  useState("");
  const [currentUserId, setCurrentUserId] =
  useState("");
const [memberEmail, setMemberEmail] =
  useState("");
  const [updateText, setUpdateText] = useState("");
  const [progressInput, setProgressInput] =
  useState(0);

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
  .channel("realtime-updates")

  .on(
  "postgres_changes",
  {
    event: "*",
    schema: "public",
    table: "updates",
  },
  async () => {

    await fetchUpdates();

  }
)

  .on(
    "postgres_changes",
    {
      event: "*",
      schema: "public",
      table: "projects",
    },
    () => {
      fetchProject();
    }
  )

  .on(
    "postgres_changes",
    {
      event: "*",
      schema: "public",
      table: "project_members",
    },
    () => {
      fetchMembers();
    }
  )

  .on(
    "postgres_changes",
    {
      event: "*",
      schema: "public",
      table: "project_images",
    },
    () => {
      fetchImages();
    }
  )
.on(
  "postgres_changes",
  {
    event: "*",
    schema: "public",
    table: "activity_logs",
  },
  () => {
    fetchLogs();
  }
)
.on(
  "postgres_changes",
  {
    event: "*",
    schema: "public",
    table: "project_milestones",
  },
  () => {
    fetchMilestones();
  }
)
  .subscribe((status) => {
    console.log("SUB STATUS:", status);
  });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchProject() {
    const { data } = await supabase
      .from("projects")
      .select("*")
      .eq("id", id)
      .single();

    setProject(data);
setProgressInput(data.progress || 0);

return data;
  }

  async function fetchUpdates() {
    const { data } = await supabase
      .from("updates")
      .select("*")
      .eq("project_id", id)
      .order("created_at", { ascending: false });

    if (data) {
      setUpdates(data);
    }
  }

  async function fetchImages() {
    const { data } = await supabase
      .from("project_images")
      .select("*")
      .eq("project_id", id)
      .order("created_at", { ascending: false });

    if (data) {
      setImages(data);
    }
  }
  
  async function fetchMilestones() {

  const { data, error } =
    await supabase
      .from("project_milestones")
      .select("*")
      .eq("project_id", id)
      .order("created_at", {
        ascending: true,
      });

  if (error) {
    console.log(error);
    return;
  }

  setMilestones(data || []);
}
const updateMilestoneProgress = async (
  milestoneId: string,
  progress: number
) => {

  const status =
    progress >= 100
      ? "completed"
      : progress > 0
      ? "in_progress"
      : "pending";

  const { error } = await supabase
    .from("project_milestones")
    .update({
      progress,
      status,
    })
    .eq("id", milestoneId);

  if (error) {
    console.log(error);
    return;
  }
const {
  data: { user },
} = await supabase.auth.getUser();

const milestone =
  milestones.find(
    (m) => m.id === milestoneId
  );

await supabase
  .from("activity_logs")
  .insert([
    {
      project_id: id,
      user_email: user?.email,

      action:
        `updated ${milestone?.title} ` +
        `progress to ${progress}%`,
    },
  ]);
  
};
const assignMilestone = async (
  
  milestoneId: string,
  userId: string
) => {

  const { error } = await supabase
    .from("project_milestones")
    .update({
      assigned_to: userId,
    })
    .eq("id", milestoneId);

  if (error) {
    console.log(error);
    return;
  }

  
};
const approveMilestone = async (
  milestoneId: string
) => {

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("project_milestones")
    .update({
      approved: true,
      approved_by: user?.id,
      approved_at:
        new Date().toISOString(),
    })
    .eq("id", milestoneId);

  if (error) {
    console.log(error);
    return;
  }

  await supabase
    .from("activity_logs")
    .insert([
      {
        project_id: id,
        user_email: user?.email,

        action:
          "approved milestone",
      },
    ]);

  
};
const reopenMilestone = async (
  milestoneId: string
) => {

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
    console.log(error);
    return;
  }

  await supabase
    .from("activity_logs")
    .insert([
      {
        project_id: id,
        user_email: user?.email,

        action:
          "reopened milestone",
      },
    ]);

  
};
  async function fetchMembers() {

  const { data, error } =
    await supabase
      .from("project_members")
      .select(`
  *,
  profiles (
    email
  )
`)
      .eq("project_id", id);

  if (error) {
    console.log(error);
    return;
  }

  const enrichedMembers =
    await Promise.all(

      (data || []).map(
        async (member) => {

          const {
            data: profile,
          } = await supabase
            .from("profiles")
            .select("email")
            .eq("id", member.user_id)
            .single();

          return {
            ...member,
            email: profile?.email,
          };
        }
      )
    );
const {
  data: { user },
} = await supabase.auth.getUser();
setCurrentUserId(user?.id || "");

const currentMember =
  enrichedMembers.find(
    (member) =>
      member.user_id === user?.id
  );

if (project?.owner_id === user?.id) {
  setCurrentRole("owner");
} else {
  setCurrentRole(
    currentMember?.role || "viewer"
  );
}
  setMembers(enrichedMembers);
}
async function fetchLogs() {

  const { data, error } =
    await supabase
      .from("activity_logs")
      .select("*")
      .eq("project_id", id)
      .order("created_at", {
        ascending: false,
      });

  if (error) {
    console.log(error);
    return;
  }

  setLogs(data || []);
}
  const addUpdate = async () => {
  if (!updateText.trim()) return;

  const { error } = await supabase
    .from("updates")
    .insert([
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

await supabase
  .from("activity_logs")
  .insert([
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
    alert("Enter email");
    return;
  }

  const { data: profile, error } =
    await supabase
      .from("profiles")
      .select("*")
      .eq("email", memberEmail)
      .single();

  if (error || !profile) {
    alert("User not found");
    return;
  }

  const { error: memberError } =
    await supabase
  .from("project_members")
  .insert([
    {
      project_id: id,
      user_id: profile.id,
      role: "editor",
    },
  ]);

  if (memberError) {
    alert(memberError.message);
    return;
  }
const {
  data: { user },
} = await supabase.auth.getUser();

await supabase
  .from("activity_logs")
  .insert([
    {
      project_id: id,
      user_email: user?.email,
      action:
        "added member " +
        memberEmail,
    },
  ]);
  alert("Member added");

  setMemberEmail("");
};

const updateProgress = async () => {
  const { error } = await supabase
    .from("projects")
    .update({
      progress: progressInput,
    })
    .eq("id", id);

  if (error) {
    alert(error.message);
    return;
  }

  fetchProject();
  const {
  data: { user },
} = await supabase.auth.getUser();

await supabase
  .from("activity_logs")
  .insert([
    {
      project_id: id,
      user_email: user?.email,
      action:
        "updated progress to " +
        progressInput +
        "%",
    },
  ]);
};
const uploadCoverImage = async (
  event: React.ChangeEvent<HTMLInputElement>
) => {
  try {
    const file = event.target.files?.[0];

    if (!file) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const filePath = `${user.id}/${id}/cover-${Date.now()}-${file.name}`;

    // Upload to storage
    const { error: uploadError } =
      await supabase.storage
        .from("project-images")
        .upload(filePath, file);

    if (uploadError) {
      throw uploadError;
    }

    // Get public URL
    const { data } = supabase.storage
      .from("project-images")
      .getPublicUrl(filePath);

    const imageUrl = data.publicUrl;

    // Save into projects table
    const { error: dbError } = await supabase
      .from("projects")
      .update({
        cover_image: imageUrl,
      })
      .eq("id", id);

    if (dbError) {
      throw dbError;
    }

    fetchProject();
    
await supabase
  .from("activity_logs")
  .insert([
    {
      project_id: id,
      user_email: user?.email,
      action:
        "updated cover image",
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

    // Extract file path from public URL
    const urlParts = imageUrl.split("/project-images/");
    const filePath = urlParts[1];

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from("project-images")
      .remove([filePath]);

    if (storageError) {
      throw storageError;
    }

    // Delete DB row
    const { error: dbError } = await supabase
      .from("project_images")
      .delete()
      .eq("id", image.id);

    if (dbError) {
      throw dbError;
    }

    // Refresh images
    fetchImages();
const {
  data: { user },
} = await supabase.auth.getUser();

await supabase
  .from("activity_logs")
  .insert([
    {
      project_id: id,
      user_email: user?.email,
      action:
        "deleted image " +
        image.file_name,
    },
  ]);
    alert("Image deleted");
  } catch (error) {
    console.error(error);
    alert("Delete failed");
  }
};
  if (!project) {
    return <div className="p-5">Loading...</div>;
  }

  return (
    <div className="p-5">
      {project.cover_image && (
  <img
    src={project.cover_image}
    alt="Cover"
    className="w-full h-72 object-cover rounded mb-5"
  />
)}
      <h1 className="text-3xl font-bold">
        {project.title}
      </h1>

      <div className="mt-3">
  <div>
  <p className="mb-2">
    Progress: {project.progress}%
  </p>

  <div className="w-full h-4 bg-gray-800 rounded">
    <div
      className="h-4 bg-green-500 rounded"
      style={{
        width: `${project.progress}%`,
      }}
    />
  </div>
</div>

  <div className="mt-2 flex gap-2">
    <input
      type="number"
      disabled={
  currentRole !== "owner" &&
  currentRole !== "editor"
}
      value={progressInput}
      onChange={(e) =>
        setProgressInput(
          Number(e.target.value)
        )
      }
      min={0}
      max={100}
      className="border px-3 py-2 bg-black text-white w-24"
    />

    <button
  onClick={updateProgress}
  disabled={
  currentRole !== "owner" &&
  currentRole !== "editor"
}
  className={`px-4 py-2 rounded ${
    currentRole === "owner" ||
currentRole === "editor"
      ? "bg-white text-black"
      : "bg-gray-700 text-gray-400 cursor-not-allowed"
  }`}
>
  Save Progress
</button>
  </div>
</div>
<div className="mt-5">
  <input
    type="file"
    accept="image/*"
    onChange={uploadCoverImage}
  />
</div>
      <div className="mt-5">
  <textarea
    value={updateText}
    onChange={(e) =>
      setUpdateText(e.target.value)
    }
    placeholder="Write project update..."
    className="w-full border border-gray-700 bg-zinc-900 text-white p-3 rounded"
  />

  <button
  onClick={addUpdate}
  disabled={
  currentRole !== "owner" &&
  currentRole !== "editor"
}
  className={`mt-3 px-4 py-2 rounded ${
    currentRole === "owner" ||
currentRole === "editor"
      ? "bg-white text-black"
      : "bg-gray-700 text-gray-400 cursor-not-allowed"
  }`}
>
  Post Update
</button>
</div>
{currentRole === "owner" && (
<div className="mt-5">

  <input
    type="email"
    placeholder="Invite by email"
    value={memberEmail}
    onChange={(e) =>
      setMemberEmail(e.target.value)
    }
    className="border border-gray-700 bg-zinc-900 text-white p-2 rounded"
  />

  <button
    onClick={inviteMember}
    className="ml-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-white"
  >
    Add Member
  </button>

</div>
)}
      {(currentRole === "owner" ||
  currentRole === "editor") && (

  <div className="mt-5">
    <ImageUploader
  projectId={id as string}
  milestones={milestones}
/>
  </div>

)}
<div className="mt-8">

  <h2 className="text-2xl font-bold mb-4">
    Project Milestones
  </h2>

  <div className="flex flex-col gap-3">

    {milestones.map((milestone) => (

      <div
        key={milestone.id}
        className="border border-zinc-700 bg-zinc-900 p-4 rounded"
      >

        <div className="flex justify-between items-center">

          <div>
            <p className="font-semibold">
              {milestone.title}
            </p>

            <p className="text-sm text-gray-400 mt-1">
              {milestone.status}
            </p>
            <p className="text-sm mt-2">

  {milestone.approved
    ? "Approved"
    : "Pending Approval"}

</p>
            <select

disabled={
  currentRole !== "owner" &&
  currentRole !== "editor"
}

  value={milestone.assigned_to || ""}

  onChange={(e) =>
    assignMilestone(
      milestone.id,
      e.target.value
    )
  }

  className="
    mt-3
    bg-zinc-800
    border
    border-zinc-700
    rounded
    px-2
    py-1
    text-sm
  "
>

  <option value="">
    Assign Member
  </option>

  {members.map((member) => (

    <option
  key={member.user_id}
  value={member.user_id}
>
  {member.email}
</option>

  ))}

</select>
{!milestone.approved &&
(
  currentRole === "owner" ||
  currentRole === "editor"
) && (
  <button

    onClick={() =>
      approveMilestone(
        milestone.id
      )
    }

    className="
      mt-3
      bg-green-600
      hover:bg-green-700
      px-3
      py-1
      rounded
      text-sm
    "
  >
    Approve
  </button>
  
)}
{milestone.approved &&
  currentRole === "owner" && (

  <button

    onClick={() =>
      reopenMilestone(
        milestone.id
      )
    }

    className="
      mt-3
      ml-2
      bg-red-600
      hover:bg-red-700
      px-3
      py-1
      rounded
      text-sm
    "
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

  (
    milestone.assigned_to &&
    milestone.assigned_to !== currentUserId &&
    currentRole !== "owner"
  )
}
    value={milestone.progress}
    onBlur={(e) =>
  updateMilestoneProgress(
    milestone.id,
    Number(e.target.value)
  )
}
    className="w-20 bg-zinc-800 border border-zinc-700 rounded px-2 py-1"
  />

  <span>%</span>

</div>

        </div>

        <div className="w-full h-3 bg-gray-800 rounded mt-3">

          <div
            className="h-3 bg-blue-500 rounded"
            style={{
              width: `${milestone.progress}%`,
            }}
          />

        </div>

      </div>

    ))}

  </div>

</div>
<div className="mt-8">
  <h2 className="text-xl font-bold mb-3">
    Team Members
  </h2>

  <div className="flex flex-col gap-3">

    {members.map((member) => (

      <div
        key={member.id}
        className="border border-zinc-700 p-3 rounded bg-zinc-900"
      >

        <div className="flex justify-between items-center">

  <p>
    {member.email}
  </p>

  <p className="text-sm text-gray-400">
    {member.role}
  </p>

</div>
      </div>

    ))}

  </div>
</div>
<div className="mt-8">

  <h2 className="text-2xl font-bold mb-4">
    Activity Feed
  </h2>

  <div className="flex flex-col gap-3">

    {logs.map((log) => (

      <div
        key={log.id}
        className="border border-zinc-700 bg-zinc-900 p-3 rounded"
      >

        <p>
          <span className="font-semibold">
            {log.user_email}
          </span>{" "}
          {log.action}
        </p>

        <p className="text-sm text-gray-400 mt-1">
          {new Date(
            log.created_at
          ).toLocaleString()}
        </p>

      </div>

    ))}

  </div>

</div>
      <div className="mt-6">
        {updates.map((update) => (
          <div
  key={update.id}
  className="border p-3 mb-3"
>
  <p>{update.text}</p>

  <p className="text-sm text-gray-400 mt-2">
    {new Date(
      update.created_at
    ).toLocaleString()}
  </p>
</div>
        ))}
      </div>

      <div className="mt-10">
        <h2 className="text-2xl font-bold mb-4">
          Uploaded Images
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {images.map((image) => (
  <div
    key={image.id}
    className="border p-2"
  >
    <img
      src={image.image_url}
      alt={image.file_name}
      className="w-full rounded"
    />

    <p className="mt-2 text-sm break-all">
      {image.file_name}
    </p>
    {(currentRole === "owner" ||
  currentRole === "editor") && (

  <button
    onClick={() =>
      deleteImage(image)
    }
    className="mt-2 bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-white"
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