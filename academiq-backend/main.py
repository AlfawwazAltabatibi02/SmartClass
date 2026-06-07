from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, RedirectResponse, Response
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from fastapi.staticfiles import StaticFiles

from auth_service import authenticate, get_user_from_token_claims, issue_token, check_user_exists, reset_password_for_user
from config import settings
from db_routes import router as db_router
from schemas import HealthResponse, LoginRequest, TokenResponse, UserProfile, ForgotPasswordRequest, ResetPasswordRequest
from security import decode_access_token





app = FastAPI(title=settings.app_name, version="0.1.0")

# Serve the frontend app from the sibling folder so one server can run both UI and API.
FRONTEND_DIR = Path(__file__).resolve().parent.parent / "academiq-frontend"

if FRONTEND_DIR.exists():
    app.mount("/app", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="academiq-frontend")


@app.middleware("http")
async def _disable_cache_for_frontend_assets(request, call_next):
    """Avoid stale CSS/JS in browsers during development.

    Some environments cache StaticFiles aggressively; this forces fresh fetches.
    """
    response = await call_next(request)
    path = request.url.path or ""
    if path.startswith("/app/") and path.lower().endswith((".css", ".js", ".html")):
        response.headers["Cache-Control"] = "no-store"
        response.headers["Pragma"] = "no-cache"
    return response

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Database routes (/db/*)
app.include_router(db_router)

bearer_scheme = HTTPBearer(auto_error=True)


@app.get("/health", response_model=HealthResponse, tags=["system"])
def health() -> HealthResponse:
    return HealthResponse(timestamp=datetime.now(timezone.utc))

@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    favicon_path = FRONTEND_DIR / "public" / "favicon.svg"
    if favicon_path.exists():
        return FileResponse(str(favicon_path), media_type="image/svg+xml")
    return Response(status_code=status.HTTP_204_NO_CONTENT)

@app.get("/", include_in_schema=False)
def root() -> RedirectResponse:
    if FRONTEND_DIR.exists():
        return RedirectResponse(url="/app/login/login.html")
    return RedirectResponse(url="/docs")


@app.get("/instructor/{email}", include_in_schema=False)
def instructor_by_email(email: str) -> RedirectResponse:
    """Convenience route: unique URL per instructor email.

    Intended for admins to view an instructor dashboard for a specific email.
    """
    return RedirectResponse(url=f"/app/instructor/instructor.html?email={quote(email)}")


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


@app.post("/auth/forgot-password", tags=["auth"])
def forgot_password(payload: ForgotPasswordRequest) -> dict:
    if check_user_exists(payload.role, payload.identifier):
        # In a real app, send email with reset token. Here we just return success.
        return {"message": "If the account exists, a password reset link has been sent to your email."}
    return {"message": "If the account exists, a password reset link has been sent to your email."}


@app.post("/auth/reset-password", tags=["auth"])
def reset_password(payload: ResetPasswordRequest) -> dict:
    if reset_password_for_user(payload.role, payload.identifier, payload.new_password):
        return {"message": "Password reset successfully."}
    raise HTTPException(status_code=404, detail="User not found")

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
