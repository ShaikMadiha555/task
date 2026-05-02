import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export function HomePage() {
  const { user } = useAuth();

  return (
    <div className="stack" style={{ maxWidth: 640 }}>
      <h1 style={{ margin: 0, fontSize: "2rem", letterSpacing: "-0.02em" }}>
        Projects, tasks, and roles — in one place
      </h1>
      <p className="muted" style={{ fontSize: "1.05rem", margin: 0 }}>
        Sign up to create projects, invite teammates as admins or members, assign work, track status, and see what is overdue on your dashboard.
      </p>
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginTop: "0.5rem" }}>
        {user ? (
          <Link to="/dashboard" className="btn btn-primary">
            Go to dashboard
          </Link>
        ) : (
          <>
            <Link to="/register" className="btn btn-primary">
              Create account
            </Link>
            <Link to="/login" className="btn btn-ghost">
              Log in
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
