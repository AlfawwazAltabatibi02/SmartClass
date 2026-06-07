-- ================================================================
-- Smart Class Scheduler — Cyprus International University
-- FILE   : auth/10_authorization.sql
-- PURPOSE: MySQL DB users, roles, privileges  ← RUN 10th
-- ================================================================
USE smart_class;

-- ── Admin — full control, can grant to others ────────────────────
CREATE USER IF NOT EXISTS 'smart_admin'@'localhost'
    IDENTIFIED BY 'admin123';
GRANT ALL PRIVILEGES ON smart_class.* TO 'smart_admin'@'localhost'
    WITH GRANT OPTION;

-- ── Staff / Instructor — scheduling + issue management ───────────
CREATE USER IF NOT EXISTS 'smart_staff'@'localhost'
    IDENTIFIED BY 'Staff@SmartClass2025!';
GRANT SELECT                    ON smart_class.*                TO 'smart_staff'@'localhost';
GRANT INSERT, UPDATE            ON smart_class.schedules        TO 'smart_staff'@'localhost';
GRANT INSERT, UPDATE            ON smart_class.classissues      TO 'smart_staff'@'localhost';
GRANT INSERT, UPDATE            ON smart_class.roomstatus       TO 'smart_staff'@'localhost';
GRANT INSERT, UPDATE            ON smart_class.equipment        TO 'smart_staff'@'localhost';
GRANT INSERT, UPDATE            ON smart_class.officehours      TO 'smart_staff'@'localhost';
-- Staff CAN execute reporting procedures
GRANT EXECUTE ON PROCEDURE smart_class.sp_instructor_schedule   TO 'smart_staff'@'localhost';
GRANT EXECUTE ON PROCEDURE smart_class.sp_report_issue          TO 'smart_staff'@'localhost';
GRANT EXECUTE ON PROCEDURE smart_class.sp_fix_issue             TO 'smart_staff'@'localhost';
GRANT EXECUTE ON PROCEDURE smart_class.sp_update_room_status    TO 'smart_staff'@'localhost';
GRANT EXECUTE ON PROCEDURE smart_class.sp_open_issues           TO 'smart_staff'@'localhost';

-- ── Student — read-only, views only, NO raw table access ─────────
CREATE USER IF NOT EXISTS 'smart_student'@'localhost'
    IDENTIFIED BY 'Student@SmartClass2025!';
-- Students see only these views (safe, no sensitive data exposed)
GRANT SELECT ON smart_class.v_full_schedule    TO 'smart_student'@'localhost';
GRANT SELECT ON smart_class.v_office_hours     TO 'smart_student'@'localhost';
GRANT SELECT ON smart_class.v_empty_rooms      TO 'smart_student'@'localhost';
GRANT SELECT ON smart_class.v_student_classes  TO 'smart_student'@'localhost';
-- Students can see subjects, buildings, rooms (public info)
GRANT SELECT ON smart_class.subjects           TO 'smart_student'@'localhost';
GRANT SELECT ON smart_class.buildings          TO 'smart_student'@'localhost';
GRANT SELECT ON smart_class.rooms              TO 'smart_student'@'localhost';
GRANT SELECT ON smart_class.classes            TO 'smart_student'@'localhost';
-- Students CAN view their own enrollments (filtered at app layer)
GRANT SELECT ON smart_class.enrollments        TO 'smart_student'@'localhost';
-- Students CANNOT: see instructors emails, other students data,
--                  roomstatus logs, classissues, equipment internals

-- ── Report / Dashboard — read-only on everything ─────────────────
CREATE USER IF NOT EXISTS 'smart_report'@'localhost'
    IDENTIFIED BY 'Report@SmartClass2025!';
GRANT SELECT ON smart_class.* TO 'smart_report'@'localhost';

FLUSH PRIVILEGES;
