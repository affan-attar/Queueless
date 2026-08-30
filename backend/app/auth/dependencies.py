from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.database import get_anon_client, get_service_client

bearer_scheme = HTTPBearer()


class CurrentUser:
    def __init__(self, id: str, role: str, full_name: str, access_token: str):
        self.id = id
        self.role = role
        self.full_name = full_name
        self.access_token = access_token


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> CurrentUser:
    token = credentials.credentials

    anon = get_anon_client()
    try:
        user_response = anon.auth.get_user(token)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    user = user_response.user if user_response else None
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    profile = (
        get_service_client()
        .table("profiles")
        .select("*")
        .eq("id", user.id)
        .single()
        .execute()
    )
    if not profile.data:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")

    return CurrentUser(id=user.id, role=profile.data["role"], full_name=profile.data["full_name"], access_token=token)


def require_role(*allowed_roles: str):
    """Dependency factory for role-based access control."""

    def checker(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if user.role == "super_admin":
            return user  # super_admin always passes
        if user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to perform this action.",
            )
        return user

    return checker


def require_approved_org(user=Depends(require_role("org_admin", "staff"))) -> dict:
    service = get_service_client()

    membership = (
        service.table("organization_members")
        .select("organization_id")
        .eq("profile_id", user.id)
        .limit(1)   # was .single() — crashes with a 500 if 0 rows come back
        .execute()
    )
    if not membership.data:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of any organization.",
        )

    org = (
        service.table("organizations")
        .select("*")
        .eq("id", membership.data[0]["organization_id"])
        .limit(1)
        .execute()
    )
    if not org.data:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found.")

    org_row = org.data[0]
    if org_row["status"] != "approved":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Your organization is currently {org_row['status']}. Access is restricted until approval.",
        )

    return org_row


class OrgScope:
    """What a caller is allowed to touch: their org, and — if they're
    staff — which single counter they're limited to. counter_id is
    None for org_admin/super_admin, meaning "no counter restriction"."""

    def __init__(self, organization: dict, user: CurrentUser, counter_id: str | None):
        self.organization = organization
        self.user = user
        self.counter_id = counter_id


def get_org_scope(
    org: dict = Depends(require_approved_org),
    user: CurrentUser = Depends(get_current_user),
) -> OrgScope:
    if user.role in ("org_admin", "super_admin"):
        return OrgScope(organization=org, user=user, counter_id=None)

    # staff must be assigned to an active counter to do anything
    counter = (
        get_service_client()
        .table("queue_counters")
        .select("id")
        .eq("organization_id", org["id"])
        .eq("staff_id", user.id)
        .eq("is_active", True)
        .limit(1)
        .execute()
    )
    if not counter.data:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not assigned to an active counter.",
        )
    return OrgScope(organization=org, user=user, counter_id=counter.data[0]["id"])