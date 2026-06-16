import { isTauriRuntime } from "@/lib/runtime";
import { native } from "@/modules/ai/lib/native";
import { invoke } from "@tauri-apps/api/core";

const GITHUB_SECRET_SERVICE = "javarf-home-dashboard";
const GITHUB_TOKEN_ACCOUNT = "github-access-token";
const GITHUB_CLIENT_ID_STORAGE_KEY = "javarf-home-dashboard:github-client-id";
const GITHUB_TOKEN_STORAGE_KEY = "javarf-home-dashboard:github-token-preview";
const DASHBOARD_PROXY_PATH = "/__dashboard_proxy__";
const GITHUB_DEVICE_CODE_URL = "https://github.com/login/device/code";
const GITHUB_ACCESS_TOKEN_URL = "https://github.com/login/oauth/access_token";
const GITHUB_USER_URL = "https://api.github.com/user";
const GITHUB_USER_REPOS_URL = "https://api.github.com/user/repos";
const GITHUB_SCOPE = "read:user user:email";

export type GitHubProfile = {
  login: string;
  name: string | null;
  avatarUrl: string;
  bio: string | null;
  company: string | null;
  location: string | null;
  email: string | null;
  blog: string | null;
  followers: number;
  following: number;
  publicRepos: number;
  publicGists: number;
  htmlUrl: string;
};

export type GitHubDeviceChallenge = {
  deviceCode: string;
  userCode: string;
  verificationUri: string;
  expiresIn: number;
  interval: number;
};

type GitHubDeviceCodeResponse = {
  device_code?: string;
  user_code?: string;
  verification_uri?: string;
  expires_in?: number;
  interval?: number;
  error?: string;
  error_description?: string;
};

type GitHubTokenResponse = {
  access_token?: string;
  token_type?: string;
  scope?: string;
  error?: string;
  error_description?: string;
  error_uri?: string;
  interval?: number;
};

type GitHubUserResponse = {
  login?: string;
  name?: string | null;
  avatar_url?: string;
  bio?: string | null;
  company?: string | null;
  location?: string | null;
  email?: string | null;
  blog?: string | null;
  followers?: number;
  following?: number;
  public_repos?: number;
  public_gists?: number;
  html_url?: string;
  message?: string;
};

type GitHubRepoResponse = {
  id?: number;
  name?: string;
  full_name?: string;
  html_url?: string;
  description?: string | null;
  language?: string | null;
  stargazers_count?: number;
  forks_count?: number;
  open_issues_count?: number;
  watchers_count?: number;
  pushed_at?: string | null;
  updated_at?: string | null;
  private?: boolean;
  archived?: boolean;
  fork?: boolean;
  languages_url?: string;
};

export type GitHubRepoSummary = {
  id: number;
  name: string;
  fullName: string;
  htmlUrl: string;
  description: string | null;
  language: string | null;
  stargazers: number;
  forks: number;
  openIssues: number;
  watchers: number;
  pushedAt: number;
  updatedAt: number;
  isPrivate: boolean;
  isArchived: boolean;
  isFork: boolean;
};

export type GitHubLanguageStat = {
  name: string;
  bytes: number;
  percent: number;
  repoCount: number;
  color: string;
};

export type GitHubDashboardData = {
  repositories: GitHubRepoSummary[];
  topRepositories: GitHubRepoSummary[];
  languages: GitHubLanguageStat[];
  languageTotalBytes: number;
  totals: {
    repoCount: number;
    stars: number;
    forks: number;
    openIssues: number;
    watchers: number;
    activeRepos: number;
  };
  updatedAt: number;
};

export type DashboardNewsLanguage = "en" | "pt";
export type DashboardNewsKind = "cyber" | "dev";

export type DashboardNewsSource = {
  id: string;
  name: string;
  siteUrl: string;
  feedUrl: string;
  language: DashboardNewsLanguage;
  kind: DashboardNewsKind;
  accent: string;
};

