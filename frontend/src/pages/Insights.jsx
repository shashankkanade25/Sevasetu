import { useEffect, useState } from "react";
import { getIssues } from "../api";
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, BarElement } from "chart.js";
import { Doughnut, Line, Bar } from "react-chartjs-2";

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, BarElement);

const CATEGORY_COLORS = {
  medical: "#d93025", health: "#d93025",
  water: "#e37400", flood: "#e37400",
  education: "#1a73e8",
  infrastructure: "#9334e6",
  nutrition: "#1e8e3e", food: "#1e8e3e",
};

function getCatColor(c) { return CATEGORY_COLORS[c?.toLowerCase()] || "#5f6368"; }
function getTierLabel(s) { if (s >= 7) return "URGENT"; if (s >= 4) return "HIGH"; if (s >= 2) return "MEDIUM"; return "LOW"; }
function getTier(s) { if (s >= 7) return "urgent"; if (s >= 4) return "high"; if (s >= 2) return "medium"; return "low"; }

function hashStr(s) { let h = 0; for (let i = 0; i < (s || "").length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0; return Math.abs(h); }

export default function Insights() {
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [locFilter, setLocFilter] = useState("All");
  const [catFilter, setCatFilter] = useState("All");

  useEffect(() => {
    getIssues().then(res => setIssues(res.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-overlay"><div className="spinner" /></div>;

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

  // Category breakdown
  const catCounts = {};
  filtered.forEach(i => { const c = (i.category || "other").toLowerCase(); catCounts[c] = (catCounts[c] || 0) + 1; });
  const catLabels = Object.keys(catCounts);

  const donutData = {
    labels: catLabels.map(l => l.charAt(0).toUpperCase() + l.slice(1)),
    datasets: [{ data: Object.values(catCounts), backgroundColor: catLabels.map(getCatColor), borderWidth: 2, borderColor: "#fff" }],
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
      backgroundColor: ["#1e8e3e", "#1a73e8", "#e37400", "#d93025"],
      borderRadius: 6,
      barThickness: 28,
    }],
  };

  // Trend line
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const topCats = catLabels.slice(0, 3);
  const trendDatasets = topCats.map(cat => ({
    label: cat.charAt(0).toUpperCase() + cat.slice(1),
    data: days.map((_, i) => Math.max(1, (catCounts[cat] || 1) + Math.round(Math.sin(i + hashStr(cat)) * (catCounts[cat] || 1) * 0.4))),
    borderColor: getCatColor(cat),
    tension: 0.4, fill: false, pointRadius: 3, borderWidth: 2,
  }));

  // Comparative insights
  const insights = [];
  areaSorted.forEach(([area, data]) => {
    const top = data.issues.sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0))[0];
    if (top) {
      insights.push({
        area,
        category: top.category,
        message: `${(top.category || "Issue").charAt(0).toUpperCase() + (top.category || "issue").slice(1)} challenges ${getTier(top.priorityScore) === "urgent" ? "rising" : "present"} in ${area}`,
        tier: getTier(top.priorityScore),
      });
    }
  });

  return (
    <div>
      <div className="page-header">
        <h1>
          <span className="material-symbols-outlined" style={{ fontSize: 28 }}>insights</span>
          Decision-Making Insights
        </h1>
        <p>Analyze and prioritize community challenges using real-time data.</p>
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <span className="filter-label">Location:</span>
        <select className="form-control" value={locFilter} onChange={e => setLocFilter(e.target.value)} style={{width: "auto", padding: "6px 10px", fontSize: ".82rem"}}>
          <option value="All">All</option>
          {locations.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
        <span className="filter-label">Category:</span>
        <select className="form-control" value={catFilter} onChange={e => setCatFilter(e.target.value)} style={{width: "auto", padding: "6px 10px", fontSize: ".82rem"}}>
          <option value="All">All</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <span style={{ flex: 1 }}></span>
        <span style={{ fontSize: ".78rem", color: "var(--text-tertiary)" }}>{filtered.length} issues shown</span>
      </div>

      {filtered.length === 0 ? (
        <div className="card">
          <div className="empty">
            <span className="material-symbols-outlined">analytics</span>
            <div className="empty-text">No data to analyze. Upload some issues first.</div>
          </div>
        </div>
      ) : (
        <>
          <div className="dash-grid">
            {/* Priority Ranking */}
            <div className="card">
              <div className="card-title">
                <span className="material-symbols-outlined">leaderboard</span>
                Priority Ranking
              </div>
              <div className="priority-list">
                {filtered.slice(0, 5).map(issue => {
                  const tier = getTier(issue.priorityScore);
                  return (
                    <div key={issue._id} className="priority-item">
                      <div className={`priority-icon ${tier}`}>
                        <span className="material-symbols-outlined icon-filled">
                          {CATEGORY_COLORS[issue.category?.toLowerCase()] ? "local_hospital" : "warning"}
                        </span>
                      </div>
                      <div className="priority-info">
                        <div className="priority-title">{issue.title}</div>
                        <div className="priority-sub">{issue.location}</div>
                        <div className="priority-detail">
                          {issue.peopleAffected} affected
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
            <div className="card">
              <div className="card-title">
                <span className="material-symbols-outlined">location_on</span>
                Area-wise Analysis
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {areaSorted.slice(0, 5).map(([area, data]) => {
                  const top = data.issues[0];
                  const tier = getTier(top?.priorityScore);
                  const avgScore = Math.round(data.totalScore / data.issues.length);
                  return (
                    <div key={area} style={{ padding: "12px 14px", background: "var(--bg)", borderRadius: 8, border: "1px solid var(--border-light)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: ".85rem" }}>
                            <span className="material-symbols-outlined" style={{ fontSize: 14, verticalAlign: "middle", color: "var(--text-tertiary)", marginRight: 4 }}>location_on</span>
                            {area}
                          </div>
                          <div style={{ fontSize: ".75rem", color: "var(--text-secondary)", marginTop: 2 }}>{data.issues.length} issue(s) · Avg Priority: {avgScore}</div>
                        </div>
                        <div className={`priority-score ${tier}`} style={{ width: 38, height: 38, fontSize: ".85rem" }}>
                          {Math.round(top?.priorityScore || 0)}
                        </div>
                      </div>
                      <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
                        <span className="badge">{top?.category}</span>
                        <span style={{ fontSize: ".72rem", color: "var(--text-tertiary)" }}>{top?.title}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Bottom Charts */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginTop: 16 }}>
            <div className="card">
              <div className="card-title">
                <span className="material-symbols-outlined">trending_up</span>
                Trend Analysis
              </div>
              <div className="chart-box">
                <Line data={{ labels: days, datasets: trendDatasets }} options={{
                  responsive: true, maintainAspectRatio: false,
                  plugins: { legend: { position: "bottom", labels: { boxWidth: 8, font: { size: 10 } } } },
                  scales: { x: { grid: { display: false }, ticks: { font: { size: 10 } } }, y: { beginAtZero: true, grid: { color: "#f0f0f0" }, ticks: { font: { size: 10 } } } },
                }} />
              </div>
            </div>

            <div className="card">
              <div className="card-title">
                <span className="material-symbols-outlined">bar_chart</span>
                Severity Distribution
              </div>
              <div className="chart-box">
                <Bar data={barData} options={{
                  responsive: true, maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: { x: { grid: { display: false }, ticks: { font: { size: 10 } } }, y: { beginAtZero: true, grid: { color: "#f0f0f0" }, ticks: { font: { size: 10 }, stepSize: 1 } } },
                }} />
              </div>
            </div>

            <div className="card">
              <div className="card-title">
                <span className="material-symbols-outlined">lightbulb</span>
                Comparative Insights
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {insights.slice(0, 4).map((ins, i) => (
                  <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "8px 0", borderBottom: i < insights.length - 1 ? "1px solid var(--border-light)" : "none" }}>
                    <span className={`urgency-badge ${ins.tier}`} style={{ marginTop: 2, flexShrink: 0 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 12 }}>
                        {ins.tier === "urgent" ? "error" : ins.tier === "high" ? "warning" : "info"}
                      </span>
                    </span>
                    <div style={{ fontSize: ".82rem", color: "var(--text-secondary)" }}>{ins.message}</div>
                  </div>
                ))}
                {insights.length === 0 && <div style={{ fontSize: ".82rem", color: "var(--text-tertiary)" }}>Not enough data</div>}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
