import { expect, test } from "bun:test";
import {
  anchoredNow,
  formatShowTime,
  localScheduleInstant,
  scheduleInputValue,
  serverTimeAnchor,
} from "../src/show-time";
import { remainingUntil } from "../src/show-definitions";

test("distant timezone inputs and date boundaries resolve to the same instant", () => {
  const instant = Date.UTC(2026, 8, 10, 6);
  expect(localScheduleInstant("2026-09-09T20:00", "Pacific/Tahiti")).toBe(
    instant,
  );
  expect(localScheduleInstant("2026-09-10T20:00", "Pacific/Kiritimati")).toBe(
    instant,
  );
  for (const zone of [
    "Pacific/Tahiti",
    "Pacific/Kiritimati",
    "America/New_York",
    "Asia/Kathmandu",
    "Australia/Lord_Howe",
  ]) {
    expect(localScheduleInstant(scheduleInputValue(instant, zone), zone)).toBe(
      instant,
    );
    expect(formatShowTime(instant, zone)).toContain(zone);
  }
});
test("DST gaps, repeated hours, and malformed dates are rejected", () => {
  expect(() =>
    localScheduleInstant("2026-03-08T02:30", "America/New_York"),
  ).toThrow("does not exist");
  expect(() =>
    localScheduleInstant("2026-11-01T01:30", "America/New_York"),
  ).toThrow("occurs twice");
  expect(() =>
    localScheduleInstant("2026-04-05T01:45", "Australia/Lord_Howe"),
  ).toThrow("occurs twice");
  expect(() =>
    localScheduleInstant("2026-10-04T02:15", "Australia/Lord_Howe"),
  ).toThrow("does not exist");
  expect(() => localScheduleInstant("2026-02-30T12:00", "UTC")).toThrow(
    "valid date",
  );
  expect(() => localScheduleInstant("", "UTC")).toThrow();
  expect(localScheduleInstant("2026-11-01T02:30", "America/New_York")).toBe(
    Date.UTC(2026, 10, 1, 7, 30),
  );
});
test("countdowns use server time and monotonic progress, independent of device wall-clock skew", () => {
  const target = 1800000000000;
  const anchor = serverTimeAnchor(target - 60000, 100, 300);
  expect(remainingUntil(target, anchoredNow(anchor, 1300))).toBe(58900);
  // A new response on reconnect/return replaces stale timing, including suspension.
  const resumed = serverTimeAnchor(target + 10000, 900, 1100);
  expect(remainingUntil(target, anchoredNow(resumed, 1200))).toBe(0);
  expect(() => serverTimeAnchor(NaN, 0, 1)).toThrow();
});
