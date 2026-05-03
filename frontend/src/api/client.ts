const TOKEN_KEY = "taskapp_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

/**
 * 🔥 LIVE BACKEND URL (RAILWAY)
 */
function apiBase(): string {
  return "https://task-production-cdb8.up.railway.app";
}

export async function api<T>(
  path: string,
  options: RequestInit & { json?: unknown } = {}
): Promise<T> {
  const headers = new Headers(options.headers);

  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  if (options.json !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  const url = `${apiBase()}${path.startsWith("/") ? path : `/${path}`}`;

  const res = await fetch(url, {
    ...options,
    headers,
    body: options.json !== undefined ? JSON.stringify(options.json) : options.body,
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    throw new Error(data?.error || res.statusText);
  }

  return data as T;
}
