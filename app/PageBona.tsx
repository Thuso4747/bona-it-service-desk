/// <reference types="react" />
"use client";
/** @jsxRuntime classic */

import React from "react";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}

// Allow runtime require in TypeScript environments where `require` isn't declared
declare var require: any;

// Use a runtime require to avoid TypeScript/module resolution errors in environments
// where `next-auth/react` types aren't available. If the module isn't present,
// fall back to an unauthenticated session.
let useSession: any;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  useSession = require("next-auth/react").useSession;
} catch (e) {
  useSession = () => ({ data: null, status: "unauthenticated" });
}

export default function DashboardPage() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return React.createElement("p", null, "Loading...");
  }

  if (!session || session.user.role !== "AGENT") {
    return React.createElement("p", null, "Access denied");
  }

  return React.createElement(
    "div",
    null,
    React.createElement("h1", null, "Agent Dashboard"),
    React.createElement(
      "p",
      null,
      "Welcome, ".concat(session.user.email)
    )
  );
}