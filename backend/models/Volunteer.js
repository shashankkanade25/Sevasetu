const mongoose = require("mongoose");

const volunteerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true },
  phone: String,
  firebaseUid: { type: String, index: true },
  role: { type: String, default: "volunteer" },
  skills: [String],
  location: String,
  experience: String,
  photoURL: String,
  availability: { type: Boolean, default: true },
  completedTasks: { type: Number, default: 0 },
  rating: { type: Number, default: 5 },
  joinedAt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Volunteer", volunteerSchema);
