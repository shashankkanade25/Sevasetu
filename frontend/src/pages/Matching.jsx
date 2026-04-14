import { useEffect, useState } from "react";
import { getIssues, getVolunteers, matchVolunteers, assignVolunteer } from "../api";
import { useLocation } from "react-router-dom";

function getTier(s) { if (s >= 7) return "urgent"; if (s >= 4) return "high"; if (s >= 2) return "medium"; return "low"; }
function getTierLabel(s) { if (s >= 7) return "URGENT"; if (s >= 4) return "HIGH"; if (s >= 2) return "MEDIUM"; return "LOW"; }

const CATEGORY_ICONS = {
  medical: "local_hospital", health: "local_hospital",
  water: "water_drop", flood: "water_drop",
  education: "school", infrastructure: "construction",
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
  const [assignedIds, setAssignedIds] = useState(new Set());
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
      setAssignedIds(prev => new Set(prev).add(volunteerId));
      showToast("Volunteer assigned successfully!");
    } catch { showToast("Assignment failed", "error"); }
    finally { setAssigning(null); }
  };

  if (loading) return (
    <div>
      <div className="page-header">
        <div className="skeleton skeleton-text" style={{ width: 260, height: 28 }}></div>
        <div className="skeleton skeleton-text" style={{ width: 360, height: 14, marginTop: 8 }}></div>
      </div>
      <div className="match-grid">
        <div className="card"><div className="skeleton" style={{ height: 400 }}></div></div>
        <div className="card"><div className="skeleton" style={{ height: 400 }}></div></div>
      </div>
    </div>
  );

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
          <span className="material-symbols-outlined">hub</span>
          Matching & Allocation
        </h1>
        <p>Smart volunteer-to-issue matching engine. Select an issue to find the best-fit volunteers.</p>
      </div>

      {/* Filters */}
      <div className="filter-bar animate-in">
        <span className="filter-label">Location</span>
        <select className="form-control" value={locFilter} onChange={e => setLocFilter(e.target.value)}
          style={{ width: "auto", padding: "7px 12px", fontSize: ".82rem" }}>
          <option value="All">All</option>
          {locations.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
        <span className="filter-label">Category</span>
        <select className="form-control" value={catFilter} onChange={e => setCatFilter(e.target.value)}
          style={{ width: "auto", padding: "7px 12px", fontSize: ".82rem" }}>
          <option value="All">All</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <span className="filter-label">Urgency</span>
        <select className="form-control" value={urgFilter} onChange={e => setUrgFilter(e.target.value)}
          style={{ width: "auto", padding: "7px 12px", fontSize: ".82rem" }}>
          <option value="All">All</option>
          <option value="URGENT">Urgent</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>
      </div>

      <div className="match-grid">
        {/* Left: List of Needs */}
        <div className="card animate-in">
          <div className="card-title">
            <span className="material-symbols-outlined">list_alt</span>
            Issues ({filtered.length})
          </div>
          {filtered.length === 0 ? (
            <div className="empty">
              <span className="material-symbols-outlined">search_off</span>
              <div className="empty-text">No issues match your filters.</div>
            </div>
          ) : (
            <div className="needs-list" style={{ maxHeight: 500, overflowY: "auto" }}>
              {filtered.map(issue => {
                const tier = getTier(issue.priorityScore);
                const isSelected = selectedId === issue._id;
                return (
                  <div key={issue._id}
                    className={`need-item ${isSelected ? "selected" : ""}`}
                    onClick={() => handleMatch(issue._id)}>
                    <div className={`priority-icon ${tier}`} style={{ width: 36, height: 36, borderRadius: 8, flexShrink: 0 }}>
                      <span className="material-symbols-outlined icon-filled" style={{ fontSize: 17, color: "#fff" }}>
                        {CATEGORY_ICONS[issue.category?.toLowerCase()] || "warning"}
                      </span>
                    </div>
                    <div className="need-info">
                      <div className="need-title">{issue.title || "Untitled"}</div>
                      <div className="need-meta">
                        <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 13 }}>location_on</span>
                          {issue.location}
                        </span>
                        <span>{issue.peopleAffected} affected</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                      {tier === "urgent" && <span className="pulse-dot"></span>}
                      <span className={`urgency-badge ${tier}`}>{getTierLabel(issue.priorityScore)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Selected issue detail */}
          {selectedIssue && (
            <div className="animate-in" style={{
              marginTop: 16, padding: "16px 18px",
              background: "var(--red-50)",
              borderRadius: "var(--radius)",
              border: "1px solid var(--red-200)",
              display: "flex", alignItems: "center", gap: 14,
            }}>
              <span className="material-symbols-outlined" style={{ color: "var(--red-500)", fontSize: 24 }}>info</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: ".88rem", color: "var(--text-primary)" }}>{selectedIssue.title}</div>
                <div style={{ fontSize: ".75rem", color: "var(--text-secondary)", display: "flex", gap: 12, marginTop: 4 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 13 }}>trending_up</span>
                    Score: {Math.round(selectedIssue.priorityScore || 0)}
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 13 }}>group</span>
                    {selectedIssue.peopleAffected} affected
                  </span>
                  <span className="badge">{selectedIssue.category}</span>
                </div>
              </div>
              <div className={`priority-score ${getTier(selectedIssue.priorityScore)}`} style={{ width: 40, height: 40, fontSize: ".88rem" }}>
                {Math.round(selectedIssue.priorityScore || 0)}
              </div>
            </div>
          )}
        </div>

        {/* Right: Recommended Volunteers */}
        <div className="card animate-in">
          <div className="card-title">
            <span className="material-symbols-outlined">person_search</span>
            Recommended Volunteers
          </div>

          {matching ? (
            <div style={{ textAlign: "center", padding: 40 }}>
              <div className="spinner"></div>
              <div style={{ fontSize: ".82rem", color: "var(--text-muted)", marginTop: 8 }}>Finding best matches...</div>
            </div>
          ) : matches.length === 0 ? (
            <div className="empty">
              <span className="material-symbols-outlined">groups</span>
              <div className="empty-text">{selectedId ? "Click an issue to find matches" : "Select an issue from the left panel"}</div>
            </div>
          ) : (
            <div className="match-vol-list">
              {matches.map((m, i) => {
                const isAssigned = assignedIds.has(m.volunteer._id);
                const isFirst = i === 0;
                const scoreColor = m.score >= 50 ? "var(--emerald-500)" : m.score >= 30 ? "var(--amber-500)" : "var(--red-500)";
                const scoreBg = m.score >= 50 ? "var(--emerald-50)" : m.score >= 30 ? "var(--amber-50)" : "var(--red-50)";

                return (
                  <div key={m.volunteer._id} className={`match-vol-item ${isFirst ? "best" : ""} animate-in`}
                    style={{ flexDirection: "column", alignItems: "stretch" }}>

                    {isFirst && (
                      <div className="best-match-label" style={{ marginBottom: 8 }}>
                        <span className="material-symbols-outlined">star</span>
                        Best Match
                      </div>
                    )}

                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <div className="rec-vol-avatar" style={{
                        width: 48, height: 48, fontSize: ".95rem",
                        background: isFirst ? "linear-gradient(135deg, #F59E0B, #FBBF24)" : undefined,
                      }}>
                        {(m.volunteer.name || "?")[0].toUpperCase()}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: ".9rem" }}>{m.volunteer.name}</div>
                        <div style={{ fontSize: ".75rem", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 4 }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 13 }}>location_on</span>
                          {m.volunteer.location}
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
                          {m.volunteer.skills?.map(s => (
                            <span key={s} className="skill-tag">{s}</span>
                          )) || <span className="skill-tag">General</span>}
                        </div>
                      </div>

                      {/* Score circle */}
                      <div style={{
                        display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                        padding: "8px 14px", borderRadius: "var(--radius-sm)",
                        background: scoreBg,
                      }}>
                        <span style={{ fontSize: ".6rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".04em", color: "var(--text-muted)" }}>Score</span>
                        <span style={{ fontSize: "1.2rem", fontWeight: 800, color: scoreColor }}>{m.score}</span>
                      </div>
                    </div>

                    {/* Match score bar */}
                    <div style={{ marginTop: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontSize: ".7rem", color: "var(--text-muted)", fontWeight: 500 }}>Match Confidence</span>
                        <span style={{ fontSize: ".7rem", color: scoreColor, fontWeight: 700 }}>{m.score}%</span>
                      </div>
                      <div className="match-score-bar-wrap">
                        <div
                          className={`match-score-bar ${m.score >= 50 ? "high" : m.score >= 30 ? "medium" : "low"}`}
                          style={{ width: `${Math.min(100, m.score)}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                      {isAssigned ? (
                        <button className="btn btn-success btn-sm" disabled style={{ flex: 1, animation: "assignPulse 0.3s ease" }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>check_circle</span>
                          Assigned
                        </button>
                      ) : (
                        <>
                          <button className="btn btn-primary btn-sm" style={{ flex: 1 }}
                            disabled={assigning === m.volunteer._id}
                            onClick={() => handleAssign(m.volunteer._id)}>
                            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                              {assigning === m.volunteer._id ? "hourglass_empty" : "person_add"}
                            </span>
                            {assigning === m.volunteer._id ? "Assigning..." : "Assign Volunteer"}
                          </button>
                          <button className="btn btn-outline btn-sm"
                            disabled={assigning === m.volunteer._id}
                            onClick={() => handleAssign(m.volunteer._id)}>
                            Auto
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
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
