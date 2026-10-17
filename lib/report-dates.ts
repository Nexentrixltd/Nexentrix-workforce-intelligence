export const REPORT_TZ = "Africa/Lagos";
export const REPORT_WINDOW_DAYS = 7; 

export function todayInTz(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: REPORT_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function addDays(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function reportDateRange(now = new Date()) {
  const max = todayInTz(now);
  return { min: addDays(max, -(REPORT_WINDOW_DAYS - 1)), max };
}
