import { Suspense } from "react";
import { db, schema } from "@/lib/db";
import { sql, asc, desc, eq, and, arrayContains } from "drizzle-orm";
import { PackageCard } from "@/components/package-card";
import { PanelBar } from "@/components/panel-bar";
import type { Metadata } from "next";
import type { PackageKind } from "@apm/types";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; kind?: string; category?: string }>;
}): Promise<Metadata> {
  const { q, kind, category } = await searchParams;

  if (q) {
    const topic = q.trim();
    return {
      title: `Agent skills for ${topic}`,
      description: `Discover and install agent skills for ${topic}. Browse the APM registry for production-ready skills, workflows, and apps for AI agents.`,
      openGraph: {
        title: `Agent skills for ${topic} — APM`,
        description: `Find agent skills for ${topic} — installable across 34+ AI agent products.`,
      },
    };
  }

  const qualifiers = [kind, category].filter(Boolean).join(" ");
  if (qualifiers) {
    return {
      title: `${qualifiers} agent skills`,
      description: `Browse ${qualifiers} agent skills in the APM registry — discover, install, and share skills for AI agents.`,
    };
  }

  return {
    title: "Agent Skills",
    description:
      "Browse and search the APM registry — discover agent skills, workflows, and apps for AI agents.",
  };
}

