# AcademIQ Login Backend (FastAPI)

This backend implements only the first milestone: login APIs for `student`, `instructor`, and `admin` roles using JWT.

## 1) Setup

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

Optional: copy `.env.example` values into your environment.

## 2) Run

```bash
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

## 3) Endpoints

- `GET /health`
- `POST /auth/login`
- `GET /auth/me` (Bearer token required)

Swagger docs:
- `http://127.0.0.1:8000/docs`

## 4) Login payload contract

```json
{
  "role": "student",
  "identifier": "STU-2024-0041",
  "password": "student123"
}
```

Role examples:
- Student: `22414623@ciu,edu.tr` / `22414623`
- Instructor: `INS-2024-001` / `instructor123`
- Admin: `admin@institution.edu` / `admin123`

## 5) Frontend integration notes

- Your frontend should send role + identifier + password to `/auth/login`.
- Use response `access_token` as `Authorization: Bearer <token>` for protected routes.
- CORS is currently open (`*`) for local testing and should be restricted later.

## 6) Next migration step (MySQL)

Replace `auth_service.py` temporary users with MySQL queries while keeping the same API contract.


## 7) In order to run this you need to have

What to install:

Python (recommended: 3.10 or newer)
pip (comes with Python)
Optional but recommended: Git (only if you will clone/update from a repository)
Then run these steps in the project folder:

Create virtual environment:
python -m venv .venv
Activate it (Windows PowerShell):
Activate.ps1
Install dependencies:
pip install -r requirements.txt
Start server:
uvicorn main:app --reload --host 127.0.0.1 --port 8000
Notes:

No MySQL installation is required for the current version (it uses temporary users in code).
API docs will be at: http://127.0.0.1:8000/docs
If you want, I can also give you a one-time “fresh Windows machine” checklist (including execution policy fix if PowerShell blocks venv activation).
