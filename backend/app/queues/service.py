from datetime import datetime, timezone

from fastapi import HTTPException, status

from app.database import get_service_client
from app.queues.schemas import JoinQueueRequest
from app.notifications import service as notifications_service
from app.notifications.email import send_email, get_user_email


def join_queue(payload: JoinQueueRequest, user_id: str) -> dict:
    service = get_service_client()

    queue_row = (
        service.table("queues")
        .select("id, status")
        .eq("service_id", payload.service_id)
        .single()
        .execute()
    )
    if not queue_row.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No queue found for this service.",
        )

    queue_id = queue_row.data["id"]

    try:
        result = service.rpc(
            "issue_next_token",
            {"p_queue_id": queue_id, "p_user_id": user_id},
        ).execute()
    except Exception as exc:
        message = str(exc).lower()

        if "duplicate key" in message or "unique" in message:
            existing = (
                service.table("queue_entries")
                .select("id")
                .eq("queue_id", queue_id)
                .eq("user_id", user_id)
                .in_("status", ["WAITING", "CALLED", "IN_SERVICE"])
                .limit(1)
                .execute()
            )
            existing_entry_id = existing.data[0]["id"] if existing.data else None

            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail={
                    "message": "You're already in this queue.",
                    "entry_id": existing_entry_id,
                    "queue_id": queue_id,
                },
            )
        if "queue not found" in message:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Queue not found.",
            )
        if "queue is not open" in message:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This queue is currently closed.",
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not join the queue. Please try again.",
        )

    entry = result.data[0] if isinstance(result.data, list) else result.data
    if not entry:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not join the queue. Please try again.",
        )

    ahead = (
        service.table("queue_entries")
        .select("id", count="exact")
        .eq("queue_id", queue_id)
        .eq("status", "WAITING")
        .lt("token_number", entry["token_number"])
        .execute()
    )
    position = (ahead.count or 0) + 1

    service_row = (
        service.table("services")
        .select("average_service_minutes")
        .eq("id", payload.service_id)
        .single()
        .execute()
    )
    avg_minutes = (service_row.data or {}).get("average_service_minutes", 5)
    estimated_wait = (position - 1) * avg_minutes

    return {
        "queue_id": queue_id,
        "entry_id": entry["id"],
        "token": entry["token_label"],
        "position": position,
        "estimated_wait_minutes": estimated_wait,
    }


def get_my_queue(organization_id: str) -> dict:
    service = get_service_client()

    queue_row = (
        service.table("queues")
        .select("id, status, services(name)")
        .eq("organization_id", organization_id)
        .limit(1)
        .execute()
    )
    if not queue_row.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No queue found for your organization yet. Create a service first.",
        )

    row = queue_row.data[0]
    return {
        "queue_id": row["id"],
        "queue_status": row["status"],
        "service_name": row["services"]["name"] if row.get("services") else "General",
    }


def _sort_key(entry: dict):
    """Held entries sort right after the token they were placed behind."""
    if entry.get("requeue_after_token") is not None:
        return entry["requeue_after_token"] + 0.5
    return entry["token_number"]


def _attach_customer_names(service, entries: list[dict]) -> list[dict]:
    """Look up full_name from profiles for each entry's user_id and attach
    it as customer_name, without changing anything else about the entry."""
    user_ids = list({e["user_id"] for e in entries if e.get("user_id")})
    if not user_ids:
        for e in entries:
            e["customer_name"] = None
        return entries

    profiles = (
        service.table("profiles")
        .select("id, full_name")
        .in_("id", user_ids)
        .execute()
    )
    name_by_id = {p["id"]: p["full_name"] for p in (profiles.data or [])}

    for e in entries:
        e["customer_name"] = name_by_id.get(e.get("user_id"))
    return entries


def get_live_queue(queue_id: str, organization_id: str) -> dict:
    service = get_service_client()

    queue_row = (
        service.table("queues")
        .select("*")
        .eq("id", queue_id)
        .eq("organization_id", organization_id)
        .single()
        .execute()
    )
    if not queue_row.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Queue not found.")

    entries = (
        service.table("queue_entries")
        .select("id, user_id, token_label, token_number, status, joined_at, already_held, requeue_after_token")
        .eq("queue_id", queue_id)
        .in_("status", ["WAITING", "CALLED", "IN_SERVICE"])
        .execute()
    )

    all_entries = _attach_customer_names(service, entries.data)

    now_serving = None
    waiting = []
    for e in all_entries:
        if e["status"] in ("CALLED", "IN_SERVICE"):
            now_serving = e
        else:
            waiting.append(e)

    waiting.sort(key=_sort_key)

    return {
        "queue_id": queue_id,
        "queue_status": queue_row.data["status"],
        "now_serving": now_serving,
        "waiting": waiting,
    }


