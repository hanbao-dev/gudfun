import { authClient } from "@/auth-client"
import { Button } from "@/components/ui/button"
import { Link, Outlet } from "react-router"
import { useQuery } from "@rocicorp/zero/react"
import { queries } from "zero"

export function AuthenticatedPage() {
  const [user] = useQuery(queries.users.self())
  return (
    <main className="mx-auto min-h-svh max-w-3xl space-y-8 p-6">
      <header className="flex items-center justify-between gap-3">
        <span className="text-sm text-muted-foreground">
          {user?.username ?? user?.name}
        </span>
        <nav
          aria-label="Application"
          className="flex flex-wrap items-center gap-2"
        >
          <Button variant="ghost" nativeButton={false} render={<Link to="/" />}>
            Show
          </Button>
          {user?.isAdmin && (
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link to="/admin/settings" />}
            >
              Admin settings
            </Button>
          )}
          <Button variant="outline" onClick={() => authClient.signOut()}>
            Log out
          </Button>
        </nav>
      </header>
      <Outlet />
    </main>
  )
}
export default AuthenticatedPage
