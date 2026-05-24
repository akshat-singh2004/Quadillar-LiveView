import { supabase } from "@/app/lib/supabase";

export async function uploadImage(
  file: File,
  projectId: string,
  userId: string
) {
  const filePath = `${userId}/${projectId}/${Date.now()}-${file.name}`;

  // Upload image to Supabase Storage
  const { error: uploadError } = await supabase.storage
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

  // Save metadata into database
  const { error: dbError } = await supabase
    .from("project_images")
    .insert([
      {
        project_id: projectId,
        user_id: userId,
        image_url: imageUrl,
        file_name: file.name,
      },
    ]);

  if (dbError) {
    throw dbError;
  }

  return imageUrl;
}