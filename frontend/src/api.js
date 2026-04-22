import axios from "axios";

const BASE_URL = "http://localhost:3000";

const api = axios.create({ baseURL: BASE_URL });

// Issues
export const getIssues       = (params)     => api.get("/issues", { params });
export const getIssueStats   = ()           => api.get("/issues/stats");
export const uploadCSV       = (formData)   => api.post("/upload-csv", formData);
export const uploadPDF       = (formData)   => api.post("/upload-pdf", formData);
export const recalculate     = ()           => api.post("/recalculate-priorities");

// Volunteers
export const getVolunteers   = ()           => api.get("/volunteers");
export const getVolunteer    = (id)         => api.get(`/volunteers/${id}`);
export const getVolunteerByEmail = (email)  => api.get("/volunteers/by-email", { params: { email } });
export const addVolunteer    = (data)       => api.post("/volunteers", data);
export const updateVolunteer = (id, data)   => api.patch(`/volunteers/${id}`, data);

// Matching & Assignments
export const matchVolunteers = (issueId)    => api.get(`/match/${issueId}`);
export const assignVolunteer = (data)       => api.post("/assign", data);
export const getAssignments  = (params)     => api.get("/assignments", { params });
export const updateAssignmentStatus = (id, data) => api.patch(`/assignment/${id}`, data);

// Notifications
export const getNotifications = (userId)    => api.get("/notifications", { params: { userId } });
export const markNotifRead    = (id)         => api.patch(`/notifications/${id}/read`);

// Analytics
export const getAnalyticsOverview = ()      => api.get("/analytics/overview");

// AI Analytics
export const getAIAnalytics      = ()      => api.get("/api/ai-analytics");