export type DashboardNewsItem = {
  id: string;
  title: string;
  summary: string;
  link: string;
  imageUrl: string | null;
  publishedAt: number;
  language: DashboardNewsLanguage;
  kind: DashboardNewsKind;
  sourceId: string;
  sourceName: string;
  sourceUrl: string;
  accent: string;
};

export const DASHBOARD_NEWS_SOURCES: DashboardNewsSource[] = [
  {
    id: "thn",
    name: "The Hacker News",
    siteUrl: "https://thehackernews.com",
    feedUrl: "https://feeds.feedburner.com/TheHackersNews",
    language: "en",
    kind: "cyber",
    accent: "#ff9f68",
  },
  {
    id: "infoq",
    name: "InfoQ",
    siteUrl: "https://www.infoq.com",
    feedUrl: "https://www.infoq.com/feed/",
    language: "en",
    kind: "dev",
    accent: "#00f0ff",
  },
  {
    id: "tecmundo",
    name: "TecMundo",
    siteUrl: "https://www.tecmundo.com.br",
    feedUrl: "https://rss.tecmundo.com.br/feed",
    language: "pt",
    kind: "dev",
    accent: "#7df4ff",
  },
  {
    id: "pridesec",
    name: "PRIDE Security",
    siteUrl: "https://blog.pridesec.com.br/br/",
    feedUrl: "https://blog.pridesec.com.br/br/rss/",
    language: "pt",
    kind: "cyber",
    accent: "#e94560",
  },
];

export const PREVIEW_NEWS_ITEMS: DashboardNewsItem[] = [
  {
    id: "preview:pt-cyber",
    title: "Curadoria PT-BR destaca CVEs críticos, PoCs públicas e exploração ativa",
    summary:
      "Painel de preview para quando feed remoto falha. No app desktop, esta coluna troca para manchetes reais dos feeds configurados.",
    link: "https://blog.pridesec.com.br/br/",
    imageUrl: null,
    publishedAt: Date.now(),
    language: "pt",
    kind: "cyber",
    sourceId: "preview-pridesec",
    sourceName: "PRIDE Security",
    sourceUrl: "https://blog.pridesec.com.br/br/",
    accent: "#e94560",
  },
  {
    id: "preview:en-dev",
    title: "Agent infra and developer tooling still dominate this week's feed",
    summary:
      "Fallback preview keeps layout alive in browser mode. Desktop runtime fetches live English and Portuguese dev or cyber news.",
    link: "https://www.infoq.com/",
    imageUrl: null,
    publishedAt: Date.now() - 60_000,
    language: "en",
    kind: "dev",
    sourceId: "preview-infoq",
    sourceName: "InfoQ",
    sourceUrl: "https://www.infoq.com/",
    accent: "#00f0ff",
  },
];

export function readStoredGithubClientId(): string {
  if (typeof window === "undefined") return "";
  try {
    return (
      window.localStorage.getItem(GITHUB_CLIENT_ID_STORAGE_KEY) ??
      import.meta.env.VITE_GITHUB_OAUTH_CLIENT_ID ??
      ""
    ).trim();
  } catch {
    return (import.meta.env.VITE_GITHUB_OAUTH_CLIENT_ID ?? "").trim();
  }
}

export function storeGithubClientId(value: string): void {
  if (typeof window === "undefined") return;
  try {
    if (value.trim()) {
      window.localStorage.setItem(GITHUB_CLIENT_ID_STORAGE_KEY, value.trim());
      return;
    }
    window.localStorage.removeItem(GITHUB_CLIENT_ID_STORAGE_KEY);
  } catch {
    // ignore storage failures
  }
}

export async function restoreGithubSession(): Promise<GitHubProfile | null> {
  const token = await readStoredGithubToken();
  if (!token) return null;
  try {
    return await fetchGithubProfile(token);
  } catch {
    await clearStoredGithubToken();
    return null;
  }
}

