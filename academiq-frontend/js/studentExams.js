/**
 * Single source of truth for this student's exam schedule.
 *
 * Each entry:
 *   course   course code + name
 *   date     display string for the full date/time/hall line
 *   dateObj  ISO string used for sorting / "next exam" calculation
 *   hall     hall/room string
 *   time     time string
 *   type     'midterm' | 'final'
 *   badge    short badge label ('MID' | 'FINAL')
 *   cls      CSS class for the badge
 *
 * 
 * To add / change an exam, edit THIS file only.
 * The overview card AND the full exam tab both read from here.
 * 
 */
//  No exams are scheduled yet 
// Add entries here when exams are confirmed.
// All three views (stat card, overview card, exam tables) update automatically.
//
// Example entry:
// {
//   course:  'CS301 Midterm',
//   date:    'Mar 13  10:00 AM  Hall A',
//   dateObj: '2026-03-13T10:00:00',
//   hall:    'Hall A',
//   time:    '10:00 AM',
//   type:    'midterm',   // 'midterm' | 'final'
//   badge:   'MID',
//   cls:     'exam-midterm',
// },
const STUDENT_EXAMS = [];

/** All midterm entries */
const MIDTERM_EXAMS = STUDENT_EXAMS.filter(e => e.type === 'midterm');

/** All final entries */
const FINAL_EXAMS = STUDENT_EXAMS.filter(e => e.type === 'final');

/**
 * Returns the next upcoming exam (closest future date),
 * or null if none remain.
 */
function getNextExam() {
  const now = new Date();
  const upcoming = STUDENT_EXAMS
    .filter(e => new Date(e.dateObj) > now)
    .sort((a, b) => new Date(a.dateObj) - new Date(b.dateObj));
  return upcoming[0] ?? null;
}

/**
 * Days until the next exam, rounded down.
 * Returns null if no future exams.
 */
function daysUntilNextExam() {
  const next = getNextExam();
  if (!next) return null;
  const diff = new Date(next.dateObj) - new Date();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}
