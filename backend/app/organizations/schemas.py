from typing import Optional
from pydantic import BaseModel


class OrgSettingsResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    address: Optional[str] = None
    org_type: str
    status: str


class OrgSettingsUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    address: Optional[str] = None