from fastapi import APIRouter, Depends, status

from app.auth import service
from app.auth.schemas import (
    RegisterRequest,
    LoginRequest,
    TokenResponse,
    ForgotPasswordRequest,
    ChangePasswordRequest,
    ChangeEmailRequest,
)
from app.auth.dependencies import get_current_user, CurrentUser

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest):
    return service.register_user(payload)


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest):
    result = service.login_user(payload)
    return TokenResponse(
        access_token=result["access_token"],
        role=result["role"],
        full_name=result["full_name"],
        user_id=result["user_id"],
    )


@router.post("/forgot-password", status_code=status.HTTP_200_OK)
def forgot_password(payload: ForgotPasswordRequest):
    service.request_password_reset(payload.email)
    return {"message": "If that email exists, a reset link has been sent."}


@router.post("/change-password", status_code=status.HTTP_200_OK)
def change_password(
    payload: ChangePasswordRequest,
    user: CurrentUser = Depends(get_current_user),
):
    service.change_password(
        user_id=user.id,
        current_password=payload.current_password,
        new_password=payload.new_password,
    )
    return {"message": "Password updated successfully."}


@router.patch("/email", status_code=status.HTTP_200_OK)
def change_email(
    payload: ChangeEmailRequest,
    user: CurrentUser = Depends(get_current_user),
):
    service.change_email(
        user_id=user.id,
        current_password=payload.current_password,
        new_email=payload.new_email,
        access_token=user.access_token,
    )
    return {"message": "Confirmation emails sent to your old and new address. The change takes effect once confirmed."}