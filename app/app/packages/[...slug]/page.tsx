import { notFound } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { db, schema } from "@/lib/db";
import { and, eq, sql, asc, desc } from "drizzle-orm";
import { codeToHtml } from "shiki";
import { CopyButton } from "@/components/copy-button";
import { PanelBar } from "@/components/panel-bar";
import { PackageCard } from "@/components/package-card";
import { SkillActions } from "@/components/skill-actions";
import { VerifiedBadge } from "@/components/verified-badge";
import { formatPackageId } from "@apm/types";
import type { PackageKind } from "@apm/types";
import type { Metadata } from "next";

export const revalidate = 3600;

const BASE_URL = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "https://apm.sh";

const kindColors: Record<string, string> = {
  skill: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  "composite-skill": "bg-blue-500/10 text-blue-400 border-blue-500/20",
  workflow: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  app: "bg-purple-500/10 text-purple-400 border-purple-500/20",
};

type SlugParsed =
  | { type: "scope"; scope: string }
  | { type: "package"; scope: string; name: string };

function parseSlug(slug: string[]): SlugParsed | null {
  if (slug.length === 0) return null;
  let scope = decodeURIComponent(slug[0]);
  if (scope.startsWith("@")) scope = scope.slice(1);
  if (!scope) return null;
  if (slug.length === 1) return { type: "scope", scope };
  return { type: "package", scope, name: decodeURIComponent(slug[1]) };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const parsed = parseSlug(slug);
  if (!parsed) return { title: "Not found" };

  if (parsed.type === "scope") {
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.packages)
      .where(eq(schema.packages.scope, parsed.scope));

    const total = Number(countResult.count);
    if (total === 0) return { title: "Scope not found" };

    return {
      title: `@${parsed.scope} — Agent Skills`,
      description: `Browse ${total} agent skill${total === 1 ? "" : "s"} published by @${parsed.scope} on APM.`,
      openGraph: {
        title: `@${parsed.scope} — Agent Skills — APM`,
        description: `Browse ${total} agent skill${total === 1 ? "" : "s"} published by @${parsed.scope}.`,
      },
    };
  }

  const result = await db
    .select({
      scope: schema.packages.scope,
      name: schema.packages.name,
      description: schema.packages.description,
    })
    .from(schema.packages)
    .where(
      and(
        eq(schema.packages.scope, parsed.scope),
        eq(schema.packages.name, parsed.name)
      )
    )
    .limit(1);

  if (result.length === 0) {
    return { title: "Skill not found" };
  }

  const pkg = result[0];
  const fullName = formatPackageId(pkg.scope, pkg.name);
  const descText = `${pkg.description} — an agent skill installable across 34+ AI agent products.`;
  return {
    title: `${fullName} — Agent Skill`,
    description: descText,
    openGraph: {
      title: `${fullName} — Agent Skill — APM`,
      description: descText,
    },
  };
}

