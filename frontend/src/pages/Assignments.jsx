import { useEffect, useState } from "react";
import { getAssignments, getIssues, getVolunteers } from "../api";

function getTier(s) { if (s >= 7) return "urgent"; if (s >= 4) return "high"; if (s >= 2) return "medium"; return "low"; }
function getTierLabel(s) { if (s >= 7) return "URGENT"; if (s >= 4) return "HIGH"; if (s >= 2) return "MEDIUM"; return "LOW"; }

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

  return (
    <div>
      <div className="page-header">
        <h1>
          <span className="material-symbols-outlined" style={{ fontSize: 28 }}>assignment</span>
          Assignments
        </h1>
        <p>Track which volunteers are assigned to which community challenges.</p>
      </div>

      {/* Stats */}
      <div className="stats-row">
        <div className="stat-card">
          <span className="stat-label">Total Assignments</span>
          <span className="stat-value primary">{assignments.length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Active</span>
          <span className="stat-value success">{assignments.filter(a => a.status === "assigned").length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Completed</span>
          <span className="stat-value" style={{ color: "var(--text-tertiary)" }}>{assignments.filter(a => a.status === "completed").length}</span>
        </div>
      </div>

      {/* Assignment Table */}
      <div className="card">
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

        {loading ? <div className="spinner" /> : assignments.length === 0 ? (
          <div className="empty">
            <span className="material-symbols-outlined">assignment_late</span>
            <div className="empty-text">No assignments yet. Use the Matching page to assign volunteers to issues.</div>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Challenge</th>
                  <th>Location</th>
                  <th>Urgency</th>
                  <th>Volunteer</th>
                  <th>Skills</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Assigned</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((a, i) => {
                  const issue = issues[a.issueId];
                  const vol = volunteers[a.volunteerId];
                  const tier = getTier(issue?.priorityScore);
                  return (
                    <tr key={a._id}>
                      <td style={{ color: "var(--text-tertiary)", fontWeight: 600 }}>#{i + 1}</td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div className={`priority-icon ${tier}`} style={{ width: 28, height: 28, borderRadius: 6, flexShrink: 0 }}>
                            <span className="material-symbols-outlined icon-filled" style={{ fontSize: 14, color: "#fff" }}>report_problem</span>
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: ".84rem" }}>{issue?.title || a.issueId}</div>
                            {issue?.category && <span className="badge" style={{ marginTop: 2 }}>{issue.category}</span>}
                          </div>
                        </div>
                      </td>
                      <td>
                        <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: ".82rem" }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 14, color: "var(--text-tertiary)" }}>location_on</span>
                          {issue?.location || "—"}
                        </span>
                      </td>
                      <td>
                        <span className={`urgency-badge ${tier}`}>{getTierLabel(issue?.priorityScore)}</span>
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <div className="rec-vol-avatar" style={{ width: 28, height: 28, fontSize: ".7rem" }}>
                            {(vol?.name || "?")[0].toUpperCase()}
                          </div>
                          <span style={{ fontWeight: 500, fontSize: ".84rem" }}>{vol?.name || a.volunteerId}</span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                          {vol?.skills?.map(s => <span key={s} className="skill-tag">{s}</span>) || "—"}
                        </div>
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <div className={`priority-score ${tier}`} style={{ width: 32, height: 32, fontSize: ".78rem", margin: "0 auto" }}>
                          {Math.round(issue?.priorityScore || 0)}
                        </div>
                      </td>
                      <td>
                        <span style={{
                          padding: "3px 10px", borderRadius: 99,
                          fontSize: ".72rem", fontWeight: 700,
                          background: a.status === "assigned" ? "var(--success-bg)" : a.status === "completed" ? "var(--primary-bg)" : "var(--danger-bg)",
                          color: a.status === "assigned" ? "var(--success)" : a.status === "completed" ? "var(--primary)" : "var(--danger)",
                        }}>
                          {a.status}
                        </span>
                      </td>
                      <td style={{ color: "var(--text-secondary)", fontSize: ".78rem" }}>
                        {a.createdAt ? new Date(a.createdAt).toLocaleString() : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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
