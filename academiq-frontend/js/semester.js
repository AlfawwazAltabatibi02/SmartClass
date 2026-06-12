/**
 * Returns the current academic semester string, e.g. "Spring 2026".
 */
function getCurrentSemester() {
  var now = new Date();
  var year = now.getFullYear();
  var month = now.getMonth(); // 0-indexed
  if (month >= 8) return 'Fall ' + year;
  if (month >= 5) return 'Summer ' + year;
  return 'Spring ' + year;
}
