"use client";

import { useEffect } from "react";
import { markAllNotificationsRead } from "./actions";

// FINDINGS F42: marking everything read used to happen *during* the page's
// render, so the header's unread badge — rendered in the same pass — still
// showed the old count until the next navigation. Doing it as a server action
// after mount lets the action revalidate the layout, so the badge clears with
// the page. Also takes a write side effect out of render.
export default function MarkAllRead() {
  useEffect(() => {
    void markAllNotificationsRead();
  }, []);
  return null;
}
