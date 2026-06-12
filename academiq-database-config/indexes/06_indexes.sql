-- ================================================================
-- Smart Class Scheduler — Cyprus International University
-- FILE   : indexes/06_indexes.sql
-- PURPOSE: All indexes — matches your live SHOW INDEXES output
--          RUN 6th (after schema + data)
-- ================================================================
USE smart_class;

-- ── departments ──────────────────────────────────────────────────
-- (dept_name UNIQUE already created in schema as UNIQUE KEY)
CREATE INDEX  idx_dept_name     ON departments(dept_name);
CREATE INDEX  idx_dept_building ON departments(building_id);

-- ── rooms ─────────────────────────────────────────────────────────
CREATE INDEX  idx_building ON rooms(building_id);

-- ── schedules ─────────────────────────────────────────────────────
-- unique_schedule + no_double_booking already in schema as UNIQUE KEYs
CREATE INDEX  idx_teacher ON schedules(instructor_id);
CREATE INDEX  idx_room    ON schedules(room_id);
-- class_id, subject_id FK indexes created automatically by MySQL

-- ── users ─────────────────────────────────────────────────────────
-- username UNIQUE already in schema
CREATE INDEX  idx_username ON users(username);
CREATE INDEX  idx_role     ON users(role);

-- ── Additional performance indexes ───────────────────────────────
-- Speed up enrollment lookups by student
CREATE INDEX  idx_enroll_student ON enrollments(student_id);
-- Speed up office hours lookups by instructor
CREATE INDEX  idx_oh_instructor  ON officehours(instructor_id);
-- Speed up equipment status queries
CREATE INDEX  idx_equip_status   ON equipment(status);
-- Speed up issue queries by status
CREATE INDEX  idx_issue_status   ON classissues(status);
-- Speed up room status latest timestamp queries
CREATE INDEX  idx_rs_timestamp   ON roomstatus(timestamp);
