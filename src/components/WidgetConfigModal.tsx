import { useState, useEffect } from 'react';
import type { Widget, WidgetCreate, WidgetUpdate } from '../api/widgets';
import { testWidgetApi } from '../api/widgets';

interface WidgetConfigModalProps {
  widget?: Widget | null;
  onSave: (data: WidgetCreate | WidgetUpdate) => void;
  onClose: () => void;
}

export function WidgetConfigModal({ widget, onSave, onClose }: WidgetConfigModalProps) {
  const [name, setName] = useState('');
  const [apiEndpoint, setApiEndpoint] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [apiKeyHeader, setApiKeyHeader] = useState('X-API-Key');
  const [reportId, setReportId] = useState('');
  const [responseUrlPath, setResponseUrlPath] = useState('url');
  const [contentUrl, setContentUrl] = useState('');
  const [saving, setSaving] = useState(false);

  // Test API state
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [testData, setTestData] = useState<unknown>(null);

  const isEditing = !!widget;

  useEffect(() => {
    if (widget) {
      setName(widget.name);
      setApiEndpoint(widget.api_endpoint);
      setApiKey('');
      setApiKeyHeader(widget.api_key_header || 'X-API-Key');
      setResponseUrlPath(widget.response_url_path);
      setContentUrl(widget.content_url || '');
      // Try to extract report_id from request_body
      if (widget.request_body) {
        try {
          const body = JSON.parse(widget.request_body);
          if (body.report_id) {
            setReportId(body.report_id);
          }
        } catch {
          // Ignore parse errors
        }
      }
    }
  }, [widget]);

  // Build request body JSON from report_id
  const getRequestBody = (): string => {
    if (!reportId.trim()) return '';
    return JSON.stringify({ report_id: reportId.trim() });
  };

  const handleTestApi = async () => {
    if (!apiEndpoint) {
      setTestError('Please enter an API endpoint first');
      return;
    }

    setTesting(true);
    setTestResult(null);
    setTestError(null);
    setTestData(null);

    try {
      const requestBody = getRequestBody();
      const result = await testWidgetApi(
        apiEndpoint,
        apiKey || undefined,
        apiKeyHeader,
        requestBody || undefined
      );
      if (result.error) {
        setTestError(result.error);
        setTestResult(null);
        setTestData(null);
      } else {
        setTestResult(JSON.stringify(result.data, null, 2));
        setTestData(result.data);
        setTestError(null);
      }
    } catch (err) {
      setTestError(err instanceof Error ? err.message : 'Failed to test API');
      setTestResult(null);
      setTestData(null);
    } finally {
      setTesting(false);
    }
  };

  // Extract value from data using dot notation path
  const extractValueFromPath = (data: unknown, path: string): string => {
    const keys = path.split('.');
    let result: unknown = data;
    for (const key of keys) {
      if (result && typeof result === 'object') {
        if (Array.isArray(result)) {
          const index = parseInt(key, 10);
          if (!isNaN(index)) {
            result = result[index];
          } else {
            return '';
          }
        } else {
          result = (result as Record<string, unknown>)[key];
        }
      } else {
        return '';
      }
    }
    return typeof result === 'string' ? result : '';
  };

  const handlePathClick = (path: string) => {
    setResponseUrlPath(path);
    // Extract the actual URL value from test data
    if (testData) {
      const url = extractValueFromPath(testData, path);
      if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
        setContentUrl(url);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const requestBody = getRequestBody();

      if (isEditing) {
        const data: WidgetUpdate = {
          name,
          api_endpoint: apiEndpoint,
          api_key_header: apiKeyHeader,
          request_body: requestBody,
          response_url_path: responseUrlPath,
          content_url: contentUrl,
        };
        if (apiKey) {
          data.api_key = apiKey;
        }
        onSave(data);
      } else {
        const data: WidgetCreate = {
          name,
          api_endpoint: apiEndpoint,
          api_key: apiKey,
          api_key_header: apiKeyHeader,
          request_body: requestBody,
          response_url_path: responseUrlPath,
          content_url: contentUrl,
        };
        onSave(data);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-split" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEditing ? 'Edit Widget' : 'Add Widget'}</h2>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="modal-body-split">
          {/* Left side - Form */}
          <form className="modal-form-panel" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="name">Widget Name</label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Customer Report"
                required
              />
            </div>

            <div className="form-section">
              <div className="form-section-title">API Configuration</div>

              <div className="form-group">
                <label htmlFor="apiEndpoint">API Endpoint</label>
                <input
                  id="apiEndpoint"
                  type="url"
                  value={apiEndpoint}
                  onChange={(e) => setApiEndpoint(e.target.value)}
                  placeholder="http://localhost:8006/api/external/reports/run"
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="apiKeyHeader">Header</label>
                  <input
                    id="apiKeyHeader"
                    type="text"
                    value={apiKeyHeader}
                    onChange={(e) => setApiKeyHeader(e.target.value)}
                    placeholder="X-API-Key"
                    style={{ width: '120px' }}
                  />
                </div>
                <div className="form-group form-group-grow">
                  <label htmlFor="apiKey">
                    API Key
                    {isEditing && widget?.api_key_masked && (
                      <span className="label-hint"> ({widget.api_key_masked})</span>
                    )}
                  </label>
                  <input
                    id="apiKey"
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={isEditing ? 'Leave blank to keep current' : 'kwz_...'}
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="reportId">Report ID</label>
                <input
                  id="reportId"
                  type="text"
                  value={reportId}
                  onChange={(e) => setReportId(e.target.value)}
                  placeholder="agent_customerreport_20260112_102503"
                />
                <span className="field-hint">
                  POST body: {`{"report_id": "${reportId || '...'}"}`}
                </span>
              </div>

              <button
                type="button"
                className="btn-primary btn-small"
                onClick={handleTestApi}
                disabled={testing || !apiEndpoint}
                style={{ width: '100%', marginTop: '8px' }}
              >
                {testing ? 'Testing...' : 'Test API'}
              </button>
            </div>

            <div className="form-section">
              <div className="form-section-title">Response Path</div>

              <div className="form-group">
                <label htmlFor="responseUrlPath">URL Path</label>
                <input
                  id="responseUrlPath"
                  type="text"
                  value={responseUrlPath}
                  onChange={(e) => setResponseUrlPath(e.target.value)}
                  placeholder="data.signed_url"
                  required
                />
                <span className="field-hint">
                  Click a key or URL in the response to set this
                </span>
              </div>

              {contentUrl && (
                <div className="form-group">
                  <label>Captured URL</label>
                  <div className="content-url-display">
                    {contentUrl.length > 50 ? contentUrl.substring(0, 50) + '...' : contentUrl}
                  </div>
                </div>
              )}
            </div>

            <div className="modal-actions">
              <button type="button" className="btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Add Widget'}
              </button>
            </div>
          </form>

          {/* Right side - API Response */}
          <div className="modal-response-panel">
            <div className="response-panel-header">
              <span>API Response</span>
              {testResult && (
                <span className="response-status success">OK</span>
              )}
              {testError && (
                <span className="response-status error">Error</span>
              )}
            </div>
            <div className="response-panel-content">
              {!testResult && !testError && !testing && (
                <div className="response-empty">
                  <span className="response-empty-icon">↙</span>
                  <span>Click "Test API" to see the response</span>
                </div>
              )}

              {testing && (
                <div className="response-empty">
                  <span>Testing...</span>
                </div>
              )}

              {testError && (
                <div className="test-error">
                  {testError}
                </div>
              )}

              {testResult && (
                <div className="json-viewer-container">
                  <JsonViewer
                    data={JSON.parse(testResult)}
                    onPathClick={handlePathClick}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Interactive JSON viewer component
interface JsonViewerProps {
  data: unknown;
  onPathClick: (path: string) => void;
  path?: string;
  depth?: number;
}

function JsonViewer({ data, onPathClick, path = '', depth = 0 }: JsonViewerProps) {
  if (data === null) {
    return <span className="json-null">null</span>;
  }

  if (typeof data === 'boolean') {
    return <span className="json-boolean">{data.toString()}</span>;
  }

  if (typeof data === 'number') {
    return <span className="json-number">{data}</span>;
  }

  if (typeof data === 'string') {
    const isUrl = data.startsWith('http://') || data.startsWith('https://');
    return (
      <span
        className={`json-string ${isUrl ? 'json-url' : ''}`}
        onClick={isUrl ? () => onPathClick(path) : undefined}
        title={isUrl ? `Click to use path: ${path}` : undefined}
      >
        "{data.length > 80 ? data.substring(0, 80) + '...' : data}"
      </span>
    );
  }

  if (Array.isArray(data)) {
    if (data.length === 0) {
      return <span className="json-bracket">[]</span>;
    }
    return (
      <span>
        <span className="json-bracket">[</span>
        <div className="json-indent">
          {data.map((item, index) => (
            <div key={index} className="json-row">
              <span className="json-index">{index}: </span>
              <JsonViewer
                data={item}
                onPathClick={onPathClick}
                path={path ? `${path}.${index}` : `${index}`}
                depth={depth + 1}
              />
              {index < data.length - 1 && <span className="json-comma">,</span>}
            </div>
          ))}
        </div>
        <span className="json-bracket">]</span>
      </span>
    );
  }

  if (typeof data === 'object') {
    const entries = Object.entries(data);
    if (entries.length === 0) {
      return <span className="json-bracket">{'{}'}</span>;
    }
    return (
      <span>
        <span className="json-bracket">{'{'}</span>
        <div className="json-indent">
          {entries.map(([key, value], index) => {
            const currentPath = path ? `${path}.${key}` : key;
            return (
              <div key={key} className="json-row">
                <span
                  className="json-key"
                  onClick={() => onPathClick(currentPath)}
                  title={`Click to use path: ${currentPath}`}
                >
                  "{key}"
                </span>
                <span className="json-colon">: </span>
                <JsonViewer
                  data={value}
                  onPathClick={onPathClick}
                  path={currentPath}
                  depth={depth + 1}
                />
                {index < entries.length - 1 && <span className="json-comma">,</span>}
              </div>
            );
          })}
        </div>
        <span className="json-bracket">{'}'}</span>
      </span>
    );
  }

  return <span>{String(data)}</span>;
}
