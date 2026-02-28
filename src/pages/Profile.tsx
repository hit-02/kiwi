
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiFetchJson, clearSession, logoutApi } from "../api";
import { ui } from "../ui";

type NurseProfile = {
  fullName?: string;
  name?: string;
  email?: string;
  nurseId?: string;
  id?: string;
  facility?: string;
  shiftPreference?: "Day" | "Night" | string;
};

function normalizeShift(v: unknown): "Day" | "Night" {
  return v === "Night" ? "Night" : "Day";
}

function getDisplayName(p: NurseProfile | null): string {
  if (!p) return "";
  return p.fullName ?? p.name ?? "";
}

function getDisplayNurseId(p: NurseProfile | null): string {
  if (!p) return "";
  return p.nurseId ?? p.id ?? "";
}

function buildPatchPayload(
  original: NurseProfile,
  next: { fullName: string; facility: string; shiftPreference: "Day" | "Night" }
) {
  const payload: Record<string, unknown> = {};

  const nameNow = next.fullName.trim();
  const facilityNow = next.facility.trim();
  const shiftNow = next.shiftPreference;

  const nameOrig = (original.fullName ?? original.name ?? "").trim();
  const facilityOrig = (original.facility ?? "").trim();
  const shiftOrig = normalizeShift(original.shiftPreference);

  if (nameOrig !== nameNow) {
    const key = original.fullName !== undefined ? "fullName" : "name";
    payload[key] = nameNow;
  }
  if (facilityOrig !== facilityNow) payload["facility"] = facilityNow;
  if (shiftOrig !== shiftNow) payload["shiftPreference"] = shiftNow;

  return payload;
}

export default function Profile() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [profile, setProfile] = useState<NurseProfile | null>(null);

  const [fullName, setFullName] = useState("");
  const [facility, setFacility] = useState("");
  const [shiftPreference, setShiftPreference] = useState<"Day" | "Night">("Day");

  function clearMessages() {
    setError(null);
    setSuccess(null);
  }

  function redirectToLogin() {
    clearSession();
    navigate("/login", { replace: true });
  }

  async function loadProfile() {
    setLoading(true);
    clearMessages();

    try {
      const data = await apiFetchJson<NurseProfile>("/api/nurse/profile");
      setProfile(data);
      setFullName(getDisplayName(data));
      setFacility(data.facility ?? "");
      setShiftPreference(normalizeShift(data.shiftPreference));
    } catch (e: any) {
      if (e?.status === 401) return redirectToLogin();
      setError(e?.message ?? "Failed to load profile");
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }

  const isDirty = useMemo(() => {
    if (!profile) return false;
    const payload = buildPatchPayload(profile, { fullName, facility, shiftPreference });
    return Object.keys(payload).length > 0;
  }, [profile, fullName, facility, shiftPreference]);

  async function saveProfile() {
    if (!profile) return;

    setSaving(true);
    clearMessages();

    try {
      const payload = buildPatchPayload(profile, { fullName, facility, shiftPreference });

      if (Object.keys(payload).length === 0) {
        setSuccess("No changes to save.");
        window.setTimeout(() => setSuccess(null), 1500);
        return;
      }

      try {
        const updated = await apiFetchJson<NurseProfile>(
          "/api/nurse/profile",
          { method: "PATCH", body: JSON.stringify(payload) },
          { allowNoJson: true }
        );

        if (updated) {
          setProfile(updated);
          setFullName(getDisplayName(updated) || fullName.trim());
          setFacility(updated.facility ?? facility.trim());
          setShiftPreference(normalizeShift(updated.shiftPreference));
        } else {
          await loadProfile();
        }
      } catch (e: any) {
        if (e?.status === 401) return redirectToLogin();

        if (e?.status === 404 || e?.status === 405) {
          const updated = await apiFetchJson<NurseProfile>(
            "/api/nurse/profile",
            { method: "PUT", body: JSON.stringify(payload) },
            { allowNoJson: true }
          );

          if (updated) {
            setProfile(updated);
            setFullName(getDisplayName(updated) || fullName.trim());
            setFacility(updated.facility ?? facility.trim());
            setShiftPreference(normalizeShift(updated.shiftPreference));
          } else {
            await loadProfile();
          }
        } else {
          throw e;
        }
      }

      setSuccess("Saved!");
      window.setTimeout(() => setSuccess(null), 2000);
    } catch (e: any) {
      if (e?.status === 401) return redirectToLogin();
      setError(e?.message ?? "Failed to save profile");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    loadProfile();
    
  }, []);

  return (
    <div style={ui.page}>
      <div style={{ ...ui.shell, maxWidth: 820 }}>
        <div style={ui.topbar}>
          <div style={ui.titleRow}>
            <h1 style={ui.h1}>Profile</h1>
            <div style={ui.sub}>
              {profile?.email ?? ""} {profile?.facility ? `• ${profile.facility}` : ""}
            </div>
          </div>

          <div style={ui.nav}>
            <Link to="/dashboard" style={ui.link}>
              Dashboard
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

        {loading && <div style={ui.card}>Loading profile...</div>}

        {!loading && (error || success) && (
          <div style={error ? ui.alertError : ui.alertOk}>{error ?? success}</div>
        )}

        {!loading && profile && (
          <div style={{ ...ui.card, marginTop: 14 }}>
            <div style={{ display: "grid", gap: 12 }}>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={ui.label}>Full Name</span>
                <input
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    clearMessages();
                  }}
                  style={ui.input}
                />
              </label>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <label style={{ display: "grid", gap: 6 }}>
                  <span style={ui.label}>Email (read-only)</span>
                  <input value={profile.email ?? ""} readOnly style={{ ...ui.input, background: "#f8fafc" }} />
                </label>

                <label style={{ display: "grid", gap: 6 }}>
                  <span style={ui.label}>Nurse ID (read-only)</span>
                  <input value={getDisplayNurseId(profile)} readOnly style={{ ...ui.input, background: "#f8fafc" }} />
                </label>
              </div>

              <label style={{ display: "grid", gap: 6 }}>
                <span style={ui.label}>Facility</span>
                <input
                  value={facility}
                  onChange={(e) => {
                    setFacility(e.target.value);
                    clearMessages();
                  }}
                  style={ui.input}
                />
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                <span style={ui.label}>Shift Preference</span>
                <select
                  value={shiftPreference}
                  onChange={(e) => {
                    setShiftPreference(e.target.value as "Day" | "Night");
                    clearMessages();
                  }}
                  style={ui.select}
                >
                  <option value="Day">Day</option>
                  <option value="Night">Night</option>
                </select>
              </label>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button onClick={saveProfile} disabled={saving || !isDirty} style={ui.btn}>
                  {saving ? "Saving..." : "Save"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setFullName(getDisplayName(profile));
                    setFacility(profile.facility ?? "");
                    setShiftPreference(normalizeShift(profile.shiftPreference));
                    clearMessages();
                  }}
                  disabled={saving || !isDirty}
                  style={ui.btnSoft}
                >
                  Reset
                </button>

                <button type="button" onClick={loadProfile} disabled={saving} style={ui.btnSoft}>
                  Reload
                </button>
              </div>

              <div style={{ fontSize: 12, color: "#64748b" }}>
                Sends only changed fields. Tries PATCH first, then falls back to PUT if PATCH isn’t supported.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}