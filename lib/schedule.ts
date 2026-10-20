// Pure scheduling helpers. No I/O here so they are easy to test.

const TEXTS_PER_DAY = [2, 3, 5, 7, 10];

export function textsPerDay(freq: number): number {
  const i = Math.min(Math.max(Math.round(freq), 1), 5) - 1;
  return TEXTS_PER_DAY[i];
}

/** Minutes since local midnight, in the owner's time zone. */
export function localMinutes(at: number, timezone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
  }).formatToParts(new Date(at));
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0) % 24;
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return h * 60 + m;
}

/** True when a local time falls inside quiet hours. Handles windows that cross midnight. */
export function isQuietAt(minutes: number, quietStart: number, quietEnd: number): boolean {
  const s = (quietStart % 24) * 60;
  const e = (quietEnd % 24) * 60;
  if (s === e) return false;
  if (s < e) return minutes >= s && minutes < e;
  return minutes >= s || minutes < e;
}

export function quietHoursLength(quietStart: number, quietEnd: number): number {
  const s = quietStart % 24;
  const e = quietEnd % 24;
  return s <= e ? e - s : 24 - s + e;
}

export function isQuiet(at: number, p: { quietStart: number; quietEnd: number; timezone: string }): boolean {
  return isQuietAt(localMinutes(at, p.timezone), p.quietStart, p.quietEnd);
}

/**
 * When the next unprompted text should go out. Spreads texts across waking hours with some
 * randomness so it feels like a dog, not a clock, and never lands inside quiet hours.
 */
export function planNext(
  now: number,
  p: { freq: number; quietStart: number; quietEnd: number; timezone: string },
  rand: () => number = Math.random,
): number {
  const awakeHours = Math.max(24 - quietHoursLength(p.quietStart, p.quietEnd), 4);
  const gapHours = (awakeHours / textsPerDay(p.freq)) * (0.6 + 0.8 * rand());
  let t = now + Math.max(gapHours, 0.5) * 3600_000;
  if (isQuiet(t, p)) {
    // Walk forward until quiet hours end, then add a small random delay so it is not on the dot.
    let steps = 0;
    while (isQuiet(t, p) && steps < 200) {
      t += 15 * 60_000;
      steps++;
    }
    t += Math.floor(rand() * 45) * 60_000;
  }
  return t;
}

/** "Tuesday 2:14 PM", in the owner's time zone. */
export function describeLocalTime(at: number, timezone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "long",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(at));
}
