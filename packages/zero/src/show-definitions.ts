import { z } from "zod";

// Extend these registries to add types; persisted values are text/JSON, not SQL enums.
export const segmentTypes = { placeholder: { label: "Placeholder" } } as const;
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
