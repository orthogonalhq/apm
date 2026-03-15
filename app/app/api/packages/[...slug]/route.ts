import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { and, eq, sql } from "drizzle-orm";
import { parseScopedSlug, findPackage } from "@/lib/package-params";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params;
  const parsed = parseScopedSlug(slug);

  if (!parsed) {
    return NextResponse.json(
      { error: "Invalid package path. Use @scope/name" },
      { status: 400 }
    );
  }

  const action = parsed.rest[0]; // "skill-md", "source", or undefined

  const pkg = await findPackage(parsed.scope, parsed.name);
  if (!pkg) {
    return NextResponse.json({ error: "Package not found" }, { status: 404 });
  }

  // GET /api/packages/@scope/name/skill-md
  if (action === "skill-md") {
    return new NextResponse(pkg.skillMdRaw, {
      headers: { "Content-Type": "text/markdown; charset=utf-8" },
    });
  }

  // GET /api/packages/@scope/name/source
  if (action === "source") {
    const url = `https://github.com/${pkg.sourceRepo}/tree/${pkg.sourceRef}/${pkg.sourcePath}`;
    return NextResponse.redirect(url);
  }

  // GET /api/packages/@scope/name — full metadata
  if (!action) {
    return NextResponse.json({
      id: pkg.id,
      scope: pkg.scope,
      name: pkg.name,
      description: pkg.description,
      kind: pkg.kind,
      category: pkg.category,
      tags: pkg.tags,
      compatibility: pkg.compatibility,
      language: pkg.language,
      sourceRepo: pkg.sourceRepo,
      sourcePath: pkg.sourcePath,
      sourceRef: pkg.sourceRef,
      repoUrl: pkg.repoUrl,
      homepageUrl: pkg.homepageUrl,
      repoOwner: pkg.repoOwner,
      author: pkg.author,
      repoStars: pkg.repoStars,
      license: pkg.license,
      version: pkg.version,
      skillMdRaw: pkg.skillMdRaw,
      frontmatter: pkg.frontmatter,
      allowedTools: pkg.allowedTools,
      tokenCount: pkg.tokenCount,
      fileCount: pkg.fileCount,
      progressiveDisclosure: pkg.progressiveDisclosure,
      downloadCount: pkg.downloadCount,
      depCount: pkg.depCount,
      dependantCount: pkg.dependantCount,
      verified: pkg.verified,
      featured: pkg.featured,
      status: pkg.status,
      hosted: pkg.hosted,
      firstIndexedAt: pkg.firstIndexedAt,
      lastIndexedAt: pkg.lastIndexedAt,
      lastCommitSha: pkg.lastCommitSha,
    });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

// POST /api/packages/@scope/name/track
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params;
  const parsed = parseScopedSlug(slug);

  if (!parsed) {
    return NextResponse.json({ error: "Invalid package path" }, { status: 400 });
  }

  const action = parsed.rest[0];

  if (action === "track") {
    const result = await db
      .update(schema.packages)
      .set({
        downloadCount: sql`${schema.packages.downloadCount} + 1`,
      })
      .where(
        and(
          eq(schema.packages.scope, parsed.scope),
          eq(schema.packages.name, parsed.name)
        )
      );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
