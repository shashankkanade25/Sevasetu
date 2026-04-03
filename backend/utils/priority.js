function calculatePriority(issue) {
  const urgencyObj = issue.urgency ? issue.urgency.toString().toLowerCase().trim() : 'low';
  const urgencyMap = { low: 1, medium: 3, high: 5 };

  return (
    (Number(issue.severity) || 0) * 0.4 +
    (Number(issue.peopleAffected) || 0) * 0.3 +
    (urgencyMap[urgencyObj] || 0) * 0.2 +
    1 * 0.1
  );
}

module.exports = calculatePriority;
