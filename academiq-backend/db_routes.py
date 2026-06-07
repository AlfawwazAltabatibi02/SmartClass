"""
db_routes.py — FastAPI router for all smart_class database endpoints.

Endpoints exposed:
  GET /db/health            — checks DB connectivity
  GET /db/schedule          — full timetable (v_full_schedule)
  GET /db/schedule/today    — today's classes only
  GET /db/rooms             — all rooms with live status
  GET /db/rooms/available   — rooms currently empty (v_empty_rooms)
  GET /db/instructors       — all instructors + office hours
  GET /db/instructor/me     — schedule for the logged-in instructor
  GET /db/students          — all students (admin only)
  GET /db/issues            — open class issues (v_open_issues)
  GET /db/equipment/faulty  — faulty equipment list (v_faulty_equipment)
  GET /db/enrollment        — enrollment counts vs capacity
"""
from __future__ import annotations

from datetime import datetime
import re
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from database import db_available, get_db
from schemas import (IssueCreateRequest, IssueResolveRequest, AvailabilitySlot,
                     AvailabilityUpsertRequest, ComplaintCreateRequest, ComplaintRespondRequest, ExamCreatePayload)
from security import decode_access_token

router = APIRouter(prefix="/db", tags=["database"])
bearer = HTTPBearer(auto_error=False)


def _parse_time_range_minutes(value: str) -> tuple[int, int] | None:
    """Parse time ranges like '08:30 - 09:20' or '09:00-10:50' into minutes."""
    if not value:
        return None
    matches = re.findall(r"(\d{1,2})\s*:\s*(\d{2})", value)
    if len(matches) < 2:
        return None
    (sh, sm), (eh, em) = matches[0], matches[1]
    start = int(sh) * 60 + int(sm)
    end = int(eh) * 60 + int(em)
    if end <= start:
        return None
    return start, end


def _ranges_overlap(a: tuple[int, int], b: tuple[int, int]) -> bool:
    return a[0] < b[1] and b[0] < a[1]



def _resolve_instructor_subject(subject: str) -> str:
    normalized_subject = (subject or "").strip().lower()
    if not normalized_subject or not db_available():
        return subject

    subject_tokens = [token for token in re.split(r"[^a-z0-9]+", normalized_subject.split("@", 1)[0]) if token]
    if not subject_tokens:
        return subject

    with get_db() as db:
        cur = db.cursor(dictionary=True, buffered=True)
        cur.execute("SELECT email, name FROM instructors")
        for row in cur.fetchall():
            name_tokens = [token for token in re.split(r"[^a-z0-9]+", (row.get("name") or "").lower()) if token]
            if all(token in name_tokens for token in subject_tokens):
                return row.get("email") or subject

    return subject

# ── Auth helpers ─────────────────────────────────────────────────────────────

def _get_claims(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
) -> dict:
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail="Not authenticated")
    try:
        claims = decode_access_token(credentials.credentials)
        if claims.get("role") == "instructor" and claims.get("sub"):
            claims["sub"] = _resolve_instructor_subject(claims["sub"])
        return claims
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED,
                            detail=str(exc)) from exc


def _require_roles(*roles: str):
    """Returns a dependency that enforces one of the given roles."""
    def _dep(claims: dict = Depends(_get_claims)) -> dict:
        if claims.get("role") not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN,
                                detail="Insufficient permissions")
        return claims
    return _dep


# ── Utility: DB must be reachable ────────────────────────────────────────────

def _db_or_503():
    if not db_available():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database is not reachable. Make sure MySQL is running.",
        )


# ── /db/health ───────────────────────────────────────────────────────────────

@router.get("/health")
def db_health() -> dict:
    """Returns whether the smart_class MySQL database is reachable."""
    reachable = db_available()
    return {
        "database": "smart_class",
        "connected": reachable,
        "timestamp": datetime.utcnow().isoformat(),
    }


# ── /db/schedule ─────────────────────────────────────────────────────────────

