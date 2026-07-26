import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// FINDINGS F20 / QUEUE A10: CampusClubs was forked from the mother by
// subtraction, so it still SERVES the routes it no longer owns (a working
// marketplace, cabs, chat…) at unlinked URLs — reachable by bookmark, old link,
// or search engine. Redirect them home instead of showing a student a feature
// this app doesn't have.
//
// Deliberately a denial list, not an allow list: every entry below was verified
// to have zero inbound links from an owned surface. `/board` is NOT here — it
// holds event detail + barcode check-in, which communities link to.
const NOT_OURS = [
  "/marketplace",
  "/cabs",
  "/group-buy",
  "/subscriptions",
  "/toolbox",
  "/deals",
  "/matches",
  "/crews",
  "/study-groups",
  "/timetable",
  "/saved",
  "/spaces",
  "/chats",
  "/gate",
  "/search",
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
