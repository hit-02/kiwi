
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiFetchJson, clearSession, getSessionUser, logoutApi } from "../api";
import { ui } from "../ui";

type Vitals = {
  hr?: number | string | null;
  spo2?: number | string | null;
  tempC?: number | string | null;
};

type Patient = {
  id: string;
  name: string;
  age?: number;
  room?: string;
  lastSeen?: number;
  lastVitals?: Vitals;
};

type PatientsResponse = { patients?: Patient[] };

type NurseUser = {
  id?: string;
  name?: string;
  role?: string;
  facility?: string;
};

type NurseProfile = {
  name?: string;
  fullName?: string;
  facility?: string;
};

function toNumberOrNull(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function formatLastSeen(unixSeconds?: number): string {
  if (!unixSeconds) return "—";
  const ms = unixSeconds * 1000;
  const diffMs = Date.now() - ms;

  if (diffMs < 0) return new Date(ms).toLocaleString();

  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;

  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hr ago`;

  return new Date(ms).toLocaleString();
}

function formatHr(hr: number | null): string {
  if (hr === null) return "—";
  return `${hr} bpm`;
}

function formatSpo2(spo2: number | null): string {
  if (spo2 === null) return "—";
  return `${spo2}%`;
}

function formatTempC(tempC: number | null): string {
  if (tempC === null) return "—";
  const fixed = Number.isInteger(tempC) ? String(tempC) : tempC.toFixed(1);
  return `${fixed}°C`;
}

function severityFromVitals(v: { hr: number | null; spo2: number | null; tempC: number | null }): "ok" | "warn" {
  
  if (v.spo2 !== null && v.spo2 < 92) return "warn";
  if (v.hr !== null && (v.hr < 50 || v.hr > 120)) return "warn";
  if (v.tempC !== null && (v.tempC < 35.5 || v.tempC >= 38.0)) return "warn";
  return "ok";
}

export default function Dashboard() {
  const navigate = useNavigate();

  const [loadingPatients, setLoadingPatients] = useState(true);
  const [patientsError, setPatientsError] = useState<string | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);

  const [loadingNurse, setLoadingNurse] = useState(true);
  const [nurseError, setNurseError] = useState<string | null>(null);
  const [nurseName, setNurseName] = useState("—");
  const [nurseFacility, setNurseFacility] = useState("");

  const [query, setQuery] = useState("");

  function redirectToLogin() {
    clearSession();
    navigate("/login", { replace: true });
  }

  async function loadNurseHeader() {
    setLoadingNurse(true);
    setNurseError(null);

    const cached = getSessionUser<NurseUser>();
    if (cached?.name) setNurseName(cached.name);
    if (cached?.facility) setNurseFacility(cached.facility);

    try {
      const data = await apiFetchJson<NurseProfile>("/api/nurse/profile");
      setNurseName(data.fullName ?? data.name ?? cached?.name ?? "—");
      setNurseFacility(data.facility ?? cached?.facility ?? "");
    } catch (e: any) {
      if (e?.status === 401) return redirectToLogin();
      setNurseError(e?.message ?? "Failed to load nurse info");
    } finally {
      setLoadingNurse(false);
    }
  }

  async function loadPatients() {
    setLoadingPatients(true);
    setPatientsError(null);

    try {
      const data = await apiFetchJson<PatientsResponse>("/api/nurse/patients");
      const list = Array.isArray(data?.patients) ? data.patients : [];
      setPatients(list);
    } catch (e: any) {
      if (e?.status === 401) return redirectToLogin();
      setPatientsError(e?.message ?? "Failed to load patients");
      setPatients([]);
    } finally {
      setLoadingPatients(false);
    }
  }

  useEffect(() => {
    loadNurseHeader();
    loadPatients();
    
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter((p) => {
      const hay = `${p.name ?? ""} ${p.room ?? ""} ${p.id ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [patients, query]);

  return (
    <div style={ui.page}>
      <div style={ui.shell}>
        <div style={ui.topbar}>
          <div style={ui.titleRow}>
            <h1 style={ui.h1}>Dashboard</h1>
            <div style={ui.sub}>
              {loadingNurse
                ? "Loading nurse info..."
                : nurseError
                ? nurseError
                : `${nurseName}${nurseFacility ? ` • ${nurseFacility}` : ""}`}
            </div>
          </div>

          <div style={ui.nav}>
            <Link to="/profile" style={ui.link}>
              Profile
            </Link>
            <button
              style={ui.btnSoft}
              onClick={async () => {
                try {
                  await logoutApi();
                } finally {
                  redirectToLogin();
                }
              }}
            >
              Logout
            </button>
          </div>
        </div>

        <div style={{ ...ui.card, marginBottom: 14 }}>
          <div style={ui.row}>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, room, or id"
              style={ui.input}
            />
            <button onClick={loadPatients} disabled={loadingPatients} style={ui.btnSoft}>
              {loadingPatients ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>

        {loadingPatients && <div style={{ ...ui.card, color: "#475569" }}>Loading patients...</div>}

        {!loadingPatients && patientsError && (
          <div style={ui.alertError}>
            <div>{patientsError}</div>
            <button style={{ ...ui.btnSoft, marginTop: 10 }} onClick={loadPatients}>
              Retry
            </button>
          </div>
        )}

        {!loadingPatients && !patientsError && filtered.length === 0 && (
          <div style={{ ...ui.card, color: "#475569" }}>
            {patients.length === 0 ? "No patients found." : "No matches."}
          </div>
        )}

        {!loadingPatients && !patientsError && filtered.length > 0 && (
          <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
            {filtered.map((p) => {
              const hr = toNumberOrNull(p.lastVitals?.hr);
              const spo2 = toNumberOrNull(p.lastVitals?.spo2);
              const tempC = toNumberOrNull(p.lastVitals?.tempC);

              const sev = severityFromVitals({ hr, spo2, tempC });

              return (
                <div key={p.id} style={{ ...ui.card, display: "grid", gap: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                    <div style={{ display: "grid", gap: 4 }}>
                      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <div style={{ fontWeight: 900, fontSize: 18, color: "#0f172a" }}>{p.name}</div>
                        <span
                          style={{
                            ...ui.pill,
                            background: sev === "warn" ? "rgba(239,68,68,0.10)" : "rgba(34,197,94,0.10)",
                            border: sev === "warn" ? "1px solid rgba(239,68,68,0.22)" : "1px solid rgba(34,197,94,0.22)",
                            color: sev === "warn" ? "#991b1b" : "#14532d",
                          }}
                        >
                          {sev === "warn" ? "Needs attention" : "Stable"}
                        </span>
                      </div>

                      <div style={{ color: "#475569", fontSize: 14 }}>
                        Room: {p.room ?? "—"} {typeof p.age === "number" ? `• Age: ${p.age}` : ""}
                      </div>
                    </div>

                    <div style={{ textAlign: "right", color: "#475569" }}>
                      <div style={{ fontSize: 12 }}>Last seen</div>
                      <div style={{ fontWeight: 800, color: "#0f172a" }}>{formatLastSeen(p.lastSeen)}</div>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
                    <div style={{ ...ui.card, boxShadow: "none", padding: 12 }}>
                      <div style={ui.label}>HR</div>
                      <div style={{ fontSize: 20, fontWeight: 900, color: "#0f172a" }}>{formatHr(hr)}</div>
                    </div>

                    <div style={{ ...ui.card, boxShadow: "none", padding: 12 }}>
                      <div style={ui.label}>SpO₂</div>
                      <div style={{ fontSize: 20, fontWeight: 900, color: "#0f172a" }}>{formatSpo2(spo2)}</div>
                    </div>

                    <div style={{ ...ui.card, boxShadow: "none", padding: 12 }}>
                      <div style={ui.label}>Temp</div>
                      <div style={{ fontSize: 20, fontWeight: 900, color: "#0f172a" }}>{formatTempC(tempC)}</div>
                    </div>
                  </div>

                  <div style={{ fontSize: 12, color: "#94a3b8" }}>id: {p.id}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}