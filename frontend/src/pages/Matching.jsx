import { useEffect, useState } from "react";
import { getIssues, getVolunteers, matchVolunteers, assignVolunteer } from "../api";
import { useLocation } from "react-router-dom";

function getTier(s) { if (s >= 7) return "urgent"; if (s >= 4) return "high"; if (s >= 2) return "medium"; return "low"; }
function getTierLabel(s) { if (s >= 7) return "URGENT"; if (s >= 4) return "HIGH"; if (s >= 2) return "MEDIUM"; return "LOW"; }

const CATEGORY_ICONS = {
  medical: "local_hospital", health: "local_hospital",
  water: "water_drop", flood: "water_drop",
  education: "school",
  infrastructure: "construction",
  nutrition: "restaurant", food: "restaurant",
};

export default function Matching() {
  const loc = useLocation();
  const [issues, setIssues] = useState([]);
  const [volunteers, setVolunteers] = useState([]);
  const [selectedId, setSelectedId] = useState(loc.state?.issueId || "");
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [matching, setMatching] = useState(false);
  const [assigning, setAssigning] = useState(null);
  const [toast, setToast] = useState(null);

  // Filters
  const [locFilter, setLocFilter] = useState("All");
  const [catFilter, setCatFilter] = useState("All");
  const [urgFilter, setUrgFilter] = useState("All");

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    Promise.all([getIssues(), getVolunteers()])
      .then(([iRes, vRes]) => {
        setIssues(iRes.data);
        setVolunteers(vRes.data);
        if (loc.state?.issueId) handleMatch(loc.state.issueId);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleMatch = async (id) => {
    const target = id || selectedId;
    if (!target) return showToast("Select an issue first", "error");
    setSelectedId(target);
    setMatching(true); setMatches([]);
    try {
      const res = await matchVolunteers(target);
      setMatches(res.data);
      if (res.data.length === 0) showToast("No volunteers found", "error");
    } catch { showToast("Matching failed", "error"); }
    finally { setMatching(false); }
  };

  const handleAssign = async (volunteerId) => {
    setAssigning(volunteerId);
    try {
      await assignVolunteer({ issueId: selectedId, volunteerId });
      showToast("Volunteer assigned successfully!");
    } catch { showToast("Assignment failed", "error"); }
    finally { setAssigning(null); }
  };

  const handleAutoAssign = async (volunteerId) => {
    setAssigning(volunteerId);
    try {
      await assignVolunteer({ issueId: selectedId, volunteerId });
      showToast("Auto-assigned successfully!");
    } catch { showToast("Auto-assign failed", "error"); }
    finally { setAssigning(null); }
  };

  if (loading) return <div className="loading-overlay"><div className="spinner" /></div>;

  const locations = [...new Set(issues.map(i => i.location).filter(Boolean))];
  const categories = [...new Set(issues.map(i => i.category).filter(Boolean))];

  const filtered = issues.filter(i => {
    if (locFilter !== "All" && i.location !== locFilter) return false;
    if (catFilter !== "All" && i.category !== catFilter) return false;
    if (urgFilter !== "All" && getTierLabel(i.priorityScore) !== urgFilter) return false;
    return true;
  });

  const selectedIssue = issues.find(i => i._id === selectedId);

  return (
    <div>
      <div className="page-header">
        <h1>
          <span className="material-symbols-outlined" style={{ fontSize: 28 }}>recommend</span>
          Matching &amp; Allocation
        </h1>
        <p>Assign volunteers to address priority community challenges based on real-time data insights.</p>
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <span className="filter-label">Location:</span>
        <select className="form-control" value={locFilter} onChange={e => setLocFilter(e.target.value)}
          style={{ width: "auto", padding: "6px 10px", fontSize: ".82rem" }}>
          <option value="All">All</option>
          {locations.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
        <span className="filter-label">Category:</span>
        <select className="form-control" value={catFilter} onChange={e => setCatFilter(e.target.value)}
          style={{ width: "auto", padding: "6px 10px", fontSize: ".82rem" }}>
          <option value="All">All</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <span className="filter-label">Urgency:</span>
        <select className="form-control" value={urgFilter} onChange={e => setUrgFilter(e.target.value)}
          style={{ width: "auto", padding: "6px 10px", fontSize: ".82rem" }}>
          <option value="All">All</option>
          <option value="URGENT">Urgent</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>
      </div>

      <div className="match-grid">
        {/* Left: List of Needs */}
        <div className="card">
          <div className="card-title">
            <span className="material-symbols-outlined">list_alt</span>
            List of Needs
          </div>
          {filtered.length === 0 ? (
            <div className="empty">
              <span className="material-symbols-outlined">search_off</span>
              <div className="empty-text">No issues match your filters.</div>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Problem</th><th>Location</th><th>Urgency</th></tr>
                </thead>
                <tbody>
                  {filtered.map(issue => {
                    const tier = getTier(issue.priorityScore);
                    const isSelected = selectedId === issue._id;
                    return (
                      <tr key={issue._id}
                        style={{ cursor: "pointer", background: isSelected ? "var(--primary-bg)" : undefined }}
                        onClick={() => handleMatch(issue._id)}>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div className={`priority-icon ${tier}`} style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0 }}>
                              <span className="material-symbols-outlined icon-filled" style={{ fontSize: 16, color: "#fff" }}>
                                {CATEGORY_ICONS[issue.category?.toLowerCase()] || "warning"}
                              </span>
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: ".84rem" }}>{issue.title || "Untitled"}</div>
                              <div style={{ fontSize: ".72rem", color: "var(--text-tertiary)" }}>{issue.location}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ fontSize: ".82rem" }}>{issue.location}</td>
                        <td>
                          <span className={`urgency-badge ${tier}`}>{getTierLabel(issue.priorityScore)}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Selected issue detail */}
          {selectedIssue && (
            <div style={{ marginTop: 14, padding: "12px 14px", background: "var(--primary-bg)", borderRadius: 8, border: "1px solid var(--primary)", display: "flex", alignItems: "center", gap: 12 }}>
              <span className="material-symbols-outlined" style={{ color: "var(--primary)" }}>info</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: ".85rem" }}>{selectedIssue.title}</div>
                <div style={{ fontSize: ".75rem", color: "var(--text-secondary)", display: "flex", gap: 10, marginTop: 2 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 13 }}>trending_up</span>
                    {Math.round(selectedIssue.priorityScore || 0)}
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 13 }}>group</span>
                    {selectedIssue.peopleAffected} affected
                  </span>
                  <span className="badge">{selectedIssue.category}</span>
                </div>
              </div>
              <div className={`priority-score ${getTier(selectedIssue.priorityScore)}`} style={{ width: 38, height: 38, fontSize: ".85rem" }}>
                {Math.round(selectedIssue.priorityScore || 0)}
              </div>
            </div>
          )}
        </div>

        {/* Right: Recommended Volunteers */}
        <div className="card">
          <div className="card-title">
            <span className="material-symbols-outlined">person_search</span>
            Recommended Volunteers
          </div>

          {matching ? <div className="spinner" /> : matches.length === 0 ? (
            <div className="empty">
              <span className="material-symbols-outlined">groups</span>
              <div className="empty-text">{selectedId ? "Click an issue to find matches" : "Select an issue from the left panel"}</div>
            </div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Name</th><th>Skill</th><th style={{ textAlign: "center" }}>Match score</th><th></th></tr>
                </thead>
                <tbody>
                  {matches.map((m, i) => (
                    <tr key={m.volunteer._id}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div className="rec-vol-avatar" style={{ width: 34, height: 34, fontSize: ".78rem" }}>
                            {(m.volunteer.name || "?")[0].toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: ".84rem" }}>{m.volunteer.name}</div>
                            <div style={{ fontSize: ".72rem", color: "var(--text-tertiary)" }}>{m.volunteer.location}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                          {m.volunteer.skills?.map(s => <span key={s} className="skill-tag">{s}</span>) || "—"}
                        </div>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <div className={`priority-score ${m.score >= 50 ? "low" : m.score >= 30 ? "medium" : "high"}`}
                          style={{ width: 36, height: 36, fontSize: ".82rem", margin: "0 auto" }}>
                          {m.score}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button className="btn btn-primary btn-sm"
                            disabled={assigning === m.volunteer._id}
                            onClick={() => handleAssign(m.volunteer._id)}>
                            {assigning === m.volunteer._id ? "..." : "Assign"}
                          </button>
                          <button className="btn btn-outline btn-sm"
                            disabled={assigning === m.volunteer._id}
                            onClick={() => handleAutoAssign(m.volunteer._id)}>
                            Auto-assign
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
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
