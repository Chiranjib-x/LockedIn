"use client";

import { dismissReport, removeContent, banUser } from "./actions";

export function ReportActions({
  reportId,
  targetType,
  targetId,
  authorId,
}: {
  reportId: string;
  targetType: string;
  targetId: string;
  authorId: string | null;
}) {
  const removable = targetType === "listing" || targetType === "post" || targetType === "group_order";
  return (
    <div className="flex flex-wrap gap-2 text-sm">
      <button onClick={() => dismissReport(reportId)} className="press rounded-full border border-border px-3 py-1.5 font-medium hover:bg-muted">
        Dismiss
      </button>
      {removable && (
        <button
          onClick={() => removeContent(reportId, targetType as "listing" | "post" | "group_order", targetId)}
          className="press rounded-full border border-destructive/40 px-3 py-1.5 font-medium text-destructive hover:bg-destructive/10"
        >
          Remove content
        </button>
      )}
      {authorId && (
        <button
          onClick={() => { if (confirm("Ban this user? They can log in but can’t post or message.")) banUser(reportId, authorId); }}
          className="press rounded-full bg-destructive px-3 py-1.5 font-semibold text-on-destructive"
        >
          Ban user
        </button>
      )}
    </div>
  );
}
