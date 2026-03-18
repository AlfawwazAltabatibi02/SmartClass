from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


RoleType = Literal["student", "instructor", "admin"]


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
