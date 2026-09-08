import { Navigate, useLocation } from "react-router"
import { authClient } from "@/auth-client"
import { AuthenticatedPage } from "@/pages/AuthenticatedPage"
import { PublicPage } from "@/pages/PublicPage"
import { ZeroInit } from "./zero-init"

export function App() {
  const location = useLocation()
  const { data, isPending } = authClient.useSession()

  if (isPending) {
    return (
      <div className="flex min-h-svh items-center justify-center p-6">
        <p className="text-sm text-muted-foreground">Loading session...</p>
      </div>
    )
  }

  if (data?.user) {
    return (
      <ZeroInit userId={data.user.id} isAdmin={data.user.isAdmin}>
        <AuthenticatedPage />
      </ZeroInit>
    )
  }

  if (location.pathname !== "/") return <Navigate to="/" replace />

  return <PublicPage />
}

export default App
