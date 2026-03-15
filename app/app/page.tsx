import { db, schema } from "@/lib/db";
import { desc } from "drizzle-orm";
import { sql } from "drizzle-orm";
import Link from "next/link";
import { SearchBar } from "@/components/search-bar";
import { PanelBar } from "@/components/panel-bar";
import { InstallTabs } from "@/components/install-tabs";

async function getStats() {
  try {
    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.packages);
    return { packageCount: Number(countResult.count) };
  } catch {
    return { packageCount: 0 };
  }
}

async function getFeaturedPackages() {
  try {
    return await db
      .select({
        name: schema.packages.name,
        description: schema.packages.description,
        sourceRepo: schema.packages.sourceRepo,
        repoOwner: schema.packages.repoOwner,
        repoStars: schema.packages.repoStars,
        license: schema.packages.license,
      })
      .from(schema.packages)
      .orderBy(desc(schema.packages.repoStars))
      .limit(6);
  } catch {
    return [];
  }
}

const AGENTS = [
  "Claude Code",
  "Cursor",
  "VS Code Copilot",
  "Gemini CLI",
  "OpenHands",
  "Goose",
  "Windsurf",
  "Cline",
  "Roo Code",
  "aider",
];

export default async function HomePage() {
  const [stats, featured] = await Promise.all([
    getStats(),
    getFeaturedPackages(),
  ]);

  return (
    <div>
      {/* Hero */}
      <section className="relative px-6 md:px-12 lg:px-20 py-20 md:py-28 text-center">
        <div className="mx-auto max-w-5xl animate-fade-in-up">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] t-meta mb-5">
            <span className="bg-accent text-black font-normal px-0.5">
              &gt;
            </span>
            <span className="ml-1.5">The Open Registry for Agent Skills</span>
          </p>
          <h1 className="font-mono text-4xl sm:text-5xl md:text-6xl font-semibold tracking-[-0.02em] leading-tight t-heading">
            The package manager
            <br />
            <span className="accent-gradient-text">for agent skills</span>
          </h1>
          <p className="mt-5 text-sm t-card-desc max-w-lg mx-auto leading-relaxed">
            APM is the public registry for the{" "}
            <a
              href="https://agentskills.io/specification"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              agentskills.io
            </a>{" "}
            standard — an open format for reusable AI agent instructions
            supported by 30+ products.{" "}
            {stats.packageCount > 0 && (
              <span className="text-fg/90">
                {stats.packageCount.toLocaleString()} skills indexed.
              </span>
            )}
          </p>

          <div className="mt-8 max-w-lg mx-auto">
            <SearchBar />
          </div>
        </div>
      </section>

      {/* Ecosystem */}
      <section
        className="relative px-6 md:px-12 lg:px-20 pb-20 md:pb-28 animate-fade-in-up"
        style={{ animationDelay: "0.1s" }}
      >
        <div className="mx-auto max-w-5xl">
          <div className="border-y border-white/[0.06]">
            <PanelBar
              label="apm::ecosystem"
              meta={`${AGENTS.length}+ agents`}
            />
            <div className="px-6 md:px-10 py-6 md:py-8">
              <p className="text-[12px] t-card-desc leading-relaxed mb-4">
                A SKILL.md is a folder with a markdown file containing
                instructions for an AI agent — any agent. One skill works
                everywhere.
              </p>
              <div className="flex flex-wrap gap-2">
                {AGENTS.map((agent) => (
                  <span
                    key={agent}
                    className="px-3 py-1.5 bg-white/[0.04] border border-white/[0.06] rounded-[3px] font-mono text-[11px] t-panel-label"
                  >
                    {agent}
                  </span>
                ))}
                <span className="px-3 py-1.5 bg-accent/10 border border-accent/20 rounded-[3px] font-mono text-[11px] text-accent">
                  + more
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Install */}
      <section
        className="relative px-6 md:px-12 lg:px-20 pb-20 md:pb-28 animate-fade-in-up"
        style={{ animationDelay: "0.2s" }}
      >
        <div className="mx-auto max-w-5xl">
          <InstallTabs />
        </div>
      </section>

      {/* Featured packages */}
      {featured.length > 0 && (
        <section
          className="relative px-6 md:px-12 lg:px-20 pb-20 md:pb-28 animate-fade-in-up"
          style={{ animationDelay: "0.3s" }}
        >
          <div className="mx-auto max-w-5xl">
            <div className="border-y border-white/[0.06]">
              <PanelBar
                label="apm::featured"
                meta={`${stats.packageCount} total`}
              />
              <div className="divide-y divide-white/[0.06]">
                {featured.map((pkg) => (
                  <Link
                    key={pkg.name}
                    href={`/packages/${pkg.name}`}
                    className="block px-6 md:px-10 py-4 hover:bg-white/[0.02] transition-colors group"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <span className="font-mono text-sm t-card-title group-hover:text-accent transition-colors">
                          {pkg.name}
                        </span>
                        <p className="mt-0.5 text-[12px] t-card-desc truncate">
                          {pkg.description}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 text-[10px] t-meta shrink-0 font-mono">
                        {(pkg.repoStars ?? 0) > 0 && (
                          <span>★ {(pkg.repoStars ?? 0).toLocaleString()}</span>
                        )}
                        {pkg.license && <span>{pkg.license}</span>}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
              {/* Browse all */}
              <div className="border-t border-white/[0.06] px-6 md:px-10 py-4">
                <Link
                  href="/packages"
                  className="inline-flex items-center gap-2 font-mono text-xs text-accent hover:underline transition-colors"
                >
                  Browse all packages →
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* How it works */}
      <section
        className="relative px-6 md:px-12 lg:px-20 pb-20 md:pb-28 animate-fade-in-up"
        style={{ animationDelay: "0.35s" }}
      >
        <div className="mx-auto max-w-5xl">
          <div className="border-y border-white/[0.06]">
            <PanelBar label="apm::how-it-works" />
            <div className="grid grid-cols-1 sm:grid-cols-2">
              {[
                {
                  title: "For users",
                  items: [
                    "Search the registry or browse by category",
                    "Install skills with one command",
                    "Skills are saved to .skills/ with a lockfile",
                    "Your agent picks them up automatically",
                  ],
                },
                {
                  title: "For authors",
                  items: [
                    "Create a folder with a SKILL.md in your repo",
                    "Follow the agentskills.io frontmatter spec",
                    "APM indexes it from GitHub automatically",
                    "No publishing step — just push to GitHub",
                  ],
                },
              ].map((col, i) => (
                <div
                  key={col.title}
                  className={`px-6 md:px-10 py-6 md:py-8 ${
                    i === 0
                      ? "sm:border-r border-b sm:border-b-0 border-white/[0.06]"
                      : ""
                  }`}
                >
                  <h3 className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-accent mb-4">
                    {col.title}
                  </h3>
                  <div className="space-y-2.5">
                    {col.items.map((item, j) => (
                      <div key={j} className="flex items-start gap-2.5">
                        <span className="font-mono text-[10px] t-ghost mt-px shrink-0">
                          {String(j + 1).padStart(2, "0")}
                        </span>
                        <p className="text-[12px] t-card-desc leading-relaxed">
                          {item}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
