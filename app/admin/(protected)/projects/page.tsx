"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { useAdminBase } from "@/components/admin/AdminBaseContext";
import { adminHref } from "@/lib/admin-path";

type ProjectRow = {
  _id: string;
  projectId: number;
  name: string;
  year: number;
  sector: string;
  location: string;
  isHome: boolean;
};

export default function AdminProjectsPage() {
  const base = useAdminBase();
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [formKey, setFormKey] = useState(0);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/projects");
    if (!res.ok) {
      setError("Failed to load projects");
      return;
    }
    setProjects(await res.json());
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const fd = new FormData(e.currentTarget);
      const payload = {
        name: String(fd.get("name") || "").trim(),
        year: Number(fd.get("year")),
        sector: String(fd.get("sector") || "Construction"),
        location: String(fd.get("location") || ""),
        shortDesc: String(fd.get("shortDesc") || ""),
        description: String(fd.get("description") || ""),
        clientName: String(fd.get("clientName") || ""),
        isHome: fd.get("isHome") === "on",
      };
      const res = await fetch("/api/admin/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Create failed");
        return;
      }
      setMessage(`Created projectId ${data.projectId}`);
      setFormKey((k) => k + 1);
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function toggleHome(p: ProjectRow) {
    const res = await fetch(`/api/admin/projects/${p.projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isHome: !p.isHome }),
    });
    if (!res.ok) {
      setError("Failed to toggle isHome");
      return;
    }
    await load();
  }

  async function onDelete(projectId: number) {
    if (!confirm(`Delete project ${projectId}?`)) return;
    const res = await fetch(`/api/admin/projects/${projectId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      setError("Delete failed");
      return;
    }
    await load();
  }

  return (
    <>
      <div className="admin-card">
        <div className="admin-toolbar">
          <h1>Projects</h1>
        </div>
        <form
          key={formKey}
          className="admin-form"
          onSubmit={onCreate}
          data-testid="admin-create-project-form"
        >
          <label>
            Name
            <input
              required
              name="name"
              data-testid="admin-project-name"
            />
          </label>
          <label>
            Year
            <input
              type="number"
              name="year"
              required
              defaultValue={new Date().getFullYear()}
              data-testid="admin-project-year"
            />
          </label>
          <label>
            Sector
            <select name="sector" defaultValue="Construction">
              <option>Construction</option>
              <option>Landscape</option>
              <option>Construction & Landscape</option>
              <option>Repair</option>
            </select>
          </label>
          <label>
            Location
            <input name="location" />
          </label>
          <label>
            Client name
            <input name="clientName" />
          </label>
          <label>
            Short description
            <textarea name="shortDesc" />
          </label>
          <label>
            Description
            <textarea name="description" />
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <input
              type="checkbox"
              name="isHome"
              data-testid="admin-project-ishome"
            />
            Show on home (isHome)
          </label>
          <button
            type="submit"
            className="admin-btn"
            disabled={busy}
            data-testid="admin-create-project"
          >
            {busy ? "Creating…" : "Create project"}
          </button>
          {message ? (
            <p className="admin-ok" data-testid="admin-create-message">
              {message}
            </p>
          ) : null}
          {error ? <p className="admin-error">{error}</p> : null}
        </form>
      </div>

      <div className="admin-card">
        <h2>All projects</h2>
        <table className="admin-table" data-testid="admin-projects-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Year</th>
              <th>Sector</th>
              <th>Home</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => (
              <tr key={p.projectId} data-project-id={p.projectId}>
                <td>{p.projectId}</td>
                <td>{p.name}</td>
                <td>{p.year}</td>
                <td>{p.sector}</td>
                <td>
                  <button
                    type="button"
                    className="admin-btn secondary"
                    onClick={() => void toggleHome(p)}
                    data-testid={`admin-toggle-home-${p.projectId}`}
                  >
                    {p.isHome ? "Yes" : "No"}
                  </button>
                </td>
                <td>
                  <div className="admin-actions">
                    <Link
                      className="admin-btn secondary"
                      href={adminHref(base, `/projects/${p.projectId}`)}
                    >
                      Edit
                    </Link>
                    <button
                      type="button"
                      className="admin-btn danger"
                      onClick={() => void onDelete(p.projectId)}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
