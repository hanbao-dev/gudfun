import { anchoredNow, serverTimeAnchor } from "zero"

type ClockEnvironment = {
  document: Pick<
    Document,
    "visibilityState" | "addEventListener" | "removeEventListener"
  >
  window: Pick<Window, "addEventListener" | "removeEventListener">
  now: () => number
  interval: (callback: () => void, ms: number) => ReturnType<typeof setInterval>
  clearInterval: typeof clearInterval
}

// Browser lifecycle wiring lives outside React so reconnect, suspension and races can be tested.
export function startShowClock(
  {
    readTime,
    refreshShows,
    onTime,
  }: {
    readTime: (signal: AbortSignal) => Promise<number>
    refreshShows: () => Promise<unknown>
    onTime: (now: number | null) => void
  },
  environment: ClockEnvironment = {
    document,
    window,
    now: () => performance.now(),
    interval: (callback, ms) => setInterval(callback, ms),
    clearInterval,
  }
) {
  let anchor: ReturnType<typeof serverTimeAnchor> | undefined
  let controller: AbortController | undefined
  let disposed = false
  async function refresh() {
    controller?.abort()
    const request = new AbortController()
    controller = request
    anchor = undefined
    onTime(null)
    try {
      const sentAt = environment.now()
      const serverNow = await readTime(request.signal)
      const nextAnchor = serverTimeAnchor(serverNow, sentAt, environment.now())
      await refreshShows()
      if (disposed || request.signal.aborted) return
      anchor = nextAnchor
      onTime(anchoredNow(anchor, environment.now()))
    } catch {
      // Keep the absolute schedule visible; never fall back to the device wall clock.
    }
  }
  function resume() {
    if (environment.document.visibilityState === "visible") void refresh()
  }
  void refresh()
  const tick = environment.interval(() => {
    if (anchor) onTime(anchoredNow(anchor, environment.now()))
  }, 1000)
  const resync = environment.interval(resume, 60000)
  environment.document.addEventListener("visibilitychange", resume)
  environment.window.addEventListener("pageshow", resume)
  environment.window.addEventListener("online", resume)
  return () => {
    disposed = true
    controller?.abort()
    environment.clearInterval(tick)
    environment.clearInterval(resync)
    environment.document.removeEventListener("visibilitychange", resume)
    environment.window.removeEventListener("pageshow", resume)
    environment.window.removeEventListener("online", resume)
  }
}
