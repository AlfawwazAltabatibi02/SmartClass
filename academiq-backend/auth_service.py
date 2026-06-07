from dataclasses import dataclass
import hashlib
import re

from database import db_available, get_db
from security import create_access_token, hash_password
from security import verify_password


@dataclass
class UserRecord:
    identifier: str
    role: str
    display_name: str
    password_hash: str


@dataclass
class AuthResult:
    user: UserRecord | None
    error_code: str | None


# Temporary login users for milestone 1 (replace with MySQL later).
_TEMP_USERS: dict[tuple[str, str], UserRecord] = {}


def _hash_password_sha256(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


def _verify_password_hash(plain_password: str, stored_hash: str) -> bool:
    if stored_hash.startswith("$pbkdf2-sha256$"):
        return verify_password(plain_password, stored_hash)
    return _hash_password_sha256(plain_password) == stored_hash


def _fetch_display_name(role: str, identifier: str) -> str:
    if role == "admin":
        return "Admin"

    identifier = _resolve_canonical_identifier(role, identifier)
    table = "students" if role == "student" else "instructors"
    with get_db() as db:
        cur = db.cursor(dictionary=True)
        cur.execute(
            f"SELECT name FROM {table} WHERE LOWER(email) = LOWER(%s) LIMIT 1",
            (identifier,),
        )
        row = cur.fetchone()
        if row and row.get("name"):
            return row["name"]

    return identifier


def _resolve_canonical_identifier(role: str, identifier: str) -> str:
    normalized_identifier = identifier.strip().lower()
    if role.lower() != "instructor" or not normalized_identifier or not db_available():
        return identifier

    login_tokens = [token for token in re.split(r"[^a-z0-9]+", normalized_identifier.split("@", 1)[0]) if token]
    if not login_tokens:
        return identifier

    with get_db() as db:
        cur = db.cursor(dictionary=True)
        cur.execute("SELECT email, name FROM instructors")
        for row in cur.fetchall():
            name_tokens = [token for token in re.split(r"[^a-z0-9]+", (row.get("name") or "").lower()) if token]
            if all(token in name_tokens for token in login_tokens):
                return row.get("email") or identifier

    return identifier


def _fetch_user_from_db(role: str, identifier: str) -> UserRecord | None:
    normalized_identifier = _normalize_identifier(role, identifier)
    with get_db() as db:
        cur = db.cursor(dictionary=True)
        cur.execute(
            """
            SELECT username, password_hash, role
            FROM users
            WHERE LOWER(username) = LOWER(%s) AND role = %s
            LIMIT 1
            """,
            (normalized_identifier, role),
        )
        row = cur.fetchone()

    if not row:
        return None

    display_name = _fetch_display_name(role, row["username"])
    return UserRecord(
        identifier=row["username"],
        role=row["role"],
        display_name=display_name,
        password_hash=row["password_hash"],
    )


def _db_password_matches_any_user(role: str, plain_password: str) -> bool:
    with get_db() as db:
        cur = db.cursor(dictionary=True)
        cur.execute(
            "SELECT password_hash FROM users WHERE role = %s",
            (role,),
        )
        for row in cur.fetchall():
            if _verify_password_hash(plain_password, row["password_hash"]):
                return True
    return False


def _seed_users() -> None:
    if _TEMP_USERS:
        return

    raw_users = [
        # ── Students (from database 04_people_subjects.sql) ──────────
        ("student", "ahmed.hassan@student.ciu.edu.tr",    "Ahmed Hassan",    "ahmed.hassan"),
        ("student", "fatima.alzahra@student.ciu.edu.tr",  "Fatima Al-Zahra", "fatima.alzahra"),
        ("student", "plamedi.kapuya@student.ciu.edu.tr",  "Plamedi Kapuya",  "plamedi.kapuya"),
        ("student", "amara.diallo@student.ciu.edu.tr",    "Amara Diallo",    "amara.diallo"),
        ("student", "yusuf.okonkwo@student.ciu.edu.tr",   "Yusuf Okonkwo",   "yusuf.okonkwo"),
        ("student", "nadia.bello@student.ciu.edu.tr",     "Nadia Bello",     "nadia.bello"),
        ("student", "ibrahim.musa@student.ciu.edu.tr",    "Ibrahim Musa",    "ibrahim.musa"),
        ("student", "leila.karimi@student.ciu.edu.tr",    "Leila Karimi",    "leila.karimi"),
        ("student", "carlos.mendez@student.ciu.edu.tr",   "Carlos Mendez",   "carlos.mendez"),
        ("student", "aisha.suleiman@student.ciu.edu.tr",  "Aisha Suleiman",  "aisha.suleiman"),
        ("student", "david.mensah@student.ciu.edu.tr",    "David Mensah",    "david.mensah"),
        ("student", "sara.yilmaz@student.ciu.edu.tr",     "Sara Yilmaz",     "sara.yilmaz"),
        ("student", "omar.farouk@student.ciu.edu.tr",     "Omar Farouk",     "omar.farouk"),
        ("student", "kofi.asante@student.ciu.edu.tr",     "Kofi Asante",     "kofi.asante"),
        ("student", "maria.santos@student.ciu.edu.tr",    "Maria Santos",    "maria.santos"),
        ("student", "zara.ahmed@student.ciu.edu.tr",      "Zara Ahmed",      "zara.ahmed"),
        ("student", "emmanuel.eze@student.ciu.edu.tr",    "Emmanuel Eze",    "emmanuel.eze"),
        ("student", "hassan.ali@student.ciu.edu.tr",      "Hassan Ali",      "hassan.ali"),
        ("student", "priya.sharma@student.ciu.edu.tr",    "Priya Sharma",    "priya.sharma"),
        ("student", "lena.muller@student.ciu.edu.tr",     "Lena Muller",     "lena.muller"),
        ("student", "chidi.obi@student.ciu.edu.tr",       "Chidi Obi",       "chidi.obi"),
        ("student", "sofia.andrade@student.ciu.edu.tr",   "Sofia Andrade",   "sofia.andrade"),
        ("student", "kenji.tanaka@student.ciu.edu.tr",    "Kenji Tanaka",    "kenji.tanaka"),
        ("student", "rania.khalil@student.ciu.edu.tr",    "Rania Khalil",    "rania.khalil"),
        ("student", "taiwo.adesanya@student.ciu.edu.tr",  "Taiwo Adesanya",  "taiwo.adesanya"),
        ("student", "amina.diop@student.ciu.edu.tr",      "Amina Diop",      "amina.diop"),
        ("student", "lucas.ferreira@student.ciu.edu.tr",  "Lucas Ferreira",  "lucas.ferreira"),
        ("student", "hana.moradi@student.ciu.edu.tr",     "Hana Moradi",     "hana.moradi"),
        ("student", "blessing.okeke@student.ciu.edu.tr",  "Blessing Okeke",  "blessing.okeke"),
        ("student", "yasmin.rashid@student.ciu.edu.tr",   "Yasmin Rashid",   "yasmin.rashid"),

        # ── Instructors (from database 04_people_subjects.sql) ───────
        ("instructor", "mkusaf@ciu.edu.tr",       "Prof. Dr. Mehmet Kusaf",                  "mehmet.kusaf"),
        ("instructor", "ddeniz@ciu.edu.tr",       "Prof. Dr. Dervis Deniz",                  "dervis.deniz"),
        ("instructor", "mdirekoğlu@ciu.edu.tr",   "Prof. Dr. Melike Direkoglu",              "melike.direkoglu"),
        ("instructor", "aali@ciu.edu.tr",           "Assoc. Prof. Dr. Asad Ali",               "asad.ali"),
        ("instructor", "kyurtkan@ciu.edu.tr",      "Assoc. Prof. Dr. Kamil Yurtkan",          "kamil.yurtkan"),
        ("instructor", "fbabalola@ciu.edu.tr",   "Asst. Prof. Dr. Felix Babalarola",        "felix.babalarola"),
        ("instructor", 'pesmaili@ciu.edu.tr',   "Asst. Prof. Dr. Parvaneh Esmaili",        "parvaneh.esmaili"),
        ("instructor", 'hnadiri@ciu.edu.tr',       "Asst. Prof. Dr. Halil Nadiri",            "halil.nadiri"),
        ("instructor", "ttugay@ciu.edu.tr",       "Asst. Prof. Dr. Turgay Tugay",            "turgay.tugay"),
        ("instructor", "skhoja@ciu.edu.tr",         "Asst. Prof. Dr. Sana Khoja",              "sana.khoja"),
        ("instructor", "asahin@ciu.edu.tr",          "Prof. Dr. Ali Ekber Sahin",               "ali.sahin"),
        ("instructor", "lkaya@ciu.edu.tr",        "Assoc. Prof. Dr. Levent Kaya",            "levent.kaya"),
        ("instructor", "oyilmaz@ciu.edu.tr",       "Prof. Dr. Osman Yilmaz",                  "osman.yilmaz"),
        ("instructor", "fozkan@ciu.edu.tr",        "Assoc. Prof. Dr. Fatma Ozkan",            "fatma.ozkan"),
        ("instructor", "mdemir@ciu.edu.tr",        "Asst. Prof. Dr. Murat Demir",             "murat.demir"),

        # ── Admin ────────────────────────────────────────────────────
        ("admin", "admin@ciu.edu.tr","Admin", "admin123"),
    ]

    for role, identifier, display_name, password in raw_users:
        _TEMP_USERS[(role, identifier.lower())] = UserRecord(
            identifier=identifier,
            role=role,
            display_name=display_name,
            password_hash=hash_password(password),
        )


def _normalize_identifier(role: str, identifier: str) -> str:
    normalized = identifier.strip().lower()
    if role.lower() != "student":
        return normalized

    if normalized.endswith("@ciu,edu.tr"):
        normalized = normalized.replace("@ciu,edu.tr", "@ciu.edu.tr")

    # Accept student_no only and convert to username format.
    if re.fullmatch(r"\d{8}", normalized):
        normalized = normalized + "@ciu.edu.tr"

    return normalized


def authenticate(role: str, identifier: str, password: str) -> AuthResult:
    print(f"\n[SPY] Frontend sent password: -->{password}<--")
    password = password.strip()
    role_key = role.lower()
    normalized_identifier = _normalize_identifier(role, identifier)
    print(f"\n[login ATTEMPT] Role: {role_key} | Searching DB for: '{normalized_identifier}'\n")
    if db_available():
        user = _fetch_user_from_db(role_key, normalized_identifier)
        if not user:
            if _db_password_matches_any_user(role_key, password):
                return AuthResult(user=None, error_code="username_wrong")
            return AuthResult(user=None, error_code="both_wrong")

        if not _verify_password_hash(password, user.password_hash):
            return AuthResult(user=None, error_code="password_wrong")

        return AuthResult(user=user, error_code=None)

    _seed_users()
    key = (role_key, normalized_identifier)
    user = _TEMP_USERS.get(key)

    role_users = [record for (record_role, _), record in _TEMP_USERS.items() if record_role == role_key]
    password_matches_any_user = any(verify_password(password, record.password_hash) for record in role_users)

    if not user and not password_matches_any_user:
        return AuthResult(user=None, error_code="both_wrong")

    if not user:
        return AuthResult(user=None, error_code="username_wrong")

    if not verify_password(password, user.password_hash):
        return AuthResult(user=None, error_code="password_wrong")

    return AuthResult(user=user, error_code=None)


def issue_token(user: UserRecord) -> tuple[str, int]:
    subject = _resolve_canonical_identifier(user.role, user.identifier)
    return create_access_token(subject=subject, role=user.role)


def get_user_from_token_claims(subject: str, role: str) -> UserRecord | None:
    if db_available():
        return _fetch_user_from_db(role.lower(), subject.strip())

    _seed_users()
    return _TEMP_USERS.get((role.lower(), subject.strip().lower()))

def check_user_exists(role: str, identifier: str) -> bool:
    normalized_identifier = _normalize_identifier(role, identifier)
    role_key = role.lower()

    if db_available():
        with get_db() as db:
            cur = db.cursor()
            cur.execute(
                "SELECT 1 FROM users WHERE LOWER(username) = LOWER(%s) AND role = %s LIMIT 1",
                (normalized_identifier, role_key),
            )
            return cur.fetchone() is not None

    _seed_users()
    key = (role_key, normalized_identifier)
    return key in _TEMP_USERS

def reset_password_for_user(role: str, identifier: str, new_password: str) -> bool:
    normalized_identifier = _normalize_identifier(role, identifier)
    role_key = role.lower()

    if db_available():
        with get_db() as db:
            cur = db.cursor()
            cur.execute(
                """
                UPDATE users
                SET password_hash = %s
                WHERE LOWER(username) = LOWER(%s) AND role = %s
                """,
                (_hash_password_sha256(new_password), normalized_identifier, role_key),
            )
            db.commit()
            return cur.rowcount > 0

    _seed_users()
    key = (role_key, normalized_identifier)
    if key in _TEMP_USERS:
        _TEMP_USERS[key].password_hash = hash_password(new_password)
        return True
    return False
