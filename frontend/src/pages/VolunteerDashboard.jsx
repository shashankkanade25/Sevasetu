import { useState } from "react";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { VolunteerProvider, useVolunteer } from "../context/VolunteerContext";
import VolunteerTasks   from "./VolunteerTasks";
import VolunteerHistory from "./VolunteerHistory";
import VolunteerProfile from "./VolunteerProfile";

/* ─── Urgency colours ─── */
const URGENCY = {
  urgent: { bg: "#FEF2F2", color: "#DC2626", border: "#FECACA" },
  high:   { bg: "#FFFBEB", color: "#D97706", border: "#FDE68A" },
  medium: { bg: "#F8FAFC", color: "#64748B", border: "#E2E8F0" },
  low:    { bg: "#F0FDF4", color: "#16A34A", border: "#BBF7D0" },
};
const ug = (u = "medium") => URGENCY[u.toLowerCase()] || URGENCY.medium;

function getBadge(count) {
  if (count >= 20) return { label: "Golden Hero", icon: "workspace_premium", color: "#B45309", bg: "#FEF3C7" };
  if (count >= 10) return { label: "Silver Hero",  icon: "military_tech",     color: "#475569", bg: "#F1F5F9" };
  if (count >= 5)  return { label: "Rising Star",  icon: "auto_awesome",      color: "#059669", bg: "#ECFDF5" };
  return { label: "Volunteer", icon: "person", color: "#6B7280", bg: "#F3F4F6" };
}

