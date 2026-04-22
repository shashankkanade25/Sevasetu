import { useState } from "react";
import { useVolunteer } from "../context/VolunteerContext";

/* ─── Urgency badge helper ─── */
const URGENCY = {
  urgent: { bg: "#FEF2F2", color: "#DC2626", border: "#FECACA" },
  high:   { bg: "#FFFBEB", color: "#D97706", border: "#FDE68A" },
  medium: { bg: "#F8FAFC", color: "#64748B", border: "#E2E8F0" },
  low:    { bg: "#F0FDF4", color: "#16A34A", border: "#BBF7D0" },
};
const ug = (u = "medium") => URGENCY[u.toLowerCase()] || URGENCY.medium;

/* ─── Status pill ─── */
const STATUS = {
  assigned:    { label: "Assigned",    bg: "#FFFBEB", color: "#D97706" },
  in_progress: { label: "In Progress", bg: "#EFF6FF", color: "#2563EB" },
};

function StatusPill({ status }) {
  const s = STATUS[status] || STATUS.assigned;
  return (
    <span style={{
      padding: "3px 12px", borderRadius: 999, fontSize: ".72rem",
      fontWeight: 700, background: s.bg, color: s.color,
    }}>{s.label}</span>
  );
}

/* ─── Single task card ─── */
function TaskCard({ assignment, onStart, onComplete }) {
  const [actionLoading, setActionLoading] = useState(null);
  const issue = assignment.issue || {};
  const u = ug(issue.urgency);

  const handle = async (action, fn) => {
    setActionLoading(action);
    try { await fn(); } catch { /* toast shown by parent */ }
    finally { setActionLoading(null); }
  };

  return (
    <div style={{
      background: "white", border: "1.5px solid var(--border)",
      borderRadius: "var(--radius)", padding: "20px 24px",
      display: "flex", flexDirection: "column", gap: 14,
      boxShadow: "var(--shadow-xs)",
      transition: "box-shadow 0.2s, border-color 0.2s",
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--red-300)"; e.currentTarget.style.boxShadow = "var(--shadow-md)"; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.boxShadow = "var(--shadow-xs)"; }}
    >
      {/* Header row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: ".95rem", color: "var(--text-primary)", marginBottom: 4 }}>
            {issue.title || "Community Task"}
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <span style={{ fontSize: ".75rem", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 3 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 13 }}>location_on</span>
              {issue.location || "—"}
            </span>
            <span style={{ fontSize: ".75rem", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 3 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 13 }}>category</span>
              {issue.category || "—"}
            </span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
          <span style={{
            padding: "2px 10px", borderRadius: 999, fontSize: ".68rem", fontWeight: 700,
            background: u.bg, color: u.color, border: `1px solid ${u.border}`,
          }}>
            {(issue.urgency || "medium").toUpperCase()}
          </span>
          <StatusPill status={assignment.status} />
        </div>
      </div>

      {/* Priority bar */}
      {issue.priorityScore != null && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
            <span style={{ fontSize: ".72rem", color: "var(--text-muted)", fontWeight: 600 }}>Priority Score</span>
            <span style={{ fontSize: ".78rem", fontWeight: 800, color: "var(--red-600)" }}>{issue.priorityScore}</span>
          </div>
          <div style={{ height: 5, background: "var(--border)", borderRadius: 999 }}>
            <div style={{
              height: "100%", width: `${Math.min(issue.priorityScore, 100)}%`,
              background: "linear-gradient(90deg, #EF4444, #DC2626)", borderRadius: 999,
            }} />
          </div>
        </div>
      )}

      {/* People affected */}
      {issue.peopleAffected > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: ".78rem", color: "var(--text-secondary)" }}>
          <span className="material-symbols-outlined" style={{ fontSize: 15, color: "var(--red-500)" }}>groups</span>
          <strong style={{ color: "var(--text-primary)" }}>{issue.peopleAffected.toLocaleString()}</strong> people affected
        </div>
      )}

      {/* Assigned date */}
      <div style={{ fontSize: ".72rem", color: "var(--text-muted)" }}>
        Accepted: {new Date(assignment.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 10, marginTop: 2 }}>
        {assignment.status === "assigned" && (
          <button
            onClick={() => handle("start", () => onStart(assignment))}
            disabled={actionLoading === "start"}
            style={{
              flex: 1, padding: "9px 0",
              background: "linear-gradient(135deg, #3B82F6, #2563EB)",
              color: "white", border: "none", borderRadius: "var(--radius-sm)",
              fontWeight: 700, fontSize: ".82rem", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              opacity: actionLoading ? 0.7 : 1,
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 15 }}>play_arrow</span>
            {actionLoading === "start" ? "Starting..." : "Start Task"}
          </button>
        )}
        {assignment.status === "in_progress" && (
          <button
            onClick={() => handle("complete", () => onComplete(assignment))}
            disabled={actionLoading === "complete"}
            style={{
              flex: 1, padding: "9px 0",
              background: "linear-gradient(135deg, #10B981, #059669)",
              color: "white", border: "none", borderRadius: "var(--radius-sm)",
              fontWeight: 700, fontSize: ".82rem", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              opacity: actionLoading ? 0.7 : 1,
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 15 }}>check_circle</span>
            {actionLoading === "complete" ? "Completing..." : "Mark Complete"}
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── Main page ─── */
export default function VolunteerTasks({ showToast }) {
  const { activeTasks, loading, startTask, completeTask } = useVolunteer();

  const handleStart = async (assignment) => {
    try {
      await startTask(assignment);
      showToast("🚀 Task started! You're on it.");
    } catch {
      showToast("⚠️ Could not update status. Try again.");
    }
  };

  const handleComplete = async (assignment) => {
    try {
      await completeTask(assignment);
      showToast("🎉 Awesome! Task marked complete.");
    } catch {
      showToast("⚠️ Could not complete task. Try again.");
    }
  };

  if (loading) return <PageSpinner />;

  return (
    <div style={{ maxWidth: 900, margin: "0 auto" }}>
      {/* Page header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: 4 }}>My Active Tasks</h1>
          <p style={{ fontSize: ".85rem", color: "var(--text-secondary)" }}>
            {activeTasks.length} task{activeTasks.length !== 1 ? "s" : ""} in progress
          </p>
        </div>
        <div style={{
          padding: "6px 16px", background: "var(--red-50)", color: "var(--red-700)",
          borderRadius: 999, fontWeight: 700, fontSize: ".8rem",
          border: "1px solid var(--red-200)",
        }}>
          {activeTasks.filter(a => a.status === "in_progress").length} In Progress
        </div>
      </div>

      {activeTasks.length === 0 ? (
        <div style={{
          background: "white", border: "1.5px dashed var(--border)", borderRadius: "var(--radius)",
          padding: "60px 20px", textAlign: "center",
        }}>
          <div style={{ fontSize: "3rem", marginBottom: 12 }}>📋</div>
          <div style={{ fontWeight: 800, fontSize: "1rem", color: "var(--text-primary)", marginBottom: 6 }}>No Active Tasks</div>
          <div style={{ fontSize: ".85rem", color: "var(--text-muted)" }}>
            Head to the Dashboard and accept a recommended task to get started!
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {activeTasks.map(a => (
            <TaskCard
              key={a._id}
              assignment={a}
              onStart={handleStart}
              onComplete={handleComplete}
            />
          ))}
        </div>
      )}
    </div>
  );
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
