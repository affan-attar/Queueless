from fastapi import HTTPException, status

from app.database import get_service_client


def get_my_organization(organization_id: str) -> dict:
    service = get_service_client()

    org = (
        service.table("organizations")
        .select("id, name, description, address, org_type, status")
        .eq("id", organization_id)
        .single()
        .execute()
    )
    if not org.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found.")
    return org.data


def update_my_organization(organization_id: str, payload) -> dict:
    service = get_service_client()

    update_data = {k: v for k, v in payload.model_dump(exclude_unset=True).items()}
    if not update_data:
        return get_my_organization(organization_id)

    updated = (
        service.table("organizations")
        .update(update_data)
        .eq("id", organization_id)
        .execute()
    )
    if not updated.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found.")
    return updated.data[0]