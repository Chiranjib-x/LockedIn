// Parse a datetime-local value ("YYYY-MM-DDTHH:MM") as IST wall-clock. Without
// the explicit offset, new Date() reads it in the server's tz (UTC on Vercel),
// shifting every user-entered time by +5:30.
export function istParse(local: string) {
  return new Date(local + "+05:30");
}
