import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from app.config import settings


def send_email(to: str, subject: str, html: str) -> None:
    """Send a transactional email. Fails silently (just logs) so a broken
    email send never breaks the actual queue action that triggered it."""
    if not settings.smtp_host or not to:
        return

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = settings.smtp_from_email
    msg["To"] = to
    msg.attach(MIMEText(html, "html"))

    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
            server.starttls()
            server.login(settings.smtp_username, settings.smtp_password)
            server.sendmail(settings.smtp_from_email, [to], msg.as_string())
    except Exception as exc:
        print(f"[email] Failed to send to {to}: {exc}")


def get_user_email(service, user_id: str) -> str | None:
    """Look up a user's email by id via Supabase Auth admin (same pattern
    used in auth/service.py's change_password)."""
    try:
        admin_user = service.auth.admin.get_user_by_id(user_id)
        return admin_user.user.email
    except Exception:
        return None