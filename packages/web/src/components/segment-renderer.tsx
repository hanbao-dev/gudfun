import { useState, type ComponentType } from "react"
import {
  segmentConfigurationSchema,
  type ConfiguredSegment,
  type SegmentConfiguration,
} from "zero"

function IntroVideo({
  configuration,
}: {
  configuration: SegmentConfiguration<"introVideo">
}) {
  const [failed, setFailed] = useState(false)
  if (failed)
    return (
      <p role="status">
        This video could not be played. Please wait for the host to continue.
      </p>
    )
  return (
    <div className="space-y-2">
      <video
        className="w-full rounded-md"
        controls
        playsInline
        preload="metadata"
        src={configuration.url}
        onError={() => setFailed(true)}
      />
      <p className="text-sm text-muted-foreground">
        Press play to watch. Playback starts on your device and is not
        synchronized with other viewers.
      </p>
    </div>
  )
}
const renderers = {
  placeholder: () => (
    <p className="text-muted-foreground">Waiting for the host to continue.</p>
  ),
  introVideo: IntroVideo,
} satisfies {
  [T in ConfiguredSegment["type"]]: ComponentType<{
    configuration: SegmentConfiguration<T>
  }>
}

export function SegmentRenderer({
  type,
  configuration,
}: {
  type: string
  configuration: unknown
}) {
  const parsed = segmentConfigurationSchema.safeParse({ type, configuration })
  if (!parsed.success)
    return (
      <p role="status">
        This segment is unavailable. Please wait for the host to continue.
      </p>
    )
  const segment = parsed.data
  switch (segment.type) {
    case "placeholder": {
      const Renderer = renderers.placeholder
      return <Renderer />
    }
    case "introVideo": {
      const Renderer = renderers.introVideo
      return (
        <Renderer
          key={segment.configuration.url}
          configuration={segment.configuration}
        />
      )
    }
  }
}
