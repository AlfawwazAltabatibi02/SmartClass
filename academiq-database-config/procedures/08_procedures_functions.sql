-- ================================================================
-- Smart Class Scheduler — Cyprus International University
-- FILE   : procedures/08_procedures_functions.sql
-- PURPOSE: Stored Procedures + Functions  ← RUN 8th
-- ================================================================
USE smart_class;

DELIMITER $$

-- ════════════════════════════════════════════════════════════════
-- STORED PROCEDURES
-- ════════════════════════════════════════════════════════════════

-- SP1: Enroll a student — checks capacity + duplicate before inserting
CREATE PROCEDURE sp_enroll_student(
    IN p_student_id INT,
    IN p_class_id   INT
)
BEGIN
    DECLARE v_capacity INT DEFAULT 0;
    DECLARE v_enrolled INT DEFAULT 0;
    DECLARE v_already  INT DEFAULT 0;

    SELECT COUNT(*) INTO v_already
    FROM enrollments
    WHERE student_id = p_student_id AND class_id = p_class_id;

    IF v_already > 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Student is already enrolled in this class.';
    END IF;

    SELECT r.capacity INTO v_capacity
    FROM schedules sc
    JOIN rooms r ON sc.room_id = r.room_id
    WHERE sc.class_id = p_class_id LIMIT 1;

    SELECT COUNT(*) INTO v_enrolled
    FROM enrollments WHERE class_id = p_class_id;

    IF v_enrolled >= v_capacity THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Cannot enroll: class is at full capacity.';
    END IF;

    INSERT INTO enrollments (student_id, class_id, enrollment_date)
    VALUES (p_student_id, p_class_id, CURDATE());

    SELECT CONCAT('Student ', p_student_id,
                  ' enrolled in class ', p_class_id) AS result;
END$$

-- SP2: Report a class issue
CREATE PROCEDURE sp_report_issue(
    IN p_schedule_id INT,
    IN p_issue_type  VARCHAR(50)
)
BEGIN
    INSERT INTO classissues (schedule_id, issue_type, reported_date, status)
    VALUES (p_schedule_id, p_issue_type, CURDATE(), 'open');

    SELECT CONCAT('Issue reported: ', p_issue_type,
                  ' for schedule_id=', p_schedule_id) AS result;
END$$

-- SP3: Get full schedule for one instructor
CREATE PROCEDURE sp_instructor_schedule(IN p_instructor_id INT)
BEGIN
    SELECT
        sc.schedule_id,
        c.name        AS class_name,
        sub.name      AS subject,
        r.name        AS room,
        b.name        AS building,
        sc.day,
        sc.time_slot
    FROM schedules sc
    JOIN classes     c  ON sc.class_id      = c.class_id
    JOIN subjects    sub ON sc.subject_id   = sub.subject_id
    JOIN rooms       r  ON sc.room_id       = r.room_id
    JOIN buildings   b  ON r.building_id    = b.building_id
    WHERE sc.instructor_id = p_instructor_id
    ORDER BY sc.day, sc.time_slot;
END$$

-- SP4: List all open issues
CREATE PROCEDURE sp_open_issues()
BEGIN
    SELECT * FROM v_open_issues;
END$$

-- SP5: Update room status (mark occupied or empty)
CREATE PROCEDURE sp_update_room_status(
    IN p_room_id INT,
    IN p_status  ENUM('occupied','empty'),
    IN p_notes   TEXT
)
BEGIN
    INSERT INTO roomstatus (room_id, timestamp, status, notes)
    VALUES (p_room_id, NOW(), p_status, p_notes);

    SELECT CONCAT('Room ', p_room_id, ' → ', p_status) AS result;
END$$

-- SP6: Mark a class issue as fixed
CREATE PROCEDURE sp_fix_issue(IN p_issue_id INT)
BEGIN
    UPDATE classissues SET status = 'fixed' WHERE issue_id = p_issue_id;
    SELECT CONCAT('Issue ', p_issue_id, ' marked as fixed') AS result;
END$$

-- SP7: Get all students in a specific class
CREATE PROCEDURE sp_class_students(IN p_class_id INT)
BEGIN
    SELECT s.student_id, s.name, s.email, s.program
    FROM enrollments e
    JOIN students s ON e.student_id = s.student_id
    WHERE e.class_id = p_class_id
    ORDER BY s.name;
END$$


-- SP8: Assign an Instructor to a Class Schedule Safely (Checks for double booking)
CREATE PROCEDURE sp_assign_instructor(
    IN p_schedule_id INT,
    IN p_instructor_id INT
)
BEGIN
    DECLARE v_day VARCHAR(20);
    DECLARE v_time_slot VARCHAR(20);
    DECLARE v_conflict_count INT;

    -- Start Transaction
    START TRANSACTION;

    -- Get the day and time of the schedule we want to assign
    SELECT day, time_slot INTO v_day, v_time_slot 
    FROM schedules 
    WHERE schedule_id = p_schedule_id;

    -- Check if the instructor is already teaching at this exact time
    SELECT COUNT(*) INTO v_conflict_count
    FROM schedules
    WHERE instructor_id = p_instructor_id 
      AND day = v_day 
      AND time_slot = v_time_slot;

    IF v_conflict_count > 0 THEN
        -- Conflict found! Rollback and throw an error.
        ROLLBACK;
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Double Booking Error: Instructor is already teaching at this time.';
    ELSE
        -- Safe to assign!
        UPDATE schedules 
        SET instructor_id = p_instructor_id 
        WHERE schedule_id = p_schedule_id;
        
        COMMIT;
        SELECT CONCAT('Instructor ', p_instructor_id, ' successfully assigned to schedule ', p_schedule_id) AS result;
    END IF;
