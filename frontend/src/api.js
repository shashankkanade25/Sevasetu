import axios from "axios";

const BASE_URL = "http://localhost:3000";

const api = axios.create({ baseURL: BASE_URL });

export const getIssues       = ()           => api.get("/issues");
export const uploadCSV       = (formData)   => api.post("/upload-csv", formData);
export const uploadPDF       = (formData)   => api.post("/upload-pdf", formData);
export const getVolunteers   = ()           => api.get("/volunteers");
export const addVolunteer    = (data)       => api.post("/volunteers", data);
export const matchVolunteers = (issueId)    => api.get(`/match/${issueId}`);
export const assignVolunteer = (data)       => api.post("/assign", data);
export const getAssignments  = ()           => api.get("/assignments");
export const recalculate     = ()           => api.post("/recalculate-priorities");
