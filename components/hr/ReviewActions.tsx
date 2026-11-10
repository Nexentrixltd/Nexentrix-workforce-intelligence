"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle } from "lucide-react";
import type { DetailStatus } from "@prisma/client";
import { cn } from "@/lib/utils";
import { sendJson } from "@/lib/records-client";
import { StatusChip } from "../shared/reviewUI";

type Target =
  | { type: "profile" | "payroll" | "signatory" }
  | { type: "document"; id: string };

export function ReviewActions({
  userId,
  target,
  status,
  version,
  reviewNote,
}: {
  userId: string;
  target: Target;
  status: DetailStatus;
  version: string;
  reviewNote?: string | null;
}) {
  const router = useRouter();
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<"VERIFIED" | "REJECTED" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const noteId = `reject-${target.type}-${"id" in target ? target.id : "record"}`;

  async function submit(decision: "VERIFIED" | "REJECTED") {
    setBusy(decision);
    setError(null);

    const result = await sendJson(
      `/api/staff/${userId}/records/review`,
      "POST",
      {
        type: target.type,
        id: "id" in target ? target.id : undefined,
        decision,
        note: decision === "REJECTED" ? note : undefined,
        version,
      }
    );

    setBusy(null);
    if (!result.ok) {
      setError(result.fieldErrors.note?.[0] ?? result.error);
      return;
    }
    setRejecting(false);
    setNote("");
    router.refresh();
  }

  return (
    <div className="mt-5 space-y-3 border-t border-border/60 pt-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <StatusChip state={status} />

        {!rejecting ? (
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy !== null || status === "VERIFIED"}
              onClick={() => submit("VERIFIED")}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              {busy === "VERIFIED" ? "Verifying…" : "Verify"}
            </button>
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => setRejecting(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/40 px-3.5 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-500/10 disabled:opacity-50 dark:text-red-400"
            >
              <XCircle className="h-3.5 w-3.5" />
              Reject
            </button>
          </div>
        ) : null}
      </div>

      {status === "REJECTED" && reviewNote && !rejecting ? (
        <p className="rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs text-red-600 dark:text-red-400">
          <span className="font-semibold">Your note:</span> {reviewNote}
        </p>
      ) : null}

      {rejecting ? (
        <div className="space-y-3">
          <label htmlFor={noteId} className="block text-sm font-medium">
            What should the staff member fix?
          </label>
          <textarea
            id={noteId}
            value={note}
            maxLength={500}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. The scan is blurry. Please upload a clearer copy."
            className="min-h-24 w-full resize-y rounded-xl border border-border bg-background p-3 text-sm outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-4 focus:ring-primary/15"
          />
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => submit("REJECTED")}
              className="rounded-lg bg-red-600 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
            >
              {busy === "REJECTED" ? "Sending…" : "Send rejection"}
            </button>
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => {
                setRejecting(false);
                setError(null);
              }}
              className="rounded-lg px-3.5 py-2 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {error ? (
        <p role="alert" className={cn("text-xs text-red-600 dark:text-red-400")}>
          {error}
        </p>
      ) : null}
    </div>
  );
}