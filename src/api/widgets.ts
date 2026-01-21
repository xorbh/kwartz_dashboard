const API_BASE = 'http://localhost:8000/api';

export interface Layout {
  x: number;
  y: number;
  w: number;
  h: number;
  minW: number;
  minH: number;
}

export interface Widget {
  id: string;
  name: string;
  api_endpoint: string;
  api_key_masked: string;
  api_key_header: string;
  request_body: string;
  response_url_path: string;
  content_url: string;
  layout: Layout;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface WidgetCreate {
  name: string;
  api_endpoint: string;
  api_key?: string;
  api_key_header?: string;
  request_body?: string;
  response_url_path: string;
  content_url: string;
  layout?: Partial<Layout>;
}

export interface WidgetUpdate {
  name?: string;
  api_endpoint?: string;
  api_key?: string;
  api_key_header?: string;
  request_body?: string;
  response_url_path?: string;
  content_url?: string;
  layout?: Layout;
  enabled?: boolean;
}

export interface WidgetContent {
  id: string;
  name: string;
  content_url: string | null;
  html_content: string | null;
  error: string | null;
}

export async function fetchWidgets(): Promise<Widget[]> {
  const response = await fetch(`${API_BASE}/widgets`);
  if (!response.ok) {
    throw new Error(`Failed to fetch widgets: ${response.status}`);
  }
  return response.json();
}

export async function createWidget(data: WidgetCreate): Promise<Widget> {
  const response = await fetch(`${API_BASE}/widgets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error(`Failed to create widget: ${response.status}`);
  }
  return response.json();
}

export async function updateWidget(id: string, data: WidgetUpdate): Promise<Widget> {
  const response = await fetch(`${API_BASE}/widgets/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error(`Failed to update widget: ${response.status}`);
  }
  return response.json();
}

export async function deleteWidget(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/widgets/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error(`Failed to delete widget: ${response.status}`);
  }
}

export async function fetchWidgetContent(id: string): Promise<WidgetContent> {
  const response = await fetch(`${API_BASE}/widgets/${id}/content`);
  if (!response.ok) {
    throw new Error(`Failed to fetch widget content: ${response.status}`);
  }
  return response.json();
}

export async function bulkUpdateLayout(
  widgets: Array<{ id: string; layout: Layout }>
): Promise<void> {
  const response = await fetch(`${API_BASE}/widgets/layout/bulk`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ widgets }),
  });
  if (!response.ok) {
    throw new Error(`Failed to update layouts: ${response.status}`);
  }
}

export interface TestApiResult {
  data: unknown;
  error: string | null;
}

export async function testWidgetApi(
  apiEndpoint: string,
  apiKey?: string,
  apiKeyHeader?: string,
  requestBody?: string
): Promise<TestApiResult> {
  const response = await fetch(`${API_BASE}/widgets/test-api`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_endpoint: apiEndpoint,
      api_key: apiKey,
      api_key_header: apiKeyHeader || 'X-API-Key',
      request_body: requestBody,
    }),
  });
  if (!response.ok) {
    throw new Error(`Failed to test API: ${response.status}`);
  }
  return response.json();
}