export async function requestGithubDeviceChallenge(
  clientId: string,
): Promise<GitHubDeviceChallenge> {
  const payload = new URLSearchParams({
    client_id: clientId.trim(),
    scope: GITHUB_SCOPE,
  }).toString();
  const response = await requestJson<GitHubDeviceCodeResponse>(GITHUB_DEVICE_CODE_URL, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "Terax-AI-HomeDashboard",
    },
    body: payload,
  });

  if (!response.device_code || !response.user_code || !response.verification_uri) {
    throw new Error(
      response.error_description ??
        response.error ??
        "GitHub device flow did not return a usable challenge.",
    );
  }

  return {
    deviceCode: response.device_code,
    userCode: response.user_code,
    verificationUri: response.verification_uri,
    expiresIn: response.expires_in ?? 900,
    interval: response.interval ?? 5,
  };
}

export async function finishGithubDeviceFlow(
  clientId: string,
  challenge: GitHubDeviceChallenge,
  signal?: AbortSignal,
): Promise<GitHubProfile> {
  let intervalMs = Math.max(challenge.interval, 5) * 1_000;
  const expiresAt = Date.now() + challenge.expiresIn * 1_000;
  const payload = new URLSearchParams({
    client_id: clientId.trim(),
    device_code: challenge.deviceCode,
    grant_type: "urn:ietf:params:oauth:grant-type:device_code",
  }).toString();

  while (Date.now() < expiresAt) {
    await wait(intervalMs, signal);

    const response = await requestJson<GitHubTokenResponse>(GITHUB_ACCESS_TOKEN_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Terax-AI-HomeDashboard",
      },
      body: payload,
    });

    if (response.access_token) {
      await writeStoredGithubToken(response.access_token);
      return fetchGithubProfile(response.access_token);
    }

    if (response.error === "authorization_pending") {
      continue;
    }

    if (response.error === "slow_down") {
      intervalMs = Math.max(intervalMs + 5_000, (response.interval ?? challenge.interval + 5) * 1_000);
      continue;
    }

    if (response.error === "expired_token") {
      throw new Error("GitHub device code expired. Start the OAuth flow again.");
    }

    if (response.error === "access_denied") {
      throw new Error("GitHub authorization was denied.");
    }

    throw new Error(response.error_description ?? response.error ?? "GitHub OAuth failed.");
  }

  throw new Error("GitHub device code expired. Start the OAuth flow again.");
}

export async function disconnectGithubSession(): Promise<void> {
  await clearStoredGithubToken();
}

export async function fetchGithubProfile(token: string): Promise<GitHubProfile> {
  const response = await requestJson<GitHubUserResponse>(GITHUB_USER_URL, {
    headers: githubAuthHeaders(token),
  });

  if (!response.login || !response.avatar_url || !response.html_url) {
    throw new Error(response.message ?? "GitHub profile response is incomplete.");
  }

  return {
    login: response.login,
    name: response.name ?? null,
    avatarUrl: response.avatar_url,
    bio: response.bio ?? null,
    company: response.company ?? null,
    location: response.location ?? null,
    email: response.email ?? null,
    blog: response.blog ?? null,
    followers: response.followers ?? 0,
    following: response.following ?? 0,
    publicRepos: response.public_repos ?? 0,
    publicGists: response.public_gists ?? 0,
    htmlUrl: response.html_url,
  };
}

export async function fetchGithubDashboardData(): Promise<GitHubDashboardData | null> {
  const token = await readStoredGithubToken();
  if (!token) return null;

  const repositories = await fetchGithubRepositories(token);
  const languageMaps = await fetchGithubLanguageMaps(token, repositories);
  return buildGithubDashboardData(repositories, languageMaps);
}

export async function fetchDashboardNews(): Promise<DashboardNewsItem[]> {
  const results = await Promise.allSettled(
    DASHBOARD_NEWS_SOURCES.map(async (source) => {
      const xml = await requestText(source.feedUrl, {
        headers: {
          Accept: "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.1",
          "User-Agent": "Terax-AI-HomeDashboard",
        },
      });
      return parseDashboardFeed(xml, source);
    }),
  );

  const items = results
    .flatMap((result) => (result.status === "fulfilled" ? result.value : []))
    .filter((item) => item.title && item.link)
    .sort((left, right) => right.publishedAt - left.publishedAt);

  if (items.length === 0) {
    return PREVIEW_NEWS_ITEMS;
  }

  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.link)) return false;
    seen.add(item.link);
    return true;
  });
}

