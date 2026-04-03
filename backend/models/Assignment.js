const mongoose = require("mongoose");

const assignmentSchema = new mongoose.Schema({
  issueId: String,
  volunteerId: String,
  status: { type: String, default: "assigned" },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Assignment", assignmentSchema);
