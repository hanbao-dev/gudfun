import { useEffect, useState } from "react"
import { useConnectionState, useZero } from "@rocicorp/zero/react"
import { queries, type Schema } from "zero"
import { config } from "@/config"
import { startShowClock } from "@/lib/show-clock"

export function useShowClock() {
  const zero = useZero<Schema>()
  const connection = useConnectionState()
  const [now, setNow] = useState<number | null>(null)
  useEffect(() => {
    if (connection.name !== "connected") return
    return startShowClock({
      async readTime(signal) {
        const response = await fetch(new URL("/api/time", config.apiUrl), {
          credentials: "include",
          cache: "no-store",
          signal,
        })
        if (!response.ok) throw new Error("Unable to synchronize time")
        const body: unknown = await response.json()
        if (
          !body ||
          typeof body !== "object" ||
          !("now" in body) ||
          typeof body.now !== "number"
        )
          throw new Error("Invalid server time")
        return body.now
      },
      refreshShows: () =>
        Promise.all([
          zero.run(queries.shows.current(), { type: "complete" }),
          zero.run(queries.shows.next(), { type: "complete" }),
        ]),
      onTime: setNow,
    })
  }, [zero, connection.name])
  return {
    now: connection.name === "connected" ? now : null,
    connected: connection.name === "connected",
  }
}
