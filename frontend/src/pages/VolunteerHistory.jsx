import { useVolunteer } from "../context/VolunteerContext";

function HistoryCard({ assignment }) {
  const issue = assignment.issue || {};
  const completedDate = assignment.completedAt
    ? new Date(assignment.completedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : "—";
  const acceptedDate = assignment.createdAt
    ? new Date(assignment.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : "—";

  return (
    <div style={{
      background: "white", border: "1px solid var(--border)", borderRadius: "var(--radius)",
      padding: "20px 24px", display: "flex", flexDirection: "column", gap: 12,
      boxShadow: "var(--shadow-xs)", position: "relative", overflow: "hidden",
    }}>
      {/* Completed ribbon */}
      <div style={{
        position: "absolute", top: 0, right: 0,
        background: "linear-gradient(135deg, #10B981, #059669)",
        color: "white", fontSize: ".64rem", fontWeight: 800,
        padding: "4px 12px", borderBottomLeftRadius: 8,
        letterSpacing: "0.05em", textTransform: "uppercase",
      }}>✓ Completed</div>

      {/* Title + category */}
      <div style={{ paddingRight: 80 }}>
        <div style={{ fontWeight: 800, fontSize: ".95rem", color: "var(--text-primary)", marginBottom: 4 }}>
          {issue.title || "Community Task"}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
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

      {/* Meta row */}
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10,
        background: "var(--bg)", borderRadius: "var(--radius-sm)", padding: "10px 14px",
      }}>
        <div>
          <div style={{ fontSize: ".65rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>Accepted</div>
          <div style={{ fontSize: ".8rem", fontWeight: 700, color: "var(--text-primary)" }}>{acceptedDate}</div>
        </div>
        <div>
          <div style={{ fontSize: ".65rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>Completed</div>
          <div style={{ fontSize: ".8rem", fontWeight: 700, color: "var(--emerald-600)" }}>{completedDate}</div>
        </div>
        <div>
          <div style={{ fontSize: ".65rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 2 }}>Urgency</div>
          <div style={{ fontSize: ".8rem", fontWeight: 700, color: "var(--text-primary)", textTransform: "capitalize" }}>
            {issue.urgency || "—"}
          </div>
        </div>
      </div>

      {/* Karma earned */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        padding: "8px 12px", background: "#FFFBEB", borderRadius: "var(--radius-sm)",
        border: "1px solid #FDE68A",
      }}>
        <span className="material-symbols-outlined" style={{ fontSize: 16, color: "#D97706" }}>star</span>
        <span style={{ fontSize: ".78rem", fontWeight: 700, color: "#92400E" }}>
          +125 Karma Points earned
        </span>
      </div>
    </div>
  );
}

export default function VolunteerHistory({ showToast: _showToast }) {
  const { history, loading, volunteer } = useVolunteer();

  if (loading) return <PageSpinner />;

  const totalKarma = history.length * 125;

  return (
    <div style={{ maxWidth: 960, margin: "0 auto" }}>
      {/* Page header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--text-primary)", marginBottom: 6 }}>
          Work History
        </h1>
        <p style={{ fontSize: ".85rem", color: "var(--text-secondary)" }}>
          All tasks you've completed — your impact at a glance.
        </p>
      </div>

      {/* Summary stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 32 }}>
        {[
          { icon: "task_alt",      label: "Tasks Completed",  value: volunteer?.completedTasks ?? history.length, color: "var(--emerald-600)", bg: "#F0FDF4" },
          { icon: "star",          label: "Karma Points",     value: totalKarma.toLocaleString(),                 color: "#D97706",           bg: "#FFFBEB" },
          { icon: "emoji_events",  label: "Hero Rank",        value: getRank(volunteer?.completedTasks ?? 0),     color: "var(--red-600)",    bg: "var(--red-50)" },
        ].map(s => (
          <div key={s.label} style={{
            background: "white", border: "1px solid var(--border)", borderRadius: "var(--radius)",
            padding: "18px 20px", display: "flex", alignItems: "center", gap: 16,
            boxShadow: "var(--shadow-xs)",
          }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 22, color: s.color }}>{s.icon}</span>
            </div>
            <div>
              <div style={{ fontSize: "1.4rem", fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: ".75rem", color: "var(--text-muted)", fontWeight: 600, marginTop: 2 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* History cards */}
      {history.length === 0 ? (
        <div style={{
          background: "white", border: "1.5px dashed var(--border)", borderRadius: "var(--radius)",
          padding: "60px 20px", textAlign: "center",
        }}>
          <div style={{ fontSize: "3rem", marginBottom: 12 }}>🏆</div>
          <div style={{ fontWeight: 800, fontSize: "1rem", color: "var(--text-primary)", marginBottom: 6 }}>No Completed Tasks Yet</div>
          <div style={{ fontSize: ".85rem", color: "var(--text-muted)" }}>
            Accept and complete tasks to build your impact history!
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {history.map(a => <HistoryCard key={a._id} assignment={a} />)}
        </div>
      )}
    </div>
  );
}

function getRank(count) {
  if (count >= 20) return "Golden Hero 🥇";
  if (count >= 10) return "Silver Hero 🥈";
  if (count >= 5)  return "Rising Star ⭐";
  return "Volunteer 🙋";
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
