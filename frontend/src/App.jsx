import { BrowserRouter, Routes, Route, NavLink, useLocation, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "./firebase";
import Dashboard      from "./pages/Dashboard";
import Volunteers     from "./pages/Volunteers";
import Matching       from "./pages/Matching";
import AssignmentsPage from "./pages/AssignmentsPage";
import ProfilePage    from "./pages/ProfilePage";
import Upload         from "./pages/Upload";
import Insights       from "./pages/Insights";
import AIAnalytics    from "./pages/AIAnalytics";
import AuthPage       from "./pages/AuthPage";
import CompleteProfile  from "./pages/CompleteProfile";
import VolunteerDashboard from "./pages/VolunteerDashboard";
import HeaderDropdown from "./components/HeaderDropdown";
import { getNotifications, markNotifRead, authMe } from "./api";
import "./App.css";

/* ── Token helpers ── */
const getToken    = ()      => localStorage.getItem("seva_token");
const clearToken  = ()      => localStorage.removeItem("seva_token");

function Icon({ name }) {
  return <span className="material-symbols-outlined">{name}</span>;
}

const NAV_ITEMS = [
  { to: "/",             icon: "dashboard",           label: "Dashboard",         end: true },
  { to: "/upload",       icon: "cloud_upload",         label: "Data Upload"               },
  { to: "/insights",     icon: "insights",             label: "Insights"                  },
  { to: "/ai-analytics", icon: "neurology",            label: "AI Decision Engine"        },
  { to: "/matching",     icon: "hub",                  label: "Matching"                  },
  { to: "/volunteers",   icon: "group",                label: "Volunteers"                },
  { to: "/assignments",  icon: "assignment_turned_in", label: "Assignments"               },
];

const PAGE_TITLES = {
  "/": "Dashboard", "/upload": "Data Upload", "/insights": "Insights",
  "/ai-analytics": "AI Decision Engine", "/matching": "Matching & Allocation",
  "/volunteers": "Volunteers", "/assignments": "Assignments",
};

/* ── NGO Admin Shell ── */
function AppShell({ user, onLogout }) {
  const location    = useLocation();
  const currentPage = PAGE_TITLES[location.pathname] || "Dashboard";
  const displayName = user?.displayName || user?.email?.split("@")[0] || "Admin";
  const initials    = displayName.charAt(0).toUpperCase();

  const handleSignOut = async () => {
    try { await signOut(auth); } catch (_) {}
    clearToken();
    onLogout();
  };

  const [showNotifs,    setShowNotifs]    = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount,   setUnreadCount]   = useState(0);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await getNotifications("admin");
        setNotifications(res.data);
        setUnreadCount(res.data.filter(n => !n.read).length);
      } catch (_) {}
    };
    fetch();
    const id = setInterval(fetch, 15000);
    return () => clearInterval(id);
  }, []);

  const markRead = async (id) => {
    try {
      await markNotifRead(id);
      setNotifications(p => p.map(n => n._id === id ? { ...n, read: true } : n));
      setUnreadCount(c => Math.max(0, c - 1));
    } catch (_) {}
  };

  return (
    <div className="app-shell" onClick={() => setShowNotifs(false)}>
      <aside className="sidebar">
        <div className="sidebar-brand">
          <img src="/Sevasetu-logo.png" alt="SevaSetu" style={{ width:40, height:40, objectFit:"contain" }} />
          <span className="brand-name">Seva<span>Setu</span></span>
        </div>
        <nav className="sidebar-nav">
          {NAV_ITEMS.map(item => (
            <NavLink key={item.to} to={item.to} end={item.end}
              className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
              <Icon name={item.icon} /><span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer"><span className="status-dot" /> System Online</div>
      </aside>

      <main className="main-content">
        <div className="top-bar">
          <div className="top-bar-left">
            <Icon name="home" /> <span>/</span>
            <span style={{ color:"var(--text-primary)", fontWeight:600 }}>{currentPage}</span>
          </div>
          <div className="top-bar-right">
            <div style={{ position:"relative" }}>
              <button className="top-bar-btn"
                onClick={e => { e.stopPropagation(); setShowNotifs(!showNotifs); }}>
                <Icon name="notifications" />
                {unreadCount > 0 && <span className="notification-dot" />}
              </button>
              {showNotifs && (
                <div className="notif-dropdown animate-in" onClick={e => e.stopPropagation()} style={{
                  position: "absolute", top: "100%", right: 0, marginTop: "8px",
                  background: "var(--bg-card)", border: "1px solid var(--border)",
                  borderRadius: "var(--radius)", boxShadow: "var(--shadow-md)",
                  minWidth: "320px", zIndex: 100, overflow: "hidden"
                }}>
                  <div className="notif-header" style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", fontWeight: 600 }}>
                    <span>Notifications</span>
                    {unreadCount > 0 && <span className="notif-count" style={{ background: "var(--red-500)", color: "#fff", padding: "2px 8px", borderRadius: "10px", fontSize: "0.75rem" }}>{unreadCount} new</span>}
                  </div>
                  <div className="notif-body" style={{ maxHeight: "300px", overflowY: "auto" }}>
                    {notifications.length === 0
                      ? <div className="notif-empty" style={{ padding: "20px", textAlign: "center", color: "var(--text-muted)", fontSize: "0.85rem" }}>No new alerts</div>
                      : notifications.map(n => (
                          <div key={n._id} className={`notif-item ${!n.read?"unread":""}`}
                            onClick={() => markRead(n._id)}
                            style={{ 
                              padding: "12px 16px", 
                              borderBottom: "1px solid var(--border-subtle)", 
                              display: "flex", 
                              gap: "12px",
                              cursor: "pointer",
                              background: !n.read ? "var(--bg-subtle)" : "transparent",
                              transition: "background 0.2s ease"
                            }}>
                            <div className={`notif-icon ${n.type}`} style={{ 
                              color: n.type==="alert"?"var(--red-500)":n.type==="success"?"var(--emerald-500)":"var(--blue-500)",
                              display: "flex", alignItems: "flex-start", paddingTop: "2px"
                            }}>
                              <Icon name={n.type==="alert"?"warning":n.type==="success"?"check_circle":"info"} />
                            </div>
                            <div className="notif-content" style={{ flex: 1 }}>
                              <div className="notif-title" style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--text-primary)" }}>{n.title}</div>
                              <div className="notif-msg" style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "4px" }}>{n.message}</div>
                              <div className="notif-time" style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: "6px" }}>
                                {new Date(n.createdAt).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}
                              </div>
                            </div>
                            {!n.read && <div className="unread-pulse" style={{ width: "8px", height: "8px", background: "var(--red-500)", borderRadius: "50%", marginTop: "6px" }} />}
                          </div>
                        ))
                    }
                  </div>
                </div>
              )}
            </div>
            <HeaderDropdown user={user} onLogout={handleSignOut} />
          </div>
        </div>
        <div className="main-inner">
          <Routes>
            <Route path="/"             element={<Dashboard />}   />
            <Route path="/upload"       element={<Upload />}      />
            <Route path="/insights"     element={<Insights />}    />
            <Route path="/ai-analytics" element={<AIAnalytics />} />
            <Route path="/volunteers"   element={<Volunteers />}  />
            <Route path="/matching"     element={<Matching />}    />
            <Route path="/assignments"  element={<AssignmentsPage />} />
            <Route path="/profile"      element={<ProfilePage />} />
            <Route path="*"             element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   ROOT — handles auth state + role-based routing
