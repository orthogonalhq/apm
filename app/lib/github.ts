const GITHUB_API = "https://api.github.com";

interface GitHubSearchResult {
  totalCount: number;
  items: GitHubSearchItem[];
}

interface GitHubSearchItem {
  name: string;
  path: string;
  repository: {
    full_name: string;
    owner: { login: string };
    stargazers_count: number;
    license: { spdx_id: string } | null;
    default_branch: string;
  };
  sha: string;
}

interface GitHubFileContent {
  content: string;
  encoding: string;
  sha: string;
}

function headers(): HeadersInit {
  const h: HeadersInit = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "apm-indexer",
  };
  if (process.env.GITHUB_TOKEN) {
    h.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  return h;
}

export async function searchSkillFiles(
  page = 1,
  perPage = 100
): Promise<GitHubSearchResult> {
  const url = new URL(`${GITHUB_API}/search/code`);
  url.searchParams.set("q", "filename:SKILL.md");
  url.searchParams.set("per_page", String(perPage));
  url.searchParams.set("page", String(page));

  const res = await fetch(url.toString(), { headers: headers() });

  if (res.status === 403 || res.status === 429) {
    const retryAfter = res.headers.get("retry-after");
    throw new RateLimitError(
      `GitHub rate limit hit`,
      retryAfter ? parseInt(retryAfter, 10) : 60
    );
  }

  if (!res.ok) {
    throw new Error(`GitHub search failed: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  return {
    totalCount: data.total_count,
    items: data.items.map((item: Record<string, unknown>) => ({
      name: item.name,
      path: item.path,
      repository: item.repository,
      sha: item.sha,
    })),
  };
}

export async function getFileContent(
  repo: string,
  path: string,
  ref = "main"
): Promise<GitHubFileContent> {
  const url = `${GITHUB_API}/repos/${repo}/contents/${path}?ref=${ref}`;
  const res = await fetch(url, { headers: headers() });

  if (!res.ok) {
    throw new Error(
      `Failed to fetch ${repo}/${path}: ${res.status} ${res.statusText}`
    );
  }

  return res.json();
}

export async function checkFileExists(
  repo: string,
  path: string
): Promise<boolean> {
  const url = `${GITHUB_API}/repos/${repo}/contents/${path}`;
  const res = await fetch(url, {
    method: "HEAD",
    headers: headers(),
  });
  return res.ok;
}

export class RateLimitError extends Error {
  retryAfterSeconds: number;
  constructor(message: string, retryAfterSeconds: number) {
    super(message);
    this.name = "RateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}
