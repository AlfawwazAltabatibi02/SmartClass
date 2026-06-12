-- ================================================================
-- Smart Class Scheduler — Cyprus International University
-- FILE   : data/04_people_subjects.sql
-- PURPOSE: Students, Instructors, Subjects  ← RUN 4th
-- ================================================================
USE smart_class;

-- ── Students (matches your live SELECT * FROM students) ──────────
INSERT INTO students (name, email, program) VALUES
('Ahmed Hassan',        'ahassan@student.ciu.edu.tr',      'Computer Engineering'),
('Fatima Al-Zahra',     'falzahra@student.ciu.edu.tr',     'Computer Engineering'),
('Plamedi Kapuya',      'pkapuya@student.ciu.edu.tr',      'Computer Engineering'),
('Amara Diallo',        'adiallo@student.ciu.edu.tr',      'Computer Engineering'),
('Yusuf Okonkwo',       'yokonkwo@student.ciu.edu.tr',     'Computer Engineering'),
('Nadia Bello',         'nbello@student.ciu.edu.tr',       'Civil Engineering'),
('Ibrahim Musa',        'imusa@student.ciu.edu.tr',        'Civil Engineering'),
('Leila Karimi',        'lkarimi@student.ciu.edu.tr',      'Civil Engineering'),
('Carlos Mendez',       'cmendez@student.ciu.edu.tr',      'Electrical and Electronics Engineering'),
('Aisha Suleiman',      'asuleiman@student.ciu.edu.tr',    'Electrical and Electronics Engineering'),
('David Mensah',        'dmensah@student.ciu.edu.tr',      'Electrical and Electronics Engineering'),
('Sara Yilmaz',         'syilmaz@student.ciu.edu.tr',      'Industrial Engineering'),
('Omar Farouk',         'ofarouk@student.ciu.edu.tr',      'Industrial Engineering'),
('Kofi Asante',         'kasante@student.ciu.edu.tr',      'Mechanical Engineering'),
('Maria Santos',        'msantos@student.ciu.edu.tr',      'Mechanical Engineering'),
('Zara Ahmed',          'zahmed@student.ciu.edu.tr',       'Bioengineering'),
('Emmanuel Eze',        'eeze@student.ciu.edu.tr',         'Bioengineering'),
('Hassan Ali',          'hali@student.ciu.edu.tr',         'Energy Systems Engineering'),
('Priya Sharma',        'psharma@student.ciu.edu.tr',      'Energy Systems Engineering'),
('Lena Muller',         'lmuller@student.ciu.edu.tr',      'Environmental Engineering'),
('Chidi Obi',           'cobi@student.ciu.edu.tr',         'Environmental Engineering'),
('Sofia Andrade',       'sandrade@student.ciu.edu.tr',     'Information Systems Engineering'),
('Kenji Tanaka',        'ktanaka@student.ciu.edu.tr',      'Information Systems Engineering'),
('Rania Khalil',        'rkhalil@student.ciu.edu.tr',      'Petrol Oil and Gas Engineering'),
('Taiwo Adesanya',      'tadesanya@student.ciu.edu.tr',    'Petrol Oil and Gas Engineering'),
('Amina Diop',          'adiop@student.ciu.edu.tr',        'Medicine'),
('Lucas Ferreira',      'lferreira@student.ciu.edu.tr',    'Medicine'),
('Hana Moradi',         'hmoradi@student.ciu.edu.tr',      'Dentistry'),
('Blessing Okeke',      'bokeke@student.ciu.edu.tr',       'Education'),
('Yasmin Rashid',       'yrashid@student.ciu.edu.tr',      'Education');

-- ── Instructors (real CIU staff — matches live SELECT * FROM instructors)
-- office_room_id 1-10 = first 10 lecture rooms in ST building
-- ─────────────────────────────────────────────────────────────────
INSERT INTO instructors (name, email, office_room_id, building_id) VALUES
('Prof. Dr. MEHMET KUSAF',                      'mehmet.kusaf@ciu.edu.tr',         228,  1),
('Prof. Dr. DERVİŞ ZİHNİ DENİZ',                'ddeniz@ciu.edu.tr',               202,  1),
('Prof. Dr. MELİKE ŞAH DİREKOĞLU',              'mdirekoğlu@ciu.edu.tr',           202,  1),
('Asst. Prof. Dr. ASAD ALI',                    'aali@ciu.edu.tr',                 201,  1),
('Assoc. Prof. Dr. KAMİL YURTKAN',              'kyurtkan@ciu.edu.tr',             222,  1),
('Asst. Prof. Dr. FELIX OLANREWAJU BABALOLA',   'fbabalola@ciu.edu.tr',            211,  1),
('Asst. Prof. Dr. PARVANEH ESMAİLİ',            'pesmaili@ciu.edu.tr',             202,  1),
('Prof. Dr. HALİL NADİRİ',                      'hnadiri@ciu.edu.tr',              226,  3),
('Asst. Prof. Dr. Turgay Tugay',                'ttugay@ciu.edu.tr',               9,  1),
('Asst. Prof. Dr. Sana Khoja',                  'skhoja@ciu.edu.tr',               10,  1),
('Prof. Dr. Ali Ekber Sahin',                   'asahin@ciu.edu.tr',               1,  3),
('Assoc. Prof. Dr. Levent Kaya',                'lkaya@ciu.edu.tr',                2,  3),
('Prof. Dr. Osman Yilmaz',                      'oyilmaz@ciu.edu.tr',              1,  4),
('Assoc. Prof. Dr. Fatma Ozkan',                'fozkan@ciu.edu.tr',               2,  4),
('Asst. Prof. Dr. Murat Demir',                 'mdemir@ciu.edu.tr',               1,  7);

-- ── Subjects (matches live SELECT * FROM subjects) ────────────────
INSERT INTO subjects (name, type) VALUES
('Systems Programming',              'Core'),
('Database Management Systems',      'Core'),
('Data Structures and Algorithms',   'Core'),
('Operating Systems',                'Core'),
('Computer Networks',                'Core'),
('Artificial Intelligence',          'Elective'),
('Software Engineering',             'Core'),
('Web Technologies',                 'Elective'),
('Circuit Theory',                   'Core'),
('Digital Electronics',              'Core'),
('Signal Processing',                'Core'),
('Electromagnetics',                 'Core'),
('Structural Analysis',              'Core'),
('Fluid Mechanics',                  'Core'),
('Geotechnics',                      'Core'),
('Thermodynamics',                   'Core'),
('Engineering Mechanics',            'Core'),
('Control Systems',                  'Core'),
('Renewable Energy Systems',         'Core'),
('Power Systems',                    'Core'),
('Biomechanics',                     'Core'),
('Biomedical Instrumentation',       'Core'),
('Environmental Impact Assessment',  'Core'),
('Water Treatment Engineering',      'Core'),
('Operations Research',              'Core'),
('Production Planning',              'Core'),
('Anatomy',                          'Core'),
('Pharmacology',                     'Core'),
('Curriculum Development',           'Core'),
('Educational Psychology',           'Core');