══════════════════════════════════════════════════════ */
export default function App() {
  const [user,        setUser]        = useState(null);   // { ...firebaseUser, role, dbUser, token }
  const [authLoading, setAuthLoading] = useState(true);

  /* ── Rehydrate from stored JWT on refresh ── */
  useEffect(() => {
    const rehydrate = async () => {
      const token = getToken();
      if (token) {
        try {
          const res = await authMe();
          // authMe returns { user, role }
          // We still need the Firebase user, so we wait for onAuthStateChanged
          // Store role hint so we can combine with firebase user
          sessionStorage.setItem("seva_role", res.data.role);
        } catch {
          clearToken();
        }
      }
    };
    rehydrate();
  }, []);

  /* ── Firebase auth state listener ── */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        // Restore role from session if available (after page refresh)
        const savedRole = sessionStorage.getItem("seva_role");
        setUser({ ...firebaseUser, role: savedRole || null });
      } else {
        setUser(null);
        clearToken();
        sessionStorage.removeItem("seva_role");
      }
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  const handleLogin = (userData) => {
    // userData: { ...firebaseUser, role, dbUser, token }
    sessionStorage.setItem("seva_role", userData.role);
    setUser(userData);
  };

  const handleLogout = async () => {
    try { await signOut(auth); } catch (_) {}
    clearToken();
    sessionStorage.removeItem("seva_role");
    setUser(null);
  };

  /* ── Loading splash ── */
  if (authLoading) {
    return (
      <div style={{
        height:"100vh", display:"flex", alignItems:"center", justifyContent:"center",
        flexDirection:"column", gap:16, background:"var(--bg)",
      }}>
        <img src="/Sevasetu-logo.png" alt="SevaSetu"
          style={{ width:64, height:64, objectFit:"contain", animation:"pulse-dot 2s ease-in-out infinite" }} />
        <div style={{ fontSize:".85rem", color:"var(--text-muted)", fontWeight:500 }}>
          Loading SevaSetu...
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* ── Volunteer dashboard (protected) ── */}
        <Route path="/volunteer/*" element={
          (user?.role === "volunteer" && getToken())
            ? <VolunteerDashboard user={user} onLogout={handleLogout} />
            : <Navigate to="/auth" replace />
        } />

        {/* ── NGO admin (protected) ── */}
        <Route path="/*" element={
          (!user || !getToken())
            ? <Navigate to="/auth" replace />
            : user.role === "volunteer"
              ? <Navigate to="/volunteer/dashboard" replace />
              : <AppShell user={user} onLogout={handleLogout} />
        } />

        {/* ── Unified auth page ── */}
        <Route path="/auth" element={
          (!user || !getToken())
            ? <AuthPage onLogin={handleLogin} />
            : user.role === "volunteer"
              ? <Navigate to="/volunteer/dashboard" replace />
              : <Navigate to="/" replace />
        } />

        <Route path="/complete-profile" element={<CompleteProfile onLogin={handleLogin} />} />
      </Routes>
    </BrowserRouter>
  );
}
