/// <reference types="react" />
"use client";
import React from "react";

// @ts-ignore: next-auth types are not available in this environment
import { useSession } from "next-auth/react";

export default function DashboardPage() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return React.createElement('p', null, 'Loading...');
  }

  if (!session || session.user.role !== "AGENT") {
    return <p>Access denied</p>;
  }

  return (
    <div>
      <h1>Agent Dashboard</h1>
      <p>Welcome, {session.user.email}</p>
    </div>
  );
}