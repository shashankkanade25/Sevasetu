import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../firebase";
import { checkUserExistence } from "../api";
import SevaSetuLogo from "../components/SevaSetuLogo";

/* ── Google Icon ── */
function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
      <path fill="#4285F4" d="M46.145 24.5c0-1.567-.14-3.08-.4-4.545H24v8.6h12.44c-.536 2.762-2.165 5.1-4.617 6.667v5.542h7.477c4.37-4.023 6.845-9.95 6.845-16.264z"/>
      <path fill="#34A853" d="M24 47c6.24 0 11.474-2.067 15.299-5.596l-7.477-5.542C29.713 37.74 27.07 38.5 24 38.5c-6.013 0-11.103-4.062-12.923-9.53H3.39v5.72C7.198 42.445 15.02 47 24 47z"/>
      <path fill="#FBBC05" d="M11.077 28.97A14.8 14.8 0 0 1 10.5 24c0-1.73.298-3.41.577-4.97v-5.72H3.39A23.935 23.935 0 0 0 0 24c0 3.87.93 7.53 2.574 10.69l8.503-5.72z"/>
      <path fill="#EA4335" d="M24 9.5c3.39 0 6.437 1.166 8.836 3.453l6.623-6.623C35.47 2.535 30.237 0 24 0 15.02 0 7.198 4.555 3.39 13.31l8.687 5.72C13.897 13.562 18.987 9.5 24 9.5z"/>
    </svg>
  );
}

/* ── Spinner ── */
function Spin() {
  return (
    <svg style={{ animation: "_sp .8s linear infinite" }} width="18" height="18" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" opacity=".3"/>
      <path d="M4 12a8 8 0 018-8" stroke="white" strokeWidth="3" strokeLinecap="round"/>
    </svg>
  );
}

