import { Elysia } from "elysia"
import { auth } from "../auth"

export const betterAuth = new Elysia({ name: "better-auth" })
  .mount(auth.handler)
  .macro({
    auth: {
      async resolve({ status, request: { headers } }) {
        const authHeader = headers.get("Authorization")
        if (authHeader) {
          const cookie = authHeader?.split("Bearer ")[1]
          headers.set("Cookie", cookie)
        }
        const session = await auth.api.getSession({
          headers,
        })
        if (!session) return status(401)

        return {
          user: session.user,
          session: session.session,
        }
      },
    },
  })