function formatDate(date: Date | null) {
  if (!date) return "—";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatLicense(license: string | null): string {
  if (!license || license === "NOASSERTION") return "—";
  return license;
}

function formatKind(kind: string | null): string {
  switch (kind) {
    case "skill":
    case "composite-skill":
      return "Skill";
    case "workflow":
      return "Workflow";
    case "app":
      return "App";
    default:
      return "Skill";
  }
}

function formatType(kind: string | null): string | null {
  switch (kind) {
    case "skill":
      return "Atomic";
    case "composite-skill":
      return "Composite";
    default:
      return null;
  }
}

const languageNames: Record<string, string> = {
  en: "English", zh: "Chinese", ja: "Japanese", ko: "Korean",
  es: "Spanish", fr: "French", de: "German", pt: "Portuguese",
  ru: "Russian", ar: "Arabic", hi: "Hindi", it: "Italian",
  nl: "Dutch", pl: "Polish", tr: "Turkish", vi: "Vietnamese",
  th: "Thai", uk: "Ukrainian", sv: "Swedish", cs: "Czech",
};

function formatLanguage(code: string): string {
  return languageNames[code] ?? code.toUpperCase();
}

async function SkillMdHighlight({ content }: { content: string }) {
  const html = await codeToHtml(content, {
    lang: "markdown",
    theme: "github-dark-default",
  });

  return (
    <div
      className="px-6 md:px-10 py-6 md:py-8 overflow-x-auto [&_pre]:bg-transparent! [&_pre]:p-0! [&_code]:text-xs [&_code]:leading-relaxed [&_.line]:whitespace-pre-wrap [&_.line]:wrap-break-word"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export default async function PackagePage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = await params;
  const parsed = parseSlug(slug);
  if (!parsed) notFound();

  if (parsed.type === "scope") {
    return <ScopePage scope={parsed.scope} />;
  }

  const result = await db
    .select()
    .from(schema.packages)
    .where(
      and(
        eq(schema.packages.scope, parsed.scope),
        eq(schema.packages.name, parsed.name)
      )
    )
    .limit(1);

  if (result.length === 0) {
    notFound();
  }

  const pkg = result[0];
  const fullName = formatPackageId(pkg.scope, pkg.name);
  const installCmd = `apm install ${fullName}`;
  const pageUrl = `${BASE_URL}/packages/@${pkg.scope}/${pkg.name}`;
  const repoUrl = pkg.repoUrl ?? `https://github.com/${pkg.sourceRepo}`;

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareSourceCode",
      "@id": pageUrl,
      url: pageUrl,
      name: fullName,
      description: pkg.description,
      codeRepository: repoUrl,
      programmingLanguage: "Markdown",
      ...(pkg.license && pkg.license !== "NOASSERTION"
        ? { license: `https://spdx.org/licenses/${pkg.license}.html` }
        : {}),
      ...(pkg.version ? { version: pkg.version } : {}),
      ...(pkg.repoOwner
        ? {
            author: {
              "@type": "Organization",
              name: pkg.repoOwner,
              url: `https://github.com/${pkg.repoOwner}`,
            },
          }
        : {}),
      ...((pkg.tags ?? []).length > 0 ? { keywords: (pkg.tags ?? []).join(", ") } : {}),
      ...(pkg.lastUpdatedAt
        ? { dateModified: pkg.lastUpdatedAt.toISOString() }
        : {}),
      isPartOf: {
        "@type": "WebSite",
        "@id": `${BASE_URL}/#website`,
        name: "APM",
        url: BASE_URL,
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: BASE_URL },
        { "@type": "ListItem", position: 2, name: "Packages", item: `${BASE_URL}/packages` },
        { "@type": "ListItem", position: 3, name: fullName, item: pageUrl },
      ],
    },
  ];

  const specSections = [
    {
      label: "Source",
      items: [
        {
          label: "Repository",
          value: pkg.sourceRepo,
          href: repoUrl,
        },
        {
          label: "Path",
          value: pkg.sourcePath,
          href: `https://github.com/${pkg.sourceRepo}/tree/${pkg.sourceRef}/${pkg.sourcePath}`,
        },
        { label: "Branch", value: pkg.sourceRef ?? "main" },
        ...(pkg.homepageUrl
          ? [{ label: "Homepage", value: pkg.homepageUrl, href: pkg.homepageUrl }]
          : []),
      ],
    },
    {
      label: "Ownership",
      items: [
        {
          label: "Scope",
          value: `@${pkg.scope}`,
          href: `/packages/@${pkg.scope}`,
        },
        {
          label: "Owner",
          value: pkg.repoOwner,
          href: `https://github.com/${pkg.repoOwner}`,
        },
        ...(pkg.author ? [{ label: "Author", value: pkg.author }] : []),
        { label: "License", value: formatLicense(pkg.license) },
      ],
    },
    {
      label: "Metrics",
      items: [
        { label: "Stars", value: (pkg.repoStars ?? 0).toLocaleString() },
        { label: "Tokens", value: (pkg.tokenCount ?? 0).toLocaleString() },
        { label: "Files", value: String(pkg.fileCount ?? 1) },
        { label: "Downloads", value: (pkg.downloadCount ?? 0).toLocaleString() },
        { label: "Dependencies", value: String(pkg.depCount ?? 0) },
        { label: "Dependants", value: String(pkg.dependantCount ?? 0) },
      ],
    },
    {
      label: "Details",
      items: [
        { label: "Kind", value: formatKind(pkg.kind) },
        ...(formatType(pkg.kind) ? [{ label: "Type", value: formatType(pkg.kind)! }] : []),
        ...(pkg.version ? [{ label: "Version", value: pkg.version }] : []),
        { label: "Language", value: formatLanguage(pkg.language) },
        {
          label: "Progressive",
          value: pkg.progressiveDisclosure ? "Yes" : "No",
        },
        { label: "Status", value: pkg.status ?? "active" },
        { label: "Updated", value: formatDate(pkg.lastUpdatedAt) },
        { label: "Indexed", value: formatDate(pkg.lastIndexedAt) },
      ],
    },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="px-6 md:px-12 lg:px-20 py-10 md:py-16">
        <div className="mx-auto max-w-5xl">
          {/* Header */}
          <div className="mb-8">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] t-meta mb-2">
              <span className="bg-accent text-black font-normal px-0.5">&gt;</span>
              <span className="ml-1.5">Agent Skill</span>
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="font-mono text-2xl md:text-3xl font-semibold tracking-[-0.02em] t-heading">
                <span className="t-meta">@{pkg.scope}/</span>
                {pkg.name}
              </h1>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider border ${kindColors[pkg.kind ?? "skill"] ?? "bg-white/5 text-white/40 border-white/10"}`}
              >
                {pkg.kind ?? "skill"}
              </span>
              {pkg.verified && <VerifiedBadge />}
              {pkg.featured && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider border border-amber-500/30 bg-amber-500/10 text-amber-400">
                  featured
                </span>
              )}
              {pkg.category && (
                <span className="font-mono text-[10px] t-meta">{pkg.category}</span>
              )}
            </div>
            <p className="mt-2 text-sm t-card-desc leading-relaxed max-w-2xl">
              {pkg.description}
            </p>

            {(pkg.tags ?? []).length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {(pkg.tags ?? []).map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 rounded text-[10px] font-mono bg-white/[0.04] border border-white/[0.06] t-meta"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {(pkg.compatibility ?? []).length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {(pkg.compatibility ?? []).map((agent) => (
                  <span
                    key={agent}
                    className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-500/5 border border-blue-500/10 text-blue-400/80"
                  >
                    {agent}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              {/* Install */}
              <div className="border-y border-white/[0.06]">
                <PanelBar label="apm::install" />
                <div className="px-6 md:px-10 py-5">
                  <div className="flex items-center gap-3 bg-white/[0.04] border border-white/[0.08] px-4 py-3 rounded-[3px]">
                    <span className="font-mono text-xs t-meta select-none">$</span>
                    <code className="font-mono text-sm t-card-title flex-1 overflow-x-auto whitespace-nowrap">
                      {installCmd}
                    </code>
                    <CopyButton text={installCmd} />
                  </div>
                </div>
              </div>

              {(pkg.allowedTools ?? []).length > 0 && (
                <div className="border-y border-white/[0.06]">
                  <PanelBar label="apm::allowed-tools" />
                  <div className="px-6 md:px-10 py-4 flex flex-wrap gap-1.5">
                    {(pkg.allowedTools ?? []).map((tool) => (
                      <span
                        key={tool}
                        className="px-2 py-1 rounded text-[11px] font-mono bg-white/[0.04] border border-white/[0.06] t-card-desc"
                      >
                        {tool}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="border-y border-white/[0.06]">
                <PanelBar label="apm::skill.md" meta="raw">
                  <SkillActions content={pkg.skillMdRaw} packageName={fullName} />
                </PanelBar>
                <SkillMdHighlight content={pkg.skillMdRaw} />
              </div>
            </div>

            <aside className="space-y-0">
              {specSections.map((section) => (
                <div
                  key={section.label}
                  className="border-y border-white/[0.06] -mt-px first:mt-0"
                >
                  <PanelBar label={`apm::${section.label.toLowerCase()}`} />
                  <div className="divide-y divide-white/[0.06]">
                    {section.items.map((item) => (
                      <div
                        key={item.label}
                        className="px-6 md:px-10 lg:px-5 py-3 flex items-baseline justify-between gap-3"
                      >
                        <span className="font-mono text-[10px] uppercase tracking-[0.2em] t-panel-label shrink-0">
                          {item.label}
                        </span>
                        {"href" in item && item.href ? (
                          <a
                            href={item.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-xs text-accent hover:underline truncate text-right"
                          >
                            {item.value}
                          </a>
                        ) : (
                          <span className="font-mono text-xs t-card-desc truncate text-right">
                            {item.value}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </aside>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Scope page ──────────────────────────────────────────────

const scopeListSelect = {
  scope: schema.packages.scope,
  name: schema.packages.name,
  description: schema.packages.description,
  kind: schema.packages.kind,
  category: schema.packages.category,
  tags: schema.packages.tags,
  compatibility: schema.packages.compatibility,
  language: schema.packages.language,
  sourceRepo: schema.packages.sourceRepo,
  repoOwner: schema.packages.repoOwner,
  author: schema.packages.author,
  repoStars: schema.packages.repoStars,
  license: schema.packages.license,
  tokenCount: schema.packages.tokenCount,
  downloadCount: schema.packages.downloadCount,
  verified: schema.packages.verified,
  status: schema.packages.status,
  lastIndexedAt: schema.packages.lastIndexedAt,
};

function toListItem(pkg: any) {
  return {
    scope: pkg.scope as string,
    name: pkg.name as string,
    description: pkg.description as string,
    kind: (pkg.kind ?? "skill") as PackageKind,
    category: pkg.category as string | null,
    tags: (pkg.tags as string[]) ?? [],
    compatibility: (pkg.compatibility as string[]) ?? [],
    language: (pkg.language as string) ?? "en",
    sourceRepo: pkg.sourceRepo as string,
    repoOwner: pkg.repoOwner as string,
    author: pkg.author as string | null,
    repoStars: (pkg.repoStars as number) ?? 0,
    license: pkg.license as string | null,
    tokenCount: (pkg.tokenCount as number) ?? 0,
    downloadCount: (pkg.downloadCount as number) ?? 0,
    verified: (pkg.verified as boolean) ?? false,
    status: (pkg.status ?? "active") as "active" | "deprecated" | "archived",
    lastIndexedAt: (pkg.lastIndexedAt as Date).toISOString(),
  };
}

async function ScopePage({ scope }: { scope: string }) {
  const [packages, [{ count: totalCount }], [{ stars: totalStars }]] =
    await Promise.all([
      db
        .select(scopeListSelect)
        .from(schema.packages)
        .where(eq(schema.packages.scope, scope))
        .orderBy(desc(schema.packages.repoStars)),
      db
        .select({ count: sql<number>`count(*)` })
        .from(schema.packages)
        .where(eq(schema.packages.scope, scope)),
      db
        .select({
          stars: sql<number>`coalesce(max(${schema.packages.repoStars}), 0)`,
        })
        .from(schema.packages)
        .where(eq(schema.packages.scope, scope)),
    ]);

  if (packages.length === 0) {
    notFound();
  }

  const total = Number(totalCount);
  const maxStars = Number(totalStars);
  const firstPkg = packages[0];
  const githubUrl = `https://github.com/${firstPkg.repoOwner}`;

  const kinds = [...new Set(packages.map((p) => p.kind))];
  const categories = [
    ...new Set(packages.map((p) => p.category).filter(Boolean)),
  ] as string[];

  return (
    <div className="px-6 md:px-12 lg:px-20 py-10 md:py-16">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-8">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] t-meta mb-2">
            <span className="bg-accent text-black font-normal px-0.5">
              &gt;
            </span>
            <span className="ml-1.5">Scope</span>
          </p>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-mono text-2xl md:text-3xl font-semibold tracking-[-0.02em] t-heading">
              @{scope}
            </h1>
            <a
              href={githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-mono bg-white/[0.04] border border-white/[0.06] t-meta hover:text-accent hover:border-white/[0.12] transition-colors"
            >
              <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              {firstPkg.repoOwner}
            </a>
          </div>

          {/* Stats row */}
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-mono t-meta">
            <span>
              {total} skill{total === 1 ? "" : "s"}
            </span>
            {maxStars > 0 && (
              <>
                <span className="t-ghost">·</span>
                <span>★ {maxStars.toLocaleString()}</span>
              </>
            )}
            {kinds.length > 0 && (
              <>
                <span className="t-ghost">·</span>
                <span>{kinds.join(", ")}</span>
              </>
            )}
            {categories.length > 0 && (
              <>
                <span className="t-ghost">·</span>
                <span>{categories.join(", ")}</span>
              </>
            )}
          </div>
        </div>

        {/* Skills list */}
        <div className="border-y border-white/[0.06]">
          <PanelBar
            label={`apm::@${scope}`}
            meta={`${total} skill${total === 1 ? "" : "s"}`}
          />
          <div>
            {packages.map((pkg) => (
              <PackageCard key={`${pkg.scope}/${pkg.name}`} pkg={toListItem(pkg)} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
