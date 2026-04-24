require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const { PDFParse } = require('pdf-parse');

const Issue = require('./models/Issue');
const Volunteer = require('./models/Volunteer');
const Assignment = require('./models/Assignment');
const Notification = require('./models/Notification');
const NGO = require('./models/NGO');
const calculatePriority = require('./utils/priority');
const matchVolunteer = require('./utils/match');
const { verifyToken } = require('./middleware/verifyToken');
const authRouter = require('./routes/auth');

const app = express();

// Helper for notifications
async function notify(userId, type, title, message, issueId = null) {
  try {
    await Notification.create({ userId, type, title, message, issueId });
  } catch (err) {
    console.error("Notification failed:", err);
  }
}

// Enable CORS
app.use(cors());

// Parse JSON bodies
app.use(express.json());

// Logger
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// ─────────────────────────────────────────────
// AUTH ROUTES
// ─────────────────────────────────────────────
app.use('/auth', authRouter);

app.patch("/update-profile", verifyToken, async (req, res) => {
  try {
    const { id, role } = req.user;
    const updateData = req.body;
    delete updateData.email;
    delete updateData.role;

    let updatedUser;
    if (role === "ngo") {
      updatedUser = await NGO.findByIdAndUpdate(id, updateData, { new: true });
    } else if (role === "volunteer") {
      updatedUser = await Volunteer.findByIdAndUpdate(id, updateData, { new: true });
    }

    if (!updatedUser) return res.status(404).json({ error: "User not found" });
    res.json(updatedUser);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// MongoDB Connection
mongoose.connect("mongodb+srv://sevasetu_db_user:Shashank+1233@sevasetu.dpigm7b.mongodb.net/")
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.log(err));

// Multer setup for file uploads
const upload = multer({ dest: "uploads/" });

// ─────────────────────────────────────────────
// TEST
// ─────────────────────────────────────────────

app.get('/test', (req, res) => {
  res.json({ message: 'Server is running and the test API works!' });
});

// ─────────────────────────────────────────────
// ISSUES
// ─────────────────────────────────────────────

// 3. Validation function
function validateIssueData(data) {
  if (!data.title || data.title.trim() === "") return "Title is missing";
  if (isNaN(data.severity)) return "Severity is NaN after mapping";
  if (isNaN(data.peopleAffected)) return "PeopleAffected is NaN";
  return null;
}

// 2. Data normalization function
function normalizeIssueData(row) {
  const normalized = {};
  
  for (const key in row) {
    const cleanKey = key.replace(/^\uFEFF/, '').trim().toLowerCase();
    
    if (["peopleaffected", "affected_people", "people", "count"].includes(cleanKey)) {
      normalized.peopleAffected = row[key];
    } else if (["severity", "priority"].includes(cleanKey)) {
      normalized.severity = row[key];
    } else if (["skillsrequired", "skills"].includes(cleanKey)) {
      normalized.skillsRequired = row[key];
    } else {
      normalized[cleanKey] = row[key];
    }
  }

  for (const key in normalized) {
    if (typeof normalized[key] === 'string') {
      normalized[key] = normalized[key].trim();
    }
  }

  const severityMap = { low: 1, medium: 2, high: 3, urgent: 5 };
  if (typeof normalized.severity === 'string') {
    const sevLower = normalized.severity.toLowerCase();
    normalized.severity = severityMap[sevLower] !== undefined ? severityMap[sevLower] : Number(normalized.severity);
  } else {
    normalized.severity = Number(normalized.severity);
  }

  normalized.peopleAffected = Number(normalized.peopleAffected);

  if (normalized.skillsRequired) {
    normalized.skillsRequired = normalized.skillsRequired
      .split(/[,;]/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  } else {
    normalized.skillsRequired = [];
  }

  if (!normalized.status) normalized.status = 'open';
  if (!normalized.urgency) normalized.urgency = 'low';

  return normalized;
}

// Helper: parse tabular OR key-value PDF text into issue rows
function parsePDFTextToIssues(text) {
  const issues = [];
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  // ── Mode 1: Key-value blocks (Title: ..., Severity: ...) ─────────────────
  const hasKeyValue = lines.some(l => /^title\s*:/i.test(l));
  if (hasKeyValue) {
    const blocks = text.split(/\n{2,}/).map(b => b.trim()).filter(b => b.length > 0);
    for (const block of blocks) {
      const row = {};
      for (const line of block.split('\n')) {
        const m = line.match(/^([\w\s]+?):\s*(.+)$/);
        if (!m) continue;
        const key = m[1].trim().toLowerCase().replace(/[\s_]+/g, '');
        const val = m[2].trim();
        if (key === 'title') row.title = val;
        else if (key === 'category') row.category = val;
        else if (['location', 'area'].includes(key)) row.location = val;
        else if (['severity', 'priority'].includes(key)) row.severity = val;
        else if (['peopleaffected', 'affected', 'people', 'count'].includes(key)) row.peopleAffected = val;
        else if (['description', 'desc'].includes(key)) row.description = val;
        else if (['skills', 'skillsrequired'].includes(key)) row.skillsRequired = val;
        else if (key === 'urgency') row.urgency = val;
      }
      if (row.title) issues.push(row);
    }
    return issues;
  }

  // ── Mode 2: Table format ──────────────────────────────────────────────────
  // Find header row that contains "title" AND one of location/priority/affected
  let headerIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].toLowerCase();
    if (l.includes('title') && (l.includes('location') || l.includes('priority') || l.includes('affected') || l.includes('severity'))) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx === -1) return issues;

  // Known severity keywords for heuristic parsing
  const SEVERITY_WORDS = new Set(['low', 'medium', 'high', 'urgent', 'critical']);

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    // Strategy: anchor on the first integer in the line (= peopleAffected)
    const numMatch = line.match(/\b(\d+)\b/);
    if (!numMatch) continue;

    const numPos = line.indexOf(numMatch[1]);
    const beforeNum = line.slice(0, numPos).trim();   // "Drought Relief Support Solapur High"
    const afterNum  = line.slice(numPos + numMatch[1].length).trim(); // "Water Crisis"

    const beforeTokens = beforeNum.split(/\s+/);

    // Find severity word (last severity keyword before the number)
    let sevIdx = -1;
    for (let j = beforeTokens.length - 1; j >= 0; j--) {
      if (SEVERITY_WORDS.has(beforeTokens[j].toLowerCase())) { sevIdx = j; break; }
    }

    let title = '', location = '', severity = '';
    if (sevIdx > 0) {
      severity = beforeTokens[sevIdx];
      const locAndTitle = beforeTokens.slice(0, sevIdx);
      // Heuristic: the LAST word before severity is the location (single-word city names)
      location = locAndTitle.pop() || '';
      title    = locAndTitle.join(' ');
    } else {
      // No severity keyword found — take last word as location, rest as title
      const parts = beforeTokens.slice();
      location = parts.pop() || '';
      title    = parts.join(' ');
    }

    if (!title) continue;

    issues.push({
      title:          title.trim(),
      location:       location.trim(),
      severity:       severity || 'medium',
      peopleAffected: numMatch[1],
      category:       afterNum.trim(),
    });
  }

  return issues;
}

