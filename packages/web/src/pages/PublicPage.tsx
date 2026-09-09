import { authClient } from "@/auth-client"
import { Button } from "@/components/ui/button"
import { ShowScreen } from "@/components/show-screen"

export function PublicPage() {
  const signIn = async () => {
    await authClient.signIn.social({
      provider: "twitter",
      callbackURL: window.location.origin,
    })
  }

  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <div className="w-full max-w-3xl">
        <ShowScreen status="Welcome aboard" standby fullscreen={false}>
          <div className="mx-auto max-w-md space-y-6 text-center">
            <div
              aria-hidden="true"
              className="tv-station-mark mx-auto grid size-16 place-items-center rounded-full border text-3xl font-black tracking-tighter italic"
            >
              g.
            </div>
            <div className="space-y-3">
              <h1 className="text-4xl font-medium tracking-tight sm:text-6xl">
                Tune in. Hang out.
              </h1>
              <p className="text-sm opacity-65">
                Good shows. Good company. You’re invited.
              </p>
            </div>
            <Button
              size="lg"
              className="bg-[var(--tv-ink)] px-7 text-[var(--tv-picture)] hover:bg-[var(--tv-ink)]/90"
              onClick={signIn}
            >
              <span aria-hidden="true" className="text-lg">
                𝕏
              </span>
              Sign in with X
            </Button>
          </div>
        </ShowScreen>
      </div>
    </main>
  )
}

export default PublicPage
