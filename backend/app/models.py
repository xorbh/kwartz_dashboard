import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Boolean, DateTime, Text
from app.database import Base


class Widget(Base):
    __tablename__ = "widgets"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)

    # API Configuration
    api_endpoint = Column(String, nullable=False)
    api_key_encrypted = Column(String, nullable=True)  # Encrypted API key
    api_key_header = Column(String, default="X-API-Key")  # Header name for API key
    request_body = Column(Text, nullable=True)  # JSON string for POST body
    response_url_path = Column(String, default="url")  # JSON path to signed URL
    content_url = Column(Text, nullable=True)  # Signed URL from API response

    # Layout
    layout_x = Column(Integer, default=0)
    layout_y = Column(Integer, default=0)
    layout_w = Column(Integer, default=4)
    layout_h = Column(Integer, default=3)
    layout_min_w = Column(Integer, default=2)
    layout_min_h = Column(Integer, default=2)

    enabled = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
