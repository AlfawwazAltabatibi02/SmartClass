-- ================================================================
-- Smart Class Scheduler — Cyprus International University
-- FILE   : data/03_rooms.sql
-- PURPOSE: Insert all 322 rooms (matches your live SELECT * FROM rooms)
--          RUN 3rd — requires buildings to exist
-- ================================================================
USE smart_class;

-- ── ST Building (building_id=1) — Lecture rooms ST101-ST265 ─────
INSERT IGNORE INTO rooms (building_id, name, capacity, type) VALUES
-- Ground/1F Lecture halls (ST101–ST200)
(1,'ST101',NULL,'lecture'),(1,'ST102',NULL,'lecture'),(1,'ST103',NULL,'lecture'),
(1,'ST104',NULL,'lecture'),(1,'ST105',NULL,'lecture'),(1,'ST106',NULL,'lecture'),
(1,'ST107',NULL,'lecture'),(1,'ST108',NULL,'lecture'),(1,'ST109',NULL,'lecture'),
(1,'ST110',NULL,'lecture'),(1,'ST111',NULL,'lecture'),(1,'ST112',NULL,'lecture'),
(1,'ST113',NULL,'lecture'),(1,'ST114',NULL,'lecture'),(1,'ST115',NULL,'lecture'),
(1,'ST116',NULL,'lecture'),(1,'ST117',NULL,'lecture'),(1,'ST118',NULL,'lecture'),
(1,'ST119',NULL,'lecture'),(1,'ST120',NULL,'lecture'),(1,'ST121',NULL,'lecture'),
(1,'ST122',NULL,'lecture'),
-- Additional lecture rooms
(1,'ST223',NULL,'lecture'),(1,'ST224',NULL,'lecture'),(1,'ST225',NULL,'lecture'),
(1,'ST226',NULL,'lecture'),(1,'ST227',NULL,'lecture'),(1,'ST228',NULL,'lecture'),
(1,'ST229',NULL,'lecture'),(1,'ST230',NULL,'lecture'),(1,'ST233',NULL,'lecture'),
(1,'ST236',NULL,'lecture'),(1,'ST237',NULL,'lecture'),(1,'ST263',NULL,'lecture'),
-- ST Office rooms (ST201–ST264)
(1,'ST201',NULL,'office'),(1,'ST202',NULL,'office'),(1,'ST203',NULL,'office'),
(1,'ST204',NULL,'office'),(1,'ST205',NULL,'office'),(1,'ST206',NULL,'office'),
(1,'ST207',NULL,'office'),(1,'ST208',NULL,'office'),(1,'ST209',NULL,'office'),
(1,'ST210',NULL,'office'),(1,'ST211',NULL,'office'),(1,'ST212',NULL,'office'),
(1,'ST213',NULL,'office'),(1,'ST214',NULL,'office'),(1,'ST215',NULL,'office'),
(1,'ST216',NULL,'office'),(1,'ST217',NULL,'office'),(1,'ST218',NULL,'office'),
(1,'ST219',NULL,'office'),(1,'ST220',NULL,'office'),(1,'ST221',NULL,'office'),
(1,'ST222',NULL,'office'),(1,'ST264',NULL,'office'),
-- ST Labs (ST231–ST235)
(1,'ST231',NULL,'lab'),(1,'ST232',NULL,'lab'),(1,'ST234',NULL,'lab'),(1,'ST235',NULL,'lab'),
-- More offices
(1,'ST238',NULL,'office'),(1,'ST239',NULL,'office'),(1,'ST240',NULL,'office'),
(1,'ST241',NULL,'office'),(1,'ST242',NULL,'office'),(1,'ST243',NULL,'office'),
(1,'ST244',NULL,'office'),(1,'ST245',NULL,'office'),(1,'ST246',NULL,'office'),
(1,'ST247',NULL,'office'),(1,'ST248',NULL,'office'),(1,'ST249',NULL,'office'),
(1,'ST250',NULL,'office'),(1,'ST251',NULL,'office'),(1,'ST252',NULL,'office'),
(1,'ST253',NULL,'office'),(1,'ST254',NULL,'office'),(1,'ST255',NULL,'office'),
(1,'ST256',NULL,'office'),(1,'ST257',NULL,'office'),(1,'ST258',NULL,'office'),
(1,'ST259',NULL,'office'),(1,'ST260',NULL,'office'),(1,'ST261',NULL,'office'),
(1,'ST262',NULL,'office'),(1,'ST265',NULL,'office'),
-- STB Basement Labs
(1,'STB-01',NULL,'lab'),(1,'STB-O2',NULL,'lab'),(1,'STB-03',NULL,'lab'),
(1,'STB-04',NULL,'lab'),(1,'STB-05',NULL,'lab'),(1,'STB-06',NULL,'lab'),
(1,'STB-07',NULL,'lab'),(1,'STB-08',NULL,'lab'),(1,'STB-09',NULL,'lab'),
(1,'STB-10',NULL,'lab'),(1,'STB-11',NULL,'lab'),(1,'STB-12',NULL,'lab'),
(1,'STB-13',NULL,'lab'),(1,'STB-14',NULL,'lab'),(1,'STB-15',NULL,'lab'),
(1,'STB-16',NULL,'lab'),(1,'STB-17',NULL,'lab'),(1,'STB-18',NULL,'lab'),
(1,'STB-19',NULL,'lab'),(1,'STB-20',NULL,'lab'),(1,'STB-21',NULL,'lab'),
(1,'STB-22',NULL,'lab'),(1,'STB-23',NULL,'lab'),(1,'STB-24',NULL,'lab'),
(1,'STB-25',NULL,'lab'),(1,'STB-26',NULL,'lab'),(1,'STB-27',NULL,'lab');