@router.get("/schedule")
def get_full_schedule(
    _claims: dict = Depends(_require_roles("student", "instructor", "admin")),
) -> list[dict]:
    """Full weekly schedule with room and building fields."""
    _db_or_503()
    with get_db() as db:
        # Wrap the cursor in a 'with' block to guarantee cleanup
        with db.cursor(dictionary=True, buffered=True) as cur: 
            cur.execute("""SELECT sc.schedule_id,c.name AS class_name,sub.name AS subject,i.name AS instructor,r.name AS room,b.name AS building,r.capacity,sc.day,sc.time_slot
                FROM schedules sc
                JOIN classes     c   ON sc.class_id      = c.class_id
                JOIN subjects    sub ON sc.subject_id    = sub.subject_id
                JOIN instructors i   ON sc.instructor_id = i.instructor_id
                JOIN rooms       r   ON sc.room_id       = r.room_id
                JOIN buildings   b   ON r.building_id    = b.building_id
                ORDER BY sc.day, sc.time_slot""")
            return cur.fetchall()


@router.get("/schedule/today")
def get_today_schedule(
    _claims: dict = Depends(_require_roles("student", "instructor", "admin")),
) -> list[dict]:
    """Today's schedule entries only."""
    _db_or_503()
    day_name = datetime.now().strftime("%A")
    with get_db() as db:
        cur = db.cursor(buffered=True, dictionary=True)
        cur.execute("""SELECT sc.schedule_id,c.name AS class_name,sub.name AS subject,i.name AS instructor,r.name AS room,b.name AS building,r.capacity,sc.day,sc.time_slot
            FROM schedules sc
            JOIN classes     c   ON sc.class_id      = c.class_id
            JOIN subjects    sub ON sc.subject_id    = sub.subject_id
            JOIN instructors i   ON sc.instructor_id = i.instructor_id
            JOIN rooms       r   ON sc.room_id       = r.room_id
            JOIN buildings   b   ON r.building_id    = b.building_id
            WHERE sc.day = %s
            ORDER BY sc.time_slot
        """, (day_name,))
        return cur.fetchall()


# ── /db/rooms ────────────────────────────────────────────────────────────────

@router.get("/rooms")
def get_rooms(
    _claims: dict = Depends(_require_roles("instructor", "admin")),
) -> list[dict]:
    """All rooms with their latest status."""
    _db_or_503()
    with get_db() as db:
        cur = db.cursor(dictionary=True, buffered=True)
        cur.execute("""SELECT r.room_id, b.name AS building, r.name AS room,r.type, r.capacity,COALESCE(rs.status, 'empty') AS status,rs.timestamp AS last_updated,rs.notes
            FROM rooms r
            JOIN buildings b ON r.building_id = b.building_id
            LEFT JOIN roomstatus rs ON rs.status_id = (
                SELECT MAX(rs2.status_id) FROM roomstatus rs2
                WHERE rs2.room_id = r.room_id)
            ORDER BY b.name, r.name""")
        return cur.fetchall()


@router.get("/rooms/available")
def get_available_rooms(
    _claims: dict = Depends(_require_roles("student", "instructor", "admin")),
) -> list[dict]:
    """Rooms that are currently empty (v_empty_rooms view)."""
    _db_or_503()
    with get_db() as db:
        cur = db.cursor(dictionary=True, buffered=True)
        cur.execute("SELECT * FROM v_empty_rooms ORDER BY building, room")
        return cur.fetchall()


# ── /db/instructors ──────────────────────────────────────────────────────────

@router.get("/instructors")
def get_instructors(
    _claims: dict = Depends(_require_roles("student", "instructor", "admin")),
) -> list[dict]:
    """All instructors with name, email, and office room."""
    _db_or_503()
    with get_db() as db:
        # Our safe, buffered cursor
        with db.cursor(dictionary=True, buffered=True) as cur:
            cur.execute("""SELECT DISTINCT i.instructor_id, i.name, i.email,
                       b.name AS building, r.name AS office_room
                FROM instructors i
                LEFT JOIN rooms     r ON i.office_room_id = r.room_id
                LEFT JOIN buildings b ON i.building_id    = b.building_id
                ORDER BY i.name""")
            return cur.fetchall()


@router.get("/instructors/office-hours")
def get_office_hours(
    _claims: dict = Depends(_require_roles("student", "instructor", "admin")),
) -> list[dict]:
    """All instructor office hours (v_office_hours view)."""
    _db_or_503()
    with get_db() as db:
        # Our safe, buffered cursor
        with db.cursor(dictionary=True, buffered=True) as cur:
            cur.execute("SELECT * FROM v_office_hours ORDER BY instructor, day")
            return cur.fetchall()


# ── /db/instructor/me ────────────────────────────────────────────────────────

