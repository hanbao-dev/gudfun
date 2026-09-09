// Resolve wall time explicitly; Date.parse(localInput) silently normalizes DST gaps.
export function localScheduleInstant(input: string, timeZone: string): number {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(input))
    throw new Error("Enter a complete date and time.");
  const [year, month, day, hour, minute] = input.split(/\D/).map(Number) as [
    number,
    number,
    number,
    number,
    number,
  ];
  const wall = Date.UTC(year, month - 1, day, hour, minute);
  if (
    year < 2000 ||
    year > 2100 ||
    new Date(wall).toISOString().slice(0, 16) !== input
  )
    throw new Error("Enter a valid date between 2000 and 2100.");
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  function wallAt(instant: number) {
    const parts = Object.fromEntries(
      formatter.formatToParts(instant).map((p) => [p.type, p.value]),
    );
    return Date.UTC(
      +parts.year!,
      +parts.month! - 1,
      +parts.day!,
      +parts.hour!,
      +parts.minute!,
      +parts.second!,
    );
  }
  const offsets = new Set<number>();
  // Sample both sides of any nearby modern timezone transition (including 30-minute shifts).
  for (let h = -36; h <= 36; h++) {
    const instant = wall + h * 3600000;
    offsets.add(wallAt(instant) - instant);
  }
  const candidates = [...offsets]
    .map((offset) => wall - offset)
    .filter((instant) => wallAt(instant) === wall);
  if (!candidates.length)
    throw new Error(
      "This local time does not exist because the clocks change. Choose another time.",
    );
  if (candidates.length > 1)
    throw new Error(
      "This local time occurs twice because the clocks change. Choose an unambiguous time outside the repeated hour.",
    );
  return candidates[0]!;
}
export function formatShowTime(instant: number, timeZone: string) {
  return (
    new Intl.DateTimeFormat(undefined, {
      timeZone,
      weekday: "long",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    }).format(instant) + ` (${timeZone})`
  );
}
export function scheduleInputValue(instant: number, timeZone: string) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(instant)
      .map((p) => [p.type, p.value]),
  );
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}
export function serverTimeAnchor(
  serverNow: number,
  sentAt: number,
  receivedAt: number,
) {
  if (!Number.isFinite(serverNow) || receivedAt < sentAt)
    throw new Error("Invalid server time");
  return { serverNow: serverNow + (receivedAt - sentAt) / 2, receivedAt };
}
export function anchoredNow(
  anchor: { serverNow: number; receivedAt: number },
  monotonicNow: number,
) {
  return anchor.serverNow + Math.max(0, monotonicNow - anchor.receivedAt);
}
