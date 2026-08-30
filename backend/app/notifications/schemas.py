from typing import Optional
from pydantic import BaseModel


class NotificationResponse(BaseModel):
    id: str
    type: str
    title: str
    message: str
    queue_entry_id: Optional[str] = None
    is_read: bool
    created_at: str


class NotificationListResponse(BaseModel):
    notifications: list[NotificationResponse] = []


class MarkReadResponse(BaseModel):
    id: str
    is_read: bool


class NotificationPreferencesResponse(BaseModel):
    email_enabled: bool
    in_app_enabled: bool
    queue_approaching: bool
    your_turn: bool


class UpdatePreferencesRequest(BaseModel):
    email_enabled: Optional[bool] = None
    in_app_enabled: Optional[bool] = None
    queue_approaching: Optional[bool] = None
    your_turn: Optional[bool] = None