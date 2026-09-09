import { useState } from "react"
import { useZero } from "@rocicorp/zero/react"
import {
  formatShowTime,
  localScheduleInstant,
  scheduleInputValue,
  mutators,
  type Schema,
} from "zero"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useAdminMutation } from "@/hooks/use-admin-mutation"

export function ShowSchedule({
  show,
}: {
  show: { id: string; status: string | null; scheduledStart: number | null }
}) {
  const zero = useZero<Schema>()
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const [input, setInput] = useState(
    show.scheduledStart === null
      ? ""
      : scheduleInputValue(show.scheduledStart, zone)
  )
  const { run, pending, error } = useAdminMutation()
  let instant: number | undefined
  let invalid: string | undefined
  if (input) {
    try {
      instant = localScheduleInstant(input, zone)
    } catch (error) {
      invalid = error instanceof Error ? error.message : "Invalid time"
    }
  }
  return (
    <fieldset disabled={pending} className="space-y-3">
      <p className="text-sm text-muted-foreground">Status: {show.status}</p>
      {show.status === "draft" || show.status === "scheduled" ? (
        <>
          <label className="block space-y-2">
            <span>Scheduled start ({zone})</span>
            <Input
              type="datetime-local"
              value={input}
              min="2000-01-01T00:00"
              max="2100-12-31T23:59"
              onChange={(e) => setInput(e.target.value)}
            />
          </label>
          {invalid && (
            <p role="alert" className="text-destructive">
              {invalid}
            </p>
          )}
          {instant !== undefined && (
            <p>Save as: {formatShowTime(instant, zone)}</p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={instant === undefined}
              onClick={() => {
                if (instant !== undefined)
                  void run(() =>
                    zero.mutate(
                      mutators.shows.schedule({
                        id: show.id,
                        scheduledStart: instant,
                      })
                    )
                  )
              }}
            >
              Save schedule
            </Button>
            {show.status === "scheduled" && (
              <Button
                variant="outline"
                onClick={() =>
                  void run(() =>
                    zero.mutate(
                      mutators.shows.schedule({
                        id: show.id,
                        scheduledStart: null,
                      })
                    )
                  )
                }
              >
                Return to draft
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() =>
                void run(() =>
                  zero.mutate(mutators.shows.start({ id: show.id }))
                )
              }
            >
              Start show now
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Viewers see this schedule in their timezone. The show goes live when
            you start it.
          </p>
        </>
      ) : show.status === "live" ? (
        <Button
          variant="destructive"
          onClick={() =>
            void run(() => zero.mutate(mutators.shows.end({ id: show.id })))
          }
        >
          End show permanently
        </Button>
      ) : (
        <p>This show has ended and is read-only.</p>
      )}
      {error && (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      )}
    </fieldset>
  )
}
