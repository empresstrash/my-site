"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Gate() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  return (
    <div className="kp-gate-wrap">
      <form
        className="kp-gate"
      onSubmit={(event) => {
        event.preventDefault();
        setError("");
        void fetch("/api/vr/unlock", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ password }),
        }).then((response) => {
          if (!response.ok) {
            setError("Wrong password.");
            return;
          }
          router.refresh();
        });
      }}
    >
      <h1>kid pix</h1>
      <p>This page uses the same password as the VR booth.</p>
      <label htmlFor="kidpix-gate">Password</label>
      <input
        id="kidpix-gate"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />
      {error ? <p className="kp-error">{error}</p> : null}
        <button type="submit">open</button>
      </form>
    </div>
  );
}
