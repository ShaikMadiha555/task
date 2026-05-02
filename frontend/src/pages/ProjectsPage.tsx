import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";

type ProjectRow = {
  id: string;
  name: string;
  description: string | null;
  role: "ADMIN" | "MEMBER";
  createdAt: string;
  owner: { id: string; name: string; email: string };
  taskCount: number;
  memberCount: number;
};

export function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const r = await api<{ projects: ProjectRow[] }>("/api/projects");
      setProjects(r.projects);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load projects");
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api("/api/projects", {
        method: "POST",
        json: { name, description: description || null },
      });
      setName("");
      setDescription("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create project");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stack">
      <div>
        <h1 style={{ margin: "0 0 0.35rem" }}>Projects</h1>
        <p className="muted" style={{ margin: 0 }}>
          You see only projects you are a member of. Project creators become admins and can invite others.
        </p>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="card">
        <h2 style={{ marginTop: 0, fontSize: "1.05rem" }}>New project</h2>
        <form onSubmit={onCreate}>
          <div className="field">
            <label htmlFor="pname">Name</label>
            <input id="pname" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="pdesc">Description (optional)</label>
            <textarea id="pdesc" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? "Creating…" : "Create project"}
          </button>
        </form>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0, fontSize: "1.05rem" }}>Your projects</h2>
        {projects.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            No projects yet. Create one above.
          </p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Your role</th>
                <th>Tasks</th>
                <th>Members</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr key={p.id}>
                  <td>
                    <strong>{p.name}</strong>
                    {p.description && (
                      <div className="muted" style={{ fontSize: "0.85rem" }}>
                        {p.description}
                      </div>
                    )}
                  </td>
                  <td>
                    <span className={p.role === "ADMIN" ? "badge badge-admin" : "badge badge-member"}>{p.role}</span>
                  </td>
                  <td>{p.taskCount}</td>
                  <td>{p.memberCount}</td>
                  <td>
                    <Link to={`/projects/${p.id}`} className="btn btn-ghost" style={{ padding: "0.35rem 0.65rem" }}>
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
