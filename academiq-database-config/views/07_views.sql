-- ================================================================
-- Smart Class Scheduler — Cyprus International University
-- FILE   : views/07_views.sql
-- PURPOSE: All useful views for the system  ← RUN 7th
-- ================================================================
USE smart_class;

-- View 1: Full schedule — all names resolved, readable timetable
CREATE OR REPLACE VIEW v_full_schedule AS
SELECT
    sc.schedule_id,
    c.name                        AS class_name,
    sub.name                      AS subject,
    i.name                        AS instructor,
    CONCAT(b.name,' — ',r.name)   AS room,
    r.capacity,
    sc.day,
    sc.time_slot
FROM schedules sc
JOIN classes     c   ON sc.class_id      = c.class_id
JOIN subjects    sub ON sc.subject_id    = sub.subject_id
JOIN instructors i   ON sc.instructor_id = i.instructor_id
JOIN rooms       r   ON sc.room_id       = r.room_id
JOIN buildings   b   ON r.building_id    = b.building_id
ORDER BY sc.day, sc.time_slot;

-- View 2: Rooms that are currently empty (latest status only)
CREATE OR REPLACE VIEW v_empty_rooms AS
SELECT
    r.room_id,
    b.name        AS building,
    r.name        AS room,
    r.type,
    r.capacity,
    rs.timestamp  AS last_updated
FROM roomstatus rs
JOIN rooms     r ON rs.room_id    = r.room_id
JOIN buildings b ON r.building_id = b.building_id
WHERE rs.status = 'empty'
  AND rs.timestamp = (
      SELECT MAX(rs2.timestamp)
      FROM roomstatus rs2
      WHERE rs2.room_id = rs.room_id
  );

-- View 3: Instructor office hours with building and room info
CREATE OR REPLACE VIEW v_office_hours AS
SELECT
    i.name        AS instructor,
    oh.day,
    oh.time_slot,
    b.name        AS building,
    r.name        AS office_room
FROM officehours oh
JOIN instructors i ON oh.instructor_id = i.instructor_id
JOIN rooms       r ON oh.room_id       = r.room_id
JOIN buildings   b ON r.building_id    = b.building_id
ORDER BY i.name, oh.day;

-- View 4: Class enrollment counts vs room capacity
CREATE OR REPLACE VIEW v_class_enrollment AS
SELECT
    c.class_id,
    c.name                           AS class_name,
    COUNT(e.enrollment_id)           AS enrolled_students,
    r.capacity,
    CASE
        WHEN COUNT(e.enrollment_id) >= r.capacity        THEN 'FULL'
        WHEN COUNT(e.enrollment_id) >= r.capacity * 0.8  THEN 'NEARLY FULL'
        ELSE 'AVAILABLE'
    END AS status
FROM classes c
LEFT JOIN enrollments e  ON c.class_id = e.class_id
LEFT JOIN schedules   sc ON c.class_id = sc.class_id
LEFT JOIN rooms       r  ON sc.room_id = r.room_id
GROUP BY c.class_id, c.name, r.capacity;

-- View 5: All faulty equipment with location
CREATE OR REPLACE VIEW v_faulty_equipment AS
SELECT
    b.name        AS building,
    r.name        AS room,
    eq.type       AS equipment,
    eq.last_checked
FROM equipment eq
JOIN rooms     r ON eq.room_id    = r.room_id
JOIN buildings b ON r.building_id = b.building_id
WHERE eq.status = 'faulty'
ORDER BY b.name, r.name;

-- View 6: All open class issues with location context
CREATE OR REPLACE VIEW v_open_issues AS
SELECT
    ci.issue_id,
    ci.issue_type,
    ci.severity,
    ci.comment,
    ci.reported_date,
    sc.day,
    sc.time_slot,
    c.name   AS class_name,
    r.name   AS room,
    b.name   AS building
FROM classissues ci
JOIN schedules  sc ON ci.schedule_id = sc.schedule_id
JOIN classes    c  ON sc.class_id    = c.class_id
JOIN rooms      r  ON sc.room_id     = r.room_id
JOIN buildings  b  ON r.building_id  = b.building_id
WHERE ci.status = 'open'
ORDER BY ci.reported_date;

-- View 7: Student class list (what each student is enrolled in)
CREATE OR REPLACE VIEW v_student_classes AS
SELECT
    s.student_id,
    s.name        AS student,
    s.program,
    c.name        AS class_name,
    sub.name      AS subject,
    sc.day,
    sc.time_slot,
    r.name        AS room
FROM enrollments e
JOIN students   s   ON e.student_id  = s.student_id
JOIN classes    c   ON e.class_id    = c.class_id
JOIN schedules  sc  ON c.class_id    = sc.class_id
JOIN subjects   sub ON sc.subject_id = sub.subject_id
JOIN rooms      r   ON sc.room_id    = r.room_id
ORDER BY s.name, sc.day;
