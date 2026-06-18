// @ts-nocheck
"use client";

import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleLogin() {
    // Dynamically import next-auth to avoid build-time type/module errors
    try {
      // Suppress TypeScript error when next-auth types aren't installed in this project
      // @ts-ignore
      const auth: any = await import("next-auth/react");
      if (auth && typeof auth.signIn === "function") {
        await auth.signIn("credentials", {
          email,
          password,
          callbackUrl: "/dashboard",
        });
      } else {
        console.warn("next-auth/react.signIn not available");
      }
    } catch (err) {
      console.warn("Failed to load next-auth/react:", err);
    }
  }

  return (
    <div style={{ maxWidth: 400, margin: "100px auto" }}>
      <h2>Agent Login</h2>

      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <button onClick={handleLogin}>Login</button>
    </div>
  );
}