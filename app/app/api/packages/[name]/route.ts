import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;

  const result = await db
    .select()
    .from(schema.packages)
    .where(eq(schema.packages.name, name))
    .limit(1);

  if (result.length === 0) {
    return NextResponse.json({ error: "Package not found" }, { status: 404 });
  }

  const pkg = result[0];
  return NextResponse.json({
    id: pkg.id,
    name: pkg.name,
    description: pkg.description,
    sourceRepo: pkg.sourceRepo,
    sourcePath: pkg.sourcePath,
    sourceRef: pkg.sourceRef,
    repoOwner: pkg.repoOwner,
    repoStars: pkg.repoStars,
    license: pkg.license,
    skillMdRaw: pkg.skillMdRaw,
    frontmatter: pkg.frontmatter,
    hosted: pkg.hosted,
    firstIndexedAt: pkg.firstIndexedAt,
    lastIndexedAt: pkg.lastIndexedAt,
    lastCommitSha: pkg.lastCommitSha,
  });
}
