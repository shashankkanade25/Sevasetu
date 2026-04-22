import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { getAIAnalytics } from "../api";

export default function AIAnalytics() {
  const [insights, setInsights] = useState("");
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const fetchInsights = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await getAIAnalytics();
        if (!cancelled) {
          setInsights(res.data.insights);
          setMetrics(res.data.metrics);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.data?.error || err.message || "Failed to fetch AI insights.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchInsights();
    return () => { cancelled = true; };
  }, [refreshKey]);

  const handleRefresh = () => setRefreshKey((k) => k + 1);

  return (
    <div className="ai-analytics-page">
      {/* ── Page Header ── */}
      <div className="page-header">
        <h1>
          <span className="material-symbols-outlined">neurology</span>
          AI Decision Engine
        </h1>
        <p>Real-time crisis analysis powered by Gemini AI — severity triage, resource gaps, and recommended actions.</p>
      </div>

      {/* ── Metric Pills ── */}
      {metrics && !loading && (
        <div className="ai-metric-pills">
          <div className="ai-pill ai-pill--danger">
            <span className="material-symbols-outlined">emergency</span>
            <div>
              <span className="ai-pill-value">{metrics.issues.criticalUnassigned}</span>
              <span className="ai-pill-label">Critical Unassigned</span>
            </div>
          </div>
          <div className="ai-pill ai-pill--warning">
            <span className="material-symbols-outlined">pending_actions</span>
            <div>
              <span className="ai-pill-value">{metrics.issues.totalUnresolved}</span>
              <span className="ai-pill-label">Unresolved Issues</span>
            </div>
          </div>
          <div className="ai-pill ai-pill--success">
            <span className="material-symbols-outlined">group</span>
            <div>
              <span className="ai-pill-value">{metrics.volunteers.available}</span>
              <span className="ai-pill-label">Available Volunteers</span>
            </div>
          </div>
          <div className={`ai-pill ${metrics.volunteers.shortfall > 0 ? "ai-pill--danger" : "ai-pill--info"}`}>
            <span className="material-symbols-outlined">trending_down</span>
            <div>
              <span className="ai-pill-value">{metrics.volunteers.shortfall}</span>
              <span className="ai-pill-label">Resource Shortfall</span>
            </div>
          </div>
        </div>
      )}

      {/* ── AI Insights Card ── */}
      <div className="ai-insights-card card">
        <div className="ai-insights-header">
          <div className="ai-insights-title">
            <span className="ai-spark-icon">
              <span className="material-symbols-outlined">auto_awesome</span>
            </span>
            <div>
              <h2>Gemini Analysis</h2>
              <span className="ai-model-badge">gemini-2.5-flash</span>
            </div>
          </div>
          <button
            className="ai-refresh-btn"
            onClick={handleRefresh}
            disabled={loading}
            title="Re-analyze"
          >
            <span className={`material-symbols-outlined ${loading ? "ai-spin" : ""}`}>refresh</span>
            {loading ? "Analyzing…" : "Re-analyze"}
          </button>
        </div>

        <div className="ai-insights-body">
          {loading ? (
            <div className="ai-skeleton">
              <div className="ai-skeleton-line ai-skeleton-line--title" />
              <div className="ai-skeleton-line" />
              <div className="ai-skeleton-line ai-skeleton-line--short" />
              <div className="ai-skeleton-spacer" />
              <div className="ai-skeleton-line ai-skeleton-line--title" />
              <div className="ai-skeleton-line" />
              <div className="ai-skeleton-line" />
              <div className="ai-skeleton-line ai-skeleton-line--short" />
              <div className="ai-skeleton-spacer" />
              <div className="ai-skeleton-line ai-skeleton-line--title" />
              <div className="ai-skeleton-line" />
              <div className="ai-skeleton-line ai-skeleton-line--medium" />
            </div>
          ) : error ? (
            <div className="ai-error">
              <span className="material-symbols-outlined">error</span>
              <div>
                <strong>Analysis Failed</strong>
                <p>{error}</p>
              </div>
              <button className="ai-retry-btn" onClick={handleRefresh}>Try Again</button>
            </div>
          ) : (
            <div className="ai-prose">
              <ReactMarkdown>{insights}</ReactMarkdown>
            </div>
          )}
        </div>

        {!loading && !error && (
          <div className="ai-insights-footer">
            <span className="material-symbols-outlined">schedule</span>
            Generated at {new Date(metrics?.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · Data is live from MongoDB
          </div>
        )}
      </div>
    </div>
  );
}
