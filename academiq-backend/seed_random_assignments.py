"""seed_random_assignments.py

Rebuild demo course assignments so the database matches the requested layout:
- Every class in the database is used.
- Each class gets 1 or 2 teachers.
- Each class gets 2 weekday meetings per week.
- Each class has 23-38 enrolled students.
- Each student is enrolled in 2-6 classes.

If the current student pool is too small to satisfy those constraints, the
script generates additional demo students so the database remains feasible.

Usage (from backend/):
    python seed_random_assignments.py
    python seed_random_assignments.py --seed 123
"""

from __future__ import annotations

import argparse
import random
from dataclasses import dataclass
from collections import defaultdict

import mysql.connector

from config import settings


DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
GRID_TIMES = [
    "08:30 - 9:20",
    "09:30 - 10:20",
    "10:30 - 11:20",
    "11:30 - 12:20",
    "12:30 - 13:20",
    "13:30 - 14:20",
    "14:30 - 15:20",
    "15:30 - 16:20",
    "16:30 - 17:20",
]

PROGRAMS = [
    "Computer Engineering",
    "Civil Engineering",
    "Electrical and Electronics Engineering",
    "Industrial Engineering",
    "Mechanical Engineering",
    "Bioengineering",
    "Energy Systems Engineering",
    "Environmental Engineering",
    "Information Systems Engineering",
    "Petrol Oil and Gas Engineering",
    "Medicine",
    "Dentistry",
    "Education",
]

MIN_CLASS_SIZE = 23
MAX_CLASS_SIZE = 38
TARGET_CLASS_AVERAGE = 26.5
MIN_WEEKLY_SESSIONS = 2
MAX_WEEKLY_SESSIONS = 2


@dataclass
class SeedSummary:
    instructors: int
    students: int
    selected_classes: int
    enrollments: int


def _connect():
    return mysql.connector.connect(
        host=settings.db_host,
        port=settings.db_port,
        user=settings.db_user,
        password=settings.db_pass,
        database=settings.db_name,
    )


def _fetch_ids(cur, table: str, id_col: str) -> list[int]:
    cur.execute(f"SELECT {id_col} FROM {table} ORDER BY {id_col}")
    return [row[0] for row in cur.fetchall()]


def _ensure_student_pool(cur, minimum_students: int) -> int:
    """Add generated demo students until the database has the requested count."""
    cur.execute("SELECT COUNT(*) FROM students")
    current_count = int(cur.fetchone()[0])
    if current_count >= minimum_students:
        return current_count

    next_index = 1
    while current_count < minimum_students:
        name = f"Generated Student {next_index:03d}"
        email = f"generated.student{next_index:03d}@ciu.edu.tr"
        program = random.choice(PROGRAMS)
        cur.execute(
            "INSERT IGNORE INTO students (name, email, program) VALUES (%s, %s, %s)",
            (name, email, program),
        )
        if cur.rowcount > 0:
            current_count += 1
        next_index += 1

    return current_count


def _build_target_class_sizes(class_ids: list[int]) -> dict[int, int]:
    target_total = int(round(len(class_ids) * TARGET_CLASS_AVERAGE))
    target_total = max(MIN_CLASS_SIZE * len(class_ids), target_total)
    target_total = min(MAX_CLASS_SIZE * len(class_ids), target_total)

    desired = {cid: MIN_CLASS_SIZE for cid in class_ids}
    remaining = target_total - (MIN_CLASS_SIZE * len(class_ids))

    growable = class_ids[:]
    while remaining > 0 and growable:
        class_id = random.choice(growable)
        desired[class_id] += 1
        remaining -= 1
        if desired[class_id] >= MAX_CLASS_SIZE:
            growable.remove(class_id)

    return desired


