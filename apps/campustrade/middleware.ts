import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@suite/auth/middleware";

// FINDINGS F20 / QUEUE A10: CampusTrade was forked from the mother by
// subtraction, so it still SERVES routes it no longer owns at unlinked URLs.
// Redirect them home rather than showing a student a feature this app lacks.
// Denial list, not allow list: each entry verified to have zero inbound links
// from an owned surface. /board stays — lost & found IS Trade's.
const NOT_OURS = [
  "/communities",
  "/events",
  "/for-clubs",
  "/gate",
  "/admin/campus",
  "/admin/spaces",
];

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

  if (NOT_OURS.some((p) => url.pathname === p || url.pathname.startsWith(p + "/"))) {
    url.pathname = "/home";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
