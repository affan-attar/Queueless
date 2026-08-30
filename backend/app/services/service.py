from fastapi import HTTPException, status

from app.database import get_service_client


def _compute_wait(service_client, queue_id: str | None, avg_minutes: int) -> tuple[int, int]:
    if not queue_id:
        return 0, 0
    result = (
        service_client.table("queue_entries")
        .select("id", count="exact")
        .eq("queue_id", queue_id)
        .eq("status", "WAITING")
        .execute()
    )
    waiting = result.count or 0
    return waiting, waiting * avg_minutes


def browse_services() -> list[dict]:
    service = get_service_client()

    orgs = (
        service.table("organizations")
        .select("id, name, org_type, city, status")
        .eq("status", "approved")
        .execute()
        .data
    )
    org_by_id = {o["id"]: o for o in orgs}
    if not orgs:
        return []

    org_ids = list(org_by_id.keys())

    services_rows = (
        service.table("services")
        .select("id, organization_id, name, specialization, average_service_minutes, is_active")
        .in_("organization_id", org_ids)
        .eq("is_active", True)
        .execute()
        .data
    )
    if not services_rows:
        return []

    service_ids = [s["id"] for s in services_rows]

    queues_rows = (
        service.table("queues")
        .select("id, service_id, status")
        .in_("service_id", service_ids)
        .execute()
        .data
    )
    queue_by_service_id = {q["service_id"]: q for q in queues_rows}

    items = []
    for s in services_rows:
        org = org_by_id.get(s["organization_id"])
        if not org:
            continue

        queue = queue_by_service_id.get(s["id"])
        avg_minutes = s.get("average_service_minutes") or 5

        if not queue:
            people_waiting, estimated_wait = 0, 0
            queue_status = "no_queue"
        elif queue["status"] != "open":
            people_waiting, estimated_wait = 0, 0
            queue_status = queue["status"]
        else:
            people_waiting, estimated_wait = _compute_wait(service, queue["id"], avg_minutes)
            queue_status = "open"

        items.append(
            {
                "id": s["id"],
                "organization_id": org["id"],
                "name": org["name"],
                "category": org["org_type"],
                "specialization": s.get("specialization"),
                "city": org.get("city"),
                "status": queue_status,
                "people_waiting": people_waiting,
                "estimated_wait_minutes": estimated_wait,
            }
        )

    return items


def get_service_live_status(service_id: str) -> dict:
    service = get_service_client()

    service_row = (
        service.table("services")
        .select("id, average_service_minutes")
        .eq("id", service_id)
        .single()
        .execute()
        .data
    )
    if not service_row:
        return {"id": service_id, "people_waiting": 0, "estimated_wait_minutes": 0, "status": "no_queue"}

    queue_row = (
        service.table("queues")
        .select("id, status")
        .eq("service_id", service_id)
        .limit(1)
        .execute()
        .data
    )
    if not queue_row:
        return {"id": service_id, "people_waiting": 0, "estimated_wait_minutes": 0, "status": "no_queue"}

    queue = queue_row[0]
    if queue["status"] != "open":
        return {"id": service_id, "people_waiting": 0, "estimated_wait_minutes": 0, "status": queue["status"]}

    avg_minutes = service_row.get("average_service_minutes") or 5
    people_waiting, estimated_wait = _compute_wait(service, queue["id"], avg_minutes)

    return {
        "id": service_id,
        "people_waiting": people_waiting,
        "estimated_wait_minutes": estimated_wait,
        "status": "open",
    }


def list_org_services(organization_id: str) -> list[dict]:
    service = get_service_client()

    rows = (
        service.table("services")
        .select("id, name, description, specialization, average_service_minutes, is_active")
        .eq("organization_id", organization_id)
        .order("created_at")
        .execute()
        .data
    )
    return rows or []


def create_service(organization_id: str, payload) -> dict:
    service = get_service_client()

    created = (
        service.table("services")
        .insert(
            {
                "organization_id": organization_id,
                "name": payload.name,
                "description": payload.description,
                "specialization": payload.specialization,
                "average_service_minutes": payload.average_service_minutes,
                "is_active": payload.is_active,
            }
        )
        .execute()
    )
    if not created.data:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not create the service.",
        )

    new_service = created.data[0]

    # Auto-create a queue for this service, same as your existing setup.
    service.table("queues").insert(
        {
            "organization_id": organization_id,
            "service_id": new_service["id"],
            "status": "open",
            "token_prefix": "A",
        }
    ).execute()

    return new_service


def update_service(organization_id: str, service_id: str, payload) -> dict:
    service = get_service_client()

    existing = (
        service.table("services")
        .select("id, organization_id")
        .eq("id", service_id)
        .single()
        .execute()
    )
    if not existing.data or existing.data["organization_id"] != organization_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service not found.")

    update_data = {k: v for k, v in payload.model_dump(exclude_unset=True).items()}
    if not update_data:
        return existing.data

    updated = (
        service.table("services")
        .update(update_data)
        .eq("id", service_id)
        .execute()
    )
    return updated.data[0]


def delete_service(organization_id: str, service_id: str) -> None:
    service = get_service_client()

    existing = (
        service.table("services")
        .select("id, organization_id")
        .eq("id", service_id)
        .single()
        .execute()
    )
    if not existing.data or existing.data["organization_id"] != organization_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service not found.")

    service.table("queues").delete().eq("service_id", service_id).execute()
    service.table("services").delete().eq("id", service_id).execute()