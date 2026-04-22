require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const pdf = require('pdf-parse');

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

// ─────────────────────────────────────────────
// AUTH ROUTES
// ─────────────────────────────────────────────
app.use('/auth', authRouter);

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

// CSV Upload → auto-calculate priorityScore
app.post("/upload-csv", upload.single("file"), (req, res) => {
  const results = [];

  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on("data", (data) => {
      const cleanData = {};
      for (const key in data) {
        const cleanKey = key.replace(/^\uFEFF/, '').trim().toLowerCase();
        // specially map 'peopleaffected' to camelCase for the schema
        if (cleanKey === 'peopleaffected') {
          cleanData['peopleAffected'] = data[key]?.trim();
        } else {
          cleanData[cleanKey] = data[key]?.trim();
        }
      }
      results.push(cleanData);
    })
    .on("end", async () => {
      try {
        for (let item of results) {
          const priorityScore = calculatePriority({
            severity: Number(item.severity),
            peopleAffected: Number(item.peopleAffected),
            urgency: item.urgency
          });

          await Issue.create({
            title: item.title,
            category: item.category,
            location: item.location,
            severity: Number(item.severity),
            peopleAffected: Number(item.peopleAffected),
            urgency: item.urgency,
            priorityScore
          });
        }

        fs.unlinkSync(req.file.path);
        res.json({ message: "CSV uploaded successfully", count: results.length });
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });
});

// PDF Upload
app.post("/upload-pdf", upload.single("file"), async (req, res) => {
  try {
    const dataBuffer = fs.readFileSync(req.file.path);
    const data = await pdf(dataBuffer);
    const text = data.text;

    const issueData = {
      title: text.match(/Title:\s(.+)/)?.[1]?.trim(),
      category: text.match(/Category:\s(.+)/)?.[1]?.trim(),
      location: text.match(/Location:\s(.+)/)?.[1]?.trim(),
      severity: Number(text.match(/Severity:\s(.+)/)?.[1]) || 0,
      peopleAffected: Number(text.match(/PeopleAffected:\s(.+)/)?.[1]) || 0,
      urgency: text.match(/Urgency:\s(.+)/)?.[1]?.trim()?.toLowerCase() || "low"
    };

    issueData.priorityScore = calculatePriority(issueData);

    await Issue.create(issueData);
    fs.unlinkSync(req.file.path);

    res.json({ message: "PDF processed", issue: issueData });
  } catch (err) {
    res.status(500).json({ error: err.message });
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
