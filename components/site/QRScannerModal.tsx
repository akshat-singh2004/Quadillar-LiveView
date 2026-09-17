"use client";

import { useEffect, useRef, useState } from "react";

export interface SiteQrRecord {
  id: string;
  tag_number?: string;
  code?: string;
  qr_code?: string;
  title?: string;
  project_id?: string;
  element_type?: string;
  trade_package?: string;
  location_grid?: string;
  location?: string;
  status?: string;
  deep_link?: string;
  metadata?: Record<string, unknown> | null;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
}

export interface QRScannerModalProps {
  open?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
  availableTags?: SiteQrRecord[];
  onTagScanned?: (scanned: SiteQrRecord) => void;
  triggerLabel?: string;
}

type QRDetectorInstance = {
  detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue: string }>>;
};

type QRDetectorConstructor = new (options?: { formats?: string[] }) => QRDetectorInstance;

const routeMap: Array<{ pattern: string; href: string }> = [
  { pattern: "ql://zone/", href: "/site/dpr" },
  { pattern: "ql://asset/", href: "/handover/assets" },
  { pattern: "ql://drawing/", href: "/verify/1" },
  { pattern: "ql://punch/", href: "/punchlist" },
];

function resolveDecodedRoute(value: string) {
  const normalized = value.trim();
  const rawRoute = routeMap.find((route) => normalized.startsWith(route.pattern));
  if (rawRoute) return rawRoute.href;
  if (normalized.startsWith("http://") || normalized.startsWith("https://")) return normalized;
  return "/dashboard";
}

export function QRScannerModal({
  open: openProp,
  isOpen,
  onClose,
  availableTags = [],
  onTagScanned,
  triggerLabel = "Scan QR",
}: QRScannerModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = openProp !== undefined || isOpen !== undefined;
  const isModalOpen = isControlled ? (openProp ?? isOpen ?? false) : internalOpen;

  const [status, setStatus] = useState("Ready to scan");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const handleClose = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (onClose) {
      onClose();
    }
    if (!isControlled) {
      setInternalOpen(false);
    }
  };

  useEffect(() => {
    if (!isModalOpen) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      return;
    }

    let cancelled = false;

    async function startCamera() {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setStatus("This browser does not support camera scanning.");
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "environment",
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setStatus("Scanning for QR codes");
      } catch {
        setStatus("Camera access is blocked. Allow camera permissions and retry.");
      }
    }

    void startCamera();

    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [isModalOpen]);

  useEffect(() => {
    if (!isModalOpen) return;

    let intervalId: number | undefined;

    const detect = async () => {
      const detectorFactory = (window as Window & { BarcodeDetector?: QRDetectorConstructor }).BarcodeDetector;
      const video = videoRef.current;
      if (!video || !detectorFactory) {
        return;
      }

      try {
        const detector = new detectorFactory({ formats: ["qr_code"] });
        const codes = await detector.detect(video);
        const firstCode = codes[0]?.rawValue;

        if (!firstCode) return;

        const matchedTag = availableTags.find(
          (t) =>
            t.id === firstCode ||
            t.tag_number === firstCode ||
            t.code === firstCode ||
            t.qr_code === firstCode
        );

        const scannedRecord: SiteQrRecord = matchedTag || {
          id: firstCode,
          tag_number: firstCode,
          code: firstCode,
          status: "SCANNED",
        };

        setStatus(`QR detected: ${firstCode}`);
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }

        if (onTagScanned) {
          onTagScanned(scannedRecord);
          handleClose();
        } else {
          const route = resolveDecodedRoute(firstCode);
          handleClose();
          window.location.assign(route);
        }
      } catch {
        setStatus("Camera scan is active, but QR detection is not available in this browser.");
      }
    };

    intervalId = window.setInterval(() => {
      void detect();
    }, 1200);

    return () => {
      if (intervalId) window.clearInterval(intervalId);
    };
  }, [isModalOpen, availableTags, onTagScanned]);

  return (
    <>
      {!isControlled && (
        <button
          type="button"
          onClick={() => setInternalOpen(true)}
          style={{
            border: "1px solid rgba(255,255,255,0.12)",
            background: "rgba(255,255,255,0.05)",
            color: "#f8fafc",
            borderRadius: 999,
            padding: "10px 16px",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          {triggerLabel}
        </button>
      )}

      {isModalOpen ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(2,6,23,0.82)",
            display: "grid",
            placeItems: "center",
            zIndex: 100,
            padding: 20,
          }}
        >
          <div
            style={{
              width: "min(720px, 100%)",
              background: "#0f172a",
              border: "1px solid rgba(148,163,184,0.25)",
              borderRadius: 24,
              padding: 20,
              boxShadow: "0 24px 80px rgba(15, 23, 42, 0.8)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 16 }}>
              <div>
                <div style={{ color: "#7dd3fc", fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase" }}>Field Scanner</div>
                <div style={{ fontWeight: 700, fontSize: 24, marginTop: 8 }}>Mobile QR capture</div>
              </div>
              <button
                type="button"
                onClick={handleClose}
                style={{ background: "transparent", border: "none", color: "#e2e8f0", cursor: "pointer", fontSize: 20 }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              <div style={{ display: "grid", placeItems: "center", padding: 8, background: "#020817", borderRadius: 18, overflow: "hidden", minHeight: 360 }}>
                <video ref={videoRef} autoPlay muted playsInline style={{ width: "100%", maxHeight: 420, objectFit: "cover", borderRadius: 14, background: "#020817" }} />
              </div>
              <div style={{ color: "#cbd5e1", fontSize: 14 }}>{status}</div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}