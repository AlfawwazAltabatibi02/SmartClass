-- ================================================================
-- AcademIQ — Resize Data: 367 Students + 25 Classrooms
-- ================================================================

-- Temporarily drop triggers that block bulk seeding
DROP TRIGGER IF EXISTS trg_enrollment_capacity_check;
DROP TRIGGER IF EXISTS trg_prevent_double_booking;
DROP TRIGGER IF EXISTS trg_room_occupied_on_schedule;
DROP TRIGGER IF EXISTS trg_flag_equipment_on_issue;
DROP TRIGGER IF EXISTS trg_issue_defaults;

SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE classissues;
TRUNCATE TABLE instructor_feedback;
TRUNCATE TABLE roomstatus;
TRUNCATE TABLE equipment;
TRUNCATE TABLE enrollments;
TRUNCATE TABLE officehours;
TRUNCATE TABLE schedules;
TRUNCATE TABLE classes;
TRUNCATE TABLE rooms;
TRUNCATE TABLE students;
DELETE FROM users WHERE role = 'student';
SET FOREIGN_KEY_CHECKS = 1;

-- ── 25 Classrooms ───────────────────────────────────────────────
INSERT INTO rooms (building_id, name, capacity, type) VALUES
(1,'ST-101',45,'lecture'),(1,'ST-102',50,'lecture'),(1,'ST-103',35,'lab'),
(1,'ST-201',60,'lecture'),(1,'ST-202',40,'lab'),
(2,'CU-101',80,'lecture'),(2,'CU-102',55,'lecture'),(2,'CU-201',45,'seminar'),
(2,'CU-202',70,'lecture'),
(3,'GE-101',50,'lecture'),(3,'GE-102',40,'lecture'),(3,'GE-201',35,'seminar'),
(3,'GE-202',60,'lecture'),
(5,'CL-A',120,'lecture'),(5,'CL-B',100,'lecture'),(5,'CL-C',90,'lecture'),
(5,'CL-D',80,'lecture'),
(6,'EC-101',45,'lecture'),(6,'EC-102',50,'lecture'),(6,'EC-103',30,'lab'),
(6,'EC-201',55,'lecture'),(6,'EC-202',40,'seminar'),(6,'EC-301',65,'lecture'),
(1,'ST-LAB1',30,'lab'),(2,'CU-LAB1',25,'lab');

-- ── 20 Classes ──────────────────────────────────────────────────
SET @fr = (SELECT MIN(room_id) FROM rooms);
INSERT INTO classes (name, home_room_id) VALUES
('CMPE412 - Systems Programming Sec.1',@fr+0),
('CMPE412 - Systems Programming Sec.2',@fr+1),
('CMPE305 - Database Systems Sec.1',@fr+2),
('CMPE305 - Database Systems Sec.2',@fr+3),
('CMPE201 - Data Structures Sec.1',@fr+4),
('CMPE301 - Operating Systems Sec.1',@fr+5),
('CMPE401 - Computer Networks Sec.1',@fr+6),
('CMPE450 - Artificial Intelligence Sec.1',@fr+7),
('EEE201 - Circuit Theory Sec.1',@fr+8),
('EEE301 - Digital Electronics Sec.1',@fr+9),
('EEE401 - Signal Processing Sec.1',@fr+10),
('CE201 - Structural Analysis Sec.1',@fr+11),
('CE301 - Fluid Mechanics Sec.1',@fr+12),
('ME201 - Thermodynamics Sec.1',@fr+13),
('ME301 - Control Systems Sec.1',@fr+14),
('ESE301 - Renewable Energy Sec.1',@fr+15),
('BE201 - Biomechanics Sec.1',@fr+16),
('ENV301 - Environmental Impact Sec.1',@fr+17),
('IE301 - Operations Research Sec.1',@fr+18),
('MED201 - Anatomy Sec.1',@fr+19);

