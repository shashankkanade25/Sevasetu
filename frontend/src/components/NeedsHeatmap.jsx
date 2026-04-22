import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.heat";

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

/* ─── Custom SVG marker ─── */
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
  const mapObj    = useRef(null);
  const markers   = useRef([]);
  const heatLayer = useRef(null);

  const [mapReady, setMapReady]   = useState(false);
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

  /* ── Init Leaflet map ── */
  useEffect(() => {
    if (!mapRef.current || mapObj.current) return;
    
    const map = L.map(mapRef.current).setView([19.25, 76.5], 7);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    mapObj.current = map;
    setMapReady(true);

    return () => {
      if (mapObj.current) {
        mapObj.current.remove();
        mapObj.current = null;
      }
    };
  }, []);

  /* ── Place / refresh markers on filter change ── */
  useEffect(() => {
    if (!mapReady || !mapObj.current) return;
    const map = mapObj.current;

    // Clear old markers
    markers.current.forEach(m => map.removeLayer(m));
    markers.current = [];

    // Clear heatmap
    if (heatLayer.current) {
      map.removeLayer(heatLayer.current);
      heatLayer.current = null;
    }

    // Add markers
    filtered.forEach(pt => {
      const cfg  = PRIORITY_CFG[pt.priority] || PRIORITY_CFG.medium;
      const size = pt.priority === "urgent" ? 20 : pt.priority === "high" ? 16 : 13;
      const svgUrl = buildMarkerSvg(cfg.color, size, pt.priority === "urgent");
      
      const icon = L.divIcon({
        html: `<img src="${svgUrl}" style="width:${size + 20}px;height:${size + 20}px;outline:none;" />`,
        className: 'leaflet-custom-marker',
        iconSize: [size + 20, size + 20],
        iconAnchor: [size / 2 + 10, size / 2 + 10],
        popupAnchor: [0, -(size / 2 + 10)]
      });

      const marker = L.marker([pt.lat, pt.lng], { icon, zIndexOffset: pt.priority === "urgent" ? 1000 : 0 }).addTo(map);

      marker.bindPopup(buildInfoWindowHtml(pt, cfg));
      markers.current.push(marker);
    });

    // Heatmap layer
    if (showHeat && L.heatLayer) {
      const heatData = filtered.map(pt => [
        pt.lat, pt.lng, pt.priority === "urgent" ? 1.0 : pt.priority === "high" ? 0.6 : 0.3
      ]);
      
      heatLayer.current = L.heatLayer(heatData, {
        radius: 25,
        blur: 15,
        maxZoom: 10,
        gradient: {0.4: "blue", 0.65: "orange", 1: "red"}
      }).addTo(map);
    }
  }, [mapReady, filtered, showHeat, filterPri]);

  /* ─── Info window HTML ─── */
  function buildInfoWindowHtml(pt, cfg) {
    return `
      <div style="font-family:'Inter',sans-serif;min-width:200px;">
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
            Details →
          </button>
        </div>
      </div>
    `;
  }

  /* ─── Map render ─── */
  return (
    <div>
      <MapControls
        filterPri={filterPri} setFilterPri={setFilterPri}
        showHeat={showHeat} setShowHeat={setShowHeat}
        counts={counts} total={points.length}
      />

      <div style={{ position: "relative", borderRadius: 12, overflow: "hidden", border: "1px solid var(--border-light)" }}>
        <div ref={mapRef} style={{ width: "100%", height: 360, zIndex: 1 }} />
      </div>

      <MapLegend counts={counts} />

      <style>{`
        .leaflet-popup-content-wrapper { border-radius: 12px; box-shadow: 0 12px 40px rgba(0,0,0,0.18); border: 1px solid #E5E7EB; }
        .leaflet-custom-marker { background: none; border: none; }
      `}</style>
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
                border: `1.5px solid \${active ? (cfg?.color || "var(--red-600)") : "var(--border)"}`,
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

      <div style={{ marginLeft: "auto" }}>
        <button
          type="button"
          onClick={() => setShowHeat(v => !v)}
          style={{
            padding: "4px 14px",
            borderRadius: 999,
            border: `1.5px solid \${showHeat ? "var(--red-400)" : "var(--border)"}`,
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
