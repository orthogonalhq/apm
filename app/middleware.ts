import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED_PATHS = ["/dashboard", "/settings", "/onboarding"];
const ADMIN_PREFIX = "/admin-";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = request.cookies.get("apm_session")?.value;

  const isProtected =
    PROTECTED_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/")) ||
    pathname.startsWith(ADMIN_PREFIX);

  if (isProtected && !session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/settings/:path*", "/onboarding/:path*", "/admin-:path*"],
};
