import axios from "axios";

const BASE_URL = "http://localhost:3000";

const api = axios.create({ baseURL: BASE_URL });

/* ── Attach JWT from localStorage to every request ── */
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("seva_token");
  if (token) {
    config.headers["Authorization"] = `Bearer ${token}`;
  }
  return config;
});

// ── Issues ────────────────────────────────────────────────────────────────────
export const getIssues       = (params)   => api.get("/issues", { params });
export const getIssueStats   = ()         => api.get("/issues/stats");
export const uploadCSV       = (formData) => api.post("/upload-csv", formData);
export const uploadPDF       = (formData) => api.post("/upload-pdf", formData);
export const recalculate     = ()         => api.post("/recalculate-priorities");

// ── Volunteers ────────────────────────────────────────────────────────────────
export const getVolunteers       = ()         => api.get("/volunteers");
export const getVolunteer        = (id)       => api.get(`/volunteers/${id}`);
export const getVolunteerByEmail = (email)    => api.get("/volunteers/by-email", { params: { email } });
export const addVolunteer        = (data)     => api.post("/volunteers", data);
export const updateVolunteer     = (id, data) => api.patch(`/volunteers/${id}`, data);

// ── Matching & Assignments ────────────────────────────────────────────────────
export const matchVolunteers        = (issueId)       => api.get(`/match/${issueId}`);
export const assignVolunteer        = (data)          => api.post("/assign", data);
export const getAssignments         = (params)        => api.get("/assignments", { params });
export const updateAssignmentStatus = (id, data)      => api.patch(`/assignment/${id}`, data);

// ── Notifications ─────────────────────────────────────────────────────────────
export const getNotifications = (userId) => api.get("/notifications", { params: { userId } });
export const markNotifRead    = (id)     => api.patch(`/notifications/${id}/read`);

// ── Analytics ─────────────────────────────────────────────────────────────────
export const getAnalyticsOverview = () => api.get("/analytics/overview");
export const getAIAnalytics       = () => api.get("/api/ai-analytics");

// ── Auth ──────────────────────────────────────────────────────────────────────
export const checkUserExistence = (email) => api.get(`/auth/user/${email}`);
export const createUserProfile  = (data)  => api.post("/auth/create-user", data);
export const authMe             = ()      => api.get("/auth/me");

// ── Volunteer-facing (JWT-protected) APIs ─────────────────────────────────────
export const getRecommendations = (volunteerId)           => api.get(`/recommendations/${volunteerId}`);
export const getActiveTasks     = (volunteerId)           => api.get(`/assignments/active/${volunteerId}`);
export const getHistory         = (volunteerId)           => api.get(`/history/${volunteerId}`);
export const acceptTask         = (issueId, volunteerId)  => api.post("/assign", { issueId, volunteerId });
export const updateTaskStatus   = (assignmentId, status)  => api.patch(`/assignment/${assignmentId}`, { status });
