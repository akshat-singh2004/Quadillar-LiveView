import { Storage } from "@google-cloud/storage";

export interface GcsArchiveResult {
  archived: boolean;
  gcsUri: string | null;
  bucketName: string | null;
  storageMode: "GOOGLE_CLOUD_STORAGE" | "LOCAL_HASH_VAULT";
}

export async function archiveEvidenceToGcs(params: {
  projectId: string;
  bimZoneId: string;
  mediaSha256: string;
  buffer: Buffer;
  mimeType: string;
  extension: string;
}): Promise<GcsArchiveResult> {
  const bucketName = process.env.GCS_BUCKET_NAME?.trim() || "";
  if (!bucketName) {
    return {
      archived: false,
      gcsUri: null,
      bucketName: null,
      storageMode: "LOCAL_HASH_VAULT",
    };
  }

  try {
    const storage = new Storage();
    const objectPath = `${params.projectId}/${params.bimZoneId}/${params.mediaSha256}.${params.extension}`;
    const file = storage.bucket(bucketName).file(objectPath);

    await file.save(params.buffer, {
      resumable: false,
      contentType: params.mimeType,
      metadata: {
        metadata: {
          projectId: params.projectId,
          bimZoneId: params.bimZoneId,
          sha256: params.mediaSha256,
          statutoryStandard: "BSA-2023-SEC-63-SEC-65B",
        },
      },
    });

    return {
      archived: true,
      gcsUri: `gs://${bucketName}/${objectPath}`,
      bucketName,
      storageMode: "GOOGLE_CLOUD_STORAGE",
    };
  } catch {
    return {
      archived: false,
      gcsUri: null,
      bucketName,
      storageMode: "LOCAL_HASH_VAULT",
    };
  }
}
