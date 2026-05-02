import { Link, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

function NavItems() {
  const { user, logout } = useAuth();
  if (!user) return null;

  const linkStyle = ({ isActive }: { isActive: boolean }) => ({
    color: isActive ? "var(--text)" : "var(--muted)",
    fontWeight: isActive ? 600 : 500,
    textDecoration: "none",
    padding: "0.35rem 0.65rem",
    borderRadius: "8px",
    background: isActive ? "var(--surface2)" : "transparent",
  });

  return (
    <>
      <NavLink to="/dashboard" style={linkStyle}>
        Dashboard
      </NavLink>
      <NavLink to="/projects" style={linkStyle}>
        Projects
      </NavLink>
      <span style={{ flex: 1 }} />
      <span className="muted" style={{ fontSize: "0.9rem" }}>
        {user.name}
      </span>
      <button type="button" className="btn btn-ghost" onClick={() => logout()}>
        Log out
      </button>
    </>
  );
}

export function Layout() {
  const { user } = useAuth();

  return (
    <>
      <header
        style={{
          borderBottom: "1px solid var(--border)",
          background: "rgba(26, 35, 50, 0.85)",
          backdropFilter: "blur(10px)",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <div
          className="container"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "1rem",
            paddingBlock: "0.85rem",
            flexWrap: "wrap",
          }}
        >
          <Link to={user ? "/dashboard" : "/"} style={{ fontWeight: 700, fontSize: "1.1rem", color: "var(--text)" }}>
            Team Tasks
          </Link>
          <NavItems />
        </div>
      </header>
      <main className="container" style={{ paddingBlock: "2rem 3rem" }}>
        <Outlet />
      </main>
    </>
  );
}
