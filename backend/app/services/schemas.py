from typing import Optional
from pydantic import BaseModel


class ServiceBrowseItem(BaseModel):
    id: str  # services.id — used as payload.service_id when joining
    organization_id: str
    name: str
    category: str
    specialization: Optional[str] = None
    city: Optional[str] = None
    status: str  # "open" | "paused" | "closed" | "no_queue"
    people_waiting: int
    estimated_wait_minutes: int


class ServiceLiveStatus(BaseModel):
    id: str
    people_waiting: int
    estimated_wait_minutes: int
    status: str


class ServiceCreateRequest(BaseModel):
    name: str
    description: Optional[str] = None
    specialization: Optional[str] = None
    average_service_minutes: int = 5
    is_active: bool = True


class ServiceUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    specialization: Optional[str] = None
    average_service_minutes: Optional[int] = None
    is_active: Optional[bool] = None


class OrgServiceItem(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    specialization: Optional[str] = None
    average_service_minutes: int
    is_active: bool