const listSelect = {
  name: schema.packages.name,
  description: schema.packages.description,
  kind: schema.packages.kind,
  category: schema.packages.category,
  tags: schema.packages.tags,
  compatibility: schema.packages.compatibility,
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

// ── Helpers ────────────────────────────────────────────────

type SortKey = "name" | "stars" | "recent" | "tokens";
type Order = "asc" | "desc";

/** Default sort direction per column */
const defaultOrder: Record<SortKey, Order> = {
  name: "asc",
  stars: "desc",
  recent: "desc",
  tokens: "desc",
};

function buildSortHref(
  currentSort: SortKey,
  currentOrder: Order,
  targetSort: SortKey
): string {
  const params = new URLSearchParams();
  params.set("sort", targetSort);

  if (currentSort === targetSort) {
    // Toggle direction
    params.set("order", currentOrder === "asc" ? "desc" : "asc");
  } else {
    params.set("order", defaultOrder[targetSort]);
  }

  return `/packages?${params.toString()}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toPackageListItem(pkg: any) {
  return {
    name: pkg.name as string,
    description: pkg.description as string,
    kind: (pkg.kind ?? "skill") as PackageKind,
    category: pkg.category as string | null,
    tags: (pkg.tags as string[]) ?? [],
    compatibility: (pkg.compatibility as string[]) ?? [],
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

// ── Data ───────────────────────────────────────────────────

async function getFilterOptions() {
  const [categories, kinds, licenses] = await Promise.all([
    db
      .selectDistinct({ category: schema.packages.category })
      .from(schema.packages)
      .where(sql`${schema.packages.category} IS NOT NULL`)
      .orderBy(schema.packages.category),
    db
      .selectDistinct({ kind: schema.packages.kind })
      .from(schema.packages)
      .orderBy(schema.packages.kind),
    db
      .selectDistinct({ license: schema.packages.license })
      .from(schema.packages)
      .where(
        sql`${schema.packages.license} IS NOT NULL AND ${schema.packages.license} != 'NOASSERTION'`
      )
      .orderBy(schema.packages.license),
  ]);

  return {
    categories: categories.map((r) => r.category!),
    kinds: kinds.map((r) => r.kind),
    licenses: licenses.map((r) => r.license!),
  };
}

async function PackageResults({
  q,
  sort,
  order,
  page,
  kind,
  category,
  license,
}: {
  q?: string;
  sort: SortKey;
  order: Order;
  page: number;
  kind?: string;
  category?: string;
  license?: string;
}) {
  const pageSize = 20;

  // Build filter conditions
  const filters = [];
  if (kind) filters.push(eq(schema.packages.kind, kind));
  if (category) filters.push(eq(schema.packages.category, category));
  if (license) filters.push(eq(schema.packages.license, license));
  const where = filters.length > 0 ? and(...filters) : undefined;

  if (q && q.trim().length > 0) {
    const tsQuery = q
      .trim()
      .split(/\s+/)
      .map((word) => `${word}:*`)
      .join(" & ");

    const tsWhere = sql`to_tsvector('english', ${schema.packages.name} || ' ' || ${schema.packages.description}) @@ to_tsquery('english', ${tsQuery})`;
    const combinedWhere = where ? and(where, tsWhere) : tsWhere;

    const results = await db
      .select(listSelect)
      .from(schema.packages)
      .where(combinedWhere)
      .orderBy(
        sql`ts_rank(to_tsvector('english', ${schema.packages.name} || ' ' || ${schema.packages.description}), to_tsquery('english', ${tsQuery})) DESC`
      )
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    if (results.length === 0) {
      return (
        <div className="px-6 md:px-10 py-16 text-center">
          <p className="font-mono text-xs t-meta">
            No agent skills found for &ldquo;{q}&rdquo;
          </p>
        </div>
      );
    }

    return (
      <div>
        {results.map((pkg) => (
          <PackageCard key={pkg.name} pkg={toPackageListItem(pkg)} />
        ))}
      </div>
    );
  }

  const orderColumn =
    sort === "stars"
      ? schema.packages.repoStars
      : sort === "recent"
        ? schema.packages.lastIndexedAt
        : sort === "tokens"
          ? schema.packages.tokenCount
          : schema.packages.name;

  const orderFn = order === "asc" ? asc : desc;

  const results = await db
    .select(listSelect)
    .from(schema.packages)
    .where(where)
    .orderBy(orderFn(orderColumn))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  if (results.length === 0) {
    return (
      <div className="px-6 md:px-10 py-16 text-center">
        <p className="font-mono text-xs t-meta">
          No agent skills match these filters.
        </p>
      </div>
    );
  }

  return (
    <div>
      {results.map((pkg) => (
        <PackageCard key={pkg.name} pkg={toPackageListItem(pkg)} />
      ))}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────

export default async function PackagesPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    sort?: string;
    order?: string;
    page?: string;
    kind?: string;
    category?: string;
    license?: string;
  }>;
}) {
  const params = await searchParams;
  const q = params.q;
  const sort = (params.sort ?? "name") as SortKey;
  const order = (params.order ?? defaultOrder[sort]) as Order;
  const page = Math.max(1, parseInt(params.page || "1", 10));
  const kind = params.kind;
  const category = params.category;
  const license = params.license;

  const filterOptions = await getFilterOptions();

  // Build filter query string to preserve across sort links
  const filterParams = new URLSearchParams();
  if (q) filterParams.set("q", q);
  if (kind) filterParams.set("kind", kind);
  if (category) filterParams.set("category", category);
  if (license) filterParams.set("license", license);
  const filterQS = filterParams.toString();

  function sortHref(targetSort: SortKey): string {
    const base = buildSortHref(sort, order, targetSort);
    return filterQS ? `${base}&${filterQS}` : base;
  }

  function filterHref(key: string, value: string | undefined): string {
    const p = new URLSearchParams();
    if (q) p.set("q", q);
    p.set("sort", sort);
    p.set("order", order);
    if (kind) p.set("kind", kind);
    if (category) p.set("category", category);
    if (license) p.set("license", license);

    if (value) {
      p.set(key, value);
    } else {
      p.delete(key);
    }

    return `/packages?${p.toString()}`;
  }

  const sortTabs: { key: SortKey; label: string }[] = [
    { key: "name", label: "Name" },
    { key: "stars", label: "Stars" },
    { key: "recent", label: "Recent" },
    { key: "tokens", label: "Tokens" },
  ];

  return (
    <div className="px-6 md:px-12 lg:px-20 py-10 md:py-16">
      <div className="mx-auto max-w-5xl">
        <div className="border-y border-white/[0.06]">
          <PanelBar
            label={q ? `apm::search "${q}"` : "apm::packages"}
          />

          {/* Sort + Filters */}
            <div className="flex flex-wrap items-center border-b border-white/[0.06]">
              {/* Sort tabs */}
              {sortTabs.map((opt) => {
                const isActive = sort === opt.key;
                return (
                  <a
                    key={opt.key}
                    href={sortHref(opt.key)}
                    className={`px-5 py-3 font-mono text-xs tracking-wide transition-colors inline-flex items-center gap-1 ${
                      isActive
                        ? "bg-white/[0.06] t-card-title"
                        : "t-meta hover:t-body"
                    }`}
                  >
                    {opt.label}
                    <span className={`text-[7px] leading-none ${isActive ? "t-meta" : "opacity-0"}`}>
                      {isActive ? (order === "asc" ? "▲" : "▼") : "▼"}
                    </span>
                  </a>
                );
              })}

              {/* Spacer */}
              <div className="flex-1" />

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2 pr-4">
                <FilterSelect
                  label="Kind"
                  value={kind}
                  options={filterOptions.kinds}
                  buildHref={(v) => filterHref("kind", v)}
                />
                <FilterSelect
                  label="Category"
                  value={category}
                  options={filterOptions.categories}
                  buildHref={(v) => filterHref("category", v)}
                />
                <FilterSelect
                  label="License"
                  value={license}
                  options={filterOptions.licenses}
                  buildHref={(v) => filterHref("license", v)}
                />
                {(kind || category || license) && (
                  <a
                    href={`/packages?${q ? `q=${encodeURIComponent(q)}&` : ""}sort=${sort}&order=${order}`}
                    className="font-mono text-[10px] text-accent hover:underline"
                  >
                    Clear
                  </a>
                )}
              </div>
            </div>

          <Suspense
            fallback={
              <div className="px-6 md:px-10 py-16 text-center">
                <p className="font-mono text-xs t-meta">Loading...</p>
              </div>
            }
          >
            <PackageResults
              q={q}
              sort={sort}
              order={order}
              page={page}
              kind={kind}
              category={category}
              license={license}
            />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

// ── Filter component ───────────────────────────────────────

function FilterSelect({
  label,
  value,
  options,
  buildHref,
}: {
  label: string;
  value?: string;
  options: string[];
  buildHref: (value: string | undefined) => string;
}) {
  return (
    <div className="relative inline-flex items-center">
      {value ? (
        <a
          href={buildHref(undefined)}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-mono bg-accent/10 border border-accent/20 text-accent hover:bg-accent/20 transition-colors"
        >
          {label}: {value}
          <span className="text-[9px] ml-0.5">✕</span>
        </a>
      ) : (
        <div className="group relative">
          <button className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-mono bg-white/[0.04] border border-white/[0.06] t-meta hover:bg-white/[0.06] transition-colors">
            {label}
            <span className="text-[9px] opacity-40">▾</span>
          </button>
          <div className="invisible group-hover:visible absolute top-full left-0 pt-1 z-50">
            <div className="min-w-[140px] max-h-[240px] overflow-y-auto rounded border border-white/[0.08] bg-[#141414] shadow-xl">
            {options.map((opt) => (
              <a
                key={opt}
                href={buildHref(opt)}
                className="block px-3 py-1.5 font-mono text-[11px] t-card-desc hover:bg-white/[0.06] hover:text-fg transition-colors"
              >
                {opt}
              </a>
            ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
