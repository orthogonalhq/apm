// ── Core package types ──

export type PackageKind = "skill" | "composite-skill" | "workflow" | "app";
export type PackageStatus = "active" | "deprecated" | "archived";

export interface Package {
  id: string;
  name: string;
  description: string;

  // Classification
  kind: PackageKind;
  category: string | null;
  tags: string[];
  compatibility: string[];

  // Source
  sourceRepo: string;
  sourcePath: string;
  sourceRef: string;
  repoUrl: string | null;
  homepageUrl: string | null;

  // Ownership
  repoOwner: string;
  author: string | null;
  repoStars: number;
  license: string | null;

  // Content
  version: string | null;
  skillMdRaw: string;
  frontmatter: Record<string, unknown>;
  allowedTools: string[];

  // Metrics
  tokenCount: number;
  fileCount: number;
  progressiveDisclosure: boolean;
  downloadCount: number;
  depCount: number;
  dependantCount: number;

  // Curation
  verified: boolean;
  featured: boolean;
  status: PackageStatus;
  hosted: boolean;

  // Timestamps
  lastUpdatedAt: string | null;
  firstIndexedAt: string;
  lastIndexedAt: string;
  lastCommitSha: string | null;
}

export interface PackageListItem {
  name: string;
  description: string;
  kind: PackageKind;
  category: string | null;
  tags: string[];
  compatibility: string[];
  sourceRepo: string;
  repoOwner: string;
  author: string | null;
  repoStars: number;
  license: string | null;
  tokenCount: number;
  downloadCount: number;
  verified: boolean;
  status: PackageStatus;
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
  license?: string;
  compatibility?: string;
  metadata?: Record<string, unknown>;
  "allowed-tools"?: string;
  [key: string]: unknown;
}

// ── Validation ──

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  frontmatter?: SkillFrontmatter;
}
