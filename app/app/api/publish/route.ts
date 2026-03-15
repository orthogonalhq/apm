import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error: "Not implemented",
      message:
        "Package publishing is coming in Phase 2. For now, packages are indexed from GitHub.",
    },
    { status: 501 }
  );
}