-- ── 40 Schedule Entries ─────────────────────────────────────────
SET @fc = (SELECT MIN(class_id) FROM classes);
INSERT INTO schedules (class_id,subject_id,instructor_id,room_id,day,time_slot) VALUES
(@fc+0,1,1,@fr+0,'Monday','08:30-09:20'),(@fc+0,1,1,@fr+0,'Wednesday','08:30-09:20'),
(@fc+1,1,1,@fr+1,'Tuesday','08:30-09:20'),(@fc+1,1,1,@fr+1,'Thursday','08:30-09:20'),
(@fc+2,2,2,@fr+2,'Monday','09:30-10:20'),(@fc+2,2,2,@fr+2,'Wednesday','09:30-10:20'),
(@fc+3,2,2,@fr+3,'Tuesday','09:30-10:20'),(@fc+3,2,2,@fr+3,'Thursday','09:30-10:20'),
(@fc+4,3,3,@fr+4,'Monday','10:30-11:20'),(@fc+4,3,3,@fr+4,'Wednesday','10:30-11:20'),
(@fc+5,4,4,@fr+5,'Monday','11:30-12:20'),(@fc+5,4,4,@fr+5,'Wednesday','11:30-12:20'),
(@fc+6,5,5,@fr+6,'Tuesday','10:30-11:20'),(@fc+6,5,5,@fr+6,'Thursday','10:30-11:20'),
(@fc+7,6,6,@fr+7,'Tuesday','11:30-12:20'),(@fc+7,6,6,@fr+7,'Thursday','11:30-12:20'),
(@fc+8,7,7,@fr+8,'Monday','13:30-14:20'),(@fc+8,7,7,@fr+8,'Wednesday','13:30-14:20'),
(@fc+9,8,8,@fr+9,'Monday','14:30-15:20'),(@fc+9,8,8,@fr+9,'Wednesday','14:30-15:20'),
(@fc+10,9,9,@fr+10,'Tuesday','13:30-14:20'),(@fc+10,9,9,@fr+10,'Thursday','13:30-14:20'),
(@fc+11,10,10,@fr+11,'Tuesday','14:30-15:20'),(@fc+11,10,10,@fr+11,'Thursday','14:30-15:20'),
(@fc+12,11,11,@fr+12,'Monday','15:30-16:20'),(@fc+12,11,11,@fr+12,'Wednesday','15:30-16:20'),
(@fc+13,12,12,@fr+13,'Tuesday','15:30-16:20'),(@fc+13,12,12,@fr+13,'Thursday','15:30-16:20'),
(@fc+14,13,13,@fr+14,'Monday','16:30-17:20'),(@fc+14,13,13,@fr+14,'Wednesday','16:30-17:20'),
(@fc+15,14,14,@fr+15,'Tuesday','16:30-17:20'),(@fc+15,14,14,@fr+15,'Thursday','16:30-17:20'),
(@fc+16,15,15,@fr+16,'Monday','09:30-10:20'),(@fc+16,15,15,@fr+16,'Wednesday','09:30-10:20'),
(@fc+17,1,1,@fr+17,'Friday','08:30-09:20'),(@fc+17,1,1,@fr+17,'Friday','09:30-10:20'),
(@fc+18,2,2,@fr+18,'Friday','10:30-11:20'),(@fc+18,2,2,@fr+18,'Friday','11:30-12:20'),
(@fc+19,3,3,@fr+19,'Friday','13:30-14:20'),(@fc+19,3,3,@fr+19,'Friday','14:30-15:20');

-- ── Office Hours ────────────────────────────────────────────────
INSERT INTO officehours (instructor_id, day, time_slot, room_id) VALUES
(1,'Monday','10:00-12:00',@fr+0),(2,'Tuesday','10:00-12:00',@fr+2),
(3,'Wednesday','14:00-16:00',@fr+4),(4,'Thursday','10:00-12:00',@fr+5),
(5,'Monday','14:00-16:00',@fr+6),(6,'Tuesday','14:00-16:00',@fr+7),
(7,'Wednesday','10:00-12:00',@fr+8),(8,'Thursday','14:00-16:00',@fr+9),
(9,'Friday','10:00-12:00',@fr+10),(10,'Monday','13:00-15:00',@fr+11),
(11,'Tuesday','13:00-15:00',@fr+12),(12,'Wednesday','09:00-11:00',@fr+13),
(13,'Thursday','09:00-11:00',@fr+14),(14,'Friday','13:00-15:00',@fr+15),
(15,'Friday','09:00-11:00',@fr+16);

