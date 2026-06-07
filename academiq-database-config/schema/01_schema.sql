-- ================================================================
-- Smart Class Scheduler — Cyprus International University
-- FILE   : schema/01_schema.sql
-- PURPOSE: Create all tables  ← RUN THIS FIRST
-- Order  : buildings → departments → rooms → students →
--          instructors → subjects → classes → schedules →
--          enrollments → officehours → equipment →
--          roomstatus → classissues → users
-- ================================================================

CREATE DATABASE IF NOT EXISTS smart_class;
USE smart_class;

-- ── 1. Buildings ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS buildings (
    building_id INT          NOT NULL AUTO_INCREMENT,
    name        VARCHAR(100),
    location    VARCHAR(100),
    PRIMARY KEY (building_id)
);

-- ── 2. Departments ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS departments (
    dept_id     INT          NOT NULL AUTO_INCREMENT,
    dept_name   VARCHAR(100) NOT NULL UNIQUE,
    building_id INT,
    PRIMARY KEY (dept_id),
    FOREIGN KEY (building_id) REFERENCES buildings(building_id)
);

-- ── 3. Rooms ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rooms (
    room_id     INT  NOT NULL AUTO_INCREMENT,
    building_id INT,
    name        VARCHAR(50) UNIQUE,
    capacity    INT,
    type        ENUM('lecture','lab','seminar','office'),
    PRIMARY KEY (room_id),
    FOREIGN KEY (building_id) REFERENCES buildings(building_id)
);

-- ── 4. Students ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS students (
    student_id INT          NOT NULL AUTO_INCREMENT,
    name       VARCHAR(100),
    email      VARCHAR(100) UNIQUE,
    program    VARCHAR(50),
    PRIMARY KEY (student_id)
);

-- ── 5. Instructors ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS instructors (
    instructor_id  INT          NOT NULL AUTO_INCREMENT,
    name           VARCHAR(100),
    email          VARCHAR(100) UNIQUE,
    office_room_id INT,
    building_id    INT,
    PRIMARY KEY (instructor_id),
    FOREIGN KEY (office_room_id) REFERENCES rooms(room_id),
    FOREIGN KEY (building_id)    REFERENCES buildings(building_id)
);

-- ── 6. Subjects ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subjects (
    subject_id INT          NOT NULL AUTO_INCREMENT,
    name       VARCHAR(100) UNIQUE,
    type       VARCHAR(50),
    PRIMARY KEY (subject_id)
);

-- ── 7. Classes ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS classes (
    class_id     INT          NOT NULL AUTO_INCREMENT,
    name         VARCHAR(100) UNIQUE,
    home_room_id INT,
    PRIMARY KEY (class_id),
    FOREIGN KEY (home_room_id) REFERENCES rooms(room_id)
);

-- ── 7b. Class Groups (sections) ────────────────────────────────
CREATE TABLE IF NOT EXISTS class_groups (
    group_id   INT NOT NULL AUTO_INCREMENT,
    class_id   INT NOT NULL,
    group_no   INT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (group_id),
    UNIQUE KEY uniq_class_group (class_id, group_no),
    FOREIGN KEY (class_id) REFERENCES classes(class_id)
);

-- ── 8. Schedules ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS schedules (
    schedule_id   INT         NOT NULL AUTO_INCREMENT,
    class_id      INT,
    subject_id    INT,
    instructor_id INT,
    room_id       INT,
    day           VARCHAR(20),
    time_slot     VARCHAR(20),
    PRIMARY KEY (schedule_id),
    UNIQUE KEY unique_schedule   (room_id, day, time_slot),
    UNIQUE KEY no_double_booking (room_id, day, time_slot),
    FOREIGN KEY (class_id)      REFERENCES classes(class_id),
    FOREIGN KEY (subject_id)    REFERENCES subjects(subject_id),
    FOREIGN KEY (instructor_id) REFERENCES instructors(instructor_id),
    FOREIGN KEY (room_id)       REFERENCES rooms(room_id)
);

-- ── 9. Enrollments ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS enrollments (
    enrollment_id   INT  NOT NULL AUTO_INCREMENT,
    student_id      INT,
    class_id        INT,
    enrollment_date DATE,
    PRIMARY KEY (enrollment_id),
    FOREIGN KEY (student_id) REFERENCES students(student_id),
    FOREIGN KEY (class_id)   REFERENCES classes(class_id)
);

