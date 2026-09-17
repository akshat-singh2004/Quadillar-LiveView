"use client";

import type { ErrorInfo, ReactNode } from "react";
import { Component } from "react";
import * as Sentry from "@sentry/nextjs";

type ErrorBoundaryProps = { children: ReactNode };
type ErrorBoundaryState = { hasError: boolean };

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    Sentry.captureException(error, { contexts: { react: { componentStack: errorInfo.componentStack ?? "" } } });
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return <main style={{ minHeight: "60vh", display: "grid", placeItems: "center", padding: 24, background: "#050816", color: "#e2e8f0" }}><section style={{ maxWidth: 560, border: "1px solid #7f1d1d", borderRadius: 14, background: "#1c1014", padding: 24 }}><div style={{ color: "#fca5a5", fontSize: 11, letterSpacing: ".14em", textTransform: "uppercase" }}>Runtime fault captured</div><h1 style={{ margin: "8px 0 0", fontSize: 24 }}>This view needs a refresh</h1><p style={{ color: "#cbd5e1", lineHeight: 1.6 }}>The error was captured for the engineering team. Your project data remains intact.</p><button type="button" onClick={() => window.location.reload()} style={{ border: 0, borderRadius: 8, background: "#f87171", color: "#1c1014", padding: "10px 14px", fontWeight: 800, cursor: "pointer" }}>Reload workspace</button></section></main>;
  }
}