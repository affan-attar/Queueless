import time
import random
import hashlib
import smtplib
from datetime import datetime, timedelta, timezone
from email.mime.text import MIMEText

from fastapi import HTTPException, status

from app.database import get_anon_client, get_service_client
from app.config import settings
from app.auth.schemas import RegisterRequest, LoginRequest, UserRole


def register_user(payload: RegisterRequest) -> dict:
    anon = get_anon_client()
    service = get_service_client()

    try:
        auth_result = anon.auth.sign_up(
            {
                "email": payload.email,
                "password": payload.password,
                "options": {"data": {"full_name": payload.full_name}},
            }
        )
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    user = auth_result.user
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Registration failed. The email may already be in use.",
        )

    profile_data = {
        "id": user.id,
        "full_name": payload.full_name,
        "phone": payload.phone,
        "role": payload.role.value,
    }
    last_error = None
    for attempt in range(5):
        try:
            service.table("profiles").insert(profile_data).execute()
            last_error = None
            break
        except Exception as exc:
            last_error = exc
            time.sleep(0.5)
    if last_error is not None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Registration succeeded but profile setup failed. Please try logging in, or contact support.",
        )

    if payload.role == UserRole.org_admin:
        org = (
            service.table("organizations")
            .insert(
                {
                    "owner_id": user.id,
                    "name": payload.organization_name,
                    "org_type": payload.organization_type.value,
                    "status": "approved",
                }
            )
            .execute()
        )
        org_id = org.data[0]["id"]
        service.table("organization_members").insert(
            {"organization_id": org_id, "profile_id": user.id, "role": "org_admin"}
        ).execute()

    return {
        "user_id": user.id,
        "email": payload.email,
        "email_confirmation_required": auth_result.session is None,
    }


def login_user(payload: LoginRequest) -> dict:
    anon = get_anon_client()
    service = get_service_client()

    try:
        result = anon.auth.sign_in_with_password(
            {"email": payload.email, "password": payload.password}
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    if result.session is None or result.user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    profile = (
        service.table("profiles").select("*").eq("id", result.user.id).single().execute()
    )

    return {
        "access_token": result.session.access_token,
        "refresh_token": result.session.refresh_token,
        "role": profile.data["role"],
        "full_name": profile.data["full_name"],
        "user_id": result.user.id,
    }


def _hash_code(code: str) -> str:
    return hashlib.sha256(code.encode("utf-8")).hexdigest()


def _send_email(to_email: str, subject: str, body: str) -> None:
    msg = MIMEText(body)
    msg["Subject"] = subject
    msg["From"] = settings.smtp_from_email
    msg["To"] = to_email

    with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
        server.starttls()
        server.login(settings.smtp_username, settings.smtp_password)
        server.sendmail(settings.smtp_from_email, [to_email], msg.as_string())


def request_password_reset(email: str) -> None:
    service = get_service_client()

    code = f"{random.randint(0, 999999):06d}"
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)

    try:
        users_page = service.auth.admin.list_users()
        matching_user = next(
            (u for u in users_page if u.email and u.email.lower() == email.lower()),
            None,
        )
    except Exception as exc:
        print(f"[request_password_reset] user lookup failed for {email!r}: {exc!r}")
        matching_user = None

    if matching_user is None:
        print(f"[request_password_reset] no user found for {email!r}, skipping send")
        return

    try:
        service.table("password_reset_codes").insert(
            {
                "email": email.lower(),
                "code_hash": _hash_code(code),
                "expires_at": expires_at.isoformat(),
                "used": False,
            }
        ).execute()
    except Exception as exc:
        print(f"[request_password_reset] failed to store code for {email!r}: {exc!r}")
        return

    try:
        _send_email(
            to_email=email,
            subject="Your QueueLess password reset code",
            body=(
                f"Your password reset code is: {code}\n\n"
                f"This code expires in 15 minutes. If you didn't request this, "
                f"you can safely ignore this email."
            ),
        )
        print(f"[request_password_reset] code email sent to {email!r}")
    except Exception as exc:
        print(f"[request_password_reset] failed to send email to {email!r}: {exc!r}")


def confirm_password_reset(email: str, code: str, new_password: str) -> None:
    service = get_service_client()

    try:
        result = (
            service.table("password_reset_codes")
            .select("*")
            .eq("email", email.lower())
            .eq("used", False)
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not verify code. Please try again.",
        )

    rows = result.data or []
    if not rows:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired code. Please request a new one.",
        )

    row = rows[0]

    expires_at = datetime.fromisoformat(row["expires_at"])
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if datetime.now(timezone.utc) > expires_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired code. Please request a new one.",
        )

    if row["code_hash"] != _hash_code(code):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired code. Please request a new one.",
        )

    try:
        users_page = service.auth.admin.list_users()
        matching_user = next(
            (u for u in users_page if u.email and u.email.lower() == email.lower()),
            None,
        )
    except Exception:
        matching_user = None

    if matching_user is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired code. Please request a new one.",
        )

    try:
        service.auth.admin.update_user_by_id(matching_user.id, {"password": new_password})
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to update password: {exc}",
        )

    try:
        service.table("password_reset_codes").update({"used": True}).eq("id", row["id"]).execute()
    except Exception as exc:
        print(f"[confirm_password_reset] failed to mark code used: {exc!r}")


def get_user_email(user_id: str) -> str | None:
    service = get_service_client()
    try:
        admin_user = service.auth.admin.get_user_by_id(user_id)
        return admin_user.user.email
    except Exception:
        return None


def change_password(user_id: str, current_password: str, new_password: str) -> None:
    anon = get_anon_client()
    service = get_service_client()

    try:
        admin_user = service.auth.admin.get_user_by_id(user_id)
        email = admin_user.user.email
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )

    try:
        result = anon.auth.sign_in_with_password(
            {"email": email, "password": current_password}
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Current password is incorrect.",
        )

    if result.session is None or result.user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Current password is incorrect.",
        )

    try:
        service.auth.admin.update_user_by_id(user_id, {"password": new_password})
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to update password: {exc}",
        )


def change_email(user_id: str, current_password: str, new_email: str, access_token: str) -> None:
    anon = get_anon_client()
    service = get_service_client()

    try:
        admin_user = service.auth.admin.get_user_by_id(user_id)
        current_email = admin_user.user.email
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )

    try:
        result = anon.auth.sign_in_with_password(
            {"email": current_email, "password": current_password}
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Current password is incorrect.",
        )

    if result.session is None or result.user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Current password is incorrect.",
        )

    try:
        anon.auth.set_session(access_token, result.session.refresh_token)
        anon.auth.update_user({"email": new_email})
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to update email: {exc}",
        )