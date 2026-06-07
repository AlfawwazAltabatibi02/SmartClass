-- ================================================================
-- Smart Class Scheduler — Cyprus International University
-- FILE   : triggers/09_triggers.sql
-- PURPOSE: All triggers  ← RUN 9th
-- ================================================================
USE smart_class;

DELIMITER $$

-- TRG1: Prevent double-booking a room (BEFORE INSERT on schedules)
CREATE TRIGGER trg_prevent_double_booking
BEFORE INSERT ON schedules
FOR EACH ROW
BEGIN
    DECLARE v_conflict INT;
    SELECT COUNT(*) INTO v_conflict
    FROM schedules
    WHERE room_id = NEW.room_id AND day = NEW.day AND time_slot = NEW.time_slot;
    IF v_conflict > 0 THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Room already booked at this day and time.';
    END IF;
END$$

-- TRG2: Auto-log room as occupied when a new schedule is inserted
CREATE TRIGGER trg_room_occupied_on_schedule
AFTER INSERT ON schedules
FOR EACH ROW
BEGIN
    INSERT INTO roomstatus (room_id, timestamp, status, notes)
    VALUES (NEW.room_id, NOW(), 'occupied',
            CONCAT('Auto: occupied by schedule_id=', NEW.schedule_id));
END$$

-- TRG3: Default issue status to 'open' and set today's date if missing
CREATE TRIGGER trg_issue_defaults
BEFORE INSERT ON classissues
FOR EACH ROW
BEGIN
    IF NEW.status IS NULL THEN
        SET NEW.status = 'open';
    END IF;
    IF NEW.reported_date IS NULL THEN
        SET NEW.reported_date = CURDATE();
    END IF;
END$$

-- TRG4: Block enrollment when class is at room capacity
CREATE TRIGGER trg_enrollment_capacity_check
BEFORE INSERT ON enrollments
FOR EACH ROW
BEGIN
    DECLARE v_capacity INT DEFAULT 9999;
    DECLARE v_enrolled INT DEFAULT 0;

    SELECT r.capacity INTO v_capacity
    FROM schedules sc
    JOIN rooms r ON sc.room_id = r.room_id
    WHERE sc.class_id = NEW.class_id LIMIT 1;

    SELECT COUNT(*) INTO v_enrolled
    FROM enrollments WHERE class_id = NEW.class_id;

    IF v_enrolled >= v_capacity THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Enrollment rejected: room capacity reached.';
    END IF;
END$$

-- TRG5: Auto-mark equipment faulty when a related issue is reported
CREATE TRIGGER trg_flag_equipment_on_issue
AFTER INSERT ON classissues
FOR EACH ROW
BEGIN
    IF NEW.issue_type LIKE '%Projector%'
    OR NEW.issue_type LIKE '%Equipment%'
    OR NEW.issue_type LIKE '%Smart Board%' THEN
        UPDATE equipment eq
        JOIN schedules sc ON sc.schedule_id = NEW.schedule_id
        SET eq.status = 'faulty', eq.last_checked = CURDATE()
        WHERE eq.room_id = sc.room_id;
    END IF;
END$$

DELIMITER ;