function parseDashboardFeed(
  xml: string,
  source: DashboardNewsSource,
): DashboardNewsItem[] {
  if (typeof DOMParser === "undefined") return [];
  const doc = new DOMParser().parseFromString(xml, "text/xml");
  if (doc.querySelector("parsererror")) return [];

  return Array.from(doc.getElementsByTagName("item"))
    .map((item, index) => {
      const title = firstNodeText(item, ["title"]);
      const link = normalizeUrl(firstNodeText(item, ["link"]), source.siteUrl);
      const descriptionHtml =
        firstNodeText(item, ["content:encoded", "description"]) ?? "";
      const summary = excerptText(htmlToText(descriptionHtml), 220);
      const imageUrl =
        normalizeUrl(
          firstNodeAttr(item, ["media:content", "media:thumbnail", "content"], "url"),
          source.siteUrl,
        ) ??
        normalizeUrl(
          firstNodeAttr(item, ["media:content", "media:thumbnail", "content"], "href"),
          source.siteUrl,
        ) ??
        normalizeUrl(firstNodeAttr(item, ["enclosure"], "url"), source.siteUrl) ??
        extractImageFromHtml(descriptionHtml, source.siteUrl);
      const publishedRaw = firstNodeText(item, ["dc:date", "pubDate"]);
      const publishedAt = publishedRaw ? Date.parse(publishedRaw) : 0;

      if (!title || !link) return null;

      return {
        id: `${source.id}:${index}:${link}`,
        title,
        summary:
          summary ||
          (source.language === "pt"
            ? "Resumo indisponível. Abra no navegador integrado para ler a matéria completa."
            : "Summary unavailable. Open in the integrated browser for the full story."),
        link,
        imageUrl,
        publishedAt: Number.isFinite(publishedAt) ? publishedAt : 0,
        language: source.language,
        kind: source.kind,
        sourceId: source.id,
        sourceName: source.name,
        sourceUrl: source.siteUrl,
        accent: source.accent,
      } satisfies DashboardNewsItem;
    })
    .filter((item): item is DashboardNewsItem => item !== null);
}

function firstNodeText(node: Element, names: string[]): string | null {
  for (const name of names) {
    const match = node.getElementsByTagName(name)[0];
    const value = match?.textContent?.replace(/\s+/g, " ").trim();
    if (value) return value;
  }
  return null;
}

function firstNodeAttr(
  node: Element,
  names: string[],
  attr: string,
): string | null {
  for (const name of names) {
    const match = node.getElementsByTagName(name)[0];
    const value = match?.getAttribute(attr)?.trim();
    if (value) return value;
  }
  return null;
}

function extractImageFromHtml(html: string, baseUrl: string): string | null {
  if (!html) return null;
  if (typeof DOMParser === "undefined") return null;
  const doc = new DOMParser().parseFromString(html, "text/html");
  const candidates = [
    doc.querySelector("meta[property='og:image']")?.getAttribute("content"),
    doc.querySelector("meta[name='twitter:image']")?.getAttribute("content"),
    doc.querySelector("img")?.getAttribute("src"),
    doc.querySelector("img")?.getAttribute("data-src"),
    doc.querySelector("img")?.getAttribute("data-lazy-src"),
    doc.querySelector("img")?.getAttribute("data-original"),
    doc.querySelector("img")?.getAttribute("data-url"),
    firstSrcsetUrl(doc.querySelector("img")?.getAttribute("srcset")),
    firstSrcsetUrl(doc.querySelector("img")?.getAttribute("data-srcset")),
    firstSrcsetUrl(doc.querySelector("source")?.getAttribute("srcset")),
  ];
  for (const candidate of candidates) {
    const normalized = normalizeUrl(candidate?.trim() ?? null, baseUrl);
    if (normalized) return normalized;
  }
  return null;
}

function firstSrcsetUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  const first = value
    .split(",")[0]
    ?.trim()
    .split(/\s+/)[0];
  return first?.trim() || null;
}

function htmlToText(html: string): string {
  if (!html) return "";
  if (typeof DOMParser === "undefined") {
    return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  }
  const doc = new DOMParser().parseFromString(html, "text/html");
  for (const node of doc.querySelectorAll("script, style, noscript, template")) {
    node.remove();
  }
  return doc.body.textContent?.replace(/\s+/g, " ").trim() ?? "";
}

function excerptText(value: string, limit: number): string {
  const trimmed = value.trim();
  if (trimmed.length <= limit) return trimmed;
  return `${trimmed.slice(0, limit).replace(/\s+\S*$/, "").trim()}...`;
}

function normalizeUrl(value: string | null, baseUrl: string): string | null {
  if (!value) return null;
  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return null;
  }
}

async function fetchGithubRepositories(token: string): Promise<GitHubRepoResponse[]> {
  const pages: GitHubRepoResponse[] = [];

  for (let page = 1; page <= 10; page += 1) {
    const url = new URL(GITHUB_USER_REPOS_URL);
    url.searchParams.set("per_page", "100");
    url.searchParams.set("page", String(page));
    url.searchParams.set("sort", "updated");
    url.searchParams.set("direction", "desc");
    url.searchParams.set("visibility", "all");

    const batch = await requestJson<GitHubRepoResponse[]>(url.toString(), {
      headers: githubAuthHeaders(token),
    });

    if (!Array.isArray(batch) || batch.length === 0) {
      break;
    }

    pages.push(...batch);
    if (batch.length < 100) {
      break;
    }
  }

  const seen = new Set<number>();
  return pages.filter((repo) => {
    if (!repo.id || seen.has(repo.id)) return false;
    seen.add(repo.id);
    return Boolean(repo.name && repo.full_name && repo.html_url);
  });
}

async function fetchGithubLanguageMaps(
  token: string,
  repositories: GitHubRepoResponse[],
): Promise<Array<Record<string, number>>> {
  if (repositories.length === 0) return [];

  const results = new Array<Record<string, number>>(repositories.length);
  let nextIndex = 0;
  const workerCount = Math.min(6, repositories.length);

  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (nextIndex < repositories.length) {
        const currentIndex = nextIndex;
        nextIndex += 1;
        const repo = repositories[currentIndex];

        if (!repo.languages_url) {
          results[currentIndex] = buildFallbackLanguageMap(repo.language);
          continue;
        }

        try {
          results[currentIndex] = await requestJson<Record<string, number>>(repo.languages_url, {
            headers: githubAuthHeaders(token),
          });
        } catch {
          results[currentIndex] = buildFallbackLanguageMap(repo.language);
        }
      }
    }),
  );

  return results;
}

