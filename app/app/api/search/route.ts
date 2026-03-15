import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q");

  if (!q || q.trim().length === 0) {
    return NextResponse.json({ results: [], total: 0 });
  }

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
      rank: sql<number>`ts_rank(to_tsvector('english', ${schema.packages.name} || ' ' || ${schema.packages.description}), to_tsquery('english', ${tsQuery}))`,
    })
    .from(schema.packages)
    .where(
      sql`to_tsvector('english', ${schema.packages.name} || ' ' || ${schema.packages.description}) @@ to_tsquery('english', ${tsQuery})`
    )
    .orderBy(
      sql`ts_rank(to_tsvector('english', ${schema.packages.name} || ' ' || ${schema.packages.description}), to_tsquery('english', ${tsQuery})) DESC`
    )
    .limit(50);

  return NextResponse.json({
    results: results.map(({ rank, ...rest }) => rest),
    total: results.length,
  });
}
