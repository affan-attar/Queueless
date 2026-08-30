from fastapi import APIRouter, Depends, HTTPException, status
import traceback

from app.queues import service
from app.queues.schemas import (
    JoinQueueRequest,
    JoinQueueResponse,
    LiveQueueResponse,
    TokenActionResponse,
    MyQueueResponse,
    MyEntryStatusResponse,
    OrgStatsResponse,
)
from app.auth.dependencies import (
    get_current_user,
    CurrentUser,
    require_approved_org,
    get_org_scope,
    OrgScope,
)

router = APIRouter(prefix="/api/queues", tags=["queues"])


@router.post("/join", response_model=JoinQueueResponse)
def join_queue(payload: JoinQueueRequest, user: CurrentUser = Depends(get_current_user)):
    return service.join_queue(payload, user_id=user.id)


@router.get("/mine", response_model=MyQueueResponse)
def get_my_queue(org: dict = Depends(require_approved_org)):
    return service.get_my_queue(organization_id=org["id"])


@router.get("/stats", response_model=OrgStatsResponse)
def get_org_stats(org: dict = Depends(require_approved_org)):
    return service.get_org_stats(organization_id=org["id"])


@router.post("/{queue_id}/call-next", response_model=TokenActionResponse)
def call_next(queue_id: str, scope: OrgScope = Depends(get_org_scope)):
    print(">>> call_next route reached, scope:", scope)
    try:
        return service.call_next(queue_id, organization_id=scope.organization["id"], counter_id=scope.counter_id)
    except Exception:
        traceback.print_exc()
        raise


@router.post("/entries/{entry_id}/hold", response_model=TokenActionResponse)
def hold_entry(entry_id: str, scope: OrgScope = Depends(get_org_scope)):
    return service.hold_token(entry_id, organization_id=scope.organization["id"], counter_id=scope.counter_id)


@router.post("/entries/{entry_id}/status", response_model=TokenActionResponse)
def set_entry_status(entry_id: str, new_status: str, scope: OrgScope = Depends(get_org_scope)):
    return service.update_token_status(
        entry_id, organization_id=scope.organization["id"], new_status=new_status, counter_id=scope.counter_id
    )


@router.get("/{queue_id}/live", response_model=LiveQueueResponse)
def get_live_queue(queue_id: str, org: dict = Depends(require_approved_org)):
    return service.get_live_queue(queue_id, organization_id=org["id"])


@router.get("/entries/{entry_id}/live", response_model=MyEntryStatusResponse)
def get_my_entry_status(entry_id: str, user: CurrentUser = Depends(get_current_user)):
    return service.get_my_entry_status(entry_id, user_id=user.id)
    from fastapi import APIRouter, Depends, HTTPException, status
import traceback

from app.queues import service
from app.queues.schemas import (
    JoinQueueRequest,
    JoinQueueResponse,
    LiveQueueResponse,
    TokenActionResponse,
    MyQueueResponse,
    MyEntryStatusResponse,
    OrgStatsResponse,
    QueueHistoryResponse,
    OrgQueueHistoryResponse,
)
from app.auth.dependencies import (
    get_current_user,
    CurrentUser,
    require_approved_org,
    get_org_scope,
    OrgScope,
)

router = APIRouter(prefix="/api/queues", tags=["queues"])


@router.post("/join", response_model=JoinQueueResponse)
def join_queue(payload: JoinQueueRequest, user: CurrentUser = Depends(get_current_user)):
    return service.join_queue(payload, user_id=user.id)


@router.get("/mine", response_model=MyQueueResponse)
def get_my_queue(org: dict = Depends(require_approved_org)):
    return service.get_my_queue(organization_id=org["id"])


@router.get("/stats", response_model=OrgStatsResponse)
def get_org_stats(org: dict = Depends(require_approved_org)):
    return service.get_org_stats(organization_id=org["id"])


@router.get("/history", response_model=QueueHistoryResponse)
def get_queue_history(user: CurrentUser = Depends(get_current_user)):
    return service.get_my_history(user_id=user.id)


@router.get("/org-history", response_model=OrgQueueHistoryResponse)
def get_org_queue_history(org: dict = Depends(require_approved_org)):
    return service.get_org_history(organization_id=org["id"])


@router.post("/{queue_id}/call-next", response_model=TokenActionResponse)
def call_next(queue_id: str, scope: OrgScope = Depends(get_org_scope)):
    print(">>> call_next route reached, scope:", scope)
    try:
        return service.call_next(queue_id, organization_id=scope.organization["id"], counter_id=scope.counter_id)
    except Exception:
        traceback.print_exc()
        raise


@router.post("/entries/{entry_id}/hold", response_model=TokenActionResponse)
def hold_entry(entry_id: str, scope: OrgScope = Depends(get_org_scope)):
    return service.hold_token(entry_id, organization_id=scope.organization["id"], counter_id=scope.counter_id)


@router.post("/entries/{entry_id}/status", response_model=TokenActionResponse)
def set_entry_status(entry_id: str, new_status: str, scope: OrgScope = Depends(get_org_scope)):
    return service.update_token_status(
        entry_id, organization_id=scope.organization["id"], new_status=new_status, counter_id=scope.counter_id
    )


@router.get("/{queue_id}/live", response_model=LiveQueueResponse)
def get_live_queue(queue_id: str, org: dict = Depends(require_approved_org)):
    return service.get_live_queue(queue_id, organization_id=org["id"])


@router.get("/entries/{entry_id}/live", response_model=MyEntryStatusResponse)
def get_my_entry_status(entry_id: str, user: CurrentUser = Depends(get_current_user)):
    return service.get_my_entry_status(entry_id, user_id=user.id)