-- ── Equipment ───────────────────────────────────────────────────
INSERT INTO equipment (room_id, type, status, last_checked) VALUES
(@fr+0,'Projector','working','2026-04-01'),(@fr+0,'Whiteboard','working','2026-04-01'),
(@fr+1,'Projector','working','2026-04-01'),(@fr+1,'Smart Board','working','2026-04-01'),
(@fr+2,'Lab Computers','working','2026-04-01'),(@fr+2,'Projector','working','2026-04-01'),
(@fr+3,'Projector','faulty','2026-05-01'),(@fr+4,'Lab Workstations','working','2026-04-01'),
(@fr+5,'Projector','working','2026-04-01'),(@fr+5,'Sound System','working','2026-04-01'),
(@fr+6,'Projector','working','2026-04-01'),(@fr+7,'Projector','working','2026-04-01'),
(@fr+7,'AC Unit','faulty','2026-05-02'),(@fr+8,'Projector','working','2026-04-01'),
(@fr+9,'Smart Board','working','2026-04-01'),(@fr+10,'Projector','working','2026-04-01'),
(@fr+11,'Whiteboard','working','2026-04-01'),(@fr+12,'Projector','working','2026-04-01'),
(@fr+13,'Projector','working','2026-04-01'),(@fr+14,'Lab Equipment','faulty','2026-05-03'),
(@fr+15,'Solar Panel Kit','working','2026-04-01'),(@fr+16,'Projector','working','2026-04-01'),
(@fr+17,'Projector','working','2026-04-01'),(@fr+18,'Projector','working','2026-04-01'),
(@fr+19,'Anatomy Models','working','2026-04-01'),(@fr+23,'Lab PCs','working','2026-04-01'),
(@fr+24,'Lab PCs','working','2026-04-01');

-- ── Room Status ─────────────────────────────────────────────────
INSERT INTO roomstatus (room_id, status, timestamp, notes) VALUES
(@fr+0,'occupied',NOW(),'CMPE412 lecture'),(@fr+1,'occupied',NOW(),'CMPE412 Sec.2'),
(@fr+2,'occupied',NOW(),'CMPE305 lab'),(@fr+5,'occupied',NOW(),'CMPE301 lecture'),
(@fr+8,'empty',NOW(),NULL),(@fr+9,'empty',NOW(),NULL),
(@fr+13,'occupied',NOW(),'Large lecture'),(@fr+14,'occupied',NOW(),'Exam prep'),
(@fr+17,'empty',NOW(),NULL),(@fr+20,'empty',NOW(),NULL);

