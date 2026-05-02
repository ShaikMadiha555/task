import { FormEvent, useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";

type ProjectDetail = {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  yourRole: "ADMIN" | "MEMBER";
  owner: { id: string; name: string; email: string };
  members: Array<{ id: string; name: string; email: string; role: "ADMIN" | "MEMBER" }>;
  taskCount: number;
};

type TaskRow = {
  id: string;
  title: string;
  description: string | null;
  status: "TODO" | "IN_PROGRESS" | "DONE";
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  assignee: { id: string; name: string; email: string } | null;
  createdBy: { id: string; name: string; email: string };
};

function statusBadge(s: string) {
  if (s === "DONE") return "badge badge-done";
  if (s === "IN_PROGRESS") return "badge badge-progress";
  return "badge badge-todo";
}

export function ProjectDetailPage() {
  const { projectId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [status, setStatus] = useState<TaskRow["status"]>("TODO");
  const [dueDate, setDueDate] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [creating, setCreating] = useState(false);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"ADMIN" | "MEMBER">("MEMBER");
  const [inviting, setInviting] = useState(false);

  const load = useCallback(async () => {
    if (!projectId) return;
    const [p, t] = await Promise.all([
      api<{ project: ProjectDetail }>(`/api/projects/${projectId}`),
      api<{ tasks: TaskRow[] }>(`/api/projects/${projectId}/tasks`),
    ]);
    setProject(p.project);
    setTasks(t.tasks);
    setError(null);
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    (async () => {
      try {
        await load();
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load project");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId, load]);

  async function onCreateTask(e: FormEvent) {
    e.preventDefault();
    if (!projectId) return;
    setCreating(true);
    try {
      await api(`/api/projects/${projectId}/tasks`, {
        method: "POST",
        json: {
          title,
          description: taskDesc || null,
          status,
          dueDate: dueDate ? new Date(dueDate).toISOString() : null,
          assigneeId: assigneeId || null,
        },
      });
      setTitle("");
      setTaskDesc("");
      setStatus("TODO");
      setDueDate("");
      setAssigneeId("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create task");
    } finally {
      setCreating(false);
    }
  }

  async function patchTask(taskId: string, patch: Record<string, unknown>) {
    try {
      await api(`/api/tasks/${taskId}`, { method: "PATCH", json: patch });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    }
  }

  async function deleteTask(taskId: string) {
    if (!confirm("Delete this task?")) return;
    try {
      await api(`/api/tasks/${taskId}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  async function onInvite(e: FormEvent) {
    e.preventDefault();
    if (!projectId) return;
    setInviting(true);
    try {
      await api(`/api/projects/${projectId}/members`, {
        method: "POST",
        json: { email: inviteEmail.trim(), role: inviteRole },
      });
      setInviteEmail("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invite failed");
    } finally {
      setInviting(false);
    }
  }

  async function removeMember(memberUserId: string) {
    if (!projectId || !confirm("Remove this member from the project?")) return;
    try {
      await api(`/api/projects/${projectId}/members/${memberUserId}`, { method: "DELETE" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Remove failed");
    }
  }

  async function changeRole(memberUserId: string, role: "ADMIN" | "MEMBER") {
    if (!projectId) return;
    try {
      await api(`/api/projects/${projectId}/members/${memberUserId}`, {
        method: "PATCH",
        json: { role },
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Role update failed");
    }
  }

  async function deleteProject() {
    if (!projectId || !confirm("Delete this entire project? This cannot be undone.")) return;
    try {
      await api(`/api/projects/${projectId}`, { method: "DELETE" });
      navigate("/projects");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  if (!projectId) return <div className="error-banner">Missing project</div>;
  if (error && !project) return <div className="error-banner">{error}</div>;
  if (!project) return <p className="muted">Loading…</p>;

  const isAdmin = project.yourRole === "ADMIN";

  return (
    <div className="stack">
      <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 280px" }}>
          <Link to="/projects" className="muted" style={{ fontSize: "0.9rem" }}>
            ← Projects
          </Link>
          <h1 style={{ margin: "0.25rem 0 0.35rem" }}>{project.name}</h1>
          <p className="muted" style={{ margin: 0 }}>
            Your role:{" "}
            <span className={isAdmin ? "badge badge-admin" : "badge badge-member"}>{project.yourRole}</span>
            {" · "}
            Owner: {project.owner.name}
          </p>
          {project.description && <p style={{ marginTop: "0.75rem" }}>{project.description}</p>}
        </div>
        {isAdmin && (
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button type="button" className="btn btn-danger" onClick={() => void deleteProject()}>
              Delete project
            </button>
          </div>
        )}
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="grid-2">
        <div className="card">
          <h2 style={{ marginTop: 0, fontSize: "1.05rem" }}>Add task</h2>
          <form onSubmit={onCreateTask}>
            <div className="field">
              <label htmlFor="t-title">Title</label>
              <input id="t-title" value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
            <div className="field">
              <label htmlFor="t-desc">Description</label>
              <textarea id="t-desc" value={taskDesc} onChange={(e) => setTaskDesc(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="t-status">Status</label>
              <select id="t-status" value={status} onChange={(e) => setStatus(e.target.value as TaskRow["status"])}>
                <option value="TODO">To do</option>
                <option value="IN_PROGRESS">In progress</option>
                <option value="DONE">Done</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="t-due">Due date</label>
              <input id="t-due" type="datetime-local" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="t-assign">Assignee</label>
              <select id="t-assign" value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}>
                <option value="">Unassigned</option>
                {project.members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.email})
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" className="btn btn-primary" disabled={creating}>
              {creating ? "Adding…" : "Add task"}
            </button>
          </form>
        </div>

        <div className="card">
          <h2 style={{ marginTop: 0, fontSize: "1.05rem" }}>Team</h2>
          {isAdmin && (
            <form onSubmit={onInvite} style={{ marginBottom: "1rem" }}>
              <div className="field">
                <label htmlFor="inv-email">Invite by email (user must already be registered)</label>
                <input
                  id="inv-email"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="inv-role">Role</label>
                <select id="inv-role" value={inviteRole} onChange={(e) => setInviteRole(e.target.value as "ADMIN" | "MEMBER")}>
                  <option value="MEMBER">Member</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              <button type="submit" className="btn btn-ghost" disabled={inviting}>
                {inviting ? "Inviting…" : "Add member"}
              </button>
            </form>
          )}
          <table className="table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Role</th>
                {isAdmin && <th />}
              </tr>
            </thead>
            <tbody>
              {project.members.map((m) => {
                const isOwner = m.id === project.owner.id;
                const isYou = m.id === user?.id;
                return (
                  <tr key={m.id}>
                    <td>
                      {m.name}
                      <div className="muted" style={{ fontSize: "0.85rem" }}>
                        {m.email}
                        {isYou ? " (you)" : ""}
                      </div>
                    </td>
                    <td>
                      {isAdmin && !isOwner && !isYou ? (
                        <select
                          value={m.role}
                          onChange={(e) => void changeRole(m.id, e.target.value as "ADMIN" | "MEMBER")}
                          style={{
                            background: "var(--bg)",
                            color: "var(--text)",
                            border: "1px solid var(--border)",
                            borderRadius: 8,
                            padding: "0.25rem 0.5rem",
                          }}
                        >
                          <option value="MEMBER">Member</option>
                          <option value="ADMIN">Admin</option>
                        </select>
                      ) : (
                        <span className={m.role === "ADMIN" ? "badge badge-admin" : "badge badge-member"}>{m.role}</span>
                      )}
                    </td>
                    {isAdmin && (
                      <td>
                        {!isOwner && !isYou && (
                          <button type="button" className="btn btn-danger" onClick={() => void removeMember(m.id)}>
                            Remove
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0, fontSize: "1.05rem" }}>Tasks ({tasks.length})</h2>
        {tasks.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            No tasks yet.
          </p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Status</th>
                  <th>Assignee</th>
                  <th>Due</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => {
                  const canUpdate =
                    isAdmin || task.createdBy.id === user?.id || task.assignee?.id === user?.id;
                  return (
                    <tr key={task.id}>
                      <td style={{ minWidth: 200 }}>
                        <strong>{task.title}</strong>
                        {task.description && (
                          <div className="muted" style={{ fontSize: "0.85rem", whiteSpace: "pre-wrap" }}>
                            {task.description}
                          </div>
                        )}
                      </td>
                      <td>
                        {canUpdate ? (
                          <select
                            value={task.status}
                            onChange={(e) =>
                              void patchTask(task.id, { status: e.target.value as TaskRow["status"] })
                            }
                            style={{
                              background: "var(--bg)",
                              color: "var(--text)",
                              border: "1px solid var(--border)",
                              borderRadius: 8,
                              padding: "0.25rem 0.5rem",
                            }}
                          >
                            <option value="TODO">To do</option>
                            <option value="IN_PROGRESS">In progress</option>
                            <option value="DONE">Done</option>
                          </select>
                        ) : (
                          <span className={statusBadge(task.status)}>{task.status.replace("_", " ")}</span>
                        )}
                      </td>
                      <td>
                        {canUpdate ? (
                          <select
                            value={task.assignee?.id ?? ""}
                            onChange={(e) =>
                              void patchTask(task.id, {
                                assigneeId: e.target.value ? e.target.value : null,
                              })
                            }
                            style={{
                              background: "var(--bg)",
                              color: "var(--text)",
                              border: "1px solid var(--border)",
                              borderRadius: 8,
                              padding: "0.25rem 0.5rem",
                              maxWidth: 220,
                            }}
                          >
                            <option value="">Unassigned</option>
                            {project.members.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          task.assignee?.name ?? "—"
                        )}
                      </td>
                      <td className="muted" style={{ whiteSpace: "nowrap" }}>
                        {canUpdate ? (
                          <input
                            type="datetime-local"
                            defaultValue={
                              task.dueDate
                                ? new Date(task.dueDate).toISOString().slice(0, 16)
                                : ""
                            }
                            onBlur={(e) => {
                              const v = e.target.value;
                              void patchTask(task.id, {
                                dueDate: v ? new Date(v).toISOString() : null,
                              });
                            }}
                          />
                        ) : task.dueDate ? (
                          new Date(task.dueDate).toLocaleString()
                        ) : (
                          "—"
                        )}
                      </td>
                      <td>
                        {(isAdmin || task.createdBy.id === user?.id) && (
                          <button type="button" className="btn btn-danger" onClick={() => void deleteTask(task.id)}>
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
