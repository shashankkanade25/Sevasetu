import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function HeaderDropdown({ user, onLogout }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const displayName = user?.displayName || user?.email?.split("@")[0] || "Admin";
  const initials = displayName.charAt(0).toUpperCase();

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMenuClick = (action) => {
    setIsOpen(false);
    if (action === "profile") {
      navigate("/profile");
    } else if (action === "logout") {
      onLogout();
    }
  };

  return (
    <div className="top-bar-user" ref={dropdownRef} onClick={() => setIsOpen(!isOpen)} style={{ position: "relative", cursor: "pointer" }}>
      <div className="avatar">{initials}</div>
      <div className="top-bar-user-info">
        <span className="top-bar-user-name">{displayName}</span>
        <span className="top-bar-user-role">NGO Manager</span>
      </div>
      <span className="material-symbols-outlined" style={{ color: "var(--text-muted)", marginLeft: 4 }}>
        expand_more
      </span>

      {isOpen && (
        <div className="notif-dropdown animate-in" style={{
          position: "absolute", top: "100%", right: 0, marginTop: "8px",
          background: "var(--bg-card)", border: "1px solid var(--border)",
          borderRadius: "var(--radius)", boxShadow: "var(--shadow-md)",
          minWidth: "160px", zIndex: 100, padding: "8px 0"
        }} onClick={e => e.stopPropagation()}>
          <div className="notif-item" onClick={() => handleMenuClick("profile")} style={{ padding: "10px 16px", cursor: "pointer" }}>
            <span className="material-symbols-outlined" style={{ fontSize: "1.2rem", marginRight: "10px" }}>person</span>
            <span style={{ fontSize: "0.9rem", fontWeight: 500 }}>Profile</span>
          </div>
          <div className="notif-item" onClick={() => handleMenuClick("logout")} style={{ padding: "10px 16px", cursor: "pointer", color: "var(--red-500)" }}>
            <span className="material-symbols-outlined" style={{ fontSize: "1.2rem", marginRight: "10px" }}>logout</span>
            <span style={{ fontSize: "0.9rem", fontWeight: 500 }}>Logout</span>
          </div>
        </div>
      )}
    </div>
  );
}
