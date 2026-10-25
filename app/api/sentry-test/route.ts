import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

export async function GET() {
  try {
    // Deliberate synthetic runtime fault for verification
    throw new Error("LiveView.OS Synthetic Diagnostics: Sentry Telemetry Verification Fault");
  } catch (error) {
    Sentry.captureException(error, {
      tags: {
        governor: "Hermes",
        subsystem: "CoreEngine",
        siteLocation: "Lucknow-Gomti-Nagar",
      },
      extra: {
        contractor: "Quadillar ConTech",
        statutoryLink: "NBC 2016 Part 8 / Section 65B Telemetry",
        timestamp: new Date().toISOString(),
      },
    });

    return NextResponse.json({
      status: "SENTRY_EVENT_DISPATCHED",
      message: "Captured intentional test exception into Sentry diagnostic pipeline.",
      timestamp: new Date().toISOString(),
    });
  }
}
