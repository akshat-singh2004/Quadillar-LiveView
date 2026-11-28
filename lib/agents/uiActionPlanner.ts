export type UiActionKind = "CLICK" | "TYPE" | "NAVIGATE" | "SELECT_SITE";

export interface PlannedUiStep {
  id: string;
  kind: UiActionKind;
  label: string;
  selector?: string;
  textToType?: string;
  routeHref?: string;
  projectId?: string;
  delayMs?: number;
}

export interface UiActionPlan {
  planId: string;
  commandText: string;
  summaryOutcome: string;
  steps: PlannedUiStep[];
}

export interface AutopilotSettings {
  enabled: boolean;
  requireConfirmation: boolean;
}

const AUTOPILOT_SETTINGS_KEY = "quadmax-autopilot-settings-v1";

export function getAutopilotSettings(): AutopilotSettings {
  if (typeof window === "undefined") {
    return { enabled: true, requireConfirmation: true };
  }
  try {
    const raw = localStorage.getItem(AUTOPILOT_SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        enabled: parsed.enabled !== false,
        requireConfirmation: parsed.requireConfirmation !== false,
      };
    }
  } catch {}
  return { enabled: true, requireConfirmation: true };
}

export function saveAutopilotSettings(next: AutopilotSettings): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(AUTOPILOT_SETTINGS_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent("quadmax-autopilot-settings-changed", { detail: next }));
  } catch {}
}

/**
 * Translates natural-language executive commands into concrete, visible DOM steps
 * so QUADMAX.AI can preview consequences ("Should I proceed?") and visibly operate the UI.
 */
