"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<any[]>([]);
  const [title, setTitle] = useState("");
const [search, setSearch] = useState("");
  useEffect(() => {
  checkUser();
  fetchProjects();

  const channel = supabase
    .channel("projects-realtime")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "projects",
      },
      () => {
        fetchProjects();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, []);

  const checkUser = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      window.location.href = "/auth";
    } else {
      setLoading(false);
    }
  };

 const fetchProjects = async () => {

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  const {
    data: memberships,
    error: membershipError,
  } = await supabase
    .from("project_members")
    .select("project_id")
    .eq("user_id", user.id);

  console.log("MEMBERSHIPS:", memberships);
  console.log("MEMBERSHIP ERROR:", membershipError);

  if (membershipError) {
    return;
  }

  const projectIds =
    memberships.map(
      (m) => m.project_id
    );

  console.log("PROJECT IDS:", projectIds);

  const {
    data,
    error,
  } = await supabase
    .from("projects")
    .select("*")
    .in("id", projectIds);

  console.log("PROJECT DATA:", data);
  console.log("PROJECT ERROR:", error);

  if (error) {
    return;
  }

  setProjects(data || []);
};

  const createProject = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!title.trim()) {
  alert("Project title required");
  return;
}

    const { data, error } = await supabase
  .from("projects")
  .insert([
    {
      title,
      user_id: user?.id,
    },
  ])
  .select()
  .single();

if (error) {
  alert(error.message);
  return;
}

await supabase
  .from("project_members")
  .insert([
    {
  project_id: data.id,
  user_id: user?.id,
  role: "owner",
},
  ]);

    setTitle("");
fetchProjects();
  };
const handleLogout = async () => {
  await supabase.auth.signOut();
  window.location.href = "/auth";
};
const deleteProject = async (
  projectId: string
) => {
  const confirmed = confirm(
    "Delete this project?"
  );

  if (!confirmed) return;

  await supabase
  .from("project_members")
  .delete()
  .eq("project_id", projectId);

const { error } = await supabase
  .from("projects")
  .delete()
  .eq("id", projectId);

  if (error) {
    alert(error.message);
    return;
  }

  fetchProjects();
};
  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div style={{ padding: "20px" }}>
   <div
  style={{
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "30px",
  }}
>
  <div>
    <h1
      style={{
        fontSize: "32px",
        fontWeight: "bold",
        marginBottom: "8px",
      }}
    >
      Quadillar LiveView
    </h1>

    <p style={{ color: "#888" }}>
      Realtime Construction Tracking
    </p>
  </div>

  <button
    onClick={handleLogout}
    style={{
      background: "#111",
      color: "white",
      border: "1px solid #333",
      padding: "10px 18px",
      borderRadius: "8px",
      cursor: "pointer",
    }}
  >
    Logout
  </button>
</div>

<div
  style={{
    display: "flex",
    gap: "12px",
    marginBottom: "30px",
  }}
>
  <input
  type="text"
  placeholder="Search projects..."
  value={search}
  onChange={(e) =>
    setSearch(e.target.value)
  }
  style={{
    flex: 1,
    padding: "14px",
    background: "#111",
    border: "1px solid #333",
    color: "white",
    borderRadius: "8px",
  }}
/>
  <input
    type="text"
    placeholder="Enter project title..."
    value={title}
    onChange={(e) => setTitle(e.target.value)}
    style={{
      flex: 1,
      padding: "14px",
      background: "#111",
      border: "1px solid #333",
      color: "white",
      borderRadius: "8px",
    }}
  />

  <button
    onClick={createProject}
    style={{
      background: "white",
      color: "black",
      border: "none",
      padding: "14px 22px",
      borderRadius: "8px",
      fontWeight: "bold",
      cursor: "pointer",
    }}
  >
    Create Project
  </button>
</div>

      <div
  style={{
    marginTop: "30px",
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(300px, 1fr))",
    gap: "20px",
  }}
>
  {projects
  .filter(
    (project) =>
      project &&
      project.title &&
      project.title
        .toLowerCase()
        .includes(search.toLowerCase())
  )
  .map((project) => (
    <div
      key={project.id}
      style={{
        border: "1px solid #333",
        borderRadius: "12px",
        overflow: "hidden",
        background: "#111",
      }}
    >
      {project.cover_image && (
        <img
          src={project.cover_image}
          alt="Cover"
          style={{
            width: "100%",
            height: "180px",
            objectFit: "cover",
          }}
        />
      )}

      <div style={{ padding: "15px" }}>
        <h3
          style={{
            fontSize: "22px",
            marginBottom: "10px",
          }}
        >
          {project.title}
        </h3>

        <p style={{ marginBottom: "10px" }}>
          Progress: {project.progress}%
        </p>

        <div
          style={{
            width: "100%",
            height: "10px",
            background: "#333",
            borderRadius: "999px",
            overflow: "hidden",
            marginBottom: "15px",
          }}
        >
          <div
            style={{
              width: `${project.progress}%`,
              height: "100%",
              background: "#22c55e",
            }}
          />
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <a
            href={`/dashboard/project/${project.id}`}
            style={{
              color: "white",
              textDecoration: "underline",
            }}
          >
            Open Project
          </a>

          <button
            onClick={() =>
              deleteProject(project.id)
            }
            style={{
              background: "#7f1d1d",
              color: "white",
              border: "none",
              padding: "8px 12px",
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  ))}
</div>
    </div>
  );
}