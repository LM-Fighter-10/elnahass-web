"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAdminBase } from "@/components/admin/AdminBaseContext";
import ProjectImageManager, {
  type ProjectImageRow,
} from "@/components/admin/ProjectImageManager";
import { adminHref } from "@/lib/admin-path";

type ProjectDetail = {
  projectId: number;
  name: string;
  year: number;
  sector: string;
  location: string;
  shortDesc: string;
  description: string;
  clientName: string;
  isHome: boolean;
  images: ProjectImageRow[];
};

export default function AdminProjectEditPage() {
  const params = useParams<{ projectId: string }>();
  const router = useRouter();
  const base = useAdminBase();
  const projectId = Number(params.projectId);
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/projects/${projectId}`);
    if (!res.ok) {
      setError("Project not found");
      setProject(null);
      return;
    }
    setProject(await res.json());
  }, [projectId]);

  useEffect(() => {
    if (Number.isFinite(projectId)) void load();
  }, [load, projectId]);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    if (!project) return;
    setBusy(true);
    setError("");
    setMessage("");
    // Read checkbox from the form so Save isn't racing a pending setState
    const form = e.currentTarget as HTMLFormElement;
    const homeInput = form.querySelector(
      '[data-testid="admin-edit-ishome"]',
    ) as HTMLInputElement | null;
    const isHome = homeInput ? homeInput.checked : project.isHome;
    try {
      const res = await fetch(`/api/admin/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: project.name,
          year: project.year,
          sector: project.sector,
          location: project.location,
          shortDesc: project.shortDesc,
          description: project.description,
          clientName: project.clientName,
          isHome,
        }),
      });
      if (!res.ok) {
        setError("Save failed");
        return;
      }
      setMessage("Saved");
      await load();
    } finally {
      setBusy(false);
    }
  }

  if (!project) {
    return (
      <div className="admin-card">
        <p>{error || "Loading…"}</p>
        <Link href={adminHref(base, "/projects")}>Back</Link>
      </div>
    );
  }

  return (
    <>
      <div className="admin-card">
        <div className="admin-toolbar">
          <h1>Edit project #{project.projectId}</h1>
          <Link className="admin-btn secondary" href={adminHref(base, "/projects")}>
            Back
          </Link>
        </div>
        <form className="admin-form" onSubmit={onSave}>
          <label>
            Name
            <input
              value={project.name}
              onChange={(e) => setProject({ ...project, name: e.target.value })}
            />
          </label>
          <label>
            Year
            <input
              type="number"
              value={project.year}
              onChange={(e) =>
                setProject({ ...project, year: Number(e.target.value) })
              }
            />
          </label>
          <label>
            Sector
            <input
              value={project.sector}
              onChange={(e) =>
                setProject({ ...project, sector: e.target.value })
              }
            />
          </label>
          <label>
            Location
            <input
              value={project.location}
              onChange={(e) =>
                setProject({ ...project, location: e.target.value })
              }
            />
          </label>
          <label>
            Client name
            <input
              value={project.clientName}
              onChange={(e) =>
                setProject({ ...project, clientName: e.target.value })
              }
            />
          </label>
          <label>
            Short description
            <textarea
              value={project.shortDesc}
              onChange={(e) =>
                setProject({ ...project, shortDesc: e.target.value })
              }
            />
          </label>
          <label>
            Description
            <textarea
              value={project.description}
              onChange={(e) =>
                setProject({ ...project, description: e.target.value })
              }
            />
          </label>
          <label className="admin-check">
            <input
              type="checkbox"
              checked={project.isHome}
              onChange={(e) =>
                setProject({ ...project, isHome: e.target.checked })
              }
              data-testid="admin-edit-ishome"
            />
            Show on home (isHome)
          </label>
          <button type="submit" className="admin-btn" disabled={busy}>
            Save
          </button>
        </form>
        {message ? <p className="admin-ok">{message}</p> : null}
        {error ? <p className="admin-error">{error}</p> : null}
      </div>

      <div className="admin-card">
        <h2>Images</h2>
        <p className="admin-muted admin-section-hint">
          Drag to reorder carousel. Click a tile or ★ to set the cover thumbnail.
        </p>
        <ProjectImageManager
          projectId={projectId}
          images={project.images}
          onChange={(images) => setProject({ ...project, images })}
          onMessage={(msg) => {
            setMessage(msg);
            setError("");
          }}
          onError={(msg) => {
            if (msg) setError(msg);
          }}
        />
      </div>

      <div className="admin-card">
        <button
          type="button"
          className="admin-btn danger"
          onClick={async () => {
            if (!confirm("Delete this project?")) return;
            await fetch(`/api/admin/projects/${projectId}`, { method: "DELETE" });
            router.push(adminHref(base, "/projects"));
          }}
        >
          Delete project
        </button>
      </div>
    </>
  );
}
