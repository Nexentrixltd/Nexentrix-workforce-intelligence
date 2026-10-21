export const WEEK_DAYS = 5;
const PERCENT_PER_DAY = 20;

export const toDays = (pct: number) =>
  Number((pct / PERCENT_PER_DAY).toFixed(1));
export const daysLabel = (d: number) => `${d} day${d === 1 ? "" : "s"}`;

export const DAY_PRESETS: { value: number; label: string }[] = [
  { value: 20, label: "1 day a week" },
  { value: 40, label: "2 days a week" },
  { value: 60, label: "3 days a week" },
  { value: 80, label: "4 days a week" },
  { value: 100, label: "Full time (5 days)" },
];

export function allocationOptions(current: number | null) {
  if (current == null || DAY_PRESETS.some((p) => p.value === current))
    return DAY_PRESETS;
  return [
    ...DAY_PRESETS,
    { value: current, label: `${daysLabel(toDays(current))} a week` },
  ].sort((a, b) => a.value - b.value);
}

export function loadTone(days: number) {
  if (days > WEEK_DAYS) return { bar: "bg-red-500", text: "text-red-600" };
  if (days > WEEK_DAYS * 0.8)
    return { bar: "bg-amber-500", text: "text-amber-600" };
  return { bar: "bg-emerald-500", text: "text-text-primary" };
}

export const STATUS: Record<
  string,
  { label: string; pill: string; dot: string }
> = {
  PLANNING: {
    label: "Planning",
    pill: "text-sky-600 uppercase dark:text-sky-400",
    dot: "bg-sky-500",
  },
  ACTIVE: {
    label: "Active",
    pill: "text-emerald-600 uppercase dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  ON_HOLD: {
    label: "On hold",
    pill: "text-amber-600 uppercase dark:text-amber-400",
    dot: "bg-amber-500",
  },
  COMPLETED: {
    label: "Completed",
    pill: "ext-indigo-600 uppercase dark:text-indigo-400",
    dot: "bg-indigo-500",
  },
  CANCELLED: {
    label: "Cancelled",
    pill: "text-red-600 uppercase dark:text-red-400",
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
