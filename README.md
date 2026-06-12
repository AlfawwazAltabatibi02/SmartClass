# 🎓 Smart Class — Smart Class Scheduler

> A full-stack academic scheduling platform for **Cyprus International University**. Manage timetables, classrooms, instructors, exam schedules, and feedback — all from one unified dashboard.

---

## ✨ Features

| Role | Capabilities |
|------|-------------|
| **Student** | View personal timetable, enrolled courses, instructor contacts, office hours, midterm & final exam schedule, live class tracking |
| **Instructor** | Teaching schedule, weekly availability grid, student roster with search/filter, classroom status, feedback & issue reporting to admin |
| **Admin** | System overview with live stats, master timetable (all departments), instructor load management, classroom availability (322 rooms), exam schedule builder, feedback resolution |

### Highlights
- 🔐 **JWT Authentication** — Secure login with role-based access control
- 📊 **Live MySQL Data** — All dashboards pull real-time data from the database
- 🏫 **244 Classrooms** tracked across 7 buildings with live status (Available / In Use / Under Capacity / Under Maintenance)
- 📅 **Exam Management** — Admin can create midterm & final exam slots with building/hall selection
- 💬 **Feedback System** — Instructors report classroom issues, admins respond & resolve
- ⏰ **Live Clock** — Real-time clock and "LIVE" badges for ongoing classes

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | HTML5, CSS3, Vanilla JavaScript |
| **Backend** | Python — FastAPI, Uvicorn |
| **Database** | MySQL 8.4 |
| **Auth** | JWT (python-jose) + PBKDF2-SHA256 password hashing |
| **Fonts** | Playfair Display, DM Sans, DM Mono (Google Fonts) |

---



```
AcademIQ/
├── frontend/                          # Static frontend (served by FastAPI)
│   ├── index.html                     # Root redirect → login
│   ├── login/login.html               # Login page
│   ├── forgot-password/               # Forgot password flow
│   ├── reset-password/                # Reset password flow
│   ├── student/student.html           # Student dashboard
│   ├── instructor/instructor.html     # Instructor dashboard
│   ├── admin/admin.html               # Admin dashboard
│   ├── css/
│   │   ├── common.css                 # Shared design system (1288 lines)
│   │   ├── login.css                  # Login page styles
│   │   ├── student.css                # Student role overrides
│   │   ├── instructor.css             # Instructor role overrides
│   │   └── admin.css                  # Admin role overrides
│   └── js/
│       ├── api.js                     # API service (fetch wrapper + auth headers)
│       ├── auth.js                    # Auth module (localStorage, route guards)
│       ├── semester.js                # Academic semester utility
│       ├── universityData.js          # Static schedule/enrollment data
│       ├── studentExams.js            # Student exam data
│       ├── login.js                   # Login page logic
│       ├── student.js                 # Student dashboard logic
│       ├── instructor.js              # Instructor dashboard logic
│       └── admin.js                   # Admin dashboard logic
│
├── backend/                           # FastAPI Python backend
│   ├── main.py                        # App entry point, auth routes, static serving
│   ├── auth_service.py                # Authentication logic (DB + fallback)
│   ├── db_routes.py                   # All /db/* API endpoints
│   ├── database.py                    # MySQL connection pool
│   ├── config.py                      # Settings from .env
│   ├── schemas.py                     # Pydantic request/response models
│   ├── security.py                    # JWT & password hashing
│   ├── requirements.txt               # Python dependencies
│   └── .env                           # Environment configuration
│
└── Database/                          # MySQL initialization scripts
    ├── README_RUN_ORDER.sql           # Master script (run all in order)
    ├── schema/01_schema.sql           # 14 tables
    ├── data/
    │   ├── 02_buildings_departments.sql   # 7 buildings, 15 departments
    │   ├── 03_rooms.sql               # 322 rooms
    │   ├── 04_people_subjects.sql     # 30 students, 15 instructors, 30 subjects
    │   └── 05_schedule_data.sql       # Classes, schedules, enrollments, users
    ├── indexes/06_indexes.sql         # Performance indexes
    ├── views/07_views.sql             # 7 database views
    ├── procedures/08_procedures_functions.sql  # 7 stored procedures + 4 functions
    ├── triggers/09_triggers.sql       # 5 triggers
    ├── auth/10_authorization.sql      # 4 MySQL users + grants
    └── queries/11_queries.sql         # 25 useful queries
```

