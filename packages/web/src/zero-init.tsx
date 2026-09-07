import type { ZeroOptions } from "@rocicorp/zero"
import { ZeroProvider } from "@rocicorp/zero/react"
import { useMemo, type ReactNode } from "react"
import { mutators } from "zero"
import { schema } from "zero"
import { authClient } from "./auth-client.ts"

export function ZeroInit({ children }: { children: ReactNode }) {
  const { data } = authClient.useSession()

  const options = useMemo(
    () =>
      ({
        schema,
        cacheURL: "http://localhost:4848",
        userID: data?.user.id,
        mutators,
        logLevel: "info",
        mutateURL: `http://localhost:3000/api/zero/mutate`,
        queryURL: `http://localhost:3000/api/zero/query`,
        context: { userId: data?.user.id },
      }) as const satisfies ZeroOptions,
    [data]
  )

  return <ZeroProvider {...options}>{children}</ZeroProvider>
}