// 1. Unified upload route — handles both CSV and PDF
app.post("/upload-issues", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const ext = req.file.originalname.split('.').pop().toLowerCase();
  const results = [];
  const errors = [];
  let successCount = 0;
  let failedCount = 0;

  const processRows = async (rows) => {
    for (let i = 0; i < rows.length; i++) {
      const normalizedData = normalizeIssueData(rows[i]);
      const validationError = validateIssueData(normalizedData);
      if (validationError) {
        failedCount++;
        errors.push({ row: i + 1, reason: validationError });
      } else {
        successCount++;
        normalizedData.priorityScore = calculatePriority({
          severity: normalizedData.severity,
          peopleAffected: normalizedData.peopleAffected,
          urgency: normalizedData.urgency
        });
        results.push(normalizedData);
      }
    }
    if (results.length > 0) {
      await Issue.insertMany(results, { ordered: false }).catch(e => {
        console.error("insertMany error:", e.message);
      });
    }
    try { fs.unlinkSync(req.file.path); } catch (_) { }
    return res.json({ successCount, failedCount, errors });
  };

  if (ext === 'csv') {
    const rows = [];
    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on("data", (data) => rows.push(data))
      .on("error", (err) => {
        try { fs.unlinkSync(req.file.path); } catch (_) { }
        return res.status(500).json({ error: `CSV parse error: ${err.message}` });
      })
      .on("end", async () => {
        try {
          await processRows(rows);
        } catch (err) {
          res.status(500).json({ error: err.message });
        }
      });

  } else if (ext === 'pdf') {
    try {
      const dataBuffer = fs.readFileSync(req.file.path);
      const parser = new PDFParse({ verbosity: 0, data: new Uint8Array(dataBuffer) });
      await parser.load();
      const textResult = await parser.getText();
      // getText returns { pages: [{text}] } or a string — normalise
      let allText = '';
      if (typeof textResult === 'string') {
        allText = textResult;
      } else if (textResult && textResult.pages) {
        allText = textResult.pages.map(p => (typeof p === 'string' ? p : p.text || '')).join('\n\n');
      } else {
        allText = String(textResult);
      }
      console.log('[PDF] Extracted text (first 500):', allText.slice(0, 500));
      const rows = parsePDFTextToIssues(allText);
      console.log('[PDF] Parsed rows:', rows);
      if (rows.length === 0) {
        try { fs.unlinkSync(req.file.path); } catch (_) { }
        return res.status(422).json({ error: "No valid issues found in PDF. Use table format with columns: Title, Location, Priority/Severity, Affected, Category" });
      }
      await processRows(rows);
    } catch (err) {
      try { fs.unlinkSync(req.file.path); } catch (_) { }
      return res.status(500).json({ error: `PDF parse error: ${err.message}` });
    }

  } else {
    try { fs.unlinkSync(req.file.path); } catch (_) { }
    return res.status(400).json({ error: "Unsupported file type. Upload CSV or PDF only." });
  }
});

