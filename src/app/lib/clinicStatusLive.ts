export interface ClinicScheduleEntry {
  day: string;
  hours: string;
  closed?: boolean;
}

export interface ClinicStatus {
  isOpen: boolean;
  title: string;
  detail: string;
}

const CLINIC_TIME_ZONE = "Asia/Manila";
const WEEKDAY_ORDER = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

type ParsedHours = {
  openMinutes: number;
  closeMinutes: number;
  openLabel: string;
  closeLabel: string;
};

function normalizeHours(hours: string) {
  return hours.replace(/Ã¢â‚¬â€œ|â€“|â€”—|–|—/g, "-").replace(/\s+/g, " ").trim();
}

function getClinicTimeParts(now: Date, timeZone = CLINIC_TIME_ZONE) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);

  const weekday = parts.find((part) => part.type === "weekday")?.value ?? "Sunday";
  const hour = Number.parseInt(parts.find((part) => part.type === "hour")?.value ?? "0", 10);
  const minute = Number.parseInt(parts.find((part) => part.type === "minute")?.value ?? "0", 10);
  const weekdayIndex = WEEKDAY_ORDER.findIndex((day) => day === weekday);

  return {
    weekday,
    weekdayIndex: weekdayIndex >= 0 ? weekdayIndex : 0,
    currentMinutes: hour * 60 + minute,
  };
}

function toMinutes(hourText: string, minuteText: string, periodText: string) {
  let hour = Number.parseInt(hourText, 10);
  const minute = Number.parseInt(minuteText, 10);
  const period = periodText.toUpperCase();

  if (period === "PM" && hour !== 12) hour += 12;
  if (period === "AM" && hour === 12) hour = 0;

  return hour * 60 + minute;
}

export function getClinicWeekdayIndex(now = new Date(), timeZone = CLINIC_TIME_ZONE) {
  return getClinicTimeParts(now, timeZone).weekdayIndex;
}

export function parseClinicHours(hours: string): ParsedHours | null {
  if (!hours || hours.toLowerCase() === "closed") return null;

  const normalized = normalizeHours(hours);
  const match = normalized.match(
    /(\d{1,2}):(\d{2})\s*(AM|PM)\s*-\s*(\d{1,2}):(\d{2})\s*(AM|PM)/i,
  );

  if (!match) return null;

  return {
    openMinutes: toMinutes(match[1], match[2], match[3]),
    closeMinutes: toMinutes(match[4], match[5], match[6]),
    openLabel: `${match[1]}:${match[2]} ${match[3].toUpperCase()}`,
    closeLabel: `${match[4]}:${match[5]} ${match[6].toUpperCase()}`,
  };
}

function getEntryForDate(schedule: ClinicScheduleEntry[], date: Date) {
  const { weekday } = getClinicTimeParts(date);
  return schedule.find((entry) => entry.day.toLowerCase() === weekday.toLowerCase());
}

function getNextOpening(schedule: ClinicScheduleEntry[], now: Date) {
  for (let offset = 1; offset <= 7; offset += 1) {
    const nextDate = new Date(now.getTime() + offset * 24 * 60 * 60 * 1000);
    const nextEntry = getEntryForDate(schedule, nextDate);
    const parsed = nextEntry ? parseClinicHours(nextEntry.hours) : null;
    if (!nextEntry || nextEntry.closed || !parsed) continue;

    return {
      offset,
      dayLabel: nextEntry.day,
      openLabel: parsed.openLabel,
    };
  }

  return null;
}

export function getClinicStatus(schedule: ClinicScheduleEntry[], now = new Date()): ClinicStatus {
  const todayEntry = getEntryForDate(schedule, now);
  const todayHours = todayEntry ? parseClinicHours(todayEntry.hours) : null;
  const { currentMinutes } = getClinicTimeParts(now);

  if (todayEntry && !todayEntry.closed && todayHours) {
    if (currentMinutes >= todayHours.openMinutes && currentMinutes < todayHours.closeMinutes) {
      return {
        isOpen: true,
        title: "Open Now",
        detail: `Closes at ${todayHours.closeLabel} today`,
      };
    }

    if (currentMinutes < todayHours.openMinutes) {
      return {
        isOpen: false,
        title: "Closed Now",
        detail: `Opens at ${todayHours.openLabel} today`,
      };
    }
  }

  const nextOpening = getNextOpening(schedule, now);
  if (nextOpening) {
    const dayText = nextOpening.offset === 1 ? "tomorrow" : nextOpening.dayLabel;

    return {
      isOpen: false,
      title: todayEntry?.closed ? "Closed Today" : "Closed Now",
      detail: `Opens ${dayText} at ${nextOpening.openLabel}`,
    };
  }

  return {
    isOpen: false,
    title: "Closed",
    detail: "Clinic hours are currently unavailable",
  };
}
