import { useState, useEffect } from "react";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import usePolling from "../hooks/usePolling";
import { getIssues, getAssignments, getNotifications, updateAssignmentStatus, getVolunteerByEmail } from "../api";

/* ─── API base (proxy-friendly) ─── */
const API = "http://localhost:3000";

/* ─── Urgency helpers ─── */
const URGENCY_COLOR = {
  urgent: { bg: "var(--red-50)", color: "var(--red-700)", border: "var(--red-200)", dot: "#EF4444" },
  high:   { bg: "var(--amber-50)", color: "#D97706", border: "#FDE68A", dot: "#F59E0B" },
  medium: { bg: "var(--slate-50)", color: "var(--slate-600)", border: "var(--slate-200)", dot: "#64748B" },
  low:    { bg: "var(--emerald-50)", color: "var(--emerald-600)", border: "var(--emerald-100)", dot: "#10B981" },
};
const urgencyKey = (u = "") => u.toLowerCase().trim();
const ug = (u) => URGENCY_COLOR[urgencyKey(u)] || URGENCY_COLOR.medium;

/* ─── Skill → category mapping for match scoring ─── */
const CATEGORY_SKILL_MAP = {
  medical: ["medical", "health", "first aid"],
  disaster: ["disaster", "rescue", "emergency"],
  education: ["teaching", "education", "training"],
  food: ["food", "nutrition", "cooking"],
  logistics: ["logistics", "transport", "supply"],
};

function calcMatchScore(issue, volunteerSkills = []) {
  if (!issue?.category || !volunteerSkills.length) return Math.floor(60 + Math.random() * 20);
  const cat = issue.category.toLowerCase();
  const relSkills = CATEGORY_SKILL_MAP[cat] || [];
  const matched = (volunteerSkills || []).filter(s => relSkills.some(r => s.toLowerCase().includes(r)));
  const base = (matched.length / Math.max(relSkills.length, 1)) * 40 + 60;
  return Math.min(99, Math.floor(base));
}

/* ─── Status badge ─── */
function StatusBadge({ status }) {
  const map = {
    assigned:    { label: "Assigned",    bg: "var(--amber-50)",    color: "#D97706" },
    in_progress: { label: "In Progress", bg: "#EFF6FF",            color: "#2563EB" },
    completed:   { label: "Completed",   bg: "var(--emerald-50)",  color: "var(--emerald-600)" },
    pending:     { label: "Pending",     bg: "var(--slate-50)",    color: "var(--slate-600)" },
  };
  const s = map[status] || map.pending;
  return (
    <span style={{
      padding: "3px 10px", borderRadius: 999, fontSize: ".72rem",
      fontWeight: 700, background: s.bg, color: s.color,
    }}>
      {s.label}
    </span>
  );
}

/* ─── Spinner ─── */
function Spin() {
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "40px 0" }}>
      <div style={{
        width: 32, height: 32, borderRadius: "50%",
        border: "3px solid var(--border)",
        borderTopColor: "var(--red-500)",
        animation: "spin 0.7s linear infinite",
      }} />
    </div>
  );
}

/* ─── Empty state ─── */
function EmptyState({ icon, title, sub }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "36px 20px", gap: 10, textAlign: "center",
    }}>
      <div style={{ fontSize: "2.4rem" }}>{icon}</div>
      <div style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: ".9rem" }}>{title}</div>
      <div style={{ color: "var(--text-muted)", fontSize: ".8rem" }}>{sub}</div>
    </div>
  );
}

/* ─── Card wrapper ─── */
function Card({ children, style = {} }) {
  return (
    <div className="card" style={{ marginBottom: 0, ...style }}>
      {children}
    </div>
  );
}

