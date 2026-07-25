// The push notification title = the display name of the app the notification is
// routed to (0063 puts that app value in the dispatch payload). Kept in its own
// pure module so it's unit-testable without pulling web-push / firebase-admin.
const APP_TITLES: Record<string, string> = {
  gaterunner: "GateRunner",
  clubs: "CampusClubs",
  trade: "CampusTrade",
  lockedin: "LockedIn",
};

export function titleFor(app: unknown): string {
  return (typeof app === "string" && APP_TITLES[app]) || "LockedIn";
}
