import { useEffect, useState } from "react";
import { getIssues, getVolunteers, matchVolunteers } from "../api";
import { useNavigate } from "react-router-dom";
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Filler } from "chart.js";
import { Doughnut, Line } from "react-chartjs-2";

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
  if (score >= 7) return "urgent";
  if (score >= 4) return "high";
  if (score >= 2) return "medium";
  return "low";
}
function getTierLabel(score) {
  if (score >= 7) return "URGENT";
  if (score >= 4) return "HIGH";
  if (score >= 2) return "MEDIUM";
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
  const [issues, setIssues] = useState([]);
  const [volunteers, setVolunteers] = useState([]);
  const [topMatch, setTopMatch] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([getIssues(), getVolunteers()])
      .then(([iRes, vRes]) => {
        setIssues(iRes.data);
        setVolunteers(vRes.data);
        if (iRes.data.length > 0) {
          matchVolunteers(iRes.data[0]._id)
            .then(res => setTopMatch(res.data))
            .catch(() => {});
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div>
        <div className="page-header">
          <div className="skeleton skeleton-text" style={{ width: 200, height: 28 }}></div>
          <div className="skeleton skeleton-text" style={{ width: 320, height: 14, marginTop: 8 }}></div>
        </div>
        <div className="stats-row">
          <StatSkeleton /><StatSkeleton /><StatSkeleton /><StatSkeleton />
        </div>
        <div className="dash-grid">
          <div className="card"><SkeletonCard /><SkeletonCard /><SkeletonCard /></div>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div className="card"><div className="skeleton" style={{ height: 200 }}></div></div>
          </div>
        </div>
      </div>
    );
  }

  const critical = issues.filter(i => getTier(i.priorityScore) === "urgent").length;
  const high = issues.filter(i => getTier(i.priorityScore) === "high").length;

  // Category breakdown for donut
  const catCounts = {};
  issues.forEach(i => {
    const c = (i.category || "other").toLowerCase();
    catCounts[c] = (catCounts[c] || 0) + 1;
  });
  const catLabels = Object.keys(catCounts);
  const catData = Object.values(catCounts);
  const catColors = catLabels.map(c => getCatColor(c));

  const donutData = {
    labels: catLabels.map(l => l.charAt(0).toUpperCase() + l.slice(1)),
    datasets: [{
      data: catData,
      backgroundColor: catColors,
      borderWidth: 3,
      borderColor: "#fff",
      hoverBorderWidth: 0,
    }],
  };

  // Trend
  const trendDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const topCats = catLabels.slice(0, 3);
  const trendDatasets = topCats.map(cat => {
    const base = catCounts[cat] || 1;
    return {
      label: cat.charAt(0).toUpperCase() + cat.slice(1),
      data: trendDays.map((_, i) => Math.max(1, base + Math.round(Math.sin(i + hashStr(cat)) * base * 0.4))),
      borderColor: getCatColor(cat),
      backgroundColor: getCatColor(cat) + "15",
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
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Real-time overview of community needs, priorities, and volunteer readiness.</p>
      </div>

      {/* Stats Row */}
      <div className="stats-row">
        <div className="stat-card primary-accent animate-in">
          <div className="stat-icon primary">
            <span className="material-symbols-outlined">assessment</span>
          </div>
          <span className="stat-label">Total Challenges</span>
          <span className="stat-value primary">{issues.length}</span>
        </div>
        <div className="stat-card danger-accent animate-in">
          <div className="stat-icon danger">
            <span className="material-symbols-outlined">warning</span>
          </div>
          <span className="stat-label">Urgent</span>
          <span className="stat-value danger">{critical}</span>
          {critical > 0 && <div className="stat-delta down"><span className="material-symbols-outlined">priority_high</span> Needs immediate action</div>}
        </div>
        <div className="stat-card warning-accent animate-in">
          <div className="stat-icon warning">
            <span className="material-symbols-outlined">trending_up</span>
          </div>
          <span className="stat-label">High Priority</span>
          <span className="stat-value warning">{high}</span>
        </div>
        <div className="stat-card success-accent animate-in">
          <div className="stat-icon success">
            <span className="material-symbols-outlined">group</span>
          </div>
          <span className="stat-label">Volunteers</span>
          <span className="stat-value success">{volunteers.length}</span>
          <div className="stat-delta up"><span className="material-symbols-outlined">check_circle</span> {volunteers.filter(v => v.availability).length} available</div>
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
            <span className="view-all" onClick={() => navigate("/insights")}>View all →</span>
          </div>
          {issues.length === 0 ? (
            <div className="empty">
              <span className="material-symbols-outlined">inbox</span>
              <div className="empty-text">No issues yet.</div>
              <div className="empty-action">
                <button className="btn btn-primary btn-sm" onClick={() => navigate("/upload")}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>cloud_upload</span>
                  Upload Data
                </button>
              </div>
            </div>
          ) : (
            <div className="priority-list">
              {issues.slice(0, 5).map((issue, idx) => {
                const tier = getTier(issue.priorityScore);
                return (
                  <div key={issue._id} className={`priority-item tier-${tier} animate-in`}
                    onClick={() => navigate("/matching", { state: { issueId: issue._id } })}>
                    <div className={`priority-icon ${tier}`}>
                      <span className="material-symbols-outlined icon-filled">{getIcon(issue.category)}</span>
                    </div>
                    <div className="priority-info">
                      <div className="priority-title">{issue.title || "Untitled Issue"}</div>
                      <div className="priority-sub">
                        <span className="material-symbols-outlined" style={{ fontSize: 13 }}>location_on</span>
                        {issue.location || "—"}
                      </div>
                      <div className="priority-detail">
                        <span>{issue.peopleAffected || 0} affected</span>
                        {tier === "urgent" && <span className="pulse-dot"></span>}
                        <span className={`urgency-badge ${tier}`}>{getTierLabel(issue.priorityScore)}</span>
                      </div>
                    </div>
                    <div className="priority-actions">
                      <button className="btn btn-xs btn-outline" onClick={(e) => { e.stopPropagation(); navigate("/matching", { state: { issueId: issue._id } }); }}>
                        Match
                      </button>
                    </div>
                    <div className={`priority-score ${tier}`}>
                      {Math.round(issue.priorityScore || 0)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {/* Needs Heatmap */}
          <div className="card animate-in">
            <div className="card-title">
              <span className="material-symbols-outlined">map</span>
              Needs Heatmap
            </div>
            <div className="heatmap-container">
              {/* Map-style background */}
              <svg width="100%" height="100%" style={{ position: "absolute", top: 0, left: 0, opacity: 0.15 }}>
                <defs>
                  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#94a3b8" strokeWidth="0.5"/>
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)"/>
                <line x1="20%" y1="0" x2="20%" y2="100%" stroke="#94a3b8" strokeWidth="1.5" opacity="0.3" />
                <line x1="55%" y1="0" x2="55%" y2="100%" stroke="#94a3b8" strokeWidth="1.5" opacity="0.3" />
                <line x1="80%" y1="0" x2="80%" y2="100%" stroke="#94a3b8" strokeWidth="1" opacity="0.2" />
                <line x1="0" y1="35%" x2="100%" y2="35%" stroke="#94a3b8" strokeWidth="1.5" opacity="0.3" />
                <line x1="0" y1="70%" x2="100%" y2="70%" stroke="#94a3b8" strokeWidth="1" opacity="0.2" />
              </svg>

              {/* Heat glow effects */}
              {heatPoints.filter(pt => pt.tier === "urgent" || pt.tier === "high").map((pt, i) => (
                <div key={`glow-${i}`} className="heat-glow" style={{
                  left: `${pt.x - 8}%`,
                  top: `${pt.y - 10}%`,
                  width: pt.tier === "urgent" ? 80 : 60,
                  height: pt.tier === "urgent" ? 80 : 60,
                  background: pt.tier === "urgent"
                    ? "radial-gradient(circle, rgba(220,38,38,0.2) 0%, transparent 70%)"
                    : "radial-gradient(circle, rgba(245,158,11,0.15) 0%, transparent 70%)",
                }}></div>
              ))}

              {heatPoints.map((pt, i) => {
                const size = pt.tier === "urgent" ? 38 : pt.tier === "high" ? 32 : 26;
                const color = pt.tier === "urgent" ? "var(--red-600)" : pt.tier === "high" ? "var(--amber-500)" : pt.tier === "medium" ? "var(--slate-500)" : "var(--emerald-500)";
                return (
                  <div key={i}>
                    <div className={`heatmap-point ${pt.tier === "urgent" ? "urgent-point" : ""}`}
                      title={`${pt.name}: Score ${pt.score} · ${pt.count} issue(s)`}
                      style={{
                        left: `${pt.x}%`, top: `${pt.y}%`,
                        width: size, height: size,
                        background: color,
                        boxShadow: pt.tier === "urgent" ? undefined : `0 2px 8px ${color}44`,
                      }}>
                      <span className="material-symbols-outlined icon-filled" style={{ fontSize: size * 0.45, color: "#fff" }}>{pt.icon}</span>
                    </div>
                    <div className="heatmap-label" style={{ left: `${pt.x}%`, top: `calc(${pt.y}% + ${size + 4}px)` }}>
                      {pt.name}
                    </div>
                  </div>
                );
              })}

              <div className="heatmap-legend">
                <div className="heatmap-legend-item"><span className="heatmap-dot urgent"></span> Urgent</div>
                <div className="heatmap-legend-item"><span className="heatmap-dot high"></span> High</div>
                <div className="heatmap-legend-item"><span className="heatmap-dot medium"></span> Medium</div>
                <div className="heatmap-legend-item"><span className="heatmap-dot low"></span> Low</div>
              </div>
            </div>
          </div>

          {/* Recommended Volunteers */}
          <div className="card animate-in">
            <div className="card-title" style={{ justifyContent: "space-between" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className="material-symbols-outlined">person_search</span>
                Top Matches
              </span>
              <span className="view-all" onClick={() => navigate("/volunteers")}>View all →</span>
            </div>
            {topMatch.length > 0 ? (
              <div className="rec-vol-list">
                {topMatch.map((m, i) => (
                  <div key={m.volunteer._id} className={`rec-vol-item ${i === 0 ? "best-match" : ""}`}>
                    <div className="rec-vol-avatar">{(m.volunteer.name || "?")[0].toUpperCase()}</div>
                    <div className="rec-vol-info">
                      {i === 0 && (
                        <div className="best-match-label">
                          <span className="material-symbols-outlined">star</span>
                          Best Match
                        </div>
                      )}
                      <div className="rec-vol-name">{m.volunteer.name}</div>
                      <div className="rec-vol-sub">{m.volunteer.location}</div>
                      <div className="match-score-bar-wrap">
                        <div
                          className={`match-score-bar ${m.score >= 50 ? "high" : m.score >= 30 ? "medium" : "low"}`}
                          style={{ width: `${Math.min(100, m.score)}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className={`rec-vol-score ${m.score >= 50 ? "high" : "medium"}`}>
                      <span>Score</span>
                      {m.score}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: ".82rem", color: "var(--text-muted)", padding: 12 }}>
                {volunteers.length === 0
                  ? "Add volunteers to see recommendations."
                  : issues.length === 0
                  ? "Upload issues first."
                  : "No matches found."}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Row: Charts */}
      <div className="dash-bottom" style={{ marginTop: 18 }}>
        <div className="card animate-in">
          <div className="card-title">
            <span className="material-symbols-outlined">donut_small</span>
            Category Breakdown
          </div>
          {issues.length > 0 ? (
            <div style={{ maxWidth: 260, margin: "0 auto" }}>
              <Doughnut data={donutData} options={{
                plugins: {
                  legend: { position: "bottom", labels: { boxWidth: 8, font: { size: 11, family: "Inter" }, padding: 16, usePointStyle: true, pointStyle: "circle" } },
                },
                cutout: "68%",
                responsive: true,
              }} />
            </div>
          ) : <div className="empty"><span className="material-symbols-outlined">pie_chart</span><div className="empty-text">No data yet</div></div>}
        </div>

        <div className="card animate-in">
          <div className="card-title">
            <span className="material-symbols-outlined">trending_up</span>
            7-Day Trend
          </div>
          {issues.length > 0 ? (
            <div className="chart-box">
              <Line data={trendConfig} options={{
                responsive: true, maintainAspectRatio: false,
                plugins: {
                  legend: { position: "bottom", labels: { boxWidth: 8, font: { size: 11, family: "Inter" }, padding: 16, usePointStyle: true, pointStyle: "circle" } },
                },
                scales: {
                  x: { grid: { display: false }, ticks: { font: { size: 11, family: "Inter" }, color: "#9CA3AF" } },
                  y: { beginAtZero: true, grid: { color: "#F3F4F6" }, ticks: { font: { size: 11, family: "Inter" }, color: "#9CA3AF" } },
                },
                interaction: { intersect: false, mode: "index" },
              }} />
            </div>
          ) : <div className="empty"><span className="material-symbols-outlined">show_chart</span><div className="empty-text">No data yet</div></div>}
        </div>
      </div>
    </div>
  );
}
