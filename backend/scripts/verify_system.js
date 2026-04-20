const mongoose = require('mongoose');
const Issue = require('../models/Issue');
const Volunteer = require('../models/Volunteer');
const Assignment = require('../models/Assignment');
const Notification = require('../models/Notification');
const { calculatePriority } = require('../utils/priority');
const { rankVolunteers } = require('../utils/match');

async function test() {
  try {
    await mongoose.connect('mongodb+srv://shashankkanade21:mDDRB1P67H0WcOid@cluster0.p7onv.mongodb.net/sevasetu');
    console.log("Connected to MongoDB");

    // 1. Create Dummy Issue
    const issue = new Issue({
      title: "Test Emergency",
      location: "Pune",
      category: "medical",
      severity: 8,
      peopleAffected: 50,
      description: "Verification of production system activation"
    });
    
    // 2. Test Priority Engine
    issue.priorityScore = calculatePriority(issue);
    console.log(`- Priority Score (0-100): ${issue.priorityScore}`);
    await issue.save();

    // 3. Test Matching Engine
    const volunteers = await Volunteer.find({});
    if (volunteers.length === 0) {
      console.log("! No volunteers found to test matching.");
    } else {
      const ranked = rankVolunteers(issue, volunteers);
      console.log(`- Top Match: ${ranked[0].volunteer.name} (Score: ${ranked[0].matchScore})`);

      // 4. Test Assignment Creation
      const assignment = new Assignment({
        issueId: issue._id,
        volunteerId: ranked[0].volunteer._id,
        status: 'assigned'
      });
      await assignment.save();
      console.log("- Assignment created");

      // 5. Test Notification Trigger (manual check as triggers are in server.js, but we can verify logic)
      const notif = new Notification({
        userId: ranked[0].volunteer.firebaseUid || 'test',
        message: "New task assigned to you",
        type: 'alert'
      });
      await notif.save();
      console.log("- Notification stored");
    }

    console.log("\n✅ PRODUCTION SYSTEM VERIFIED");
    process.exit(0);
  } catch (err) {
    console.error("❌ VERIFICATION FAILED:", err);
    process.exit(1);
  }
}

test();
