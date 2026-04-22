import { useState, useEffect } from "react";
import { useVolunteer } from "../context/VolunteerContext";

const SKILL_OPTIONS = [
  { id: "medical",      label: "🏥 Medical" },
  { id: "disaster",     label: "🆘 Disaster Relief" },
  { id: "teaching",     label: "📚 Teaching" },
  { id: "logistics",    label: "🚛 Logistics" },
  { id: "food",         label: "🍱 Food Aid" },
  { id: "counseling",   label: "💬 Counseling" },
  { id: "construction", label: "🔨 Construction" },
  { id: "fundraising",  label: "💰 Fundraising" },
];

const inputStyle = {
  width: "100%", padding: "10px 14px", fontSize: ".875rem",
  border: "1.5px solid var(--border)", borderRadius: "var(--radius-sm)",
  fontFamily: "inherit", fontWeight: 500, color: "var(--text-primary)",
  background: "var(--bg)", outline: "none", boxSizing: "border-box",
  transition: "border-color 0.2s, box-shadow 0.2s",
};

const labelStyle = {
  display: "block", fontSize: ".75rem", fontWeight: 700,
  color: "var(--text-secondary)", marginBottom: 6, letterSpacing: "0.01em",
};

export default function VolunteerProfile({ showToast }) {
  const { volunteer, updateProfile, loading } = useVolunteer();

  const [name,         setName]         = useState("");
  const [email,        setEmail]        = useState("");
  const [phone,        setPhone]        = useState("");
  const [location,     setLocation]     = useState("");
  const [skills,       setSkills]       = useState([]);
  const [availability, setAvailability] = useState(true);
  const [experience,   setExperience]   = useState("");
  const [saving,       setSaving]       = useState(false);
  const [saved,        setSaved]        = useState(false);

  /* Sync state when volunteer loads */
  useEffect(() => {
    if (!volunteer) return;
    setName(volunteer.name || "");
    setEmail(volunteer.email || "");
    setPhone(volunteer.phone || "");
    setLocation(volunteer.location || "");
    setSkills(volunteer.skills || []);
    setAvailability(volunteer.availability ?? true);
    setExperience(volunteer.experience || "");
  }, [volunteer]);

  const toggleSkill = (id) => {
    setSkills(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!name.trim()) { showToast("⚠️ Name is required."); return; }
    setSaving(true);
    try {
      await updateProfile({ name, phone, location, skills, availability, experience });
      setSaved(true);
      showToast("✅ Profile updated successfully!");
      setTimeout(() => setSaved(false), 3000);
    } catch {
      showToast("⚠️ Failed to save. Try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageSpinner />;

  const completedCount = volunteer?.completedTasks ?? 0;
  const badge = getBadge(completedCount);

  return (
    <div style={{ maxWidth: 720, margin: "0 auto" }}>
      {/* Page header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: 4 }}>Hero Profile</h1>
        <p style={{ fontSize: ".85rem", color: "var(--text-secondary)" }}>Manage your profile, skills, and availability.</p>
      </div>

      {/* Profile card */}
      <div style={{ background: "white", border: "1px solid var(--border)", borderRadius: "var(--radius)", boxShadow: "var(--shadow-xs)", overflow: "hidden" }}>
        {/* Hero banner */}
        <div style={{
          height: 100, background: "linear-gradient(135deg, #EF4444 0%, #DC2626 50%, #B91C1C 100%)",
          position: "relative",
        }}>
          <div style={{
            position: "absolute", bottom: -28, left: 28,
            width: 56, height: 56, borderRadius: "50%",
            background: badge.bg, border: "3px solid white",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 28, color: badge.color }}>{badge.icon}</span>
          </div>
        </div>

        <div style={{ padding: "40px 28px 28px" }}>
          {/* Badge row */}
          <div style={{ display: "flex", gap: 10, marginBottom: 24, alignItems: "center" }}>
            <span style={{
              padding: "4px 14px", borderRadius: 999, fontSize: ".72rem", fontWeight: 800,
              background: badge.bg, color: badge.color, border: `1px solid ${badge.border}`,
            }}>{badge.label}</span>
            <span style={{ fontSize: ".78rem", color: "var(--text-muted)" }}>
              {completedCount} task{completedCount !== 1 ? "s" : ""} completed · {completedCount * 125} karma
            </span>
          </div>

          <form onSubmit={handleSave}>
            {/* Basic Info */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: ".8rem", fontWeight: 800, color: "var(--text-primary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 16, paddingBottom: 8, borderBottom: "1px solid var(--border-light)" }}>
                Basic Information
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <label style={labelStyle}>Full Name *</label>
                  <input style={inputStyle} type="text" value={name} onChange={e => setName(e.target.value)}
                    placeholder="Your full name" required
                    onFocus={e => { e.target.style.borderColor = "var(--red-500)"; e.target.style.boxShadow = "0 0 0 3px rgba(239,68,68,0.12)"; }}
                    onBlur={e => { e.target.style.borderColor = "var(--border)"; e.target.style.boxShadow = "none"; }}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Email Address</label>
                  <input style={{ ...inputStyle, background: "#F8FAFC", cursor: "not-allowed", color: "var(--text-muted)" }}
                    type="email" value={email} readOnly />
                </div>
                <div>
                  <label style={labelStyle}>Phone Number</label>
                  <input style={inputStyle} type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    onFocus={e => { e.target.style.borderColor = "var(--red-500)"; e.target.style.boxShadow = "0 0 0 3px rgba(239,68,68,0.12)"; }}
                    onBlur={e => { e.target.style.borderColor = "var(--border)"; e.target.style.boxShadow = "none"; }}
                  />
                </div>
                <div>
                  <label style={labelStyle}>City / Location</label>
                  <input style={inputStyle} type="text" value={location} onChange={e => setLocation(e.target.value)}
                    placeholder="e.g. Pune, Maharashtra"
                    onFocus={e => { e.target.style.borderColor = "var(--red-500)"; e.target.style.boxShadow = "0 0 0 3px rgba(239,68,68,0.12)"; }}
                    onBlur={e => { e.target.style.borderColor = "var(--border)"; e.target.style.boxShadow = "none"; }}
                  />
                </div>
              </div>
            </div>

            {/* Skills */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: ".8rem", fontWeight: 800, color: "var(--text-primary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 16, paddingBottom: 8, borderBottom: "1px solid var(--border-light)" }}>
                Skills
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {SKILL_OPTIONS.map(s => {
                  const sel = skills.includes(s.id);
                  return (
                    <button key={s.id} type="button" onClick={() => toggleSkill(s.id)} style={{
                      padding: "8px 16px", borderRadius: 999, border: `1.5px solid ${sel ? "var(--red-400)" : "var(--border)"}`,
                      background: sel ? "var(--red-50)" : "white",
                      color: sel ? "var(--red-700)" : "var(--text-secondary)",
                      fontWeight: sel ? 700 : 500, fontSize: ".82rem",
                      cursor: "pointer", fontFamily: "inherit",
                      transition: "all 0.18s ease",
                      transform: sel ? "scale(1.04)" : "scale(1)",
                    }}>
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Availability */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: ".8rem", fontWeight: 800, color: "var(--text-primary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 16, paddingBottom: 8, borderBottom: "1px solid var(--border-light)" }}>
                Availability
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                {[
                  { value: true,  label: "✅ Available",     border: "var(--emerald-500)", bg: "#F0FDF4", color: "var(--emerald-700)" },
                  { value: false, label: "⏸ Not Available",  border: "var(--red-400)",     bg: "var(--red-50)", color: "var(--red-700)" },
                ].map(opt => (
                  <button key={String(opt.value)} type="button" onClick={() => setAvailability(opt.value)} style={{
                    flex: 1, padding: "12px 0", borderRadius: "var(--radius-sm)",
                    border: `2px solid ${availability === opt.value ? opt.border : "var(--border)"}`,
                    background: availability === opt.value ? opt.bg : "white",
                    color: availability === opt.value ? opt.color : "var(--text-secondary)",
                    fontWeight: 700, fontSize: ".88rem", cursor: "pointer", fontFamily: "inherit",
                    transition: "all 0.2s ease",
                  }}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Experience */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: ".8rem", fontWeight: 800, color: "var(--text-primary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 16, paddingBottom: 8, borderBottom: "1px solid var(--border-light)" }}>
                Experience
              </div>
              <label style={labelStyle}>Previous volunteer work or relevant background <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>(optional)</span></label>
              <textarea
                style={{ ...inputStyle, minHeight: 90, resize: "vertical", lineHeight: 1.6 }}
                placeholder="Briefly describe your experience..."
                value={experience}
                onChange={e => setExperience(e.target.value)}
                onFocus={e => { e.target.style.borderColor = "var(--red-500)"; e.target.style.boxShadow = "0 0 0 3px rgba(239,68,68,0.12)"; }}
                onBlur={e => { e.target.style.borderColor = "var(--border)"; e.target.style.boxShadow = "none"; }}
              />
            </div>

            {/* Save button */}
            <button type="submit" disabled={saving} style={{
              width: "100%", padding: "12px 0",
              background: saved
                ? "linear-gradient(135deg, #10B981, #059669)"
                : "linear-gradient(135deg, #EF4444, #DC2626)",
              color: "white", border: "none", borderRadius: "var(--radius-sm)",
              fontWeight: 800, fontSize: ".92rem", cursor: saving ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              boxShadow: "0 4px 16px rgba(220,38,38,0.3)",
              transition: "background 0.3s ease, opacity 0.2s",
              opacity: saving ? 0.75 : 1,
            }}>
              {saving ? (
                <><BtnSpinner />&nbsp;Saving...</>
              ) : saved ? (
                <><span className="material-symbols-outlined" style={{ fontSize: 18 }}>check_circle</span> Saved!</>
              ) : (
                <><span className="material-symbols-outlined" style={{ fontSize: 18 }}>save</span> Save Profile</>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function getBadge(count) {
  if (count >= 20) return { label: "Golden Hero 🥇", icon: "workspace_premium", color: "#B45309", bg: "#FEF3C7", border: "#FDE68A" };
  if (count >= 10) return { label: "Silver Hero 🥈",  icon: "military_tech",     color: "#475569", bg: "#F1F5F9", border: "#CBD5E1" };
  if (count >= 5)  return { label: "Rising Star ⭐",  icon: "auto_awesome",      color: "#059669", bg: "#ECFDF5", border: "#A7F3D0" };
  return { label: "Volunteer 🙋",  icon: "person",            color: "#6B7280", bg: "#F3F4F6", border: "#E5E7EB" };
}

function PageSpinner() {
  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 300 }}>
      <div style={{
        width: 36, height: 36, borderRadius: "50%",
        border: "3px solid var(--border)", borderTopColor: "var(--red-500)",
        animation: "spin 0.7s linear infinite",
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function BtnSpinner() {
  return (
    <svg style={{ animation: "spin 0.8s linear infinite" }} width="16" height="16" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" opacity="0.3" />
      <path d="M4 12a8 8 0 018-8" stroke="white" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
