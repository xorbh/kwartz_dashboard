from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Widget
from app.schemas import (
    WidgetCreate,
    WidgetUpdate,
    WidgetResponse,
    WidgetLayoutUpdate,
    BulkLayoutUpdate,
    WidgetContentResponse,
    LayoutSchema,
    TestApiRequest,
    TestApiResponse,
)
from app.encryption import encrypt_api_key, decrypt_api_key, mask_api_key
from app.services.widget_service import fetch_widget_content, test_api_endpoint

router = APIRouter(prefix="/api/widgets", tags=["widgets"])


def widget_to_response(widget: Widget) -> WidgetResponse:
    api_key = ""
    if widget.api_key_encrypted:
        try:
            api_key = decrypt_api_key(widget.api_key_encrypted)
        except Exception:
            pass

    return WidgetResponse(
        id=widget.id,
        name=widget.name,
        api_endpoint=widget.api_endpoint,
        api_key_masked=mask_api_key(api_key),
        api_key_header=widget.api_key_header or "X-API-Key",
        request_body=widget.request_body or "",
        response_url_path=widget.response_url_path,
        content_url=widget.content_url or "",
        layout=LayoutSchema(
            x=widget.layout_x,
            y=widget.layout_y,
            w=widget.layout_w,
            h=widget.layout_h,
            minW=widget.layout_min_w,
            minH=widget.layout_min_h,
        ),
        enabled=widget.enabled,
        created_at=widget.created_at,
        updated_at=widget.updated_at,
    )


@router.get("", response_model=list[WidgetResponse])
def list_widgets(db: Session = Depends(get_db)):
    widgets = db.query(Widget).filter(Widget.enabled == True).all()
    return [widget_to_response(w) for w in widgets]


@router.post("", response_model=WidgetResponse)
def create_widget(widget_data: WidgetCreate, db: Session = Depends(get_db)):
    widget = Widget(
        name=widget_data.name,
        api_endpoint=widget_data.api_endpoint,
        api_key_encrypted=encrypt_api_key(widget_data.api_key) if widget_data.api_key else "",
        api_key_header=widget_data.api_key_header,
        request_body=widget_data.request_body,
        response_url_path=widget_data.response_url_path,
        content_url=widget_data.content_url,
        layout_x=widget_data.layout.x,
        layout_y=widget_data.layout.y,
        layout_w=widget_data.layout.w,
        layout_h=widget_data.layout.h,
        layout_min_w=widget_data.layout.minW,
        layout_min_h=widget_data.layout.minH,
    )
    db.add(widget)
    db.commit()
    db.refresh(widget)
    return widget_to_response(widget)


@router.get("/{widget_id}", response_model=WidgetResponse)
def get_widget(widget_id: str, db: Session = Depends(get_db)):
    widget = db.query(Widget).filter(Widget.id == widget_id).first()
    if not widget:
        raise HTTPException(status_code=404, detail="Widget not found")
    return widget_to_response(widget)


@router.put("/{widget_id}", response_model=WidgetResponse)
def update_widget(widget_id: str, widget_data: WidgetUpdate, db: Session = Depends(get_db)):
    widget = db.query(Widget).filter(Widget.id == widget_id).first()
    if not widget:
        raise HTTPException(status_code=404, detail="Widget not found")

    if widget_data.name is not None:
        widget.name = widget_data.name
    if widget_data.api_endpoint is not None:
        widget.api_endpoint = widget_data.api_endpoint
    if widget_data.api_key is not None:
        widget.api_key_encrypted = encrypt_api_key(widget_data.api_key)
    if widget_data.api_key_header is not None:
        widget.api_key_header = widget_data.api_key_header
    if widget_data.request_body is not None:
        widget.request_body = widget_data.request_body
    if widget_data.response_url_path is not None:
        widget.response_url_path = widget_data.response_url_path
    if widget_data.content_url is not None:
        widget.content_url = widget_data.content_url
    if widget_data.enabled is not None:
        widget.enabled = widget_data.enabled
    if widget_data.layout is not None:
        widget.layout_x = widget_data.layout.x
        widget.layout_y = widget_data.layout.y
        widget.layout_w = widget_data.layout.w
        widget.layout_h = widget_data.layout.h
        widget.layout_min_w = widget_data.layout.minW
        widget.layout_min_h = widget_data.layout.minH

    db.commit()
    db.refresh(widget)
    return widget_to_response(widget)


@router.delete("/{widget_id}")
def delete_widget(widget_id: str, db: Session = Depends(get_db)):
    widget = db.query(Widget).filter(Widget.id == widget_id).first()
    if not widget:
        raise HTTPException(status_code=404, detail="Widget not found")

    db.delete(widget)
    db.commit()
    return {"status": "deleted"}


@router.put("/layout/bulk")
def bulk_update_layout(data: BulkLayoutUpdate, db: Session = Depends(get_db)):
    for item in data.widgets:
        widget = db.query(Widget).filter(Widget.id == item.id).first()
        if widget:
            widget.layout_x = item.layout.x
            widget.layout_y = item.layout.y
            widget.layout_w = item.layout.w
            widget.layout_h = item.layout.h
            widget.layout_min_w = item.layout.minW
            widget.layout_min_h = item.layout.minH

    db.commit()
    return {"status": "updated", "count": len(data.widgets)}


@router.get("/{widget_id}/content", response_model=WidgetContentResponse)
async def get_widget_content(widget_id: str, db: Session = Depends(get_db)):
    widget = db.query(Widget).filter(Widget.id == widget_id).first()
    if not widget:
        raise HTTPException(status_code=404, detail="Widget not found")

    html_content, error = await fetch_widget_content(widget)

    return WidgetContentResponse(
        id=widget.id,
        name=widget.name,
        html_content=html_content,
        error=error,
    )


@router.post("/{widget_id}/refresh", response_model=WidgetContentResponse)
async def refresh_widget_content(widget_id: str, db: Session = Depends(get_db)):
    """Force refresh widget content (same as get for now, but explicit)"""
    return await get_widget_content(widget_id, db)


@router.post("/test-api", response_model=TestApiResponse)
async def test_api(request: TestApiRequest):
    """Test an API endpoint and return the JSON response"""
    data, error = await test_api_endpoint(
        api_endpoint=request.api_endpoint,
        api_key=request.api_key,
        api_key_header=request.api_key_header,
        request_body=request.request_body,
    )
    return TestApiResponse(data=data, error=error)
