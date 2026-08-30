import smtplib
from email.mime.text import MIMEText

from app.database import get_service_client
from app.config import settings


def send_email(to_email: str, subject: str, body: str) -> None:
    
    if not settings.smtp_host or not settings.smtp_username or not settings.smtp_password:
        print(f"[email] SMTP not configured, skipping email to {to_email}: {subject}")
        return

    msg = MIMEText(body)
    msg["Subject"] = subject
    msg["From"] = settings.smtp_from_email or settings.smtp_username
    msg["To"] = to_email

    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
            server.starttls()
            server.login(settings.smtp_username, settings.smtp_password)
            server.send_message(msg)
    except Exception as exc:
        print(f"[email] Failed to send to {to_email}: {exc}")


def get_preferences(user_id: str) -> dict:
    service = get_service_client()
    row = (
        service.table("notification_preferences")
        .select("*")
        .eq("user_id", user_id)
        .maybe_single()
        .execute()
    )
    if row and row.data:
        return row.data

    default = {
        "user_id": user_id,
        "email_enabled": True,
        "in_app_enabled": True,
        "queue_approaching": True,
        "your_turn": True,
    }
    service.table("notification_preferences").insert(default).execute()
    return default


def update_preferences(user_id: str, updates: dict) -> dict:
    service = get_service_client()
    get_preferences(user_id)  # ensure a row exists first
    clean = {k: v for k, v in updates.items() if v is not None}
    if clean:
        service.table("notification_preferences").update(clean).eq("user_id", user_id).execute()
    return get_preferences(user_id)


def get_notifications(user_id: str) -> list[dict]:
    service = get_service_client()
    rows = (
        service.table("notifications")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .limit(50)
        .execute()
    )
    return rows.data or []


def mark_read(user_id: str, notification_id: str) -> dict:
    service = get_service_client()
    service.table("notifications").update({"is_read": True}).eq("id", notification_id).eq(
        "user_id", user_id
    ).execute()
    return {"id": notification_id, "is_read": True}


def mark_all_read(user_id: str) -> None:
    service = get_service_client()
    service.table("notifications").update({"is_read": True}).eq("user_id", user_id).eq(
        "is_read", False
    ).execute()


def _get_user_email(service, user_id: str) -> str | None:
    """Uses Supabase's admin Auth API to look up the user's email —
    avoids assuming profiles has an email column."""
    try:
        res = service.auth.admin.get_user_by_id(user_id)
        return res.user.email if res and res.user else None
    except Exception as exc:
        print(f"[email] Could not look up email for {user_id}: {exc}")
        return None


def notify_approaching(
    user_id: str, queue_entry_id: str, org_name: str, token_label: str, estimated_wait_minutes: int
) -> None:
    service = get_service_client()
    prefs = get_preferences(user_id)

    title = "Your turn is approaching"
    message = (
        f"You have approximately 2 people ahead of you at {org_name}. "
        f"Token: {token_label}. Estimated wait: ~{estimated_wait_minutes} minutes."
    )

    if prefs.get("in_app_enabled", True):
        service.table("notifications").insert(
            {
                "user_id": user_id,
                "type": "QUEUE_APPROACHING",
                "title": title,
                "message": message,
                "queue_entry_id": queue_entry_id,
                "is_read": False,
            }
        ).execute()

    if prefs.get("email_enabled", True) and prefs.get("queue_approaching", True):
        email = _get_user_email(service, user_id)
        if email:
            send_email(email, title, message)


def notify_turn_called(user_id: str, queue_entry_id: str, token_label: str, counter_label: str | None) -> None:
    service = get_service_client()
    prefs = get_preferences(user_id)

    title = "Your turn is here"
    message = f"Your token {token_label} has been called." + (
        f" Please proceed to {counter_label}." if counter_label else " Please proceed to the counter."
    )

    if prefs.get("in_app_enabled", True):
        service.table("notifications").insert(
            {
                "user_id": user_id,
                "type": "TOKEN_CALLED",
                "title": title,
                "message": message,
                "queue_entry_id": queue_entry_id,
                "is_read": False,
            }
        ).execute()

    if prefs.get("email_enabled", True) and prefs.get("your_turn", True):
        email = _get_user_email(service, user_id)
        if email:
            send_email(email, title, message)


def check_approaching_for_queue(queue_id: str) -> None:
    """Looks at everyone still WAITING in this queue. Anyone who now has
    exactly 3 people ahead of them, and hasn't been notified yet, gets
    the approaching notification/email exactly once."""
    service = get_service_client()

    queue_row = (
        service.table("queues")
        .select("id, organizations(name), services(average_service_minutes)")
        .eq("id", queue_id)
        .single()
        .execute()
        .data
    )
    if not queue_row:
        return

    org_name = (queue_row.get("organizations") or {}).get("name") or "the organization"
    avg_minutes = (queue_row.get("services") or {}).get("average_service_minutes", 5)

    waiting = (
        service.table("queue_entries")
        .select("id, user_id, token_label, token_number, requeue_after_token, approaching_notified")
        .eq("queue_id", queue_id)
        .eq("status", "WAITING")
        .execute()
        .data
    )

    def sort_key(e):
        if e.get("requeue_after_token") is not None:
            return e["requeue_after_token"] + 0.5
        return e["token_number"]

    waiting_sorted = sorted(waiting, key=sort_key)

    for index, entry in enumerate(waiting_sorted):
        if entry.get("approaching_notified"):
            continue
        if index != 2:
            continue

        notify_approaching(
            user_id=entry["user_id"],
            queue_entry_id=entry["id"],
            org_name=org_name,
            token_label=entry["token_label"],
            estimated_wait_minutes=index * avg_minutes,
        )
        service.table("queue_entries").update({"approaching_notified": True}).eq("id", entry["id"]).execute()