function planUiActionsInternal(command: string): UiActionPlan | null {
  const q = command.toLowerCase().trim();

  // 0. Guided Showcase Tour (Booth / Backup Auto-Showcase)
  if (q.includes("guided tour") || q.includes("showcase") || q.includes("auto demo")) {
    return {
      planId: `TOUR-${Date.now()}`,
      commandText: command,
      summaryOutcome:
        "Run a 3-step guided showcase: fire live IoT telemetry, open Legal Proof QR Certificate, and inspect the Site Photo Verifier.",
      steps: [
        {
          id: "tour-1",
          kind: "CLICK",
          label: "Fire live IoT telemetry packet to trigger Hermes BSA Sec 63 seal",
          selector: '[data-quadmax-target="iot-burst-btn"]',
          delayMs: 900,
        },
        {
          id: "tour-2",
          kind: "CLICK",
          label: "Open Command Center Tools menu",
          selector: '[data-quadmax-target="open-tools-menu"]',
          delayMs: 800,
        },
        {
          id: "tour-3",
          kind: "CLICK",
          label: "Open Legal Proof Certificate with live scannable QR code",
          selector: '[data-quadmax-target="open-65b-cert"]',
          delayMs: 1200,
        },
      ],
    };
  }

  // 1. Site Report Voice / Photo Ingress
  if (q.includes("whatsapp") || q.includes("voice note") || q.includes("field ingress") || q.includes("record audio")) {
    return {
      planId: `PLAN-${Date.now()}`,
      commandText: command,
      summaryOutcome:
        "Open the WhatsApp-Simple Field Voice & Photo Messenger so you can record a live site voice note or attach a photo.",
      steps: [
        {
          id: "s1",
          kind: "CLICK",
          label: "Click 'SITE REPORT'in the Command Center header",
          selector: '[data-quadmax-target="open-whatsapp-field"]',
          delayMs: 550,
        },
      ],
    };
  }

  // 2. Live Webcam Anti-Spoof Scan + Synthetic Cardboard Test
  if (q.includes("spoof") || q.includes("webcam") || q.includes("cardboard") || q.includes("scan camera")) {
    const autoRunCardboard = q.includes("cardboard") || q.includes("test") || q.includes("run");
    const steps: PlannedUiStep[] = [
      {
        id: "s0",
        kind: "CLICK",
        label: "Open Command Center 'Tools ▾'menu",
        selector: '[data-quadmax-target="open-tools-menu"]',
        delayMs: 400,
      },
      {
        id: "s1",
        kind: "CLICK",
        label: "Click 'Live Webcam Spoof Scan'",
        selector: '[data-quadmax-target="open-spoof-scanner"]',
        delayMs: 550,
      },
    ];
    if (autoRunCardboard) {
      steps.push({
        id: "s2",
        kind: "CLICK",
        label: "Click 'Test Cardboard Spoof'inside the Gemini 2.5 Vision scanner",
        selector: '[data-quadmax-target="run-cardboard-spoof"]',
        delayMs: 750,
      });
    }
    return {
      planId: `PLAN-${Date.now()}`,
      commandText: command,
      summaryOutcome: autoRunCardboard
        ? "Open the Live Webcam Anti-Spoof Scanner and run a forensic cardboard spoof detection test (εr = 1.6 hold)."
        : "Open the Gemini 2.5 Flash Live Webcam Anti-Spoof & Multi-Ray Scanner.",
      steps,
    };
  }

  // 3. Fire Live IoT Telemetry Burst
  if (q.includes("iot") || q.includes("burst") || q.includes("sensor packet") || q.includes("telemetry")) {
    return {
      planId: `PLAN-${Date.now()}`,
      commandText: command,
      summaryOutcome:
        "Trigger a live multi-ray LiDAR/IR/GPR edge telemetry burst from the top bar and seal its SHA-256 digest in the BSA Section 63 ledger.",
      steps: [
        {
          id: "s1",
          kind: "CLICK",
          label: "Click 'IOT BURST'in the top navigation bar",
          selector: '[data-quadmax-target="trigger-iot-burst"]',
          delayMs: 550,
        },
      ],
    };
  }

  // 4. Open 3D BIM & Trigger Autonomous Camera / Laser / Radar Escalation
  if (
    q.includes("3d") ||
    q.includes("bim") ||
    q.includes("escalat") ||
    q.includes("laser") ||
    q.includes("heatmap") ||
    q.includes("tg-03") ||
    q.includes("transfer girder")
  ) {
    const wantsAutoEscalate =
      q.includes("escalat") || q.includes("laser") || q.includes("camera") || q.includes("verify");
    const targetHref = wantsAutoEscalate
      ? "/site/digital-twin?zone=BIT-4-TG03&autoEscalate=1"
      : "/site/digital-twin?zone=BIT-4-TG03&heatmap=1";
    return {
      planId: `PLAN-${Date.now()}`,
      commandText: command,
      summaryOutcome: wantsAutoEscalate
        ? "Navigate to the 3D BIM Digital Twin, focus Transfer Girder TG-03, and autonomously fire onsite PTZ Camera + 905nm LiDAR Laser + 24GHz mmWave Radar."
        : "Navigate to the 3D BIM Digital Twin and activate the Millimeter Tolerance Heatmap on Transfer Girder TG-03.",
      steps: [
        {
          id: "s1",
          kind: "NAVIGATE",
          label: wantsAutoEscalate
            ? "Launch 3D BIM Twin & Auto-Escalate PTZ + Laser on BIT-4-TG03"
            : "Launch 3D BIM Twin with Millimeter Heatmap on BIT-4-TG03",
          routeHref: targetHref,
          delayMs: 650,
        },
      ],
    };
  }

  // 5. Switch Active Project to Summit Corporate Building
  if (q.includes("summit") || q.includes("prj-02") || q.includes("12th floor")) {
    return {
      planId: `PLAN-${Date.now()}`,
      commandText: command,
      summaryOutcome:
        "Switch the active workspace context to PRJ-02 (Summit Corporate Building) to inspect the +1,000 mm 12th-floor perimeter wall drift.",
      steps: [
        {
          id: "s1",
          kind: "SELECT_SITE",
          label: "Switch active portfolio project to PRJ-02 (LKO-SUMMIT-TOWER)",
          projectId: "LKO-SUMMIT-TOWER",
          delayMs: 500,
        },
      ],
    };
  }

  // 6. Fill & Submit IS 456:2000 Core Test Values to Release Escrow
  if (q.includes("core test") || q.includes("release escrow") || q.includes("44.2") || q.includes("clear lien")) {
    return {
      planId: `PLAN-${Date.now()}`,
      commandText: command,
      summaryOutcome:
        "Type verified 3-core readings (44.20, 43.80, 44.21 MPa) and NABL Lab Certificate ID into the IS 456:2000 Escrow Kill Switch.",
      steps: [
        {
          id: "s1",
          kind: "TYPE",
          label: "Enter Core 1 reading: 44.20 MPa",
          selector: '[data-quadmax-target="core-1-input"]',
          textToType: "44.20",
          delayMs: 450,
        },
        {
          id: "s2",
          kind: "TYPE",
          label: "Enter Core 2 reading: 43.80 MPa",
          selector: '[data-quadmax-target="core-2-input"]',
          textToType: "43.80",
          delayMs: 450,
        },
        {
          id: "s3",
          kind: "TYPE",
          label: "Enter Core 3 reading: 44.21 MPa",
          selector: '[data-quadmax-target="core-3-input"]',
          textToType: "44.21",
          delayMs: 450,
        },
      ],
    };
  }

  // 7. Open BSA Section 63 QR Compliance Certificate
  if (q.includes("certificate") || q.includes("qr") || q.includes("65b")) {
    return {
      planId: `PLAN-${Date.now()}`,
      commandText: command,
      summaryOutcome:
        "Open the printable BSA 2023 Sec. 63 / IS 456:2000 QR-Verifiable Compliance Certificate modal.",
      steps: [
        {
          id: "s0",
          kind: "CLICK",
          label: "Open Command Center 'Tools ▾'menu",
          selector: '[data-quadmax-target="open-tools-menu"]',
          delayMs: 400,
        },
        {
          id: "s1",
          kind: "CLICK",
          label: "Click '65B QR Compliance Cert'",
          selector: '[data-quadmax-target="open-65b-cert"]',
          delayMs: 550,
        },
      ],
    };
  }

  return null;
}


const HOME_ONLY_SELECTORS = [
  "open-whatsapp-field",
  "open-tools-menu",
  "open-spoof-scanner",
  "open-65b-cert",
  "core-1-input",
];

export function planUiActionsFromCommand(command: string): UiActionPlan | null {
  const plan = planUiActionsInternal(command);
  if (!plan) return null;
  const needsHome = plan.steps.some(
    (s) =>s.selector && HOME_ONLY_SELECTORS.some((t) =>s.selector!.includes(t))
  );
  if (needsHome && typeof window !== "undefined" && window.location.pathname !== "/") {
    return {
      ...plan,
      steps: [
        {
          id: "s-nav-home",
          kind: "NAVIGATE",
          label: "Return to Command Center ('/')",
          routeHref: "/",
          delayMs: 650,
        },
        ...plan.steps,
      ],
    };
  }
  return plan;
}
