import { authClient } from "@/auth-client"
import { Button } from "@/components/ui/button"
import { useQuery } from "@rocicorp/zero/react"
import { queries } from "zero"

export function AuthenticatedPage() {
  const [user] = useQuery(queries.users.self())

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold">Authenticated Page</h1>
        <p className="mt-2 text-sm text-muted-foreground">{user?.username}</p>
        <Button
          className="mt-6"
          variant="outline"
          onClick={() => authClient.signOut()}
        >
          Log out
        </Button>
      </div>
    </div>
  )
}

export default AuthenticatedPage
