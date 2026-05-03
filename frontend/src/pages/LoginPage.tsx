import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, setToken } from "../api/client";

export function LoginPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);

    try {
      // 🔥 Call backend login API
      const res = await api<{ token: string }>("/api/auth/login", {
        method: "POST",
        json: { email, password },
      });

      // 🔐 Save token in localStorage
      setToken(res.token);

      // 🚀 Redirect after login
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ maxWidth: 420, marginInline: "auto" }}>
      <h1 style={{ marginTop: 0 }}>Log in</h1>

      {error && <div className="error-banner">{error}</div>}

      <form onSubmit={onSubmit} className="card">
        <div className="field">
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>

        <div className="field">
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          disabled={busy}
          style={{ width: "100%" }}
        >
          {busy ? "Signing in..." : "Sign in"}
        </button>

        <p className="muted" style={{ marginTop: "1rem", textAlign: "center" }}>
          No account? <Link to="/register">Register</Link>
        </p>
      </form>
    </div>
  );
}
