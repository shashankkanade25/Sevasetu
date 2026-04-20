import { useState } from "react";
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { auth, googleProvider } from "../firebase";
import SevaSetuLogo from "../components/SevaSetuLogo";

export default function Login({ onLogin }) {
  const [role, setRole] = useState("NGO");
  const [mode, setMode] = useState("signup");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // NGO fields
  const [ngoName, setNgoName] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [focusArea, setFocusArea] = useState("");

  // Volunteer fields
  const [fullName, setFullName] = useState("");
  const [city, setCity] = useState("");
  const [skills, setSkills] = useState("");

  const clearError = () => setError("");

  const isMissingApiKey =
    import.meta.env.VITE_FIREBASE_API_KEY === "REPLACE_ME_WITH_YOUR_ACTUAL_API_KEY" ||
    !import.meta.env.VITE_FIREBASE_API_KEY;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    clearError();
    try {
      if (isMissingApiKey) {
        onLogin({
          uid: "demo-" + Date.now(),
          displayName:
            role === "NGO" ? ngoName || "NGO Demo" : fullName || "Volunteer Demo",
          email: email || "demo@example.com",
          role,
        });
        return;
      }
      if (mode === "signup") {
        const displayName = role === "NGO" ? ngoName : fullName;
        if (!displayName) throw new Error("Name is required.");
        if (password.length < 8)
          throw new Error("Password must be at least 8 characters.");
        const result = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(result.user, { displayName });
        onLogin({ ...result.user, role });
      } else {
        const result = await signInWithEmailAndPassword(auth, email, password);
        onLogin({ ...result.user, role });
      }
    } catch (err) {
      if (
        err.code === "auth/invalid-credential" ||
        err.code === "auth/user-not-found" ||
        err.code === "auth/wrong-password"
      )
        setError("Invalid email or password.");
      else if (err.code === "auth/email-already-in-use")
        setError("This email is already registered.");
      else if (err.code === "auth/weak-password")
        setError("Password must be at least 8 characters.");
      else setError(err.message || "Authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    try {
      if (isMissingApiKey) {
        onLogin({
          uid: "google-demo",
          displayName: "Google User",
          email: "google@demo.com",
          role,
        });
        return;
      }
      const result = await signInWithPopup(auth, googleProvider);
      onLogin({ ...result.user, role });
    } catch (err) {
      setError(err.message || "Google Sign-In failed.");
    }
  };

  const isNGO = role === "NGO";
  const isLogin = mode === "login";

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #ece8ff 0%, #f5f3ff 40%, #eef0ff 100%)",
        padding: 0,
        fontFamily:
          "'Inter', 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif",
        boxSizing: "border-box",
      }}
    >
      {/* ─── LOGO ABOVE CARD ─── */}
      <div style={{ textAlign: "center", marginBottom: 4, userSelect: "none", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <SevaSetuLogo width={160} showText={true} />
        <p
          style={{
            fontSize: 12,
            color: "#666",
            fontWeight: 500,
            letterSpacing: 0.2,
            margin: "0",
            opacity: 0.8
          }}
        >
          Connecting NGOs with Volunteers for a Better Tomorrow.
        </p>
      </div>

      {/* ─── MAIN CARD ─── */}
      <div
        style={{
          width: "92%",
          maxWidth: 1040,
          background: "#fff",
          borderRadius: 32,
          boxShadow: "0 20px 70px rgba(108, 71, 255, 0.10), 0 2px 12px rgba(0,0,0,0.04)",
          display: "flex",
          overflow: "hidden",
          minHeight: 480,
        }}
      >
        {/* ═══════ LEFT PANEL ═══════ */}
        <div
          style={{
            flex: "1 1 54%",
            padding: "16px 30px 14px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          {/* ROLE SELECTOR */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
            {/* NGO Card */}
            <button
              type="button"
              onClick={() => { setRole("NGO"); clearError(); }}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                padding: "10px 10px",
                borderRadius: 14,
                border: isNGO ? "2.5px solid #6c47ff" : "2px solid #e5e5e5",
                background: isNGO ? "#f8f5ff" : "#fff",
                cursor: "pointer",
                transition: "all 0.2s",
                outline: "none",
              }}
            >
              <span
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 12,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: isNGO ? "#6c47ff" : "#f3f3f3",
                  color: isNGO ? "#fff" : "#888",
                  transition: "all 0.2s",
                }}
              >
                <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
                </svg>
              </span>
              <span
                style={{
                  fontWeight: 700,
                  fontSize: 13,
                  color: isNGO ? "#6c47ff" : "#666",
                }}
              >
                NGO
              </span>
            </button>

            {/* Volunteer Card */}
            <button
              type="button"
              onClick={() => { setRole("Volunteer"); clearError(); }}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                padding: "10px 10px",
                borderRadius: 14,
                border: !isNGO ? "2.5px solid #6c47ff" : "2px solid #e5e5e5",
                background: !isNGO ? "#f8f5ff" : "#fff",
                cursor: "pointer",
                transition: "all 0.2s",
                outline: "none",
              }}
            >
              <span
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 12,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: !isNGO ? "#6c47ff" : "#f3f3f3",
                  color: !isNGO ? "#fff" : "#888",
                  transition: "all 0.2s",
                }}
              >
                <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </span>
              <span
                style={{
                  fontWeight: 700,
                  fontSize: 13,
                  color: !isNGO ? "#6c47ff" : "#666",
                }}
              >
                Volunteer
              </span>
            </button>
          </div>

          {/* ERROR */}
          {error && (
            <div
              style={{
                marginBottom: 14,
                fontSize: 12.5,
                fontWeight: 600,
                color: "#dc2626",
                background: "#fef2f2",
                border: "1px solid #fecaca",
                borderRadius: 10,
                padding: "8px 14px",
                textAlign: "center",
              }}
            >
              {error}
            </div>
          )}

          {/* FORM */}
          <form onSubmit={handleSubmit}>
            {/* ── SIGNUP: NGO ── */}
            {!isLogin && isNGO && (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                  <div>
                    <label style={labelStyle}>NGO Name</label>
                    <input
                      style={inputStyle}
                      type="text"
                      required
                      placeholder="NGO name"
                      value={ngoName}
                      onChange={(e) => { setNgoName(e.target.value); clearError(); }}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Contact Person</label>
                    <input
                      style={inputStyle}
                      type="text"
                      required
                      placeholder="contact person"
                      value={contactPerson}
                      onChange={(e) => { setContactPerson(e.target.value); clearError(); }}
                    />
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                  <div>
                    <label style={labelStyle}>NGO Email</label>
                    <input
                      style={inputStyle}
                      type="email"
                      required
                      placeholder="email address"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); clearError(); }}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Password</label>
                    <input
                      style={inputStyle}
                      type="password"
                      required
                      placeholder="password (min. 8 characters)"
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); clearError(); }}
                    />
                  </div>
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={labelStyle}>NGO Focus Area</label>
                  <select
                    style={{ ...inputStyle, cursor: "pointer", color: focusArea ? "#333" : "#999" }}
                    value={focusArea}
                    onChange={(e) => setFocusArea(e.target.value)}
                  >
                    <option value="">e.g., Education, Healthcare</option>
                    <option value="Education">📚 Education</option>
                    <option value="Healthcare">🏥 Healthcare</option>
                    <option value="Environment">🌿 Environment</option>
                    <option value="Women Empowerment">💪 Women Empowerment</option>
                    <option value="Child Welfare">👶 Child Welfare</option>
                    <option value="Disaster Relief">🆘 Disaster Relief</option>
                    <option value="Livelihood">🤝 Livelihood</option>
                  </select>
                </div>
              </>
            )}

            {/* ── SIGNUP: VOLUNTEER ── */}
            {!isLogin && !isNGO && (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                  <div>
                    <label style={labelStyle}>Full Name</label>
                    <input
                      style={inputStyle}
                      type="text"
                      required
                      placeholder="full name"
                      value={fullName}
                      onChange={(e) => { setFullName(e.target.value); clearError(); }}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Email Address</label>
                    <input
                      style={inputStyle}
                      type="email"
                      required
                      placeholder="email address"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); clearError(); }}
                    />
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
                  <div>
                    <label style={labelStyle}>City/Location</label>
                    <input
                      style={inputStyle}
                      type="text"
                      placeholder="location"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Password</label>
                    <input
                      style={inputStyle}
                      type="password"
                      required
                      placeholder="password (min. 8 characters)"
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); clearError(); }}
                    />
                  </div>
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={labelStyle}>Your Skills</label>
                  <input
                    style={inputStyle}
                    type="text"
                    placeholder="e.g., Teaching, Mentoring, Medical Aid"
                    value={skills}
                    onChange={(e) => setSkills(e.target.value)}
                  />
                </div>
              </>
            )}

            {/* ── LOGIN FIELDS ── */}
            {isLogin && (
              <>
                <div style={{ marginBottom: 12 }}>
                  <label style={labelStyle}>Email Address</label>
                  <input
                    style={inputStyle}
                    type="email"
                    required
                    placeholder="email address"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); clearError(); }}
                  />
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={labelStyle}>Password</label>
                  <input
                    style={inputStyle}
                    type="password"
                    required
                    placeholder="password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); clearError(); }}
                  />
                </div>
              </>
            )}

            {/* SUBMIT */}
            <button type="submit" disabled={loading} style={submitBtnStyle}>
              {loading ? (
                <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <svg style={{ animation: "spin 1s linear infinite" }} width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" opacity="0.3" />
                    <path d="M4 12a8 8 0 018-8" stroke="white" strokeWidth="3" strokeLinecap="round" />
                  </svg>
                  Please wait…
                </span>
              ) : isLogin
                ? `Login as ${role}`
                : `Create ${isNGO ? "NGO" : "Volunteer"} Account`}
            </button>
          </form>

          {/* GOOGLE SSO */}
          <div style={{ marginTop: 20, textAlign: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <div style={{ flex: 1, height: 1, background: "#e5e5e5" }} />
              <span style={{ fontSize: 12, color: "#999", fontWeight: 500, whiteSpace: "nowrap" }}>
                Or continue with:
              </span>
              <div style={{ flex: 1, height: 1, background: "#e5e5e5" }} />
            </div>
            <button
              type="button"
              onClick={handleGoogle}
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                border: "2px solid #e5e5e5",
                background: "#fff",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#6c47ff";
                e.currentTarget.style.boxShadow = "0 4px 14px rgba(108,71,255,0.15)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#e5e5e5";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <img
                src="https://www.svgrepo.com/show/475656/google-color.svg"
                alt="Google"
                style={{ width: 22, height: 22 }}
              />
            </button>
          </div>

          {/* TOGGLE MODE */}
          <p style={{ textAlign: "center", fontSize: 13, color: "#888", fontWeight: 500, marginTop: 18 }}>
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              type="button"
              onClick={() => { setMode(isLogin ? "signup" : "login"); clearError(); }}
              style={{
                background: "none",
                border: "none",
                color: "#6c47ff",
                fontWeight: 700,
                cursor: "pointer",
                fontSize: 13,
                textDecoration: "none",
                padding: 0,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.textDecoration = "underline")}
              onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
            >
              {isLogin ? "Sign Up" : "Login"}
            </button>
          </p>
        </div>

        {/* ═══════ RIGHT PANEL ═══════ */}
        <div
          style={{
            flex: "1 1 46%",
            background: "linear-gradient(135deg, #4f34c2 0%, #6543e8 45%, #7c5cff 100%)",
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            padding: "40px 32px",
          }}
        >
          {/* Subtle grid pattern */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              opacity: 0.16,
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
              backgroundSize: "30px 30px",
            }}
          />

          {/* Glow blobs */}
          <div
            style={{
              position: "absolute",
              top: -60,
              right: -60,
              width: 200,
              height: 200,
              background: "rgba(255,255,255,0.08)",
              borderRadius: "50%",
              filter: "blur(40px)",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: -40,
              left: -40,
              width: 180,
              height: 180,
              background: "rgba(139,76,247,0.2)",
              borderRadius: "50%",
              filter: "blur(50px)",
            }}
          />

          {/* Image Card */}
          <div className="hero-card" style={{ position: "relative", zIndex: 2, width: "100%", maxWidth: 300 }}>
            <div
              style={{
                borderRadius: 24,
                overflow: "hidden",
                border: "3px solid rgba(255,255,255,0.2)",
                boxShadow: "0 24px 50px rgba(0,0,0,0.25)",
                position: "relative",
                aspectRatio: "3/4",
              }}
            >
              <img
                src="/ngo image.jpg"
                alt="SevaSetu Community"
                className="login-hero-img"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                  transition: "transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
                }}
              />
              {/* Bottom gradient overlay */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background:
                    "linear-gradient(to top, rgba(40, 10, 120, 0.85) 0%, rgba(40, 10, 120, 0.35) 40%, transparent 65%)",
                }}
              />
              {/* Overlay text */}
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "20px 22px" }}>
                <p
                  style={{
                    color: "#fff",
                    fontSize: 18,
                    fontWeight: 800,
                    lineHeight: 1.35,
                    margin: 0,
                    textShadow: "0 2px 8px rgba(0,0,0,0.3)",
                  }}
                >
                  Building Bridges,
                  <br />
                  Building Communities.
                  <br />
                  <span style={{ color: "#fde047" }}>Empower change.</span>
                </p>
              </div>
            </div>


          </div>
        </div>
      </div>

      {/* Spin keyframe and hover styles injected via style tag */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .hero-card {
          cursor: pointer;
        }
        .hero-card:hover .login-hero-img {
          transform: scale(1.08) !important;
        }
        @media (max-width: 768px) {
          /* Stack card vertically on mobile, hide image panel */
        }
      `}</style>
    </div>
  );
}

/* ─── Shared styles ─── */
const labelStyle = {
  display: "block",
  fontSize: 11.5,
  fontWeight: 700,
  color: "#333",
  marginBottom: 2,
};

const inputStyle = {
  width: "100%",
  padding: "7px 10px",
  fontSize: 12.5,
  fontWeight: 500,
  color: "#333",
  background: "#fff",
  border: "1.5px solid #e0e0e0",
  borderRadius: 8,
  outline: "none",
  transition: "border-color 0.2s, box-shadow 0.2s",
  boxSizing: "border-box",
};

const submitBtnStyle = {
  width: "100%",
  padding: "9px 0",
  background: "linear-gradient(135deg, #6c47ff, #8b5cf6)",
  color: "#fff",
  fontWeight: 700,
  fontSize: 13.5,
  border: "none",
  borderRadius: 12,
  cursor: "pointer",
  boxShadow: "0 8px 24px rgba(108, 71, 255, 0.30)",
  transition: "all 0.2s",
  letterSpacing: 0.3,
};
