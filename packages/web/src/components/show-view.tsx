import { useQuery } from "@rocicorp/zero/react"
import {
  queries,
  formatShowTime,
  remainingUntil,
  resolveViewerShow,
} from "zero"
import { useShowClock } from "@/hooks/use-show-clock"
import { SegmentRenderer } from "@/components/segment-renderer"

export function ShowView() {
  const [live, liveResult] = useQuery(queries.shows.current())
  const [next, nextResult] = useQuery(queries.shows.next())
  const { now, connected } = useShowClock()
  if ([liveResult, nextResult].some((r) => r.type === "error"))
    return (
      <p role="alert">Unable to load the show. Please reload to try again.</p>
    )
  if ([liveResult, nextResult].some((r) => r.type !== "complete"))
    return <p role="status">Loading show…</p>
  if (!connected)
    return <p role="status">Reconnecting to get the current show…</p>
  const resolved = resolveViewerShow(live, next)
  if (resolved.kind === "empty") return <p>No show available.</p>
  if (resolved.kind === "scheduled") {
    const show = resolved.show
    const scheduledStart = show.scheduledStart
    if (scheduledStart === null) return <p>Schedule unavailable.</p>
    const remaining = now === null ? null : remainingUntil(scheduledStart, now)
    const minutes = remaining === null ? null : Math.ceil(remaining / 60000)
    return (
      <section className="space-y-3 rounded-lg border p-6">
        <h1 className="text-2xl font-semibold">Next show: {show.title}</h1>
        <p>
          {formatShowTime(
            scheduledStart,
            Intl.DateTimeFormat().resolvedOptions().timeZone
          )}
        </p>
        <p className="text-muted-foreground">
          {minutes === null
            ? "Synchronizing countdown…"
            : minutes === 0
              ? "Waiting for the host to start."
              : `Starts in ${Math.floor(minutes / 1440)}d ${Math.floor((minutes % 1440) / 60)}h ${minutes % 60}m`}
        </p>
      </section>
    )
  }
  const show = resolved.show
  const segment = show.segments[0]
  return (
    <section className="space-y-3 rounded-lg border p-6">
      <h1 className="text-2xl font-semibold">{show.title}</h1>
      <p className="text-sm text-muted-foreground">Live</p>
      {segment ? (
        <div className="space-y-3">
          <h2 className="text-lg font-medium">{segment.title}</h2>
          <SegmentRenderer
            key={segment.id}
            type={segment.type}
            configuration={segment.configuration}
          />
        </div>
      ) : (
        <p className="text-muted-foreground">
          Waiting for the host to select a segment.
        </p>
      )}
    </section>
  )
}
