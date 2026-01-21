import json
import httpx
from typing import Any
from app.models import Widget


def extract_url_from_response(data: Any, path: str) -> str:
    """
    Extract a value from JSON data using dot notation path.

    Examples:
        path="url" -> data["url"]
        path="data.signed_url" -> data["data"]["signed_url"]
        path="result.0.file_url" -> data["result"][0]["file_url"]
    """
    keys = path.split(".")
    result = data

    for key in keys:
        if isinstance(result, dict):
            result = result.get(key)
        elif isinstance(result, list):
            try:
                index = int(key)
                result = result[index]
            except (ValueError, IndexError):
                return ""
        else:
            return ""

        if result is None:
            return ""

    return str(result) if result else ""


async def call_api(
    endpoint: str,
    api_key: str | None = None,
    api_key_header: str = "X-API-Key",
    request_body: str | None = None,
) -> tuple[Any, str | None]:
    """
    Call an API endpoint with optional API key and request body.

    If request_body is provided, makes a POST request.
    Otherwise, makes a GET request.

    Returns: (json_data, error_message)
    """
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            headers = {"Content-Type": "application/json"}
            if api_key:
                headers[api_key_header] = api_key

            if request_body:
                # POST request with JSON body
                try:
                    body_data = json.loads(request_body)
                except json.JSONDecodeError as e:
                    return None, f"Invalid JSON in request body: {str(e)}"

                response = await client.post(
                    endpoint, headers=headers, json=body_data
                )
            else:
                # GET request
                response = await client.get(endpoint, headers=headers)

            response.raise_for_status()
            data = response.json()
            return data, None

        except httpx.HTTPStatusError as e:
            error_body = ""
            try:
                error_body = e.response.text[:200]
            except Exception:
                pass
            return None, f"API returned status {e.response.status_code}: {error_body}"
        except httpx.RequestError as e:
            return None, f"Failed to call API: {str(e)}"
        except Exception as e:
            return None, f"Failed to parse API response: {str(e)}"


async def fetch_widget_content(widget: Widget) -> tuple[str | None, str | None]:
    """
    Fetch HTML content for a widget using the stored content_url.

    The content_url is set when the widget is configured (from test API response).
    This function simply fetches the content from that URL.

    Returns: (html_content, error_message)
    """
    if not widget.content_url:
        return None, "No content URL configured. Please test the API and save the widget."

    # Fetch content from the stored URL
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.get(widget.content_url)
            response.raise_for_status()
            content = response.text
            return content, None
        except httpx.HTTPStatusError as e:
            return None, f"Failed to fetch content: status {e.response.status_code}"
        except httpx.RequestError as e:
            return None, f"Failed to fetch content: {str(e)}"


async def test_api_endpoint(
    api_endpoint: str,
    api_key: str | None = None,
    api_key_header: str = "X-API-Key",
    request_body: str | None = None,
) -> tuple[dict | list | None, str | None]:
    """
    Test an API endpoint and return the JSON response.

    Returns: (json_data, error_message)
    """
    return await call_api(
        endpoint=api_endpoint,
        api_key=api_key,
        api_key_header=api_key_header,
        request_body=request_body,
    )
