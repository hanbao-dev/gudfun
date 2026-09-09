import { z } from "zod";

// Extend these registries to add types; persisted values are text/JSON, not SQL enums.
export const segmentTypes = {
  placeholder: { label: "Placeholder", configuration: z.strictObject({}) },
  introVideo: {
    label: "Intro video",
    configuration: z.strictObject({
      url: z.url({ protocol: /^https?$/ }).max(2048),
    }),
  },
} as const;
export const segmentConfigurationSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("placeholder"),
    configuration: segmentTypes.placeholder.configuration,
  }),
  z.object({
    type: z.literal("introVideo"),
    configuration: segmentTypes.introVideo.configuration,
  }),
]);
export type ConfiguredSegment = z.infer<typeof segmentConfigurationSchema>;
export type SegmentConfiguration<T extends ConfiguredSegment["type"]> = Extract<
  ConfiguredSegment,
  { type: T }
>["configuration"];
export const showStatusSchema = z.enum(["draft", "scheduled", "live", "ended"]);
export type ShowStatus = z.infer<typeof showStatusSchema>;
export function assertTransition(status: string | null, target: ShowStatus) {
  const allowed: Record<ShowStatus, readonly ShowStatus[]> = {
    draft: ["draft", "scheduled", "live"],
    scheduled: ["draft", "scheduled", "live"],
    live: ["live", "ended"],
    ended: ["ended"],
  };
  const current = showStatusSchema.parse(status);
  if (!allowed[current].includes(target))
    throw new Error(`Cannot change ${status} show to ${target}`);
}
export function resolveViewerShow<L, S>(
  live: L | undefined,
  scheduled: S | undefined,
) {
  if (live) return { kind: "live" as const, show: live };
  if (scheduled) return { kind: "scheduled" as const, show: scheduled };
  return { kind: "empty" as const };
}
export function remainingUntil(scheduledStart: number, serverNow: number) {
  return Math.max(0, scheduledStart - serverNow);
}
export const showFeatureTypes = {
  chat: { label: "Chat (reserved)" },
  reactions: { label: "Reactions (reserved)" },
} as const;
export const segmentTypeSchema = z.enum(
  Object.keys(segmentTypes) as [
    keyof typeof segmentTypes,
    ...Array<keyof typeof segmentTypes>,
  ],
);
export const showFeatureSchema = z.enum(
  Object.keys(showFeatureTypes) as [
    keyof typeof showFeatureTypes,
    ...Array<keyof typeof showFeatureTypes>,
  ],
);
export type SegmentType = z.infer<typeof segmentTypeSchema>;
export type ShowFeature = z.infer<typeof showFeatureSchema>;
export function hasShowFeature(
  show: { features: readonly string[] | null },
  feature: ShowFeature,
) {
  return show.features?.includes(feature) ?? false;
}
export const idSchema = z.string().trim().min(1).max(200);
export const titleSchema = z.string().trim().min(1).max(200);
export const featuresSchema = z
  .array(showFeatureSchema)
  .refine(
    (values) => new Set(values).size === values.length,
    "Duplicate features",
  );
