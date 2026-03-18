from datetime import datetime, timezone

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from auth_service import authenticate, get_user_from_token_claims, issue_token
from config import settings
from schemas import HealthResponse, LoginRequest, TokenResponse, UserProfile
from security import decode_access_token


app = FastAPI(title=settings.app_name, version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

bearer_scheme = HTTPBearer(auto_error=True)


@app.get("/health", response_model=HealthResponse, tags=["system"])
def health() -> HealthResponse:
    return HealthResponse(timestamp=datetime.now(timezone.utc))


@app.post("/auth/login", response_model=TokenResponse, tags=["auth"])
def login(payload: LoginRequest) -> TokenResponse:
    auth_result = authenticate(payload.role, payload.identifier, payload.password)
    user = auth_result.user

    if not user:
        error_map = {
            "password_wrong": "Password is wrong",
            "username_wrong": "Username is wrong",
            "both_wrong": "Both username and password are wrong",
        }
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=error_map.get(auth_result.error_code, "Username or password is incorrect"),
        )

    token, expires_in = issue_token(user)
    return TokenResponse(
        access_token=token,
        expires_in=expires_in,
        role=user.role,
        display_name=user.display_name,
    )


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> UserProfile:
    token = credentials.credentials
    try:
        claims = decode_access_token(token)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
        ) from exc

    subject = claims.get("sub")
    role = claims.get("role")
    if not subject or not role:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )

    user = get_user_from_token_claims(subject=subject, role=role)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found for token",
        )

    return UserProfile(identifier=user.identifier, role=user.role, display_name=user.display_name)


@app.get("/auth/me", response_model=UserProfile, tags=["auth"])
def auth_me(current_user: UserProfile = Depends(get_current_user)) -> UserProfile:
    return current_user