function buildGithubDashboardData(
  repositories: GitHubRepoResponse[],
  languageMaps: Array<Record<string, number>>,
): GitHubDashboardData {
  const normalizedRepositories = repositories
    .map(normalizeGithubRepository)
    .sort((left, right) => {
      if (right.pushedAt !== left.pushedAt) return right.pushedAt - left.pushedAt;
      return right.updatedAt - left.updatedAt;
    });

  const totals = normalizedRepositories.reduce(
    (acc, repo) => {
      acc.repoCount += 1;
      acc.stars += repo.stargazers;
      acc.forks += repo.forks;
      acc.openIssues += repo.openIssues;
      acc.watchers += repo.watchers;
      if (!repo.isArchived) {
        acc.activeRepos += 1;
      }
      return acc;
    },
    {
      repoCount: 0,
      stars: 0,
      forks: 0,
      openIssues: 0,
      watchers: 0,
      activeRepos: 0,
    },
  );

  const languageMap = new Map<string, { bytes: number; repoCount: number }>();
  normalizedRepositories.forEach((repo, index) => {
    const languageEntries = Object.entries(languageMaps[index] ?? {}).filter(
      ([name, bytes]) => name.trim().length > 0 && Number.isFinite(bytes) && bytes > 0,
    );

    if (languageEntries.length === 0) {
      if (!repo.language) return;
      const next = languageMap.get(repo.language) ?? { bytes: 0, repoCount: 0 };
      next.bytes += 1;
      next.repoCount += 1;
      languageMap.set(repo.language, next);
      return;
    }

    const seenLanguages = new Set<string>();
    for (const [name, bytes] of languageEntries) {
      const next = languageMap.get(name) ?? { bytes: 0, repoCount: 0 };
      next.bytes += bytes;
      if (!seenLanguages.has(name)) {
        next.repoCount += 1;
        seenLanguages.add(name);
      }
      languageMap.set(name, next);
    }
  });

  const languageTotalBytes = Array.from(languageMap.values()).reduce(
    (sum, entry) => sum + entry.bytes,
    0,
  );

  const languages = Array.from(languageMap.entries())
    .map(([name, entry]) => ({
      name,
      bytes: entry.bytes,
      percent: languageTotalBytes > 0 ? (entry.bytes / languageTotalBytes) * 100 : 0,
      repoCount: entry.repoCount,
      color: githubLanguageColor(name),
    }))
    .sort((left, right) => {
      if (right.bytes !== left.bytes) return right.bytes - left.bytes;
      return left.name.localeCompare(right.name);
    });

  const topRepositories = [...normalizedRepositories]
    .sort((left, right) => {
      const leftScore = repositoryHighlightScore(left);
      const rightScore = repositoryHighlightScore(right);
      if (rightScore !== leftScore) return rightScore - leftScore;
      return right.updatedAt - left.updatedAt;
    })
    .slice(0, 6);

  return {
    repositories: normalizedRepositories,
    topRepositories,
    languages,
    languageTotalBytes,
    totals,
    updatedAt: Date.now(),
  };
}

function normalizeGithubRepository(repo: GitHubRepoResponse): GitHubRepoSummary {
  return {
    id: repo.id ?? 0,
    name: repo.name ?? "",
    fullName: repo.full_name ?? repo.name ?? "",
    htmlUrl: repo.html_url ?? "",
    description: repo.description ?? null,
    language: repo.language ?? null,
    stargazers: repo.stargazers_count ?? 0,
    forks: repo.forks_count ?? 0,
    openIssues: repo.open_issues_count ?? 0,
    watchers: repo.watchers_count ?? 0,
    pushedAt: toTimestamp(repo.pushed_at),
    updatedAt: toTimestamp(repo.updated_at),
    isPrivate: repo.private === true,
    isArchived: repo.archived === true,
    isFork: repo.fork === true,
  };
}

function repositoryHighlightScore(repo: GitHubRepoSummary): number {
  const engagement = repo.stargazers * 8 + repo.watchers * 5 + repo.forks * 3 + repo.openIssues;
  const ageDays =
    repo.updatedAt > 0 ? Math.max(0, Math.floor((Date.now() - repo.updatedAt) / 86_400_000)) : 999;
  const recencyBoost = Math.max(0, 40 - Math.min(ageDays, 40));
  return engagement + recencyBoost;
}

function buildFallbackLanguageMap(language: string | null | undefined): Record<string, number> {
  if (!language) return {};
  return { [language]: 1 };
}

function toTimestamp(value: string | null | undefined): number {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function githubLanguageColor(name: string): string {
  const knownColors: Record<string, string> = {
    TypeScript: "#3178c6",
    JavaScript: "#f1e05a",
    Java: "#b07219",
    Kotlin: "#a97bff",
    Python: "#3572A5",
    Rust: "#dea584",
    Go: "#00ADD8",
    C: "#555555",
    "C++": "#f34b7d",
    CSharp: "#178600",
    "C#": "#178600",
    Shell: "#89e051",
    HTML: "#e34c26",
    CSS: "#563d7c",
    SCSS: "#c6538c",
    Swift: "#f05138",
    PHP: "#4F5D95",
    Ruby: "#701516",
    Dart: "#00B4AB",
    Vue: "#41b883",
    Svelte: "#ff3e00",
  };

  const known = knownColors[name];
  if (known) return known;

  let hash = 0;
  for (const char of name) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return `hsl(${hash % 360} 68% 56%)`;
}

async function readStoredGithubToken(): Promise<string | null> {
  if (isTauriRuntime) {
    try {
      const token = await invoke<string | null>("secrets_get", {
        service: GITHUB_SECRET_SERVICE,
        account: GITHUB_TOKEN_ACCOUNT,
      });
      return token?.trim() || null;
    } catch {
      return null;
    }
  }

  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(GITHUB_TOKEN_STORAGE_KEY)?.trim() || null;
  } catch {
    return null;
  }
}

