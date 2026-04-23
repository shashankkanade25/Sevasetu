import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { createUserProfile } from "../api";

const PURPLE = "#6C63FF";
const PURPLE_DARK = "#5A52D5";

const SKILLS = ["Medical", "Disaster Relief", "Teaching", "Logistics", "Food Aid", "Counseling", "Construction", "Fundraising"];
const FOCUS_AREAS = ["Education", "Healthcare", "Disaster Relief", "Women Empowerment", "Child Welfare", "Rural Development", "Environment", "Other"];

const inp = {
  width: "100%", padding: "12px 16px", fontSize: ".9rem",
  border: "1.5px solid #E2E8F0", borderRadius: 12,
  fontFamily: "inherit", color: "#1E293B", background: "#F8FAFC",
  outline: "none", boxSizing: "border-box", transition: "all .2s",
};

const lbl = { display: "block", fontSize: ".8rem", fontWeight: 700, color: "#475569", marginBottom: 8, textTransform: "uppercase" };

export default function CompleteProfile({ onLogin }) {
  const { state } = useLocation();
  const navigate = useNavigate();

  if (!state) {
    navigate("/auth");
    return null;
  }

  const { email, name: googleName, photoURL, role } = state;

  const [name, setName] = useState(googleName || "");
  const [location, setLocation] = useState("");
  const [skills, setSkills] = useState([]);
  const [availability, setAvailability] = useState(true);
  const [organization, setOrganization] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [focusArea, setFocusArea] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const toggleSkill = (s) => setSkills(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const payload = {
      role, email, name, photoURL,
      ...(role === "volunteer" ? { skills, location, availability } : { organization, contactPerson, focusArea, location })
    };

    try {
      const res = await createUserProfile(payload);
      localStorage.setItem("seva_token", res.data.token);
      onLogin({ email, photoURL, role, dbUser: res.data.user, token: res.data.token });
      navigate(role === "volunteer" ? "/volunteer/dashboard" : "/");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to save profile.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#F8FAFC", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 20px" }}>
      <div style={{ width: "100%", maxWidth: 600, background: "white", borderRadius: 24, boxShadow: "0 20px 50px rgba(0,0,0,.05)", padding: 40 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <h2 style={{ fontSize: "1.75rem", fontWeight: 800, color: "#1E293B", marginBottom: 8 }}>Complete Your Profile</h2>
          <p style={{ color: "#64748B", fontSize: ".9rem" }}>Help us understand how you can contribute to the community.</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 20 }}>
            <label style={lbl}>Full Name</label>
            <input style={inp} value={name} onChange={e => setName(e.target.value)} required />
          </div>

          {role === "volunteer" ? (
            <>
              <div style={{ marginBottom: 20 }}>
                <label style={lbl}>Location (City/Area)</label>
                <input style={inp} value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Mumbai, MH" required />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={lbl}>Skills</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {SKILLS.map(s => {
                    const sel = skills.includes(s);
                    return (
                      <button key={s} type="button" onClick={() => toggleSkill(s)} style={{
                        padding: "8px 16px", borderRadius: 10, fontSize: ".8rem", fontWeight: 600,
                        border: `1.5px solid ${sel ? PURPLE : "#E2E8F0"}`,
                        background: sel ? PURPLE : "white",
                        color: sel ? "white" : "#64748B",
                        cursor: "pointer", transition: "all .2s"
                      }}>{s}</button>
                    );
                  })}
                </div>
              </div>
              <div style={{ marginBottom: 24 }}>
                <label style={lbl}>Availability</label>
                <div style={{ display: "flex", gap: 10 }}>
                  {[true, false].map(v => (
                    <button key={String(v)} type="button" onClick={() => setAvailability(v)} style={{
                      flex: 1, padding: "12px", borderRadius: 12, fontWeight: 700, fontSize: ".85rem",
                      border: `2px solid ${availability === v ? PURPLE : "#E2E8F0"}`,
                      background: availability === v ? "#F5F3FF" : "white",
                      color: availability === v ? PURPLE : "#64748B",
                      cursor: "pointer", transition: "all .2s"
                    }}>{v ? "Available" : "Busy"}</button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              <div style={{ marginBottom: 20 }}>
                <label style={lbl}>Organization Name</label>
                <input style={inp} value={organization} onChange={e => setOrganization(e.target.value)} placeholder="NGO Name" required />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={lbl}>Contact Person Position</label>
                <input style={inp} value={contactPerson} onChange={e => setContactPerson(e.target.value)} placeholder="e.g. Director, Coordinator" required />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={lbl}>Focus Area</label>
                <select style={inp} value={focusArea} onChange={e => setFocusArea(e.target.value)} required>
                  <option value="">Select Focus Area</option>
                  {FOCUS_AREAS.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={lbl}>Location</label>
                <input style={inp} value={location} onChange={e => setLocation(e.target.value)} placeholder="City, State" required />
              </div>
            </>
          )}

          {error && <div style={{ color: "#EF4444", fontSize: ".85rem", marginBottom: 16, fontWeight: 500 }}>{error}</div>}

          <button type="submit" disabled={loading} style={{
            width: "100%", padding: "14px", borderRadius: 12, border: "none",
            background: `linear-gradient(135deg, ${PURPLE}, ${PURPLE_DARK})`,
            color: "white", fontWeight: 700, fontSize: ".95rem",
            cursor: loading ? "not-allowed" : "pointer", opacity: loading ? .7 : 1,
            boxShadow: "0 10px 25px rgba(108,99,255,.2)"
          }}>
            {loading ? "Saving Profile..." : "Complete Registration"}
          </button>
        </form>
      </div>
    </div>
  );
}
