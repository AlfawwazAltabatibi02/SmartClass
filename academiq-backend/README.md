# AcademIQ Backend (FastAPI)

The backend serves the API and the static frontend pages from `/app`.

## Prerequisites

- Python 3.10+
- MySQL Server running locally (localhost:3306)
- Database initialized (see [academiq-database-config/README.md](../academiq-database-config/README.md))

If Python is not installed, download it from https://www.python.org/downloads/ and ensure "Add Python to PATH" is checked during install.

## Setup (Step-by-step)

### 1) Create and activate a virtual environment

```bash
python -m venv .venv
.venv\Scripts\activate
```

If PowerShell blocks activation:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.venv\Scripts\Activate.ps1
```

Or use CMD:

```cmd
.venv\Scripts\activate.bat
```

If you see a path error pointing to another user (e.g., `Fatal error in launcher`), recreate the venv:

```powershell
deactivate
Remove-Item -Recurse -Force .venv
python -m venv .venv
.venv\Scripts\Activate.ps1    
pip install fastapi uvicorn  
pip install mysql-connector-python
pip install "python-jose[cryptography]"
pip install python-dotenv
pip install "passlib[bcrypt]"
```

### 2) Install dependencies

```bash
pip install -r requirements.txt
```

### 3) Check the backend `.env`

Open `.env` in this folder and update DB credentials if they differ from your local setup.

## Run

```bash
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Open:

- App UI: `http://127.0.0.1:8000/`
- API docs: `http://127.0.0.1:8000/docs`

## Do the authentication through Auth API at SwaggerUI (User below can be replaced)

- `POST /auth/login`
- `GET /auth/me` (Bearer token required)

Login payload:

```json
{
  "role": "student",
  "identifier": "ahmed.hassan@student.ciu.edu.tr",
  "password": "ahmed.hassan"
}
```

## Notes

- `/db/*` endpoints require the database to be running.
- CORS is open (`*`) for local development.
