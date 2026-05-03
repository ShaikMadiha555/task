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
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  headers.set("Accept", "application/json");

  if (options.json !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  const url = `${apiBase()}${path.startsWith("/") ? path : `/${path}`}`;

  let res: Response;

  try {
    res = await fetch(url, {
      method: options.method || "GET",
      headers,
      body: options.json !== undefined ? JSON.stringify(options.json) : undefined,
    });
  } catch (err) {
    throw new Error("Network error: Backend not reachable");
  }

  const text = await res.text();

  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    throw new Error(data?.error || `Request failed with ${res.status}`);
  }

  return data as T;
}
