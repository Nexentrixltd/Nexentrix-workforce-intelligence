export const WEEK_DAYS = 5;
const PERCENT_PER_DAY = 20; // 1 day a week = 20%

export const toDays = (pct: number) =>
  Number((pct / PERCENT_PER_DAY).toFixed(1));
export const daysLabel = (d: number) => `${d} day${d === 1 ? "" : "s"}`;

export function loadTone(days: number) {
  if (days > WEEK_DAYS) return { bar: "bg-red-500", text: "text-red-600" };
  if (days > WEEK_DAYS * 0.8)
    return { bar: "bg-amber-500", text: "text-amber-600" };
  return { bar: "bg-emerald-500", text: "text-gray-700" };
}

export const STATUS: Record<
  string,
  { label: string; pill: string; dot: string }
> = {
  PLANNING: {
    label: "Planning",
    pill: "bg-sky-50 text-sky-700",
    dot: "bg-sky-500",
  },
  ACTIVE: {
    label: "Active",
    pill: "bg-emerald-50 text-emerald-700",
    dot: "bg-emerald-500",
  },
  ON_HOLD: {
    label: "On hold",
    pill: "bg-amber-50 text-amber-700",
    dot: "bg-amber-500",
  },
  COMPLETED: {
    label: "Completed",
    pill: "bg-indigo-50 text-indigo-700",
    dot: "bg-indigo-500",
  },
  CANCELLED: {
    label: "Cancelled",
    pill: "bg-red-50 text-red-700",
    dot: "bg-red-500",
  },
};

export function fmtDate(value?: string | null) {
  if (!value) return "Not set";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}
