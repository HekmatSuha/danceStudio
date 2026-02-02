import React from "react";
import { DashboardNav } from "../../components/dashboard/DashboardNav";
import { AuthBridgeClient } from "../../components/AuthBridgeClient";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardNav>
      <AuthBridgeClient />
      {children}
    </DashboardNav>
  );
}