-- ── CU Building (building_id=2) ─────────────────────────────────
INSERT IGNORE INTO rooms (building_id, name, capacity, type) VALUES
(2,'CU-001',200,'lecture'),(2,'CU-002',200,'lecture'),(2,'CU-003',150,'lecture'),
(2,'CU-004',150,'lecture'),(2,'CU-005',100,'lecture'),(2,'CU-006',100,'lecture'),
(2,'CU-101', 30,'seminar'),(2,'CU-102', 30,'seminar'),(2,'CU-103', 30,'seminar'),
(2,'CU-104', 30,'seminar'),(2,'CU-105', 20,'seminar'),(2,'CU-106', 20,'seminar'),
(2,'CU-107',  4,'office'), (2,'CU-108',  4,'office'), (2,'CU-109',  4,'office'),
(2,'CU-110',  4,'office'),
(2,'CU-201',  4,'office'), (2,'CU-202',  4,'office'), (2,'CU-203',  4,'office'),
(2,'CU-204',  4,'office'), (2,'CU-205',  4,'office'), (2,'CU-206',  4,'office');

-- ── GE Building (building_id=3) ─────────────────────────────────
INSERT IGNORE INTO rooms (building_id, name, capacity, type) VALUES
(3,'GE-001', 80,'lecture'),(3,'GE-002', 80,'lecture'),
(3,'GE-003', 60,'lecture'),(3,'GE-004', 60,'lecture'),
(3,'GE-101', 25,'seminar'),(3,'GE-102', 25,'seminar'),(3,'GE-103', 25,'seminar'),
(3,'GE-104', 20,'seminar'),(3,'GE-105', 20,'seminar'),(3,'GE-106', 15,'seminar'),
(3,'GE-201',  3,'office'), (3,'GE-202',  3,'office'), (3,'GE-203',  3,'office'),
(3,'GE-204',  3,'office'), (3,'GE-205',  3,'office'), (3,'GE-206',  3,'office'),
(3,'GE-207',  3,'office'), (3,'GE-208',  3,'office'),
(3,'GE-B101',15,'lab'),    (3,'GE-B102',15,'lab');

