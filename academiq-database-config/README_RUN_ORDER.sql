-- ================================================================
-- Smart Class Scheduler — Cyprus International University
-- FILE   : README_RUN_ORDER.sql
-- PURPOSE: Master script — runs all files in correct order
--          Run this single file to set up the entire database
-- ================================================================

-- OPTION A: Run all at once from terminal
-- mysql -u root -p < README_RUN_ORDER.sql

SOURCE schema/01_schema.sql;
SOURCE data/02_buildings_departments.sql;
SOURCE data/03_rooms.sql;
SOURCE data/04_people_subjects.sql;
SOURCE data/05_schedule_data.sql;
SOURCE indexes/06_indexes.sql;
SOURCE views/07_views.sql;
SOURCE procedures/08_procedures_functions.sql;
SOURCE triggers/09_triggers.sql;
SOURCE auth/10_authorization.sql;

-- ================================================================
-- FOLDER STRUCTURE
-- ================================================================
-- smart_class_project/
-- ├── schema/
-- │   └── 01_schema.sql          ← CREATE TABLE (all 14 tables)
-- ├── data/
-- │   ├── 02_buildings_departments.sql  ← 7 buildings, 15 depts
-- │   ├── 03_rooms.sql           ← 322 rooms across all buildings
-- │   ├── 04_people_subjects.sql ← 30 students, 15 instructors, 30 subjects
-- │   └── 05_schedule_data.sql   ← classes, schedules, enrollments,
-- │                                 officehours, equipment,
-- │                                 roomstatus, classissues, users
-- ├── indexes/
-- │   └── 06_indexes.sql         ← all indexes (matches live DB)
-- ├── views/
-- │   └── 07_views.sql           ← 7 views
-- ├── procedures/
-- │   └── 08_procedures_functions.sql ← 7 SPs + 4 functions
-- ├── triggers/
-- │   └── 09_triggers.sql        ← 5 triggers
-- ├── auth/
-- │   └── 10_authorization.sql   ← 4 MySQL users + grants
-- └── queries/
--     └── 11_queries.sql         ← 25 useful queries

-- ================================================================
-- USER SUMMARY
-- ================================================================
-- smart_admin   → ALL PRIVILEGES + GRANT OPTION (full DB control)
-- smart_staff   → SELECT all + INSERT/UPDATE scheduling tables
-- smart_student → SELECT on views + public tables only
-- smart_report  → SELECT all (read-only analytics)
-- ================================================================
