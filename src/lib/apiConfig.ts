/**
 * VIDYA API Configuration & Response Handling
 * Supports unified same-origin deployments (/api/*) and split-origin deployments via VITE_API_URL.
 * Provides safe JSON parsing with clear diagnostics when HTML or non-JSON is returned.
 */

/**
 * Returns a sanitized base URL for API requests.
 * Drops surrounding quotation marks, handles empty/whitespace values, and ignores
 * dummy example placeholders (e.g. "api.vidya.edu", "example.com") so they safely default
 * to same-origin relative URLs (/api/*).
 */
export function getCleanApiBaseUrl(): string {
  if (typeof import.meta === 'undefined' || !import.meta.env) return '';
  const raw = import.meta.env.VITE_API_URL;
  if (!raw || typeof raw !== 'string') return '';

  // Strip leading and trailing quotes (e.g. "\"https://api.vidya.edu\"" -> "https://api.vidya.edu")
  const stripped = raw.replace(/^["']+|["']+$/g, '').trim().replace(/\/$/, '');

  // Ignore empty or dummy documentation/example placeholders from .env.example
  if (
    !stripped ||
    stripped.includes('api.vidya.edu') ||
    stripped.includes('example.com') ||
    stripped.includes('YOUR_API_URL') ||
    stripped.toLowerCase() === 'undefined' ||
    stripped.toLowerCase() === 'null'
  ) {
    return '';
  }

  // If in browser and points to current window origin, keep relative
  if (typeof window !== 'undefined' && stripped === window.location.origin) {
    return '';
  }

  // Only use if it is an explicit absolute http or https URL
  if (stripped.startsWith('http://') || stripped.startsWith('https://')) {
    return stripped;
  }

  return '';
}

export const API_BASE_URL: string = getCleanApiBaseUrl();

/**
 * Resolves an API endpoint path to the full URL, respecting VITE_API_URL only if valid and reachable.
 * @example apiUrl('/api/admin/academic-performance') -> '/api/admin/academic-performance'
 */
export function apiUrl(endpoint: string): string {
  const cleanPath = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const base = getCleanApiBaseUrl();
  return `${base}${cleanPath}`;
}

export interface ParsedApiResponse<T = any> {
  ok: boolean;
  status: number;
  data: T | null;
  error: string | null;
  isHtml: boolean;
  contentType: string;
}

/**
 * Safely inspects and parses an HTTP Response object.
 * Guards against SyntaxError when a server or SPA fallback returns HTML instead of JSON.
 * Returns a detailed diagnostic error message with status, Content-Type, and preview when not JSON.
 */
export async function parseApiResponse<T = any>(
  res: Response,
  endpointDescription = 'API endpoint'
): Promise<ParsedApiResponse<T>> {
  const status = res.status;
  const contentType = res.headers.get('content-type') || '';
  const isJson = contentType.toLowerCase().includes('application/json');

  if (!isJson) {
    const rawText = await res.text().catch(() => '');
    const isHtml =
      contentType.toLowerCase().includes('text/html') ||
      rawText.trim().startsWith('<!doctype') ||
      rawText.trim().startsWith('<html');
    const preview = rawText.replace(/\s+/g, ' ').trim().slice(0, 150);

    const diagnostic = isHtml
      ? `${endpointDescription} returned an HTML document instead of JSON (HTTP ${status}, Content-Type: "${contentType}"). This indicates an unexpected SPA rewrite, proxy fallback, or misconfigured route: "${preview}..."`
      : `${endpointDescription} returned non-JSON response (HTTP ${status}, Content-Type: "${contentType}"): "${preview}..."`;

    return {
      ok: false,
      status,
      data: null,
      error: diagnostic,
      isHtml,
      contentType,
    };
  }

  try {
    const json = await res.json();
    return {
      ok: res.ok,
      status,
      data: json,
      error: res.ok ? null : (json?.error || json?.message || `Request failed with status ${status}`),
      isHtml: false,
      contentType,
    };
  } catch (parseErr: any) {
    return {
      ok: false,
      status,
      data: null,
      error: `Failed to parse JSON response from ${endpointDescription} (HTTP ${status}): ${parseErr?.message || String(parseErr)}`,
      isHtml: false,
      contentType,
    };
  }
}
