import { NextRequest, NextResponse } from "next/server";
import { isNoIndexRoute } from "./lib/seoPolicy";

const SESSION_COOKIE = "saas_session";
const APP_PREFIX = "/app";

function localeForPath(pathname: string): "fa" | "en" {
  return pathname === "/en" || pathname.startsWith("/en/") ? "en" : "fa";
}

function applyResponsePolicy(response: NextResponse, pathname: string) {
  const isPublicIndexable = !isNoIndexRoute(pathname);

  response.headers.set("X-Robots-Tag", isPublicIndexable ? "all" : "noindex, nofollow, noarchive");
  response.headers.set("Cache-Control", isPublicIndexable ? "public, max-age=0, must-revalidate" : "private, no-store");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  return response;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith(APP_PREFIX)) {
    const sessionCookie = request.cookies.get(SESSION_COOKIE);
    if (!sessionCookie?.value) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return applyResponsePolicy(NextResponse.redirect(loginUrl), pathname);
    }
  }

  const requestHeaders = new Headers(request.headers);
  const locale = localeForPath(pathname);

  requestHeaders.set("x-asdev-pathname", pathname);
  requestHeaders.set("x-asdev-locale", locale);
  requestHeaders.set("x-site-pathname", pathname);
  requestHeaders.set("x-site-locale", locale);

  return applyResponsePolicy(
    NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    }),
    pathname
  );
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|site.webmanifest|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|css|js|woff2?|ttf|map)).*)"],
};
