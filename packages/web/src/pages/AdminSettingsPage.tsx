import { useQuery } from "@rocicorp/zero/react"
import { Link, Navigate } from "react-router"
import { queries } from "zero"
import { AdminPanel } from "@/components/admin-panel"
import { Button } from "@/components/ui/button"

export function AdminSettingsPage() {
  const [user, result] = useQuery(queries.users.self())

  // A navigation guard; API queries and mutations remain the security boundary.
  // Wait for the authoritative user before mounting any management queries.
  if (result.type === "error") return <AdminSettingsErrorBoundary />
  if (result.type !== "complete") {
    return (
      <p role="status" className="text-muted-foreground">
        Checking admin access…
      </p>
    )
  }
  if (!user?.isAdmin) return <Navigate to="/" replace />

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Admin settings</h1>
      <AdminPanel />
    </div>
  )
}

export function AdminSettingsErrorBoundary() {
  return (
    <div className="space-y-4">
      <p role="alert">
        Unable to load admin settings. Please reload to try again.
      </p>
      <Button variant="outline" nativeButton={false} render={<Link to="/" />}>
        Back to show
      </Button>
    </div>
  )
}
