
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ui } from "../ui";

type LoginResponse = {
  token?: string;
  accessToken?: string;
  refreshToken?: string;
  user?: {
    id?: string;
    name?: string;
    role?: string;
    facility?: string;
    email?: string;
  };
  message?: string;
  error?: string;
};

async function readErrorMessage(res: Response): Promise<string> {
  const ct = res.headers.get("content-type") ?? "";
  const fallback = `Request failed (${res.status})`;

  try {
    if (ct.includes("application/json")) {
      const data = await res.json();
      return data?.message || data?.error || fallback;
    }
  } catch {
    
  }

  try {
    const text = await res.text();
    if (text.trim()) return text.trim();
  } catch {
    
  }

  return fallback;
}

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("nurse1@kiwi.test");
  const [password, setPassword] = useState("kiwi1234");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const emailTrim = email.trim();
    const passwordTrim = password.trim();

    if (!emailTrim || !passwordTrim) {
      setError("Please enter email and password.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailTrim, password: passwordTrim }),
      });

      if (!res.ok) throw new Error(await readErrorMessage(res));

      const data = (await res.json()) as LoginResponse;

      const accessToken = data.token ?? data.accessToken;
      const refreshToken = data.refreshToken;

      if (!accessToken) throw new Error("Login succeeded but no access token was returned.");
      if (!refreshToken) throw new Error("Login succeeded but no refresh token was returned.");

      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("refreshToken", refreshToken);
      if (data.user) localStorage.setItem("nurseUser", JSON.stringify(data.user));

      navigate("/dashboard", { replace: true });
    } catch (err: any) {
      setError(err?.message ?? "Login failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={ui.page}>
      <div style={{ ...ui.shell, maxWidth: 520 }}>
        <div style={{ ...ui.card, padding: 22 }}>
          <div style={{ display: "grid", gap: 8 }}>
            <h1 style={{ ...ui.h1, fontSize: 40 }}>Login</h1>
            <div style={ui.sub}>Sign in to view patients and manage your profile.</div>
          </div>

          <form onSubmit={handleSubmit} style={{ display: "grid", gap: 12, marginTop: 16 }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span style={ui.label}>Email</span>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nurse1@kiwi.test"
                autoComplete="username"
                disabled={loading}
                style={ui.input}
              />
            </label>

            <label style={{ display: "grid", gap: 6 }}>
              <span style={ui.label}>Password</span>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                placeholder="kiwi1234"
                autoComplete="current-password"
                disabled={loading}
                style={ui.input}
              />
            </label>

            <button type="submit" disabled={loading} style={ui.btn}>
              {loading ? "Signing in..." : "Sign in"}
            </button>

            {error && <div style={ui.alertError}>{error}</div>}
          </form>

          <div style={{ marginTop: 14, fontSize: 12, color: "#64748b" }}>
            Tip: credentials are nurse1@kiwi.test / kiwi1234
          </div>
        </div>
      </div>
    </div>
  );
}