ALLOWED_TRANSITIONS = {
    "WAITING": {"CANCELLED"},
    "CALLED": {"IN_SERVICE", "COMPLETED", "NO_SHOW", "CANCELLED"},
    "IN_SERVICE": {"COMPLETED", "CANCELLED"},
}


def _cancel_other_waiting_entries(service, user_id: str | None, keep_entry_id: str) -> None:
    """When a customer is called at one clinic, they can only be in one
    place — auto-cancel their other still-waiting entries elsewhere."""
    if not user_id:
        return

    service.table("queue_entries").update({"status": "CANCELLED"}).eq(
        "user_id", user_id
    ).eq("status", "WAITING").neq("id", keep_entry_id).execute()


def call_next(queue_id: str, organization_id: str, counter_id: str | None) -> dict:
    service = get_service_client()

    queue_row = (
        service.table("queues")
        .select("id")
        .eq("id", queue_id)
        .eq("organization_id", organization_id)
        .single()
        .execute()
    )
    if not queue_row.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Queue not found.")

    try:
        result = service.rpc(
            "call_next_token",
            {"p_queue_id": queue_id, "p_counter_id": counter_id},
        ).execute()
    except Exception as exc:
        if "no one is waiting" in str(exc).lower():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No one is waiting.")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not call next token.")

    entry = result.data[0] if isinstance(result.data, list) else result.data
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No one is waiting.")

    _cancel_other_waiting_entries(service, user_id=entry.get("user_id"), keep_entry_id=entry["id"])

    entry_full = (
        service.table("queue_entries")
        .select("id, user_id, token_label")
        .eq("id", entry["id"])
        .single()
        .execute()
        .data
    )
    if entry_full and entry_full.get("user_id"):
        notifications_service.notify_turn_called(
            user_id=entry_full["user_id"],
            queue_entry_id=entry_full["id"],
            token_label=entry_full["token_label"],
            counter_label=f"Counter {counter_id}" if counter_id else None,
        )
    notifications_service.check_approaching_for_queue(queue_id)

    return {"message": "Next token called.", "entry_id": entry["id"], "new_status": "CALLED"}


def hold_token(entry_id: str, organization_id: str, counter_id: str | None) -> dict:
    service = get_service_client()

    entry = (
        service.table("queue_entries")
        .select("id, status, already_held, queue_id, counter_id, user_id, token_label, queues(organization_id)")
        .eq("id", entry_id)
        .single()
        .execute()
    )
    if not entry.data or entry.data["queues"]["organization_id"] != organization_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Token not found.")

    if counter_id is not None and entry.data["counter_id"] != counter_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This token isn't at your counter.")

    if entry.data["status"] != "CALLED":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only a called token can be held.")
    if entry.data["already_held"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This token has already used its hold.")

    queue_id = entry.data["queue_id"]

    waiting = (
        service.table("queue_entries")
        .select("token_number, requeue_after_token")
        .eq("queue_id", queue_id)
        .eq("status", "WAITING")
        .execute()
    )
    waiting_sorted = sorted(waiting.data, key=_sort_key)

    if len(waiting_sorted) >= 3:
        behind_token = waiting_sorted[2]["token_number"]
    elif waiting_sorted:
        behind_token = waiting_sorted[-1]["token_number"]
    else:
        queue_row = (
            service.table("queues").select("now_serving_number").eq("id", queue_id).single().execute()
        )
        behind_token = queue_row.data["now_serving_number"]

    service.table("queue_entries").update(
        {"status": "WAITING", "called_at": None, "already_held": True, "requeue_after_token": behind_token}
    ).eq("id", entry_id).execute()

    notifications_service.check_approaching_for_queue(queue_id)

    user_id = entry.data.get("user_id")
    if user_id:
        to_email = get_user_email(service, user_id)
        if to_email:
            send_email(
                to=to_email,
                subject="Your queue token has been placed on hold",
                html=(
                    f"<p>Hi,</p><p>Your token <b>{entry.data['token_label']}</b> has been placed on hold. "
                    f"You'll be called again shortly — please stay nearby.</p>"
                ),
            )

    return {"message": "Token placed on hold.", "entry_id": entry_id, "new_status": "WAITING"}


def update_token_status(entry_id: str, organization_id: str, new_status: str, counter_id: str | None) -> dict:
    service = get_service_client()

    entry = (
        service.table("queue_entries")
        .select("id, status, queue_id, counter_id, user_id, token_label, queues(organization_id)")
        .eq("id", entry_id)
        .single()
        .execute()
    )
    if not entry.data or entry.data["queues"]["organization_id"] != organization_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Token not found.")

    if counter_id is not None and entry.data["counter_id"] != counter_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This token isn't at your counter.")

    current = entry.data["status"]
    if new_status not in ALLOWED_TRANSITIONS.get(current, set()):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot change status from {current} to {new_status}.",
        )

    update_data = {"status": new_status}
    if new_status == "IN_SERVICE":
        update_data["service_started_at"] = "now()"
    elif new_status == "COMPLETED":
        update_data["completed_at"] = "now()"

    service.table("queue_entries").update(update_data).eq("id", entry_id).execute()

    if new_status in ("COMPLETED", "CANCELLED", "NO_SHOW"):
        notifications_service.check_approaching_for_queue(entry.data["queue_id"])

    user_id = entry.data.get("user_id")
    if user_id and new_status in ("CANCELLED", "NO_SHOW"):
        to_email = get_user_email(service, user_id)
        if to_email:
            if new_status == "CANCELLED":
                subject = "You've left the queue"
                body = f"<p>Hi,</p><p>You've left the queue for token <b>{entry.data['token_label']}</b>.</p>"
            else:
                subject = "You were removed from the queue (No Show)"
                body = (
                    f"<p>Hi,</p><p>You were marked as a no-show for token <b>{entry.data['token_label']}</b> "
                    f"and removed from the queue. If this was a mistake, please contact the front desk.</p>"
                )
            send_email(to=to_email, subject=subject, html=body)

    return {"message": f"Token marked as {new_status}.", "entry_id": entry_id, "new_status": new_status}