@router.get("/instructor/me/schedule")
def get_my_instructor_schedule(
    claims: dict = Depends(_require_roles("instructor")),
) -> list[dict]:
    """Schedule for the currently logged-in instructor (matched by email)."""
    _db_or_503()
    email = claims.get("sub", "")
    with get_db() as db:
        # Our safe, buffered cursor
        with db.cursor(dictionary=True, buffered=True) as cur:
            query = (
                "SELECT sc.schedule_id, c.name AS class_name, "
                "sub.name AS subject, sc.day, sc.time_slot, "
                "b.name AS building, r.name AS room, r.capacity "
                "FROM schedules sc "
                "JOIN classes c ON sc.class_id = c.class_id "
                "JOIN subjects sub ON sc.subject_id = sub.subject_id "
                "JOIN instructors i ON sc.instructor_id = i.instructor_id "
                "JOIN rooms r ON sc.room_id = r.room_id "
                "JOIN buildings b ON r.building_id = b.building_id "
                "WHERE i.email = %s "
                "ORDER BY sc.day, sc.time_slot"
            )
            cur.execute(query, (email,))
            return cur.fetchall()


@router.get("/instructor/{email}/schedule")
def get_instructor_schedule_by_email(
    email: str,
    _claims: dict = Depends(_require_roles("student", "instructor", "admin")),
) -> list[dict]:
    """Schedule for a specific instructor email."""
    _db_or_503()
    with get_db() as db:
        cur = db.cursor(dictionary=True, buffered=True)
        cur.execute(
            """ SELECT sc.schedule_id, c.name AS class_name,
                   sub.name AS subject, sc.day, sc.time_slot,
                   b.name AS building, r.name AS room, r.capacity
            FROM schedules sc
            JOIN classes     c   ON sc.class_id      = c.class_id
            JOIN subjects    sub ON sc.subject_id    = sub.subject_id
            JOIN instructors i   ON sc.instructor_id = i.instructor_id
            JOIN rooms       r   ON sc.room_id       = r.room_id
            JOIN buildings   b   ON r.building_id    = b.building_id
            WHERE LOWER(i.email) = LOWER(%s)
            ORDER BY sc.day, sc.time_slot""",
            (email,),
        )
        return cur.fetchall()


@router.get("/instructor/{email}/full-schedule")
def get_instructor_full_schedule(
    email: str,
    _claims: dict = Depends(_require_roles("student", "instructor", "admin")),
) -> dict:
    """Full schedule for instructor: classes + office hours + availability slots."""
    _db_or_503()
    with get_db() as db:
        cur = db.cursor(dictionary=True, buffered=True)
        
        # Classes
        cur.execute(
            """ SELECT sc.schedule_id, c.name AS class_name,
                   sub.name AS subject, sc.day, sc.time_slot,
                   b.name AS building, r.name AS room, r.capacity,
                   'class' AS type
            FROM schedules sc
            JOIN classes     c   ON sc.class_id      = c.class_id
            JOIN subjects    sub ON sc.subject_id    = sub.subject_id
            JOIN instructors i   ON sc.instructor_id = i.instructor_id
            JOIN rooms       r   ON sc.room_id       = r.room_id
            JOIN buildings   b   ON r.building_id    = b.building_id
            WHERE LOWER(i.email) = LOWER(%s)
            ORDER BY sc.day, sc.time_slot""",
            (email,),
        )
        classes = cur.fetchall()
        
        # Office hours
        cur.execute(
            """ SELECT oh.day, oh.time_slot, r.name AS room, b.name AS building,
                   'office_hours' AS type
            FROM officehours oh
            JOIN instructors i ON oh.instructor_id = i.instructor_id
            LEFT JOIN rooms r ON oh.room_id = r.room_id
            LEFT JOIN buildings b ON r.building_id = b.building_id
            WHERE LOWER(i.email) = LOWER(%s)
            ORDER BY oh.day, oh.time_slot""",
            (email,),
        )
        office_hours = cur.fetchall()
        
        # Availability slots
        cur.execute(
            """ SELECT ia.day, ia.time_slot, ia.status, 'availability' AS type
            FROM instructor_availability ia
            JOIN instructors i ON ia.instructor_id = i.instructor_id
            WHERE LOWER(i.email) = LOWER(%s)
            ORDER BY ia.day, ia.time_slot""",
            (email,),
        )
        availability = cur.fetchall()
        
        return {
            "classes": classes,
            "office_hours": office_hours,
            "availability": availability
        }


