import { useState } from "react"
import { useZero } from "@rocicorp/zero/react"
import {
  mutators,
  segmentConfigurationSchema,
  segmentTypes,
  type Schema,
} from "zero"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { useAdminMutation } from "@/hooks/use-admin-mutation"

export function SegmentEditor({
  showId,
  segment,
}: {
  showId: string
  segment?: { id: string; title: string; type: string; configuration: unknown }
}) {
  const zero = useZero<Schema>()
  const [type, setType] = useState(segment?.type ?? "placeholder")
  const [validationError, setValidationError] = useState<string | null>(null)
  const { run, error, pending } = useAdminMutation()
  const existing = segmentConfigurationSchema.safeParse(segment)
  return (
    <form
      className="space-y-2"
      onSubmit={(e) => {
        e.preventDefault()
        const data = new FormData(e.currentTarget)
        const parsed = segmentConfigurationSchema.safeParse({
          type,
          configuration:
            type === "introVideo" ? { url: String(data.get("url")) } : {},
        })
        if (!parsed.success) {
          setValidationError(
            "Choose a supported type and enter a valid HTTP(S) video URL."
          )
          return
        }
        setValidationError(null)
        const args = {
          id: segment?.id ?? crypto.randomUUID(),
          showId,
          title: String(data.get("title")),
          ...parsed.data,
        }
        void run(() =>
          zero.mutate(
            segment
              ? mutators.segments.update(args)
              : mutators.segments.add(args)
          )
        )
      }}
    >
      <fieldset
        disabled={pending}
        className="flex flex-wrap items-center gap-2"
      >
        <Input
          name="title"
          aria-label="Segment title"
          placeholder="Segment title"
          defaultValue={segment?.title ?? ""}
          required
          maxLength={200}
        />
        <NativeSelect
          aria-label="Segment type"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          {!Object.hasOwn(segmentTypes, type) && (
            <NativeSelectOption value={type}>Unknown type</NativeSelectOption>
          )}
          {Object.entries(segmentTypes).map(([value, item]) => (
            <NativeSelectOption key={value} value={value}>
              {item.label}
            </NativeSelectOption>
          ))}
        </NativeSelect>
        {type === "introVideo" && (
          <Input
            name="url"
            type="url"
            aria-label="Video URL"
            placeholder="https://example.com/intro.mp4"
            required
            maxLength={2048}
            defaultValue={
              existing.success && existing.data.type === "introVideo"
                ? existing.data.configuration.url
                : ""
            }
          />
        )}
        <Button type="submit">
          {segment ? "Save segment" : "Add segment"}
        </Button>
        {segment && (
          <Button
            type="button"
            variant="destructive"
            onClick={() =>
              void run(() =>
                zero.mutate(
                  mutators.segments.remove({ id: segment.id, showId })
                )
              )
            }
          >
            Delete segment
          </Button>
        )}
      </fieldset>
      {(error || validationError) && (
        <p role="alert" className="text-destructive">
          {error || validationError}
        </p>
      )}
    </form>
  )
}
