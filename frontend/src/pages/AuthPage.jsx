import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../firebase";
import { checkUserExistence } from "../api";
import SevaSetuLogo from "../components/SevaSetuLogo";

/* ── Token helpers ── */
const saveToken = (token) => localStorage.setItem("seva_token", token);

/* ── Constants ── */
const SKILLS = ["Medical","Disaster Relief","Teaching","Logistics","Food Aid","Counseling","Construction","Fundraising"];
const FOCUS_AREAS = ["Education","Healthcare","Disaster Relief","Women Empowerment","Child Welfare","Rural Development","Environment","Other"];

const PURPLE = "#6C63FF";
const PURPLE_LIGHT = "#EEE8FF";
const PURPLE_DARK  = "#5A52D5";

/* ── Shared input style ── */
const inp = {
  width: "100%", padding: "10px 14px", fontSize: ".875rem",
  border: "1.5px solid #E2E5F1", borderRadius: 8,
  fontFamily: "inherit", color: "#1A1A2E", background: "#FAFBFF",
  outline: "none", boxSizing: "border-box", transition: "border-color .2s",
};
const lbl = { display:"block", fontSize:".75rem", fontWeight:700, color:"#5A5A7A", marginBottom:6 };
const grp = { marginBottom: 14 };

/* ── Google Icon ── */
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" style={{ flexShrink:0 }}>
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
    <svg style={{ animation:"_sp .8s linear infinite" }} width="16" height="16" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="3" opacity=".3"/>
      <path d="M4 12a8 8 0 018-8" stroke="white" strokeWidth="3" strokeLinecap="round"/>
      <style>{`@keyframes _sp{to{transform:rotate(360deg)}}`}</style>
    </svg>
  );
}

/* ── Error box ── */
function ErrBox({ msg }) {
  if (!msg) return null;
  return (
    <div style={{ background:"#FEF2F2", border:"1.5px solid #FECACA", borderRadius:8, padding:"10px 14px",
      fontSize:".82rem", color:"#DC2626", fontWeight:500, marginBottom:14, display:"flex", gap:8, alignItems:"flex-start" }}>
      <span style={{ fontSize:15 }}>⚠</span> {msg}
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════ */
export default function AuthPage({ onLogin }) {
  const [role,   setRole]   = useState("ngo");
  const [loading, setLoading] = useState(false);
  const [error,  setError]  = useState("");

  const navigate = useNavigate();

  const clr = () => setError("");

  const doGoogle = async () => {
    clr();
    setLoading(true);
    
    sessionStorage.setItem("seva_role", role);

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const firebaseUser = result.user;
      
      // Check if user exists in MongoDB
      const res = await checkUserExistence(firebaseUser.email);
      
      if (res.data.exists) {
        // User exists, save token and login
        localStorage.setItem("seva_token", res.data.token);
        onLogin({ ...firebaseUser, role: res.data.role, dbUser: res.data.user, token: res.data.token });
      } else {
        // New user, redirect to complete profile
        navigate("/complete-profile", { 
          state: { 
            email: firebaseUser.email, 
            name: firebaseUser.displayName, 
            photoURL: firebaseUser.photoURL,
            role: role 
          } 
        });
      }
    } catch (err) {
      console.error("Google Auth Error:", err);
      setError(err.message || "Google sign-in failed.");
    } finally {
      setLoading(false);
    }
  };

  const primaryBtn = {
    width:"100%", padding:"14px 0",
    background: `linear-gradient(135deg, ${PURPLE}, ${PURPLE_DARK})`,
    color:"#fff", border:"none", borderRadius:12,
    fontWeight:700, fontSize:".95rem", fontFamily:"inherit",
    cursor: loading ? "not-allowed" : "pointer",
    display:"flex", alignItems:"center", justifyContent:"center", gap:10,
    opacity: loading ? .75 : 1, transition:"all .2s",
    boxShadow:"0 8px 20px rgba(108,99,255,.3)",
  };

  return (
    <div style={{
      minHeight:"100vh", background: "#F8FAFC",
      display:"flex", alignItems:"center", justifyContent:"center", padding:"20px",
      fontFamily:"'Inter', sans-serif"
    }}>
      <div style={{
        width:"100%", maxWidth:900, height: 580,
        background:"white", borderRadius:24,
        boxShadow:"0 30px 100px rgba(0,0,0,.08)",
        display:"grid", gridTemplateColumns:"1.1fr 1fr", overflow:"hidden"
      }}>
        {/* Left: Form */}
        <div style={{ padding:"50px 45px", display:"flex", flexDirection:"column", justifyContent:"center" }}>
          <div style={{ marginBottom: 32, textAlign: "center" }}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
              <SevaSetuLogo width={180} />
            </div>
            <h1 style={{ fontSize: "1.75rem", fontWeight: 800, color: "#1E293B", marginBottom: 8 }}>Welcome back</h1>
            <p style={{ color: "#64748B", fontSize: ".9rem" }}>Connecting NGOs with Volunteers for a Better Tomorrow.</p>
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display:"block", fontSize:".8rem", fontWeight:700, color:"#475569", marginBottom:10 }}>SELECT YOUR ROLE</label>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, background:"#F1F5F9", padding:4, borderRadius:12 }}>
              {[{v:"ngo",l:"NGO Admin"},{v:"volunteer",l:"Volunteer"}].map(r => (
                <button key={r.v} onClick={() => setRole(r.v)} style={{
                  padding: "10px", borderRadius: 10, border: "none",
                  background: role === r.v ? "white" : "transparent",
                  color: role === r.v ? PURPLE : "#64748B",
                  fontWeight: role === r.v ? 700 : 500, fontSize: ".85rem",
                  cursor: "pointer", transition: "all .2s",
                  boxShadow: role === r.v ? "0 2px 8px rgba(0,0,0,.05)" : "none"
                }}>{r.l}</button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <p style={{ fontSize: ".85rem", color: "#64748B", marginBottom: 16, textAlign: "center" }}>
              Continue with Google to get started
            </p>
            <button onClick={doGoogle} style={primaryBtn} disabled={loading}>
              {loading ? <Spin /> : <GoogleIcon />}
              {loading ? "Authenticating..." : "Continue with Google"}
            </button>
          </div>

          <ErrBox msg={error} />

          <p style={{ fontSize: ".75rem", color: "#94A3B8", textAlign: "center", marginTop: "auto" }}>
            By continuing, you agree to SevaSetu's Terms and Privacy Policy.
          </p>
        </div>

        {/* Right: Image */}
        <div style={{
          background: `linear-gradient(135deg, ${PURPLE} 0%, ${PURPLE_DARK} 100%)`,
          position: "relative", display: "flex", alignItems: "flex-end", padding: 40
        }}>
          <img src="/ngo image.jpg" alt="Volunteers" style={{
            position: "absolute", top: 0, left: 0, width: "100%", height: "100%",
            objectFit: "cover", opacity: 0.4
          }} />
          <div style={{ position: "relative", zIndex: 1 }}>
            <h2 style={{ fontSize: "2rem", fontWeight: 900, color: "white", lineHeight: 1.2, marginBottom: 12 }}>
              Building Bridges,<br />Building Communities.
            </h2>
            <p style={{ color: "#EEE8FF", fontWeight: 500, fontSize: "1rem" }}>
              Empowering change through collaborative action.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
