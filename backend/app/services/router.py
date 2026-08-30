from fastapi import APIRouter, Depends

from app.services import service
from app.services.schemas import (
    ServiceBrowseItem,
    ServiceLiveStatus,
    ServiceCreateRequest,
    ServiceUpdateRequest,
    OrgServiceItem,
)
from app.auth.dependencies import require_approved_org

router = APIRouter(prefix="/api/services", tags=["services"])


@router.get("/browse", response_model=list[ServiceBrowseItem])
def browse_services():
    return service.browse_services()


@router.get("/{service_id}/live", response_model=ServiceLiveStatus)
def get_service_live_status(service_id: str):
    return service.get_service_live_status(service_id)


@router.get("/list", response_model=list[OrgServiceItem])
def list_org_services(org: dict = Depends(require_approved_org)):
    return service.list_org_services(organization_id=org["id"])


@router.post("/create", response_model=OrgServiceItem)
def create_service(payload: ServiceCreateRequest, org: dict = Depends(require_approved_org)):
    return service.create_service(organization_id=org["id"], payload=payload)


@router.put("/{service_id}", response_model=OrgServiceItem)
def update_service(service_id: str, payload: ServiceUpdateRequest, org: dict = Depends(require_approved_org)):
    return service.update_service(organization_id=org["id"], service_id=service_id, payload=payload)


@router.delete("/{service_id}")
def delete_service(service_id: str, org: dict = Depends(require_approved_org)):
    service.delete_service(organization_id=org["id"], service_id=service_id)
    return {"message": "Service deleted."}