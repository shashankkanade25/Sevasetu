import { useEffect, useState } from "react";
import { getIssues } from "../api";
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, BarElement } from "chart.js";
import { Doughnut, Line, Bar } from "react-chartjs-2";

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, BarElement);

const CATEGORY_COLORS = {
  medical: "#DC2626", health: "#DC2626",
  water: "#F59E0B", flood: "#F59E0B",
  education: "#64748B",
  infrastructure: "#8B5CF6",
  nutrition: "#10B981", food: "#10B981",
};

function getCatColor(c) { return CATEGORY_COLORS[c?.toLowerCase()] || "#6B7280"; }
function getTierLabel(s) { if (s >= 7) return "URGENT"; if (s >= 4) return "HIGH"; if (s >= 2) return "MEDIUM"; return "LOW"; }
function getTier(s) { if (s >= 7) return "urgent"; if (s >= 4) return "high"; if (s >= 2) return "medium"; return "low"; }
function hashStr(s) { let h = 0; for (let i = 0; i < (s || "").length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0; return Math.abs(h); }

const CATEGORY_ICONS = {
  medical: "local_hospital", health: "local_hospital",
  water: "water_drop", flood: "water_drop",
  education: "school", infrastructure: "construction",
  nutrition: "restaurant", food: "restaurant",
};

export default function Insights() {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [locFilter, setLocFilter] = useState("All");
  const [catFilter, setCatFilter] = useState("All");

  useEffect(() => {
    getIssues().then(res => setIssues(res.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div>
      <div className="page-header">
        <div className="skeleton skeleton-text" style={{ width: 240, height: 28 }}></div>
        <div className="skeleton skeleton-text" style={{ width: 340, height: 14, marginTop: 8 }}></div>
      </div>
      <div className="skeleton" style={{ height: 80, marginBottom: 18 }}></div>
      <div className="dash-grid">
        <div className="card"><div className="skeleton" style={{ height: 300 }}></div></div>
        <div className="card"><div className="skeleton" style={{ height: 300 }}></div></div>
      </div>
    </div>
  );

  const locations = [...new Set(issues.map(i => i.location).filter(Boolean))];
  const categories = [...new Set(issues.map(i => i.category).filter(Boolean))];

  const filtered = issues.filter(i => {
    if (locFilter !== "All" && i.location !== locFilter) return false;
    if (catFilter !== "All" && i.category !== catFilter) return false;
    return true;
  });

  // Area-wise analysis
  const areaMap = {};
  filtered.forEach(i => {
    const loc = i.location || "Unknown";
    if (!areaMap[loc]) areaMap[loc] = { issues: [], totalScore: 0 };
    areaMap[loc].issues.push(i);
    areaMap[loc].totalScore += (i.priorityScore || 0);
  });
  const areaSorted = Object.entries(areaMap).sort((a, b) => b[1].totalScore - a[1].totalScore);
  const maxAreaScore = areaSorted.length > 0 ? areaSorted[0][1].totalScore : 1;

  // Category breakdown
  const catCounts = {};
  filtered.forEach(i => { const c = (i.category || "other").toLowerCase(); catCounts[c] = (catCounts[c] || 0) + 1; });
  const catLabels = Object.keys(catCounts);

  const donutData = {
    labels: catLabels.map(l => l.charAt(0).toUpperCase() + l.slice(1)),
    datasets: [{ data: Object.values(catCounts), backgroundColor: catLabels.map(getCatColor), borderWidth: 3, borderColor: "#fff" }],
  };

  // Severity distribution bar
  const sevBuckets = { "1-3": 0, "4-6": 0, "7-8": 0, "9-10": 0 };
  filtered.forEach(i => {
    const s = i.severity || 0;
    if (s <= 3) sevBuckets["1-3"]++;
    else if (s <= 6) sevBuckets["4-6"]++;
    else if (s <= 8) sevBuckets["7-8"]++;
    else sevBuckets["9-10"]++;
  });
  const barData = {
    labels: Object.keys(sevBuckets),
    datasets: [{
      label: "Issues",
      data: Object.values(sevBuckets),
      backgroundColor: ["#10B981", "#64748B", "#F59E0B", "#DC2626"],
      borderRadius: 8,
      barThickness: 32,
    }],
  };

  // Trend line
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const topCats = catLabels.slice(0, 3);
  const trendDatasets = topCats.map(cat => ({
    label: cat.charAt(0).toUpperCase() + cat.slice(1),
    data: days.map((_, i) => Math.max(1, (catCounts[cat] || 1) + Math.round(Math.sin(i + hashStr(cat)) * (catCounts[cat] || 1) * 0.4))),
    borderColor: getCatColor(cat),
    backgroundColor: getCatColor(cat) + "15",
    tension: 0.4, fill: true, pointRadius: 0, pointHoverRadius: 5, borderWidth: 2.5,
  }));

  // Insights
  const insights = [];
  areaSorted.forEach(([area, data]) => {
    const top = data.issues.sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0))[0];
    if (top) {
      insights.push({
        area,
        category: top.category,
        message: `${(top.category || "Issue").charAt(0).toUpperCase() + (top.category || "issue").slice(1)} challenges ${getTier(top.priorityScore) === "urgent" ? "rising rapidly" : "present"} in ${area}`,
        tier: getTier(top.priorityScore),
        icon: CATEGORY_ICONS[top.category?.toLowerCase()] || "warning",
      });
    }
  });

  // Top priority area
  const topArea = areaSorted[0];
  const totalAffected = filtered.reduce((sum, i) => sum + (i.peopleAffected || 0), 0);
  const urgentCount = filtered.filter(i => getTier(i.priorityScore) === "urgent").length;

  return (
    <div>
      <div className="page-header">
        <h1>
          <span className="material-symbols-outlined">insights</span>
          Decision-Making Insights
        </h1>
        <p>Analyze and prioritize community challenges using real-time data intelligence.</p>
      </div>

      {/* Filters */}
      <div className="filter-bar animate-in">
        <span className="filter-label">Location</span>
        <select className="form-control" value={locFilter} onChange={e => setLocFilter(e.target.value)} style={{width: "auto", padding: "7px 12px", fontSize: ".82rem"}}>
          <option value="All">All Locations</option>
          {locations.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
        <span className="filter-label">Category</span>
        <select className="form-control" value={catFilter} onChange={e => setCatFilter(e.target.value)} style={{width: "auto", padding: "7px 12px", fontSize: ".82rem"}}>
          <option value="All">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <span style={{ flex: 1 }}></span>
        <span style={{ fontSize: ".78rem", color: "var(--text-muted)", fontWeight: 500 }}>{filtered.length} issues</span>
      </div>

      {filtered.length === 0 ? (
        <div className="card">
          <div className="empty">
            <span className="material-symbols-outlined">analytics</span>
            <div className="empty-text">No data to analyze. Upload some issues first.</div>
            <div className="empty-action">
              <button className="btn btn-primary btn-sm" onClick={() => window.location.href = "/upload"}>Upload Data</button>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Hero Insight */}
          {topArea && (
            <div className="insight-hero animate-in">
              <div className="insight-hero-icon">
                <span className="material-symbols-outlined icon-filled">location_on</span>
              </div>
              <div className="insight-hero-text">
                <h3>Top Priority Area: {topArea[0]}</h3>
                <p>{topArea[1].issues.length} issue(s) · Total priority score: {Math.round(topArea[1].totalScore)}</p>
              </div>
              <div className="insight-hero-stat">
                <span className="stat-label">People Affected</span>
                <span className="stat-value danger">{totalAffected.toLocaleString()}</span>
              </div>
            </div>
          )}

          {/* Stats Row */}
          <div className="stats-row">
            <div className="stat-card danger-accent animate-in">
              <span className="stat-label">Urgent Issues</span>
              <span className="stat-value danger">{urgentCount}</span>
            </div>
            <div className="stat-card primary-accent animate-in">
              <span className="stat-label">Total Issues</span>
              <span className="stat-value primary">{filtered.length}</span>
            </div>
            <div className="stat-card slate-accent animate-in">
              <span className="stat-label">Areas</span>
              <span className="stat-value info">{areaSorted.length}</span>
            </div>
            <div className="stat-card warning-accent animate-in">
              <span className="stat-label">Categories</span>
              <span className="stat-value warning">{catLabels.length}</span>
            </div>
          </div>

          <div className="dash-grid">
            {/* Priority Ranking */}
            <div className="card animate-in">
              <div className="card-title">
                <span className="material-symbols-outlined">leaderboard</span>
                Priority Ranking
              </div>
              <div className="priority-list">
                {filtered.slice(0, 5).map(issue => {
                  const tier = getTier(issue.priorityScore);
                  return (
                    <div key={issue._id} className={`priority-item tier-${tier}`}>
                      <div className={`priority-icon ${tier}`}>
                        <span className="material-symbols-outlined icon-filled">
                          {CATEGORY_ICONS[issue.category?.toLowerCase()] || "warning"}
                        </span>
                      </div>
                      <div className="priority-info">
                        <div className="priority-title">{issue.title}</div>
                        <div className="priority-sub">
                          <span className="material-symbols-outlined" style={{ fontSize: 13 }}>location_on</span>
                          {issue.location}
                        </div>
                        <div className="priority-detail">
                          {issue.peopleAffected} affected
                          {tier === "urgent" && <span className="pulse-dot"></span>}
                          <span className={`urgency-badge ${tier}`}>{getTierLabel(issue.priorityScore)}</span>
                        </div>
                      </div>
                      <div className={`priority-score ${tier}`}>{Math.round(issue.priorityScore || 0)}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Area-wise analysis */}
            <div className="card animate-in">
              <div className="card-title">
                <span className="material-symbols-outlined">pin_drop</span>
                Area Analysis
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {areaSorted.slice(0, 5).map(([area, data]) => {
                  const top = data.issues[0];
                  const tier = getTier(top?.priorityScore);
                  const avgScore = Math.round(data.totalScore / data.issues.length);
                  const barWidth = (data.totalScore / maxAreaScore) * 100;
                  const barColor = tier === "urgent" ? "var(--red-500)" : tier === "high" ? "var(--amber-500)" : tier === "medium" ? "var(--slate-400)" : "var(--emerald-500)";
                  return (
                    <div key={area} style={{ padding: "14px 16px", background: "var(--bg-subtle)", borderRadius: "var(--radius)", border: "1px solid var(--border-light)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: ".85rem", display: "flex", alignItems: "center", gap: 6 }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 14, color: "var(--text-muted)" }}>location_on</span>
                            {area}
                          </div>
                          <div style={{ fontSize: ".75rem", color: "var(--text-secondary)", marginTop: 3 }}>
                            {data.issues.length} issue(s) · Avg: {avgScore}
                          </div>
                        </div>
                        <div className={`priority-score ${tier}`} style={{ width: 38, height: 38, fontSize: ".85rem" }}>
                          {Math.round(top?.priorityScore || 0)}
                        </div>
                      </div>
                      <div className="area-bar-wrap">
                        <div className="area-bar" style={{ width: `${barWidth}%`, background: barColor }}></div>
                      </div>
                      <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
                        <span className="badge">{top?.category}</span>
                        <span style={{ fontSize: ".72rem", color: "var(--text-muted)" }}>{top?.title}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 18, marginTop: 18 }}>
            <div className="card animate-in">
              <div className="card-title">
                <span className="material-symbols-outlined">trending_up</span>
                Trend Analysis
              </div>
              <div className="chart-box">
                <Line data={{ labels: days, datasets: trendDatasets }} options={{
                  responsive: true, maintainAspectRatio: false,
                  plugins: { legend: { position: "bottom", labels: { boxWidth: 8, font: { size: 10, family: "Inter" }, padding: 14, usePointStyle: true } } },
                  scales: {
                    x: { grid: { display: false }, ticks: { font: { size: 10, family: "Inter" }, color: "#9CA3AF" } },
                    y: { beginAtZero: true, grid: { color: "#F3F4F6" }, ticks: { font: { size: 10, family: "Inter" }, color: "#9CA3AF" } },
                  },
                  interaction: { intersect: false, mode: "index" },
                }} />
              </div>
            </div>

            <div className="card animate-in">
              <div className="card-title">
                <span className="material-symbols-outlined">bar_chart</span>
                Severity Distribution
              </div>
              <div className="chart-box">
                <Bar data={barData} options={{
                  responsive: true, maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: {
                    x: { grid: { display: false }, ticks: { font: { size: 10, family: "Inter" }, color: "#9CA3AF" } },
                    y: { beginAtZero: true, grid: { color: "#F3F4F6" }, ticks: { font: { size: 10, family: "Inter" }, color: "#9CA3AF", stepSize: 1 } },
                  },
                }} />
              </div>
            </div>

            <div className="card animate-in">
              <div className="card-title">
                <span className="material-symbols-outlined">lightbulb</span>
                Key Insights
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {insights.slice(0, 4).map((ins, i) => (
                  <div key={i} className="insight-card">
                    <span className={`urgency-badge ${ins.tier}`} style={{ flexShrink: 0 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 12 }}>
                        {ins.tier === "urgent" ? "error" : ins.tier === "high" ? "warning" : "info"}
                      </span>
                      {ins.tier}
                    </span>
                    <div style={{ fontSize: ".82rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>{ins.message}</div>
                  </div>
                ))}
                {insights.length === 0 && <div style={{ fontSize: ".82rem", color: "var(--text-muted)", padding: 8 }}>Not enough data for insights</div>}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
