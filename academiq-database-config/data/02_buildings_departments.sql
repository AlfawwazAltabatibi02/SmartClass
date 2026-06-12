-- ================================================================
-- Smart Class Scheduler — Cyprus International University
-- FILE   : data/02_buildings_departments.sql
-- PURPOSE: Seed buildings and departments  ← RUN 2nd
-- ================================================================
USE smart_class;

-- ── Buildings (matches your live SELECT * FROM buildings) ────────
INSERT IGNORE INTO buildings (building_id, name, location) VALUES
(1, 'Science and Technology',                 'ST'),
(2, 'Cevik Uraz Center',                      'CU'),
(3, 'Education and Graduate Sciences Center', 'GE'),
(4, 'Faculty of Medicine and Dentistry',      'MD'),
(5, 'Central Lecture Halls',                  'CL'),
(6, 'Educational Center',                     'EC'),
(7, 'Education and Humanities Center',        'EH');

-- ── Departments (real CIU Faculty of Engineering + others) ──────
INSERT IGNORE INTO departments (dept_name, building_id) VALUES
-- Engineering departments → ST Building (1)
('Computer Engineering',                   1),
('Civil Engineering',                      1),
('Electrical and Electronics Engineering', 1),
('Industrial Engineering',                 1),
('Mechanical Engineering',                 1),
('Bioengineering',                         1),
('Energy Systems Engineering',             1),
('Environmental Engineering',              1),
('Information Systems Engineering',        1),
('Petrol Oil and Gas Engineering',         1),
('Medicine',                               4),
('Dentistry',                              4),
('Education',                              3),
('Communication',                          7),
('Architecture',                           7);