/* ══════════════════════════════════════════════════════
   MAIN COMPONENT — Full-screen hero auth page
══════════════════════════════════════════════════════ */
export default function AuthPage({ onLogin }) {
  const [role, setRole]       = useState("ngo");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const navigate = useNavigate();

  const clr = () => setError("");

  /* ── Auth logic (UNCHANGED) ── */
  const doGoogle = async () => {
    clr();
    setLoading(true);
    sessionStorage.setItem("seva_role", role);

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const firebaseUser = result.user;

      const res = await checkUserExistence(firebaseUser.email);

      if (res.data.exists) {
        localStorage.setItem("seva_token", res.data.token);
        onLogin({ ...firebaseUser, role: res.data.role, dbUser: res.data.user, token: res.data.token });
      } else {
        navigate("/complete-profile", {
          state: {
            email: firebaseUser.email,
            name: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            role: role,
          },
        });
      }
    } catch (err) {
      console.error("Google Auth Error:", err);
      setError(err.message || "Google sign-in failed.");
    } finally {
      setLoading(false);
    }
  };

  /* ── Role config ── */
  const roles = [
    { v: "ngo",       l: "NGO Admin",  icon: "🏛️" },
    { v: "volunteer", l: "Volunteer",   icon: "🤝" },
  ];

  return (
    <>
      {/* ── Keyframe animations ── */}
      <style>{`
        @keyframes _sp { to { transform: rotate(360deg); } }
        @keyframes _fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes _fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes _slideIn {
          from { opacity: 0; transform: translateX(-40px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .auth-google-btn:hover {
          transform: scale(1.03) !important;
          box-shadow: 0 8px 30px rgba(0,0,0,.25) !important;
        }
        .auth-role-btn:hover {
          transform: scale(1.04);
        }
        * { box-sizing: border-box; }
      `}</style>

      {/* ── Full-screen container ── */}
      <div style={{
        position: "fixed", inset: 0,
        width: "100vw", height: "100vh",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        overflow: "hidden",
      }}>

        {/* ── Background image ── */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: "url('/background.png')",
          backgroundSize: "cover",
          backgroundPosition: "right center",
          backgroundRepeat: "no-repeat",
        }} />

        {/* ── Dark overlay (no blur — crisp background) ── */}
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(135deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.15) 50%, rgba(0,0,0,0.40) 100%)",
        }} />

        {/* ── Content layer ── */}
        <div style={{
          position: "relative", zIndex: 2,
          width: "100%", height: "100%",
          display: "flex", alignItems: "center",
          padding: "40px 60px",
        }}>

          {/* ═══════════════════════════════════════════
              LEFT — Glassmorphism auth card
          ═══════════════════════════════════════════ */}
          <div style={{
            width: 420, maxWidth: "90vw",
            background: "rgba(255,255,255,0.1)",
            border: "1px solid rgba(255,255,255,0.2)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            borderRadius: 24,
            padding: "40px 36px",
            animation: "_slideIn 0.7s ease-out both",
            boxShadow: "0 24px 80px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.15)",
          }}>

            {/* Logo — using exact SVG component for a symbol look */}
            <div style={{
              display: "flex", justifyContent: "center", marginBottom: 24,
              animation: "_fadeUp 0.6s ease-out 0.1s both",
            }}>
              <div style={{
                filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))",
              }}>
                <SevaSetuLogo
                  width={140}
                  colors={{ red: "#EF4444", gold: "#EF4444", green: "#EF4444", blue: "#EF4444", text: "#FFFFFF" }}
                />
              </div>
            </div>

            {/* Headline */}
            <div style={{
              textAlign: "center", marginBottom: 28,
              animation: "_fadeUp 0.6s ease-out 0.2s both",
            }}>
              <h1 style={{
                fontSize: "1.85rem", fontWeight: 800,
                color: "white", margin: "0 0 8px",
                letterSpacing: "-0.02em",
                textShadow: "0 2px 8px rgba(0,0,0,0.3)",
              }}>
                Welcome back
              </h1>
              <p style={{
                color: "rgba(255,255,255,0.75)", fontSize: "0.9rem",
                margin: 0, lineHeight: 1.5, fontWeight: 400,
              }}>
                Connecting NGOs with Volunteers for a<br/>Better Tomorrow.
              </p>
            </div>

            {/* Role selector */}
            <div style={{
              marginBottom: 24,
              animation: "_fadeUp 0.6s ease-out 0.3s both",
            }}>
              <label style={{
                display: "block", fontSize: "0.7rem", fontWeight: 700,
                color: "rgba(255,255,255,0.6)", marginBottom: 10,
                letterSpacing: "0.1em", textTransform: "uppercase",
              }}>
                Select Your Role
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {roles.map((r) => {
                  const active = role === r.v;
                  return (
                    <button
                      key={r.v}
                      className="auth-role-btn"
                      onClick={() => { setRole(r.v); clr(); }}
                      style={{
                        padding: "12px 16px",
                        borderRadius: 14,
                        border: active ? "2px solid rgba(255,255,255,0.9)" : "1.5px solid rgba(255,255,255,0.25)",
                        background: active ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.06)",
                        color: active ? "#7F1D1D" : "rgba(255,255,255,0.85)",
                        fontWeight: active ? 700 : 500,
                        fontSize: "0.88rem",
                        cursor: "pointer",
                        transition: "all 0.25s ease",
                        fontFamily: "inherit",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                        boxShadow: active ? "0 4px 16px rgba(0,0,0,0.15)" : "none",
                      }}
                    >
                      <span style={{ fontSize: "1.05rem" }}>{r.icon}</span>
                      {r.l}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Divider text */}
            <p style={{
              textAlign: "center", fontSize: "0.82rem",
              color: "rgba(255,255,255,0.55)", margin: "0 0 14px",
              animation: "_fadeUp 0.6s ease-out 0.35s both",
            }}>
              Continue with Google to get started.
            </p>

            {/* Google button */}
            <div style={{ animation: "_fadeUp 0.6s ease-out 0.4s both" }}>
              <button
                className="auth-google-btn"
                onClick={doGoogle}
                disabled={loading}
                style={{
                  width: "100%", padding: "14px 20px",
                  background: "linear-gradient(135deg, #991B1B, #7F1D1D)",
                  color: "white",
                  border: "none", borderRadius: 14,
                  fontWeight: 700, fontSize: "0.95rem",
                  fontFamily: "inherit",
                  cursor: loading ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                  opacity: loading ? 0.7 : 1,
                  transition: "all 0.3s ease",
                  boxShadow: "0 6px 24px rgba(127,29,29,0.4)",
                }}
              >
                {loading ? <Spin /> : (
                  <span style={{
                    width: 28, height: 28, borderRadius: 8,
                    background: "white",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                  }}>
                    <GoogleIcon />
                  </span>
                )}
                {loading ? "Authenticating..." : "Continue with Google"}
              </button>
            </div>

            {/* Error display */}
            {error && (
              <div style={{
                marginTop: 14, padding: "10px 14px",
                background: "rgba(239,68,68,0.15)",
                border: "1px solid rgba(239,68,68,0.3)",
                borderRadius: 10,
                fontSize: "0.82rem", color: "#FCA5A5",
                fontWeight: 500, display: "flex", gap: 8, alignItems: "center",
              }}>
                <span style={{ fontSize: 14 }}>⚠</span> {error}
              </div>
            )}

            {/* Footer */}
            <p style={{
              textAlign: "center", fontSize: "0.7rem",
              color: "rgba(255,255,255,0.35)", marginTop: 20, marginBottom: 0,
              animation: "_fadeUp 0.6s ease-out 0.5s both",
            }}>
              By continuing, you agree to SevaSetu's Terms and Privacy Policy.
            </p>
          </div>

          {/* ═══════════════════════════════════════════
              RIGHT / BOTTOM — Storytelling text
          ═══════════════════════════════════════════ */}
          <div style={{
            position: "absolute",
            bottom: 60, right: 60,
            maxWidth: 600,
            animation: "_fadeUp 0.8s ease-out 0.5s both",
          }}>
            <h2 style={{
              fontSize: "2.75rem", fontWeight: 900,
              color: "white", lineHeight: 1.1,
              margin: "0 0 14px",
              textShadow: "0 4px 20px rgba(0,0,0,0.5)",
              fontFamily: "'Georgia', 'Times New Roman', serif",
              fontStyle: "italic",
              whiteSpace: "nowrap",
            }}>
              Building Bridges,<br/>
              Building Communities.
            </h2>
            <p style={{
              color: "rgba(255,255,255,0.8)",
              fontSize: "1.05rem", fontWeight: 400,
              lineHeight: 1.5, margin: 0,
              textShadow: "0 2px 8px rgba(0,0,0,0.4)",
              maxWidth: 400,
            }}>
              Empowering change through collaborative<br/>
              action and volunteer efforts.
            </p>

          </div>
        </div>
      </div>
    </>
  );
}
