"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type Settings = {
  home?: Record<string, string>;
  about?: Record<string, string | number>;
  contact?: Record<string, string>;
  footer?: Record<string, string>;
};

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<Settings>({});
  const [raw, setRaw] = useState("{}");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/site-settings");
    if (!res.ok) {
      setError("Failed to load settings");
      return;
    }
    const data = (await res.json()) as Settings;
    setSettings(data);
    setRaw(JSON.stringify(data, null, 2));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    try {
      const parsed = JSON.parse(raw) as Settings;
      const res = await fetch("/api/admin/site-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed),
      });
      if (!res.ok) {
        setError("Save failed");
        return;
      }
      const saved = await res.json();
      setSettings(saved);
      setRaw(JSON.stringify(saved, null, 2));
      setMessage("Settings saved");
    } catch {
      setError("Invalid JSON");
    }
  }

  return (
    <div className="admin-card">
      <h1>Site settings</h1>
      <p className="admin-muted">
        Edit Mongo siteSettings document as JSON (home / about / contact / footer).
      </p>
      <form className="admin-form" onSubmit={onSave} style={{ maxWidth: "100%" }}>
        <label>
          JSON
          <textarea
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            style={{ minHeight: 360, fontFamily: "ui-monospace, monospace" }}
            data-testid="admin-settings-json"
          />
        </label>
        <button type="submit" className="admin-btn" data-testid="admin-settings-save">
          Save settings
        </button>
        {message ? <p className="admin-ok">{message}</p> : null}
        {error ? <p className="admin-error">{error}</p> : null}
      </form>
      <pre className="admin-muted" style={{ fontSize: 12, overflow: "auto" }}>
        {JSON.stringify(settings?.home || {}, null, 2)}
      </pre>
    </div>
  );
}
