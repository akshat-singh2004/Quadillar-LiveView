import type { CdeItem, TransmittalRecord } from "@/types/construction";

const cryptoAvailable = typeof crypto !== "undefined" && "subtle" in crypto;

async function sha256OfString(value: string): Promise<string> {
  if (!cryptoAvailable) return `sha256:${value.length}`;
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function generateTransmittalRecord(
  item: CdeItem,
  options: {
    issuingEntity: string;
    recipientOrganization: string;
    distributionMethod: TransmittalRecord["distributionMethod"];
    purpose: TransmittalRecord["purpose"];
    documentSet: string[];
    uniclassCode: string;
    distributedBy: string;
    notes?: string;
  },
): Promise<TransmittalRecord> {
  const hash = await sha256OfString(`${item.id}:${item.revision}:${item.updatedAt}:${item.title}`);

  return {
    transmittalNumber: `TRN-${String(Date.now()).slice(-3).padStart(3, "0")}`,
    projectId: item.projectId,
    issuingEntity: options.issuingEntity,
    recipientOrganization: options.recipientOrganization,
    distributionMethod: options.distributionMethod,
    purpose: options.purpose,
    cdeItemId: item.id,
    revisionNumber: item.revision,
    fileHash: hash,
    uniclassCode: options.uniclassCode,
    documentSet: options.documentSet,
    distributedAt: new Date().toISOString(),
    distributedBy: options.distributedBy,
    receiptConfirmed: true,
    notes: options.notes,
  };
}

export function buildCertifiedTransmittalManifest(transmittal: TransmittalRecord) {
  return {
    transmittalNumber: transmittal.transmittalNumber,
    purpose: transmittal.purpose,
    distributionMethod: transmittal.distributionMethod,
    issuingEntity: transmittal.issuingEntity,
    recipientOrganization: transmittal.recipientOrganization,
    fileHash: transmittal.fileHash,
    documentSet: transmittal.documentSet,
    uniclassCode: transmittal.uniclassCode,
    receiptConfirmed: transmittal.receiptConfirmed,
    summary: `Certified transmittal manifest for ${transmittal.transmittalNumber}. Documents distributed to ${transmittal.recipientOrganization} on ${new Date(transmittal.distributedAt).toLocaleString("en-IN")}.`,
  };
}
