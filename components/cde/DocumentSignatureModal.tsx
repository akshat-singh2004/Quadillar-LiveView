"use client";

import { useState } from "react";
import type { DocumentSignatureRecord, SignatureDocumentType, SignatureStakeholder } from "@/types/construction";

interface DocumentSignatureModalProps {
  open: boolean;
  documentName: string;
  documentType: SignatureDocumentType;
  onClose: () => void;
  onSigned?: (record: DocumentSignatureRecord) => void;
}

const signers: Record<SignatureStakeholder, { name: string; organization: string; credential: string }> = {
  Architect: { name: "Ananya Mehta", organization: "Mehta Design Associates", credential: "COA / AOR-1184" },
  "Structural Engineer": { name: "Rohan Iyer", organization: "Iyer Structural Studio", credential: "ISSE / SEOR-0442" },
  Client: { name: "Nikhil Shah", organization: "Quadillar Asset Holdings", credential: "Authorized Client Signatory" },
};

async function sha256(value: string) {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function DocumentSignatureModal({ open, documentName, documentType, onClose, onSigned }: DocumentSignatureModalProps) {
  const [stakeholder, setStakeholder] = useState<SignatureStakeholder>("Architect");
  const [position, setPosition] = useState({ x: 64, y: 62 });
  const [record, setRecord] = useState<DocumentSignatureRecord | null>(null);
  const [verifyInput, setVerifyInput] = useState("");
  const [verifyState, setVerifyState] = useState<"idle" | "valid" | "invalid">("idle");
  const signer = signers[stakeholder];

  if (!open) return null;

  const placeStamp = (event: React.MouseEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    setPosition({ x: Math.round(((event.clientX - bounds.left) / bounds.width) * 100), y: Math.round(((event.clientY - bounds.top) / bounds.height) * 100) });
  };

  const createSignature = async () => {
    const signedAt = new Date().toISOString();
    const certificateHash = await sha256(`${documentName}|${documentType}|${signer.name}|${signer.credential}|${signedAt}|${position.x}|${position.y}`);
    const nextRecord: DocumentSignatureRecord = {
      id: `sig-${Date.now()}`,
      projectId: "proj-1",
      documentName,
      documentType,
      signer: signer.name,
      stakeholder,
      organization: signer.organization,
      credential: signer.credential,
      signedAt,
      certificateHash,
      verificationStatus: "Verified",
      x: position.x,
      y: position.y,
    };
    setRecord(nextRecord);
    setVerifyInput(certificateHash);
    setVerifyState("valid");
    onSigned?.(nextRecord);
  };

  const verifyCertificate = () => setVerifyState(verifyInput.trim().toLowerCase() === record?.certificateHash ? "valid" : "invalid");

  return (
    <div role="dialog" aria-modal="true" aria-label="Document signature and verification" style={overlayStyle}>
      <div style={modalStyle}>
        <div style={headerStyle}>
          <div><div style={eyebrowStyle}>PKI stamp engine</div><h2 style={{ margin: "6px 0 0", fontSize: 24 }}>{documentName}</h2><div style={{ color: "#94a3b8", marginTop: 5 }}>{documentType} · click the sheet to place a stamp</div></div>
          <button type="button" onClick={onClose} style={closeStyle} aria-label="Close signature modal">×</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.3fr) minmax(280px, .7fr)", gap: 18, marginTop: 20 }}>
          <div>
            <div onClick={placeStamp} style={canvasStyle}>
              <div style={sheetTitle}>QUADILLAR LIVEVIEW<br /><span>COORDINATED ISSUE / {documentType.toUpperCase()}</span></div>
              <div style={{ position: "absolute", left: "12%", right: "12%", top: "28%", height: 1, background: "#64748b" }} />
              <div style={{ position: "absolute", left: "12%", right: "26%", top: "43%", height: 1, background: "#94a3b8" }} />
              <div style={{ position: "absolute", left: "12%", right: "38%", top: "58%", height: 1, background: "#94a3b8" }} />
              {record && <div style={{ ...stampStyle, left: `${record.x}%`, top: `${record.y}%` }}><strong>✓ DIGITALLY SIGNED</strong><span>{record.signer} · {record.stakeholder}</span><span>{record.certificateHash.slice(0, 16)}…</span></div>}
            </div>
            <div style={{ color: "#64748b", fontSize: 11, marginTop: 8 }}>Placement is recorded in the certificate payload and cannot be changed after signing.</div>
          </div>
          <aside style={{ background: "#111827", border: "1px solid #263449", padding: 16, borderRadius: 12 }}>
            <label style={labelStyle}>Authorized stakeholder<select value={stakeholder} onChange={(event) => setStakeholder(event.target.value as SignatureStakeholder)} style={inputStyle}>{Object.keys(signers).map((role) => <option key={role}>{role}</option>)}</select></label>
            <div style={{ marginTop: 16, color: "#cbd5e1", fontSize: 13 }}><strong>{signer.name}</strong><br />{signer.organization}<br /><span style={{ color: "#67e8f9" }}>{signer.credential}</span></div>
            <button type="button" onClick={() => void createSignature()} style={primaryButton}>Generate immutable certificate</button>
            {record && <div style={{ marginTop: 18, borderTop: "1px solid #263449", paddingTop: 16 }}><div style={labelStyle}>Certificate SHA-256<div style={{ wordBreak: "break-all", color: "#a7f3d0", fontFamily: "monospace", fontSize: 11, marginTop: 6 }}>{record.certificateHash}</div></div><img alt="QR code for the digital certificate" src={`https://api.qrserver.com/v1/create-qr-code/?size=128x128&data=${encodeURIComponent(record.certificateHash)}`} style={{ width: 112, height: 112, marginTop: 12, background: "white", padding: 6 }} /></div>}
          </aside>
        </div>
        <div style={{ marginTop: 18, borderTop: "1px solid #263449", paddingTop: 16 }}><div style={eyebrowStyle}>Verify document integrity</div><div style={{ display: "flex", gap: 8, marginTop: 8 }}><input value={verifyInput} onChange={(event) => { setVerifyInput(event.target.value); setVerifyState("idle"); }} placeholder="Paste certificate checksum" style={{ ...inputStyle, flex: 1 }} /><button type="button" onClick={verifyCertificate} disabled={!record} style={secondaryButton}>Verify</button></div>{verifyState !== "idle" && <div style={{ marginTop: 10, color: verifyState === "valid" ? "#86efac" : "#fca5a5", fontSize: 13 }}>{verifyState === "valid" ? `Checksum valid · signed ${new Date(record!.signedAt).toLocaleString()} by ${record!.signer} (${record!.organization})` : "Checksum mismatch. This document certificate could not be validated."}</div>}</div>
      </div>
    </div>
  );
}

