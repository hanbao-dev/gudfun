import { expect, test } from "bun:test"
import { startShowClock } from "../src/lib/show-clock"

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))
function environment() {
  const document = Object.assign(new EventTarget(), {
    visibilityState: "visible" as DocumentVisibilityState,
  })
  const window = new EventTarget()
  const timers = new Map<number, () => void>()
  let elapsed = 100
  return {
    document,
    window,
    timers,
    advance: (ms: number) => {
      elapsed += ms
    },
    now: () => elapsed,
    interval: (callback: () => void, ms: number) => {
      timers.set(ms, callback)
      return ms as unknown as ReturnType<typeof setInterval>
    },
    clearInterval: ((id: ReturnType<typeof setInterval>) => {
      timers.delete(Number(id))
    }) as typeof clearInterval,
  }
}
test("login, tab return, pageshow, network reconnect and periodic refresh resync time and show state", async () => {
  const env = environment()
  const times: (number | null)[] = []
  let serverNow = 1800000000000
  let reads = 0
  let showRefreshes = 0
  const stop = startShowClock(
    {
      readTime: async () => {
        reads++
        return serverNow
      },
      refreshShows: async () => {
        showRefreshes++
      },
      onTime: (now) => times.push(now),
    },
    env
  )
  await flush()
  expect(times.at(-1)).toBe(serverNow)
  env.advance(1000)
  env.timers.get(1000)!()
  expect(times.at(-1)).toBe(serverNow + 1000)
  for (const [target, name] of [
    [env.document, "visibilitychange"],
    [env.window, "pageshow"],
    [env.window, "online"],
  ] as const) {
    serverNow += 3600000
    target.dispatchEvent(new Event(name))
    expect(times.at(-1)).toBeNull()
    await flush()
    expect(times.at(-1)).toBe(serverNow)
  }
  env.timers.get(60000)!()
  await flush()
  expect(reads).toBe(5)
  expect(showRefreshes).toBe(5)
  stop()
  env.window.dispatchEvent(new Event("online"))
  await flush()
  expect(reads).toBe(5)
  expect(env.timers.size).toBe(0)
})
test("stale responses cannot replace a newer clock; failures never use device time", async () => {
  const env = environment()
  const requests: {
    resolve: (value: number) => void
    reject: () => void
    signal: AbortSignal
  }[] = []
  const times: (number | null)[] = []
  const stop = startShowClock(
    {
      readTime: (signal) =>
        new Promise((resolve, reject) =>
          requests.push({
            resolve,
            reject: () => reject(new Error("offline")),
            signal,
          })
        ),
      refreshShows: async () => {},
      onTime: (now) => times.push(now),
    },
    env
  )
  env.window.dispatchEvent(new Event("online"))
  expect(requests[0]!.signal.aborted).toBe(true)
  requests[1]!.resolve(2000)
  await flush()
  requests[0]!.resolve(1000)
  await flush()
  expect(times.at(-1)).toBe(2000)
  env.window.dispatchEvent(new Event("online"))
  requests[2]!.reject()
  await flush()
  env.advance(1000)
  env.timers.get(1000)!()
  expect(times.at(-1)).toBeNull()
  stop()
})
