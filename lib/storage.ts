import { hasSupabaseConfig, supabase } from "@/app/lib/supabase";

export type StorageBucketName = "cde-documents" | "rfi-attachments" | "site-dpr" | "punch-photos";

export interface StorageUploadResult {
  id: string;
  bucket: StorageBucketName;
  name: string;
  size: number;
  mimeType: string;
  path: string;
  fullPath?: string;
  publicUrl?: string;
  uploadedAt: string;
}

export const ALLOWED_UPLOAD_TYPES = {
  "cde-documents": ["application/pdf", "application/ifc", "image/png", "image/jpeg", "application/octet-stream", "application/dwg", "image/jpg"],
  "rfi-attachments": ["application/pdf", "image/png", "image/jpeg", "image/jpg", "application/octet-stream"],
  "site-dpr": ["image/png", "image/jpeg", "image/jpg", "image/webp", "application/octet-stream"],
  "punch-photos": ["image/png", "image/jpeg", "image/jpg", "image/webp", "application/octet-stream"],
} as const;

export function isAllowedUploadType(bucket: StorageBucketName, file: File) {
  const accepted = ALLOWED_UPLOAD_TYPES[bucket] as readonly string[];
  const lowerType = file.type.toLowerCase();
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  return accepted.includes(lowerType) || ["pdf", "ifc", "dwg", "png", "jpg", "jpeg"].includes(extension);
}

export async function uploadFileToBucket(bucket: StorageBucketName, file: File, folder = "uploads"): Promise<StorageUploadResult> {
  const safeName = `${Date.now()}-${file.name.replace(/\s+/g, "-")}`;
  const storedPath = `${folder}/${safeName}`;

  if (!hasSupabaseConfig || !supabase) {
    const url = typeof URL !== "undefined" ? URL.createObjectURL(file) : "";
    return {
      id: `local-${Date.now()}`,
      bucket,
      name: file.name,
      size: file.size,
      mimeType: file.type || "application/octet-stream",
      path: storedPath,
      fullPath: storedPath,
      publicUrl: url || undefined,
      uploadedAt: new Date().toISOString(),
    };
  }

  const { data, error } = await supabase.storage.from(bucket).upload(storedPath, file, {
    contentType: file.type || "application/octet-stream",
    cacheControl: "3600",
    upsert: false,
  });

  if (error) {
    throw error;
  }

  const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(data.path);

  return {
    id: data.id ?? `supabase-${Date.now()}`,
    bucket,
    name: file.name,
    size: file.size,
    mimeType: file.type || "application/octet-stream",
    path: data.path,
    fullPath: data.fullPath,
    publicUrl: publicData.publicUrl,
    uploadedAt: new Date().toISOString(),
  };
}

export async function getStorageSignedUrl(bucket: StorageBucketName, path: string, expiresIn = 3600) {
  if (!hasSupabaseConfig || !supabase) {
    return path;
  }

  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
  if (error) {
    console.warn("createSignedUrl failed:", error.message);
    return path;
  }
  return data?.signedUrl ?? path;
}
