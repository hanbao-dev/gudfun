import { useQuery } from "@rocicorp/zero/react"
import { queries, segmentTypeSchema, segmentTypes } from "zero"

export function ShowView() {
  const [show, result] = useQuery(queries.shows.current())
  if (result.type === "error")
    return (
      <p role="alert">Unable to load the show. Please reload to try again.</p>
    )
  if (result.type !== "complete") return <p role="status">Loading show…</p>
  if (!show) return <p>No show available.</p>
  const segment = show.segments[0]
  const type = segmentTypeSchema.safeParse(segment?.type)
  return (
    <section className="space-y-3 rounded-lg border p-6">
      <h1 className="text-2xl font-semibold">{show.title}</h1>
      {segment ? (
        <div>
          <h2 className="text-lg font-medium">{segment.title}</h2>
          <p className="text-sm text-muted-foreground">
            {type.success ? segmentTypes[type.data].label : "Unknown segment"} —
            segment experience coming later.
          </p>
        </div>
      ) : (
        <p className="text-muted-foreground">No current segment.</p>
      )}
    </section>
  )
}
