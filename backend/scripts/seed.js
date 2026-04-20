const mongoose = require('mongoose');
const Issue = require('../models/Issue');
const Volunteer = require('../models/Volunteer');
const calculatePriority = require('../utils/priority');

const MONGO_URI = "mongodb+srv://sevasetu_db_user:Shashank+1233@sevasetu.dpigm7b.mongodb.net/";

const SEED_ISSUES = [
  { title: "Oxygen Supply Shortage", location: "Mumbai", category: "medical", severity: 10, peopleAffected: 250, urgency: "urgent" },
  { title: "Flash Flood Warning", location: "Pune", category: "flood", severity: 9, peopleAffected: 1200, urgency: "urgent" },
  { title: "Drinking Water Contamination", location: "Bangalore", category: "water", severity: 7, peopleAffected: 450, urgency: "high" },
  { title: "Rural School Roof Collapse", location: "Nagpur", category: "education", severity: 6, peopleAffected: 80, urgency: "medium" },
  { title: "Migrant Food Shortage", location: "Delhi", category: "food", severity: 8, peopleAffected: 500, urgency: "high" },
  { title: "Public Health Facility Power Failure", location: "Hyderabad", category: "medical", severity: 9, peopleAffected: 150, urgency: "urgent" },
  { title: "Bridge Washout", location: "Guwahati", category: "infrastructure", severity: 7, peopleAffected: 3000, urgency: "high" },
  { title: "Cyclone Shelter Overcrowding", location: "Bhubaneswar", category: "disaster", severity: 8, peopleAffected: 600, urgency: "high" },
  { title: "Medical Waste Disposal Crisis", location: "Chennai", category: "medical", severity: 5, peopleAffected: 1000, urgency: "medium" },
  { title: "Drought Water Rationing", location: "Jaipur", category: "water", severity: 6, peopleAffected: 5000, urgency: "medium" }
];

const SEED_VOLUNTEERS = [
  { name: "Arjun Mehta", email: "arjun@example.com", phone: "+91 98200 12345", location: "Mumbai", skills: ["medical", "disaster"], completedTasks: 12 },
  { name: "Priya Sharma", email: "priya@example.com", phone: "+91 98765 43210", location: "Pune", skills: ["logistics", "food"], completedTasks: 5 },
  { name: "Rahul Das", email: "rahul@example.com", phone: "+91 99000 11122", location: "Bangalore", skills: ["water", "construction"], completedTasks: 8 },
  { name: "Sneha Reddy", email: "sneha@example.com", phone: "+91 94444 55555", location: "Hyderabad", skills: ["medical", "counseling"], completedTasks: 3 },
  { name: "Ananya Iyer", email: "ananya@example.com", phone: "+91 91111 22222", location: "Delhi", skills: ["teaching", "food"], completedTasks: 15 }
];

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("🌱 Connected to MongoDB. Seeding data...");

    // Clear existing
    await Issue.deleteMany({});
    await Volunteer.deleteMany({});
    
    // Seed Volunteers
    const vResult = await Volunteer.insertMany(SEED_VOLUNTEERS);
    console.log(`✅ Seeded ${vResult.length} Volunteers`);

    // Seed Issues (Calculate Priority first)
    const issuesToInsert = SEED_ISSUES.map(issue => ({
      ...issue,
      priorityScore: calculatePriority(issue),
      status: 'open'
    }));
    const iResult = await Issue.insertMany(issuesToInsert);
    console.log(`✅ Seeded ${iResult.length} Issues`);

    console.log("\n🚀 DATABASE READY FOR DEMO");
    process.exit(0);
  } catch (err) {
    console.error("❌ Seeding failed:", err);
    process.exit(1);
  }
}

seed();
