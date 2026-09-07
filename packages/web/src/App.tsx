import { authClient } from "@/auth-client"
import { AuthenticatedPage } from "@/pages/AuthenticatedPage"
import { PublicPage } from "@/pages/PublicPage"
import { ZeroInit } from "./zero-init"

export function App() {
  const { data, isPending } = authClient.useSession()

  if (isPending) {
    return (
      <div className="flex min-h-svh items-center justify-center p-6">
        <p className="text-sm text-muted-foreground">Loading session...</p>
      </div>
    )
  }

  // Single route: example.com — render based on auth state
  if (data?.user) {
    return (
      <ZeroInit>
        <AuthenticatedPage />
      </ZeroInit>
    )
  }

  return <PublicPage />
}

export default App
