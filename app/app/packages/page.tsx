import { Suspense } from "react";
import { db, schema } from "@/lib/db";
import { sql, asc, desc } from "drizzle-orm";
import { PackageCard } from "@/components/package-card";
import { PanelBar } from "@/components/panel-bar";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Packages",
  description: "Browse and search the APM registry of agent skills.",
};

async function PackageResults({
  q,
  sort,
  page,
}: {
  q?: string;
  sort?: string;
  page: number;
}) {
  const pageSize = 20;

  if (q && q.trim().length > 0) {
    const tsQuery = q
      .trim()
      .split(/\s+/)
      .map((word) => `${word}:*`)
      .join(" & ");

    const results = await db
      .select({
        name: schema.packages.name,
        description: schema.packages.description,
        sourceRepo: schema.packages.sourceRepo,
        repoOwner: schema.packages.repoOwner,
        repoStars: schema.packages.repoStars,
        license: schema.packages.license,
        lastIndexedAt: schema.packages.lastIndexedAt,
      })
      .from(schema.packages)
      .where(
        sql`to_tsvector('english', ${schema.packages.name} || ' ' || ${schema.packages.description}) @@ to_tsquery('english', ${tsQuery})`
      )
      .orderBy(
        sql`ts_rank(to_tsvector('english', ${schema.packages.name} || ' ' || ${schema.packages.description}), to_tsquery('english', ${tsQuery})) DESC`
      )
      .limit(pageSize)
      .offset((page - 1) * pageSize);

    if (results.length === 0) {
      return (
        <div className="px-6 md:px-10 py-16 text-center">
          <p className="font-mono text-xs t-meta">
            No skills found for &ldquo;{q}&rdquo;
          </p>
        </div>
      );
    }

    return (
      <div>
        {results.map((pkg) => (
          <PackageCard
            key={pkg.name}
            pkg={{
              ...pkg,
              repoStars: pkg.repoStars ?? 0,
              lastIndexedAt: pkg.lastIndexedAt.toISOString(),
            }}
          />
        ))}
      </div>
    );
  }

  const orderColumn =
    sort === "stars"
      ? schema.packages.repoStars
      : sort === "recent"
        ? schema.packages.lastIndexedAt
        : schema.packages.name;

  const orderFn = sort === "stars" || sort === "recent" ? desc : asc;

  const results = await db
    .select({
      name: schema.packages.name,
      description: schema.packages.description,
      sourceRepo: schema.packages.sourceRepo,
      repoOwner: schema.packages.repoOwner,
      repoStars: schema.packages.repoStars,
      license: schema.packages.license,
      lastIndexedAt: schema.packages.lastIndexedAt,
    })
    .from(schema.packages)
    .orderBy(orderFn(orderColumn))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  if (results.length === 0) {
    return (
      <div className="px-6 md:px-10 py-16 text-center">
        <p className="font-mono text-xs t-meta">
          No packages indexed yet. The indexer runs every 6 hours.
        </p>
      </div>
    );
  }

  return (
    <div>
      {results.map((pkg) => (
        <PackageCard
          key={pkg.name}
          pkg={{
            ...pkg,
            repoStars: pkg.repoStars ?? 0,
            lastIndexedAt: pkg.lastIndexedAt.toISOString(),
          }}
        />
      ))}
    </div>
  );
}

export default async function PackagesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sort?: string; page?: string }>;
}) {
  const params = await searchParams;
  const q = params.q;
  const sort = params.sort;
  const page = Math.max(1, parseInt(params.page || "1", 10));

  return (
    <div className="px-6 md:px-12 lg:px-20 py-10 md:py-16">
      <div className="mx-auto max-w-5xl">
        <div className="border-y border-white/[0.06]">
          <PanelBar
            label={q ? `apm::search "${q}"` : "apm::packages"}
          />

          {/* Sort tabs */}
          {!q && (
            <div className="flex flex-wrap border-b border-white/[0.06]">
              {[
                { key: "name", label: "Name", href: "/packages" },
                { key: "stars", label: "Stars", href: "/packages?sort=stars" },
                {
                  key: "recent",
                  label: "Recent",
                  href: "/packages?sort=recent",
                },
              ].map((opt) => (
                <a
                  key={opt.key}
                  href={opt.href}
                  className={`px-5 py-3 font-mono text-xs tracking-wide transition-colors ${
                    sort === opt.key || (!sort && opt.key === "name")
                      ? "bg-white/[0.06] t-card-title"
                      : "t-meta hover:t-body"
                  }`}
                >
                  {opt.label}
                </a>
              ))}
            </div>
          )}

          <Suspense
            fallback={
              <div className="px-6 md:px-10 py-16 text-center">
                <p className="font-mono text-xs t-meta">Loading...</p>
              </div>
            }
          >
            <PackageResults q={q} sort={sort} page={page} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