@router.get("/instructor/me/availability")
def get_my_instructor_availability(
    claims: dict = Depends(_require_roles("instructor")),
) -> list[AvailabilitySlot]:
    """Availability slots for the logged-in instructor."""
    _db_or_503()
    email = claims.get("sub", "")
    with get_db() as db:
        # Our safe, buffered cursor
        with db.cursor(dictionary=True, buffered=True) as cur:
            query = (
                "SELECT a.day, a.time_slot, a.status "
                "FROM instructor_availability a "
                "JOIN instructors i ON a.instructor_id = i.instructor_id "
                "WHERE i.email = %s "
                "ORDER BY a.day, a.time_slot"
            )
            cur.execute(query, (email,))
            return cur.fetchall()


@router.get("/instructor/{email}/availability")
def get_instructor_availability_by_email(
    email: str,
    _claims: dict = Depends(_require_roles("admin")),
) -> list[AvailabilitySlot]:
    """Availability slots for a specific instructor email (admin only)."""
    _db_or_503()
    with get_db() as db:
        cur = db.cursor(dictionary=True, buffered=True)
        cur.execute(
            """SELECT a.day, a.time_slot, a.status
            FROM instructor_availability a
            JOIN instructors i ON a.instructor_id = i.instructor_id
            WHERE LOWER(i.email) = LOWER(%s)
            ORDER BY a.day, a.time_slot""",
            (email,),
        )
        return cur.fetchall()


@router.put("/instructor/me/availability")
def upsert_my_instructor_availability(
    payload: AvailabilityUpsertRequest,
    claims: dict = Depends(_require_roles("instructor")),
) -> dict:
    """Create or update a single availability slot for the logged-in instructor."""
    _db_or_503()
    email = claims.get("sub", "")
    with get_db() as db:
        cur = db.cursor(dictionary=True, buffered=True)
        cur.execute("SELECT instructor_id FROM instructors WHERE email = %s", (email,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Instructor not found")
        instructor_id = row["instructor_id"]

        requested_range = _parse_time_range_minutes(payload.time_slot)
        if requested_range is None:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Invalid time_slot format. Expected e.g. '08:30-09:20'.",
            )

        # Disallow availability updates that overlap the instructor's scheduled classes.
        cur.execute(
            """SELECT time_slot
            FROM schedules
            WHERE instructor_id = %s AND day = %s""",
            (instructor_id, payload.day),
        )
        for sched in cur.fetchall():
            sched_range = _parse_time_range_minutes(sched.get("time_slot", ""))
            if sched_range and _ranges_overlap(requested_range, sched_range):
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Cannot change availability during a scheduled class.",
                )

        cur.execute(
            """INSERT INTO instructor_availability (instructor_id, day, time_slot, status)
            VALUES (%s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE status = VALUES(status), updated_at = CURRENT_TIMESTAMP""",
            (instructor_id, payload.day, payload.time_slot, payload.status),
        )
        db.commit()
        return {"ok": True}


@router.get("/instructor/me/students")
def get_my_students(
    claims: dict = Depends(_require_roles("instructor")),
) -> list[dict]:
    """All students enrolled in classes taught by the current instructor."""
    _db_or_503()
    email = claims.get("sub", "")
    with get_db() as db:
        cur = db.cursor(dictionary=True, buffered=True)
        cur.execute(""" SELECT DISTINCT
                   s.student_id, s.name, s.email, s.program,
                   c.name AS class_name
            FROM schedules sc
            JOIN instructors i ON sc.instructor_id = i.instructor_id
            JOIN classes     c ON sc.class_id      = c.class_id
            JOIN enrollments e ON e.class_id       = c.class_id
            JOIN students    s ON e.student_id     = s.student_id
            WHERE i.email = %s
            ORDER BY c.name, s.name""", (email,))
        return cur.fetchall()


@router.get("/instructor/{email}/students")
def get_instructor_students_by_email(
    email: str,
    _claims: dict = Depends(_require_roles("admin")),
) -> list[dict]:
    """All students taught by a specific instructor email (admin only)."""
    _db_or_503()
    with get_db() as db:
        cur = db.cursor(dictionary=True, buffered=True)
        cur.execute(
            """ SELECT DISTINCT
                   s.student_id, s.name, s.email, s.program,
                   c.name AS class_name
            FROM schedules sc
            JOIN instructors i ON sc.instructor_id = i.instructor_id
            JOIN classes     c ON sc.class_id      = c.class_id
            JOIN enrollments e ON e.class_id       = c.class_id
            JOIN students    s ON e.student_id     = s.student_id
            WHERE LOWER(i.email) = LOWER(%s)
            ORDER BY c.name, s.name
            """,
            (email,),
        )
        return cur.fetchall()


