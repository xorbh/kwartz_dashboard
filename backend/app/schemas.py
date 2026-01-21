from pydantic import BaseModel
from datetime import datetime


class LayoutSchema(BaseModel):
    x: int = 0
    y: int = 0
    w: int = 4
    h: int = 3
    minW: int = 2
    minH: int = 2


class WidgetCreate(BaseModel):
    name: str
    api_endpoint: str
    api_key: str = ""
    api_key_header: str = "X-API-Key"
    request_body: str = ""  # JSON string
    response_url_path: str = "url"
    content_url: str = ""  # Signed URL from test API response
    layout: LayoutSchema = LayoutSchema()


class WidgetUpdate(BaseModel):
    name: str | None = None
    api_endpoint: str | None = None
    api_key: str | None = None
    api_key_header: str | None = None
    request_body: str | None = None
    response_url_path: str | None = None
    content_url: str | None = None
    layout: LayoutSchema | None = None
    enabled: bool | None = None


class WidgetResponse(BaseModel):
    id: str
    name: str
    api_endpoint: str
    api_key_masked: str  # Masked for display
    api_key_header: str
    request_body: str
    response_url_path: str
    content_url: str
    layout: LayoutSchema
    enabled: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class WidgetLayoutUpdate(BaseModel):
    id: str
    layout: LayoutSchema


class BulkLayoutUpdate(BaseModel):
    widgets: list[WidgetLayoutUpdate]


class WidgetContentResponse(BaseModel):
    id: str
    name: str
    html_content: str | None = None
    error: str | None = None


class TestApiRequest(BaseModel):
    api_endpoint: str
    api_key: str | None = None
    api_key_header: str = "X-API-Key"
    request_body: str | None = None  # JSON string


class TestApiResponse(BaseModel):
    data: dict | list | None = None
    error: str | None = None