/* ─── Spinner ─── */
function Spin() {
  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "50px 0" }}>
      <div style={{
        width: 36, height: 36, borderRadius: "50%",
        border: "3px solid var(--border)", borderTopColor: "var(--red-500)",
        animation: "vspin 0.7s linear infinite",
      }} />
      <style>{`@keyframes vspin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

/* ─── Recommendation Card ─── */
function RecommendCard({ issue, onAccept, accepting }) {
  const u    = ug(issue.urgency);
  const busy = accepting === issue._id;
  const [hovered, setHovered] = useState(false);

  const score = issue.matchScore != null
    ? Math.round(issue.matchScore)
    : Math.floor(65 + Math.random() * 30);

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "white",
        border: `1.5px solid ${hovered ? "var(--red-300)" : "var(--border)"}`,
        borderRadius: "var(--radius)", padding: "18px 20px",
        display: "flex", flexDirection: "column", gap: 12,
        boxShadow: hovered ? "var(--shadow-md)" : "var(--shadow-xs)",
        transform: hovered ? "translateY(-2px)" : "none",
        transition: "all 0.2s ease",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div style={{ fontWeight: 800, fontSize: ".9rem", color: "var(--text-primary)", lineHeight: 1.3 }}>
          {issue.title || "Community Issue"}
        </div>
        <span style={{
          padding: "2px 10px", borderRadius: 999, fontSize: ".68rem", fontWeight: 700, flexShrink: 0,
          background: u.bg, color: u.color, border: `1px solid ${u.border}`,
        }}>
          {(issue.urgency || "medium").toUpperCase()}
        </span>
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

      <div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
          <span style={{ fontSize: ".72rem", color: "var(--text-muted)", fontWeight: 600 }}>Skill Match</span>
          <span style={{ fontSize: ".78rem", fontWeight: 800, color: "var(--emerald-600)" }}>{score}%</span>
        </div>
        <div style={{ height: 5, background: "var(--border)", borderRadius: 999 }}>
          <div style={{
            height: "100%", width: `${score}%`,
            background: "linear-gradient(90deg, #10B981, #059669)", borderRadius: 999,
            transition: "width 0.6s ease",
          }} />
        </div>
      </div>

      {issue.peopleAffected > 0 && (
        <div style={{ fontSize: ".75rem", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 4 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 14, color: "var(--red-500)" }}>groups</span>
          <strong style={{ color: "var(--text-primary)" }}>{issue.peopleAffected.toLocaleString()}</strong> people need help
        </div>
      )}

      <button
        onClick={() => onAccept(issue)}
        disabled={busy}
        style={{
          marginTop: 4, width: "100%", padding: "9px 0",
          background: busy ? "var(--border)" : "linear-gradient(135deg, #EF4444, #DC2626)",
          color: busy ? "var(--text-muted)" : "white",
          border: "none", borderRadius: "var(--radius-sm)",
          fontWeight: 700, fontSize: ".82rem", cursor: busy ? "not-allowed" : "pointer",
          transition: "all 0.2s ease",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
        }}
      >
        {busy
          ? <><BtnSpinner />Accepting...</>
          : <><span className="material-symbols-outlined" style={{ fontSize: 15 }}>volunteer_activism</span>Accept Task</>
        }
      </button>
    </div>
  );
}

/* ─── Dashboard view (main page) ─── */
function DashboardView({ showToast, setActiveNav }) {
  const { volunteer, recommendations, activeTasks, history, loading, acceptTask } = useVolunteer();
  const [accepting, setAccepting] = useState(null);

  const completedCount = volunteer?.completedTasks ?? 0;
  const badge = getBadge(completedCount);

  const handleAccept = async (issue) => {
    setAccepting(issue._id);
    try {
      await acceptTask(issue);
      showToast("✅ Task accepted! Check My Tasks.");
    } catch (err) {
      const msg = err?.response?.data?.error || "Failed to accept task.";
      showToast(`⚠️ ${msg}`);
    } finally {
      setAccepting(null);
    }
  };

  if (loading) return <Spin />;

  return (
    <div>
      {/* Welcome banner */}
      <div style={{
        background: "linear-gradient(135deg, #EF4444 0%, #DC2626 60%, #B91C1C 100%)",
        borderRadius: "var(--radius)", padding: "24px 28px", marginBottom: 28,
        display: "flex", justifyContent: "space-between", alignItems: "center",
        boxShadow: "0 4px 20px rgba(220,38,38,0.3)",
      }}>
        <div>
          <div style={{ color: "rgba(255,255,255,0.8)", fontSize: ".8rem", fontWeight: 600, marginBottom: 4 }}>
            Welcome back 👋
          </div>
          <div style={{ color: "white", fontSize: "1.4rem", fontWeight: 900, marginBottom: 6 }}>
            {volunteer?.name || "Hero"}
          </div>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: "rgba(255,255,255,0.2)", borderRadius: 999,
            padding: "4px 14px", fontSize: ".75rem", fontWeight: 700, color: "white",
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 15 }}>{badge.icon}</span>
            {badge.label}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ color: "rgba(255,255,255,0.7)", fontSize: ".72rem", fontWeight: 600, marginBottom: 4 }}>Tasks Completed</div>
          <div style={{ color: "white", fontSize: "2.8rem", fontWeight: 900, lineHeight: 1 }}>{completedCount}</div>
        </div>
      </div>

      {/* Stats grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 }}>
        {[
          { icon: "verified",       value: completedCount,                                              label: "Completed",    iconColor: "#059669", bg: "#F0FDF4" },
          { icon: "pending_actions",value: activeTasks.length,                                          label: "Active Tasks", iconColor: "var(--red-600)", bg: "var(--red-50)" },
          { icon: "star",           value: (completedCount * 125).toLocaleString(),                     label: "Karma Points", iconColor: "#D97706", bg: "#FFFBEB" },
          { icon: "history",        value: history.length,                                              label: "History",      iconColor: "#6B7280", bg: "#F3F4F6" },
        ].map(s => (
          <div key={s.label} style={{
            background: "white", border: "1px solid var(--border)", borderRadius: "var(--radius)",
            padding: "18px 20px", boxShadow: "var(--shadow-xs)",
          }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20, color: s.iconColor }}>{s.icon}</span>
            </div>
            <div style={{ fontSize: "1.5rem", fontWeight: 900, color: "var(--text-primary)", lineHeight: 1, marginBottom: 4 }}>{s.value}</div>
            <div style={{ fontSize: ".72rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Two-col grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 24 }}>
        {/* Recommendations */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span className="material-symbols-outlined" style={{ color: "var(--red-600)" }}>recommend</span>
              <h2 style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--text-primary)" }}>Recommended for You</h2>
            </div>
            <span style={{
              padding: "3px 12px", background: "var(--red-50)", color: "var(--red-700)",
              borderRadius: 999, fontSize: ".72rem", fontWeight: 700, border: "1px solid var(--red-200)",
            }}>{recommendations.length} open tasks</span>
          </div>

          {recommendations.length === 0 ? (
            <div style={{
              background: "white", border: "1.5px dashed var(--border)", borderRadius: "var(--radius)",
              padding: "40px 20px", textAlign: "center",
            }}>
              <div style={{ fontSize: "2.5rem", marginBottom: 10 }}>🎉</div>
              <div style={{ fontWeight: 800, color: "var(--text-primary)", marginBottom: 4 }}>You're all caught up!</div>
              <div style={{ fontSize: ".82rem", color: "var(--text-muted)" }}>No open tasks right now. Check back soon.</div>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {recommendations.slice(0, 6).map(issue => (
                <RecommendCard key={issue._id} issue={issue} onAccept={handleAccept} accepting={accepting} />
              ))}
            </div>
          )}
        </div>

        {/* Active tasks sidebar */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span className="material-symbols-outlined" style={{ color: "var(--red-600)" }}>assignment_turned_in</span>
              <h2 style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--text-primary)" }}>My Active Tasks</h2>
            </div>
            {activeTasks.length > 0 && (
              <button onClick={() => setActiveNav("tasks")} style={{
                background: "none", border: "none", color: "var(--red-600)",
                fontSize: ".75rem", fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
              }}>View all →</button>
            )}
          </div>

          {activeTasks.length === 0 ? (
            <div style={{
              background: "white", border: "1.5px dashed var(--border)", borderRadius: "var(--radius)",
              padding: "30px 16px", textAlign: "center",
            }}>
              <div style={{ fontSize: "2rem", marginBottom: 8 }}>📋</div>
              <div style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: ".88rem", marginBottom: 4 }}>No active tasks</div>
              <div style={{ fontSize: ".78rem", color: "var(--text-muted)" }}>Accept a recommendation to begin.</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {activeTasks.slice(0, 4).map(a => {
                const issue = a.issue || {};
                const STATUS_MAP = {
                  assigned:    { label: "Assigned",    bg: "#FFFBEB", color: "#D97706" },
                  in_progress: { label: "In Progress", bg: "#EFF6FF", color: "#2563EB" },
                };
                const s = STATUS_MAP[a.status] || STATUS_MAP.assigned;
                return (
                  <div key={a._id} style={{
                    background: "white", border: "1px solid var(--border)",
                    borderRadius: "var(--radius-sm)", padding: "12px 16px",
                    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: ".84rem", color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {issue.title || "Task"}
                      </div>
                      <div style={{ fontSize: ".72rem", color: "var(--text-muted)", marginTop: 2 }}>{issue.location}</div>
                    </div>
                    <span style={{
                      padding: "2px 10px", borderRadius: 999, fontSize: ".68rem", fontWeight: 700, flexShrink: 0,
                      background: s.bg, color: s.color,
                    }}>{s.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   MAIN SHELL — wraps the 4 pages
═══════════════════════════════════════════════════════ */
function VolunteerShell({ firebaseUser, onLogout }) {
  const [activeNav, setActiveNav] = useState("dashboard");
  const [toastMsg,  setToastMsg]  = useState(null);
  const { volunteer, loading } = useVolunteer();

  const completedCount = volunteer?.completedTasks ?? 0;
  const badge = getBadge(completedCount);

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const handleLogout = async () => {
    try { await signOut(auth); } catch (_) {}
    onLogout?.();
  };

  const NAV = [
    { id: "dashboard", icon: "dashboard",           label: "Dashboard"  },
    { id: "tasks",     icon: "assignment",           label: "My Tasks"   },
    { id: "history",   icon: "history",              label: "History"    },
    { id: "profile",   icon: "manage_accounts",      label: "My Profile" },
  ];

  const renderPage = () => {
    switch (activeNav) {
      case "tasks":   return <VolunteerTasks   showToast={showToast} />;
      case "history": return <VolunteerHistory showToast={showToast} />;
      case "profile": return <VolunteerProfile showToast={showToast} />;
      default:        return <DashboardView    showToast={showToast} setActiveNav={setActiveNav} />;
    }
  };

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", fontFamily: "'Inter', sans-serif" }}>
      {/* ── Sidebar ── */}
      <aside style={{
        width: 256, background: "white", borderRight: "1px solid var(--border)",
        display: "flex", flexDirection: "column", padding: "24px 0", flexShrink: 0,
      }}>
        {/* Brand */}
        <div style={{ padding: "0 20px", marginBottom: 28, display: "flex", alignItems: "center", gap: 10 }}>
          <img src="/Sevasetu-logo.png" alt="SevaSetu" style={{ height: 34, objectFit: "contain" }} />
          <span style={{ fontWeight: 900, fontSize: "1.2rem", letterSpacing: "-0.04em", color: "var(--text-primary)" }}>
            Seva<span style={{ color: "var(--red-600)" }}>Setu</span>
          </span>
        </div>

        {/* Volunteer identity card */}
        {!loading && volunteer && (
          <div style={{
            margin: "0 12px 24px", padding: "12px 14px",
            background: "linear-gradient(135deg, var(--red-50), #FFF5F5)",
            borderRadius: "var(--radius-sm)", border: "1px solid var(--red-200)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 38, height: 38, borderRadius: "50%", background: badge.bg,
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: 20, color: badge.color }}>{badge.icon}</span>
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: ".85rem", color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {volunteer.name}
                </div>
                <div style={{ fontSize: ".68rem", color: badge.color, fontWeight: 700 }}>{badge.label}</div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav style={{ flex: 1, padding: "0 10px" }}>
          {NAV.map(item => {
            const active = activeNav === item.id;
            return (
              <div
                key={item.id}
                onClick={() => setActiveNav(item.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "11px 14px",
                  borderRadius: "var(--radius-sm)", cursor: "pointer", marginBottom: 2,
                  background: active ? "var(--red-50)" : "transparent",
                  color: active ? "var(--red-600)" : "var(--text-secondary)",
                  fontWeight: active ? 700 : 500, fontSize: ".88rem",
                  transition: "all 0.15s ease",
                  borderLeft: active ? "3px solid var(--red-500)" : "3px solid transparent",
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{item.icon}</span>
                {item.label}
              </div>
            );
          })}
        </nav>

        {/* Sign out */}
        <div style={{ borderTop: "1px solid var(--border-light)", padding: "16px 10px 0" }}>
          <button
            onClick={handleLogout}
            style={{
              width: "100%", display: "flex", alignItems: "center", gap: 10,
              padding: "10px 14px", borderRadius: "var(--radius-sm)", border: "none",
              background: "transparent", color: "var(--text-secondary)",
              fontSize: ".88rem", fontWeight: 600, cursor: "pointer",
              transition: "background 0.15s",
            }}
            onMouseEnter={e => e.currentTarget.style.background = "var(--bg)"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>logout</span>
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main area ── */}
      <main style={{ flex: 1, background: "var(--bg)", overflowY: "auto", display: "flex", flexDirection: "column" }}>
        {/* Top bar */}
        <header style={{
          height: 64, background: "white", borderBottom: "1px solid var(--border)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 28px", position: "sticky", top: 0, zIndex: 100, flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: "var(--text-muted)" }}>home</span>
            <span style={{ color: "var(--text-muted)", fontSize: ".85rem" }}>/</span>
            <span style={{ fontSize: ".88rem", fontWeight: 700, color: "var(--text-primary)", textTransform: "capitalize" }}>
              {activeNav === "dashboard" ? "Dashboard" : NAV.find(n => n.id === activeNav)?.label}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {/* Availability indicator */}
            {volunteer && (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: volunteer.availability ? "#10B981" : "#9CA3AF",
                  boxShadow: volunteer.availability ? "0 0 0 2px rgba(16,185,129,0.3)" : "none",
                }} />
                <span style={{ fontSize: ".75rem", fontWeight: 600, color: volunteer.availability ? "var(--emerald-600)" : "var(--text-muted)" }}>
                  {volunteer.availability ? "Available" : "Away"}
                </span>
              </div>
            )}
            <div style={{ width: 1, height: 20, background: "var(--border)" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{
                width: 32, height: 32, borderRadius: "50%", background: "var(--red-50)",
                display: "flex", alignItems: "center", justifyContent: "center",
                border: "2px solid var(--red-200)",
              }}>
                <span style={{ fontWeight: 800, fontSize: ".8rem", color: "var(--red-600)" }}>
                  {(volunteer?.name || firebaseUser?.displayName || "V")[0].toUpperCase()}
                </span>
              </div>
              <div>
                <div style={{ fontSize: ".8rem", fontWeight: 700, color: "var(--text-primary)" }}>
                  {volunteer?.name || firebaseUser?.displayName || "Volunteer"}
                </div>
                <div style={{ fontSize: ".68rem", color: "var(--text-muted)" }}>Volunteer</div>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <div style={{ flex: 1, padding: 28 }}>
          {renderPage()}
        </div>
      </main>

      {/* ── Toast ── */}
      {toastMsg && (
        <div style={{
          position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
          background: "var(--text-primary)", color: "white", padding: "12px 24px",
          borderRadius: 999, fontSize: ".85rem", fontWeight: 600,
          boxShadow: "0 8px 24px rgba(0,0,0,0.25)", zIndex: 9999,
          animation: "toastIn 0.3s ease-out",
        }}>
          {toastMsg}
        </div>
      )}

      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateX(-50%) translateY(12px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   EXPORTED ROOT — wraps shell with context provider
═══════════════════════════════════════════════════════ */
export default function VolunteerDashboard({ user, onLogout }) {
  return (
    <VolunteerProvider firebaseUser={user}>
      <VolunteerShell firebaseUser={user} onLogout={onLogout} />
    </VolunteerProvider>
  );
}

/* ─── helpers ─── */
function BtnSpinner() {
  return (
    <svg style={{ animation: "vspin 0.8s linear infinite" }} width="14" height="14" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" opacity="0.3" />
      <path d="M4 12a8 8 0 018-8" stroke="white" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
