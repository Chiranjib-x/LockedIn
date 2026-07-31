import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@suite/auth/middleware";

export async function middleware(request: NextRequest) {
  // OAuth safety net: an auth provider redirect that lands on the site root
  // with a ?code means Supabase fell back to the Site URL (the exact
  // /auth/callback URL wasn't in its allow-list). Route it to the handler that
  // exchanges the code for a session so sign-in still completes. Scoped to "/"
  // so it never touches legitimate ?code usage elsewhere (e.g. study-groups).
  const url = new URL(request.url);
  if (url.pathname === "/" && url.searchParams.get("code")) {
    url.pathname = "/auth/callback";
    return NextResponse.redirect(url);
  }
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
