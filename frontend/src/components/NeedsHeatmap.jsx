import { useEffect, useRef, useState } from "react";

/* ─────────────────────────────────────────────
   DEMO / FALLBACK DATA
   Extended Maharashtra + India coverage
───────────────────────────────────────────── */
const DEMO_POINTS = [
  { id: 1,  title: "Drought Situation",        location: "Solapur",        lat: 17.6599, lng: 75.9064, priority: "urgent", affected: 400, category: "water"     },
  { id: 2,  title: "Water Scarcity",           location: "Nashik",         lat: 19.9975, lng: 73.7898, priority: "high",   affected: 250, category: "water"     },
  { id: 3,  title: "Medical Emergency",        location: "Nagpur",         lat: 21.1458, lng: 79.0882, priority: "medium", affected: 120, category: "medical"   },
  { id: 4,  title: "Flood Relief Camp",        location: "Kolhapur",       lat: 16.7050, lng: 74.2433, priority: "urgent", affected: 680, category: "flood"     },
  { id: 5,  title: "Child Nutrition Crisis",   location: "Aurangabad",     lat: 19.8762, lng: 75.3433, priority: "high",   affected: 310, category: "nutrition" },
  { id: 6,  title: "School Infrastructure",   location: "Amravati",       lat: 20.9333, lng: 77.7500, priority: "medium", affected:  90, category: "education" },
  { id: 7,  title: "Hospital Capacity",        location: "Pune",           lat: 18.5204, lng: 73.8567, priority: "urgent", affected: 540, category: "medical"   },
  { id: 8,  title: "Road Blockage Relief",     location: "Latur",          lat: 18.4088, lng: 76.5604, priority: "high",   affected: 175, category: "infrastructure"},
  { id: 9,  title: "Drought Aid Required",     location: "Jalgaon",        lat: 21.0077, lng: 75.5626, priority: "high",   affected: 220, category: "water"     },
  { id: 10, title: "Community Health Drive",   location: "Nanded",         lat: 19.1383, lng: 77.3210, priority: "low",    affected:  60, category: "medical"   },
  { id: 11, title: "Landslide Emergency",      location: "Satara",         lat: 17.6868, lng: 74.0183, priority: "urgent", affected: 810, category: "disaster"  },
  { id: 12, title: "Food Distribution",        location: "Raigad",         lat: 18.5158, lng: 73.1804, priority: "medium", affected: 140, category: "food"      },
];

/* ─── Priority config ─── */
const PRIORITY_CFG = {
  urgent: { color: "#DC2626", glow: "rgba(220,38,38,0.35)", label: "URGENT", hex: "#FEF2F2", text: "#B91C1C", border: "#FECACA" },
  high:   { color: "#D97706", glow: "rgba(217,119,6,0.28)",  label: "HIGH",   hex: "#FFFBEB", text: "#92400E", border: "#FDE68A" },
  medium: { color: "#2563EB", glow: "rgba(37,99,235,0.25)",  label: "MEDIUM", hex: "#EFF6FF", text: "#1E40AF", border: "#BFDBFE" },
  low:    { color: "#059669", glow: "rgba(5,150,105,0.22)",  label: "LOW",    hex: "#ECFDF5", text: "#065F46", border: "#A7F3D0" },
};

