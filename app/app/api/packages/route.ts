import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { asc, desc, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const pageSize = Math.min(
    100,
    Math.max(1, parseInt(searchParams.get("pageSize") || "20", 10))
  );
  const sort = searchParams.get("sort") || "name";
  const order = searchParams.get("order") === "desc" ? "desc" : "asc";

  const orderColumn =
    sort === "stars"
      ? schema.packages.repoStars
      : sort === "indexed"
        ? schema.packages.lastIndexedAt
        : schema.packages.name;

  const orderFn = order === "desc" ? desc : asc;

  const [results, countResult] = await Promise.all([
    db
      .select({
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
      })
      .from(schema.packages)
      .orderBy(orderFn(orderColumn))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db
      .select({ count: sql<number>`count(*)` })
      .from(schema.packages),
  ]);

  return NextResponse.json({
    data: results,
    total: Number(countResult[0].count),
    page,
    pageSize,
  });
}
