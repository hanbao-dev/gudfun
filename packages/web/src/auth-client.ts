import { createAuthClient } from "better-auth/react"
import { usernameClient } from "better-auth/client/plugins"

export const authClient = createAuthClient({
  basePath: "/api/auth",
  baseURL: "http://localhost:3000",
  fetchOptions: {
    credentials: "include",
  },
  plugins: [usernameClient({ displayUsername: false })],
})