def get_my_entry_status(entry_id: str, user_id: str) -> dict:
    service = get_service_client()

    entry = (
        service.table("queue_entries")
        .select("id, user_id, queue_id, token_label, token_number, status, requeue_after_token")
        .eq("id", entry_id)
        .single()
        .execute()
    )
    if not entry.data or entry.data["user_id"] != user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Queue entry not found.")

    e = entry.data
    queue_id = e["queue_id"]

    queue_row = (
        service.table("queues")
        .select("now_serving_number, token_prefix, service_id")
        .eq("id", queue_id)
        .single()
        .execute()
        .data
    )

    now_serving_label = None
    if queue_row["now_serving_number"]:
        now_serving_label = f"{queue_row['token_prefix']}-{queue_row['now_serving_number']:03d}"

    total_waiting = None

    if e["status"] in ("COMPLETED", "CANCELLED", "NO_SHOW", "SKIPPED", "CALLED"):
        position = 0
    else:
        my_key = (
            e["requeue_after_token"] + 0.5
            if e["requeue_after_token"] is not None
            else e["token_number"]
        )
        waiting = (
            service.table("queue_entries")
            .select("token_number, requeue_after_token")
            .eq("queue_id", queue_id)
            .eq("status", "WAITING")
            .execute()
            .data
        )
        position = 0
        for w in waiting:
            w_key = (
                w["requeue_after_token"] + 0.5
                if w["requeue_after_token"] is not None
                else w["token_number"]
            )
            if w_key < my_key:
                position += 1

        total_waiting = len(waiting)

    service_row = (
        service.table("services")
        .select("average_service_minutes")
        .eq("id", queue_row["service_id"])
        .single()
        .execute()
        .data
    )
    avg_minutes = (service_row or {}).get("average_service_minutes", 5)

    return {
        "entry_id": e["id"],
        "token_label": e["token_label"],
        "status": e["status"],
        "position": position,
        "total_waiting": total_waiting,
        "now_serving_label": now_serving_label,
        "estimated_wait_minutes": position * avg_minutes,
    }


