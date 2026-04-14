import { useState } from "react";
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth, googleProvider } from "../firebase";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

export default function Login({ onLogin }) {
  const [mode, setMode] = useState("login"); // "login" or "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [ngoName, setNgoName] = useState("");
  const [ngoLocation, setNgoLocation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const clearError = () => setError("");

  // ── Missing Firebase API Key UI Helper ──
  const isMissingApiKey = import.meta.env.VITE_FIREBASE_API_KEY === "REPLACE_ME_WITH_YOUR_ACTUAL_API_KEY" || !import.meta.env.VITE_FIREBASE_API_KEY;

  // ── Google Sign-In ──
  const handleGoogleSignIn = async () => {
    if (isMissingApiKey) {
      console.warn("No Firebase API Key found. Bypassing Google Auth for demo purposes.");
      onLogin({
        uid: "demo-" + Date.now(),
        displayName: "Demo User",
        email: "demo@sevasetu.org",
        photoURL: ""
      });
      return;
    }
    setLoading(true);
    clearError();
    try {
      const result = await signInWithPopup(auth, googleProvider);
      onLogin(result.user);
    } catch (err) {
      console.error("Google sign-in error:", err);
      if (err.code === "auth/popup-closed-by-user") {
        setError("Sign-in popup was closed. Please try again.");
      } else if (err.code === "auth/api-key-not-valid") {
        setError("Firebase Config Error: The API key provided is not valid. Please update frontend/.env with a valid key and restart the dev server.");
      } else if (err.code === "auth/cancelled-popup-request") {
        // ignore
      } else {
        setError(err.message || "Google sign-in failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Email/Password Login ──
  const handleEmailLogin = async (e) => {
    e.preventDefault();
    if (isMissingApiKey) {
      console.warn("No Firebase API Key found. Bypassing Email Auth for demo purposes.");
      onLogin({
        uid: "demo-" + Date.now(),
        displayName: "Demo Admin",
        email: email || "admin@sevasetu.org",
      });
      return;
    }
    if (!email || !password) return setError("Please fill in all fields.");
    setLoading(true);
    clearError();
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      onLogin(result.user);
    } catch (err) {
      console.error("Email login error:", err);
      if (err.code === "auth/user-not-found" || err.code === "auth/invalid-credential") {
        setError("Invalid email or password. Please try again.");
      } else if (err.code === "auth/wrong-password") {
        setError("Incorrect password.");
      } else if (err.code === "auth/too-many-requests") {
        setError("Too many attempts. Please try again later.");
      } else {
        setError(err.message || "Login failed.");
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Email/Password Signup ──
  const handleEmailSignup = async (e) => {
    e.preventDefault();
    if (isMissingApiKey) {
      console.warn("No Firebase API Key found. Bypassing Signup Auth for demo purposes.");
      onLogin({
        uid: "demo-" + Date.now(),
        displayName: ngoName || "New Demo NGO",
        email: email || "new@sevasetu.org",
      });
      return;
    }
    if (!email || !password || !ngoName) return setError("Please fill in all required fields.");
    if (password.length < 6) return setError("Password must be at least 6 characters.");
    if (password !== confirmPassword) return setError("Passwords do not match.");
    setLoading(true);
    clearError();
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      // Update profile with NGO name
      await updateProfile(result.user, {
        displayName: ngoName,
      });
      onLogin(result.user);
    } catch (err) {
      console.error("Signup error:", err);
      if (err.code === "auth/email-already-in-use") {
        setError("This email is already registered. Please sign in instead.");
      } else if (err.code === "auth/weak-password") {
        setError("Password is too weak. Use at least 6 characters.");
      } else if (err.code === "auth/invalid-email") {
        setError("Invalid email address.");
      } else {
        setError(err.message || "Sign up failed.");
      }
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setMode(mode === "login" ? "signup" : "login");
    setError("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setNgoName("");
    setNgoLocation("");
  };

  return (
    <div className="login-page">
      <div className="login-left">
        <div className="login-form-wrap">
          {/* Logo */}
          <div className="login-brand">
            <img src="/Sevasetu-logo.png" alt="SevaSetu Logo" style={{ width: 52, height: 52, objectFit: "contain" }} />
            <span className="brand-name">Seva<span>Setu</span></span>
          </div>

          {mode === "login" ? (
            <>
              <h1 className="login-title">Welcome back</h1>
              <p className="login-subtitle">
                Sign in to your NGO dashboard to manage community needs and coordinate volunteers.
              </p>

              {/* Error message */}
              {error && (
                <div className="login-error animate-in">
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>error</span>
                  {error}
                </div>
              )}

              <form className="login-form" onSubmit={handleEmailLogin}>
                <div className="login-input-group">
                  <label htmlFor="email">Email address</label>
                  <input
                    id="email"
                    type="email"
                    className="login-input"
                    placeholder="admin@sevasetu.org"
                    value={email}
                    onChange={e => { setEmail(e.target.value); clearError(); }}
                    autoComplete="email"
                  />
                </div>

                <div className="login-input-group">
                  <label htmlFor="password">Password</label>
                  <input
                    id="password"
                    type="password"
                    className="login-input"
                    placeholder="Enter your password"
                    value={password}
                    onChange={e => { setPassword(e.target.value); clearError(); }}
                    autoComplete="current-password"
                  />
                </div>

                <button type="submit" className="login-btn" disabled={loading}>
                  {loading ? (
                    <span style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
                      <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2, margin: 0, borderTopColor: "#fff", borderColor: "rgba(255,255,255,0.3)" }}></span>
                      Signing in…
                    </span>
                  ) : "Sign in"}
                </button>

                <div className="login-divider">
                  <span>or continue with</span>
                </div>

                <button
                  type="button"
                  className="login-google-btn"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                >
                  <GoogleIcon />
                  Sign in with Google
                </button>
              </form>

              <div className="login-footer">
                New to SevaSetu? <a href="#" onClick={(e) => { e.preventDefault(); switchMode(); }}>Create an account</a>
              </div>
            </>
          ) : (
            <>
              <h1 className="login-title">Create your account</h1>
              <p className="login-subtitle">
                Register your NGO to start prioritizing community needs and coordinating volunteer response.
              </p>

              {/* Error message */}
              {error && (
                <div className="login-error animate-in">
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>error</span>
                  {error}
                </div>
              )}

              <form className="login-form" onSubmit={handleEmailSignup}>
                <div className="login-input-group">
                  <label htmlFor="ngo-name">NGO / Organization Name *</label>
                  <input
                    id="ngo-name"
                    type="text"
                    className="login-input"
                    placeholder="e.g., Helping Hands Foundation"
                    value={ngoName}
                    onChange={e => { setNgoName(e.target.value); clearError(); }}
                    autoComplete="organization"
                  />
                </div>

                <div className="login-input-group">
                  <label htmlFor="ngo-location">Location (optional)</label>
                  <input
                    id="ngo-location"
                    type="text"
                    className="login-input"
                    placeholder="e.g., Pune, Maharashtra"
                    value={ngoLocation}
                    onChange={e => { setNgoLocation(e.target.value); clearError(); }}
                    autoComplete="address-level2"
                  />
                </div>

                <div className="login-input-group">
                  <label htmlFor="signup-email">Email address *</label>
                  <input
                    id="signup-email"
                    type="email"
                    className="login-input"
                    placeholder="you@your-ngo.org"
                    value={email}
                    onChange={e => { setEmail(e.target.value); clearError(); }}
                    autoComplete="email"
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  <div className="login-input-group">
                    <label htmlFor="signup-password">Password *</label>
                    <input
                      id="signup-password"
                      type="password"
                      className="login-input"
                      placeholder="Min 6 characters"
                      value={password}
                      onChange={e => { setPassword(e.target.value); clearError(); }}
                      autoComplete="new-password"
                    />
                  </div>
                  <div className="login-input-group">
                    <label htmlFor="signup-confirm">Confirm Password *</label>
                    <input
                      id="signup-confirm"
                      type="password"
                      className="login-input"
                      placeholder="Re-enter password"
                      value={confirmPassword}
                      onChange={e => { setConfirmPassword(e.target.value); clearError(); }}
                      autoComplete="new-password"
                    />
                  </div>
                </div>

                <button type="submit" className="login-btn" disabled={loading}>
                  {loading ? (
                    <span style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
                      <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2, margin: 0, borderTopColor: "#fff", borderColor: "rgba(255,255,255,0.3)" }}></span>
                      Creating account…
                    </span>
                  ) : "Create Account"}
                </button>

                <div className="login-divider">
                  <span>or sign up with</span>
                </div>

                <button
                  type="button"
                  className="login-google-btn"
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                >
                  <GoogleIcon />
                  Sign up with Google
                </button>
              </form>

              <div className="login-footer">
                Already have an account? <a href="#" onClick={(e) => { e.preventDefault(); switchMode(); }}>Sign in</a>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="login-right">
        {/* Decorative background shapes */}
        <div className="login-bg-shape" style={{ width: 400, height: 400, top: -100, right: -100, background: 'var(--red-300)' }}></div>
        <div className="login-bg-shape" style={{ width: 300, height: 300, bottom: -80, left: -80, background: 'var(--red-400)' }}></div>

        <div className="login-right-content">
          <div className="login-illustration">
            {/* Project logo as hero */}
            <img src="/Sevasetu-logo.png" alt="SevaSetu" style={{
              width: 200, height: 200, objectFit: "contain",
              filter: "drop-shadow(0 8px 24px rgba(220,38,38,0.15))",
              animation: "float 6s ease-in-out infinite",
            }} />
          </div>

          <div className="login-tagline">
            Connecting needs with<br />the right help
          </div>
          <div className="login-tagline-sub">
            Data-driven disaster response & volunteer coordination
          </div>

          {/* Platform stats */}
          <div style={{
            display: "flex", gap: 24, marginTop: 32, justifyContent: "center",
          }}>
            {[
              { label: "NGOs", value: "50+", icon: "business" },
              { label: "Volunteers", value: "1000+", icon: "group" },
              { label: "Issues Resolved", value: "5K+", icon: "task_alt" },
            ].map(stat => (
              <div key={stat.label} style={{
                textAlign: "center",
                background: "rgba(255,255,255,0.6)",
                backdropFilter: "blur(8px)",
                padding: "14px 18px",
                borderRadius: "var(--radius)",
                border: "1px solid rgba(220,38,38,0.1)",
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: 20, color: "var(--red-600)", display: "block", marginBottom: 4 }}>{stat.icon}</span>
                <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--red-800)" }}>{stat.value}</div>
                <div style={{ fontSize: ".7rem", fontWeight: 600, color: "var(--red-600)", opacity: 0.7 }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
