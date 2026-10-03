export type DateFilterPreset =
  | "TODAY"
  | "LAST_7_DAYS"
  | "THIS_MONTH"
  | "LAST_MONTH"
  | "THIS_YEAR"
  | "CUSTOM";

export interface DateRange {
  startDate: Date;
  endDate: Date;
  preset: DateFilterPreset;
}

export function getDateRangeFromPreset(
  preset: DateFilterPreset,
  customStart?: string,
  customEnd?: string
): DateRange {
  const now = new Date();

  if (preset === "TODAY") {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    return { startDate: start, endDate: end, preset };
  }

  if (preset === "LAST_7_DAYS") {
    const start = new Date(now);
    start.setDate(now.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    return { startDate: start, endDate: end, preset };
  }

  if (preset === "LAST_MONTH") {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    return { startDate: start, endDate: end, preset };
  }

  if (preset === "THIS_YEAR") {
    const start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    return { startDate: start, endDate: end, preset };
  }

  if (preset === "CUSTOM" && customStart) {
    const start = new Date(customStart);
    start.setHours(0, 0, 0, 0);
    const end = customEnd ? new Date(customEnd) : new Date(start);
    end.setHours(23, 59, 59, 999);
    return { startDate: start, endDate: end, preset };
  }

  // Default: THIS_MONTH
  const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { startDate: start, endDate: end, preset: "THIS_MONTH" };
}

export function getPreviousEquivalentPeriod(startDate: Date, endDate: Date): { prevStart: Date; prevEnd: Date } {
  const durationMs = endDate.getTime() - startDate.getTime();
  const prevEnd = new Date(startDate.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - durationMs);
  return { prevStart, prevEnd };
}

export function calculatePercentageChange(current: number, previous: number): number | null {
  if (previous <= 0) return null; // Avoid misleading 100% when prev is 0 or non-existent
  const change = ((current - previous) / previous) * 100;
  return Number(change.toFixed(1));
}
