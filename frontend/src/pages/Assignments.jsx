import { useEffect, useState } from "react";
import { getAssignments, getIssues, getVolunteers } from "../api";

function getTier(s) { if (s >= 7) return "urgent"; if (s >= 4) return "high"; if (s >= 2) return "medium"; return "low"; }
function getTierLabel(s) { if (s >= 7) return "URGENT"; if (s >= 4) return "HIGH"; if (s >= 2) return "MEDIUM"; return "LOW"; }

const CATEGORY_ICONS = {
  medical: "local_hospital", health: "local_hospital",
  water: "water_drop", flood: "water_drop",
  education: "school", infrastructure: "construction",
  nutrition: "restaurant", food: "restaurant",
};

function AssignmentTimeline({ status }) {
  const steps = ["Assigned", "In Progress", "Completed"];
  const currentIdx = status === "completed" ? 2 : status === "assigned" ? 0 : 1;

  return (
    <div className="assignment-timeline">
      {steps.map((step, i) => (
        <div key={step} style={{ display: "flex", alignItems: "center" }}>
          <div className={`timeline-step ${i <= currentIdx ? "done" : ""} ${i === currentIdx ? "active" : ""}`}>
            <span className="material-symbols-outlined">
              {i < currentIdx ? "check_circle" : i === currentIdx ? "radio_button_checked" : "radio_button_unchecked"}
            </span>
            {step}
          </div>
          {i < steps.length - 1 && <div className={`timeline-line ${i < currentIdx ? "done" : ""}`}></div>}
        </div>
      ))}
    </div>
  );
}

export default function Assignments() {
  const [assignments, setAssignments] = useState([]);
  const [issues, setIssues] = useState({});
  const [volunteers, setVolunteers] = useState({});
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const load = async () => {
    setLoading(true);
    try {
      const [aRes, iRes, vRes] = await Promise.all([getAssignments(), getIssues(), getVolunteers()]);
      setAssignments(aRes.data);
      const iMap = {}; iRes.data.forEach(i => { iMap[i._id] = i; });
      const vMap = {}; vRes.data.forEach(v => { vMap[v._id] = v; });
      setIssues(iMap);
      setVolunteers(vMap);
    } catch { showToast("Failed to load data", "error"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const activeCount = assignments.filter(a => a.status === "assigned").length;
  const completedCount = assignments.filter(a => a.status === "completed").length;

  return (
    <div>
      <div className="page-header">
        <h1>
          <span className="material-symbols-outlined">assignment_turned_in</span>
          Assignments
        </h1>
        <p>Track volunteer-to-issue assignments and monitor resolution progress.</p>
      </div>

      {/* Stats */}
      <div className="stats-row">
        <div className="stat-card primary-accent animate-in">
          <div className="stat-icon primary">
            <span className="material-symbols-outlined">assignment</span>
          </div>
          <span className="stat-label">Total Assignments</span>
          <span className="stat-value primary">{assignments.length}</span>
        </div>
        <div className="stat-card success-accent animate-in">
          <div className="stat-icon success">
            <span className="material-symbols-outlined">pending_actions</span>
          </div>
          <span className="stat-label">Active</span>
          <span className="stat-value success">{activeCount}</span>
        </div>
        <div className="stat-card slate-accent animate-in">
          <div className="stat-icon info">
            <span className="material-symbols-outlined">task_alt</span>
          </div>
          <span className="stat-label">Completed</span>
          <span className="stat-value info">{completedCount}</span>
        </div>
      </div>

      {/* Assignment Cards */}
      <div className="card animate-in">
        <div className="card-title" style={{ justifyContent: "space-between" }}>
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="material-symbols-outlined">checklist</span>
            All Assignments
          </span>
          <button className="btn btn-outline btn-sm" onClick={load}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>refresh</span>
            Refresh
          </button>
        </div>

        {loading ? (
          <div>
            {[...Array(4)].map((_, i) => <div key={i} className="skeleton skeleton-card" style={{ height: 100, marginBottom: 12 }}></div>)}
          </div>
        ) : assignments.length === 0 ? (
          <div className="empty">
            <span className="material-symbols-outlined">assignment_late</span>
            <div className="empty-text">No assignments yet. Use the Matching page to assign volunteers to issues.</div>
            <div className="empty-action">
              <button className="btn btn-primary btn-sm" onClick={() => window.location.href = "/matching"}>
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>hub</span>
                Go to Matching
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {assignments.map((a, i) => {
              const issue = issues[a.issueId];
              const vol = volunteers[a.volunteerId];
              const tier = getTier(issue?.priorityScore);
              const catIcon = CATEGORY_ICONS[issue?.category?.toLowerCase()] || "report_problem";

              return (
                <div key={a._id} className="animate-in" style={{
                  padding: "18px 20px",
                  background: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                  position: "relative",
                  overflow: "hidden",
                  transition: "all 0.2s ease",
                }}>
                  {/* Left accent bar */}
                  <div style={{
                    position: "absolute", left: 0, top: 0, bottom: 0, width: 4,
                    background: tier === "urgent" ? "var(--red-500)" : tier === "high" ? "var(--amber-500)" : tier === "medium" ? "var(--slate-400)" : "var(--emerald-500)",
                    borderRadius: "12px 0 0 12px",
                  }}></div>

                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    {/* # */}
                    <span style={{ color: "var(--text-muted)", fontWeight: 700, fontSize: ".78rem", minWidth: 28 }}>#{i + 1}</span>

                    {/* Issue info */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
                      <div className={`priority-icon ${tier}`} style={{ width: 36, height: 36, borderRadius: 8, flexShrink: 0 }}>
                        <span className="material-symbols-outlined icon-filled" style={{ fontSize: 17, color: "#fff" }}>{catIcon}</span>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: ".88rem", color: "var(--text-primary)" }}>
                          {issue?.title || a.issueId}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 3, fontSize: ".75rem", color: "var(--text-secondary)" }}>
                          {issue?.category && <span className="badge">{issue.category}</span>}
                          <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 13 }}>location_on</span>
                            {issue?.location || "—"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Urgency */}
                    <span className={`urgency-badge ${tier}`}>{getTierLabel(issue?.priorityScore)}</span>

                    {/* Volunteer */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 160 }}>
                      <div className="rec-vol-avatar" style={{ width: 32, height: 32, fontSize: ".75rem" }}>
                        {(vol?.name || "?")[0].toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: ".84rem", color: "var(--text-primary)" }}>{vol?.name || a.volunteerId}</div>
                        <div style={{ display: "flex", gap: 3, flexWrap: "wrap", marginTop: 2 }}>
                          {vol?.skills?.slice(0, 2).map(s => <span key={s} className="skill-tag" style={{ fontSize: ".65rem", padding: "1px 6px" }}>{s}</span>) || null}
                        </div>
                      </div>
                    </div>

                    {/* Priority Score */}
                    <div className={`priority-score ${tier}`} style={{ width: 36, height: 36, fontSize: ".82rem" }}>
                      {Math.round(issue?.priorityScore || 0)}
                    </div>

                    {/* Status */}
                    <div className={`status-badge ${a.status}`}>
                      {a.status}
                    </div>
                  </div>

                  {/* Timeline */}
                  <div style={{ marginTop: 12, paddingLeft: 42 }}>
                    <AssignmentTimeline status={a.status} />
                    <div style={{ marginTop: 6, fontSize: ".7rem", color: "var(--text-muted)" }}>
                      Assigned: {a.createdAt ? new Date(a.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
                    </div>
                  </div>
                </div>
              );
            })}
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
