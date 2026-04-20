const mongoose = require("mongoose");

const issueSchema = new mongoose.Schema({
  title: String,
  category: String,
  location: String,
  lat: Number,
  lng: Number,
  severity: Number,
  peopleAffected: Number,
  urgency: String,
  priorityScore: Number,
  status: { type: String, default: 'open', enum: ['open', 'assigned', 'resolved'] },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Volunteer' },
  resolvedAt: Date,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

issueSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("Issue", issueSchema);
