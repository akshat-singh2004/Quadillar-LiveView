'use client';

import React from 'react';

interface SidebarAwareLayoutProps {
  children: React.ReactNode;
}

export function SidebarAwareLayout({ children }: SidebarAwareLayoutProps) {
  // AppShell already coordinates the fixed Sidebar and pl-72 offset at the root level.
  // SidebarAwareLayout passes children through cleanly to avoid duplicate sidebars.
  return <>{children}</>;
}

export default SidebarAwareLayout;
