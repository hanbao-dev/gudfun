import { createAuthClient } from "better-auth/react"
import { usernameClient } from "better-auth/client/plugins"
import { config } from "./config"

export const authClient = createAuthClient({
  basePath: "/api/auth",
  baseURL: config.apiUrl,
  fetchOptions: {
    credentials: "include",
  },
  plugins: [usernameClient({ displayUsername: false })],
})
