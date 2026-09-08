import { authClient } from "@/auth-client"
import { Button } from "@/components/ui/button"

export function PublicPage() {
  const signIn = async () => {
    await authClient.signIn.social({
      provider: "twitter",
      callbackURL: window.location.origin,
    })
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-6">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold">Unauthenticated Page</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sign in with X to continue.
        </p>

        <div className="mt-6 rounded-lg border p-4 text-sm">
          <Button onClick={signIn}>Sign in with X</Button>
        </div>
      </div>
    </div>
  )
}

export default PublicPage
