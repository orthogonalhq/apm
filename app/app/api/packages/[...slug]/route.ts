import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { and, eq, sql } from "drizzle-orm";
import { parseScopedSlug, findPackage } from "@/lib/package-params";
import { resolveToken, canPublishToScope } from "@/lib/auth/tokens";
import { scopes, auditLog } from "@/lib/db/schema";

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

// PUT /api/packages/@scope/name — publish or update a package
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params;
  const parsed = parseScopedSlug(slug);

  if (!parsed || parsed.rest.length > 0) {
    return NextResponse.json(
      { error: "Invalid package path. Use @scope/name" },
      { status: 400 }
    );
  }

  // Authenticate
  const authHeader = request.headers.get("authorization");
  const bearer = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  if (!bearer) {
    return NextResponse.json(
      { error: "Authorization required" },
      { status: 401 }
    );
  }

  const auth = await resolveToken(bearer);
  if (!auth) {
    return NextResponse.json(
      { error: "Invalid or expired token" },
      { status: 401 }
    );
  }

  // Resolve scope
  const [scope] = await db
    .select()
    .from(scopes)
    .where(eq(scopes.name, parsed.scope))
    .limit(1);

  if (!scope) {
    return NextResponse.json(
      { error: `Scope '${parsed.scope}' not found` },
      { status: 404 }
    );
  }

  if (scope.status === "suspended") {
    return NextResponse.json(
      { error: "Scope is suspended" },
      { status: 403 }
    );
  }

  // Check permission
  const allowed = await canPublishToScope(auth, scope.id);
  if (!allowed) {
    return NextResponse.json(
      { error: "You do not have permission to publish to this scope" },
      { status: 403 }
    );
  }

  // Parse body
  const body = await request.json();
  const { sourceRepo, sourcePath, sourceRef } = body;

  if (!sourceRepo || !sourcePath) {
    return NextResponse.json(
      { error: "sourceRepo and sourcePath are required" },
      { status: 400 }
    );
  }

  // Fetch SKILL.md from the git repo
  const ref = sourceRef || "main";
  const rawUrl = `https://raw.githubusercontent.com/${sourceRepo}/${ref}/${sourcePath}`;
  const fetchRes = await fetch(rawUrl);

  if (!fetchRes.ok) {
    return NextResponse.json(
      {
        error: `Could not fetch SKILL.md from ${sourceRepo}/${sourcePath} (ref: ${ref}). Status: ${fetchRes.status}`,
      },
      { status: 400 }
    );
  }

  const skillMdRaw = await fetchRes.text();

  // Parse frontmatter
  let frontmatter: Record<string, unknown>;
  try {
    const matter = await import("gray-matter");
    const parsedFm = matter.default(skillMdRaw);
    frontmatter = parsedFm.data;
  } catch {
    return NextResponse.json(
      { error: "Failed to parse SKILL.md frontmatter" },
      { status: 400 }
    );
  }

  const fmName = frontmatter.name as string | undefined;
  const fmDescription = frontmatter.description as string | undefined;

  if (!fmName || !fmDescription) {
    return NextResponse.json(
      { error: "Frontmatter must include 'name' and 'description'" },
      { status: 400 }
    );
  }

  if (fmName !== parsed.name) {
    return NextResponse.json(
      {
        error: `Frontmatter name '${fmName}' does not match URL name '${parsed.name}'`,
      },
      { status: 400 }
    );
  }

  const kind = (frontmatter.kind as string) || "skill";
  const tags = Array.isArray(frontmatter.tags)
    ? (frontmatter.tags as string[])
    : [];
  const dependencies = Array.isArray(frontmatter.dependencies)
    ? (frontmatter.dependencies as string[])
    : [];

  // Validate dependencies exist
  for (const dep of dependencies) {
    const stripped = dep.startsWith("@") ? dep.slice(1) : dep;
    const [depScope, depName] = stripped.split("/");
    if (!depScope || !depName) {
      return NextResponse.json(
        { error: `Invalid dependency format: '${dep}'` },
        { status: 400 }
      );
    }
    const depPkg = await findPackage(depScope, depName);
    if (!depPkg) {
      return NextResponse.json(
        { error: `Dependency '${dep}' not found in registry` },
        { status: 400 }
      );
    }
  }

  // Upsert package
  const existing = await findPackage(parsed.scope, parsed.name);

  if (existing && existing.status === "delisted") {
    return NextResponse.json(
      { error: "Package is delisted. Relist before updating." },
      { status: 403 }
    );
  }

  const packageData = {
    scope: parsed.scope,
    name: parsed.name,
    description: fmDescription,
    kind,
    tags,
    source: "published" as const,
    sourceRepo,
    sourcePath,
    sourceRef: ref,
    repoOwner: sourceRepo.split("/")[0] || parsed.scope,
    skillMdRaw,
    frontmatter,
    scopeId: scope.id,
    lastIndexedAt: new Date(),
    lastUpdatedAt: new Date(),
  };

  let pkg;
  if (existing) {
    [pkg] = await db
      .update(schema.packages)
      .set(packageData)
      .where(eq(schema.packages.id, existing.id))
      .returning();
  } else {
    [pkg] = await db
      .insert(schema.packages)
      .values({
        ...packageData,
        firstIndexedAt: new Date(),
      })
      .returning();
  }

  // Update dependency links
  if (pkg) {
    await db
      .delete(schema.packageDependencies)
      .where(eq(schema.packageDependencies.packageId, pkg.id));

    for (const dep of dependencies) {
      const stripped = dep.startsWith("@") ? dep.slice(1) : dep;
      const [depScope, depName] = stripped.split("/");
      const depPkg = await findPackage(depScope, depName);
      if (depPkg) {
        await db.insert(schema.packageDependencies).values({
          packageId: pkg.id,
          dependencyId: depPkg.id,
        });
      }
    }

    await db.insert(auditLog).values({
      actorId: auth.type === "personal" ? auth.publisherId : null,
      actorType: auth.type === "personal" ? "publisher" : "system",
      action: existing ? "package.update" : "package.publish",
      targetType: "package",
      targetId: pkg.id,
      metadata: { scope: parsed.scope, name: parsed.name, sourceRepo },
    });
  }

  return NextResponse.json(
    {
      scope: parsed.scope,
      name: parsed.name,
      description: fmDescription,
      kind,
      sourceRepo,
      sourcePath,
      sourceRef: ref,
      status: "active",
      publishedAt: new Date().toISOString(),
    },
    { status: existing ? 200 : 201 }
  );
}
