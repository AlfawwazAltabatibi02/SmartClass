from dataclasses import dataclass
import re

from security import create_access_token, hash_password, verify_password


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


def _seed_users() -> None:
    if _TEMP_USERS:
        return

    raw_users = [
        ("student", "22414623@ciu.edu.tr", "Alfawwaz Altabatibi", "22414623"),
        ("instructor", "inst.John@ciu.edu.tr", "Dr. Riya Patel", "John123"),
        ("admin", "admin@institution.edu", "System Admin", "admin123"),
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
    _seed_users()
    role_key = role.lower()
    normalized_identifier = _normalize_identifier(role, identifier)
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
    return create_access_token(subject=user.identifier, role=user.role)


def get_user_from_token_claims(subject: str, role: str) -> UserRecord | None:
    _seed_users()
    return _TEMP_USERS.get((role.lower(), subject.strip().lower()))