@router.get("/instructor/me/issues")
def get_my_issues(
    claims: dict = Depends(_require_roles("instructor")),
) -> list[dict]:
    """All issues reported for classes taught by the current instructor."""
    _db_or_503()
    email = claims.get("sub", "")
    with get_db() as db:
        cur = db.cursor(dictionary=True, buffered=True)
        cur.execute(""" SELECT
                ci.issue_id,
                ci.issue_type,
                ci.severity,
                ci.comment,
                ci.status,
                ci.reported_date,
                ci.admin_response,
                ci.resolved_at,
                sc.day,
                sc.time_slot,
                c.name AS class_name,
                r.name AS room,
                b.name AS building
            FROM classissues ci
            JOIN schedules   sc ON ci.schedule_id   = sc.schedule_id
            JOIN classes     c  ON sc.class_id      = c.class_id
            JOIN rooms       r  ON sc.room_id       = r.room_id
            JOIN buildings   b  ON r.building_id    = b.building_id
            JOIN instructors i  ON sc.instructor_id = i.instructor_id
            WHERE i.email = %s
            ORDER BY ci.reported_date DESC, ci.issue_id DESC
        """, (email,))
        return cur.fetchall()


@router.post("/instructor/me/issues", status_code=status.HTTP_201_CREATED)
def create_issue(
    payload: IssueCreateRequest,
    claims: dict = Depends(_require_roles("instructor")),
) -> dict:
    """Report one or more issues for a schedule entry owned by the instructor."""
    _db_or_503()
    email = claims.get("sub", "")
    with get_db() as db:
        cur = db.cursor(dictionary=True, buffered=True)
        cur.execute("""
            SELECT sc.schedule_id
            FROM schedules sc
            JOIN instructors i ON sc.instructor_id = i.instructor_id
            WHERE sc.schedule_id = %s AND i.email = %s
        """, (payload.schedule_id, email))
        if not cur.fetchone():
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Schedule does not belong to current instructor",
            )

        issue_ids: list[int] = []
        for issue in payload.issues:
            issue_type = issue.strip()
            if not issue_type:
                continue
            issue_type = issue_type[:50]
            cur.execute(
                """INSERT INTO classissues
                    (schedule_id, issue_type, reported_date, status, severity, comment)
                VALUES (%s, %s, CURDATE(), 'open', %s, %s)""",
                (payload.schedule_id, issue_type, payload.severity, payload.comment),
            )
            issue_ids.append(cur.lastrowid)

        if not issue_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="At least one issue must be provided",
            )

        db.commit()
        return {"issue_ids": issue_ids, "count": len(issue_ids)}


# ── /db/students ─────────────────────────────────────────────────────────────

@router.get("/students")
def get_students(
    _claims: dict = Depends(_require_roles("admin")),
) -> list[dict]:
    """All students — admin only."""
    _db_or_503()
    with get_db() as db:
        cur = db.cursor(dictionary=True, buffered=True)
        cur.execute(
            "SELECT student_id, name, email, program FROM students ORDER BY name"
        )
        return cur.fetchall()


# ── /db/student/me ───────────────────────────────────────────────────────────

@router.get("/student/me/profile")
def get_my_student_profile(
    claims: dict = Depends(_require_roles("student")),
) -> dict:
    """Profile for the currently logged-in student (name, program, GPA)."""
    _db_or_503()
    email = claims.get("sub", "")
    with get_db() as db:
        cur = db.cursor(dictionary=True, buffered=True)
        cur.execute(
            "SELECT student_id, name, email, program, NULL AS cgpa FROM students WHERE email = %s LIMIT 1",
            (email,),
        )
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Student not found")
        return row


