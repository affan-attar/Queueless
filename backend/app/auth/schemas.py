from enum import Enum
from typing import Optional

from pydantic import BaseModel, EmailStr, Field, model_validator


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8, max_length=128)


class ChangeEmailRequest(BaseModel):
    current_password: str
    new_email: EmailStr


class UserRole(str, Enum):
    customer = "customer"
    org_admin = "org_admin"


class OrgType(str, Enum):
    hospital = "hospital"
    clinic = "clinic"
    diagnostic_center = "diagnostic_center"


class RegisterRequest(BaseModel):
    role: UserRole
    full_name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    phone: str = Field(min_length=6, max_length=20)
    password: str = Field(min_length=8, max_length=128)
    confirm_password: str

    organization_name: Optional[str] = None
    organization_type: Optional[OrgType] = None

    @model_validator(mode="after")
    def validate_passwords_and_org_fields(self):
        if self.password != self.confirm_password:
            raise ValueError("Passwords do not match")
        if self.role == UserRole.org_admin:
            if not self.organization_name or not self.organization_type:
                raise ValueError(
                    "organization_name and organization_type are required for org_admin registration"
                )
        return self


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    remember_me: bool = False


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    full_name: str
    user_id: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    access_token: str
    new_password: str = Field(min_length=8, max_length=128)