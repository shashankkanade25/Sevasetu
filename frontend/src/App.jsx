import { BrowserRouter, Routes, Route, NavLink } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Volunteers from "./pages/Volunteers";
import Matching from "./pages/Matching";
import Assignments from "./pages/Assignments";
import Upload from "./pages/Upload";
import Insights from "./pages/Insights";
import "./App.css";

function Icon({ name, filled }) {
  return <span className={`material-symbols-outlined${filled ? ' icon-filled' : ''}`}>{name}</span>;
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <aside className="sidebar">
          <div className="sidebar-brand">
            <div className="brand-logo">
              <Icon name="hub" />
            </div>
            <span className="brand-name">Sevasetu</span>
          </div>

          <nav className="sidebar-nav">
            <NavLink to="/" end className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
              <Icon name="dashboard" /> Dashboard
            </NavLink>
            <NavLink to="/upload" className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
              <Icon name="upload_file" /> Data Upload
            </NavLink>
            <NavLink to="/insights" className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
              <Icon name="insights" /> Insights
            </NavLink>
            <NavLink to="/matching" className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
              <Icon name="recommend" /> Matching
            </NavLink>
            <NavLink to="/volunteers" className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
              <Icon name="group" /> Volunteers
            </NavLink>
            <NavLink to="/assignments" className={({ isActive }) => `nav-link${isActive ? " active" : ""}`}>
              <Icon name="assignment" /> Assignments
            </NavLink>
          </nav>

          <div className="sidebar-footer">
            <span className="status-dot"></span> System Online
          </div>
        </aside>

        <main className="main-content">
          <div className="top-bar">
            <div></div>
            <div className="top-bar-right">
              <span>Admin</span>
              <div className="avatar">A</div>
            </div>
          </div>
          <Routes>
            <Route path="/"            element={<Dashboard />} />
            <Route path="/upload"      element={<Upload />} />
            <Route path="/insights"    element={<Insights />} />
            <Route path="/volunteers"  element={<Volunteers />} />
            <Route path="/matching"    element={<Matching />} />
            <Route path="/assignments" element={<Assignments />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
