from fastapi import APIRouter, Depends

from app.notifications import service
from app.notifications.schemas import (
    NotificationListResponse,
    MarkReadResponse,
    NotificationPreferencesResponse,
    UpdatePreferencesRequest,
)
from app.auth.dependencies import get_current_user, CurrentUser

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


@router.get("", response_model=NotificationListResponse)
def list_notifications(user: CurrentUser = Depends(get_current_user)):
    return {"notifications": service.get_notifications(user.id)}


@router.patch("/{notification_id}/read", response_model=MarkReadResponse)
def mark_notification_read(notification_id: str, user: CurrentUser = Depends(get_current_user)):
    return service.mark_read(user.id, notification_id)


@router.patch("/read-all")
def mark_all_notifications_read(user: CurrentUser = Depends(get_current_user)):
    service.mark_all_read(user.id)
    return {"message": "All notifications marked as read."}


@router.get("/preferences", response_model=NotificationPreferencesResponse)
def get_notification_preferences(user: CurrentUser = Depends(get_current_user)):
    return service.get_preferences(user.id)


@router.put("/preferences", response_model=NotificationPreferencesResponse)
def update_notification_preferences(
    payload: UpdatePreferencesRequest, user: CurrentUser = Depends(get_current_user)
):
    return service.update_preferences(user.id, payload.model_dump())