END$$


-- SP9: Auto-Enroll Students into Available Classes (Batch assignment)
CREATE PROCEDURE sp_auto_enroll_students(
    IN p_max_classes_per_student INT
)
BEGIN
    DECLARE v_done INT DEFAULT FALSE;
    DECLARE v_student_id INT;
    DECLARE v_class_id INT;
    DECLARE v_current_enrollment_count INT;
    DECLARE v_room_capacity INT;
    DECLARE v_enrolled_in_class INT;
    
    -- Cursor to loop through every student
    DECLARE student_cursor CURSOR FOR SELECT student_id FROM students;
    
    -- Cursor to loop through classes (ordered randomly so students don't all get the exact same schedule)
    DECLARE class_cursor CURSOR FOR SELECT class_id, home_room_id FROM classes ORDER BY RAND();
    
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_done = TRUE;

    START TRANSACTION;

    OPEN student_cursor;

    student_loop: LOOP
        FETCH student_cursor INTO v_student_id;
        IF v_done THEN LEAVE student_loop; END IF;

        -- How many classes does this student already have?
        SELECT COUNT(*) INTO v_current_enrollment_count 
        FROM enrollments WHERE student_id = v_student_id;

        -- If they need more classes, start looking for open ones
        IF v_current_enrollment_count < p_max_classes_per_student THEN
            
            -- We have to reset the done flag for the nested loop
            SET v_done = FALSE; 
            OPEN class_cursor;

            class_loop: LOOP
                FETCH class_cursor INTO v_class_id, v_room_capacity;
                IF v_done THEN LEAVE class_loop; END IF;

                -- 1. Check if the student is ALREADY in this class
                SELECT COUNT(*) INTO v_enrolled_in_class 
                FROM enrollments 
                WHERE student_id = v_student_id AND class_id = v_class_id;

                -- 2. Check if the class is FULL (Ensuring capacity is respected)
                IF v_enrolled_in_class = 0 THEN
                    IF (SELECT COUNT(*) FROM enrollments WHERE class_id = v_class_id) < 
                       (SELECT capacity FROM rooms WHERE room_id = (SELECT home_room_id FROM classes WHERE class_id = v_class_id)) THEN
                        
                        -- Insert the student!
                        INSERT INTO enrollments (student_id, class_id, enrollment_date) 
                        VALUES (v_student_id, v_class_id, CURDATE());
                        
                        SET v_current_enrollment_count = v_current_enrollment_count + 1;

                        -- Stop giving them classes if they hit the limit
                        IF v_current_enrollment_count >= p_max_classes_per_student THEN
                            LEAVE class_loop;
                        END IF;
                        
                    END IF;
                END IF;
                
            END LOOP class_loop;
            
            CLOSE class_cursor;
            SET v_done = FALSE; -- Reset for the next student
            
        END IF;

    END LOOP student_loop;

    CLOSE student_cursor;
    COMMIT;
    SELECT CONCAT('Auto-enrollment algorithm completed successfully. Limit set to ', p_max_classes_per_student, ' classes per student.') AS result;
END$$

-- ════════════════════════════════════════════════════════════════
-- FUNCTIONS
-- ════════════════════════════════════════════════════════════════

-- FN1: How many students enrolled in a class?
CREATE FUNCTION fn_enrollment_count(p_class_id INT)
RETURNS INT
DETERMINISTIC READS SQL DATA
BEGIN
    DECLARE v_count INT;
    SELECT COUNT(*) INTO v_count FROM enrollments WHERE class_id = p_class_id;
    RETURN v_count;
END$$

-- FN2: Is a room available at a given day + time slot?
CREATE FUNCTION fn_is_room_available(
    p_room_id   INT,
    p_day       VARCHAR(20),
    p_time_slot VARCHAR(20)
)
RETURNS VARCHAR(20)
DETERMINISTIC READS SQL DATA
BEGIN
    DECLARE v_count INT;
    SELECT COUNT(*) INTO v_count
    FROM schedules
    WHERE room_id = p_room_id AND day = p_day AND time_slot = p_time_slot;
    RETURN IF(v_count = 0, 'AVAILABLE', 'BOOKED');
END$$

-- FN3: Get student full name by ID
CREATE FUNCTION fn_student_name(p_student_id INT)
RETURNS VARCHAR(100)
DETERMINISTIC READS SQL DATA
BEGIN
    DECLARE v_name VARCHAR(100);
    SELECT name INTO v_name FROM students WHERE student_id = p_student_id;
    RETURN IFNULL(v_name, 'Unknown');
END$$

-- FN4: Count open issues for a building
CREATE FUNCTION fn_building_open_issues(p_building_id INT)
RETURNS INT
DETERMINISTIC READS SQL DATA
BEGIN
    DECLARE v_count INT;
    SELECT COUNT(*) INTO v_count
    FROM classissues ci
    JOIN schedules sc ON ci.schedule_id = sc.schedule_id
    JOIN rooms      r  ON sc.room_id    = r.room_id
    WHERE r.building_id = p_building_id AND ci.status = 'open';
    RETURN v_count;
END$$

DELIMITER ;