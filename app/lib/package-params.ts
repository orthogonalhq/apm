import { and, eq } from "drizzle-orm";
import { db, schema } from "./db";

/**
 * Parse scoped package slug from route params.
 * Handles both:
 *   - catch-all [...slug] → ["@scope", "name"] or ["@scope", "name", "sub"]
 *   - explicit [scope]/[name] segments
 */
export function parseScopedSlug(slug: string[]): {
  scope: string;
  name: string;
  rest: string[];
} | null {
  if (slug.length < 2) return null;

  let scope = decodeURIComponent(slug[0]);
  // Strip @ prefix if present
  if (scope.startsWith("@")) scope = scope.slice(1);
  if (!scope) return null;

  const name = decodeURIComponent(slug[1]);
  if (!name) return null;

  return { scope, name, rest: slug.slice(2).map(decodeURIComponent) };
}

/**
 * Find a package by scope + name.
 */
export async function findPackage(scope: string, name: string) {
  const result = await db
    .select()
    .from(schema.packages)
    .where(
      and(
        eq(schema.packages.scope, scope),
        eq(schema.packages.name, name)
      )
    )
    .limit(1);

  return result[0] ?? null;
}
