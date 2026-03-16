import { db, schema } from "@/lib/db";
import { desc } from "drizzle-orm";
import { sql } from "drizzle-orm";
import Link from "next/link";
import { PanelBar } from "@/components/panel-bar";
import { InstallTabs } from "@/components/install-tabs";
import { EcosystemGrid } from "@/components/ecosystem-grid";
import { ScopeLink } from "@/components/scope-link";
import { VerifiedBadge } from "@/components/verified-badge";
import type { Metadata } from "next";

const BASE_URL = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "https://apm.orthg.nl";

export const metadata: Metadata = {
  title: "APM — Discover Agent Skills for AI Agents",
  description:
    "The open registry for agent skills. Discover and install production-ready skills, workflows, and apps for 34+ AI agent products.",
  openGraph: {
    title: "APM — Discover Agent Skills for AI Agents",
    description:
      "The open registry for agent skills. Discover and install production-ready skills, workflows, and apps for 34+ AI agent products.",
    url: BASE_URL,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "APM — Discover Agent Skills for AI Agents",
    description:
      "The open registry for agent skills. Discover and install production-ready skills, workflows, and apps for 34+ AI agent products.",
  },
};

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
                scope: schema.packages.scope,
                name: schema.packages.name,
                description: schema.packages.description,
                kind: schema.packages.kind,
                sourceRepo: schema.packages.sourceRepo,
                repoOwner: schema.packages.repoOwner,
                repoStars: schema.packages.repoStars,
                license: schema.packages.license,
                verified: schema.packages.verified,
            })
            .from(schema.packages)
            .orderBy(desc(schema.packages.repoStars))
            .limit(6);
    } catch {
        return [];
    }
}

const kindColors: Record<string, string> = {
    skill: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    "composite-skill": "bg-blue-500/10 text-blue-400 border-blue-500/20",
    workflow: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    app: "bg-purple-500/10 text-purple-400 border-purple-500/20",
};

