from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
from passlib.context import CryptContext

from config import settings


pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(subject: str, role: str) -> tuple[str, int]:
    expires_delta = timedelta(minutes=settings.jwt_expire_minutes)
    expire = datetime.now(timezone.utc) + expires_delta
    payload = {
        "sub": subject,
        "role": role,
        "exp": int(expire.timestamp()),
    }
    encoded_jwt = jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)
    return encoded_jwt, int(expires_delta.total_seconds())


def decode_access_token(token: str) -> dict:
    print("\n--- TOKEN DECODE DEBUG ---")
    print(f"Secret Key being used: {settings.jwt_secret_key}")
    
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
        print(f" DECODE SUCCESSFUL! Payload: {payload}")
        print("==================\n")
        return payload
        
    except JWTError as exc:
        print(f" DECODE FAILED: {str(exc)}")
        print("==================\n")
        raise ValueError("Invalid or expired token") from exc