def _assign_teachers(class_ids: list[int], instructor_ids: list[int]) -> dict[int, list[int]]:
    """Return class_id -> [teacher_ids]. Each class gets one or two teachers."""
    shuffled_instructors = instructor_ids[:]
    random.shuffle(shuffled_instructors)

    teacher_counts = {iid: 0 for iid in instructor_ids}
    assignments: dict[int, list[int]] = {}

    for index, class_id in enumerate(class_ids):
        instructor_id = shuffled_instructors[index % len(shuffled_instructors)]
        assignments[class_id] = [instructor_id]
        teacher_counts[instructor_id] += 1

    dual_teacher_classes = set(random.sample(class_ids, k=max(1, len(class_ids) // 2)))
    for class_id in dual_teacher_classes:
        primary_teacher = assignments[class_id][0]
        candidates = [iid for iid in instructor_ids if iid != primary_teacher]
        min_load = min(teacher_counts[iid] for iid in candidates)
        least_loaded = [iid for iid in candidates if teacher_counts[iid] == min_load]
        co_teacher = random.choice(least_loaded)
        assignments[class_id].append(co_teacher)
        teacher_counts[co_teacher] += 1

    return assignments


def _find_free_slot(
    cur,
    used_room_slots: set[tuple[int, str, str]],
    used_instructor_slots: set[tuple[int, str, str]],
    preferred_room_id: int | None,
    instructor_id: int,
) -> tuple[int, str, str]:
    room_ids = _fetch_ids(cur, "rooms", "room_id")
    room_pool = [preferred_room_id] if preferred_room_id else []
    room_pool.extend(room_id for room_id in room_ids if room_id not in room_pool)

    for _ in range(2000):
        room_id = random.choice(room_pool)
        day = random.choice(DAYS)
        time_slot = random.choice(GRID_TIMES)
        room_key = (room_id, day, time_slot)
        instructor_key = (instructor_id, day, time_slot)
        if room_key in used_room_slots or instructor_key in used_instructor_slots:
            continue
        used_room_slots.add(room_key)
        used_instructor_slots.add(instructor_key)
        return room_id, day, time_slot

    raise RuntimeError(f"Unable to find a free slot for instructor_id={instructor_id}")


def seed(seed_value: int | None = None) -> SeedSummary:
    if seed_value is not None:
        random.seed(seed_value)

    conn = _connect()
    conn.autocommit = False
    cur = conn.cursor()

    try:
        # Ensure class_groups exists (safe to run repeatedly)
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS class_groups (
                group_id   INT NOT NULL AUTO_INCREMENT,
                class_id   INT NOT NULL,
                group_no   INT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (group_id),
                UNIQUE KEY uniq_class_group (class_id, group_no),
                FOREIGN KEY (class_id) REFERENCES classes(class_id)
            )
            """
        )

        instructor_ids = _fetch_ids(cur, "instructors", "instructor_id")
        student_ids = _fetch_ids(cur, "students", "student_id")
        class_ids_all = _fetch_ids(cur, "classes", "class_id")

        num_instructors = len(instructor_ids)
        num_students = len(student_ids)
        num_classes = len(class_ids_all)

        if num_instructors == 0 or num_students == 0 or num_classes == 0:
            raise RuntimeError("Missing required base data (instructors/students/classes)")

        class_sizes = _build_target_class_sizes(class_ids_all)
        target_total_enrollments = sum(class_sizes.values())

        minimum_students = (target_total_enrollments + 5) // 6
        num_students = _ensure_student_pool(cur, minimum_students)
        student_ids = _fetch_ids(cur, "students", "student_id")

        teacher_assignments = _assign_teachers(class_ids_all, instructor_ids)

        cur.execute("DELETE FROM class_groups")
        for cid in class_ids_all:
            group_count = random.randint(1, 3)
            for group_no in range(1, group_count + 1):
                cur.execute(
                    "INSERT INTO class_groups (class_id, group_no) VALUES (%s, %s)",
                    (cid, group_no),
                )

        cur.execute("DELETE FROM enrollments")

        rosters: dict[int, set[int]] = {cid: set() for cid in class_ids_all}
        student_loads: dict[int, int] = {sid: 0 for sid in student_ids}

        for sid in student_ids:
            chosen: set[int] = set()
            for _ in range(2):
                attempts = 0
                while attempts < 500:
                    cid = random.choice(class_ids_all)
                    if cid in chosen:
                        attempts += 1
                        continue
                    if len(rosters[cid]) >= class_sizes[cid]:
                        attempts += 1
                        continue
                    rosters[cid].add(sid)
                    student_loads[sid] += 1
                    chosen.add(cid)
                    break
                else:
                    raise RuntimeError("Unable to allocate minimum 2 classes per student")

        for cid in class_ids_all:
            desired_size = class_sizes[cid]
            while len(rosters[cid]) < desired_size:
                candidates = [
                    sid
                    for sid in student_ids
                    if sid not in rosters[cid] and student_loads[sid] < 6
                ]
                if not candidates:
                    raise RuntimeError(
                        "Cannot fill classes without exceeding 6 courses per student. "
                        f"class_id={cid} desired={desired_size} current={len(rosters[cid])}"
                    )

                candidates.sort(key=lambda s: (student_loads[s], s))
                slice_size = max(8, len(candidates) // 4)
                pick = random.choice(candidates[:slice_size])
                rosters[cid].add(pick)
                student_loads[pick] += 1

        min_load = min(student_loads.values())
        max_load = max(student_loads.values())
        if min_load < 2 or max_load > 6:
            raise RuntimeError(f"Student load constraint violated: min={min_load}, max={max_load}")

        for cid in class_ids_all:
            size = len(rosters[cid])
            if size < MIN_CLASS_SIZE or size > MAX_CLASS_SIZE:
                raise RuntimeError(f"Class size constraint violated for class_id={cid}: {size}")

        enrollment_rows = 0
        for cid, members in rosters.items():
            for sid in members:
                cur.execute(
                    "INSERT INTO enrollments (student_id, class_id, enrollment_date) VALUES (%s, %s, CURDATE())",
                    (sid, cid),
                )
                enrollment_rows += 1

        cur.execute("SELECT schedule_id, class_id FROM schedules ORDER BY class_id, schedule_id")
        schedule_rows = cur.fetchall()
        schedule_ids_by_class: dict[int, list[int]] = defaultdict(list)
        for schedule_id, class_id in schedule_rows:
            schedule_ids_by_class[class_id].append(schedule_id)

        used_room_slots: set[tuple[int, str, str]] = set()
        used_instructor_slots: set[tuple[int, str, str]] = set()

        for cid in class_ids_all:
            schedule_ids = schedule_ids_by_class.get(cid, [])
            if len(schedule_ids) < MIN_WEEKLY_SESSIONS:
                missing = MIN_WEEKLY_SESSIONS - len(schedule_ids)
                for _ in range(missing):
                    cur.execute(
                        "INSERT INTO schedules (class_id, subject_id, instructor_id, room_id, day, time_slot) VALUES (NULL, NULL, NULL, NULL, NULL, NULL)"
                    )
                    schedule_ids.append(cur.lastrowid)

            schedule_ids = schedule_ids[:MAX_WEEKLY_SESSIONS]
            assigned_teachers = teacher_assignments[cid]
            if len(assigned_teachers) == 1:
                session_teachers = [assigned_teachers[0], assigned_teachers[0]]
            else:
                session_teachers = [assigned_teachers[0], assigned_teachers[1]]

            cur.execute("SELECT subject_id FROM subjects ORDER BY RAND() LIMIT 1")
            subject_id = cur.fetchone()[0]
            cur.execute("SELECT home_room_id FROM classes WHERE class_id = %s", (cid,))
            row = cur.fetchone()
            preferred_room_id = row[0] if row else None

            for session_index, schedule_id in enumerate(schedule_ids):
                instructor_id = session_teachers[session_index % len(session_teachers)]
                room_id, day, time_slot = _find_free_slot(
                    cur,
                    used_room_slots,
                    used_instructor_slots,
                    preferred_room_id,
                    instructor_id,
                )
                cur.execute(
                    """
                    UPDATE schedules
                    SET class_id = %s, subject_id = %s, instructor_id = %s,
                        room_id = %s, day = %s, time_slot = %s
                    WHERE schedule_id = %s
                    """,
                    (cid, subject_id, instructor_id, room_id, day, time_slot, schedule_id),
                )

        conn.commit()
        return SeedSummary(
            instructors=num_instructors,
            students=num_students,
            selected_classes=num_classes,
            enrollments=enrollment_rows,
        )

    except Exception:
        conn.rollback()
        raise
    finally:
        cur.close()
        conn.close()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--seed", type=int, default=None, help="Random seed for reproducibility")
    args = parser.parse_args()

    summary = seed(seed_value=args.seed)
    print(
        "Seed complete: "
        f"instructors={summary.instructors}, students={summary.students}, "
        f"classes_assigned={summary.selected_classes}, enrollments={summary.enrollments}"
    )


if __name__ == "__main__":
    main()