export default async function HomePage() {
    const [stats, featured] = await Promise.all([
        getStats(),
        getFeaturedPackages(),
    ]);

    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "@id": `${BASE_URL}/#website`,
        url: BASE_URL,
        name: "APM",
        description:
            "The open registry for agent skills. Discover and install production-ready skills, workflows, and apps for 34+ AI agent products.",
        potentialAction: {
            "@type": "SearchAction",
            target: {
                "@type": "EntryPoint",
                urlTemplate: `${BASE_URL}/packages?q={search_term_string}`,
            },
            "query-input": "required name=search_term_string",
        },
    };

    return (
        <div>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
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
                        Agent skills
                        <br />
                        <span className="accent-gradient-text">for every AI product</span>
                    </h1>
                    <p className="mt-5 text-sm t-card-desc max-w-lg mx-auto leading-relaxed">
                        APM is the open registry for the{" "}
                        <a
                            href="https://agentskills.io/specification"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-accent hover:underline"
                        >
                            agentskills.io
                        </a>{" "}
                        standard. Discover and install agent skills, composite skills,
                        workflows, and apps across 34+ agent products.
                    </p>
                    <p className="font-mono mt-5 text-sm t-card-desc max-w-lg mx-auto leading-relaxed">

                        {stats.packageCount > 0 && (
                            <span className="text-fg/90">
                                {stats.packageCount.toLocaleString()} skills indexed.
                            </span>
                        )}
                    </p>
                </div>
            </section>

            {/* Package types */}
            <section
                className="relative px-6 md:px-12 lg:px-20 pb-20 md:pb-28 animate-fade-in-up"
                style={{ animationDelay: "0.05s" }}
            >
                <div className="mx-auto max-w-5xl">
                    <div className="border-y border-white/[0.06]">
                        <PanelBar label="apm::skill-types" meta="4 types" />
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                            {[
                                {
                                    kind: "skill",
                                    title: "Skills",
                                    desc: "Atomic instructions that give agents domain expertise and new capabilities.",
                                },
                                {
                                    kind: "composite-skill",
                                    title: "Composite Skills",
                                    desc: "Skills that depend on other skills. Installed together, resolved automatically.",
                                },
                                {
                                    kind: "workflow",
                                    title: "Workflows",
                                    desc: "Multi-step orchestration that chains skills into repeatable processes.",
                                },
                                {
                                    kind: "app",
                                    title: "Apps",
                                    desc: "Full agent applications with runtime, tools, and MCP server integrations.",
                                },
                            ].map((type, i) => {
                                // Mobile: bottom border on 0,1,2
                                // Tablet 2-col: right border on 0,2 (left col); bottom border on 0,1 (top row)
                                // Desktop 4-col: right border on 0,1,2; no bottom borders
                                const borders = [
                                    i < 3 ? "border-b border-white/[0.06]" : "",
                                    i % 2 === 0 ? "sm:border-r sm:border-white/[0.06]" : "",
                                    i >= 2 ? "sm:border-b-0" : "",
                                    i < 3 ? "lg:border-r lg:border-white/[0.06]" : "",
                                    "lg:border-b-0",
                                ].filter(Boolean).join(" ");
                                return (
                                <div
                                    key={type.kind}
                                    className={`px-6 md:px-8 py-6 md:py-8 ${borders}`}
                                >
                                    <span
                                        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider border mb-3 ${kindColors[type.kind]}`}
                                    >
                                        {type.kind}
                                    </span>
                                    <h3 className="font-mono text-xs font-semibold t-card-title mb-1.5">
                                        {type.title}
                                    </h3>
                                    <p className="text-[11px] t-card-desc leading-relaxed">
                                        {type.desc}
                                    </p>
                                </div>
                                );
                            })}
                        </div>
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
                        <PanelBar label="apm::ecosystem" meta="34+ agents" />
                        <div className="px-6 md:px-10 py-6 md:py-8">
                            <p className="text-[12px] t-card-desc leading-relaxed mb-4">
                                One skill format, every agent. The{" "}
                                <a
                                    href="https://agentskills.io/specification"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-accent hover:underline"
                                >
                                    agentskills.io
                                </a>{" "}
                                standard is supported natively or via download across the entire
                                ecosystem.
                            </p>
                            <EcosystemGrid />
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
                                        key={`${pkg.scope}/${pkg.name}`}
                                        href={`/packages/@${pkg.scope}/${pkg.name}`}
                                        className="block px-6 md:px-10 py-4 hover:bg-white/[0.02] transition-colors group"
                                    >
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono text-sm t-card-title">
                                                        <ScopeLink scope={pkg.scope} className="t-meta" />{pkg.name}
                                                    </span>
                                                    {pkg.verified && <VerifiedBadge />}
                                                    <span
                                                        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider border ${kindColors[pkg.kind ?? "skill"] ?? "bg-white/5 text-white/40 border-white/10"}`}
                                                    >
                                                        {pkg.kind ?? "skill"}
                                                    </span>
                                                </div>
                                                <p className="mt-0.5 text-[12px] t-card-desc truncate">
                                                    {pkg.description}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-3 text-[10px] t-meta shrink-0 font-mono">
                                                {(pkg.repoStars ?? 0) > 0 && (
                                                    <span>
                                                        ★ {(pkg.repoStars ?? 0).toLocaleString()}
                                                    </span>
                                                )}
                                                {pkg.license && pkg.license !== "NOASSERTION" && (
                                                    <span>{pkg.license}</span>
                                                )}
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                            <div className="border-t border-white/[0.06] px-6 md:px-10 py-4">
                                <Link
                                    href="/packages"
                                    className="inline-flex items-center gap-2 font-mono text-xs text-accent hover:underline transition-colors"
                                >
                                    Browse all skills →
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
                                        "Install skills with one command — dependencies resolve automatically",
                                        "Skills are saved to .skills/ with a lockfile",
                                        "Your agent discovers and loads them on demand",
                                    ],
                                },
                                {
                                    title: "For authors",
                                    items: [
                                        "Create a SKILL.md with agentskills.io frontmatter",
                                        "Push to GitHub — APM indexes public repos automatically",
                                        "Or publish directly via apm publish for hosted packages",
                                        "Claim your namespace and manage versions",
                                    ],
                                },
                            ].map((col, i) => (
                                <div
                                    key={col.title}
                                    className={`px-6 md:px-10 py-6 md:py-8 ${i === 0
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
