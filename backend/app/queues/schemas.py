from typing import Optional
from pydantic import BaseModel


class JoinQueueRequest(BaseModel):
    service_id: str


class JoinQueueResponse(BaseModel):
    queue_id: str
    entry_id: str
    token: str
    position: int
    estimated_wait_minutes: int


class QueueEntryResponse(BaseModel):
    id: str
    token_label: str
    status: str
    joined_at: str
    already_held: bool = False
    customer_name: Optional[str] = None


class MyQueueResponse(BaseModel):
    queue_id: str
    queue_status: str
    service_name: str


class LiveQueueResponse(BaseModel):
    queue_id: str
    queue_status: str
    now_serving: Optional[QueueEntryResponse] = None
    waiting: list[QueueEntryResponse] = []


class TokenActionResponse(BaseModel):
    message: str
    entry_id: str
    new_status: str


class ActionRequest(BaseModel):
    entry_id: str


class MyEntryStatusResponse(BaseModel):
    entry_id: str
    token_label: str
    status: str
    position: int
    total_waiting: Optional[int] = None
    now_serving_label: Optional[str] = None
    estimated_wait_minutes: int


class OrgStatsResponse(BaseModel):
    todays_visitors: int
    currently_waiting: int
    avg_wait_minutes: float
    avg_service_minutes: float
    completed_today: int
    no_shows_today: int
    currently_serving: list[dict] = []


class QueueHistoryEntry(BaseModel):
    entry_id: str
    organization_name: str
    service_name: str
    token_label: str
    status: str
    joined_at: str
    completed_at: Optional[str] = None
    waiting_minutes: Optional[float] = None


class QueueHistoryResponse(BaseModel):
    entries: list[QueueHistoryEntry] = []


class OrgQueueHistoryEntry(BaseModel):
    entry_id: str
    service_name: str
    token_label: str
    status: str
    joined_at: str
    completed_at: Optional[str] = None
    waiting_minutes: Optional[float] = None


class OrgQueueHistorySummary(BaseModel):
    total_served: int
    cancelled: int
    no_show: int


class OrgQueueHistoryResponse(BaseModel):
    entries: list[OrgQueueHistoryEntry] = []
    summary: OrgQueueHistorySummary