-- ── 367 Students (procedural) ───────────────────────────────────
DELIMITER $$
DROP PROCEDURE IF EXISTS seed_students$$
CREATE PROCEDURE seed_students()
BEGIN
    DECLARE i INT DEFAULT 1;
    DECLARE fn JSON DEFAULT JSON_ARRAY(
      'Ahmed','Fatima','Plamedi','Amara','Yusuf','Nadia','Ibrahim','Leila','Carlos','Aisha',
      'David','Sara','Omar','Kofi','Maria','Zara','Emmanuel','Hassan','Priya','Lena',
      'Chidi','Sofia','Kenji','Rania','Taiwo','Amina','Lucas','Hana','Blessing','Yasmin',
      'Mehmet','Ali','Elif','Can','Ayse','Berk','Deniz','Ece','Furkan','Gizem',
      'Hakan','Irem','Ismail','Jade','Kadir','Lia','Mert','Nora','Ozan','Pelin',
      'Rana','Selin','Taha','Uma','Volkan','Yaren','Zafer','Ada','Burak','Ceren',
      'Dilan','Emre','Feyza','Gokhan','Hazal','Ilker','Jale','Kaan','Lale','Murat',
      'Nil','Onur','Pinar','Rita','Serkan','Tugba','Ugur','Vera','Yavuz','Zehra',
      'Abdul','Binta','Chinwe','Dayo','Ezekiel','Folake','Gbenga','Halima','Ify','Juma',
      'Khadija','Lamin','Maryam','Nkem','Oluwaseun','Patience','Quadri','Rashida','Sani','Temi');
    DECLARE ln JSON DEFAULT JSON_ARRAY(
      'Hassan','Alzahra','Kapuya','Diallo','Okonkwo','Bello','Musa','Karimi','Mendez','Suleiman',
      'Mensah','Yilmaz','Farouk','Asante','Santos','Ahmed','Eze','Ali','Sharma','Muller',
      'Obi','Andrade','Tanaka','Khalil','Adesanya','Diop','Ferreira','Moradi','Okeke','Rashid',
      'Kaya','Celik','Demir','Yildiz','Ozkan','Aksoy','Erdogan','Acar','Polat','Guler',
      'Sahin','Koc','Aydin','Kilic','Cetin','Dogan','Kurt','Arslan','Yavuz','Aktas',
      'Tas','Cinar','Kaplan','Tekin','Bulut','Korkmaz','Karaca','Unal','Ozdemir','Gul',
      'Ekinci','Toprak','Yaman','Sari','Bayrak','Atalay','Gunes','Kosar','Duman','Simsek',
      'Turan','Basak','Coskun','Alkan','Bilgin','Erdem','Ozer','Uysal','Sezer','Avci',
      'Abubakar','Bakare','Chukwu','Danladi','Emeka','Femi','Garba','Hamza','Ibe','Jibril',
      'Kamara','Lawal','Maina','Ndidi','Okafor','Adeyemi','Bala','Soyinka','Toure','Traore');
    DECLARE pg JSON DEFAULT JSON_ARRAY(
      'Computer Engineering','Electrical Engineering','Civil Engineering',
      'Mechanical Engineering','Software Engineering','Biomedical Engineering',
      'Environmental Engineering','Industrial Engineering','Medicine','Information Systems');
    DECLARE v_f VARCHAR(50);
    DECLARE v_l VARCHAR(50);
    DECLARE v_e VARCHAR(100);
    DECLARE v_p VARCHAR(50);
    DECLARE v_g DECIMAL(3,2);
    DECLARE fnc INT DEFAULT 100;
    DECLARE lnc INT DEFAULT 100;

    WHILE i <= 367 DO
        SET v_f = JSON_UNQUOTE(JSON_EXTRACT(fn, CONCAT('$[',(i-1) MOD fnc,']')));
        SET v_l = JSON_UNQUOTE(JSON_EXTRACT(ln, CONCAT('$[',((i-1) DIV fnc + (i-1)) MOD lnc,']')));
        SET v_e = CONCAT(LOWER(v_f),'.',LOWER(v_l),i,'@student.ciu.edu.tr');
        SET v_p = JSON_UNQUOTE(JSON_EXTRACT(pg, CONCAT('$[',(i-1) MOD 10,']')));
        SET v_g = ROUND(1.50 + (2.50 * (i-1) / 366), 2);
        INSERT INTO students (name,email,program,cgpa) VALUES (CONCAT(v_f,' ',v_l), v_e, v_p, v_g);
        INSERT INTO users (username,password_hash,role)
        VALUES (v_e, SHA2(CONCAT(LOWER(v_f),'.',LOWER(v_l)), 256), 'student');
        SET i = i + 1;
    END WHILE;
END$$
DELIMITER ;
CALL seed_students();
DROP PROCEDURE IF EXISTS seed_students;

