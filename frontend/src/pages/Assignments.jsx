import { useEffect, useState } from "react";
import { getAssignments, getIssues, getVolunteers, updateAssignmentStatus } from "../api";
import usePolling from "../hooks/usePolling";

function getTier(s) { if (s >= 75) return "urgent"; if (s >= 50) return "high"; if (s >= 25) return "medium"; return "low"; }
function getTierLabel(s) { if (s >= 75) return "URGENT"; if (s >= 50) return "HIGH"; if (s >= 25) return "MEDIUM"; return "LOW"; }

const CATEGORY_ICONS = {
  medical: "local_hospital", health: "local_hospital",
  water: "water_drop", flood: "water_drop",
  education: "school", infrastructure: "construction",
  nutrition: "restaurant", food: "restaurant",
};

function AssignmentTimeline({ status }) {
  const steps = ["Assigned", "In Progress", "Completed"];
  const statusToIdx = { "assigned": 0, "in_progress": 1, "completed": 2 };
  const currentIdx = statusToIdx[status] ?? 0;

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
  const [issuesMap, setIssuesMap] = useState({});
  const [volunteersMap, setVolunteersMap] = useState({});
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [updating, setUpdating] = useState(null);
  const [toast, setToast] = useState(null);

  // Polling for real-time data
  const { data: assignments = [], loading: aLoading, refresh: refreshAssignments } = usePolling(getAssignments);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    // Load static reference data once or rely on polling if it changes often
    // For now, load once for mapping
    Promise.all([getIssues(), getVolunteers()])
      .then(([iRes, vRes]) => {
        const iMap = {}; iRes.data.forEach(i => iMap[i._id] = i);
        const vMap = {}; vRes.data.forEach(v => vMap[v._id] = v);
        setIssuesMap(iMap);
        setVolunteersMap(vMap);
      });
  }, []);

  const handleStatusUpdate = async (id, newStatus) => {
    setUpdating(id);
    try {
      await updateAssignmentStatus(id, { status: newStatus });
      refreshAssignments();
      showToast(`Status updated to ${newStatus}`);
    } catch {
      showToast("Update failed", "error");
    } finally {
      setUpdating(null);
    }
  };

  const filtered = assignments.filter(a => {
    if (statusFilter !== "All" && a.status !== statusFilter) return false;
    if (search) {
      const issueTitle = issuesMap[a.issueId]?.title || "";
      const volName = volunteersMap[a.volunteerId]?.name || "";
      return issueTitle.toLowerCase().includes(search.toLowerCase()) || 
             volName.toLowerCase().includes(search.toLowerCase());
    }
    return true;
  });

  const activeCount = assignments.filter(a => a.status !== "completed").length;
  const completedCount = assignments.filter(a => a.status === "completed").length;

  return (
    <div>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <h1>Assignments</h1>
          <p>Track volunteer-to-issue assignments and monitor resolution progress.</p>
        </div>
        <div style={{ fontSize: ".72rem", color: "var(--text-muted)", background: "var(--bg-subtle)", padding: "4px 10px", borderRadius: 99, display: "flex", alignItems: "center", gap: 5 }}>
          <span className="pulse-dot"></span> Real-time Sync
        </div>
      </div>

      <div className="stats-row">
        <div className="stat-card primary-accent animate-in">
          <div className="stat-icon primary"><span className="material-symbols-outlined">assignment</span></div>
          <span className="stat-label">Total Volume</span>
          <span className="stat-value primary">{assignments.length}</span>
        </div>
        <div className="stat-card warning-accent animate-in">
          <div className="stat-icon warning"><span className="material-symbols-outlined">pending_actions</span></div>
          <span className="stat-label">Active Tasks</span>
          <span className="stat-value warning">{activeCount}</span>
        </div>
        <div className="stat-card success-accent animate-in">
          <div className="stat-icon success"><span className="material-symbols-outlined">task_alt</span></div>
          <span className="stat-label">Completed</span>
          <span className="stat-value success">{completedCount}</span>
        </div>
      </div>

      <div className="card animate-in">
        <div className="card-title" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="material-symbols-outlined">checklist</span>
            Live Operations Board
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <div className="search-box" style={{ width: 220 }}>
              <span className="material-symbols-outlined">search</span>
              <input type="text" placeholder="Search task or volunteer..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <select className="form-control" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ width: "auto", padding: "0 12px", height: 36, fontSize: ".82rem" }}>
              <option value="All">All Status</option>
              <option value="assigned">Assigned</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>

        {aLoading && <div style={{ textAlign: "center", padding: 40 }}><div className="spinner"></div></div>}

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filtered.map((a, i) => {
            const issue = issuesMap[a.issueId];
            const vol = volunteersMap[a.volunteerId];
            const tier = getTier(issue?.priorityScore || 0);
            
            return (
              <div key={a._id} className="animate-in" style={{
                padding: "18px 20px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", position: "relative", overflow: "hidden"
              }}>
                <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, background: tier === "urgent" ? "var(--red-500)" : "var(--slate-400)" }}></div>
                
                <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ fontWeight: 700, fontSize: ".9rem" }}>{issue?.title || "Loading..."}</div>
                    <div style={{ display: "flex", gap: 10, marginTop: 4, fontSize: ".75rem", color: "var(--text-secondary)" }}>
                      <span className="badge">{issue?.category}</span>
                      <span>📍 {issue?.location}</span>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 140 }}>
                    <div className="rec-vol-avatar" style={{ width: 30, height: 30, fontSize: ".7rem" }}>{(vol?.name || "?")[0]}</div>
                    <div style={{ fontWeight: 600, fontSize: ".82rem" }}>{vol?.name || "Assignee"}</div>
                  </div>

                  <div className={`status-badge ${a.status}`}>{a.status}</div>

                  <div style={{ display: "flex", gap: 6 }}>
                    {a.status === "assigned" && (
                      <button className="btn btn-sm btn-outline" disabled={updating === a._id} onClick={() => handleStatusUpdate(a._id, "in_progress")}>Start</button>
                    )}
                    {a.status === "in_progress" && (
                      <button className="btn btn-sm btn-primary" disabled={updating === a._id} onClick={() => handleStatusUpdate(a._id, "completed")}>Complete</button>
                    )}
                  </div>
                </div>

                <div style={{ marginTop: 12, borderTop: "1px solid var(--border-subtle)", paddingTop: 12 }}>
                  <AssignmentTimeline status={a.status} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}
    </div>
  );
}
