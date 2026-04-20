import { useEffect, useState } from "react";
import { getIssues, getAnalyticsOverview } from "../api";
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
function getTierLabel(s) { if (s >= 75) return "URGENT"; if (s >= 50) return "HIGH"; if (s >= 25) return "MEDIUM"; return "LOW"; }
function getTier(s) { if (s >= 75) return "urgent"; if (s >= 50) return "high"; if (s >= 25) return "medium"; return "low"; }
function hashStr(s) { let h = 0; for (let i = 0; i < (s || "").length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0; return Math.abs(h); }

const CATEGORY_ICONS = {
  medical: "local_hospital", health: "local_hospital",
  water: "water_drop", flood: "water_drop",
  education: "school", infrastructure: "construction",
  nutrition: "restaurant", food: "restaurant",
};

export default function Insights() {
  const [issues, setIssues] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [locFilter, setLocFilter] = useState("All");
  const [catFilter, setCatFilter] = useState("All");

  useEffect(() => {
    Promise.all([getIssues(), getAnalyticsOverview()])
      .then(([iRes, aRes]) => {
        setIssues(iRes.data);
        setAnalytics(aRes.data);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading || !analytics) return (
    <div style={{ padding: 40, textAlign: "center" }}>
      <div className="spinner"></div>
      <div style={{ marginTop: 12, color: "var(--text-muted)" }}>Processing Data Insights...</div>
    </div>
  );

  const locations = [...new Set(issues.map(i => i.location).filter(Boolean))];
  const categories = [...new Set(issues.map(i => i.category).filter(Boolean))];

  const filtered = issues.filter(i => {
    if (locFilter !== "All" && i.location !== locFilter) return false;
    if (catFilter !== "All" && (i.category || "").toLowerCase() !== catFilter.toLowerCase()) return false;
    return true;
  });

  // Area-wise analysis (calculated from filtered issues for interactivity)
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
  analytics.categoryDistribution.forEach(item => {
    catCounts[item._id?.toLowerCase() || 'other'] = item.count;
  });
  const catLabels = Object.keys(catCounts);

  const donutData = {
    labels: catLabels.map(l => l.charAt(0).toUpperCase() + l.slice(1)),
    datasets: [{ data: Object.values(catCounts), backgroundColor: catLabels.map(getCatColor), borderWidth: 2, borderColor: "#fff" }],
  };

  // Severity distribution bar (0-10 scale)
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
      label: "Count",
      data: Object.values(sevBuckets),
      backgroundColor: ["#10B981", "#64748B", "#F59E0B", "#DC2626"],
      borderRadius: 6,
    }],
  };

  // Insights generation
  const generatedInsights = [];
  areaSorted.slice(0, 3).forEach(([area, data]) => {
    const top = data.issues.sort((a, b) => (b.priorityScore || 0) - (a.priorityScore || 0))[0];
    if (top) {
      const score = Math.round(top.priorityScore);
      const tier = getTier(score);
      generatedInsights.push({
        area,
        tier: getTierLabel(score),
        tierKey: tier,
        message: `${area} needs immediate attention for ${top.category || "essential"} services. Impact score is ${score}.`,
        icon: CATEGORY_ICONS[top.category?.toLowerCase()] || "analytics"
      });
    }
  });

  return (
    <div>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <h1>Decision Intelligence</h1>
          <p>Real-time analytics engine surfacing critical community needs.</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
           <div className="stat-delta up animate-in" style={{ background: "var(--emerald-50)", color: "var(--emerald-600)", border: "1px solid var(--emerald-200)", padding: "6px 14px", borderRadius: 99, display: "flex", alignItems: "center", gap: 6, fontWeight: 700 }}>
             <span className="material-symbols-outlined" style={{ fontSize: 18 }}>check_circle</span>
             {analytics.resolvedIssues} Issues Resolved
           </div>
        </div>
      </div>

      <div className="filter-bar animate-in" style={{ animationDelay: '0.1s' }}>
        <select className="form-control" value={locFilter} onChange={e => setLocFilter(e.target.value)} style={{ width: "auto", fontSize: ".8rem", fontWeight: 600 }}>
          <option value="All">All Locations</option>
          {locations.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
        <select className="form-control" value={catFilter} onChange={e => setCatFilter(e.target.value)} style={{ width: "auto", fontSize: ".8rem", fontWeight: 600 }}>
          <option value="All">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <div style={{ flex: 1 }}></div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="pulse-dot"></span>
          <span style={{ fontSize: ".72rem", color: "var(--text-muted)", fontWeight: 800, letterSpacing: ".05em" }}>{filtered.length} ACTIVE OBSERVATION NODES</span>
        </div>
      </div>

      <div className="stats-row">
        {[
          { label: "Urgent Priority", val: filtered.filter(i => getTier(i.priorityScore) === 'urgent').length, color: 'danger' },
          { label: "Community Needs", val: filtered.length, color: 'primary' },
          { label: "Resolution Rate", val: `${Math.round(analytics.resolutionRate)}%`, color: 'success' },
          { label: "Active Districts", val: locations.length, color: 'info' }
        ].map((s, idx) => (
          <div key={idx} className={`stat-card ${s.color}-accent animate-in`} style={{ animationDelay: `${0.1 + idx * 0.05}s` }}>
            <span className="stat-label">{s.label}</span>
            <span className={`stat-value ${s.color}`}>{s.val}</span>
          </div>
        ))}
      </div>

      <div className="dash-grid">
        <div className="card animate-in" style={{ animationDelay: '0.3s' }}>
          <div className="card-title">Live Priority Ranking</div>
          <div className="priority-list">
            {filtered.slice(0, 5).sort((a,b) => b.priorityScore - a.priorityScore).map((issue, idx) => {
              const tier = getTier(issue.priorityScore);
              return (
                <div key={issue._id} className={`priority-item tier-${tier} animate-in`} style={{ animationDelay: `${0.35 + idx * 0.04}s` }}>
                  <div className={`priority-icon ${tier}`}><span className="material-symbols-outlined">{CATEGORY_ICONS[issue.category?.toLowerCase()] || "warning"}</span></div>
                  <div className="priority-info">
                    <div className="priority-title">{issue.title}</div>
                    <div className="priority-sub">📍 {issue.location}</div>
                    <div className="priority-detail"><span className={`urgency-badge ${tier}`}>{getTierLabel(issue.priorityScore)}</span></div>
                  </div>
                  <div className={`priority-score ${tier}`}>{Math.round(issue.priorityScore)}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card animate-in" style={{ animationDelay: '0.4s' }}>
           <div className="card-title">Regional Pressure Analysis</div>
           <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 10 }}>
             {areaSorted.slice(0, 6).map(([area, data], idx) => {
               const barWidth = (data.totalScore / maxAreaScore) * 100;
               return (
                 <div key={area} className="animate-in" style={{ animationDelay: `${0.45 + idx * 0.04}s` }}>
                   <div style={{ display: "flex", justifyContent: "space-between", fontSize: ".8rem", marginBottom: 6 }}>
                     <span style={{ fontWeight: 700 }}>{area}</span>
                     <span style={{ color: "var(--text-muted)", fontSize: ".7rem", fontWeight: 600 }}>{data.issues.length} ACTORS</span>
                   </div>
                   <div style={{ height: 6, background: "var(--bg-subtle)", borderRadius: 3, overflow: "hidden" }}>
                     <div style={{ 
                        height: "100%", width: `${barWidth}%`, 
                        background: "linear-gradient(90deg, var(--red-500), var(--red-600))", 
                        borderRadius: 3,
                        transition: 'width 1s cubic-bezier(0.34, 1.56, 0.64, 1)'
                      }}></div>
                   </div>
                 </div>
               );
             })}
           </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 18, marginTop: 18 }}>
        <div className="card animate-in" style={{ animationDelay: '0.5s' }}>
          <div className="card-title">Category Distribution</div>
          <div style={{ maxWidth: 220, margin: "14px auto" }}>
            <Doughnut data={donutData} options={{ 
              plugins: { legend: { display: false } }, 
              cutout: "75%",
              animation: { animateRotate: true, duration: 1500 }
            }} />
          </div>
        </div>
        <div className="card animate-in" style={{ animationDelay: '0.6s' }}>
          <div className="card-title">Severity Spread</div>
          <div className="chart-box" style={{ height: 180, marginTop: 10 }}>
            <Bar data={barData} options={{ 
              responsive: true, 
              maintainAspectRatio: false, 
              plugins: { legend: { display: false } },
              scales: { y: { display: false }, x: { grid: { display: false } } }
            }} />
          </div>
        </div>
        <div className="card animate-in" style={{ animationDelay: '0.7s' }}>
          <div className="card-title">Smart Action Triggers</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
            {generatedInsights.map((ins, i) => (
              <div key={i} className="animate-in" style={{ 
                padding: "12px 14px", 
                background: ins.tierKey === 'urgent' ? 'var(--red-50)' : 'var(--slate-50)', 
                border: `1px solid ${ins.tierKey === 'urgent' ? 'var(--red-100)' : 'var(--slate-100)'}`, 
                borderRadius: "var(--radius-sm)", 
                fontSize: ".75rem", 
                animationDelay: `${0.8 + i * 0.1}s`
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span className={`material-symbols-outlined ${ins.tierKey}`} style={{ fontSize: 16 }}>{ins.icon}</span>
                  <span style={{ fontWeight: 800, textTransform: "uppercase", fontSize: ".65rem", color: ins.tierKey === 'urgent' ? 'var(--red-700)' : 'var(--slate-700)' }}>{ins.tier} PRIORITY</span>
                </div>
                <div style={{ color: "var(--text-primary)", fontWeight: 500, lineHeight: 1.4 }}>{ins.message}</div>
                <div style={{ marginTop: 8, textAlign: "right" }}>
                   <button style={{ 
                     background: "none", border: "none", color: "var(--red-600)", 
                     fontSize: ".7rem", fontWeight: 700, cursor: "pointer", padding: 0 
                   }}>ALLOCATE NOW →</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
