function matchVolunteer(issue, volunteer) {
  let score = 0;

  // 1. Skills Match (Max 40pts)
  // Check for exact category match or fuzzy related skills
  const issueCat = (issue.category || "").toLowerCase().trim();
  const volunteerSkills = (volunteer.skills || []).map(s => s.toLowerCase().trim());
  
  if (volunteerSkills.includes(issueCat)) {
    score += 40;
  } else {
    // Partial credit for related skill keywords
    const hasPartialMatch = volunteerSkills.some(skill => 
      skill.includes(issueCat) || issueCat.includes(skill)
    );
    if (hasPartialMatch) score += 20;
  }

  // 2. Location Proximity (Max 30pts)
  // In a real system, this would use Haversine distance, for now using string proximity
  const issueLoc = (issue.location || "").toLowerCase().trim();
  const volLoc = (volunteer.location || "").toLowerCase().trim();
  
  if (issueLoc === volLoc) {
    score += 30;
  } else if (volLoc.split(',')[0] === issueLoc.split(',')[0]) {
    // Shared city/region but different area
    score += 15;
  }

  // 3. Availability (Max 15pts)
  if (volunteer.availability) score += 15;

  // 4. Past Performance & Experience (Max 15pts)
  // Reward active volunteers
  const reliabilityBonus = Math.min(10, (volunteer.completedTasks || 0) * 2);
  const ratingBonus = ((volunteer.rating || 5) / 5) * 5;
  score += reliabilityBonus + ratingBonus;

  return Math.min(100, Math.round(score));
}

module.exports = matchVolunteer;
