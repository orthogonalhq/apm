/**
 * Reserved scopes — pre-created at launch to prevent squatting.
 * Each maps a scope name to the GitHub org it's reserved for.
 */
export const RESERVED_SCOPES: Record<string, string> = {
  // APM / Orthogonal
  apm: "orthogonalhq",
  orthogonal: "orthogonalhq",

  // Major agent ecosystem orgs
  anthropic: "anthropics",
  anthropics: "anthropics",
  openai: "openai",
  google: "google",
  microsoft: "microsoft",
  github: "github",
  cursor: "getcursor",
  windsurf: "codeiumdev",
  stripe: "stripe",
  cloudflare: "cloudflare",
  vercel: "vercel",
  atlassian: "atlassian",
  figma: "figma",
  notion: "makenotion",
  canva: "AcademySoftwareFoundation",
  zapier: "zapier",

  // System / reserved words
  system: "",
  test: "",
  admin: "",
  api: "",
  www: "",
  app: "",
  skills: "",
  registry: "",
};
