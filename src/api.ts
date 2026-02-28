// src/api.ts
const API_BASE = ""; 

const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";
const USER_KEY = "nurseUser";

//storage helpers
export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setAccessToken(token: string) {
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function setRefreshToken(token: string) {
  localStorage.setItem(REFRESH_TOKEN_KEY, token);
}

export function setSessionUser(user: unknown) {
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch {
    // ignore
  }
}

export function getSessionUser<T = any>(): T | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

//small utilities
function isProbablyJwt(token: string | null): boolean {
  if (!token) return false;
  const parts = token.split(".");
  return parts.length === 3 && parts.every((p) => p.length > 0);
}

async function readErrorMessage(res: Response): Promise<string> {
  const ct = res.headers.get("content-type") ?? "";
  try {
    if (ct.includes("application/json")) {
      const data = await res.json();
      return (
        data?.message ||
        data?.error ||
        (typeof data === "string" ? data : null) ||
        `Request failed (${res.status})`
      );
    }
  } catch {
    
  }

  try {
    const text = await res.text();
    if (text?.trim()) return text.trim();
  } catch {
    
  }

  return `Request failed (${res.status})`;
}

//logout 
export async function logoutApi(): Promise<void> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return;

  try {
    await fetch(`${API_BASE}/api/auth/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
  } catch {
    
  }
}

//refresh
let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  const res = await fetch(`${API_BASE}/api/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });

  if (!res.ok) {
    if (res.status === 401) clearSession();
    return null;
  }

  const data = (await res.json()) as {
    token?: string;
    accessToken?: string;
    refreshToken?: string;
  };

  const newAccess = data.accessToken ?? data.token ?? null;
  if (!newAccess) return null;

  setAccessToken(newAccess);
  if (data.refreshToken) setRefreshToken(data.refreshToken);

  return newAccess;
}

async function refreshOnce(): Promise<string | null> {
  if (!refreshInFlight) {
    refreshInFlight = refreshAccessToken()
      .catch(() => null)
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

//auth + json headers
function withHeaders(init?: RequestInit): RequestInit {
  const token = getAccessToken();
  const headers = new Headers(init?.headers || {});

  const hasBody = init?.body !== undefined && init?.body !== null;
  const bodyIsString = typeof init?.body === "string";
  if (hasBody && bodyIsString && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (token && !isProbablyJwt(token)) {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
  } else if (isProbablyJwt(token)) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return { ...init, headers };
}

// main fetch
export async function apiFetch(input: string, init?: RequestInit): Promise<Response> {
  const url = `${API_BASE}${input}`;

  let res = await fetch(url, withHeaders(init));

  if (res.status === 401) {
    const newToken = await refreshOnce();

    if (!newToken) {
      clearSession();
      return res;
    }

    res = await fetch(url, withHeaders(init));
    if (res.status === 401) clearSession();
  }

  return res;
}

//helper for JSON endpoints
type ApiFetchJsonOptions = {
  allowNoJson?: boolean; 
};

export async function apiFetchJson<T>(
  input: string,
  init?: RequestInit,
  options: ApiFetchJsonOptions = {}
): Promise<T> {
  const res = await apiFetch(input, init);

  if (!res.ok) {
    const msg = await readErrorMessage(res);
    const err = new Error(msg) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }

  if (res.status === 204) {
    if (options.allowNoJson) return null as unknown as T;
    throw new Error("No content returned (204).");
  }

  const ct = res.headers.get("content-type") ?? "";
  if (!ct.includes("application/json")) {
    if (options.allowNoJson) return null as unknown as T;
    throw new Error("Expected JSON but got non-JSON. Check API URL/proxy.");
  }

  return (await res.json()) as T;
}