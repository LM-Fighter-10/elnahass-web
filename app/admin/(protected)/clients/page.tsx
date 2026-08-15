"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type ClientRow = { _id: string; name: string };

export default function AdminClientsPage() {
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/clients");
    if (!res.ok) {
      setError("Failed to load clients");
      return;
    }
    setClients(await res.json());
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/admin/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) {
      setError("Create failed");
      return;
    }
    setName("");
    await load();
  }

  async function onRename(id: string, next: string) {
    const res = await fetch(`/api/admin/clients/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: next }),
    });
    if (!res.ok) {
      setError("Update failed");
      return;
    }
    await load();
  }

  async function onDelete(id: string) {
    if (!confirm("Delete client?")) return;
    const res = await fetch(`/api/admin/clients/${id}`, { method: "DELETE" });
    if (!res.ok) {
      setError("Delete failed");
      return;
    }
    await load();
  }

  return (
    <>
      <div className="admin-card">
        <h1>Clients</h1>
        <form className="admin-form" onSubmit={onCreate}>
          <label>
            Name
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              data-testid="admin-client-name"
            />
          </label>
          <button type="submit" className="admin-btn" data-testid="admin-client-create">
            Add client
          </button>
          {error ? <p className="admin-error">{error}</p> : null}
        </form>
      </div>
      <div className="admin-card">
        <table className="admin-table" data-testid="admin-clients-table">
          <thead>
            <tr>
              <th>Name</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {clients.map((c) => (
              <tr key={c._id}>
                <td>
                  <input
                    aria-label={`Client name for ${c.name}`}
                    defaultValue={c.name}
                    onBlur={(e) => {
                      if (e.target.value.trim() && e.target.value !== c.name) {
                        void onRename(c._id, e.target.value);
                      }
                    }}
                  />
                </td>
                <td className="admin-actions">
                  <button
                    type="button"
                    className="admin-btn danger"
                    onClick={() => void onDelete(c._id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {clients.length === 0 ? (
              <tr>
                <td colSpan={2} className="admin-muted">
                  No clients yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </>
  );
}
