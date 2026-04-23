const mongoose = require("mongoose");

const ngoSchema = new mongoose.Schema({
  name:          { type: String, required: true },
  contactPerson: { type: String },
  email:         { type: String, unique: true, required: true },
  firebaseUid:   { type: String, index: true },
  organization:  { type: String },
  focusArea:     { type: String },
  location:      { type: String },
  photoURL:      { type: String },
  role:          { type: String, default: "ngo" },
  createdAt:     { type: Date, default: Date.now },
});

module.exports = mongoose.model("NGO", ngoSchema);