-- ── 10. Office Hours ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS officehours (
    officehour_id INT         NOT NULL AUTO_INCREMENT,
    instructor_id INT,
    day           VARCHAR(20),
    time_slot     VARCHAR(20),
    room_id       INT,
    PRIMARY KEY (officehour_id),
    FOREIGN KEY (instructor_id) REFERENCES instructors(instructor_id),
    FOREIGN KEY (room_id)       REFERENCES rooms(room_id)
);

-- ── 10b. Instructor Availability ────────────────────────────────
CREATE TABLE IF NOT EXISTS instructor_availability (
    availability_id INT NOT NULL AUTO_INCREMENT,
    instructor_id   INT NOT NULL,
    day             VARCHAR(20) NOT NULL,
    time_slot       VARCHAR(20) NOT NULL,
    status          ENUM('available','inclass','lunch','meeting','office','offcampus') NOT NULL,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (availability_id),
    UNIQUE KEY uniq_instructor_slot (instructor_id, day, time_slot),
    FOREIGN KEY (instructor_id) REFERENCES instructors(instructor_id)
);

-- ── 11. Equipment ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS equipment (
    equip_id     INT         NOT NULL AUTO_INCREMENT,
    room_id      INT,
    type         VARCHAR(50),
    status       ENUM('working','faulty'),
    last_checked DATE,
    PRIMARY KEY (equip_id),
    FOREIGN KEY (room_id) REFERENCES rooms(room_id)
);

-- ── 12. Room Status ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS roomstatus (
    status_id INT                      NOT NULL AUTO_INCREMENT,
    room_id   INT,
    timestamp DATETIME,
    status    ENUM('occupied','empty'),
    notes     TEXT,
    PRIMARY KEY (status_id),
    FOREIGN KEY (room_id) REFERENCES rooms(room_id)
);

-- ── 13. Class Issues ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS classissues (
    issue_id      INT                   NOT NULL AUTO_INCREMENT,
    schedule_id   INT,
    issue_type    VARCHAR(50),
    reported_date DATE,
    severity      ENUM('low','medium','high') DEFAULT 'low',
    comment       TEXT,
    status        ENUM('open','fixed'),
    admin_response TEXT,
    resolved_at   DATETIME,
    PRIMARY KEY (issue_id),
    FOREIGN KEY (schedule_id) REFERENCES schedules(schedule_id)
);

-- ── 14. Instructor Feedback ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS instructor_feedback (
    feedback_id   INT                   NOT NULL AUTO_INCREMENT,
    instructor_id INT,
    schedule_id   INT,
    issue_type    VARCHAR(100),
    severity      ENUM('low','medium','high') DEFAULT 'low',
    comment       TEXT,
    status        ENUM('open','fixed')  DEFAULT 'open',
    admin_response TEXT,
    reported_at   DATETIME              DEFAULT CURRENT_TIMESTAMP,
    resolved_at   DATETIME,
    PRIMARY KEY (feedback_id),
    FOREIGN KEY (instructor_id) REFERENCES instructors(instructor_id),
    FOREIGN KEY (schedule_id)   REFERENCES schedules(schedule_id)
);

-- ── 15. Users ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
    user_id       INT                                  NOT NULL AUTO_INCREMENT,
    username      VARCHAR(50)                          NOT NULL UNIQUE,
    password_hash VARCHAR(255)                         NOT NULL,
    role          ENUM('student','instructor','admin') NOT NULL,
    PRIMARY KEY (user_id)
);


-- ── 16. complaints ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS complaints (
    complaint_id INT AUTO_INCREMENT PRIMARY KEY,
    instructor_id INT NOT NULL,
    category VARCHAR(50) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    priority VARCHAR(20) DEFAULT 'Normal',
    status ENUM('Open', 'In Progress', 'Resolved', 'Closed') DEFAULT 'Open',
    admin_response TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP NULL,
    
    FOREIGN KEY (instructor_id) REFERENCES instructors(instructor_id) ON DELETE CASCADE
);


-- ── 17. exams ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS exams (
    exam_id      INT          NOT NULL AUTO_INCREMENT,
    subject_id   INT          NOT NULL unique,
    instructor_id INT         NOT NULL,
    exam_date    DATE         NOT NULL,
    time_slot    VARCHAR(20)  NOT NULL,
    hall         VARCHAR(50)  NOT NULL,
    enrolled_count INT        DEFAULT 0,
    exam_type    ENUM('midterm', 'final') NOT NULL,
    created_at   DATETIME     DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (exam_id),
    FOREIGN KEY (subject_id) REFERENCES subjects(subject_id),
    FOREIGN KEY (instructor_id) REFERENCES instructors(instructor_id)
);