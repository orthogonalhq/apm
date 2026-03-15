import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;

  const result = await db
    .select({
      sourceRepo: schema.packages.sourceRepo,
      sourcePath: schema.packages.sourcePath,
      sourceRef: schema.packages.sourceRef,
    })
    .from(schema.packages)
    .where(eq(schema.packages.name, name))
    .limit(1);

  if (result.length === 0) {
    return NextResponse.json({ error: "Package not found" }, { status: 404 });
  }

  const { sourceRepo, sourcePath, sourceRef } = result[0];
  const url = `https://github.com/${sourceRepo}/tree/${sourceRef}/${sourcePath}`;

  return NextResponse.redirect(url);
}
