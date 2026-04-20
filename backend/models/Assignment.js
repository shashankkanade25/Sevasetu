const mongoose = require("mongoose");

const assignmentSchema = new mongoose.Schema({
  issueId: { type: mongoose.Schema.Types.ObjectId, ref: 'Issue', required: true },
  volunteerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Volunteer', required: true },
  status: { type: String, default: "assigned", enum: ["assigned", "in_progress", "completed"] },
  acceptedAt: Date,
  completedAt: Date,
  notes: String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Assignment", assignmentSchema);
