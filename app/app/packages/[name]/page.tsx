import { notFound } from "next/navigation";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { codeToHtml } from "shiki";
import { CopyButton } from "@/components/copy-button";
import { DownloadButton } from "@/components/download-button";
import { PanelBar } from "@/components/panel-bar";
import type { Metadata } from "next";

export const revalidate = 3600;

const kindColors: Record<string, string> = {
  skill: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  "composite-skill": "bg-blue-500/10 text-blue-400 border-blue-500/20",
  workflow: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  app: "bg-purple-500/10 text-purple-400 border-purple-500/20",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ name: string }>;
}): Promise<Metadata> {
  const { name } = await params;

  const result = await db
    .select({
      name: schema.packages.name,
      description: schema.packages.description,
    })
    .from(schema.packages)
    .where(eq(schema.packages.name, name))
    .limit(1);

  if (result.length === 0) {
    return { title: "Skill not found" };
  }

  const pkg = result[0];
  const desc = `${pkg.description} — an agent skill installable across 34+ AI agent products.`;
  return {
    title: `${pkg.name} — Agent Skill`,
    description: desc,
    openGraph: {
      title: `${pkg.name} — Agent Skill — APM`,
      description: desc,
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
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;

  const result = await db
    .select()
    .from(schema.packages)
    .where(eq(schema.packages.name, name))
    .limit(1);

  if (result.length === 0) {
    notFound();
  }

  const pkg = result[0];
  const installCmd = `apm install ${pkg.name}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareSourceCode",
    name: pkg.name,
    description: pkg.description,
    codeRepository: pkg.repoUrl ?? `https://github.com/${pkg.sourceRepo}`,
    programmingLanguage: "Markdown",
    license: pkg.license
      ? `https://spdx.org/licenses/${pkg.license}.html`
      : undefined,
  };

  // Sidebar spec sheet — grouped sections
  const specSections = [
    {
      label: "Source",
      items: [
        {
          label: "Repository",
          value: pkg.sourceRepo,
          href: pkg.repoUrl ?? `https://github.com/${pkg.sourceRepo}`,
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
              <span className="bg-accent text-black font-normal px-0.5">
                &gt;
              </span>
              <span className="ml-1.5">Agent Skill</span>
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="font-mono text-2xl md:text-3xl font-semibold tracking-[-0.02em] t-heading">
                {pkg.name}
              </h1>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider border ${kindColors[pkg.kind ?? "skill"] ?? "bg-white/5 text-white/40 border-white/10"}`}
              >
                {pkg.kind ?? "skill"}
              </span>
              {pkg.verified && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider border border-accent/30 bg-accent/10 text-accent">
                  verified
                </span>
              )}
              {pkg.featured && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider border border-amber-500/30 bg-amber-500/10 text-amber-400">
                  featured
                </span>
              )}
              {pkg.category && (
                <span className="font-mono text-[10px] t-meta">
                  {pkg.category}
                </span>
              )}
            </div>
            <p className="mt-2 text-sm t-card-desc leading-relaxed max-w-2xl">
              {pkg.description}
            </p>

            {/* Tags */}
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

            {/* Compatibility */}
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
            {/* Main content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Install */}
              <div className="border-y border-white/[0.06]">
                <PanelBar label="apm::install" />
                <div className="px-6 md:px-10 py-5">
                  <div className="flex items-center gap-3 bg-white/[0.04] border border-white/[0.08] px-4 py-3 rounded-[3px]">
                    <span className="font-mono text-xs t-meta select-none">
                      $
                    </span>
                    <code className="font-mono text-sm t-card-title flex-1 overflow-x-auto whitespace-nowrap">
                      {installCmd}
                    </code>
                    <CopyButton text={installCmd} />
                  </div>
                </div>
              </div>

              {/* Allowed tools */}
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

              {/* SKILL.md content */}
              <div className="border-y border-white/[0.06]">
                <PanelBar label="apm::skill.md" meta="raw">
                  <div className="flex items-center gap-2">
                    <CopyButton text={pkg.skillMdRaw} />
                    <DownloadButton
                      content={pkg.skillMdRaw}
                      filename={`${pkg.name}.SKILL.md`}
                    />
                  </div>
                </PanelBar>
                <SkillMdHighlight content={pkg.skillMdRaw} />
              </div>
            </div>

            {/* Sidebar — spec sheet */}
            <aside className="space-y-0">
              {specSections.map((section) => (
                <div
                  key={section.label}
                  className="border-y border-white/[0.06] -mt-px first:mt-0"
                >
                  <PanelBar
                    label={`apm::${section.label.toLowerCase()}`}
                  />
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
