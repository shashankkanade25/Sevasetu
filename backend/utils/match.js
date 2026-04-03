function matchVolunteer(issue, volunteer) {
  let score = 0;

  if (volunteer.skills.includes(issue.category)) score += 50;
  if (volunteer.location === issue.location) score += 30;
  if (volunteer.availability) score += 20;

  return score;
}

module.exports = matchVolunteer;
