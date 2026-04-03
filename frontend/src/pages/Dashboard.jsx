import { useEffect, useState, useRef } from "react";
import { getIssues, getVolunteers, matchVolunteers } from "../api";
import { useNavigate } from "react-router-dom";
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Filler } from "chart.js";
import { Doughnut, Line } from "react-chartjs-2";

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Filler);

const CATEGORY_COLORS = {
  medical: "#d93025", health: "#d93025",
  water: "#e37400", flood: "#e37400",
  education: "#1a73e8",
  infrastructure: "#9334e6",
  nutrition: "#1e8e3e", food: "#1e8e3e",
};
const CATEGORY_ICONS = {
  medical: "local_hospital", health: "local_hospital",
  water: "water_drop", flood: "water_drop",
  education: "school",
  infrastructure: "construction",
  nutrition: "restaurant", food: "restaurant",
};
const DEFAULT_ICON = "report_problem";
const DEFAULT_COLOR = "#5f6368";

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

// Generate stable positions for heatmap based on location hash
function hashStr(s) {
  let h = 0;
  for (let i = 0; i < (s || "").length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
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
        // get match for top issue if exists
        if (iRes.data.length > 0) {
          matchVolunteers(iRes.data[0]._id)
            .then(res => setTopMatch(res.data))
            .catch(() => {});
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-overlay"><div className="spinner" /></div>;

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
      borderWidth: 2,
      borderColor: "#fff",
    }],
  };

  // Trend – simulate last 7 days with jittered data grouped by category
  const trendDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const topCats = catLabels.slice(0, 3);
  const trendDatasets = topCats.map(cat => {
    const base = catCounts[cat] || 1;
    return {
      label: cat.charAt(0).toUpperCase() + cat.slice(1),
      data: trendDays.map((_, i) => Math.max(1, base + Math.round(Math.sin(i + hashStr(cat)) * base * 0.4))),
      borderColor: getCatColor(cat),
      backgroundColor: getCatColor(cat) + "22",
      tension: 0.4,
      fill: false,
      pointRadius: 3,
      borderWidth: 2,
    };
  });

  const trendConfig = {
    labels: trendDays,
    datasets: trendDatasets,
  };

  // Heatmap points from unique locations
  const locationMap = {};
  issues.forEach(issue => {
    const loc = (issue.location || "Unknown").toLowerCase();
    if (!locationMap[loc]) locationMap[loc] = { issues: [], maxScore: 0 };
    locationMap[loc].issues.push(issue);
    locationMap[loc].maxScore = Math.max(locationMap[loc].maxScore, issue.priorityScore || 0);
  });

  const heatPoints = Object.entries(locationMap).map(([loc, data], idx) => {
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
        <h1>Welcome, Admin</h1>
        <p>This is your data-driven NGO dashboard for prioritizing and coordinating community needs.</p>
      </div>

      {/* Stats Row */}
      <div className="stats-row">
        <div className="stat-card">
          <span className="stat-label">Total Challenges</span>
          <span className="stat-value primary">{issues.length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Urgent</span>
          <span className="stat-value danger">{critical}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">High Priority</span>
          <span className="stat-value warning">{high}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Volunteers</span>
          <span className="stat-value success">{volunteers.length}</span>
        </div>
      </div>

      {/* Main Grid */}
      <div className="dash-grid">
        {/* Left: Priority Challenges */}
        <div className="card">
          <div className="card-title">
            <span className="material-symbols-outlined">priority_high</span>
            Priority Challenges
          </div>
          {issues.length === 0 ? (
            <div className="empty">
              <span className="material-symbols-outlined">inbox</span>
              <div className="empty-text">No issues yet. <span style={{ color: "var(--primary)", cursor: "pointer" }} onClick={() => navigate("/upload")}>Upload data</span> to get started.</div>
            </div>
          ) : (
            <div className="priority-list">
              {issues.slice(0, 5).map(issue => {
                const tier = getTier(issue.priorityScore);
                return (
                  <div key={issue._id} className="priority-item"
                    onClick={() => navigate("/matching", { state: { issueId: issue._id } })}>
                    <div className={`priority-icon ${tier}`}>
                      <span className="material-symbols-outlined icon-filled">{getIcon(issue.category)}</span>
                    </div>
                    <div className="priority-info">
                      <div className="priority-title">{issue.title || "Untitled Issue"}</div>
                      <div className="priority-sub">{issue.location || "—"}</div>
                      <div className="priority-detail">
                        <span>{issue.peopleAffected || 0} affected</span>
                        <span className={`urgency-badge ${tier}`}>{getTierLabel(issue.priorityScore)}</span>
                      </div>
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
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Needs Heatmap */}
          <div className="card">
            <div className="card-title">
              <span className="material-symbols-outlined">map</span>
              Needs Heatmap
            </div>
            <div className="heatmap-container">
              {/* SVG roads/grid background */}
              <svg width="100%" height="100%" style={{ position: "absolute", top: 0, left: 0, opacity: 0.25 }}>
                <defs>
                  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#7ca87e" strokeWidth="0.5"/>
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)"/>
                <line x1="20%" y1="0" x2="20%" y2="100%" stroke="#5a8c5e" strokeWidth="1.5" opacity="0.4" />
                <line x1="60%" y1="0" x2="60%" y2="100%" stroke="#5a8c5e" strokeWidth="1.5" opacity="0.4" />
                <line x1="0" y1="40%" x2="100%" y2="40%" stroke="#5a8c5e" strokeWidth="1.5" opacity="0.4" />
                <line x1="0" y1="75%" x2="100%" y2="75%" stroke="#5a8c5e" strokeWidth="1.5" opacity="0.4" />
              </svg>

              {heatPoints.map((pt, i) => {
                const size = pt.tier === "urgent" ? 36 : pt.tier === "high" ? 30 : 24;
                const color = pt.tier === "urgent" ? "var(--urgent-color)" : pt.tier === "high" ? "var(--high-color)" : pt.tier === "medium" ? "var(--medium-color)" : "var(--low-color)";
                const glow = pt.tier === "urgent" ? "0 0 16px rgba(217,48,37,.45)" : pt.tier === "high" ? "0 0 12px rgba(227,116,0,.35)" : "none";
                return (
                  <div key={i}>
                    <div className="heatmap-point" title={`${pt.name}: Score ${pt.score}`}
                      style={{
                        left: `${pt.x}%`, top: `${pt.y}%`,
                        width: size, height: size,
                        background: color, boxShadow: glow,
                      }}>
                      <span className="material-symbols-outlined icon-filled" style={{ fontSize: size * 0.5, color: "#fff" }}>{pt.icon}</span>
                    </div>
                    <div className="heatmap-label" style={{ left: `${pt.x}%`, top: `calc(${pt.y}% + ${size + 2}px)` }}>
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
          <div className="card">
            <div className="card-title" style={{ justifyContent: "space-between" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className="material-symbols-outlined">person_search</span>
                Recommended Volunteers
              </span>
              <span className="view-all" onClick={() => navigate("/volunteers")}>view all</span>
            </div>
            {topMatch.length > 0 ? (
              <div className="rec-vol-list">
                {topMatch.map((m, i) => (
                  <div key={m.volunteer._id} className="rec-vol-item">
                    <div className="rec-vol-avatar">{(m.volunteer.name || "?")[0].toUpperCase()}</div>
                    <div className="rec-vol-info">
                      <div className="rec-vol-name">{m.volunteer.name}</div>
                      <div className="rec-vol-sub">{m.volunteer.location}</div>
                      <div className="rec-vol-tag primary">
                        <span className="material-symbols-outlined" style={{ fontSize: 12 }}>verified</span>
                        {m.volunteer.skills?.[0] || "General"} · {m.volunteer.availability ? "Available" : "Busy"}
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
              <div style={{ fontSize: ".82rem", color: "var(--text-tertiary)", padding: 8 }}>
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
      <div className="dash-bottom" style={{ marginTop: 16 }}>
        {/* Donut Chart */}
        <div className="card">
          <div className="card-title">
            <span className="material-symbols-outlined">donut_small</span>
            Challenges Breakdown
          </div>
          {issues.length > 0 ? (
            <div style={{ maxWidth: 260, margin: "0 auto" }}>
              <Doughnut data={donutData} options={{
                plugins: { legend: { position: "bottom", labels: { boxWidth: 10, font: { size: 11 } } } },
                cutout: "60%",
              }} />
            </div>
          ) : <div style={{ fontSize: ".82rem", color: "var(--text-tertiary)", textAlign: "center", padding: 20 }}>No data</div>}
        </div>

        {/* Trend Chart */}
        <div className="card">
          <div className="card-title">
            <span className="material-symbols-outlined">trending_up</span>
            Trends in Past 7 Days
          </div>
          {issues.length > 0 ? (
            <div className="chart-box">
              <Line data={trendConfig} options={{
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { position: "bottom", labels: { boxWidth: 10, font: { size: 11 } } } },
                scales: {
                  x: { grid: { display: false }, ticks: { font: { size: 11 } } },
                  y: { beginAtZero: true, grid: { color: "#f0f0f0" }, ticks: { font: { size: 11 } } },
                },
              }} />
            </div>
          ) : <div style={{ fontSize: ".82rem", color: "var(--text-tertiary)", textAlign: "center", padding: 20 }}>No data</div>}
        </div>
      </div>
    </div>
  );
}