// GET all issues — with rich filtering and search
app.get("/issues", async (req, res) => {
  try {
    const { location, category, urgency, status, search } = req.query;
    let query = {};

    if (location && location !== 'All') query.location = location;
    if (category && category !== 'All') query.category = category;
    if (urgency && urgency !== 'All') query.urgency = urgency.toLowerCase();
    if (status && status !== 'All') query.status = status;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } }
      ];
    }

    const issues = await Issue.find(query).sort({ priorityScore: -1 });
    res.json(issues);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET issue stats for dashboard tiles
app.get("/issues/stats", async (req, res) => {
  try {
    const total = await Issue.countDocuments();
    const urgent = await Issue.countDocuments({ priorityScore: { $gte: 75 } });
    const resolved = await Issue.countDocuments({ status: "resolved" });
    const open = await Issue.countDocuments({ status: { $ne: "resolved" } });
    const categoryStats = await Issue.aggregate([
      { $group: { _id: "$category", count: { $sum: 1 } } }
    ]);

    res.json({ total, urgent, resolved, open, categoryStats });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Recalculate priorityScore for ALL existing issues
app.post("/recalculate-priorities", async (req, res) => {
  try {
    const issues = await Issue.find();
    let updated = 0;

    for (let issue of issues) {
      const priorityScore = calculatePriority({
        severity: issue.severity,
        peopleAffected: issue.peopleAffected,
        urgency: issue.urgency
      });
      await Issue.findByIdAndUpdate(issue._id, { priorityScore });
      updated++;
    }

    res.json({ message: `Recalculated priorities for ${updated} issues` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// VOLUNTEERS
// ─────────────────────────────────────────────

// Add a volunteer
app.post("/volunteers", async (req, res) => {
  try {
    const volunteer = await Volunteer.create(req.body);
    res.json(volunteer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all volunteers
app.get("/volunteers", async (req, res) => {
  try {
    const volunteers = await Volunteer.find();
    res.json(volunteers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get a single volunteer by email
app.get("/volunteers/by-email", async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) return res.status(400).json({ error: "email query param is required" });

    const volunteer = await Volunteer.findOne({ email });
    if (!volunteer) return res.status(404).json({ error: "Volunteer not found" });

    res.json(volunteer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get a single volunteer by MongoDB _id
app.get("/volunteers/:id", async (req, res) => {
  try {
    const v = await Volunteer.findById(req.params.id);
    if (!v) return res.status(404).json({ error: "Not found" });
    res.json(v);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update volunteer availability
app.patch("/volunteers/:id", async (req, res) => {
  try {
    const v = await Volunteer.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(v);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// MATCHING
// ─────────────────────────────────────────────

// Get top 3 matched volunteers for an issue
app.get("/match/:issueId", async (req, res) => {
  try {
    const issue = await Issue.findById(req.params.issueId);
    if (!issue) return res.status(404).json({ error: "Issue not found" });

    const volunteers = await Volunteer.find();

    const ranked = volunteers
      .map(v => ({
        volunteer: v,
        score: matchVolunteer(issue, v)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    res.json(ranked);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// ASSIGNMENTS
// ─────────────────────────────────────────────

// Assign a volunteer to an issue
app.post("/assign", async (req, res) => {
  try {
    const { issueId, volunteerId } = req.body;

    // Guard: prevent duplicate active assignments on same issue
    const existing = await Assignment.findOne({ issueId, status: { $in: ["assigned", "in_progress"] } });
    if (existing) return res.status(409).json({ error: "Issue already has an active assignment" });

    const assignment = await Assignment.create({ issueId, volunteerId, status: "assigned" });

    // Update Issue status
    await Issue.findByIdAndUpdate(issueId, { status: 'assigned', assignedTo: volunteerId });

    // Notify Volunteer
    const vol = await Volunteer.findById(volunteerId);
    if (vol) {
      await notify(vol.firebaseUid || vol._id, "assignment", "New Assignment", `You have been assigned to a new task.`, issueId);
    }

    res.json(assignment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all assignments — filter by volunteerId if provided
app.get("/assignments", async (req, res) => {
  try {
    const filter = req.query.volunteerId ? { volunteerId: req.query.volunteerId } : {};
    const assignments = await Assignment.find(filter).sort({ createdAt: -1 });
    res.json(assignments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH assignment status (pending → in_progress → completed)
app.patch("/assignment/:id", async (req, res) => {
  try {
    const { status, notes } = req.body;
    const assignment = await Assignment.findByIdAndUpdate(
      req.params.id,
      { 
        status, 
        notes, 
        ...(status === 'completed' ? { completedAt: Date.now() } : {}),
        ...(status === 'in_progress' ? { acceptedAt: Date.now() } : {})
      },
      { new: true }
    );
    if (!assignment) return res.status(404).json({ error: "Assignment not found" });

    // Update the issue status accordingly
    const issueStatus = status === 'completed' ? 'resolved' : 'assigned';
    await Issue.findByIdAndUpdate(assignment.issueId, { 
      status: issueStatus, 
      ...(status === 'completed' ? { resolvedAt: Date.now() } : {}) 
    });

    if (status === 'completed') {
      // Reward the volunteer
      await Volunteer.findByIdAndUpdate(assignment.volunteerId, { $inc: { completedTasks: 1 } });
      // Notify Admin
      await notify("admin", "completion", "Task Completed", `Goal reached! Issue #${assignment.issueId.toString().slice(-4)} marked as resolved.`, assignment.issueId);
      // Notify Volunteer
      const vol = await Volunteer.findById(assignment.volunteerId);
      if (vol) {
        await notify(vol.firebaseUid || vol._id, "success", "Great Work!", `You've successfully completed the assignment. Thank you!`, assignment.issueId);
      }
    } else if (status === 'in_progress') {
       // Notify Admin
       await notify("admin", "update", "Task Started", `Volunteer is now on-site for Issue #${assignment.issueId.toString().slice(-4)}.`, assignment.issueId);
    }

    res.json(assignment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// NOTIFICATIONS
// ─────────────────────────────────────────────

app.get("/notifications", async (req, res) => {
  try {
    const { userId } = req.query;
    const notifs = await Notification.find({ userId }).sort({ createdAt: -1 }).limit(20);
    res.json(notifs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch("/notifications/:id/read", async (req, res) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, { read: true });
    res.json({ message: "Read" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// ANALYTICS
// ─────────────────────────────────────────────

app.get("/analytics/overview", async (req, res) => {
  try {
    const totalIssues = await Issue.countDocuments();
    const resolvedIssues = await Issue.countDocuments({ status: "resolved" });
    const catStats = await Issue.aggregate([{ $group: { _id: "$category", count: { $sum: 1 } } }]);
    const locStats = await Issue.aggregate([{ $group: { _id: "$location", count: { $sum: 1 } } }]);
    
    // Sort locStats by count desc
    locStats.sort((a, b) => b.count - a.count);

    res.json({
      totalIssues,
      resolvedIssues,
      resolutionRate: totalIssues > 0 ? (resolvedIssues / totalIssues) * 100 : 0,
      categoryDistribution: catStats,
      mostAffectedAreas: locStats.slice(0, 5)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// VOLUNTEER-FACING APIS
// ─────────────────────────────────────────────

// GET /recommendations/:volunteerId  (JWT protected)
app.get("/recommendations/:volunteerId", verifyToken, async (req, res) => {
  try {
    const volunteer = await Volunteer.findById(req.params.volunteerId);
    if (!volunteer) return res.status(404).json({ error: "Volunteer not found" });

    // Get all open issues (not yet assigned or resolved)
    const issues = await Issue.find({ status: "open" }).sort({ priorityScore: -1 });

    // Score each issue against this volunteer
    const scored = issues.map(issue => {
      const matchScore = matchVolunteer(issue, volunteer);
      return { ...issue.toObject(), matchScore };
    });

    // Sort by matchScore DESC then priorityScore DESC
    scored.sort((a, b) => b.matchScore - a.matchScore || b.priorityScore - a.priorityScore);

    res.json(scored);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /assignments/active/:volunteerId  (JWT protected)
app.get("/assignments/active/:volunteerId", verifyToken, async (req, res) => {
  try {
    const assignments = await Assignment.find({
      volunteerId: req.params.volunteerId,
      status: { $in: ["assigned", "in_progress"] }
    }).sort({ createdAt: -1 });

    // Populate issue details
    const populated = await Promise.all(assignments.map(async (a) => {
      const issue = await Issue.findById(a.issueId);
      return { ...a.toObject(), issue };
    }));

    res.json(populated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /history/:volunteerId  (JWT protected)
app.get("/history/:volunteerId", verifyToken, async (req, res) => {
  try {
    const assignments = await Assignment.find({
      volunteerId: req.params.volunteerId,
      status: "completed"
    }).sort({ completedAt: -1 });

    const populated = await Promise.all(assignments.map(async (a) => {
      const issue = await Issue.findById(a.issueId);
      return { ...a.toObject(), issue };
    }));

    res.json(populated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// AI ANALYTICS ROUTE
// ─────────────────────────────────────────────
app.use('/api', require('./routes/aiAnalytics'));

// ─────────────────────────────────────────────
// START SERVER
// ─────────────────────────────────────────────

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
