import { useQuery } from "@rocicorp/zero/react"
import {
  queries,
  formatShowTime,
  remainingUntil,
  resolveViewerShow,
} from "zero"
import { useShowClock } from "@/hooks/use-show-clock"
import { SegmentRenderer } from "@/components/segment-renderer"
import { ShowScreen } from "@/components/show-screen"

function Standby({ heading, message }: { heading: string; message: string }) {
  return (
    <div className="mx-auto max-w-md space-y-5 text-center">
      <div
        aria-hidden="true"
        className="tv-station-mark mx-auto mb-8 grid size-16 place-items-center rounded-full border text-3xl font-black tracking-tighter italic"
      >
        g.
      </div>
      <h2 className="text-3xl font-medium tracking-tight sm:text-5xl">
        {heading}
      </h2>
      <p className="text-sm leading-relaxed opacity-65">{message}</p>
    </div>
  )
}

export function ShowView() {
  const [live, liveResult] = useQuery(queries.shows.current())
  const [next, nextResult] = useQuery(queries.shows.next())
  const { now, connected } = useShowClock()
  if ([liveResult, nextResult].some((r) => r.type === "error"))
    return (
      <ShowScreen title="Gudfun TV" status="Signal interrupted" standby>
        <div role="alert">
          <Standby
            heading="Lost the signal."
            message="Unable to load the show. Please reload to try again."
          />
        </div>
      </ShowScreen>
    )
  if ([liveResult, nextResult].some((r) => r.type !== "complete") || !connected)
    return (
      <ShowScreen title="Gudfun TV" status="Tuning in" standby>
        <div role="status">
          <Standby
            heading="Finding your signal."
            message="Connecting to the show. Make yourself comfortable."
          />
        </div>
      </ShowScreen>
    )
  const resolved = resolveViewerShow(live, next)
  if (resolved.kind === "empty")
    return (
      <ShowScreen
        title="Gudfun TV"
        status="Off air"
        detail="A little pause between good things."
        standby
      >
        <Standby
          heading="See you on the next one."
          message="No show is scheduled just yet. Check back for our next broadcast."
        />
      </ShowScreen>
    )
  if (resolved.kind === "scheduled") {
    const show = resolved.show
    const scheduledStart = show.scheduledStart
    const remaining =
      scheduledStart === null || now === null
        ? null
        : remainingUntil(scheduledStart, now)
    const seconds = remaining === null ? null : Math.ceil(remaining / 1000)
    const units =
      seconds === null
        ? []
        : [
            { label: "days", value: Math.floor(seconds / 86400) },
            { label: "hours", value: Math.floor((seconds % 86400) / 3600) },
            { label: "minutes", value: Math.floor((seconds % 3600) / 60) },
            { label: "seconds", value: seconds % 60 },
          ].filter((unit) => unit.label !== "days" || unit.value > 0)
    return (
      <ShowScreen
        title={show.title}
        status="Up next"
        detail={
          scheduledStart === null
            ? "Schedule unavailable."
            : formatShowTime(
                scheduledStart,
                Intl.DateTimeFormat().resolvedOptions().timeZone
              )
        }
        standby
      >
        <div className="space-y-8 text-center">
          <p className="font-mono text-[10px] tracking-[0.25em] uppercase opacity-65">
            You’re early. We like that.
          </p>
          <h2 className="text-4xl font-medium tracking-tight sm:text-6xl">
            Good things incoming.
          </h2>
          {seconds === null ? (
            <p className="text-sm opacity-65">Synchronizing countdown…</p>
          ) : seconds === 0 ? (
            <p className="text-sm opacity-65">
              We’re ready when the host is. Stay tuned.
            </p>
          ) : (
            <div
              className="flex justify-center gap-5 sm:gap-8"
              aria-label="Time until the scheduled show"
            >
              {units.map((unit) => (
                <div key={unit.label}>
                  <span className="block font-mono text-3xl font-light tracking-tight tabular-nums sm:text-5xl">
                    {String(unit.value).padStart(2, "0")}
                  </span>
                  <span className="mt-2 block font-mono text-[9px] tracking-[0.2em] uppercase opacity-50">
                    {unit.label}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </ShowScreen>
    )
  }
  const show = resolved.show
  const segment = show.segments[0]
  return (
    <ShowScreen
      title={show.title}
      status="On air"
      detail={segment?.title ?? "You’re tuned in."}
      standby={!segment || segment.type === "placeholder"}
    >
      {segment ? (
        <div className="space-y-5">
          <h2 className="font-mono text-xs tracking-widest uppercase opacity-65">
            {segment.title}
          </h2>
          <SegmentRenderer
            key={segment.id}
            type={segment.type}
            configuration={segment.configuration}
          />
        </div>
      ) : (
        <Standby
          heading="You’re in good company."
          message="The show is live. Waiting for the host to take it away."
        />
      )}
    </ShowScreen>
  )
}
