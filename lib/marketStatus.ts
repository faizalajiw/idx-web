// IDX market-hours status, computed from the current wall clock in WIB.
// Sessions: 08:30–09:00 prabuka, 09:00–16:00 bursa (Mon–Fri), else closed.

export type MarketStatus = "OPEN" | "PRE" | "CLOSED";

const WIB = "Asia/Jakarta";

const PRE_OPEN_MIN = 8 * 60 + 30; // 08:30
const OPEN_MIN = 9 * 60; // 09:00
const CLOSE_MIN = 16 * 60; // 16:00

export interface WibParts {
  weekday: "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";
  minutes: number; // minutes since midnight WIB
}

/** Current time parts in WIB, derived via Intl (no manual offset math). */
export function getWibParts(date = new Date()): WibParts {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: WIB,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(date).map((p) => [p.type, p.value]),
  );
  const hour = parseInt(parts.hour!, 10);
  const minute = parseInt(parts.minute!, 10);
  return {
    weekday: parts.weekday as WibParts["weekday"],
    minutes: hour * 60 + minute,
  };
}

export interface MarketState {
  status: MarketStatus;
  label: string;
  detail: string;
}

export function marketStatus(now = new Date()): MarketState {
  const { weekday, minutes } = getWibParts(now);
  const isWeekend = weekday === "Sat" || weekday === "Sun";

  if (!isWeekend && minutes >= PRE_OPEN_MIN && minutes < OPEN_MIN) {
    return { status: "PRE", label: "PRABUKA", detail: `buka ${OPEN_MIN - minutes}m lagi` };
  }
  if (!isWeekend && minutes >= OPEN_MIN && minutes < CLOSE_MIN) {
    const left = CLOSE_MIN - minutes;
    return {
      status: "OPEN",
      label: "BUKA",
      detail: `tutup ${Math.floor(left / 60)}j ${left % 60}m lagi`,
    };
  }
  if (!isWeekend && minutes < PRE_OPEN_MIN) {
    return { status: "CLOSED", label: "TUTUP", detail: "buka 09:00 hari ini" };
  }
  if (!isWeekend && weekday === "Fri") {
    return { status: "CLOSED", label: "TUTUP", detail: "buka Senin 09:00" };
  }
  if (!isWeekend) {
    return { status: "CLOSED", label: "TUTUP", detail: "buka besok 09:00" };
  }
  return { status: "CLOSED", label: "TUTUP", detail: "buka Senin 09:00" };
}
