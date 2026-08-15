"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";

type CustomerRow = {
  _id: string;
  name: string;
  email: string;
  phone: string;
  outlineDesc: string;
  createdAt?: string;
};

const OUTLINE_PREVIEW_LEN = 72;

function truncateOutline(text: string, max = OUTLINE_PREVIEW_LEN): string {
  const t = (text || "").trim();
  if (t.length <= max) return t || "—";
  return `${t.slice(0, max).trimEnd()}…`;
}

function formatSubmittedAt(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<CustomerRow | null>(null);
  const drawerTitleId = useId();
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/customers");
    if (!res.ok) {
      setError("Failed to load customers");
      return;
    }
    setError("");
    setCustomers(await res.json());
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const closeDrawer = useCallback(() => {
    setSelected(null);
  }, []);

  useEffect(() => {
    if (!selected) {
      previouslyFocused.current?.focus?.();
      previouslyFocused.current = null;
      return;
    }

    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const t = window.setTimeout(() => closeBtnRef.current?.focus(), 0);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeDrawer();
      }
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.clearTimeout(t);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [selected, closeDrawer]);

  return (
    <div className="admin-card">
      <div className="admin-toolbar">
        <h1>Customers inbox</h1>
        <button type="button" className="admin-btn secondary" onClick={() => void load()}>
          Refresh
        </button>
      </div>
      <p className="admin-muted">Read-only contact leads from Join Us / Contact forms.</p>
      {error ? <p className="admin-error">{error}</p> : null}
      <table className="admin-table" data-testid="admin-customers-table">
        <thead>
          <tr>
            <th>When</th>
            <th>Name</th>
            <th>Email</th>
            <th>Phone</th>
            <th>Outline</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {customers.map((c) => (
            <tr key={c._id} data-testid="admin-customer-row">
              <td>{formatSubmittedAt(c.createdAt)}</td>
              <td>{c.name}</td>
              <td>{c.email}</td>
              <td>{c.phone}</td>
              <td className="admin-outline-preview" title={c.outlineDesc}>
                {truncateOutline(c.outlineDesc)}
              </td>
              <td>
                <button
                  type="button"
                  className="admin-btn admin-view-btn"
                  data-testid="admin-customer-view"
                  aria-label={`View details for ${c.name}`}
                  onClick={() => setSelected(c)}
                >
                  <span className="admin-view-btn-icon" aria-hidden="true">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z"
                        stroke="currentColor"
                        strokeWidth="1.75"
                        strokeLinejoin="round"
                      />
                      <circle cx="12" cy="12" r="2.75" stroke="currentColor" strokeWidth="1.75" />
                    </svg>
                  </span>
                  View
                </button>
              </td>
            </tr>
          ))}
          {customers.length === 0 ? (
            <tr>
              <td colSpan={6} className="admin-muted">
                No leads yet.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>

      {selected ? (
        <div
          className="admin-drawer-root"
          data-testid="admin-customer-drawer"
          role="presentation"
        >
          <button
            type="button"
            className="admin-drawer-backdrop"
            aria-label="Close details"
            onClick={closeDrawer}
          />
          <aside
            className="admin-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby={drawerTitleId}
          >
            <header className="admin-drawer-header">
              <div>
                <p className="admin-drawer-eyebrow">Lead details</p>
                <h2 id={drawerTitleId}>{selected.name || "Untitled lead"}</h2>
              </div>
              <button
                ref={closeBtnRef}
                type="button"
                className="admin-drawer-close"
                aria-label="Close"
                onClick={closeDrawer}
              >
                ×
              </button>
            </header>

            <div className="admin-drawer-body">
              <dl className="admin-drawer-meta">
                <div>
                  <dt>Email</dt>
                  <dd>
                    {selected.email ? (
                      <a href={`mailto:${selected.email}`}>{selected.email}</a>
                    ) : (
                      "—"
                    )}
                  </dd>
                </div>
                <div>
                  <dt>Phone</dt>
                  <dd>
                    {selected.phone ? (
                      <a href={`tel:${selected.phone.replace(/\s+/g, "")}`}>
                        {selected.phone}
                      </a>
                    ) : (
                      "—"
                    )}
                  </dd>
                </div>
                <div>
                  <dt>Submitted</dt>
                  <dd>{formatSubmittedAt(selected.createdAt)}</dd>
                </div>
              </dl>

              <div className="admin-drawer-outline">
                <h3>Outline</h3>
                <div className="admin-drawer-outline-scroll">
                  <p>{selected.outlineDesc?.trim() || "—"}</p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
