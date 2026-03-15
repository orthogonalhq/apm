import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, sql } from "drizzle-orm";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;

  const result = await db
    .update(schema.packages)
    .set({
      downloadCount: sql`${schema.packages.downloadCount} + 1`,
    })
    .where(eq(schema.packages.name, name));

  if (result.rowCount === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
