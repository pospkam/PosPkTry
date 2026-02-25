export interface MarkdownNewConvertOptions {
  method?: 'auto' | 'ai' | 'browser';
  retainImages?: boolean;
  timeoutMs?: number;
}

interface MarkdownJsonResponse {
  markdown?: string;
  content?: string;
  data?: string;
}

const DEFAULT_MARKDOWN_NEW_ENDPOINT = 'https://markdown.new/';
const DEFAULT_TIMEOUT_MS = 20000;

function normalizeUrl(url: string): string {
  const parsed = new URL(url);
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Only http/https URLs are supported');
  }
  return parsed.toString();
}

function resolveMarkdownEndpoint(): string {
  return process.env.MARKDOWN_NEW_ENDPOINT || DEFAULT_MARKDOWN_NEW_ENDPOINT;
}

export async function convertUrlToMarkdown(
  sourceUrl: string,
  options: MarkdownNewConvertOptions = {}
): Promise<string> {
  const normalizedUrl = normalizeUrl(sourceUrl);
  const endpoint = resolveMarkdownEndpoint();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs || DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: normalizedUrl,
        method: options.method || 'auto',
        retain_images: options.retainImages ?? false,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`markdown.new request failed with HTTP ${response.status}`);
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const json = (await response.json()) as MarkdownJsonResponse;
      const markdown = json.markdown || json.content || json.data;
      if (!markdown || !markdown.trim()) {
        throw new Error('markdown.new returned empty markdown payload');
      }
      return markdown;
    }

    const textBody = await response.text();
    if (!textBody.trim()) {
      throw new Error('markdown.new returned empty text payload');
    }
    return textBody;
  } finally {
    clearTimeout(timeoutId);
  }
}
