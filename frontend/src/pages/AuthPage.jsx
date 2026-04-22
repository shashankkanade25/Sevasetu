import { useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  signInWithPopup,
} from "firebase/auth";
import { auth, googleProvider } from "../firebase";
import { authSignup, authLogin } from "../api";

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
  const [role,   setRole]   = useState("ngo");      // "ngo" | "volunteer"
  const [mode,   setMode]   = useState("login");    // "login" | "signup"
  const [loading, setLoading] = useState(false);
  const [error,  setError]  = useState("");

  /* ── NGO fields ── */
  const [ngoName,    setNgoName]    = useState("");
  const [contact,    setContact]    = useState("");
  const [focusArea,  setFocusArea]  = useState("");
  const [email,      setEmail]      = useState("");
  const [password,   setPassword]   = useState("");

  /* ── Volunteer fields ── */
  const [vName,     setVName]     = useState("");
  const [vLocation, setVLocation] = useState("");
  const [vSkills,   setVSkills]   = useState([]);
  const [vAvail,    setVAvail]    = useState(true);

  const clr = () => setError("");
  const toggleSkill = (s) =>
    setVSkills(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s]);

  /* ── Core auth flow ── */
  const doAuth = async (e) => {
    e.preventDefault();
    clr();
    if (!email.trim() || !password.trim()) return setError("Email and password are required.");

    setLoading(true);
    
    // Prevent race condition: set the role BEFORE Firebase triggers onAuthStateChanged
    sessionStorage.setItem("seva_role", role);

    try {
      let firebaseUser;

      if (mode === "signup") {
        /* 1. Firebase create */
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        firebaseUser = cred.user;
        const displayName = role === "ngo" ? ngoName : vName;
        if (displayName) await updateProfile(firebaseUser, { displayName });

        /* 2. MongoDB record + JWT */
        const payload = role === "ngo"
          ? { role:"ngo", firebaseUid: firebaseUser.uid, email,
              name: ngoName, contactPerson: contact,
              organization: ngoName, focusArea }
          : { role:"volunteer", firebaseUid: firebaseUser.uid, email,
              name: vName, location: vLocation,
              skills: vSkills, availability: vAvail };

        const res = await authSignup(payload);
        saveToken(res.data.token);
        onLogin({ ...firebaseUser, role, dbUser: res.data.user, token: res.data.token });

      } else {
        /* 1. Firebase verify */
        const cred = await signInWithEmailAndPassword(auth, email, password);
        firebaseUser = cred.user;

        /* 2. MongoDB lookup + JWT */
        const res = await authLogin(email, role);
        if (res.data.role !== role) {
          setError(`This email is registered as a ${res.data.role}. Please select the correct role.`);
          return;
        }
        saveToken(res.data.token);
        onLogin({ ...firebaseUser, role, dbUser: res.data.user, token: res.data.token });
      }
    } catch (err) {
      const fb = err.code;
      if (fb === "auth/email-already-in-use") setError("This email is already registered. Please log in.");
      else if (fb === "auth/wrong-password" || fb === "auth/user-not-found") setError("Invalid email or password.");
      else if (fb === "auth/weak-password") setError("Password must be at least 6 characters.");
      else setError(err?.response?.data?.error || err.message || "Authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  /* ── Google login ── */
  const doGoogle = async () => {
    clr();
    setLoading(true);
    
    // Prevent race condition: set the role BEFORE Firebase triggers onAuthStateChanged
    sessionStorage.setItem("seva_role", role);

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const firebaseUser = result.user;
      // Attempt to find existing record
      try {
        const res = await authLogin(firebaseUser.email, role);
        saveToken(res.data.token);
        onLogin({ ...firebaseUser, role, dbUser: res.data.user, token: res.data.token });
      } catch {
        // New Google user — create record
        const payload = role === "ngo"
          ? { role:"ngo", firebaseUid: firebaseUser.uid, email: firebaseUser.email,
              name: firebaseUser.displayName || "NGO Admin", contactPerson: firebaseUser.displayName }
          : { role:"volunteer", firebaseUid: firebaseUser.uid, email: firebaseUser.email,
              name: firebaseUser.displayName || "Volunteer" };
        const res = await authSignup(payload);
        saveToken(res.data.token);
        onLogin({ ...firebaseUser, role, dbUser: res.data.user, token: res.data.token });
      }
    } catch (err) {
      setError(err.message || "Google sign-in failed.");
    } finally {
      setLoading(false);
    }
  };

  /* ── Styles ── */
  const primaryBtn = {
    width:"100%", padding:"11px 0",
    background: `linear-gradient(135deg, ${PURPLE}, ${PURPLE_DARK})`,
    color:"#fff", border:"none", borderRadius:8,
    fontWeight:700, fontSize:".9rem", fontFamily:"inherit",
    cursor: loading ? "not-allowed" : "pointer",
    display:"flex", alignItems:"center", justifyContent:"center", gap:8,
    opacity: loading ? .75 : 1, transition:"opacity .2s",
    boxShadow:"0 4px 14px rgba(108,99,255,.35)",
  };
  const ghostBtn = {
    ...primaryBtn,
    background:"white", color:"#1A1A2E",
    border:`1.5px solid #E2E5F1`, boxShadow:"none",
  };

  /* ── Form sections ── */
  const renderForm = () => {
    if (role === "ngo" && mode === "signup") return (
      <>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          <div style={grp}>
            <label style={lbl}>NGO Name</label>
            <input style={inp} placeholder="NGO name" value={ngoName}
              onChange={e=>{setNgoName(e.target.value);clr();}}
              onFocus={e=>e.target.style.borderColor=PURPLE}
              onBlur={e=>e.target.style.borderColor="#E2E5F1"} />
          </div>
          <div style={grp}>
            <label style={lbl}>Contact Person</label>
            <input style={inp} placeholder="Contact person" value={contact}
              onChange={e=>{setContact(e.target.value);clr();}}
              onFocus={e=>e.target.style.borderColor=PURPLE}
              onBlur={e=>e.target.style.borderColor="#E2E5F1"} />
          </div>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          <div style={grp}>
            <label style={lbl}>NGO Email</label>
            <input style={inp} type="email" placeholder="email address" value={email}
              onChange={e=>{setEmail(e.target.value);clr();}}
              onFocus={e=>e.target.style.borderColor=PURPLE}
              onBlur={e=>e.target.style.borderColor="#E2E5F1"} />
          </div>
          <div style={grp}>
            <label style={lbl}>Password</label>
            <input style={inp} type="password" placeholder="min. 8 characters" value={password}
              onChange={e=>{setPassword(e.target.value);clr();}}
              onFocus={e=>e.target.style.borderColor=PURPLE}
              onBlur={e=>e.target.style.borderColor="#E2E5F1"} />
          </div>
        </div>
        <div style={grp}>
          <label style={lbl}>NGO Focus Area</label>
          <select style={{...inp, cursor:"pointer"}} value={focusArea}
            onChange={e=>{setFocusArea(e.target.value);clr();}}>
            <option value="">e.g. Education, Healthcare</option>
            {FOCUS_AREAS.map(f=><option key={f} value={f}>{f}</option>)}
          </select>
        </div>
      </>
    );

    if (role === "volunteer" && mode === "signup") return (
      <>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          <div style={grp}>
            <label style={lbl}>Full Name</label>
            <input style={inp} placeholder="Your full name" value={vName}
              onChange={e=>{setVName(e.target.value);clr();}}
              onFocus={e=>e.target.style.borderColor=PURPLE}
              onBlur={e=>e.target.style.borderColor="#E2E5F1"} />
          </div>
          <div style={grp}>
            <label style={lbl}>Location</label>
            <input style={inp} placeholder="City / Area" value={vLocation}
              onChange={e=>{setVLocation(e.target.value);clr();}}
              onFocus={e=>e.target.style.borderColor=PURPLE}
              onBlur={e=>e.target.style.borderColor="#E2E5F1"} />
          </div>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          <div style={grp}>
            <label style={lbl}>Email</label>
            <input style={inp} type="email" placeholder="you@example.com" value={email}
              onChange={e=>{setEmail(e.target.value);clr();}}
              onFocus={e=>e.target.style.borderColor=PURPLE}
              onBlur={e=>e.target.style.borderColor="#E2E5F1"} />
          </div>
          <div style={grp}>
            <label style={lbl}>Password</label>
            <input style={inp} type="password" placeholder="min. 8 characters" value={password}
              onChange={e=>{setPassword(e.target.value);clr();}}
              onFocus={e=>e.target.style.borderColor=PURPLE}
              onBlur={e=>e.target.style.borderColor="#E2E5F1"} />
          </div>
        </div>
        <div style={{ marginBottom:14 }}>
          <label style={lbl}>Skills</label>
          <div style={{ display:"flex", flexWrap:"wrap", gap:7 }}>
            {SKILLS.map(s=>{
              const sel = vSkills.includes(s);
              return (
                <button key={s} type="button" onClick={()=>toggleSkill(s)} style={{
                  padding:"5px 13px", borderRadius:999, fontSize:".78rem",
                  border:`1.5px solid ${sel?PURPLE:"#E2E5F1"}`,
                  background:sel?PURPLE_LIGHT:"white",
                  color:sel?PURPLE:"#5A5A7A", fontWeight:sel?700:500,
                  cursor:"pointer", fontFamily:"inherit", transition:"all .15s",
                }}>{s}</button>
              );
            })}
          </div>
        </div>
        <div style={{ marginBottom:16 }}>
          <label style={lbl}>Availability</label>
          <div style={{ display:"flex", gap:10 }}>
            {[{v:true,l:"Available"},{v:false,l:"Not Available"}].map(o=>(
              <button key={String(o.v)} type="button" onClick={()=>setVAvail(o.v)} style={{
                flex:1, padding:"9px 0", borderRadius:8, fontWeight:700, fontSize:".82rem",
                border:`2px solid ${vAvail===o.v?(o.v?"#10B981":PURPLE):"#E2E5F1"}`,
                background:vAvail===o.v?(o.v?"#F0FDF4":PURPLE_LIGHT):"white",
                color:vAvail===o.v?(o.v?"#059669":PURPLE):"#5A5A7A",
                cursor:"pointer", fontFamily:"inherit", transition:"all .18s",
              }}>{o.l}</button>
            ))}
          </div>
        </div>
      </>
    );

    /* Login form (shared) */
    return (
      <>
        <div style={grp}>
          <label style={lbl}>Email Address</label>
          <input style={inp} type="email" placeholder="you@example.com" value={email}
            onChange={e=>{setEmail(e.target.value);clr();}}
            onFocus={e=>e.target.style.borderColor=PURPLE}
            onBlur={e=>e.target.style.borderColor="#E2E5F1"} />
        </div>
        <div style={{ ...grp, marginBottom:20 }}>
          <label style={lbl}>Password</label>
          <input style={inp} type="password" placeholder="Your password" value={password}
            onChange={e=>{setPassword(e.target.value);clr();}}
            onFocus={e=>e.target.style.borderColor=PURPLE}
            onBlur={e=>e.target.style.borderColor="#E2E5F1"} />
        </div>
      </>
    );
  };

  /* ── Layout ── */
  return (
    <div style={{
      minHeight:"100vh", background: PURPLE_LIGHT,
      display:"flex", flexDirection:"column", alignItems:"center",
      justifyContent:"center", padding:"16px",
      fontFamily:"'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
      overflow:"hidden" // Prevent body scroll
    }}>
      {/* Brand header */}
      <div style={{ textAlign:"center", marginBottom:16 }}>
        <img 
          src="/SevasetuLogo.svg" 
          alt="SevaSetu" 
          style={{ height: 170, objectFit: "contain", margin: "0 auto" }} 
        />
        <div style={{ fontSize:".82rem", color:"#6B6B8A", marginTop:8 }}>
          Connecting NGOs with Volunteers for a Better Tomorrow.
        </div>
      </div>

      {/* Card + right panel */}
      <div style={{
        width:"100%", maxWidth:820,
        background:"white", borderRadius:20,
        boxShadow:"0 20px 60px rgba(108,99,255,.15)",
        display:"grid", gridTemplateColumns:"1fr 1fr",
        overflow:"hidden",
        maxHeight: "calc(100vh - 140px)", // Ensure it fits the screen
      }}>
        {/* ── Left: form ── */}
        <div style={{ padding:"24px", overflowY: "auto", height: "100%", maxHeight: "calc(100vh - 140px)" }}>

          {/* Role toggle */}
          <div style={{
            display:"grid", gridTemplateColumns:"1fr 1fr", gap:0,
            background:"#F3F4FF", borderRadius:12, padding:4, marginBottom:16,
          }}>
            {[{v:"ngo",icon:"🏛",l:"NGO"},{v:"volunteer",icon:"🙋",l:"Volunteer"}].map(r=>(
              <button key={r.v} type="button" onClick={()=>{setRole(r.v);setMode("login");clr();}} style={{
                padding:"10px 0", borderRadius:9, border:"none",
                background:role===r.v?"white":"transparent",
                color:role===r.v?PURPLE:"#6B6B8A",
                fontWeight:role===r.v?800:500, fontSize:".88rem",
                cursor:"pointer", fontFamily:"inherit", transition:"all .2s",
                boxShadow:role===r.v?"0 2px 8px rgba(108,99,255,.15)":"none",
                display:"flex", alignItems:"center", justifyContent:"center", gap:6,
              }}>
                <span>{r.icon}</span> {r.l}
              </button>
            ))}
          </div>

          {/* Login / Signup toggle */}
          <div style={{ display:"flex", gap:0, borderBottom:`2px solid #F0F0F8`, marginBottom:22 }}>
            {["login","signup"].map(m=>(
              <button key={m} type="button" onClick={()=>{setMode(m);clr();}} style={{
                flex:1, padding:"8px 0", border:"none", background:"transparent",
                fontWeight:mode===m?800:500, fontSize:".85rem",
                color:mode===m?PURPLE:"#9090A8", cursor:"pointer", fontFamily:"inherit",
                borderBottom:mode===m?`2.5px solid ${PURPLE}`:"2px solid transparent",
                marginBottom:-2, transition:"color .15s",
                textTransform:"capitalize",
              }}>{m === "login" ? "Login" : "Sign Up"}</button>
            ))}
          </div>

          <form onSubmit={doAuth}>
            {/* Google */}
            <button type="button" onClick={doGoogle} style={{ ...ghostBtn, marginBottom:16 }} disabled={loading}>
              <GoogleIcon /> Continue with Google
            </button>

            <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16 }}>
              <div style={{ flex:1, height:1, background:"#E2E5F1" }} />
              <span style={{ fontSize:".72rem", color:"#9090A8", fontWeight:600 }}>or with email</span>
              <div style={{ flex:1, height:1, background:"#E2E5F1" }} />
            </div>

            {renderForm()}

            <ErrBox msg={error} />

            <button type="submit" style={primaryBtn} disabled={loading}>
              {loading ? <Spin /> : null}
              {loading ? "Please wait…"
                : mode === "login"
                  ? `Sign In as ${role === "ngo" ? "NGO" : "Volunteer"}`
                  : `Create ${role === "ngo" ? "NGO" : "Volunteer"} Account`}
            </button>

            <div style={{ textAlign:"center", marginTop:16, fontSize:".82rem", color:"#6B6B8A" }}>
              {mode === "login"
                ? <><span>No account? </span>
                    <button type="button" onClick={()=>{setMode("signup");clr();}}
                      style={{ background:"none",border:"none",color:PURPLE,fontWeight:700,fontSize:".82rem",cursor:"pointer",fontFamily:"inherit" }}>
                      Sign up →
                    </button></>
                : <><span>Already have an account? </span>
                    <button type="button" onClick={()=>{setMode("login");clr();}}
                      style={{ background:"none",border:"none",color:PURPLE,fontWeight:700,fontSize:".82rem",cursor:"pointer",fontFamily:"inherit" }}>
                      Login →
                    </button></>
              }
            </div>
          </form>
        </div>

        {/* ── Right: image panel ── */}
        <div style={{
          background:`linear-gradient(160deg, ${PURPLE} 0%, ${PURPLE_DARK} 100%)`,
          display:"flex", flexDirection:"column", justifyContent:"flex-end",
          position:"relative", overflow:"hidden", height:"100%",
        }}>
          <img
            src="/ngo image.jpg"
            alt="Volunteers in action"
            style={{ width:"100%", height:"100%", objectFit:"cover", position:"absolute", top:0, left:0, opacity:.35 }}
          />
          <div style={{
            position:"relative", zIndex:1, padding:"28px 28px 32px",
            background:"linear-gradient(to top, rgba(90,82,213,.95) 0%, transparent 100%)",
          }}>
            <div style={{ fontSize:"1.4rem", fontWeight:900, color:"white", lineHeight:1.3, marginBottom:8 }}>
              Building Bridges,<br />Building Communities.
            </div>
            <div style={{ fontSize:"1rem", fontWeight:800, color:"#FFD93D" }}>
              Empower change.
            </div>
          </div>
        </div>
      </div>

      <p style={{ fontSize:".7rem", color:"#9090A8", marginTop:20 }}>
        © 2025 SevaSetu · Made with ♥ for a better India
      </p>

      <style>{`
        @keyframes _fi { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:none; } }
        * { box-sizing: border-box; }
      `}</style>
    </div>
  );
}
