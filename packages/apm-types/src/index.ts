// ── Core package types ──

export interface Package {
  id: string;
  name: string;
  description: string;
  sourceRepo: string;
  sourcePath: string;
  sourceRef: string;
  repoOwner: string;
  repoStars: number;
  license: string | null;
  skillMdRaw: string;
  frontmatter: Record<string, unknown>;
  hosted: boolean;
  firstIndexedAt: string;
  lastIndexedAt: string;
  lastCommitSha: string | null;
}

export interface PackageListItem {
  name: string;
  description: string;
  sourceRepo: string;
  repoOwner: string;
  repoStars: number;
  license: string | null;
  lastIndexedAt: string;
}

// ── API response types ──

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface SearchResponse {
  results: PackageListItem[];
  total: number;
}

export interface IndexerResponse {
  indexed: number;
  skipped: number;
  errors: string[];
}

// ── SKILL.md frontmatter ──

export interface SkillFrontmatter {
  name: string;
  description: string;
  [key: string]: unknown;
}

// ── Validation ──

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  frontmatter?: SkillFrontmatter;
}