async function writeStoredGithubToken(token: string): Promise<void> {
  const trimmed = token.trim();
  if (!trimmed) return;

  if (isTauriRuntime) {
    await invoke("secrets_set", {
      service: GITHUB_SECRET_SERVICE,
      account: GITHUB_TOKEN_ACCOUNT,
      password: trimmed,
    });
    return;
  }

  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(GITHUB_TOKEN_STORAGE_KEY, trimmed);
  } catch {
    // ignore storage failures
  }
}

async function clearStoredGithubToken(): Promise<void> {
  if (isTauriRuntime) {
    try {
      await invoke("secrets_delete", {
        service: GITHUB_SECRET_SERVICE,
        account: GITHUB_TOKEN_ACCOUNT,
      });
    } catch {
      // ignore secure storage failures
    }
    return;
  }

  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(GITHUB_TOKEN_STORAGE_KEY);
  } catch {
    // ignore storage failures
  }
}

function githubAuthHeaders(token: string): Record<string, string> {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "User-Agent": "Terax-AI-HomeDashboard",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

async function wait(ms: number, signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) {
    throw new DOMException("Aborted", "AbortError");
  }
  await new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      cleanup();
      resolve();
    }, ms);

    const handleAbort = () => {
      cleanup();
      reject(new DOMException("Aborted", "AbortError"));
    };

    const cleanup = () => {
      window.clearTimeout(timer);
      signal?.removeEventListener("abort", handleAbort);
    };

    signal?.addEventListener("abort", handleAbort, { once: true });
  });
}

async function requestText(
  url: string,
  options?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  },
): Promise<string> {
  if (isTauriRuntime) {
    const response = await native.httpRequest(url, {
      method: options?.method,
      headers: options?.headers,
      body: options?.body ? new TextEncoder().encode(options.body) : null,
    });

    const text = new TextDecoder().decode(Uint8Array.from(response.body));
    if (response.status >= 400) {
      throw new Error(extractHttpError(text, response.status));
    }
    return text;
  }

  const requestUrl = shouldUseDashboardProxy()
    ? new URL(DASHBOARD_PROXY_PATH, window.location.origin).toString()
    : url;
  const response = await fetch(requestUrl, shouldUseDashboardProxy()
    ? {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url,
          method: options?.method ?? "GET",
          headers: options?.headers,
          body: options?.body ?? null,
        }),
      }
    : {
        method: options?.method ?? "GET",
        headers: options?.headers,
        body: options?.body,
      });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(extractHttpError(text, response.status));
  }
  return text;
}

async function requestJson<T>(
  url: string,
  options?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  },
): Promise<T> {
  const text = await requestText(url, options);
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("Remote service returned invalid JSON.");
  }
}

function extractHttpError(body: string, status: number): string {
  try {
    const parsed = JSON.parse(body) as {
      error?: string;
      error_description?: string;
      message?: string;
    };
    return (
      parsed.error_description ??
      parsed.message ??
      parsed.error ??
      `Request failed with status ${status}.`
    );
  } catch {
    return body.trim() || `Request failed with status ${status}.`;
  }
}

function shouldUseDashboardProxy(): boolean {
  if (typeof window === "undefined" || isTauriRuntime) return false;
  const host = window.location.hostname.toLowerCase();
  return host === "localhost" || host === "::1" || host.startsWith("127.");
}
