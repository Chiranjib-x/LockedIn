import { NextResponse } from "next/server";

// CampusClubs is one app in the LockedIn suite. Downloads live on the suite hub
// so nobody is handed the wrong app's APK (this route used to 302 straight to
// the mother LockedIn APK). Redirect to the hub, which lists every app.
export function GET() {
  return NextResponse.redirect("https://www.chiranjib.online/download", 302);
}
