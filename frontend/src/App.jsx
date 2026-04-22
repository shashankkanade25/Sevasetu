import { BrowserRouter, Routes, Route, NavLink, useLocation, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "./firebase";
import Dashboard      from "./pages/Dashboard";
import Volunteers     from "./pages/Volunteers";
import Matching       from "./pages/Matching";
import Assignments    from "./pages/Assignments";
import Upload         from "./pages/Upload";
import Insights       from "./pages/Insights";
import AIAnalytics    from "./pages/AIAnalytics";
import AuthPage       from "./pages/AuthPage";
import VolunteerDashboard from "./pages/VolunteerDashboard";
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
                <div className="notif-dropdown animate-in" onClick={e => e.stopPropagation()}>
                  <div className="notif-header">
                    <span>Notifications</span>
                    {unreadCount > 0 && <span className="notif-count">{unreadCount} new</span>}
                  </div>
                  <div className="notif-body">
                    {notifications.length === 0
                      ? <div className="notif-empty">No new alerts</div>
                      : notifications.map(n => (
                          <div key={n._id} className={`notif-item ${!n.read?"unread":""}`}
                            onClick={() => markRead(n._id)}>
                            <div className={`notif-icon ${n.type}`}>
                              <Icon name={n.type==="alert"?"warning":n.type==="success"?"check_circle":"info"} />
                            </div>
                            <div className="notif-content">
                              <div className="notif-title">{n.title}</div>
                              <div className="notif-msg">{n.message}</div>
                              <div className="notif-time">
                                {new Date(n.createdAt).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}
                              </div>
                            </div>
                            {!n.read && <div className="unread-pulse" />}
                          </div>
                        ))
                    }
                  </div>
                </div>
              )}
            </div>
            <div className="top-bar-user" onClick={handleSignOut} title="Click to sign out">
              <div className="avatar">{initials}</div>
              <div className="top-bar-user-info">
                <span className="top-bar-user-name">{displayName}</span>
                <span className="top-bar-user-role">NGO Manager</span>
              </div>
            </div>
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
            <Route path="/assignments"  element={<Assignments />} />
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
      </Routes>
    </BrowserRouter>
  );
}
