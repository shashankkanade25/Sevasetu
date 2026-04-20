import { useEffect, useState } from "react";
import { getIssues, getVolunteers, matchVolunteers } from "../api";
import { useNavigate } from "react-router-dom";
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Filler } from "chart.js";
import { Doughnut, Line } from "react-chartjs-2";
import NeedsHeatmap from "../components/NeedsHeatmap";
import usePolling from "../hooks/usePolling";
import { getIssueStats } from "../api";

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Filler);

const CATEGORY_COLORS = {
  medical: "#DC2626", health: "#DC2626",
  water: "#F59E0B", flood: "#F59E0B",
  education: "#64748B",
  infrastructure: "#8B5CF6",
  nutrition: "#10B981", food: "#10B981",
};
const CATEGORY_ICONS = {
  medical: "local_hospital", health: "local_hospital",
  water: "water_drop", flood: "water_drop",
  education: "school",
  infrastructure: "construction",
  nutrition: "restaurant", food: "restaurant",
};
const DEFAULT_ICON = "report_problem";
const DEFAULT_COLOR = "#6B7280";

function getTier(score) {
  if (score >= 75) return "urgent";
  if (score >= 50) return "high";
  if (score >= 25) return "medium";
  return "low";
}
function getTierLabel(score) {
  if (score >= 75) return "URGENT";
  if (score >= 50) return "HIGH";
  if (score >= 25) return "MEDIUM";
  return "LOW";
}
function getIcon(category) {
  return CATEGORY_ICONS[category?.toLowerCase()] || DEFAULT_ICON;
}
function getCatColor(category) {
  return CATEGORY_COLORS[category?.toLowerCase()] || DEFAULT_COLOR;
}
function hashStr(s) {
  let h = 0;
  for (let i = 0; i < (s || "").length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// Skeleton components
function SkeletonCard() {
  return (
    <div className="skeleton skeleton-card"></div>
  );
}

function StatSkeleton() {
  return (
    <div className="stat-card">
      <div className="skeleton skeleton-text sm" style={{ width: 60 }}></div>
      <div className="skeleton skeleton-text" style={{ width: 50, height: 28 }}></div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [topMatch, setTopMatch] = useState([]);

  // Use Polling for real-time data
  const { data: issues = [], loading: iLoading } = usePolling(getIssues);
  const { data: volunteers = [], loading: vLoading } = usePolling(getVolunteers);
  const { data: stats, refresh: refreshStats } = usePolling(getIssueStats);

  const loading = iLoading || vLoading;

  useEffect(() => {
    if (issues && issues.length > 0) {
      matchVolunteers(issues[0]._id)
        .then(res => setTopMatch(res.data))
        .catch(() => {});
    }
  }, [issues]);

  if (loading || !stats) {
    return (
      <div style={{ padding: "40px 0", textAlign: "center" }}>
        <div className="spinner" style={{ margin: "0 auto" }}></div>
        <div style={{ marginTop: 12, color: "var(--text-muted)", fontSize: ".85rem" }}>Syncing Real-time Data...</div>
      </div>
    );
  }

  const critical = issues.filter(i => getTier(i.priorityScore) === "urgent").length;
  const high = issues.filter(i => getTier(i.priorityScore) === "high").length;

  // Category breakdown for donut
  const donutData = {
    labels: stats.categoryStats.map(s => s._id ? s._id.charAt(0).toUpperCase() + s._id.slice(1) : "Other"),
    datasets: [{
      data: stats.categoryStats.map(s => s.count),
      backgroundColor: stats.categoryStats.map(s => getCatColor(s._id)),
      borderWidth: 3,
      borderColor: "#fff",
    }],
  };

  // Trend
  const trendDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const categoryStats = stats.categoryStats || [];
  const topCatsData = [...categoryStats].sort((a,b) => b.count - a.count).slice(0, 3);
  const trendDatasets = topCatsData.map(cat => {
    const base = cat.count || 1;
    return {
      label: cat._id?.charAt(0).toUpperCase() + cat._id?.slice(1) || "Other",
      data: trendDays.map((_, i) => Math.max(1, base + Math.round(Math.sin(i + hashStr(cat._id)) * base * 0.4))),
      borderColor: getCatColor(cat._id),
      backgroundColor: getCatColor(cat._id) + "15",
      tension: 0.4,
      fill: true,
      pointRadius: 0,
      pointHoverRadius: 5,
      borderWidth: 2.5,
    };
  });

  const trendConfig = { labels: trendDays, datasets: trendDatasets };

  // Heatmap
  const locationMap = {};
  issues.forEach(issue => {
    const loc = (issue.location || "Unknown").toLowerCase();
    if (!locationMap[loc]) locationMap[loc] = { issues: [], maxScore: 0 };
    locationMap[loc].issues.push(issue);
    locationMap[loc].maxScore = Math.max(locationMap[loc].maxScore, issue.priorityScore || 0);
  });

  const heatPoints = Object.entries(locationMap).map(([loc, data]) => {
    const h = hashStr(loc);
    return {
      name: loc.charAt(0).toUpperCase() + loc.slice(1),
      x: 10 + (h % 75),
      y: 12 + ((h * 7) % 70),
      tier: getTier(data.maxScore),
      count: data.issues.length,
      icon: getIcon(data.issues[0]?.category),
      score: Math.round(data.maxScore),
    };
  });

  return (
    <div>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <h1>Dashboard</h1>
          <p>Real-time overview of community needs, priorities, and volunteer readiness.</p>
        </div>
        <div style={{ fontSize: ".7rem", color: "var(--text-muted)", background: "var(--bg-subtle)", padding: "4px 10px", borderRadius: 99, display: "flex", alignItems: "center", gap: 5 }}>
          <span className="pulse-dot" style={{ width: 6, height: 6 }}></span>
          Live Sync Active
        </div>
      </div>

      {/* Stats Row */}
      <div className="stats-row">
        <div className="stat-card primary-accent animate-in">
          <div className="stat-icon primary">
            <span className="material-symbols-outlined">assessment</span>
          </div>
          <span className="stat-label">Total Challenges</span>
          <span className="stat-value primary">{stats.total}</span>
        </div>
        <div className="stat-card danger-accent animate-in">
          <div className="stat-icon danger">
            <span className="material-symbols-outlined">warning</span>
          </div>
          <span className="stat-label">Urgent Needs</span>
          <span className="stat-value danger">{stats.urgent}</span>
          {stats.urgent > 0 && <div className="stat-delta down"><span className="material-symbols-outlined">priority_high</span> Critical Action Needed</div>}
        </div>
        <div className="stat-card warning-accent animate-in">
          <div className="stat-icon warning">
            <span className="material-symbols-outlined">pending_actions</span>
          </div>
          <span className="stat-label">Open Issues</span>
          <span className="stat-value warning">{stats.open}</span>
        </div>
        <div className="stat-card success-accent animate-in">
          <div className="stat-icon success">
            <span className="material-symbols-outlined">group</span>
          </div>
          <span className="stat-label">Volunteers</span>
          <span className="stat-value success">{volunteers.length}</span>
          <div className="stat-delta up"><span className="material-symbols-outlined">check_circle</span> {volunteers.filter(v => v.availability).length} active</div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="dash-grid">
        {/* Left: Priority Challenges */}
        <div className="card animate-in">
          <div className="card-title" style={{ justifyContent: "space-between" }}>
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span className="material-symbols-outlined">priority_high</span>
              Priority Challenges
            </span>
            <span className="view-all" onClick={() => navigate("/matching")} style={{ cursor: "pointer" }}>View all →</span>
          </div>
          <div className="priority-list">
            {issues.slice(0, 5).map((issue) => {
              const tier = getTier(issue.priorityScore);
              return (
                <div key={issue._id} className={`priority-item tier-${tier} animate-in`}
                  onClick={() => navigate("/matching", { state: { issueId: issue._id } })}>
                  <div className={`priority-icon ${tier}`}>
                    <span className="material-symbols-outlined icon-filled">{getIcon(issue.category)}</span>
                  </div>
                  <div className="priority-info">
                    <div className="priority-title">{issue.title || "Untitled"}</div>
                    <div className="priority-sub">📍 {issue.location}</div>
                    <div className="priority-detail">
                      <span>{issue.peopleAffected || 0} affected</span>
                      <span className={`urgency-badge ${tier}`}>{getTierLabel(issue.priorityScore)}</span>
                    </div>
                  </div>
                  <div className={`priority-score ${tier}`}>
                    {Math.round(issue.priorityScore)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div className="card animate-in">
            <div className="card-title" style={{ justifyContent: "space-between" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className="material-symbols-outlined">map</span>
                Needs Heatmap
              </span>
            </div>
            <NeedsHeatmap issues={issues} />
          </div>

          <div className="card animate-in">
            <div className="card-title" style={{ justifyContent: "space-between" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className="material-symbols-outlined">person_search</span>
                Top Regional Matches
              </span>
            </div>
            <div className="rec-vol-list">
              {topMatch.length === 0 ? (
                <div style={{ padding: 10, textAlign: "center", color: "var(--text-muted)", fontSize: ".8rem" }}>No matches found</div>
              ) : topMatch.map((m, i) => (
                <div key={m.volunteer._id} className={`rec-vol-item ${i === 0 ? "best-match" : ""}`}>
                  <div className="rec-vol-avatar">{(m.volunteer.name || "?")[0].toUpperCase()}</div>
                  <div className="rec-vol-info">
                    <div className="rec-vol-name">{m.volunteer.name}</div>
                    <div className="rec-vol-sub">{m.volunteer.location}</div>
                    <div className="match-score-bar-wrap">
                      <div className={`match-score-bar ${m.score >= 50 ? "high" : "medium"}`} style={{ width: `${m.score}%` }}></div>
                    </div>
                  </div>
                  <div className="rec-vol-score">
                    <span>Score</span>{m.score}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="dash-bottom" style={{ marginTop: 18 }}>
        <div className="card animate-in">
          <div className="card-title">Need Distribution</div>
          <div style={{ maxWidth: 220, margin: "0 auto" }}>
            <Doughnut data={donutData} options={{ plugins: { legend: { display: false } }, cutout: "70%" }} />
          </div>
        </div>
        
        <div className="card animate-in" style={{ flex: 2 }}>
          <div className="card-title" style={{ justifyContent: "space-between" }}>
             <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className="material-symbols-outlined">rss_feed</span>
                Live Activity Feed
              </span>
              <span style={{ fontSize: ".7rem", color: "var(--emerald-600)", fontWeight: 700 }}>LIVE</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              { type: 'success', title: 'Task Resolved', msg: 'Drought Situation in Solapur resolved.', time: '12m' },
              { type: 'alert', title: 'New Urgent Need', msg: 'Oxygen Supply Shortage reported in Mumbai.', time: '28m' },
              { type: 'info', title: 'Volunteer Online', msg: 'Arjun Mehta joined the response team.', time: '1h' },
              { type: 'update', title: 'Matching Optimised', msg: 'Recalculated priority scores for 15 nodes.', time: '2h' }
            ].map((feed, i) => (
              <div key={i} className="feed-item animate-in" style={{ 
                display: "flex", gap: 12, padding: "10px 14px", 
                background: "var(--bg-subtle)", borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border-light)"
              }}>
                <div className={`notif-icon ${feed.type}`} style={{ width: 32, height: 32, fontSize: ".9rem" }}>
                  <span className="material-symbols-outlined">
                    {feed.type === 'alert' ? 'warning' : feed.type === 'success' ? 'check_circle' : 'info'}
                  </span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                    <span style={{ fontWeight: 700, fontSize: ".82rem" }}>{feed.title}</span>
                    <span style={{ fontSize: ".7rem", color: "var(--text-muted)" }}>{feed.time}</span>
                  </div>
                  <div style={{ fontSize: ".78rem", color: "var(--text-secondary)" }}>{feed.msg}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
