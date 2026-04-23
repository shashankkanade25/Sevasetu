import { useState, useEffect } from "react";
import { authMe, updateProfile, getIssues, getVolunteers, getAssignments } from "../api";
import { useNavigate } from "react-router-dom";

export default function ProfilePage() {
  const [profile, setProfile] = useState({
    name: "",
    email: "",
    contactPerson: "",
    location: "",
    focusArea: ""
  });
  const [stats, setStats] = useState({
    totalIssues: 0,
    volunteersConnected: 0,
    activeAssignments: 0
  });
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const navigate = useNavigate();

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const fetchProfileAndStats = async () => {
      try {
        const [authRes, issuesRes, volsRes, assignRes] = await Promise.all([
          authMe(),
          getIssues(),
          getVolunteers(),
          getAssignments()
        ]);
        
        const user = authRes.data.user || authRes.data;
        setProfile({
          name: user.name || user.organizationName || "",
          email: user.email || "",
          contactPerson: user.contactPerson || "",
          location: user.location || "",
          focusArea: user.focusArea || ""
        });

        const assignments = assignRes.data || [];
        setStats({
          totalIssues: (issuesRes.data || []).length,
          volunteersConnected: (volsRes.data || []).length,
          activeAssignments: assignments.filter(a => a.status !== "completed").length
        });
      } catch (err) {
        showToast("Failed to load profile data", "error");
      } finally {
        setLoading(false);
      }
    };
    fetchProfileAndStats();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile(profile);
      setIsEditing(false);
      showToast("Profile updated successfully");
    } catch (err) {
      showToast("Failed to update profile", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ padding: 40, textAlign: "center" }}><div className="spinner"></div></div>;
  }

  return (
    <div>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <h1>NGO Profile</h1>
          <p>Manage your organization details and view operational statistics.</p>
        </div>
      </div>

      <div className="stats-row">
        <div className="stat-card primary-accent animate-in">
          <div className="stat-icon primary"><span className="material-symbols-outlined">report</span></div>
          <span className="stat-label">Total Issues</span>
          <span className="stat-value primary">{stats.totalIssues}</span>
        </div>
        <div className="stat-card success-accent animate-in" style={{ animationDelay: "0.1s" }}>
          <div className="stat-icon success"><span className="material-symbols-outlined">group</span></div>
          <span className="stat-label">Volunteers Connected</span>
          <span className="stat-value success">{stats.volunteersConnected}</span>
        </div>
        <div className="stat-card warning-accent animate-in" style={{ animationDelay: "0.2s" }}>
          <div className="stat-icon warning"><span className="material-symbols-outlined">assignment_ind</span></div>
          <span className="stat-label">Active Assignments</span>
          <span className="stat-value warning">{stats.activeAssignments}</span>
        </div>
      </div>

      <div className="card animate-in" style={{ maxWidth: 800, margin: "24px 0", animationDelay: "0.3s" }}>
        <div className="card-title" style={{ display: "flex", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="material-symbols-outlined">corporate_fare</span>
            Organization Details
          </div>
          <button 
            className={`btn btn-sm ${isEditing ? "btn-outline" : "btn-primary"}`}
            onClick={() => isEditing ? setIsEditing(false) : setIsEditing(true)}
          >
            {isEditing ? "Cancel" : "Edit Profile"}
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20, marginTop: 16 }}>
          <div className="form-group">
            <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6, display: "block" }}>NGO Name</label>
            <input 
              type="text" 
              className="form-control" 
              value={profile.name} 
              disabled={!isEditing}
              onChange={e => setProfile({...profile, name: e.target.value})}
            />
          </div>
          
          <div className="form-group">
            <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6, display: "block" }}>Email (Readonly)</label>
            <input 
              type="email" 
              className="form-control" 
              value={profile.email} 
              disabled={true}
              style={{ background: "var(--bg-subtle)", color: "var(--text-muted)" }}
            />
          </div>

          <div className="form-group">
            <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6, display: "block" }}>Contact Person</label>
            <input 
              type="text" 
              className="form-control" 
              value={profile.contactPerson} 
              disabled={!isEditing}
              onChange={e => setProfile({...profile, contactPerson: e.target.value})}
            />
          </div>

          <div className="form-group">
            <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6, display: "block" }}>Location</label>
            <input 
              type="text" 
              className="form-control" 
              value={profile.location} 
              disabled={!isEditing}
              onChange={e => setProfile({...profile, location: e.target.value})}
            />
          </div>

          <div className="form-group">
            <label style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6, display: "block" }}>Focus Area</label>
            <input 
              type="text" 
              className="form-control" 
              value={profile.focusArea} 
              disabled={!isEditing}
              onChange={e => setProfile({...profile, focusArea: e.target.value})}
            />
          </div>
        </div>

        {isEditing && (
          <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end" }}>
            <button 
              className="btn btn-primary" 
              onClick={handleSave}
              disabled={saving}
              style={{ minWidth: 120 }}
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        )}
      </div>

      {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}
    </div>
  );
}
