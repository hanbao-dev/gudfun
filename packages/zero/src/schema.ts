import { definePermissions } from "@rocicorp/zero";
import { schema, type Schema } from "./zero-schema.gen";

export * from "./zero-schema.gen";

export const permissions = definePermissions<{}, Schema>(schema, () => {
  return {};
});
