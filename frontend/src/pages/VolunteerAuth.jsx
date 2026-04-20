import { useState } from "react";
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { auth, googleProvider } from "../firebase";
import SevaSetuLogo from "../components/SevaSetuLogo";

/* ─── Demo Mode ─── */
const isMissingApiKey =
  import.meta.env.VITE_FIREBASE_API_KEY === "REPLACE_ME_WITH_YOUR_ACTUAL_API_KEY" ||
  !import.meta.env.VITE_FIREBASE_API_KEY;

/* ─── Skill Options ─── */
const SKILL_OPTIONS = [
  { id: "medical",        label: "🏥 Medical" },
  { id: "disaster",       label: "🆘 Disaster Relief" },
  { id: "teaching",       label: "📚 Teaching" },
  { id: "logistics",      label: "🚛 Logistics" },
  { id: "food",           label: "🍱 Food Aid" },
  { id: "counseling",     label: "💬 Counseling" },
  { id: "construction",   label: "🔨 Construction" },
  { id: "fundraising",    label: "💰 Fundraising" },
];

/* ─── Google logo SVG ─── */
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
      <path fill="#4285F4" d="M46.145 24.5c0-1.567-.14-3.08-.4-4.545H24v8.6h12.44c-.536 2.762-2.165 5.1-4.617 6.667v5.542h7.477c4.37-4.023 6.845-9.95 6.845-16.264z"/>
      <path fill="#34A853" d="M24 47c6.24 0 11.474-2.067 15.299-5.596l-7.477-5.542C29.713 37.74 27.07 38.5 24 38.5c-6.013 0-11.103-4.062-12.923-9.53H3.39v5.72C7.198 42.445 15.02 47 24 47z"/>
      <path fill="#FBBC05" d="M11.077 28.97A14.8 14.8 0 0 1 10.5 24c0-1.73.298-3.41.577-4.97v-5.72H3.39A23.935 23.935 0 0 0 0 24c0 3.87.93 7.53 2.574 10.69l8.503-5.72z"/>
      <path fill="#EA4335" d="M24 9.5c3.39 0 6.437 1.166 8.836 3.453l6.623-6.623C35.47 2.535 30.237 0 24 0 15.02 0 7.198 4.555 3.39 13.31l8.687 5.72C13.897 13.562 18.987 9.5 24 9.5z"/>
    </svg>
  );
}

/* ─── Step indicator ─── */
function StepIndicator({ step, total }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 28 }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{
            width: i < step ? 28 : i === step ? 28 : 10,
            height: 6,
            borderRadius: 999,
            background: i < step
              ? "var(--red-600)"
              : i === step
              ? "var(--red-400)"
              : "var(--border)",
            transition: "all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)",
          }} />
        </div>
      ))}
      <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 600, marginLeft: 4 }}>
        Step {step + 1} of {total}
      </span>
    </div>
  );
}