-- ── Enrollments (3-4 classes per student) ───────────────────────
DELIMITER $$
DROP PROCEDURE IF EXISTS seed_enrollments$$
CREATE PROCEDURE seed_enrollments()
BEGIN
    DECLARE sid INT;
    DECLARE smax INT;
    DECLARE fc INT;
    SET fc = (SELECT MIN(class_id) FROM classes);
    SET sid = (SELECT MIN(student_id) FROM students);
    SET smax = (SELECT MAX(student_id) FROM students);
    WHILE sid <= smax DO
        INSERT IGNORE INTO enrollments (student_id,class_id,enrollment_date) VALUES
            (sid, fc+((sid-1) MOD 20), '2026-01-15'),
            (sid, fc+((sid+3) MOD 20), '2026-01-15'),
            (sid, fc+((sid+7) MOD 20), '2026-01-15');
        IF sid MOD 3 = 0 THEN
            INSERT IGNORE INTO enrollments (student_id,class_id,enrollment_date)
            VALUES (sid, fc+((sid+13) MOD 20), '2026-01-15');
        END IF;
        SET sid = sid + 1;
    END WHILE;
END$$
DELIMITER ;
CALL seed_enrollments();
DROP PROCEDURE IF EXISTS seed_enrollments;

-- ── Verify ──────────────────────────────────────────────────────
SELECT 'Students' AS entity, COUNT(*) AS total FROM students
UNION ALL SELECT 'Rooms', COUNT(*) FROM rooms
UNION ALL SELECT 'Classes', COUNT(*) FROM classes
UNION ALL SELECT 'Enrollments', COUNT(*) FROM enrollments
UNION ALL SELECT 'Student Users', COUNT(*) FROM users WHERE role='student';
SELECT MIN(cgpa) AS min_gpa, MAX(cgpa) AS max_gpa, COUNT(DISTINCT cgpa) AS unique_gpas FROM students;

-- ── Recreate Triggers ───────────────────────────────────────────
DELIMITER $$
CREATE TRIGGER trg_enrollment_capacity_check BEFORE INSERT ON enrollments FOR EACH ROW
BEGIN
    DECLARE v_capacity INT DEFAULT 9999;
    DECLARE v_enrolled INT DEFAULT 0;
    SELECT r.capacity INTO v_capacity FROM schedules sc JOIN rooms r ON sc.room_id = r.room_id WHERE sc.class_id = NEW.class_id LIMIT 1;
    SELECT COUNT(*) INTO v_enrolled FROM enrollments WHERE class_id = NEW.class_id;
    IF v_enrolled >= v_capacity THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Enrollment rejected: room capacity reached.';
    END IF;
END$$

CREATE TRIGGER trg_prevent_double_booking BEFORE INSERT ON schedules FOR EACH ROW
BEGIN
    DECLARE v_conflict INT;
    SELECT COUNT(*) INTO v_conflict FROM schedules WHERE room_id = NEW.room_id AND day = NEW.day AND time_slot = NEW.time_slot;
    IF v_conflict > 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Room already booked at this day and time.';
    END IF;
END$$

CREATE TRIGGER trg_room_occupied_on_schedule AFTER INSERT ON schedules FOR EACH ROW
BEGIN
    INSERT INTO roomstatus (room_id, timestamp, status, notes) VALUES (NEW.room_id, NOW(), 'occupied', CONCAT('Auto: occupied by schedule_id=', NEW.schedule_id));
END$$

CREATE TRIGGER trg_issue_defaults BEFORE INSERT ON classissues FOR EACH ROW
BEGIN
    IF NEW.status IS NULL THEN SET NEW.status = 'open'; END IF;
    IF NEW.reported_date IS NULL THEN SET NEW.reported_date = CURDATE(); END IF;
END$$

CREATE TRIGGER trg_flag_equipment_on_issue AFTER INSERT ON classissues FOR EACH ROW
BEGIN
    IF NEW.issue_type LIKE '%Projector%' OR NEW.issue_type LIKE '%Equipment%' OR NEW.issue_type LIKE '%Smart Board%' THEN
        UPDATE equipment eq JOIN schedules sc ON sc.schedule_id = NEW.schedule_id SET eq.status = 'faulty', eq.last_checked = CURDATE() WHERE eq.room_id = sc.room_id;
    END IF;
END$$
DELIMITER ;
