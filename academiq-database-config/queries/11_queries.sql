-- ================================================================
-- Smart Class Scheduler — Cyprus International University
-- FILE   : queries/11_queries.sql
-- PURPOSE: All useful queries — run any time after full setup
-- ================================================================
USE smart_class;

-- ════════════════════════════════════════════════════════════════
-- SCHEDULE QUERIES
-- ════════════════════════════════════════════════════════════════

-- Q1: Full weekly timetable (all classes, rooms, instructors)
SELECT * FROM v_full_schedule ORDER BY day, time_slot;

-- Q2: Schedule for a specific instructor (Dr. Serhan Danisman = id 3)
CALL sp_instructor_schedule(3);

-- Q3: All classes on Monday
SELECT * FROM v_full_schedule WHERE day = 'Monday' ORDER BY time_slot;

-- Q4: Is ST101 (room_id=1) free on Monday at 14:00?
SELECT fn_is_room_available(1, 'Monday', '14:00-15:50') AS availability;

-- ════════════════════════════════════════════════════════════════
-- ROOM QUERIES
-- ════════════════════════════════════════════════════════════════

-- Q5: Which rooms are currently empty?
SELECT * FROM v_empty_rooms;

-- Q6: All rooms in ST Building with their type
SELECT room_id, name, capacity, type
FROM rooms WHERE building_id = 1 ORDER BY type, name;

-- Q7: All lecture rooms with capacity >= 60
SELECT b.name AS building, r.name AS room, r.capacity
FROM rooms r JOIN buildings b ON r.building_id = b.building_id
WHERE r.type = 'lecture' AND r.capacity >= 60
ORDER BY r.capacity DESC;

-- Q8: Update room 3 to empty after a class ends
CALL sp_update_room_status(3, 'empty', 'Class finished at 13:00');

-- ════════════════════════════════════════════════════════════════
-- ENROLLMENT QUERIES
-- ════════════════════════════════════════════════════════════════

-- Q9: Enroll student 5 into class 7
CALL sp_enroll_student(5, 7);

-- Q10: How many students are in CMPE412 Sec.1 (class_id=1)?
SELECT fn_enrollment_count(1) AS enrolled;

-- Q11: Classes nearly full or full
SELECT class_name, enrolled_students, capacity, status
FROM v_class_enrollment WHERE status != 'AVAILABLE';

-- Q12: All classes for student Plamedi Kapuya (student_id=3)
SELECT * FROM v_student_classes WHERE student_id = 3;

-- Q13: All students in a specific class (CMPE412 Sec.1)
CALL sp_class_students(1);

-- ════════════════════════════════════════════════════════════════
-- INSTRUCTOR / OFFICE HOURS QUERIES
-- ════════════════════════════════════════════════════════════════

-- Q14: When is Prof. Mehmet Kusaf available?
SELECT * FROM v_office_hours WHERE instructor = 'Prof. Dr. Mehmet Kusaf';

-- Q15: All office hours on Wednesday
SELECT * FROM v_office_hours WHERE day = 'Wednesday';

-- ════════════════════════════════════════════════════════════════
-- EQUIPMENT & ISSUES QUERIES
-- ════════════════════════════════════════════════════════════════

-- Q16: All faulty equipment and where it is
SELECT * FROM v_faulty_equipment;

-- Q17: How many open issues in ST Building (building_id=1)?
SELECT fn_building_open_issues(1) AS open_issues_in_ST;

-- Q18: All open class issues
CALL sp_open_issues();

-- Q19: Report a projector failure in schedule 5
CALL sp_report_issue(5, 'Projector Failure');

-- Q20: Mark issue 2 as fixed
CALL sp_fix_issue(2);

-- ════════════════════════════════════════════════════════════════
-- ANALYTICS / REPORTING QUERIES
-- ════════════════════════════════════════════════════════════════

-- Q21: How many students per program?
SELECT program, COUNT(*) AS student_count
FROM students GROUP BY program ORDER BY student_count DESC;

-- Q22: Instructor workload (how many classes each teaches)
SELECT i.name AS instructor, COUNT(sc.schedule_id) AS classes_taught
FROM instructors i
LEFT JOIN schedules sc ON i.instructor_id = sc.instructor_id
GROUP BY i.instructor_id, i.name ORDER BY classes_taught DESC;

-- Q23: Rooms with faulty equipment currently scheduled for use
SELECT DISTINCT r.name AS room, b.name AS building, eq.type AS faulty_item
FROM equipment eq
JOIN rooms       r  ON eq.room_id    = r.room_id
JOIN buildings   b  ON r.building_id = b.building_id
JOIN schedules   sc ON sc.room_id    = r.room_id
WHERE eq.status = 'faulty';

-- Q24: Buildings summary — rooms by type
SELECT b.name AS building,
       SUM(r.type='lecture') AS lecture_rooms,
       SUM(r.type='lab')     AS labs,
       SUM(r.type='seminar') AS seminar_rooms,
       SUM(r.type='office')  AS offices,
       COUNT(*)              AS total_rooms
FROM rooms r JOIN buildings b ON r.building_id = b.building_id
GROUP BY b.building_id, b.name ORDER BY b.building_id;

-- Q25: Students enrolled in more than 2 classes (heavy load check)
SELECT s.name AS student, COUNT(e.class_id) AS classes_enrolled
FROM enrollments e JOIN students s ON e.student_id = s.student_id
GROUP BY e.student_id, s.name
HAVING classes_enrolled > 2 ORDER BY classes_enrolled DESC;
