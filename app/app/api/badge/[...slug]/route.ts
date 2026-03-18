import { NextRequest, NextResponse } from "next/server";
import { parseScopedSlug, findPackage } from "@/lib/package-params";
import { db } from "@/lib/db";
import { packages } from "@/lib/db/schema";
import { eq, count as countFn } from "drizzle-orm";

const CACHE_HEADERS = {
  "Cache-Control": "public, max-age=3600",
};

function badgeJson(label: string, message: string, color: string) {
  return NextResponse.json(
    { schemaVersion: 1, label, message, color },
    { headers: CACHE_HEADERS }
  );
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string[] }> }
) {
  const { slug } = await params;

  // GET /api/badge/registry — total package count
  if (slug.length === 1 && slug[0] === "registry") {
    const [result] = await db
      .select({ count: countFn() })
      .from(packages)
      .where(eq(packages.status, "active"));
    const total = result?.count ?? 0;
    const noun = total === 1 ? "skill indexed" : "skills indexed";
    return badgeJson("apm", `${total} ${noun}`, "brightgreen");
  }

  const parsed = parseScopedSlug(slug);

  if (!parsed) {
    return badgeJson("apm", "invalid path", "red");
  }

  const variant = parsed.rest[0]; // "stars", "downloads", or undefined
  const scopedName = `@${parsed.scope}/${parsed.name}`;

  const pkg = await findPackage(parsed.scope, parsed.name);

  if (!pkg) {
    return badgeJson("apm", "not found", "red");
  }

  // GET /api/badge/@scope/name/stars
  if (variant === "stars") {
    const stars = pkg.repoStars ?? 0;
    return badgeJson(scopedName, `\u2605 ${stars}`, "yellow");
  }

  // GET /api/badge/@scope/name/downloads
  if (variant === "downloads") {
    const downloads = pkg.downloadCount ?? 0;
    const noun = downloads === 1 ? "install" : "installs";
    return badgeJson(scopedName, `${downloads} ${noun}`, "green");
  }

  // GET /api/badge/@scope/name — default badge
  if (!variant) {
    const color = pkg.verified ? "brightgreen" : "blue";
    return badgeJson("apm", scopedName, color);
  }

  return badgeJson("apm", "unknown variant", "red");
}
