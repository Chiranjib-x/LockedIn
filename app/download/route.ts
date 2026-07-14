import { NextResponse } from "next/server";

// Single source of truth for the Android APK download. Redirects to the Google
// Drive direct-download URL. To point elsewhere later (Firebase, Play Store,
// self-hosted), change only this line.
// NOTE: the Drive file must be shared "Anyone with the link" (Viewer), else
// this redirect lands on a Google sign-in wall instead of the download.
const APK_URL =
  "https://drive.google.com/uc?export=download&id=1op2TJaqNVHLGItbGA0M87hbfL8wzqVsJ";

export function GET() {
  return NextResponse.redirect(APK_URL, 302);
}
