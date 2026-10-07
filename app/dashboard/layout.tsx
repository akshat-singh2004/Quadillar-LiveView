// app/dashboard/layout.tsx
import React from "react";

export const metadata = {
  title: "Dashboard & EVM Command Spine | Quadillar LiveView",
  description: "LiveView Executive Command Spine, CDE, and QMS Navigation Hub",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}