@router.get("/student/me/schedule")
def get_my_student_schedule(
    claims: dict = Depends(_require_roles("student")),
) -> list[dict]:
    """Weekly timetable for the logged-in student (from enrollments + schedules)."""
    _db_or_503()
    email = claims.get("sub", "")
    with get_db() as db:
        cur = db.cursor(dictionary=True, buffered=True)
        cur.execute("""SELECT c.name AS class_name,sub.name AS subject,sc.day,sc.time_slot,r.name AS room,b.name AS building,i.name AS instructor,i.email AS instructor_email
            FROM enrollments e
            JOIN students    s   ON e.student_id   = s.student_id
            JOIN classes     c   ON e.class_id     = c.class_id
            JOIN schedules   sc  ON c.class_id     = sc.class_id
            JOIN subjects    sub ON sc.subject_id  = sub.subject_id
            JOIN rooms       r   ON sc.room_id     = r.room_id
            JOIN buildings   b   ON r.building_id  = b.building_id
            JOIN instructors i   ON sc.instructor_id = i.instructor_id
            WHERE s.email = %s
            ORDER BY FIELD(sc.day,'Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'), sc.time_slot """, (email,))
        return cur.fetchall()


@router.get("/student/me/courses")
def get_my_student_courses(
    claims: dict = Depends(_require_roles("student")),
) -> list[dict]:
    """Enrolled courses for the logged-in student."""
    _db_or_503()
    email = claims.get("sub", "")
    with get_db() as db:
        cur = db.cursor(dictionary=True, buffered=True)
        cur.execute("""SELECT DISTINCT
                   c.class_id, c.name AS class_name,
                   sub.name AS subject,
                   i.name AS instructor,
                   i.email AS instructor_email,
                   r.name AS office_room,
                   b_inst.name AS instructor_building
            FROM enrollments e
            JOIN students    s      ON e.student_id    = s.student_id
            JOIN classes     c      ON e.class_id      = c.class_id
            JOIN schedules   sc     ON c.class_id      = sc.class_id
            JOIN subjects    sub    ON sc.subject_id   = sub.subject_id
            JOIN instructors i      ON sc.instructor_id = i.instructor_id
            LEFT JOIN rooms r          ON i.office_room_id = r.room_id
            LEFT JOIN buildings b_inst ON i.building_id  = b_inst.building_id
            WHERE s.email = %s
            ORDER BY c.name
        """, (email,))
        return cur.fetchall()


@router.get("/student/me/instructors")
def get_my_student_instructors(
    claims: dict = Depends(_require_roles("student")),
) -> list[dict]:
    """Instructors teaching the logged-in student, with office hours."""
    _db_or_503()
    email = claims.get("sub", "")
    with get_db() as db:
        cur = db.cursor(dictionary=True, buffered=True)
        cur.execute("""SELECT DISTINCT
                   i.instructor_id, i.name, i.email,
                   r.name AS office_room,
                   b.name AS building,
                   NULL AS department
            FROM enrollments e
            JOIN students    s   ON e.student_id    = s.student_id
            JOIN classes     c   ON e.class_id      = c.class_id
            JOIN schedules   sc  ON c.class_id      = sc.class_id
            JOIN instructors i   ON sc.instructor_id = i.instructor_id
            LEFT JOIN rooms r      ON i.office_room_id = r.room_id
            LEFT JOIN buildings   b    ON i.building_id    = b.building_id
            WHERE s.email = %s
            ORDER BY i.name
        """, (email,))
        instructors = cur.fetchall()

        # Attach office hours for each instructor
        for inst in instructors:
            cur.execute("""SELECT oh.day, oh.time_slot, r.name AS room
                FROM officehours oh
                JOIN rooms r ON oh.room_id = r.room_id
                WHERE oh.instructor_id = %s
                ORDER BY FIELD(oh.day,'Monday','Tuesday','Wednesday','Thursday','Friday','Saturday')
            """, (inst["instructor_id"],))
            inst["office_hours"] = cur.fetchall()

        return instructors


# ── /db/exams ────────────────────────────────────────────────────────────────

@router.get("/exams")
def get_exams(
    _claims: dict = Depends(_require_roles("student", "instructor", "admin")),
) -> list[dict]:
    """All exam slots (admin only)."""
    _db_or_503()
    with get_db() as db:
        cur = db.cursor(dictionary=True, buffered=True)
        cur.execute("""SELECT exam_id, course, instructor, exam_date, time_slot,
                   hall, enrolled, exam_type
            FROM exams ORDER BY exam_date, time_slot """)
        return cur.fetchall()

