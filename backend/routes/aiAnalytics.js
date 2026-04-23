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
      // Return a simulated AI response for demonstration
      const topCat = categoryBreakdown.length > 0 ? categoryBreakdown[0]._id : "General";
      const topLoc = locationHotspots.length > 0 ? locationHotspots[0]._id : "Multiple locations";
      const shortfall = Math.max(0, criticalUnassigned - availableVolunteers);
      
      const insights = `
## 🚨 Simulated AI Crisis Analysis
*(Note: GEMINI_API_KEY is not configured in backend/.env. Displaying simulated insights based on live data.)*

### 1) Issue Severity Load
- Currently tracking **${totalUnresolved} unresolved issues**.
- **${severityBuckets.find(b => b._id === "High")?.count || 0} High Severity** issues require immediate attention.

### 2) Resource Shortages vs Critical Tasks
- **${criticalUnassigned}** critical tasks are currently unassigned.
- With only **${availableVolunteers}** available volunteers, there is a shortfall of **${shortfall}** personnel.

### 3) Category and Location Hotspots
- **Category Focus:** Most issues fall under the **${topCat}** category.
- **Location Hotspot:** Highest concentration of alerts is in **${topLoc}**.

### 4) Immediate Action Steps
- **Smart Allocation:** Automatically trigger match system for the ${criticalUnassigned} critical unassigned tasks.
- **Resource Reallocation:** Re-route busy volunteers from low-priority tasks to address the ${shortfall} shortfall in high-severity zones.
      `;
      return res.json({ insights, metrics: metricsPayload });
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
