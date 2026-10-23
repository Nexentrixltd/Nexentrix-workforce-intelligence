import { prisma } from "@/lib/prisma";

export type NotificationCategory = {
  id: string;
  title: string;
  description: string;
  roles: string[];
  types: string[];
};

export const NOTIFICATION_CATEGORIES: NotificationCategory[] = [
  {
    id: "reports-to-review",
    title: "Reports to review",
    description:
      "When someone on your team submits a report, and a daily count of reports still waiting for you.",
    roles: ["TEAM_LEAD"],
    types: ["REPORT_SUBMITTED", "PENDING_REVIEWS_DIGEST"],
  },
  {
    id: "report-reviews",
    title: "Report reviews",
    description: "When one of your reports is approved or rejected.",
    roles: ["STAFF"],
    types: ["REPORT_APPROVED", "REPORT_REJECTED"],
  },
  {
    id: "project-assignments",
    title: "Project assignments",
    description:
      "When you are made the lead of a project, or added to or removed from one.",
    roles: ["STAFF", "TEAM_LEAD"],
    types: [
      "PROJECT_LEAD_ASSIGNED",
      "PROJECT_MEMBER_ADDED",
      "PROJECT_MEMBER_REMOVED",
    ],
  },
  {
    id: "project-deadlines",
    title: "Project deadlines",
    description:
      "A heads-up a week before, the day before, and on the day a project of yours is due.",
    roles: ["STAFF", "TEAM_LEAD"],
    types: ["PROJECT_DEADLINE"],
  },
];

export function categoriesForRole(role: string) {
  return NOTIFICATION_CATEGORIES.filter((c) => c.roles.includes(role));
}

export function categoryForType(type: string) {
  return NOTIFICATION_CATEGORIES.find((c) => c.types.includes(type));
}

export async function filterByPreferences<
  T extends { userId: string; type: string },
>(items: T[]): Promise<T[]> {
  const governed = items.filter((i) => categoryForType(i.type));
  if (governed.length === 0) return items;

  const users = await prisma.user.findMany({
    where: { id: { in: [...new Set(governed.map((i) => i.userId))] } },
    select: { id: true, mutedNotifications: true },
  });
  const muted = new Map(
    users.map((u) => [u.id, new Set(u.mutedNotifications)]),
  );

  return items.filter((i) => {
    const category = categoryForType(i.type);
    if (!category) return true;
    return !muted.get(i.userId)?.has(category.id);
  });
}
