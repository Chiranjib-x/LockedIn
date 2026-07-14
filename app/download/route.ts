import { NextResponse } from "next/server";

// Single source of truth for the Android APK download. To point elsewhere later
// (Firebase, Play Store, self-hosted), change only this line.
// Uses the drive.usercontent host + confirm=t so Drive serves the APK directly
// instead of its "can't scan for viruses" interstitial (executables trigger it).
// The file must stay shared "Anyone with the link" (Viewer).
const APK_URL =
  "https://drive.usercontent.google.com/download?id=1op2TJaqNVHLGItbGA0M87hbfL8wzqVsJ&export=download&confirm=t";

export function GET() {
  return NextResponse.redirect(APK_URL, 302);
}
