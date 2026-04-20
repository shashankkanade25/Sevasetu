function calculatePriority(issue) {
  const severityVal = Number(issue.severity) || 0; // expected 0-10
  const peopleVal = Number(issue.peopleAffected) || 0;
  
  // Urgency mapping (0-8 range)
  const urgencyStr = issue.urgency ? issue.urgency.toString().toLowerCase().trim() : 'low';
  const urgencyMap = { low: 1, medium: 3, high: 5, urgent: 8 };
  const urgencyVal = urgencyMap[urgencyStr] || 1;

  // Category weights (0.1 weight in final, but multiplier on base)
  const categoryStr = issue.category ? issue.category.toString().toLowerCase().trim() : 'other';
  const criticalCategories = ['medical', 'disaster', 'flood', 'rescue'];
  const catWeight = criticalCategories.includes(categoryStr) ? 1.5 : 1.0;

  // Logarithmic scale for people affected (attenuates extreme numbers)
  // log10(100) = 2, log10(1000) = 3. Max score capped at 5.
  const logPeople = Math.min(5, Math.log10(peopleVal + 1)); 

  // Time decay calculation
  // Issues created in the last 24h get full 10pts. 
  // Older issues gradually lose points over 7 days.
  const hoursOld = (Date.now() - new Date(issue.createdAt || Date.now())) / 3600000;
  const timeVal = Math.max(0, 10 - (hoursOld / 24));

  const score = (
    (severityVal * 3.5) +               // Max 35 pts (if severity=10)
    (logPeople * 5) +                   // Max 25 pts (if logPeople=5)
    (urgencyVal * 2.5) +                // Max 20 pts (if urgent=8)
    (catWeight * 10) +                  // Max 15 pts (if critical cat)
    (timeVal)                           // Max 10 pts (if brand new)
  );

  return Math.min(100, Math.round(score));
}

module.exports = calculatePriority;