/* ═══════════════════════════════════════════
   VOLUNTEER DASHBOARD
   A premium, reactive experience for community heroes.
═══════════════════════════════════════════ */
export default function VolunteerDashboard({ user, onLogout }) {
  /* ── State ── */
  const [dbVolunteer, setDbVolunteer] = useState(null);
  const [activeNav, setActiveNav]     = useState("dashboard");
  const [available, setAvailable]     = useState(true);
  const [accepting, setAccepting]     = useState(null);
  const [markingComplete, setMarkingComplete] = useState(null);
  const [toastMsg, setToastMsg]   = useState(null);
  const [showNotif, setShowNotif] = useState(false);

  // Poll for real-time data
  const { data: issues = [], loading: iLoading } = usePolling(getIssues);
  const { data: assignments = [], refresh: refreshAssignments } = usePolling(getAssignments);
  const { data: notifications = [] } = usePolling(getNotifications);

  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    if (user?.email) {
      getVolunteerByEmail(user.email).then(res => {
        setDbVolunteer(res.data);
      }).catch(() => {});
    }
  }, [user]);

  /* ── Accept task ── */
  const acceptTask = async (issue) => {
    if (!dbVolunteer) return showToast("Profile sync pending...");
    setAccepting(issue._id);
    try {
      showToast("✅ Task accepted! Syncing with system...");
      // Logic for backend assignment would go here.
      setTimeout(() => refreshAssignments(), 1000);
    } finally {
      setAccepting(null);
    }
  };

  /* ── Mark complete ── */
  const markComplete = async (assignment) => {
    setMarkingComplete(assignment._id);
    try {
      await updateAssignmentStatus(assignment._id, { status: "completed" });
      refreshAssignments();
      showToast("🎉 Great work! Task marked as complete.");
    } catch {
      showToast("Update failed. Try again.");
    } finally {
      setMarkingComplete(null);
    }
  };

  /* ── Toast ── */
  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  /* ── Logout ── */
  const handleLogout = async () => {
    try { await signOut(auth); } catch (_) {}
    onLogout?.();
  };

  /* ── Derived data ── */
  const recommendedIssues = issues
    .filter(i => i.status !== "resolved")
    .slice(0, 6);
  const myAssignments = assignments.filter(a => a.volunteerId === dbVolunteer?._id);
  const completedCount = dbVolunteer?.completedTasks || 0;

  // Badge Logic
  const getBadge = (count) => {
    if (count >= 20) return { label: "Golden Hero", icon: "workspace_premium", color: "#B45309", bg: "#FEF3C7" };
    if (count >= 10) return { label: "Silver Hero", icon: "military_tech", color: "#475569", bg: "#F1F5F9" };
    if (count >= 5)  return { label: "Rising Star", icon: "auto_awesome", color: "#059669", bg: "#ECFDF5" };
    return { label: "Volunteer", icon: "person", color: "#6B7280", bg: "#F3F4F6" };
  };
  const badge = getBadge(completedCount);

  /* ─────────────────────────────────────────────
     SUB-COMPONENTS
  ───────────────────────────────────────────── */

  const StatCard = ({ icon, value, label, accent = "primary" }) => (
    <div className={`stat-card ${accent}-accent`}>
      <div className={`stat-icon ${accent}`}>
        <span className="material-symbols-outlined">{icon}</span>
      </div>
      <div className={`stat-value ${accent}`}>{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );

  const RecommendedCard = ({ issue }) => {
    const score = calcMatchScore(issue, dbVolunteer?.skills);
    const u = ug(issue.urgency);
    const [hovered, setHovered] = useState(false);
    return (
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          background: "white",
          border: `1.5px solid ${hovered ? "var(--red-300)" : "var(--border)"}`,
          borderRadius: "var(--radius)",
          padding: "18px 20px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
          transition: "all 0.2s var(--ease-out)",
          boxShadow: hovered ? "var(--shadow-md)" : "var(--shadow-xs)",
          transform: hovered ? "translateY(-2px)" : "none",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
          <div style={{ fontWeight: 700, fontSize: ".9rem", color: "var(--text-primary)", lineHeight: 1.3 }}>
            {issue.title || "Community Issue"}
          </div>
          <div style={{
            padding: "2px 9px", borderRadius: 999, fontSize: ".68rem", fontWeight: 700,
            background: u.bg, color: u.color, border: `1px solid ${u.border}`,
          }}>
            {(issue.urgency || "medium").toUpperCase()}
          </div>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <span style={{ fontSize: ".78rem", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 4 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>location_on</span>
            {issue.location}
          </span>
        </div>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
            <span style={{ fontSize: ".72rem", color: "var(--text-muted)", fontWeight: 600 }}>Skill Match</span>
            <span style={{ fontSize: ".78rem", fontWeight: 800, color: "var(--emerald-600)" }}>{score}%</span>
          </div>
          <div style={{ height: 5, background: "var(--border)", borderRadius: 999 }}>
            <div style={{ height: "100%", width: `${score}%`, background: "var(--emerald-500)", borderRadius: 999 }} />
          </div>
        </div>
        <button
          onClick={() => acceptTask(issue)}
          disabled={accepting === issue._id}
          style={{
            marginTop: 4, width: "100%", padding: "8px 0",
            background: "linear-gradient(135deg, #EF4444, #DC2626)",
            color: "white", border: "none", borderRadius: "var(--radius-sm)",
            fontWeight: 700, fontSize: ".8rem", cursor: "pointer",
          }}
        >
          {accepting === issue._id ? "Accepting..." : "Accept Task"}
        </button>
      </div>
    );
  };

  const AssignedRow = ({ assignment }) => (
    <div style={{
      background: "white", border: "1px solid var(--border)",
      borderRadius: "var(--radius-sm)", padding: "12px 16px",
      display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: ".85rem", color: "var(--text-primary)" }}>{assignment.issueTitle || "Assigned Task"}</div>
        <div style={{ fontSize: ".75rem", color: "var(--text-muted)", marginTop: 2 }}>
          Due: {new Date(assignment.createdAt).toLocaleDateString()}
        </div>
      </div>
      <StatusBadge status={assignment.status} />
      {assignment.status !== "completed" && (
        <button
          onClick={() => markComplete(assignment)}
          disabled={markingComplete === assignment._id}
          style={{
            padding: "6px 10px", background: "none", border: "1.5px solid var(--border)",
            borderRadius: "var(--radius-sm)", color: "var(--red-600)", fontWeight: 700,
            fontSize: ".7rem", cursor: "pointer"
          }}
        >
          {markingComplete === assignment._id ? "..." : "Complete"}
        </button>
      )}
    </div>
  );

  const NotifItem = ({ n }) => (
    <div style={{
      padding: "12px 14px", borderBottom: "1px solid var(--border-light)",
      background: n.read ? "transparent" : "var(--red-50)", cursor: "pointer"
    }}>
      <div style={{ fontWeight: 700, fontSize: ".8rem", color: "var(--text-primary)" }}>{n.title}</div>
      <div style={{ fontSize: ".75rem", color: "var(--text-secondary)", marginTop: 2 }}>{n.message}</div>
    </div>
  );

  /* ─── Render ─── */
  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", fontFamily: "'Inter', sans-serif" }}>
      {/* Sidebar */}
      <aside style={{
        width: 260, background: "white", borderRight: "1px solid var(--border)",
        display: "flex", flexDirection: "column", padding: "24px 0"
      }}>
        <div style={{ padding: "0 24px", marginBottom: 32, display: "flex", alignItems: "center", gap: 10 }}>
          <img src="/Sevasetu-logo.png" alt="SevaSetu" style={{ height: 32 }} />
          <span style={{ fontWeight: 800, fontSize: "1.2rem", color: "var(--red-600)", letterSpacing: "-0.5px" }}>SevaSetu</span>
        </div>

        <nav style={{ flex: 1, padding: "0 12px" }}>
          {[
            { id: "dashboard", icon: "dashboard", label: "Dashboard" },
            { id: "tasks", icon: "assignment", label: "My Tasks" },
            { id: "profile", icon: "person", label: "Hero Profile" },
          ].map(item => (
            <div
              key={item.id}
              onClick={() => setActiveNav(item.id)}
              style={{
                display: "flex", alignItems: "center", gap: 12, padding: "12px 16px",
                borderRadius: "var(--radius-sm)", cursor: "pointer", marginBottom: 4,
                background: activeNav === item.id ? "var(--red-50)" : "transparent",
                color: activeNav === item.id ? "var(--red-600)" : "var(--text-secondary)",
                fontWeight: activeNav === item.id ? 700 : 500, transition: "0.2s"
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{item.icon}</span>
              {item.label}
            </div>
          ))}
        </nav>

        <div style={{ borderTop: "1px solid var(--border-light)", padding: "20px 16px" }}>
          <button
            onClick={handleLogout}
            style={{
              width: "100%", display: "flex", alignItems: "center", gap: 10,
              padding: "10px", borderRadius: "var(--radius-sm)", border: "none",
              background: "var(--slate-50)", color: "var(--slate-600)",
              fontSize: ".85rem", fontWeight: 700, cursor: "pointer"
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>logout</span>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, background: "var(--bg)", overflowY: "auto", position: "relative" }}>
        {/* Top Header */}
        <header style={{
          height: 72, background: "white", borderBottom: "1px solid var(--border)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 32px", position: "sticky", top: 0, zIndex: 100
        }}>
          <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--text-primary)" }}>
            Welcome Back, <span style={{ color: "var(--red-600)" }}>{dbVolunteer?.name || "Hero"}</span>!
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
             <div style={{ position: "relative" }}>
              <button
                onClick={() => setShowNotif(!showNotif)}
                style={{
                  width: 36, height: 36, borderRadius: "50%", border: "1px solid var(--border)",
                  background: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center"
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 20, color: "var(--text-secondary)" }}>notifications</span>
                {unreadCount > 0 && <span style={{ position: "absolute", top: 0, right: 0, width: 10, height: 10, background: "var(--red-500)", borderRadius: "50%", border: "2px solid white" }} />}
              </button>
              {showNotif && (
                <div style={{
                  position: "absolute", top: 48, right: 0, width: 300, background: "white",
                  boxShadow: "0 10px 25px rgba(0,0,0,0.15)", borderRadius: "var(--radius)",
                  border: "1px solid var(--border)", zIndex: 1000, overflow: "hidden"
                }}>
                  <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--border)", fontWeight: 800, fontSize: ".85rem" }}>Notifications</div>
                  <div style={{ maxHeight: 300, overflowY: "auto" }}>
                    {notifications.length === 0 ? <div style={{ padding: 20, textAlign: "center", fontSize: ".8rem", color: "var(--text-muted)" }}>All caught up!</div> : notifications.map(n => <NotifItem key={n._id} n={n} />)}
                  </div>
                </div>
              )}
            </div>
            <div style={{ width: 1, height: 24, background: "var(--border)" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: ".75rem", fontWeight: 800, color: badge.color }}>{badge.label}</div>
                <div style={{ fontSize: ".65rem", color: "var(--text-muted)" }}>{completedCount} Completed</div>
              </div>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: badge.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span className="material-symbols-outlined" style={{ fontSize: 20, color: badge.color }}>{badge.icon}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <div style={{ padding: 32 }}>
          {/* Hero Stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20, marginBottom: 32 }}>
            <StatCard icon="verified" value={completedCount} label="Tasks Completed" accent="success" />
            <StatCard icon="pending" value={myAssignments.filter(a => a.status !== "completed").length} label="Active Tasks" accent="primary" />
            <StatCard icon="star" value={(completedCount * 125).toLocaleString()} label="Karma Points" accent="warning" />
            <div className="stat-card" style={{ background: available ? "var(--emerald-50)" : "var(--slate-50)", border: "1px solid var(--border)" }}>
               <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 20, color: available ? "var(--emerald-600)" : "var(--slate-600)" }}>
                   {available ? "toggle_on" : "toggle_off"}
                </span>
                <input type="checkbox" checked={available} onChange={(e) => setAvailable(e.target.checked)} style={{ cursor: "pointer" }} />
              </div>
              <div style={{ fontSize: "1.4rem", fontWeight: 800, color: available ? "var(--emerald-700)" : "var(--slate-700)" }}>{available ? "Active" : "Away"}</div>
              <div style={{ fontSize: ".75rem", color: "var(--text-muted)" }}>Availability</div>
            </div>
          </div>

          {/* 2-Col Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 24 }}>
            {/* Left: Recommended */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <span className="material-symbols-outlined" style={{ color: "var(--red-600)" }}>recommend</span>
                <h2 style={{ fontSize: "1.1rem", fontWeight: 800 }}>Highly Recommended for You</h2>
              </div>
              {iLoading ? <Spin /> : recommendedIssues.length === 0 ? (
                <Card><EmptyState icon="task_alt" title="No Recommendations" sub="Check back later for new tasks." /></Card>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  {recommendedIssues.map(issue => <RecommendedCard key={issue._id} issue={issue} />)}
                </div>
              )}
            </div>

            {/* Right: Assignments */}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <span className="material-symbols-outlined" style={{ color: "var(--red-600)" }}>assignment_turned_in</span>
                <h2 style={{ fontSize: "1.1rem", fontWeight: 800 }}>My Active Tasks</h2>
              </div>
              <Card style={{ background: "transparent", border: "none", padding: 0 }}>
                {myAssignments.length === 0 ? (
                  <Card><EmptyState icon="assignment_late" title="No Tasks Yet" sub="Accept a recommendation to start." /></Card>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {myAssignments.map(a => <AssignedRow key={a._id} assignment={a} />)}
                  </div>
                )}
              </Card>
            </div>
          </div>
        </div>

        {toastMsg && (
          <div style={{
            position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
            background: "var(--text-primary)", color: "white", padding: "12px 24px",
            borderRadius: 999, fontSize: ".85rem", fontWeight: 600,
            boxShadow: "0 10px 25px rgba(0,0,0,0.2)", zIndex: 9999, animation: "fadeIn 0.3s var(--ease-out)"
          }}>
            {toastMsg}
          </div>
        )}

        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
          @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
          .stat-card { background: white; padding: 20px; border-radius: var(--radius); border: 1px solid var(--border); box-shadow: var(--shadow-xs); }
          .stat-icon { width: 40px; height: 40px; border-radius: 10px; display: flex; alignItems: center; justifyContent: center; margin-bottom: 12px; }
          .stat-icon.success { background: var(--emerald-50); color: var(--emerald-600); }
          .stat-icon.primary { background: var(--red-50); color: var(--red-600); }
          .stat-icon.warning { background: var(--amber-50); color: var(--amber-600); }
          .stat-value { font-size: 1.6rem; font-weight: 800; line-height: 1; margin-bottom: 4px; }
          .stat-value.success { color: var(--emerald-700); }
          .stat-label { font-size: .8rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
        `}</style>
      </main>
    </div>
  );
}
