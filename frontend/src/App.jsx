import { BrowserRouter, Routes, Route, NavLink, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "./firebase";
import Dashboard from "./pages/Dashboard";
import Volunteers from "./pages/Volunteers";
import Matching from "./pages/Matching";
import Assignments from "./pages/Assignments";
import Upload from "./pages/Upload";
import Insights from "./pages/Insights";
import Login from "./pages/Login";
import "./App.css";

function Icon({ name }) {
  return <span className="material-symbols-outlined">{name}</span>;
}

const NAV_ITEMS = [
  { to: "/", icon: "dashboard", label: "Dashboard", end: true },
  { to: "/upload", icon: "cloud_upload", label: "Data Upload" },
  { to: "/insights", icon: "insights", label: "Insights" },
  { to: "/matching", icon: "hub", label: "Matching" },
  { to: "/volunteers", icon: "group", label: "Volunteers" },
  { to: "/assignments", icon: "assignment_turned_in", label: "Assignments" },
];

const PAGE_TITLES = {
  "/": "Dashboard",
  "/upload": "Data Upload",
  "/insights": "Insights",
  "/matching": "Matching & Allocation",
  "/volunteers": "Volunteers",
  "/assignments": "Assignments",
};

function AppShell({ user }) {
  const location = useLocation();
  const currentPage = PAGE_TITLES[location.pathname] || "Dashboard";

  const displayName = user?.displayName || user?.email?.split("@")[0] || "Admin";
  const initials = displayName.charAt(0).toUpperCase();
  const photoURL = user?.photoURL;

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error("Sign out error:", err);
    }
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <img src="/Sevasetu-logo.png" alt="SevaSetu Logo" style={{
            width: 40, height: 40, objectFit: "contain",
          }} />
          <span className="brand-name">Seva<span>Setu</span></span>
        </div>

        <nav className="sidebar-nav">
          {NAV_ITEMS.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <span className="status-dot"></span>
          System Online
        </div>
      </aside>

      <main className="main-content">
        <div className="top-bar">
          <div className="top-bar-left">
            <Icon name="home" />
            <span>/</span>
            <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{currentPage}</span>
          </div>
          <div className="top-bar-right">
            <button className="top-bar-btn" title="Search (⌘K)">
              <Icon name="search" />
            </button>
            <button className="top-bar-btn" title="Notifications">
              <Icon name="notifications" />
              <span className="notification-dot"></span>
            </button>
            <div className="top-bar-user" onClick={handleSignOut} title="Click to sign out">
              {photoURL ? (
                <img src={photoURL} alt={displayName} style={{
                  width: 36, height: 36, borderRadius: "50%", objectFit: "cover",
                }} />
              ) : (
                <div className="avatar">{initials}</div>
              )}
              <div className="top-bar-user-info">
                <span className="top-bar-user-name">{displayName}</span>
                <span className="top-bar-user-role">NGO Manager</span>
              </div>
            </div>
          </div>
        </div>
        <div className="main-inner">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/upload" element={<Upload />} />
            <Route path="/insights" element={<Insights />} />
            <Route path="/volunteers" element={<Volunteers />} />
            <Route path="/matching" element={<Matching />} />
            <Route path="/assignments" element={<Assignments />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Show loading spinner while checking auth state
  if (authLoading) {
    return (
      <div style={{
        height: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        flexDirection: "column", gap: 16, background: "var(--bg)",
      }}>
        <img src="/Sevasetu-logo.png" alt="SevaSetu" style={{ width: 64, height: 64, objectFit: "contain", animation: "pulse-dot 2s ease-in-out infinite" }} />
        <div style={{ fontSize: ".85rem", color: "var(--text-muted)", fontWeight: 500 }}>Loading SevaSetu...</div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      {!user ? (
        <Login onLogin={(u) => setUser(u)} />
      ) : (
        <AppShell user={user} />
      )}
    </BrowserRouter>
  );
}
