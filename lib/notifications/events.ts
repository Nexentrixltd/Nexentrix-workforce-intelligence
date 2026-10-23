import { prisma } from "@/lib/prisma";
import { notify, projectHref, reportsHref } from "./index";

const clip = (text: string, max: number) =>
  text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;

// Call after a team lead / HR / admin approves or rejects a report.
export function notifyReportReviewed(args: {
  report: {
    id: string;
    userId: string; // the author
    reportDate: Date;
    projectName: string | null;
  };
  status: "APPROVED" | "REJECTED";
  reviewerName: string;
  note?: string | null;
}) {
  const { report, status, reviewerName, note } = args;
  const day = report.reportDate.toISOString().slice(0, 10);
  const where = report.projectName ?? "General work";
  const approved = status === "APPROVED";

  return notify({
    userId: report.userId,
    type: approved ? "REPORT_APPROVED" : "REPORT_REJECTED",
    title: approved ? "Your report was approved" : "Your report was rejected",
    body: approved
      ? `${where}, ${day}. Approved by ${reviewerName}.`
      : `${where}, ${day}. ${clip(note?.trim() || "No reason was given.", 140)}`,
    href: reportsHref("STAFF"),
  });
}

// Call after adding someone to a project.
export function notifyProjectMemberAdded(args: {
  userId: string;
  userRole: string;
  projectId: string;
  projectName: string;
  allocationDays?: number | null; 
}) {
  const { userId, userRole, projectId, projectName, allocationDays } = args;
  return notify({
    userId,
    type: "PROJECT_MEMBER_ADDED",
    title: `You were added to ${projectName}`,
    body: allocationDays
      ? `${allocationDays} ${allocationDays === 1 ? "day" : "days"} a week.`
      : null,
    href: projectHref(userRole, projectId),
  });
}

// Call after removing someone from a project.
export function notifyProjectMemberRemoved(args: {
  userId: string;
  projectName: string;
}) {
  return notify({
    userId: args.userId,
    type: "PROJECT_MEMBER_REMOVED",
    title: `You were removed from ${args.projectName}`,
    body: null,
    href: null,
  });
}

/* -------------------------------------------------------------------------- */
/* Security (always delivered: these types are in no category on purpose)      */
/* -------------------------------------------------------------------------- */

export function notifyPasswordChanged(userId: string) {
  return notify({
    userId,
    type: "PASSWORD_CHANGED",
    title: "Your password was changed",
    body: "If this was not you, contact HR or Admin immediately.",
    href: "/dashboard/settings/security",
  });
}

function describeAgent(ua: string | null) {
  if (!ua) return "an unknown device";
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\//.test(ua)
      ? "Opera"
      : /Firefox\//.test(ua)
        ? "Firefox"
        : /Chrome\//.test(ua)
          ? "Chrome"
          : /Safari\//.test(ua)
            ? "Safari"
            : "a browser";
  const os = /Windows/.test(ua)
    ? "Windows"
    : /Android/.test(ua)
      ? "Android"
      : /iPhone|iPad|iPod/.test(ua)
        ? "iOS"
        : /Mac OS X/.test(ua)
          ? "macOS"
          : /Linux/.test(ua)
            ? "Linux"
            : "an unknown system";
  return `${browser} on ${os}`;
}

export async function notifyIfNewDevice(args: {
  userId: string;
  sessionId: string; 
  userAgent: string | null;
  ip?: string | null;
}) {
  const { userId, sessionId, userAgent, ip } = args;
  try {
    const others = await prisma.session.count({
      where: { userId, NOT: { id: sessionId } },
    });
    if (others === 0) return;

    const sameDevice = await prisma.session.findFirst({
      where: { userId, NOT: { id: sessionId }, userAgent },
      select: { id: true },
    });
    if (sameDevice) return;

    await notify({
      userId,
      type: "NEW_SIGN_IN",
      title: "New sign-in to your account",
      body: `${describeAgent(userAgent)}${ip ? ` (${ip})` : ""}. If this was not you, change your password and contact HR or Admin.`,
      href: "/dashboard/settings/security",
    });
  } catch (error) {
    console.error("[notify] new device check failed", error);
  }
}
