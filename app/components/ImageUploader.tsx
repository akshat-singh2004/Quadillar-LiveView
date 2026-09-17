"use client";

import { useState } from "react";
import { uploadImage } from "@/app/lib/uploadImages";
import { supabase } from "@/app/lib/supabase";

interface Props {
  projectId: string;
  milestones: any[];
}

export default function ImageUploader({
  projectId,
  milestones,
}: Props) {
  const [loading, setLoading] = useState(false);
const [
  selectedMilestone,
  setSelectedMilestone,
] = useState("");
  async function handleUpload(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    try {
      setLoading(true);

      const file = event.target.files?.[0];

      if (!file) return;

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        alert("User not authenticated");
        return;
      }

      await uploadImage(
  file,
  projectId,
  user.id,
  selectedMilestone
);

      alert("Image uploaded successfully");
    } catch (error) {
      console.error(error);
      alert("Upload failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-5">
      <select

  value={selectedMilestone}

  onChange={(e) =>
    setSelectedMilestone(
      e.target.value
    )
  }

  className="
    mb-3
    bg-zinc-800
    border
    border-zinc-700
    rounded
    px-2
    py-1
  "
>

  <option value="">
    Select Milestone
  </option>

  {milestones.map((milestone) => (

    <option
      key={milestone.id}
      value={milestone.id}
    >
      {milestone.title}
    </option>

  ))}

</select>
      <input
        type="file"
        accept="image/*"
        onChange={handleUpload}
        disabled={loading}
      />

      {loading && (
        <p className="mt-2">
          Uploading...
        </p>
      )}
    </div>
  );
  
}