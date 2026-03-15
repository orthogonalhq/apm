import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;

  const result = await db
    .select({ skillMdRaw: schema.packages.skillMdRaw })
    .from(schema.packages)
    .where(eq(schema.packages.name, name))
    .limit(1);

  if (result.length === 0) {
    return NextResponse.json({ error: "Package not found" }, { status: 404 });
  }

  return new NextResponse(result[0].skillMdRaw, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
    },
  });
}
