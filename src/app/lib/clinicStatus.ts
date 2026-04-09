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

type ParsedHours = {
  openMinutes: number;
  closeMinutes: number;
  openLabel: string;
  closeLabel: string;
};

function normalizeHours(hours: string) {
  return hours.replace(/â€“|–|—/g, "-").replace(/\s+/g, " ").trim();
}

function toMinutes(hourText: string, minuteText: string, periodText: string) {
  let hour = Number.parseInt(hourText, 10);
  const minute = Number.parseInt(minuteText, 10);
  const period = periodText.toUpperCase();

  if (period === "PM" && hour !== 12) hour += 12;
  if (period === "AM" && hour === 12) hour = 0;

  return hour * 60 + minute;
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
  const dayName = date.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
  return schedule.find((entry) => entry.day.toLowerCase() === dayName);
}

function getNextOpening(schedule: ClinicScheduleEntry[], now: Date) {
  for (let offset = 1; offset <= 7; offset += 1) {
    const nextDate = new Date(now);
    nextDate.setDate(now.getDate() + offset);
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
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

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
    const dayText =
      nextOpening.offset === 1 ? "tomorrow" : nextOpening.dayLabel;

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