const overlayStyle: React.CSSProperties = { position: "fixed", inset: 0, zIndex: 50, background: "rgba(2,6,23,.82)", display: "grid", placeItems: "center", padding: 18 };
const modalStyle: React.CSSProperties = { width: "min(1060px, 100%)", maxHeight: "92vh", overflowY: "auto", background: "#07111f", border: "1px solid #334155", borderRadius: 16, padding: 22, color: "#f8fafc", boxShadow: "0 24px 90px rgba(0,0,0,.45)" };
const headerStyle: React.CSSProperties = { display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start" };
const eyebrowStyle: React.CSSProperties = { color: "#67e8f9", fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase", fontWeight: 700 };
const closeStyle: React.CSSProperties = { background: "transparent", border: "1px solid #334155", color: "#cbd5e1", borderRadius: 8, fontSize: 22, width: 34, height: 34, cursor: "pointer" };
const canvasStyle: React.CSSProperties = { position: "relative", aspectRatio: "1.45", overflow: "hidden", cursor: "crosshair", border: "1px solid #475569", background: "linear-gradient(135deg,#f8fafc,#cbd5e1 48%,#e2e8f0)", color: "#0f172a", padding: "7%", boxShadow: "inset 0 0 0 12px rgba(15,23,42,.08)" };
const sheetTitle: React.CSSProperties = { fontFamily: "monospace", fontSize: 12, letterSpacing: ".08em", lineHeight: 1.7 };
const stampStyle: React.CSSProperties = { position: "absolute", transform: "translate(-50%,-50%)", display: "grid", gap: 3, minWidth: 160, padding: 8, color: "#064e3b", background: "rgba(167,243,208,.88)", border: "2px solid #059669", fontSize: 10, fontFamily: "monospace" };
const labelStyle: React.CSSProperties = { color: "#94a3b8", fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase" };
const inputStyle: React.CSSProperties = { display: "block", width: "100%", marginTop: 7, background: "#0b1220", color: "#f8fafc", border: "1px solid #334155", borderRadius: 8, padding: "10px 11px" };
const primaryButton: React.CSSProperties = { width: "100%", marginTop: 18, background: "#34d399", color: "#052e16", border: 0, borderRadius: 8, padding: "11px 12px", fontWeight: 800, cursor: "pointer" };
const secondaryButton: React.CSSProperties = { background: "#0ea5e9", color: "white", border: 0, borderRadius: 8, padding: "0 15px", fontWeight: 800, cursor: "pointer" };
