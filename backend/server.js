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
const calculatePriority = require('./utils/priority');
const matchVolunteer = require('./utils/match');

const app = express();

// Enable CORS
app.use(cors());

// Parse JSON bodies
app.use(express.json());

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

// GET all issues — sorted by priority (most critical first)
app.get("/issues", async (req, res) => {
  try {
    const issues = await Issue.find().sort({ priorityScore: -1 });
    res.json(issues);
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
    const assignment = await Assignment.create({ issueId, volunteerId });
    res.json(assignment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all assignments
app.get("/assignments", async (req, res) => {
  try {
    const assignments = await Assignment.find();
    res.json(assignments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────
// START SERVER
// ─────────────────────────────────────────────

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
