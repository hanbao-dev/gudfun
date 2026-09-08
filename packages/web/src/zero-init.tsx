import type { ZeroOptions } from "@rocicorp/zero"
import { ZeroProvider } from "@rocicorp/zero/react"
import { useMemo, type ReactNode } from "react"
import { mutators } from "zero"
import { schema } from "zero"
import { config } from "./config"

export function ZeroInit({
  children,
  userId,
}: {
  children: ReactNode
  userId: string
}) {
  const options = useMemo(
    () =>
      ({
        schema,
        cacheURL: config.zeroCacheUrl,
        userID: userId,
        mutators,
        logLevel: "info",
        mutateURL: new URL("/api/zero/mutate", config.apiUrl).toString(),
        queryURL: new URL("/api/zero/query", config.apiUrl).toString(),
        context: { userId },
      }) as const satisfies ZeroOptions,
    [userId]
  )

  return <ZeroProvider {...options}>{children}</ZeroProvider>
}