def get_org_stats(organization_id: str) -> dict:
    service = get_service_client()

    queues = (
        service.table("queues")
        .select("id, now_serving_number, token_prefix, services(name)")
        .eq("organization_id", organization_id)
        .execute()
        .data
    )
    queue_ids = [q["id"] for q in queues]
    if not queue_ids:
        return {
            "todays_visitors": 0,
            "currently_waiting": 0,
            "avg_wait_minutes": 0,
            "avg_service_minutes": 0,
            "completed_today": 0,
            "no_shows_today": 0,
            "currently_serving": [],
        }

    today_start = datetime.now(timezone.utc).strftime("%Y-%m-%dT00:00:00")

    entries = (
        service.table("queue_entries")
        .select("status, joined_at, called_at, completed_at, queue_id")
        .in_("queue_id", queue_ids)
        .gte("joined_at", today_start)
        .execute()
        .data
    )

    todays_visitors = len(entries)
    currently_waiting = sum(1 for e in entries if e["status"] == "WAITING")
    completed_today = sum(1 for e in entries if e["status"] == "COMPLETED")
    no_shows_today = sum(1 for e in entries if e["status"] == "NO_SHOW")

    def parse(ts):
        return datetime.fromisoformat(ts.replace("Z", "+00:00")) if ts else None

    wait_times = []
    service_times = []
    for e in entries:
        joined = parse(e["joined_at"])
        called = parse(e["called_at"])
        completed = parse(e["completed_at"])
        if joined and called:
            wait_times.append((called - joined).total_seconds() / 60)
        if called and completed:
            service_times.append((completed - called).total_seconds() / 60)

    avg_wait = round(sum(wait_times) / len(wait_times), 1) if wait_times else 0
    avg_service = round(sum(service_times) / len(service_times), 1) if service_times else 0

    currently_serving = [
        {
            "service_name": q["services"]["name"] if q.get("services") else "General",
            "token_label": f"{q['token_prefix']}-{q['now_serving_number']:03d}"
            if q["now_serving_number"]
            else None,
        }
        for q in queues
        if q["now_serving_number"]
    ]

    return {
        "todays_visitors": todays_visitors,
        "currently_waiting": currently_waiting,
        "avg_wait_minutes": avg_wait,
        "avg_service_minutes": avg_service,
        "completed_today": completed_today,
        "no_shows_today": no_shows_today,
        "currently_serving": currently_serving,
    }


HISTORY_STATUSES = ["COMPLETED", "CANCELLED", "NO_SHOW", "SKIPPED"]


def _parse_ts(ts):
    if not ts:
        return None
    return datetime.fromisoformat(ts.replace("Z", "+00:00"))


def _compute_waiting_minutes(entry: dict) -> float | None:
    joined = _parse_ts(entry.get("joined_at"))
    end = _parse_ts(entry.get("called_at")) or _parse_ts(entry.get("completed_at"))
    if joined and end:
        return round((end - joined).total_seconds() / 60, 1)
    return None


def get_my_history(user_id: str) -> dict:
    service = get_service_client()

    entries = (
        service.table("queue_entries")
        .select(
            "id, token_label, status, joined_at, called_at, completed_at, "
            "queues(services(name), organizations(name))"
        )
        .eq("user_id", user_id)
        .in_("status", HISTORY_STATUSES)
        .order("joined_at", desc=True)
        .execute()
        .data
    )

    result = []
    for e in entries:
        queue = e.get("queues") or {}
        service_info = queue.get("services") or {}
        org_info = queue.get("organizations") or {}
        result.append(
            {
                "entry_id": e["id"],
                "organization_name": org_info.get("name") or "Unknown",
                "service_name": service_info.get("name") or "Unknown",
                "token_label": e["token_label"],
                "status": e["status"],
                "joined_at": e["joined_at"],
                "completed_at": e.get("completed_at"),
                "waiting_minutes": _compute_waiting_minutes(e),
            }
        )

    return {"entries": result}


def get_org_history(organization_id: str) -> dict:
    service = get_service_client()

    queues = (
        service.table("queues")
        .select("id, services(name)")
        .eq("organization_id", organization_id)
        .execute()
        .data
    )
    queue_ids = [q["id"] for q in queues]
    service_name_by_queue = {
        q["id"]: (q.get("services") or {}).get("name") or "General" for q in queues
    }

    if not queue_ids:
        return {
            "entries": [],
            "summary": {"total_served": 0, "cancelled": 0, "no_show": 0},
        }

    entries = (
        service.table("queue_entries")
        .select("id, token_label, status, joined_at, called_at, completed_at, queue_id")
        .in_("queue_id", queue_ids)
        .in_("status", HISTORY_STATUSES)
        .order("joined_at", desc=True)
        .execute()
        .data
    )

    result = []
    total_served = 0
    cancelled = 0
    no_show = 0

    for e in entries:
        if e["status"] == "COMPLETED":
            total_served += 1
        elif e["status"] == "CANCELLED":
            cancelled += 1
        elif e["status"] == "NO_SHOW":
            no_show += 1

        result.append(
            {
                "entry_id": e["id"],
                "service_name": service_name_by_queue.get(e["queue_id"], "General"),
                "token_label": e["token_label"],
                "status": e["status"],
                "joined_at": e["joined_at"],
                "completed_at": e.get("completed_at"),
                "waiting_minutes": _compute_waiting_minutes(e),
            }
        )

    return {
        "entries": result,
        "summary": {
            "total_served": total_served,
            "cancelled": cancelled,
            "no_show": no_show,
        },
    }