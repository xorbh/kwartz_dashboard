import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { fetchWidgetContent } from '../api/widgets';

interface HtmlWidgetProps {
  widgetId: string;
  name: string;
  onEdit?: () => void;
}

type ContentType = 'html' | 'markdown' | 'csv' | 'image' | 'unknown';

const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp', '.ico'];

function isImageUrl(url: string): boolean {
  const lowerUrl = url.toLowerCase().split('?')[0]; // Remove query params
  return IMAGE_EXTENSIONS.some(ext => lowerUrl.endsWith(ext));
}

function detectContentType(content: string, url?: string): ContentType {
  // Check URL extension first
  if (url) {
    const lowerUrl = url.toLowerCase().split('?')[0]; // Remove query params for extension check

    // Check for image extensions
    if (IMAGE_EXTENSIONS.some(ext => lowerUrl.endsWith(ext))) {
      return 'image';
    }
    if (lowerUrl.endsWith('.md') || lowerUrl.endsWith('.markdown')) {
      return 'markdown';
    }
    if (lowerUrl.endsWith('.csv')) {
      return 'csv';
    }
    if (lowerUrl.endsWith('.html') || lowerUrl.endsWith('.htm')) {
      return 'html';
    }
  }

  // Check content patterns
  const trimmed = content.trim();

  // HTML detection - starts with doctype or html tag
  if (trimmed.startsWith('<!DOCTYPE') ||
      trimmed.startsWith('<!doctype') ||
      trimmed.startsWith('<html') ||
      trimmed.startsWith('<HTML')) {
    return 'html';
  }

  // CSV detection - check for comma-separated structure
  const lines = trimmed.split('\n').slice(0, 5);
  if (lines.length >= 2) {
    const commasPerLine = lines.map(line => (line.match(/,/g) || []).length);
    const allSameCommas = commasPerLine.every(c => c === commasPerLine[0] && c > 0);
    if (allSameCommas && commasPerLine[0] >= 1) {
      return 'csv';
    }
  }

  // Markdown detection - check for common markdown patterns
  if (trimmed.startsWith('#') ||
      /^\*\*.*\*\*/.test(trimmed) ||
      /^[-*+] /.test(trimmed) ||
      /^\d+\. /.test(trimmed) ||
      /\[.*\]\(.*\)/.test(trimmed) ||
      /^```/.test(trimmed) ||
      /^>/.test(trimmed)) {
    return 'markdown';
  }

  // If it has HTML-like tags, assume HTML
  if (/<[a-z][\s\S]*>/i.test(trimmed)) {
    return 'html';
  }

  // Default to markdown for plain text
  return 'markdown';
}

function parseCSV(content: string): string[][] {
  const lines = content.trim().split('\n');
  return lines.map(line => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  });
}

function CSVTable({ data }: { data: string[][] }) {
  if (data.length === 0) return null;

  const headers = data[0];
  const rows = data.slice(1);

  return (
    <div className="csv-table-container">
      <table className="csv-table">
        <thead>
          <tr>
            {headers.map((header, i) => (
              <th key={i}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <td key={cellIndex}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="markdown-content">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}

function ImageContent({ url, name }: { url: string; name: string }) {
  const [imageError, setImageError] = useState(false);

  if (imageError) {
    return (
      <div className="widget-error">
        <span className="error-icon">⚠</span>
        <span className="error-message">Failed to load image</span>
      </div>
    );
  }

  return (
    <div className="image-content">
      <img
        src={url}
        alt={name}
        onError={() => setImageError(true)}
      />
    </div>
  );
}

function HtmlContent({ content, name }: { content: string; name: string }) {
  const [iframeRef, setIframeRef] = useState<HTMLIFrameElement | null>(null);

  useEffect(() => {
    if (iframeRef && content) {
      const doc = iframeRef.contentDocument || iframeRef.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(content);
        doc.close();
      }
    }
  }, [iframeRef, content]);

  return (
    <iframe
      ref={setIframeRef}
      title={name}
      sandbox="allow-scripts allow-same-origin"
      className="widget-iframe"
    />
  );
}

export function HtmlWidget({ widgetId, name, onEdit }: HtmlWidgetProps) {
  const [content, setContent] = useState<string | null>(null);
  const [contentUrl, setContentUrl] = useState<string | null>(null);
  const [contentType, setContentType] = useState<ContentType>('unknown');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadContent() {
      setLoading(true);
      setError(null);

      try {
        const result = await fetchWidgetContent(widgetId);
        if (cancelled) return;

        if (result.error) {
          setError(result.error);
          setContent(null);
          setContentUrl(null);
        } else {
          // Check if URL points to an image - if so, don't need html_content
          if (result.content_url && isImageUrl(result.content_url)) {
            setContentUrl(result.content_url);
            setContentType('image');
            setContent(null);
            setError(null);
          } else if (result.html_content) {
            setContent(result.html_content);
            setContentUrl(result.content_url);
            const detected = detectContentType(result.html_content, result.content_url || undefined);
            setContentType(detected);
            setError(null);
          } else {
            setError('No content received');
            setContent(null);
            setContentUrl(null);
          }
        }
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load content');
        setContent(null);
        setContentUrl(null);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadContent();

    return () => {
      cancelled = true;
    };
  }, [widgetId]);

  const renderContent = () => {
    switch (contentType) {
      case 'image':
        return contentUrl ? <ImageContent url={contentUrl} name={name} /> : null;
      case 'csv':
        return content ? <CSVTable data={parseCSV(content)} /> : null;
      case 'markdown':
        return content ? <MarkdownContent content={content} /> : null;
      case 'html':
      default:
        return content ? <HtmlContent content={content} name={name} /> : null;
    }
  };

  return (
    <div className="html-widget">
      <div className="widget-header">
        <span className="widget-title">{name}</span>
        <span className="widget-content-type">{contentType}</span>
        {onEdit && (
          <button className="widget-edit" onClick={onEdit} title="Edit widget">
            ⚙
          </button>
        )}
      </div>
      {loading ? (
        <div className="widget-loading">Loading...</div>
      ) : error ? (
        <div className="widget-error">
          <span className="error-icon">⚠</span>
          <span className="error-message">{error}</span>
        </div>
      ) : (
        <div className="widget-content">
          {renderContent()}
        </div>
      )}
    </div>
  );
}