@router.get("/instructor/me/exams")
def get_my_instructor_exams(
    claims: dict = Depends(_require_roles("instructor")),
) -> list[dict]:
    """Exams specifically for the courses taught by the logged-in instructor."""
    _db_or_503()
    email = claims.get("sub", "")
    with get_db() as db:
        cur = db.cursor(dictionary=True, buffered=True)
        # Step 1: Find the instructor's name based on their login email
        cur.execute("SELECT name FROM instructors WHERE email = %s", (email,))
        row = cur.fetchone()
        if not row:
            return []
        
        # Step 2: Fetch only exams assigned to that specific instructor name
        cur.execute("""
            SELECT exam_id, course, instructor, exam_date, time_slot, hall, enrolled, exam_type
            FROM exams 
            WHERE instructor = %s 
            ORDER BY exam_date, time_slot
        """, (row["name"],))
        return cur.fetchall()


@router.get("/student/me/exams")
def get_my_student_exams(
    claims: dict = Depends(_require_roles("student")),
) -> list[dict]:
    """Exams specifically for the courses the logged-in student is enrolled in."""
    _db_or_503()
    email = claims.get("sub", "")
    with get_db() as db:
        cur = db.cursor(dictionary=True, buffered=True)
        # Match the exam's course name to the classes the student is enrolled in
        cur.execute("""
            SELECT ex.exam_id, ex.course, ex.instructor, ex.exam_date, ex.time_slot, ex.hall, ex.enrolled, ex.exam_type
            FROM exams ex
            JOIN classes c ON ex.course = c.name
            JOIN enrollments en ON c.class_id = en.class_id
            JOIN students s ON en.student_id = s.student_id
            WHERE s.email = %s
            ORDER BY ex.exam_date, ex.time_slot
        """, (email,))
        return cur.fetchall()
    

@router.post("/exams", status_code=status.HTTP_201_CREATED)
def create_exam(
    payload: dict,
    _claims: dict = Depends(_require_roles("admin")),
) -> dict:
    """Create an exam slot (admin only)."""
    _db_or_503()
    required = ["course", "instructor", "exam_date", "time_slot", "hall", "enrolled", "exam_type"]
    for field in required:
        if field not in payload:
            raise HTTPException(status_code=400, detail=f"Missing field: {field}")
    with get_db() as db:
        cur = db.cursor()
        cur.execute("""INSERT INTO exams (course, instructor, exam_date, time_slot, hall, enrolled, exam_type)
            VALUES (%s, %s, %s, %s, %s, %s, %s) """, (payload["course"], payload["instructor"], payload["exam_date"],
              payload["time_slot"], payload["hall"], payload["enrolled"], payload["exam_type"]))
        db.commit()
        return {"exam_id": cur.lastrowid, "status": "created"}


@router.get("/students/enrollment")
def get_enrollment(
    _claims: dict = Depends(_require_roles("instructor", "admin")),
) -> list[dict]:
    """Class enrollment counts vs room capacity (v_class_enrollment)."""
    _db_or_503()
    with get_db() as db:
        cur = db.cursor(dictionary=True, buffered=True)
        cur.execute("SELECT * FROM v_class_enrollment ORDER BY class_name")
        return cur.fetchall()


# ── /db/issues ───────────────────────────────────────────────────────────────

@router.get("/issues")
def get_open_issues(
    _claims: dict = Depends(_require_roles("instructor", "admin")),
) -> list[dict]:
    """All open class/room issues (v_open_issues view)."""
    _db_or_503()
    with get_db() as db:
        cur = db.cursor(dictionary=True, buffered=True)
        cur.execute("SELECT * FROM v_open_issues ORDER BY reported_date DESC")
        return cur.fetchall()


@router.patch("/issues/{issue_id}/resolve")
def resolve_issue(
    issue_id: int,
    payload: IssueResolveRequest,
    _claims: dict = Depends(_require_roles("admin")),
) -> dict:
    """Mark an issue as fixed and store the admin response."""
    _db_or_503()
    with get_db() as db:
        cur = db.cursor()
        cur.execute(
            """UPDATE classissues
            SET status = 'fixed', admin_response = %s, resolved_at = NOW()
            WHERE issue_id = %s """,
            (payload.admin_response, issue_id),
        )
        if cur.rowcount == 0:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND,
                                detail="Issue not found")
        db.commit()
        return {"issue_id": issue_id, "status": "fixed"}


# ── /db/equipment/faulty ─────────────────────────────────────────────────────