-- ── MD Building (building_id=4) ─────────────────────────────────
INSERT IGNORE INTO rooms (building_id, name, capacity, type) VALUES
(4,'MD-001',150,'lecture'),(4,'MD-002',150,'lecture'),
(4,'MD-003',100,'lecture'),(4,'MD-004', 80,'lecture'),
(4,'MD-101', 20,'lab'),(4,'MD-102',20,'lab'),(4,'MD-103',20,'lab'),
(4,'MD-104', 20,'lab'),(4,'MD-105',20,'lab'),(4,'MD-106',16,'lab'),
(4,'MD-107', 16,'lab'),(4,'MD-108',16,'lab'),
(4,'MD-201',  3,'office'),(4,'MD-202', 3,'office'),(4,'MD-203', 3,'office'),
(4,'MD-204',  3,'office'),(4,'MD-205', 3,'office'),(4,'MD-206', 3,'office'),
(4,'MD-207',  3,'office'),(4,'MD-208', 3,'office'),(4,'MD-209', 4,'office'),
(4,'MD-210',  3,'office'),
(4,'MD-301', 20,'seminar'),(4,'MD-302',20,'seminar'),(4,'MD-303',15,'seminar');

-- ── CL Building (building_id=5) ─────────────────────────────────
INSERT IGNORE INTO rooms (building_id, name, capacity, type) VALUES
(5,'CL-001',300,'lecture'),(5,'CL-002',300,'lecture'),
(5,'CL-003',250,'lecture'),(5,'CL-004',250,'lecture'),
(5,'CL-101',200,'lecture'),(5,'CL-102',200,'lecture'),
(5,'CL-103',150,'lecture'),(5,'CL-104',150,'lecture'),
(5,'CL-105',100,'lecture'),(5,'CL-106',100,'lecture'),
(5,'CL-201', 80,'lecture'),(5,'CL-202', 80,'lecture'),(5,'CL-203',80,'lecture'),
(5,'CL-204', 60,'lecture'),(5,'CL-205', 60,'lecture'),
(5,'CL-301', 30,'seminar'),(5,'CL-302',30,'seminar'),(5,'CL-303',25,'seminar'),
(5,'CL-401',  3,'office'), (5,'CL-402', 3,'office'), (5,'CL-403', 3,'office');

-- ── EC Building (building_id=6) ─────────────────────────────────
INSERT IGNORE INTO rooms (building_id, name, capacity, type) VALUES
(6,'EC-001',60,'lecture'),(6,'EC-002',60,'lecture'),(6,'EC-003',60,'lecture'),
(6,'EC-004',60,'lecture'),(6,'EC-005',40,'lecture'),(6,'EC-006',40,'lecture'),
(6,'EC-101',30,'lab'),    (6,'EC-102',30,'lab'),    (6,'EC-103',30,'lab'),
(6,'EC-104',25,'lab'),
(6,'EC-105',25,'seminar'),(6,'EC-106',25,'seminar'),(6,'EC-107',20,'seminar'),
(6,'EC-201', 3,'office'), (6,'EC-202', 3,'office'), (6,'EC-203', 3,'office'),
(6,'EC-204', 3,'office'), (6,'EC-205', 3,'office'), (6,'EC-206', 3,'office');

-- ── EH Building (building_id=7) ─────────────────────────────────
INSERT IGNORE INTO rooms (building_id, name, capacity, type) VALUES
(7,'EH-001',80,'lecture'),(7,'EH-002',80,'lecture'),(7,'EH-003',60,'lecture'),
(7,'EH-004',60,'lecture'),(7,'EH-005',40,'lecture'),
(7,'EH-101',20,'lab'),    (7,'EH-102',20,'lab'),    (7,'EH-103',20,'lab'),
(7,'EH-104',20,'lab'),
(7,'EH-105',25,'seminar'),(7,'EH-106',25,'seminar'),
(7,'EH-107',20,'seminar'),(7,'EH-108',20,'seminar'),
(7,'EH-201', 3,'office'), (7,'EH-202', 3,'office'), (7,'EH-203', 3,'office'),
(7,'EH-204', 3,'office'), (7,'EH-205', 3,'office'), (7,'EH-206', 3,'office'),
(7,'EH-207', 3,'office'), (7,'EH-208', 3,'office'), (7,'EH-209', 3,'office'),
(7,'EH-210', 3,'office');
