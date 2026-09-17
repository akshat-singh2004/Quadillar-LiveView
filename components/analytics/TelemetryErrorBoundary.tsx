"use client";

import type { ErrorInfo, ReactNode } from "react";
import { Component } from "react";

type TelemetryErrorBoundaryProps = {
  children: ReactNode;
  fallback?: ReactNode;
  title?: string;
};

type TelemetryErrorBoundaryState = {
  hasError: boolean;
};

export class TelemetryErrorBoundary extends Component<TelemetryErrorBoundaryProps, TelemetryErrorBoundaryState> {
  state: TelemetryErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (typeof window !== "undefined") {
      const sentry = (window as typeof window & { Sentry?: { captureException?: (err: Error, context?: Record<string, unknown>) => void } }).Sentry;
      if (sentry?.captureException) {
        sentry.captureException(error, { extra: { componentStack: errorInfo.componentStack } });
      }
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div style={{ border: "1px solid rgba(148,163,184,0.2)", borderRadius: 16, background: "rgba(15,23,42,0.85)", padding: 16, color: "#cbd5e1" }}>
          <div style={{ fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: "#94a3b8" }}>{this.props.title ?? "Telemetry unavailable"}</div>
          <div style={{ marginTop: 8, fontSize: 14 }}>Live data is temporarily unavailable. Showing the last stable view.</div>
        </div>
      );
    }

    return this.props.children;
  }
}
