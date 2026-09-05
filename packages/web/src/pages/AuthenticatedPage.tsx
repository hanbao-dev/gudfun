import { authClient } from "@/auth-client"
import { Button } from "@/components/ui/button"

export function AuthenticatedPage() {
  const { data } = authClient.useSession()

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold">Authenticated Page</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Welcome,{" "}
          <span className="font-medium">
            {data?.user.name ?? data?.user.email}
          </span>
          ! You are logged in.
        </p>
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
