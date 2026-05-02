import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";

type DashboardResponse = {
  summary: {
    totalTasks: number;
    byStatus: { TODO: number; IN_PROGRESS: number; DONE: number };
    overdueCount: number;
    dueSoonCount: number;
  };
  overdueTasks: Array<{
    id: string;
    title: string;
    status: string;
    dueDate: string | null;
    project: { id: string; name: string };
    assignee: { id: string; name: string } | null;
  }>;
  recentTasks: Array<{
    id: string;
    title: string;
    status: string;
    dueDate: string | null;
    updatedAt: string;
    project: { id: string; name: string };
    assignee: { id: string; name: string } | null;
  }>;
};

function statusBadge(status: string) {
  if (status === "DONE") return "badge badge-done";
  if (status === "IN_PROGRESS") return "badge badge-progress";
  return "badge badge-todo";
}

export function DashboardPage() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await api<DashboardResponse>("/api/dashboard");
        if (!cancelled) setData(r);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load dashboard");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) return <div className="error-banner">{error}</div>;
  if (!data) return <p className="muted">Loading dashboard…</p>;

  const { summary } = data;

  return (
    <div className="stack">
      <div>
        <h1 style={{ margin: "0 0 0.35rem" }}>Dashboard</h1>
        <p className="muted" style={{ margin: 0 }}>
          Tasks across all projects you belong to.
        </p>
      </div>

      <div className="grid-2">
        <div className="card">
          <h2 style={{ marginTop: 0, fontSize: "1rem" }}>Overview</h2>
          <ul style={{ margin: 0, paddingLeft: "1.1rem", color: "var(--muted)" }}>
            <li>
              <strong style={{ color: "var(--text)" }}>{summary.totalTasks}</strong> total tasks
            </li>
            <li>
              To do: <strong style={{ color: "var(--text)" }}>{summary.byStatus.TODO}</strong> · In progress:{" "}
              <strong style={{ color: "var(--text)" }}>{summary.byStatus.IN_PROGRESS}</strong> · Done:{" "}
              <strong style={{ color: "var(--text)" }}>{summary.byStatus.DONE}</strong>
            </li>
            <li>
              <strong style={{ color: "var(--warning)" }}>{summary.overdueCount}</strong> overdue (not done)
            </li>
            <li>
              <strong style={{ color: "var(--accent)" }}>{summary.dueSoonCount}</strong> due within 7 days
            </li>
          </ul>
        </div>
        <div className="card">
          <h2 style={{ marginTop: 0, fontSize: "1rem" }}>Quick links</h2>
          <Link to="/projects" className="btn btn-primary" style={{ width: "100%" }}>
            View projects
          </Link>
        </div>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0, fontSize: "1.05rem" }}>Overdue</h2>
        {data.overdueTasks.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            Nothing overdue. Nice work.
          </p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Task</th>
                <th>Project</th>
                <th>Assignee</th>
                <th>Due</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.overdueTasks.map((t) => (
                <tr key={t.id}>
                  <td>
                    <Link to={`/projects/${t.project.id}`}>{t.title}</Link>
                  </td>
                  <td>{t.project.name}</td>
                  <td>{t.assignee?.name ?? "—"}</td>
                  <td className="muted">{t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "—"}</td>
                  <td>
                    <span className={statusBadge(t.status)}>{t.status.replace("_", " ")}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0, fontSize: "1.05rem" }}>Recently updated</h2>
        {data.recentTasks.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            No tasks yet. Create a project and add tasks.
          </p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Task</th>
                <th>Project</th>
                <th>Assignee</th>
                <th>Updated</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.recentTasks.map((t) => (
                <tr key={t.id}>
                  <td>
                    <Link to={`/projects/${t.project.id}`}>{t.title}</Link>
                  </td>
                  <td>{t.project.name}</td>
                  <td>{t.assignee?.name ?? "—"}</td>
                  <td className="muted">{new Date(t.updatedAt).toLocaleString()}</td>
                  <td>
                    <span className={statusBadge(t.status)}>{t.status.replace("_", " ")}</span>
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
