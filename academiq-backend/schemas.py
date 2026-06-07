from datetime import datetime, date
from typing import Literal

from pydantic import BaseModel, Field, field_validator


RoleType = Literal["student", "instructor", "admin"]
IssueSeverity = Literal["low", "medium", "high"]
AvailabilityStatus = Literal["available", "inclass", "lunch", "meeting", "office", "offcampus"]


class LoginRequest(BaseModel):
    role: RoleType = Field(..., description="User role from login page")
    identifier: str = Field(..., min_length=3, description="Student ID, Instructor ID, or admin username")
    password: str = Field(..., min_length=3, description="Account password")


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    role: RoleType
    display_name: str


class TokenData(BaseModel):
    sub: str
    role: RoleType
    exp: int


class UserProfile(BaseModel):
    identifier: str
    role: RoleType
    display_name: str


class HealthResponse(BaseModel):
    status: str = "ok"
    timestamp: datetime


class ForgotPasswordRequest(BaseModel):
    role: RoleType = Field(..., description="User role")
    identifier: str = Field(..., description="User email or identifier")


class ResetPasswordRequest(BaseModel):
    role: RoleType
    identifier: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if not v[0].isupper():
            raise ValueError("Password must start with an uppercase letter")
        import re
        if not re.search(r"[^a-zA-Z0-9]", v):
            raise ValueError("Password must contain at least one symbol")
        return v


class IssueCreateRequest(BaseModel):
    schedule_id: int
    issues: list[str] = Field(..., min_length=1)
    severity: IssueSeverity = "low"
    comment: str | None = None


class IssueResolveRequest(BaseModel):
    admin_response: str | None = None


class AvailabilitySlot(BaseModel):
    day: str
    time_slot: str
    status: AvailabilityStatus


class AvailabilityUpsertRequest(BaseModel):
    day: str
    time_slot: str
    status: AvailabilityStatus


class FeedbackCreateRequest(BaseModel):
    schedule_id: int
    issues: list[str] = Field(..., min_length=1)
    severity: IssueSeverity = "low"
    comment: str | None = None


class FeedbackResolveRequest(BaseModel):
    admin_response: str | None = None


ComplaintCategory = Literal[
    "schedule", "classroom", "workload", "equipment",
    "policy", "student_issue", "other"
]
ComplaintPriority = Literal["low", "medium", "high"]


class ComplaintCreateRequest(BaseModel):
    category: ComplaintCategory = "other"
    subject: str = Field(..., min_length=5, max_length=200)
    message: str = Field(..., min_length=10)
    priority: ComplaintPriority = "medium"


class ComplaintRespondRequest(BaseModel):
    admin_response: str = Field(..., min_length=1)
    new_status: Literal["in_progress", "resolved", "closed"] = "resolved"

class ExamCreatePayload(BaseModel):
    subject_id: int
    instructor_id: int
    exam_date: date
    time_slot: str = Field(..., max_length=20, description="e.g., 09:00-11:00")
    hall: str = Field(..., max_length=50)
    exam_type: Literal["midterm", "final"]