from fastapi import APIRouter, Depends, HTTPException, status

from app.organizations import service
from app.organizations.schemas import OrgSettingsResponse, OrgSettingsUpdateRequest
from app.auth.dependencies import get_current_user, CurrentUser, require_approved_org

router = APIRouter(prefix="/api/organizations", tags=["organizations"])


@router.get("/me", response_model=OrgSettingsResponse)
def get_my_org_settings(org: dict = Depends(require_approved_org)):
    return service.get_my_organization(org["id"])


@router.patch("/me", response_model=OrgSettingsResponse)
def update_my_org_settings(
    payload: OrgSettingsUpdateRequest,
    org: dict = Depends(require_approved_org),
    user: CurrentUser = Depends(get_current_user),
):
    if user.role not in ("org_admin", "super_admin"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only an organization admin can update organization settings.",
        )
    return service.update_my_organization(org["id"], payload)