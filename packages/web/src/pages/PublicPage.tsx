import { authClient } from "@/auth-client"
import { Button } from "@base-ui/react/button"

export function PublicPage() {
  const { data, isPending } = authClient.useSession()
  const signIn = async () => {
    await authClient.signIn.social({
      provider: "twitter",
      callbackURL: "http://localhost:5173/",
    })
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold">Unauthenticated Page</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This page is public — no login required.
        </p>

        <div className="mt-6 rounded-lg border p-4 text-sm">
          {isPending ? (
            <p className="text-muted-foreground">Loading session...</p>
          ) : data?.user ? (
            <p>
              Logged in as{" "}
              <span className="font-medium">
                {data.user.name ?? data.user.email}
              </span>
            </p>
          ) : (
            <Button onClick={signIn}>Sign in</Button>
          )}
        </div>
      </div>
    </div>
  )
}

export default PublicPage
