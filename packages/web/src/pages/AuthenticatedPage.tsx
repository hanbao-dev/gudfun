import { authClient } from "@/auth-client"
import { Button } from "@/components/ui/button"
import { AdminPanel } from "@/components/admin-panel"
import { ShowView } from "@/components/show-view"
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
        <Button variant="outline" onClick={() => authClient.signOut()}>
          Log out
        </Button>
      </header>
      <ShowView />
      {user?.isAdmin && <AdminPanel />}
    </main>
  )
}
export default AuthenticatedPage
