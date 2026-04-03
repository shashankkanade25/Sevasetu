import { useEffect, useState } from "react";
import { getVolunteers, addVolunteer } from "../api";

const EMPTY_FORM = { name: "", skills: "", location: "", availability: true };

export default function Volunteers() {
  const [volunteers, setVolunteers] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");

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

  const filtered = volunteers.filter(v => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (v.name || "").toLowerCase().includes(q) ||
           (v.location || "").toLowerCase().includes(q) ||
           (v.skills || []).some(s => s.toLowerCase().includes(q));
  });

  return (
    <div>
      <div className="page-header">
        <h1>
          <span className="material-symbols-outlined" style={{ fontSize: 28 }}>group</span>
          Volunteers
        </h1>
        <p>Manage and register community volunteers for task assignments.</p>
      </div>

      {/* Stats */}
      <div className="stats-row">
        <div className="stat-card">
          <span className="stat-label">Total Volunteers</span>
          <span className="stat-value primary">{volunteers.length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Available</span>
          <span className="stat-value success">{volunteers.filter(v => v.availability).length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Unavailable</span>
          <span className="stat-value danger">{volunteers.filter(v => !v.availability).length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Unique Skills</span>
          <span className="stat-value primary">{[...new Set(volunteers.flatMap(v => v.skills || []))].length}</span>
        </div>
      </div>

      {/* Add Volunteer Form */}
      <div className="card">
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
          <form onSubmit={handleSubmit}>
            <div className="form-grid" style={{ marginBottom: 14 }}>
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
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 14 }}>
              <div className="check-row">
                <input type="checkbox" id="avail" checked={form.availability}
                  onChange={e => setForm(p => ({ ...p, availability: e.target.checked }))} />
                <label htmlFor="avail">Currently Available</label>
              </div>
            </div>
            <button className="btn btn-primary" type="submit" disabled={submitting}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>check</span>
              {submitting ? "Adding…" : "Add Volunteer"}
            </button>
          </form>
        )}
      </div>

      {/* Volunteer List */}
      <div className="card">
        <div className="card-title" style={{ justifyContent: "space-between" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="material-symbols-outlined">groups</span>
            All Volunteers
          </span>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ position: "relative" }}>
              <span className="material-symbols-outlined" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 18, color: "var(--text-tertiary)" }}>search</span>
              <input className="form-control" placeholder="Search…" value={search}
                onChange={e => setSearch(e.target.value)}
                style={{ paddingLeft: 34, width: 200, fontSize: ".82rem" }} />
            </div>
            <button className="btn btn-outline btn-sm" onClick={load}>
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>refresh</span>
            </button>
          </div>
        </div>

        {loading ? <div className="spinner" /> : filtered.length === 0 ? (
          <div className="empty">
            <span className="material-symbols-outlined">person_off</span>
            <div className="empty-text">{volunteers.length === 0 ? "No volunteers yet. Add the first one!" : "No volunteers match your search."}</div>
          </div>
        ) : (
          <div className="vol-grid">
            {filtered.map(v => (
              <div key={v._id} className="vol-card">
                <div className="vol-card-header">
                  <div className="rec-vol-avatar" style={{ width: 40, height: 40, fontSize: ".85rem" }}>
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
                    ? v.skills.map(s => <span key={s} className="skill-tag">{s}</span>)
                    : <span className="skill-tag">No skills listed</span>}
                </div>
                <div className={v.availability ? "avail-yes" : "avail-no"}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                    {v.availability ? "check_circle" : "cancel"}
                  </span>
                  {v.availability ? "Available" : "Unavailable"}
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
