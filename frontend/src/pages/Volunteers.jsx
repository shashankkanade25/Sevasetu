import { useEffect, useState } from "react";
import { getVolunteers, addVolunteer } from "../api";

const EMPTY_FORM = { name: "", skills: "", location: "", availability: true };

const SKILL_COLORS = {
  medical: { bg: "var(--red-50)", color: "var(--red-700)", border: "var(--red-200)" },
  health: { bg: "var(--red-50)", color: "var(--red-700)", border: "var(--red-200)" },
  rescue: { bg: "var(--amber-50)", color: "var(--amber-600)", border: "var(--amber-100)" },
  flood: { bg: "var(--amber-50)", color: "var(--amber-600)", border: "var(--amber-100)" },
  education: { bg: "var(--slate-50)", color: "var(--slate-600)", border: "var(--slate-200)" },
  water: { bg: "var(--slate-100)", color: "var(--slate-600)", border: "var(--slate-200)" },
};

function getSkillStyle(skill) {
  const s = skill?.toLowerCase();
  return SKILL_COLORS[s] || { bg: "var(--bg-subtle)", color: "var(--text-secondary)", border: "var(--border)" };
}

export default function Volunteers() {
  const [volunteers, setVolunteers] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [skillFilter, setSkillFilter] = useState("All");
  const [locFilter, setLocFilter] = useState("All");

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const load = () => {
    setLoading(true);
    getVolunteers()
      .then(res => setVolunteers(res.data))
      .catch(() => showToast("Failed to load volunteers", "error"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.location) return showToast("Name and location are required", "error");
    setSubmitting(true);
    try {
      await addVolunteer({
        name: form.name.trim(),
        skills: form.skills.split(",").map(s => s.trim()).filter(Boolean),
        location: form.location.trim(),
        availability: form.availability,
      });
      showToast(`${form.name} added successfully!`);
      setForm(EMPTY_FORM);
      setShowForm(false);
      load();
    } catch { showToast("Failed to add volunteer", "error"); }
    finally { setSubmitting(false); }
  };

  const allSkills = [...new Set(volunteers.flatMap(v => v.skills || []))];
  const allLocations = [...new Set(volunteers.map(v => v.location).filter(Boolean))];

  const filtered = volunteers.filter(v => {
    if (search) {
      const q = search.toLowerCase();
      if (!(v.name || "").toLowerCase().includes(q) &&
          !(v.location || "").toLowerCase().includes(q) &&
          !(v.skills || []).some(s => s.toLowerCase().includes(q))) return false;
    }
    if (skillFilter !== "All" && !(v.skills || []).includes(skillFilter)) return false;
    if (locFilter !== "All" && v.location !== locFilter) return false;
    return true;
  });

  return (
    <div>
      <div className="page-header">
        <h1>
          <span className="material-symbols-outlined">group</span>
          Volunteers
        </h1>
        <p>Manage, register, and track community volunteers for task coordination.</p>
      </div>

      {/* Stats */}
      <div className="stats-row">
        <div className="stat-card primary-accent animate-in">
          <div className="stat-icon primary">
            <span className="material-symbols-outlined">group</span>
          </div>
          <span className="stat-label">Total Volunteers</span>
          <span className="stat-value primary">{volunteers.length}</span>
        </div>
        <div className="stat-card success-accent animate-in">
          <div className="stat-icon success">
            <span className="material-symbols-outlined">check_circle</span>
          </div>
          <span className="stat-label">Available</span>
          <span className="stat-value success">{volunteers.filter(v => v.availability).length}</span>
        </div>
        <div className="stat-card danger-accent animate-in">
          <div className="stat-icon danger">
            <span className="material-symbols-outlined">cancel</span>
          </div>
          <span className="stat-label">Unavailable</span>
          <span className="stat-value danger">{volunteers.filter(v => !v.availability).length}</span>
        </div>
        <div className="stat-card slate-accent animate-in">
          <div className="stat-icon info">
            <span className="material-symbols-outlined">psychology</span>
          </div>
          <span className="stat-label">Unique Skills</span>
          <span className="stat-value info">{allSkills.length}</span>
        </div>
      </div>

      {/* Add Volunteer Form */}
      <div className="card animate-in">
        <div className="card-title" style={{ justifyContent: "space-between" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="material-symbols-outlined">person_add</span>
            Register New Volunteer
          </span>
          <button className="btn btn-outline btn-sm" onClick={() => setShowForm(p => !p)}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{showForm ? "close" : "add"}</span>
            {showForm ? "Cancel" : "Add Volunteer"}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="animate-in">
            <div className="form-grid" style={{ marginBottom: 16 }}>
              <div className="form-group">
                <label>Full Name *</label>
                <input className="form-control" placeholder="e.g., Ravi Kumar"
                  value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Location *</label>
                <input className="form-control" placeholder="e.g., Pune"
                  value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} />
              </div>
              <div className="form-group" style={{ gridColumn: "1 / -1" }}>
                <label>Skills (comma separated)</label>
                <input className="form-control" placeholder="e.g., medical, flood, rescue"
                  value={form.skills} onChange={e => setForm(p => ({ ...p, skills: e.target.value }))} />
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 16 }}>
              <div className="avail-toggle">
                <div className={`avail-toggle-switch ${form.availability ? "on" : ""}`}
                  onClick={() => setForm(p => ({ ...p, availability: !p.availability }))}></div>
                <span style={{ color: form.availability ? "var(--emerald-600)" : "var(--text-muted)" }}>
                  {form.availability ? "Available" : "Unavailable"}
                </span>
              </div>
            </div>
            <button className="btn btn-primary" type="submit" disabled={submitting}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>person_add</span>
              {submitting ? "Adding…" : "Register Volunteer"}
            </button>
          </form>
        )}
      </div>

      {/* Volunteer List */}
      <div className="card animate-in">
        <div className="card-title" style={{ justifyContent: "space-between" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="material-symbols-outlined">groups</span>
            All Volunteers
          </span>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ position: "relative" }}>
              <span className="material-symbols-outlined" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 18, color: "var(--text-muted)" }}>search</span>
              <input className="form-control" placeholder="Search volunteers…" value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ paddingLeft: 34, width: 200, fontSize: ".82rem" }} />
            </div>
            <button className="btn btn-outline btn-sm" onClick={load} title="Refresh">
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>refresh</span>
            </button>
          </div>
        </div>

        {/* Filter chips */}
        {(allSkills.length > 0 || allLocations.length > 0) && (
          <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
            <span className="filter-label">Skill:</span>
            <div className="filter-chips">
              <button className={`filter-chip ${skillFilter === "All" ? "active" : ""}`} onClick={() => setSkillFilter("All")}>All</button>
              {allSkills.slice(0, 6).map(s => (
                <button key={s} className={`filter-chip ${skillFilter === s ? "active" : ""}`} onClick={() => setSkillFilter(s)}>{s}</button>
              ))}
            </div>
            <span style={{ width: 1, height: 20, background: "var(--border)", margin: "0 4px" }}></span>
            <span className="filter-label">Location:</span>
            <div className="filter-chips">
              <button className={`filter-chip ${locFilter === "All" ? "active" : ""}`} onClick={() => setLocFilter("All")}>All</button>
              {allLocations.map(l => (
                <button key={l} className={`filter-chip ${locFilter === l ? "active" : ""}`} onClick={() => setLocFilter(l)}>{l}</button>
              ))}
            </div>
          </div>
        )}

        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
            {[...Array(6)].map((_, i) => <div key={i} className="skeleton" style={{ height: 160, borderRadius: "var(--radius)" }}></div>)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty">
            <span className="material-symbols-outlined">person_off</span>
            <div className="empty-text">{volunteers.length === 0 ? "No volunteers yet. Add the first one!" : "No volunteers match your search."}</div>
          </div>
        ) : (
          <div className="vol-grid">
            {filtered.map(v => (
              <div key={v._id} className="vol-card animate-in">
                <div className="vol-card-header">
                  <div className="rec-vol-avatar" style={{ width: 44, height: 44, fontSize: ".9rem" }}>
                    {(v.name || "?")[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="vol-name">{v.name}</div>
                    <div className="vol-loc">
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>location_on</span>
                      {v.location}
                    </div>
                  </div>
                </div>
                <div className="vol-skills">
                  {v.skills?.length > 0
                    ? v.skills.map(s => {
                      const style = getSkillStyle(s);
                      return (
                        <span key={s} className="skill-tag" style={{ background: style.bg, color: style.color, borderColor: style.border }}>
                          {s}
                        </span>
                      );
                    })
                    : <span className="skill-tag">General</span>}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                  <div className={v.availability ? "avail-yes" : "avail-no"}>
                    <span className="material-symbols-outlined" style={{ fontSize: 15 }}>
                      {v.availability ? "check_circle" : "cancel"}
                    </span>
                    {v.availability ? "Available" : "Unavailable"}
                  </div>
                  {v.availability && (
                    <span style={{ fontSize: ".68rem", fontWeight: 600, color: "var(--emerald-500)", display: "flex", alignItems: "center", gap: 3 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 13 }}>bolt</span>
                      Ready
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {toast && (
        <div className={`toast ${toast.type}`}>
          <span className="material-symbols-outlined">{toast.type === "success" ? "check_circle" : "error"}</span>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
