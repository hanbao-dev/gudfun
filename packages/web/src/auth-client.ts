import { createAuthClient } from "better-auth/react"
import {
  usernameClient,
  inferAdditionalFields,
} from "better-auth/client/plugins"
import { config } from "./config"

export const authClient = createAuthClient({
  basePath: "/api/auth",
  baseURL: config.apiUrl,
  fetchOptions: {
    credentials: "include",
  },
  plugins: [
    inferAdditionalFields({
      user: { isAdmin: { type: "boolean", defaultValue: false, input: false } },
    }),
    usernameClient({ displayUsername: false }),
  ],
})