/* ─── Load Google Maps script once ─── */
function loadGoogleMaps(apiKey) {
  return new Promise((resolve, reject) => {
    if (window.google?.maps) { resolve(window.google.maps); return; }
    const existing = document.getElementById("gmap-script");
    if (existing) {
      existing.addEventListener("load", () => resolve(window.google.maps));
      return;
    }
    const script = document.createElement("script");
    script.id = "gmap-script";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=visualization`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(window.google.maps);
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

/* ─── Custom SVG marker (circular, no default pin) ─── */
function buildMarkerSvg(color, size, pulse) {
  const r = size / 2;
  const ring = pulse
    ? `<circle cx="${r}" cy="${r}" r="${r - 1}" fill="none" stroke="${color}" stroke-width="2" opacity="0.5"><animate attributeName="r" from="${r - 1}" to="${r + 8}" dur="2s" repeatCount="indefinite"/><animate attributeName="opacity" from="0.6" to="0" dur="2s" repeatCount="indefinite"/></circle>`
    : "";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size + 20}" height="${size + 20}">
    ${ring}
    <circle cx="${r + 10}" cy="${r + 10}" r="${r}" fill="${color}" stroke="white" stroke-width="2.5" filter="drop-shadow(0 2px 6px ${color}66)"/>
    <circle cx="${r + 10}" cy="${r + 10}" r="${r * 0.4}" fill="white" opacity="0.85"/>
  </svg>`;
  return "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg);
}

/* ════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════ */
export default function NeedsHeatmap({ issues = [] }) {
  const mapRef    = useRef(null);
  const googleRef = useRef(null);
  const mapObj    = useRef(null);
  const markers   = useRef([]);
  const infoWin   = useRef(null);
  const heatLayer = useRef(null);

  const [mapError, setMapError]   = useState(null);
  const [mapReady, setMapReady]   = useState(false);
  const [selected, setSelected]   = useState(null); // clicked point
  const [showHeat, setShowHeat]   = useState(false);
  const [filterPri, setFilterPri] = useState("all");
  const [counts, setCounts]       = useState({ urgent: 0, high: 0, medium: 0, low: 0 });

  /* ── Merge backend issues with demo (demo fills gaps) ── */
  const points = (() => {
    if (issues.length === 0) return DEMO_POINTS;
    const mapped = issues
      .filter(i => i.lat && i.lng)
      .map(i => ({
        id: i._id, title: i.title, location: i.location,
        lat: parseFloat(i.lat), lng: parseFloat(i.lng),
        priority: i.urgency?.toLowerCase() || "medium",
        affected: i.peopleAffected || 0, category: i.category,
      }));
    return mapped.length > 0 ? mapped : DEMO_POINTS;
  })();

  const filtered = filterPri === "all" ? points : points.filter(p => p.priority === filterPri);

  /* ── Count stats ── */
  useEffect(() => {
    const c = { urgent: 0, high: 0, medium: 0, low: 0 };
    points.forEach(p => { if (c[p.priority] !== undefined) c[p.priority]++; });
    setCounts(c);
  }, [points.length]);

  /* ── Init map ── */
  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_KEY;
    if (!apiKey) { setMapError("no_key"); return; }

    loadGoogleMaps(apiKey)
      .then(gmaps => {
        googleRef.current = gmaps;
        const map = new gmaps.Map(mapRef.current, {
          center: { lat: 19.25, lng: 76.5 },
          zoom: 7,
          mapTypeId: "roadmap",
          disableDefaultUI: false,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          styles: MAP_STYLE,
        });
        mapObj.current = map;
        infoWin.current = new gmaps.InfoWindow();
        setMapReady(true);
      })
      .catch(() => setMapError("load_failed"));
  }, []);

  /* ── Place / refresh markers on filter change ── */
  useEffect(() => {
    if (!mapReady || !googleRef.current) return;
    const gmaps = googleRef.current;
    const map   = mapObj.current;

    // Clear old markers
    markers.current.forEach(m => m.setMap(null));
    markers.current = [];

    // Clear heatmap
    if (heatLayer.current) heatLayer.current.setMap(null);

    // Add markers
    filtered.forEach(pt => {
      const cfg  = PRIORITY_CFG[pt.priority] || PRIORITY_CFG.medium;
      const size = pt.priority === "urgent" ? 20 : pt.priority === "high" ? 16 : 13;
      const icon = { url: buildMarkerSvg(cfg.color, size, pt.priority === "urgent"), anchor: new gmaps.Point(size / 2 + 10, size / 2 + 10) };

      const marker = new gmaps.Marker({ position: { lat: pt.lat, lng: pt.lng }, map, icon, title: pt.title, optimized: false, zIndex: pt.priority === "urgent" ? 99 : 1 });

      marker.addListener("click", () => {
        setSelected(pt);
        infoWin.current.setContent(buildInfoWindowHtml(pt, cfg));
        infoWin.current.open({ anchor: marker, map });
      });

      markers.current.push(marker);
    });

    // Heatmap layer
    if (showHeat && gmaps.visualization) {
      const heatData = filtered.map(pt => ({
        location: new gmaps.LatLng(pt.lat, pt.lng),
        weight: pt.priority === "urgent" ? 10 : pt.priority === "high" ? 6 : 3,
      }));
      heatLayer.current = new gmaps.visualization.HeatmapLayer({
        data: heatData, map,
        radius: 50,
        gradient: ["transparent", "rgba(255,200,0,0.4)", "rgba(255,100,0,0.7)", "rgba(220,38,38,0.9)"],
      });
    }
  }, [mapReady, filtered, showHeat, filterPri]);

  /* ─── Info window HTML ─── */
  function buildInfoWindowHtml(pt, cfg) {
    return `
      <div style="font-family:'Inter',sans-serif;padding:14px 16px;min-width:220px;max-width:260px;border-radius:12px;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
          <div style="font-weight:700;font-size:.9rem;color:#111827;line-height:1.3;flex:1;margin-right:8px;">${pt.title}</div>
          <span style="padding:2px 8px;border-radius:999px;font-size:.65rem;font-weight:800;background:${cfg.hex};color:${cfg.text};border:1px solid ${cfg.border};white-space:nowrap;">${cfg.label}</span>
        </div>
        <div style="font-size:.78rem;color:#6B7280;margin-bottom:4px;">📍 ${pt.location}</div>
        <div style="font-size:.78rem;color:#6B7280;margin-bottom:12px;">👥 ${pt.affected?.toLocaleString()} people affected</div>
        <div style="height:1px;background:#F3F4F6;margin-bottom:12px;"></div>
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <div>
            <div style="font-size:.65rem;font-weight:700;color:#9CA3AF;text-transform:uppercase;letter-spacing:.06em;">Priority</div>
            <div style="font-weight:800;font-size:.9rem;color:${cfg.color};">${cfg.label}</div>
          </div>
          <button 
            onclick="window.sevaHeatmapViewDetail && window.sevaHeatmapViewDetail('${pt.id}')"
            style="
              padding:7px 16px;
              background:linear-gradient(135deg,#EF4444,#DC2626);
              color:white;border:none;border-radius:8px;
              font-weight:700;font-size:.78rem;cursor:pointer;
              font-family:inherit;
              box-shadow:0 2px 8px rgba(220,38,38,0.30);
            "
          >
            View Details →
          </button>
        </div>
      </div>
    `;
  }

  /* ─── No API key — show enhanced CSS fallback ─── */
  if (mapError) {
    return <CssFallbackMap points={points} filtered={filtered} filterPri={filterPri} setFilterPri={setFilterPri} counts={counts} showHeat={showHeat} setShowHeat={setShowHeat} selected={selected} setSelected={setSelected} />;
  }

  /* ─── Google Maps render ─── */
  return (
    <div>
      {/* ── Controls bar ── */}
      <MapControls
        filterPri={filterPri} setFilterPri={setFilterPri}
        showHeat={showHeat} setShowHeat={setShowHeat}
        counts={counts} total={points.length}
      />

      {/* ── Map container ── */}
      <div style={{ position: "relative", borderRadius: 12, overflow: "hidden", border: "1px solid var(--border-light)" }}>
        <div ref={mapRef} style={{ width: "100%", height: 360 }} />
        {!mapReady && (
          <div style={{
            position: "absolute", inset: 0,
            background: "var(--bg-subtle)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexDirection: "column", gap: 12,
          }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", border: "3px solid var(--border)", borderTopColor: "var(--red-500)", animation: "spin 0.7s linear infinite" }} />
            <div style={{ fontSize: ".8rem", color: "var(--text-muted)", fontWeight: 500 }}>Loading map…</div>
          </div>
        )}
      </div>

      {/* ── Legend ── */}
      <MapLegend counts={counts} />

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

/* ════════════════════════════════
   CONTROLS BAR
════════════════════════════════ */
function MapControls({ filterPri, setFilterPri, showHeat, setShowHeat, counts, total }) {
  const priorities = ["all", "urgent", "high", "medium", "low"];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
        {priorities.map(p => {
          const cfg = PRIORITY_CFG[p];
          const active = filterPri === p;
          const count = p === "all" ? total : counts[p];
          return (
            <button
              key={p}
              type="button"
              onClick={() => setFilterPri(p)}
              style={{
                padding: "4px 12px",
                borderRadius: 999,
                border: `1.5px solid ${active ? (cfg?.color || "var(--red-600)") : "var(--border)"}`,
                background: active ? (cfg?.hex || "var(--red-50)") : "white",
                color: active ? (cfg?.text || "var(--red-700)") : "var(--text-secondary)",
                fontWeight: active ? 700 : 500,
                fontSize: ".75rem",
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "all 0.18s ease",
                display: "flex", alignItems: "center", gap: 5,
              }}
            >
              {p !== "all" && (
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: cfg.color, flexShrink: 0 }} />
              )}
              {p.charAt(0).toUpperCase() + p.slice(1)}
              <span style={{
                padding: "0 5px", borderRadius: 999, fontSize: ".65rem",
                background: active ? "rgba(0,0,0,0.08)" : "var(--bg-subtle)",
                minWidth: 18, textAlign: "center",
              }}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Heatmap toggle */}
      <div style={{ marginLeft: "auto" }}>
        <button
          type="button"
          onClick={() => setShowHeat(v => !v)}
          style={{
            padding: "4px 14px",
            borderRadius: 999,
            border: `1.5px solid ${showHeat ? "var(--red-400)" : "var(--border)"}`,
            background: showHeat ? "var(--red-50)" : "white",
            color: showHeat ? "var(--red-700)" : "var(--text-secondary)",
            fontWeight: 600, fontSize: ".75rem",
            cursor: "pointer", fontFamily: "inherit",
            display: "flex", alignItems: "center", gap: 6,
            transition: "all 0.18s ease",
          }}
        >
          <span style={{ fontSize: "1rem" }}>🌡️</span>
          Heatmap {showHeat ? "ON" : "OFF"}
        </button>
      </div>
    </div>
  );
}

/* ════════════════════════════════
   LEGEND
════════════════════════════════ */
function MapLegend({ counts }) {
  return (
    <div style={{
      display: "flex", gap: 20, marginTop: 12, flexWrap: "wrap",
    }}>
      {Object.entries(PRIORITY_CFG).map(([key, cfg]) => (
        <div key={key} style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span style={{
            width: 10, height: 10, borderRadius: "50%",
            background: cfg.color, flexShrink: 0,
            boxShadow: key === "urgent" ? `0 0 0 3px ${cfg.glow}` : "none",
          }} />
          <span style={{ fontSize: ".75rem", color: "var(--text-secondary)", fontWeight: 600 }}>
            {cfg.label}
          </span>
          <span style={{
            padding: "1px 7px", borderRadius: 999, fontSize: ".65rem",
            background: cfg.hex, color: cfg.text, fontWeight: 700,
          }}>
            {counts[key] || 0}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ════════════════════════════════
   CSS-ONLY FALLBACK (no API key)
════════════════════════════════ */
function CssFallbackMap({ points, filtered, filterPri, setFilterPri, counts, showHeat, setShowHeat, selected, setSelected }) {
  return (
    <div>
      {/* Setup tip */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "8px 14px", borderRadius: "var(--radius-sm)",
        background: "var(--amber-50)", border: "1px solid #FDE68A",
        marginBottom: 14, fontSize: ".78rem", color: "#92400E",
      }}>
        <span style={{ fontSize: "1rem" }}>💡</span>
        <span>
          <b>Add API key</b> to enable Google Maps:{" "}
          <code style={{ background: "rgba(0,0,0,0.06)", padding: "1px 6px", borderRadius: 4 }}>
            VITE_GOOGLE_MAPS_KEY=your_key
          </code>{" "}
          in <code style={{ background: "rgba(0,0,0,0.06)", padding: "1px 6px", borderRadius: 4 }}>frontend/.env</code>
        </span>
      </div>

      <MapControls filterPri={filterPri} setFilterPri={setFilterPri} showHeat={showHeat} setShowHeat={setShowHeat} counts={counts} total={points.length} />

      {/* Interactive CSS map */}
      <div style={{
        position: "relative", height: 340,
        background: "linear-gradient(160deg, #E9F2F8 0%, #D5E9F5 40%, #C8DEF2 100%)",
        borderRadius: 12, overflow: "hidden",
        border: "1px solid var(--border-light)",
      }}>
        {/* SVG road network */}
        <svg width="100%" height="100%" style={{ position: "absolute", inset: 0 }}>
          <defs>
            <pattern id="mapgrid" width="50" height="50" patternUnits="userSpaceOnUse">
              <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#A8C8DC" strokeWidth="0.6"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#mapgrid)" />
          {/* "Roads" */}
          <path d="M 0,55% Q 30%,48% 50%,52% T 100%,55%" fill="none" stroke="#C0D8E8" strokeWidth="10"/>
          <path d="M 20%,0 Q 25%,35% 28%,70% T 22%,100%" fill="none" stroke="#C0D8E8" strokeWidth="7"/>
          <path d="M 60%,0 Q 63%,40% 60%,75% T 65%,100%" fill="none" stroke="#C0D8E8" strokeWidth="7"/>
          <path d="M 0,30% L 100%,28%" fill="none" stroke="#D0E4EF" strokeWidth="4"/>
          {/* Heatmap overlay blobs */}
          {showHeat && filtered.filter(p => p.priority === "urgent" || p.priority === "high").map((p, i) => {
            const cfg = PRIORITY_CFG[p.priority];
            const left = getRelX(p.lng);
            const top  = getRelY(p.lat);
            return (
              <ellipse key={i}
                cx={`${left}%`} cy={`${top}%`}
                rx="8%" ry="6%"
                fill={cfg.glow}
                filter="url(#blur)"
              />
            );
          })}
          <defs>
            <filter id="blur"><feGaussianBlur stdDeviation="8"/></filter>
          </defs>
        </svg>

        {/* Markers */}
        {filtered.map(pt => {
          const cfg  = PRIORITY_CFG[pt.priority] || PRIORITY_CFG.medium;
          const left = getRelX(pt.lng);
          const top  = getRelY(pt.lat);
          const size = pt.priority === "urgent" ? 18 : pt.priority === "high" ? 14 : 11;
          const isSel = selected?.id === pt.id;
          return (
            <div
              key={pt.id}
              title={`${pt.title} — ${pt.location}`}
              onClick={() => setSelected(isSel ? null : pt)}
              style={{
                position: "absolute",
                left: `${left}%`, top: `${top}%`,
                transform: "translate(-50%, -50%)",
                cursor: "pointer", zIndex: isSel ? 20 : 5,
              }}
            >
              {/* Pulse ring for urgent */}
              {pt.priority === "urgent" && (
                <div style={{
                  position: "absolute", inset: -8,
                  borderRadius: "50%",
                  background: cfg.glow,
                  animation: "heatPulse 2s ease-in-out infinite",
                }} />
              )}
              {/* Dot */}
              <div style={{
                width: size, height: size,
                borderRadius: "50%",
                background: cfg.color,
                border: `${isSel ? 3 : 2}px solid white`,
                boxShadow: `0 2px 8px ${cfg.glow}, 0 0 0 ${isSel ? 5 : 0}px ${cfg.glow}`,
                transition: "all 0.2s var(--ease-spring)",
                transform: isSel ? "scale(1.5)" : "scale(1)",
              }} />
            </div>
          );
        })}

        {/* Selected info card */}
        {selected && (() => {
          const cfg  = PRIORITY_CFG[selected.priority] || PRIORITY_CFG.medium;
          const left = Math.min(85, Math.max(5, getRelX(selected.lng)));
          const top  = Math.min(70, Math.max(5, getRelY(selected.lat)));
          return (
            <div style={{
              position: "absolute",
              left: `${left}%`, top: `${top}%`,
              transform: "translate(-50%, calc(-100% - 16px))",
              background: "white", borderRadius: 12,
              boxShadow: "0 12px 40px rgba(0,0,0,0.18)",
              border: "1px solid var(--border)",
              padding: "14px 16px", minWidth: 220, zIndex: 30,
              animation: "fadeUp 0.2s ease-out",
            }}>
              {/* Arrow */}
              <div style={{
                position: "absolute", bottom: -7, left: "50%", transform: "translateX(-50%)",
                width: 14, height: 14, background: "white",
                borderRight: "1px solid var(--border)", borderBottom: "1px solid var(--border)",
                rotate: "45deg",
              }} />

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8, gap: 8 }}>
                <div style={{ fontWeight: 700, fontSize: ".875rem", color: "var(--text-primary)", lineHeight: 1.3, flex: 1 }}>
                  {selected.title}
                </div>
                <button
                  type="button" onClick={() => setSelected(null)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: "1.1rem", lineHeight: 1, padding: 0 }}
                >×</button>
              </div>

              <div style={{ fontSize: ".75rem", color: "var(--text-secondary)", marginBottom: 4, display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: ".9rem" }}>📍</span> {selected.location}
              </div>
              <div style={{ fontSize: ".75rem", color: "var(--text-secondary)", marginBottom: 12, display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: ".9rem" }}>👥</span> {(selected.affected || 0).toLocaleString()} people affected
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{
                  padding: "3px 10px", borderRadius: 999, fontSize: ".68rem",
                  background: cfg.hex, color: cfg.text,
                  border: `1px solid ${cfg.border}`, fontWeight: 800,
                }}>
                  {cfg.label}
                </span>
                <button style={{
                  padding: "6px 14px",
                  background: "linear-gradient(135deg,#EF4444,#DC2626)",
                  color: "white", border: "none",
                  borderRadius: 8, fontWeight: 700, fontSize: ".75rem",
                  cursor: "pointer", fontFamily: "inherit",
                  boxShadow: "0 2px 8px rgba(220,38,38,0.28)",
                }}>
                  View Details →
                </button>
              </div>
            </div>
          );
        })()}

        {/* Legend overlay */}
        <div style={{
          position: "absolute", top: 12, right: 12,
          background: "rgba(255,255,255,0.95)", backdropFilter: "blur(8px)",
          borderRadius: 10, padding: "10px 14px",
          boxShadow: "var(--shadow-sm)", border: "1px solid var(--border-light)",
          display: "flex", flexDirection: "column", gap: 6,
        }}>
          {Object.entries(PRIORITY_CFG).map(([key, cfg]) => (
            <div key={key} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: ".72rem", color: "var(--text-secondary)", fontWeight: 500 }}>
              <span style={{
                width: 9, height: 9, borderRadius: "50%", background: cfg.color, flexShrink: 0,
                boxShadow: key === "urgent" ? `0 0 0 2px ${cfg.glow}` : "none",
              }} />
              {cfg.label}
              <span style={{ color: "var(--text-muted)", marginLeft: 2 }}>
                ({counts[key] || 0})
              </span>
            </div>
          ))}
        </div>

        <style>{`
          @keyframes heatPulse {
            0%, 100% { opacity: 0.6; transform: scale(1); }
            50%       { opacity: 0; transform: scale(2.2); }
          }
          @keyframes fadeUp {
            from { opacity: 0; transform: translate(-50%, calc(-100% - 10px)); }
            to   { opacity: 1; transform: translate(-50%, calc(-100% - 16px)); }
          }
        `}</style>
      </div>

      <MapLegend counts={counts} />
    </div>
  );
}

/* ── Convert lng/lat to % within Maharashtra bounds ── */
function getRelX(lng) { return Math.max(2, Math.min(97, ((lng - 72.5) / (81 - 72.5)) * 100)); }
function getRelY(lat) { return Math.max(2, Math.min(95, ((24 - lat) / (24 - 15.5)) * 86 + 4)); }

/* ─────────────────────────────────────────────
   Google Maps style — clean, minimal white
───────────────────────────────────────────── */
const MAP_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#F8FAFC" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#374151" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#FFFFFF" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#E5E7EB" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#4B5563" }] },
  { featureType: "landscape", stylers: [{ color: "#F1F5F9" }] },
  { featureType: "poi", elementType: "geometry", stylers: [{ color: "#ECFDF5" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#D1FAE5" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#FFFFFF" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#E5E7EB" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#FEF9C3" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#FDE68A" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#BAE6FD" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#60A5FA" }] },
];
