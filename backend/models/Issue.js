const mongoose = require("mongoose");

const issueSchema = new mongoose.Schema({
  title: String,
  category: String,
  location: String,
  severity: Number,
  peopleAffected: Number,
  urgency: String,
  priorityScore: Number,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Issue", issueSchema);
