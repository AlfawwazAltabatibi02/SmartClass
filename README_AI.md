# AcademIQ AI Assistant

This project now includes a role-aware AI assistant for the existing AcademIQ dashboards.
It is added on top of the current backend and frontend, so the normal student, instructor,
and admin pages still run the same way.

## What It Does

The assistant appears as an **AI Assistant** tab inside:

- Student dashboard
- Instructor dashboard
- Admin dashboard

It uses the logged-in user's role and JWT token, then runs approved read-only database
queries for that role. The database rows are sent to Groq, and Groq writes a short answer
for the demo. The raw matching rows are also shown in a table under the answer.

## Role Features

Student can ask about:

- Weekly schedule
- Enrolled courses
- Instructors and office rooms

Example questions:

- `What classes do I have this week?`
- `Who are my instructors?`
- `Where is my next class?`

Instructor can ask about:

- Teaching schedule
- Students in their classes
- Reported class issues
- Available rooms

Example questions:

- `Show my teaching schedule`
- `List my students`
- `Which rooms are available?`

Admin can ask about:

- System overview
- Student counts
- Instructor teaching load
- Open issues
- Available rooms

Example questions:

- `Give me a system overview`
- `Show open issues`
- `Which instructors have the most classes?`

## Demo Logins

Use these accounts after importing the database:

```text
Student
Identifier: ahassan@student.ciu.edu.tr
Password: ahmed.hassan

Instructor
Identifier: mehmet.kusaf@ciu.edu.tr
Password: mehmet.kusaf

Admin
Identifier: admin@ciu.edu.tr
Password: admin123
```

## How To Run

1. Start MySQL.

2. Import the database from the project root:

```powershell
cd academiq-database-config
mysql -u root -p < README_RUN_ORDER.sql
```

3. Start the backend:

```powershell
cd ..\academiq-backend
py -3.11 -m uvicorn main:app --host 127.0.0.1 --port 8000
```

4. Open the app:

```text
http://127.0.0.1:8000/app/login/login.html
```

## AI Configuration

The backend reads Groq settings from:

```text
academiq-backend/.env
```

Required values:

```text
GROQ_API_KEY=your_groq_key_here
GROQ_MODEL=llama-3.3-70b-versatile
```

The AI endpoint is:

```text
POST /ai/chat
```

It requires the same login token as the dashboard.

## Files Added Or Changed

Backend:

- `academiq-backend/ai_routes.py`
- `academiq-backend/main.py`
- `academiq-backend/.env`

Frontend:

- `academiq-frontend/js/aiAssistant.js`
- `academiq-frontend/js/api.js`
- `academiq-frontend/css/ai-assistant.css`
- `academiq-frontend/student/student.html`
- `academiq-frontend/instructor/instructor.html`
- `academiq-frontend/admin/admin.html`
- `academiq-frontend/js/student.js`
- `academiq-frontend/js/instructor.js`
- `academiq-frontend/js/admin.js`

Database compatibility fixes:

- `academiq-database-config/schema/01_schema.sql`
- `academiq-database-config/data/04_people_subjects.sql`
- `academiq-database-config/data/05_schedule_data.sql`

Small backend cleanup:

- `academiq-backend/database.py`
- `academiq-backend/auth_service.py`
- `academiq-backend/security.py`
- `academiq-backend/create_complaints_table.py`

## Test Results On This Machine

Validated with MySQL database `smart_class` and backend on:

```text
http://127.0.0.1:8000
```

Passed checks:

- Backend health works.
- Database health works.
- Student login works.
- Instructor login works.
- Admin login works.
- Student dashboard data returns records.
- Instructor dashboard data returns records.
- Admin dashboard data returns records.
- AI assistant answers for student, instructor, and admin.
- AI frontend files load successfully.
