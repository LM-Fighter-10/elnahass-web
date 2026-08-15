"use client";

import { FormEvent, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAdminBase } from "@/components/admin/AdminBaseContext";
import { adminHref } from "@/lib/admin-path";

export default function AdminLoginPage() {
  const router = useRouter();
  const base = useAdminBase();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error || "Login failed");
        return;
      }
      router.push(adminHref(base));
      router.refresh();
    } catch {
      setError("Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-root">
      <div className="admin-login-wrap">
        <div className="admin-card admin-login-card">
          <div className="admin-login-brand">
            <Image
              src="/Media/logo.png"
              alt="Elnahass For Construction and Technology"
              width={72}
              height={72}
              className="admin-login-logo"
              priority
            />
            <div>
              <p className="admin-login-company">
                Elnahass For Construction and Technology
              </p>
              <h1>Admin login</h1>
            </div>
          </div>
          <p className="hint">Sign in with your username or email</p>
          <form
            className="admin-form"
            id="admin-login-form"
            onSubmit={onSubmit}
            data-testid="admin-login-form"
          >
            <label>
              Username / Email
              <input
                type="text"
                name="username"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                data-testid="admin-email"
                required
              />
            </label>
            <label>
              Password
              <input
                type="password"
                name="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                data-testid="admin-password"
                required
              />
            </label>
            <button
              type="submit"
              className="admin-btn"
              disabled={busy}
              data-testid="admin-login-submit"
            >
              {busy ? "Signing in…" : "Sign in"}
            </button>
            {error ? (
              <p className="admin-error" data-testid="admin-login-error">
                {error}
              </p>
            ) : null}
          </form>
        </div>
      </div>
    </div>
  );
}
