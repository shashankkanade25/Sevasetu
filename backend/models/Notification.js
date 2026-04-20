const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  userId: { type: String, required: true }, // can be Firebase UID or Mongo ID
  type: {
    type: String,
    enum: ["new_issue", "assignment", "deadline", "completion"],
    required: true
  },
  title: String,
  message: String,
  issueId: { type: mongoose.Schema.Types.ObjectId, ref: "Issue" },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Notification", notificationSchema);