@router.get("/equipment/faulty")
def get_faulty_equipment(
    _claims: dict = Depends(_require_roles("instructor", "admin")),
) -> list[dict]:
    """All faulty equipment with building/room context (v_faulty_equipment)."""
    _db_or_503()
    with get_db() as db:
        cur = db.cursor(dictionary=True, buffered=True)
        cur.execute("SELECT * FROM v_faulty_equipment ORDER BY building, room")
        return cur.fetchall()


# ── /db/complaints ───────────────────────────────────────────────────────────

@router.get("/instructor/me/complaints")
def get_my_complaints(
    claims: dict = Depends(_require_roles("instructor")),
) -> list[dict]:
    """All complaints submitted by the logged-in instructor."""
    _db_or_503()
    email = claims.get("sub", "")
    with get_db() as db:
        cur = db.cursor(dictionary=True, buffered=True)
        cur.execute(""" SELECT c.complaint_id, c.category, c.subject, c.message,
                   c.priority, c.status, c.admin_response,
                   c.created_at, c.updated_at, c.resolved_at,
                   i.name AS instructor_name
            FROM complaints c
            JOIN instructors i ON c.instructor_id = i.instructor_id
            WHERE i.email = %s
            ORDER BY c.created_at DESC """, (email,))
        rows = cur.fetchall()
        # Serialize datetime to string
        for row in rows:
            for key in ('created_at', 'updated_at', 'resolved_at'):
                if row.get(key) and hasattr(row[key], 'isoformat'):
                    row[key] = row[key].strftime('%Y-%m-%d %H:%M')
        return rows


@router.post("/instructor/me/complaints", status_code=status.HTTP_201_CREATED)
def create_complaint(
    payload: ComplaintCreateRequest,
    claims: dict = Depends(_require_roles("instructor")),
) -> dict:
    """Submit a new complaint to the admin."""
    _db_or_503()
    email = claims.get("sub", "")
    with get_db() as db:
        cur = db.cursor(dictionary=True, buffered=True)
        cur.execute("SELECT instructor_id FROM instructors WHERE email = %s", (email,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Instructor not found")
        cur.execute(
            """ INSERT INTO complaints (instructor_id, category, subject, message, priority)
            VALUES (%s, %s, %s, %s, %s) """,
            (row["instructor_id"], payload.category, payload.subject,
             payload.message, payload.priority),
        )
        db.commit()
        return {"complaint_id": cur.lastrowid, "status": "created"}


@router.get("/complaints")
def get_all_complaints(
    _claims: dict = Depends(_require_roles("admin")),
) -> list[dict]:
    """All complaints from all instructors — admin only."""
    _db_or_503()
    with get_db() as db:
        cur = db.cursor(dictionary=True, buffered=True)
        cur.execute(""" SELECT c.complaint_id, c.category, c.subject, c.message,
                   c.priority, c.status, c.admin_response,
                   c.created_at, c.updated_at, c.resolved_at,
                   i.name AS instructor_name, i.email AS instructor_email
            FROM complaints c
            JOIN instructors i ON c.instructor_id = i.instructor_id
            ORDER BY
                FIELD(c.status, 'open', 'in_progress', 'resolved', 'closed'),
                FIELD(c.priority, 'high', 'medium', 'low'),
                c.created_at DESC """)
        rows = cur.fetchall()
        for row in rows:
            for key in ('created_at', 'updated_at', 'resolved_at'):
                if row.get(key) and hasattr(row[key], 'isoformat'):
                    row[key] = row[key].strftime('%Y-%m-%d %H:%M')
        return rows


@router.patch("/complaints/{complaint_id}/respond")
def respond_to_complaint(
    complaint_id: int,
    payload: ComplaintRespondRequest,
    _claims: dict = Depends(_require_roles("admin")),
) -> dict:
    """Respond to a complaint and update its status."""
    _db_or_503()
    with get_db() as db:
        cur = db.cursor()
        resolved_clause = ", resolved_at = NOW()" if payload.new_status in ('resolved', 'closed') else ""
        cur.execute(
            f"""UPDATE complaints
            SET admin_response = %s, status = %s{resolved_clause}
            WHERE complaint_id = %s """,
            (payload.admin_response, payload.new_status, complaint_id),
        )
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Complaint not found")
        db.commit()
        return {"complaint_id": complaint_id, "status": payload.new_status}
