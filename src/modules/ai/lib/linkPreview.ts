import { native } from "./native";

export type LinkPreviewSeed = {
  url: string;
  host: string;
  path: string;
  kind: "file" | "remote";
};

export type LinkPreviewMeta = {
  title: string;
  description: string | null;
  imageUrl: string | null;
  siteName: string | null;
};

export const URL_RE = /\b(?:https?|file):\/\/[^\s<>"')\]]+/gi;

const previewCache = new Map<string, Promise<LinkPreviewMeta | null>>();
const HTML_PREVIEW_LIMIT = 256 * 1024;

export function cleanPreviewUrl(raw: string): string {
  return raw.replace(/[),.;:!?]+$/g, "");
}

export function extractLinkPreviewSeeds(text: string): LinkPreviewSeed[] {
  const seen = new Set<string>();
  const previews: LinkPreviewSeed[] = [];
  for (const match of text.matchAll(URL_RE)) {
    const url = cleanPreviewUrl(match[0]);
    if (seen.has(url)) continue;
    try {
      const parsed = new URL(url);
      const host =
        parsed.protocol === "file:" ? "Local file" : parsed.hostname || url;
      const path =
        parsed.protocol === "file:"
          ? decodeURIComponent(parsed.pathname)
          : `${parsed.pathname}${parsed.search}`;
      seen.add(url);
      previews.push({
        url,
        host,
        path: path && path !== "/" ? path : parsed.protocol.replace(":", ""),
        kind: parsed.protocol === "file:" ? "file" : "remote",
      });
    } catch {
      // Ignore malformed URLs. Raw message text still renders.
    }
  }
  return previews;
}

export async function loadLinkPreviewMeta(
  url: string,
): Promise<LinkPreviewMeta | null> {
  let cached = previewCache.get(url);
  if (!cached) {
    cached = fetchLinkPreviewMeta(url).catch(() => null);
    previewCache.set(url, cached);
  }
  return cached;
}

async function fetchLinkPreviewMeta(url: string): Promise<LinkPreviewMeta | null> {
  const parsed = new URL(url);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return null;
  }

  const response = await native.httpRequest(url, {
    method: "GET",
    headers: {
      Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.1",
    },
    allowPrivateNetwork: isLoopbackHost(parsed.hostname),
  });

  if (response.status >= 400) return null;
  const contentType = response.headers["content-type"] ?? "";
  if (!/html|xhtml/i.test(contentType)) return null;

  const bytes = Uint8Array.from(response.body.slice(0, HTML_PREVIEW_LIMIT));
  const html = new TextDecoder().decode(bytes);
  return parseLinkPreviewMeta(html, url);
}

function isLoopbackHost(hostname: string): boolean {
  const normalized = hostname.trim().toLowerCase();
  return (
    normalized === "localhost" ||
    normalized === "::1" ||
    normalized.startsWith("127.")
  );
}

export function parseLinkPreviewMeta(
  html: string,
  url: string,
): LinkPreviewMeta | null {
  const title =
    firstMetaContent(html, "property", "og:title") ??
    firstMetaContent(html, "name", "twitter:title") ??
    firstTagText(html, "title");
  const description =
    firstMetaContent(html, "property", "og:description") ??
    firstMetaContent(html, "name", "description") ??
    firstMetaContent(html, "name", "twitter:description");
  const siteName = firstMetaContent(html, "property", "og:site_name");
  const imageRaw =
    firstMetaContent(html, "property", "og:image") ??
    firstMetaContent(html, "name", "twitter:image");

  const normalizedTitle = title?.trim() ?? "";
  if (!normalizedTitle && !description && !imageRaw && !siteName) {
    return null;
  }

  return {
    title: normalizedTitle || siteName || new URL(url).hostname,
    description: description?.trim() || null,
    imageUrl: normalizeLinkedUrl(imageRaw, url),
    siteName: siteName?.trim() || null,
  };
}

function firstTagText(html: string, tag: string): string | null {
  const match = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, "i").exec(
    html,
  );
  return match?.[1]?.replace(/\s+/g, " ").trim() || null;
}

function firstMetaContent(
  html: string,
  attribute: "name" | "property",
  value: string,
): string | null {
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
  for (const tag of tags) {
    const attrs = parseTagAttributes(tag);
    if (attrs[attribute]?.toLowerCase() !== value.toLowerCase()) continue;
    const content = attrs.content?.trim();
    if (content) return content;
  }
  return null;
}

function parseTagAttributes(tag: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const attrRe =
    /([:@A-Za-z0-9_-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g;
  for (const match of tag.matchAll(attrRe)) {
    const key = match[1]?.toLowerCase();
    const value = match[2] ?? match[3] ?? match[4] ?? "";
    if (key) attrs[key] = value;
  }
  return attrs;
}

function normalizeLinkedUrl(value: string | null | undefined, baseUrl: string): string | null {
  if (!value) return null;
  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return null;
  }
}
