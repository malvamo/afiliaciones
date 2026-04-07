import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { isAuthEnabled, verifyAuthToken } from "@/lib/auth";

export async function middleware(request: NextRequest) {
  if (!isAuthEnabled()) return NextResponse.next();

  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname === "/login"
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get("app_auth")?.value;
  if (await verifyAuthToken(token)) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/:path*"],
};