/* ─── Main Component ─── */
export default function VolunteerAuth({ onLogin }) {
  // Auth mode
  const [authScreen, setAuthScreen] = useState("role");   // role | login | signup
  const [selectedRole, setSelectedRole] = useState(null); // volunteer | ngo

  // Login fields
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Signup – multi-step
  const [signupStep, setSignupStep] = useState(0); // 0 = basic, 1 = location+skills, 2 = availability
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [city, setCity] = useState("");
  const [skills, setSkills] = useState([]);
  const [available, setAvailable] = useState(true);
  const [experience, setExperience] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const clearErr = () => setError("");

  /* ── Toggle skill chip ── */
  const toggleSkill = (id) => {
    setSkills(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  };

  /* ── Google sign-in ── */
  const handleGoogle = async () => {
    setLoading(true);
    clearErr();
    try {
      if (isMissingApiKey) {
        onLogin({ uid: "google-demo", displayName: "Google User", email: "google@demo.com", role: "volunteer" });
        return;
      }
      const result = await signInWithPopup(auth, googleProvider);
      onLogin({ ...result.user, role: "volunteer" });
    } catch (err) {
      setError(err.message || "Google Sign-In failed.");
    } finally {
      setLoading(false);
    }
  };

  /* ── Email Login ── */
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    clearErr();
    try {
      if (isMissingApiKey) {
        onLogin({ uid: "demo-login", displayName: loginEmail.split("@")[0], email: loginEmail, role: "volunteer" });
        return;
      }
      const result = await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
      onLogin({ ...result.user, role: "volunteer" });
    } catch (err) {
      setError("Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  /* ── Signup step validation ── */
  const validateStep = () => {
    if (signupStep === 0) {
      if (!fullName.trim()) return "Full name is required.";
      if (!email.trim() || !email.includes("@")) return "Valid email is required.";
      if (!phone.trim()) return "Phone number is required.";
      if (password.length < 8) return "Password must be at least 8 characters.";
      if (password !== confirmPassword) return "Passwords do not match.";
    }
    if (signupStep === 1) {
      if (!city.trim()) return "City / Area is required.";
      if (skills.length === 0) return "Please select at least one skill.";
    }
    return null;
  };

  const handleNextStep = () => {
    const err = validateStep();
    if (err) { setError(err); return; }
    clearErr();
    setSignupStep(s => s + 1);
  };

  /* ── Final Signup Submit ── */
  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    clearErr();
    try {
      if (isMissingApiKey) {
        onLogin({ uid: "demo-vol-" + Date.now(), displayName: fullName, email, role: "volunteer" });
        return;
      }
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(result.user, { displayName: fullName });

      // Save to MongoDB via backend
      try {
        await fetch("/api/volunteers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: fullName,
            email,
            phone,
            location: city,
            skills,
            availability: available,
            experience,
            role: "volunteer",
            firebaseUid: result.user.uid,
          }),
        });
      } catch (_) { /* non-blocking */ }

      onLogin({ ...result.user, role: "volunteer" });
    } catch (err) {
      if (err.code === "auth/email-already-in-use") setError("This email is already registered.");
      else setError(err.message || "Signup failed.");
    } finally {
      setLoading(false);
    }
  };

  /* ═══════════════════════════════════════
     SHARED STYLES
  ═══════════════════════════════════════ */
  const inputStyle = {
    width: "100%",
    padding: "10px 14px",
    fontSize: "0.875rem",
    fontFamily: "inherit",
    fontWeight: 500,
    color: "var(--text-primary)",
    background: "var(--bg)",
    border: "1.5px solid var(--border)",
    borderRadius: "var(--radius-sm)",
    outline: "none",
    transition: "border-color 0.2s, box-shadow 0.2s",
    boxSizing: "border-box",
  };
  const labelStyle = {
    display: "block",
    fontSize: "0.78rem",
    fontWeight: 700,
    color: "var(--text-secondary)",
    marginBottom: 6,
    letterSpacing: "0.01em",
  };
  const primaryBtn = {
    width: "100%",
    padding: "11px 0",
    background: "linear-gradient(135deg, #EF4444, #DC2626)",
    color: "#fff",
    fontWeight: 700,
    fontSize: "0.9rem",
    fontFamily: "inherit",
    border: "none",
    borderRadius: "var(--radius-sm)",
    cursor: "pointer",
    boxShadow: "0 4px 16px rgba(220, 38, 38, 0.30)",
    transition: "all 0.2s ease",
    letterSpacing: 0.3,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  };
  const ghostBtn = {
    ...primaryBtn,
    background: "white",
    color: "var(--text-primary)",
    border: "1.5px solid var(--border)",
    boxShadow: "var(--shadow-xs)",
  };
  const groupStyle = { marginBottom: 16 };

  /* ═══════════════════════════════════════
     SCREEN: ROLE SELECTION
  ═══════════════════════════════════════ */
  const RoleScreen = () => (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--red-600)", marginBottom: 8,
        textTransform: "uppercase", letterSpacing: "0.08em" }}>
        Welcome to SevaSetu
      </div>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--text-primary)",
        letterSpacing: "-0.04em", marginBottom: 6 }}>
        Who are you?
      </h1>
      <p style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginBottom: 32, lineHeight: 1.5 }}>
        Select your role to get started
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 28 }}>
        {[
          {
            key: "volunteer",
            icon: "🙋",
            title: "Volunteer",
            desc: "Join & contribute your skills",
          },
          {
            key: "ngo",
            icon: "🏛️",
            title: "NGO / Admin",
            desc: "Manage your organization",
          },
        ].map(r => (
          <button
            key={r.key}
            type="button"
            onClick={() => setSelectedRole(r.key)}
            style={{
              padding: "20px 14px",
              borderRadius: "var(--radius)",
              border: `2px solid ${selectedRole === r.key ? "var(--red-500)" : "var(--border)"}`,
              background: selectedRole === r.key ? "var(--red-50)" : "var(--bg-card)",
              cursor: "pointer",
              textAlign: "center",
              transition: "all 0.2s var(--ease-spring)",
              transform: selectedRole === r.key ? "scale(1.02)" : "scale(1)",
              boxShadow: selectedRole === r.key ? "0 0 0 3px rgba(239,68,68,0.15)" : "var(--shadow-xs)",
            }}
          >
            <div style={{ fontSize: "2rem", marginBottom: 8 }}>{r.icon}</div>
            <div style={{ fontWeight: 700, fontSize: "0.95rem", color: selectedRole === r.key ? "var(--red-700)" : "var(--text-primary)", marginBottom: 4 }}>
              {r.title}
            </div>
            <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>
              {r.desc}
            </div>
          </button>
        ))}
      </div>

      <button
        type="button"
        disabled={!selectedRole}
        onClick={() => {
          if (selectedRole === "ngo") {
            // Redirect to the existing NGO login page
            window.location.reload();
          } else {
            setAuthScreen("login");
          }
        }}
        style={{
          ...primaryBtn,
          opacity: selectedRole ? 1 : 0.45,
          cursor: selectedRole ? "pointer" : "not-allowed",
        }}
      >
        Continue as {selectedRole ? (selectedRole === "ngo" ? "NGO Admin" : "Volunteer") : "..."}
        <span style={{ fontSize: "1rem" }}>→</span>
      </button>
    </div>
  );

  /* ═══════════════════════════════════════
     SCREEN: VOLUNTEER LOGIN
  ═══════════════════════════════════════ */
  const LoginScreen = () => (
    <form onSubmit={handleLogin}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "var(--red-600)",
          textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>
          Volunteer Portal
        </div>
        <h1 style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.04em", marginBottom: 4 }}>
          Welcome back
        </h1>
        <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
          Sign in to your volunteer account
        </p>
      </div>

      {/* Google */}
      <button type="button" onClick={handleGoogle} style={{ ...ghostBtn, marginBottom: 16 }}>
        <GoogleIcon /> Continue with Google
      </button>

      {/* Divider */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
        <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 600 }}>or with email</span>
        <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
      </div>

      <div style={groupStyle}>
        <label style={labelStyle}>Email Address</label>
        <input style={inputStyle} type="email" required placeholder="you@example.com"
          value={loginEmail} onChange={e => { setLoginEmail(e.target.value); clearErr(); }} />
      </div>
      <div style={{ ...groupStyle, marginBottom: 20 }}>
        <label style={labelStyle}>Password</label>
        <input style={inputStyle} type="password" required placeholder="Your password"
          value={loginPassword} onChange={e => { setLoginPassword(e.target.value); clearErr(); }} />
      </div>

      {error && <ErrorBox msg={error} />}

      <button type="submit" style={primaryBtn} disabled={loading}>
        {loading ? <Spinner /> : "Sign In →"}
      </button>

      <div style={{ textAlign: "center", marginTop: 20 }}>
        <span style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>No account? </span>
        <button type="button" onClick={() => { setAuthScreen("signup"); clearErr(); }}
          style={{ background: "none", border: "none", color: "var(--red-600)", fontWeight: 700,
            fontSize: "0.82rem", cursor: "pointer", fontFamily: "inherit" }}>
          Create one →
        </button>
      </div>
    </form>
  );

  /* ═══════════════════════════════════════
     SCREEN: VOLUNTEER SIGNUP (STEP-BASED)
  ═══════════════════════════════════════ */
  const SignupScreen = () => (
    <form onSubmit={signupStep === 2 ? handleSignup : (e) => { e.preventDefault(); handleNextStep(); }}>
      {/* Badge */}
      <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px",
        background: "var(--red-50)", borderRadius: "var(--radius-pill)",
        fontSize: "0.72rem", fontWeight: 700, color: "var(--red-700)",
        letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 16 }}>
        🙋 Signing up as Volunteer
      </div>

      <h1 style={{ fontSize: "1.35rem", fontWeight: 800, color: "var(--text-primary)",
        letterSpacing: "-0.04em", marginBottom: 20 }}>
        {signupStep === 0 && "Create your account"}
        {signupStep === 1 && "Location & Skills"}
        {signupStep === 2 && "Almost there!"}
      </h1>

      {/* Step indicator */}
      <StepIndicator step={signupStep} total={3} />

      {/* ── STEP 0: Basic Info ── */}
      {signupStep === 0 && (
        <>
          <div style={groupStyle}>
            <label style={labelStyle}>Full Name</label>
            <input style={inputStyle} type="text" required placeholder="e.g. Ananya Sharma"
              value={fullName} onChange={e => { setFullName(e.target.value); clearErr(); }} />
          </div>
          <div style={groupStyle}>
            <label style={labelStyle}>Email Address</label>
            <input style={inputStyle} type="email" required placeholder="you@example.com"
              value={email} onChange={e => { setEmail(e.target.value); clearErr(); }} />
          </div>
          <div style={groupStyle}>
            <label style={labelStyle}>Phone Number</label>
            <input style={inputStyle} type="tel" required placeholder="+91 98765 43210"
              value={phone} onChange={e => { setPhone(e.target.value); clearErr(); }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>Password</label>
              <input style={inputStyle} type="password" required placeholder="Min. 8 characters"
                value={password} onChange={e => { setPassword(e.target.value); clearErr(); }} />
            </div>
            <div>
              <label style={labelStyle}>Confirm Password</label>
              <input style={inputStyle} type="password" required placeholder="Repeat password"
                value={confirmPassword} onChange={e => { setConfirmPassword(e.target.value); clearErr(); }} />
            </div>
          </div>
        </>
      )}

      {/* ── STEP 1: Location + Skills ── */}
      {signupStep === 1 && (
        <>
          <div style={groupStyle}>
            <label style={labelStyle}>
              <span style={{ marginRight: 6 }}>📍</span>City / Area
            </label>
            <input style={inputStyle} type="text" placeholder="e.g. Pune, Maharashtra"
              value={city} onChange={e => { setCity(e.target.value); clearErr(); }} />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ ...labelStyle, marginBottom: 10 }}>
              <span style={{ marginRight: 6 }}>🛠️</span>Skills
              <span style={{ color: "var(--text-muted)", fontWeight: 500, marginLeft: 6 }}>
                (select all that apply)
              </span>
            </label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {SKILL_OPTIONS.map(s => {
                const sel = skills.includes(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggleSkill(s.id)}
                    style={{
                      padding: "7px 14px",
                      borderRadius: "var(--radius-pill)",
                      border: `1.5px solid ${sel ? "var(--red-400)" : "var(--border)"}`,
                      background: sel ? "var(--red-50)" : "white",
                      color: sel ? "var(--red-700)" : "var(--text-secondary)",
                      fontWeight: sel ? 700 : 500,
                      fontSize: "0.8rem",
                      cursor: "pointer",
                      fontFamily: "inherit",
                      transition: "all 0.18s var(--ease-spring)",
                      transform: sel ? "scale(1.05)" : "scale(1)",
                    }}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* ── STEP 2: Availability + Experience ── */}
      {signupStep === 2 && (
        <>
          {/* Availability toggle */}
          <div style={{ ...groupStyle, marginBottom: 24 }}>
            <label style={{ ...labelStyle, marginBottom: 12 }}>
              <span style={{ marginRight: 6 }}>⏰</span>Availability Status
            </label>
            <div style={{ display: "flex", gap: 10 }}>
              {[true, false].map(v => (
                <button
                  key={String(v)}
                  type="button"
                  onClick={() => setAvailable(v)}
                  style={{
                    flex: 1,
                    padding: "12px 0",
                    borderRadius: "var(--radius-sm)",
                    border: `2px solid ${available === v ? (v ? "var(--emerald-500)" : "var(--red-400)") : "var(--border)"}`,
                    background: available === v
                      ? (v ? "var(--emerald-50)" : "var(--red-50)")
                      : "white",
                    color: available === v
                      ? (v ? "var(--emerald-600)" : "var(--red-700)")
                      : "var(--text-secondary)",
                    fontWeight: 700,
                    fontSize: "0.85rem",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    transition: "all 0.2s ease",
                  }}
                >
                  {v ? "✅ Available" : "⏸ Not Available"}
                </button>
              ))}
            </div>
          </div>

          {/* Skills summary */}
          {skills.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>Your selected skills</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {skills.map(id => (
                  <span key={id} style={{
                    padding: "4px 12px",
                    borderRadius: "var(--radius-pill)",
                    background: "var(--red-50)",
                    color: "var(--red-700)",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                  }}>
                    {SKILL_OPTIONS.find(s => s.id === id)?.label}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Experience */}
          <div style={groupStyle}>
            <label style={labelStyle}>
              <span style={{ marginRight: 6 }}>🧾</span>
              Previous Experience
              <span style={{ color: "var(--text-muted)", fontWeight: 500, marginLeft: 6 }}>(optional)</span>
            </label>
            <textarea
              style={{ ...inputStyle, minHeight: 90, resize: "vertical", lineHeight: 1.6 }}
              placeholder="Briefly describe any previous volunteer work or relevant experience…"
              value={experience}
              onChange={e => setExperience(e.target.value)}
            />
          </div>
        </>
      )}

      {error && <ErrorBox msg={error} />}

      {/* ── Navigation Buttons ── */}
      <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
        {signupStep > 0 && (
          <button type="button" onClick={() => { setSignupStep(s => s - 1); clearErr(); }}
            style={{ ...ghostBtn, flex: "0 0 44px", padding: 0, borderRadius: "var(--radius-sm)" }}>
            ←
          </button>
        )}
        <button type="submit" style={{ ...primaryBtn, flex: 1 }} disabled={loading}>
          {loading ? <Spinner /> : signupStep < 2 ? "Next →" : "Create Account 🎉"}
        </button>
      </div>

      <div style={{ textAlign: "center", marginTop: 16 }}>
        <span style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>Already have an account? </span>
        <button type="button" onClick={() => { setAuthScreen("login"); setSignupStep(0); clearErr(); }}
          style={{ background: "none", border: "none", color: "var(--red-600)", fontWeight: 700,
            fontSize: "0.82rem", cursor: "pointer", fontFamily: "inherit" }}>
          Sign in →
        </button>
      </div>
    </form>
  );

  /* ─── Main Render ─── */
  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--bg)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px 16px",
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>
      {/* ── Header ── */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <SevaSetuLogo width={44} showText={false} />
          <span style={{ fontSize: "1.4rem", fontWeight: 800, letterSpacing: "-0.04em", color: "var(--text-primary)" }}>
            Seva<span style={{ color: "var(--red-600)" }}>Setu</span>
          </span>
        </div>
        <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", fontWeight: 500 }}>
          Connecting NGOs with Volunteers for Real Impact
        </p>
      </div>

      {/* ── Auth Card ── */}
      <div style={{
        width: "100%",
        maxWidth: 440,
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--shadow-lg)",
        padding: "32px 36px",
        animation: "fadeIn 0.3s ease-out",
      }}>
        {authScreen === "role"   && <RoleScreen />}
        {authScreen === "login"  && <LoginScreen />}
        {authScreen === "signup" && <SignupScreen />}
      </div>

      {/* ── Back to role selection ── */}
      {authScreen !== "role" && (
        <button
          type="button"
          onClick={() => { setAuthScreen("role"); setSignupStep(0); clearErr(); }}
          style={{
            background: "none", border: "none", color: "var(--text-muted)",
            fontSize: "0.78rem", cursor: "pointer", fontFamily: "inherit",
            fontWeight: 500, marginTop: 16, display: "flex", alignItems: "center", gap: 4,
          }}
        >
          ← Back to role selection
        </button>
      )}

      {/* ── Footer ── */}
      <p style={{ fontSize: "0.7rem", color: "var(--text-muted)", marginTop: 20, textAlign: "center" }}>
        © 2025 SevaSetu · Made with ❤️ for a better India
      </p>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
        input:focus, textarea:focus {
          border-color: var(--red-500) !important;
          box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.12);
        }
      `}</style>
    </div>
  );
}

/* ─── Small helpers ─── */
function ErrorBox({ msg }) {
  return (
    <div style={{
      background: "var(--red-50)",
      border: "1.5px solid var(--red-200)",
      borderRadius: "var(--radius-sm)",
      padding: "10px 14px",
      fontSize: "0.82rem",
      color: "var(--red-700)",
      fontWeight: 500,
      marginBottom: 14,
      display: "flex",
      gap: 8,
      alignItems: "flex-start",
    }}>
      <span style={{ flexShrink: 0 }}>⚠️</span> {msg}
    </div>
  );
}

function Spinner() {
  return (
    <svg style={{ animation: "spin 0.8s linear infinite" }} width="16" height="16" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" opacity="0.3" />
      <path d="M4 12a8 8 0 018-8" stroke="white" strokeWidth="3" strokeLinecap="round" />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </svg>
  );
}
