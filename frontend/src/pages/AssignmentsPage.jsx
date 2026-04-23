import { useEffect, useState } from "react";
import { getIssues, getVolunteers, getAssignments, matchVolunteers, assignVolunteer, updateAssignmentStatus } from "../api";
import usePolling from "../hooks/usePolling";

function getTier(s) { if (s >= 75) return "urgent"; if (s >= 50) return "high"; if (s >= 25) return "medium"; return "low"; }
function getTierLabel(s) { if (s >= 75) return "URGENT"; if (s >= 50) return "HIGH"; if (s >= 25) return "MEDIUM"; return "LOW"; }

export default function AssignmentsPage() {
  const [issues, setIssues] = useState([]);
  const [volunteersMap, setVolunteersMap] = useState({});
  const [statusFilter, setStatusFilter] = useState("All");
  
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedIssueId, setSelectedIssueId] = useState(null);
  const [matches, setMatches] = useState([]);
  const [matching, setMatching] = useState(false);
  const [assigning, setAssigning] = useState(null);
  const [toast, setToast] = useState(null);

  const { data, loading: aLoading, refresh: refreshAssignments } = usePolling(getAssignments);
  const assignments = data || [];

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchBaseData = async () => {
    try {
      const [iRes, vRes] = await Promise.all([getIssues(), getVolunteers()]);
      setIssues(iRes.data);
      const vMap = {};
      vRes.data.forEach(v => vMap[v._id] = v);
      setVolunteersMap(vMap);
    } catch(err) {
      console.error("Failed to fetch base data");
    }
  };

  useEffect(() => {
    fetchBaseData();
  }, []);

  const handleStatusUpdate = async (assignmentId, newStatus) => {
    try {
      await updateAssignmentStatus(assignmentId, { status: newStatus });
      refreshAssignments();
      showToast(`Status updated to ${newStatus}`);
    } catch {
      showToast("Update failed", "error");
    }
  };

  const openAssignModal = async (issueId) => {
    setSelectedIssueId(issueId);
    setModalOpen(true);
    setMatching(true);
    setMatches([]);
    try {
      const res = await matchVolunteers(issueId);
      setMatches(res.data);
    } catch {
      showToast("Matching failed", "error");
    } finally {
      setMatching(false);
    }
  };

  const handleAssign = async (volunteerId) => {
    setAssigning(volunteerId);
    try {
      await assignVolunteer({ issueId: selectedIssueId, volunteerId });
      showToast("Volunteer assigned successfully!");
      setModalOpen(false);
      refreshAssignments();
    } catch {
      showToast("Assignment failed", "error");
    } finally {
      setAssigning(null);
    }
  };

  // Combine issues with their assignments
  const assignmentMap = {};
  assignments.forEach(a => assignmentMap[a.issueId] = a);

  const displayList = issues.map(issue => {
    const assignment = assignmentMap[issue._id];
    let status = "Pending";
    if (assignment) {
      if (assignment.status === "assigned") status = "Assigned";
      if (assignment.status === "in_progress") status = "In Progress";
      if (assignment.status === "completed") status = "Completed";
    }
    return {
      issue,
      assignment,
      status
    };
  });

  const filteredList = displayList.filter(item => {
    if (statusFilter === "Active") return item.status === "Assigned" || item.status === "In Progress";
    if (statusFilter === "Completed") return item.status === "Completed";
    return true; // All
  });

  return (
    <div>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <h1>Assignments</h1>
          <p>Track volunteer-to-issue assignments and monitor resolution progress.</p>
        </div>
      </div>

      <div className="card animate-in" style={{ marginTop: 24 }}>
        <div className="card-title" style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", gap: 8, background: "var(--bg-subtle)", padding: 4, borderRadius: 8 }}>
            {["All", "Active", "Completed"].map(tab => (
              <button
                key={tab}
                className={`btn btn-sm ${statusFilter === tab ? "btn-primary" : "btn-outline"}`}
                onClick={() => setStatusFilter(tab)}
                style={{ border: "none", background: statusFilter === tab ? "var(--primary)" : "transparent", color: statusFilter === tab ? "#fff" : "var(--text-secondary)", fontWeight: statusFilter === tab ? 600 : 500 }}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {aLoading && issues.length === 0 && <div style={{ textAlign: "center", padding: 40 }}><div className="spinner"></div></div>}

        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 16 }}>
          {filteredList.map((item) => {
            const { issue, assignment, status } = item;
            const tier = getTier(issue.priorityScore || 0);
            const vol = assignment ? volunteersMap[assignment.volunteerId] : null;
            
            return (
              <div key={issue._id} className="animate-in" style={{
                padding: "18px 20px", background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "12px", position: "relative", overflow: "hidden", boxShadow: "var(--shadow-sm)"
              }}>
                <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, background: tier === "urgent" ? "var(--red-500)" : tier === "high" ? "var(--orange-500)" : "var(--blue-500)" }}></div>
                
                <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ fontWeight: 700, fontSize: "1rem" }}>{issue.title || "Loading..."}</div>
                    <div style={{ display: "flex", gap: 10, marginTop: 4, fontSize: ".8rem", color: "var(--text-secondary)" }}>
                      <span>📍 {issue.location}</span>
                    </div>
                  </div>

                  <div style={{ minWidth: 160 }}>
                    {vol ? (
                      <div>
                        <div style={{ fontWeight: 600, fontSize: ".85rem" }}>{vol.name}</div>
                        <div style={{ fontSize: ".75rem", color: "var(--text-muted)", marginTop: 2 }}>
                          {vol.skills?.join(", ") || "General"}
                        </div>
                      </div>
                    ) : (
                      <span style={{ fontSize: ".85rem", color: "var(--text-muted)", fontStyle: "italic" }}>Unassigned</span>
                    )}
                  </div>

                  <div className={`status-badge ${status === "Pending" ? "warning" : status === "Completed" ? "success" : "primary"}`} style={{ minWidth: 100, textAlign: "center" }}>
                    {status}
                  </div>

                  <div style={{ display: "flex", gap: 8, minWidth: 140, justifyContent: "flex-end" }}>
                    {status === "Pending" && (
                      <button className="btn btn-sm btn-primary" onClick={() => openAssignModal(issue._id)}>Assign Volunteer</button>
                    )}
                    {status === "Assigned" && (
                      <button className="btn btn-sm btn-outline" onClick={() => handleStatusUpdate(assignment._id, "in_progress")}>Start</button>
                    )}
                    {status === "In Progress" && (
                      <button className="btn btn-sm btn-primary" onClick={() => handleStatusUpdate(assignment._id, "completed")}>Mark Complete</button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          
          {filteredList.length === 0 && !aLoading && (
            <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>
              No assignments found for this filter.
            </div>
          )}
        </div>
      </div>

      {/* Assign Volunteer Modal */}
      {modalOpen && (
        <div className="modal-overlay" style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setModalOpen(false)}>
          <div className="modal-content animate-in" style={{ background: "var(--bg-card)", padding: 24, borderRadius: 16, width: "100%", maxWidth: 600, maxHeight: "80vh", overflowY: "auto" }} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: "1.2rem", margin: 0 }}>Assign Volunteer</h2>
              <button style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.2rem", color: "var(--text-muted)" }} onClick={() => setModalOpen(false)}>×</button>
            </div>
            
            {matching ? (
              <div style={{ textAlign: "center", padding: 40 }}><div className="spinner"></div><div style={{ marginTop: 12, color: "var(--text-muted)" }}>Finding recommended volunteers...</div></div>
            ) : matches.length === 0 ? (
              <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>No volunteers match this issue.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {matches.map(m => (
                  <div key={m.volunteer._id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 16, border: "1px solid var(--border)", borderRadius: 12, background: "var(--bg)" }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "1rem" }}>{m.volunteer.name}</div>
                      <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: 4 }}>Skills: {m.volunteer.skills?.join(", ") || "General"}</div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                      <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Match</div>
                        <div style={{ fontWeight: 700, color: m.score >= 50 ? "var(--emerald-500)" : "var(--amber-500)", fontSize: "1.1rem" }}>{m.score}%</div>
                      </div>
                      <button 
                        className="btn btn-primary btn-sm" 
                        disabled={assigning === m.volunteer._id}
                        onClick={() => handleAssign(m.volunteer._id)}
                      >
                        {assigning === m.volunteer._id ? "Assigning..." : "Assign"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {toast && <div className={`toast ${toast.type}`}>{toast.msg}</div>}
    </div>
  );
}