---

## 🚀 Getting Started

### Prerequisites

- **Python 3.10+** — [python.org](https://www.python.org/downloads/)
- **MySQL 8.0+** — [dev.mysql.com](https://dev.mysql.com/downloads/mysql/)

### 1. Set Up the Database

Follow the database setup guide here:

[academiq-database-config/README.md](academiq-database-config/README.md)

Note: If your local MySQL server is not running, the backend will not connect.

### 2. Configure the Backend

Follow the backend setup guide here:

[academiq-backend/README.md](academiq-backend/README.md)


Open your browser at: **http://127.0.0.1:8000/**

---


| Username | Password |
|----------|----------|
| `admin@ciu.edu.tr` | `admin123` |

---

## 📡 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/auth/login` | Login with role, identifier, password |
| `GET` | `/auth/me` | Get current user profile |
| `POST` | `/auth/forgot-password` | Request password reset |
| `POST` | `/auth/reset-password` | Reset password |

### Database (requires JWT)
| Method | Endpoint | Roles | Description |
|--------|----------|-------|-------------|
| `GET` | `/db/health` | Public | Database connectivity check |
| `GET` | `/db/schedule` | All | Full weekly schedule |
| `GET` | `/db/schedule/today` | All | Today's classes only |
| `GET` | `/db/rooms` | Instructor, Admin | All rooms with status |
| `GET` | `/db/rooms/available` | All | Currently empty rooms |
| `GET` | `/db/instructors` | All | All instructors with offices |
| `GET` | `/db/instructors/office-hours` | All | Instructor office hours |
| `GET` | `/db/instructor/me/schedule` | Instructor | My teaching schedule |
| `GET` | `/db/instructor/me/students` | Instructor | Students in my courses |
| `GET` | `/db/instructor/me/issues` | Instructor | My reported issues |
| `POST` | `/db/instructor/me/issues` | Instructor | Report classroom issue |
| `GET` | `/db/students` | Admin | All students |
| `GET` | `/db/students/enrollment` | Instructor, Admin | Enrollment vs capacity |
| `GET` | `/db/issues` | Instructor, Admin | Open issues |
| `PATCH` | `/db/issues/{id}/resolve` | Admin | Resolve an issue |
| `GET` | `/db/equipment/faulty` | Instructor, Admin | Faulty equipment |

Full API docs available at: **http://127.0.0.1:8000/docs**

---

## 🗄️ Database Schema

The `smart_class` database contains **14 tables**:

| Table | Description | Records |
|-------|-------------|---------|
| `buildings` | Campus buildings | 7 |
| `departments` | Academic departments | 15 |
| `rooms` | Classrooms, labs, seminar rooms | 25 |
| `instructors` | Teaching staff | 15 |
| `students` | Enrolled students | 367 |
| `subjects` | Course subjects | 30 |
| `classes` | Course sections | 20 |
| `schedules` | Timetable entries | 40 |
| `enrollments` | Student-class assignments | 1,223 |
| `officehours` | Instructor office hours | 15 |
| `equipment` | Room equipment inventory | 100+ |
| `roomstatus` | Room availability logs | Dynamic |
| `classissues` | Reported classroom issues | Dynamic |
| `users` | Login credentials | 46 |

### MySQL Users
| User | Access Level |
|------|-------------|
| `smart_admin` | Full privileges + GRANT OPTION |
| `smart_staff` | SELECT all + INSERT/UPDATE scheduling |
| `smart_student` | SELECT on views + public tables |
| `smart_report` | SELECT all (read-only analytics) |

---

## 👥 Team

**Graduation Project — Cyprus International University**
**Department of Computer Engineering**

---

<p align="center">
  <em>Built with ❤️ for CIU</em>
</p>
