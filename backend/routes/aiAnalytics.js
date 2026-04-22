const express = require("express");
const router = express.Router();
const { GoogleGenAI } = require("@google/genai");

const Issue = require("../models/Issue");
const Volunteer = require("../models/Volunteer");
const Assignment = require("../models/Assignment");

// ─────────────────────────────────────────────
// GET /api/ai-analytics
// Aggregates live DB metrics → sends to Gemini → returns markdown insights
// ─────────────────────────────────────────────
router.get("/ai-analytics", async (req, res) => {
  try {
    // ── 1. Unresolved issues grouped by severity bucket ──
    const severityBuckets = await Issue.aggregate([
      { $match: { status: { $ne: "resolved" } } },
      {
        $group: {
          _id: {
            $switch: {
              branches: [
                { case: { $gte: ["$severity", 8] }, then: "High" },
                { case: { $gte: ["$severity", 5] }, then: "Medium" },
              ],
              default: "Low",
            },
          },
          count: { $sum: 1 },
          avgPriority: { $avg: "$priorityScore" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // ── 2. Critical unassigned: High severity + open (no volunteer) ──
    const criticalUnassigned = await Issue.countDocuments({
      severity: { $gte: 8 },
      status: "open",
      assignedTo: null,
    });

    // ── 3. Total unresolved issues ──
    const totalUnresolved = await Issue.countDocuments({
      status: { $ne: "resolved" },
    });

    // ── 4. Volunteer availability ──
    const totalVolunteers = await Volunteer.countDocuments();
    const availableVolunteers = await Volunteer.countDocuments({
      availability: true,
    });

    // Count volunteers currently on active (non-completed) assignments
    const busyVolunteerIds = await Assignment.distinct("volunteerId", {
      status: { $in: ["assigned", "in_progress"] },
    });
    const busyVolunteers = busyVolunteerIds.length;

    // ── 5. Category breakdown (unresolved only) ──
    const categoryBreakdown = await Issue.aggregate([
      { $match: { status: { $ne: "resolved" } } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // ── 6. Location hotspots (unresolved, top 5) ──
    const locationHotspots = await Issue.aggregate([
      { $match: { status: { $ne: "resolved" } } },
      { $group: { _id: "$location", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    // ── Build the payload for Gemini ──
    const metricsPayload = {
      timestamp: new Date().toISOString(),
      issues: {
        totalUnresolved,
        criticalUnassigned,
        severityDistribution: severityBuckets.map((b) => ({
          level: b._id,
          count: b.count,
          avgPriorityScore: Math.round(b.avgPriority || 0),
        })),
        categoryBreakdown: categoryBreakdown.map((c) => ({
          category: c._id,
          count: c.count,
        })),
        locationHotspots: locationHotspots.map((l) => ({
          location: l._id,
          count: l.count,
        })),
      },
      volunteers: {
        total: totalVolunteers,
        available: availableVolunteers,
        currentlyBusy: busyVolunteers,
        shortfall: Math.max(0, criticalUnassigned - availableVolunteers),
      },
    };

    // ── Call Gemini ──
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res
        .status(500)
        .json({ error: "GEMINI_API_KEY is not configured on the server." });
    }

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `You are an AI crisis manager for a disaster relief NGO. Analyze this JSON data containing our real-time disaster relief metrics. Provide a brief, urgent analysis focusing specifically on:
1) Issue Severity load — how many issues at each level, what the average priority scores tell us
2) Resource shortages vs critical unassigned tasks — compare available volunteers against critical unassigned issues, highlight the shortfall
3) Category and location hotspots — which categories and areas need the most attention right now
4) 2-3 immediate, concrete action steps for the admin team

Format strictly in Markdown with headings (##) and bullet points. Be direct and concise. No pleasantries.

\`\`\`json
${JSON.stringify(metricsPayload, null, 2)}
\`\`\``;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    const insights = response.text;

    res.json({ insights, metrics: metricsPayload });
  } catch (err) {
    console.error("AI Analytics error:", err);
    res.status(500).json({ error: err.message || "AI Analytics failed" });
  }
});

module.exports = router;
