# AcademIQ Frontend

This frontend is static HTML/CSS/JS and is served by the FastAPI backend at `/app`.

## Run (Recommended)

Start the backend and open the app from the same server:

- App UI: `http://127.0.0.1:8000/`

Backend setup is documented here:

[academiq-backend/README.md](../academiq-backend/README.md)

## Structure

- `login/`, `student/`, `instructor/`, `admin/` contain the pages.
- `css/` contains shared and role-specific styles.
- `js/` contains page logic and API helpers.

## Notes

- There is no build step.
- If you open HTML files directly in the browser, API calls may fail due to CORS.
