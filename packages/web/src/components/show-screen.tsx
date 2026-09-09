import { useRef, useState, type ReactNode } from "react"
import { Maximize2, Radio } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export function ShowScreen({
  title,
  status,
  detail,
  children,
  standby = false,
}: {
  title: string
  status: string
  detail?: string
  children: ReactNode
  standby?: boolean
}) {
  const screen = useRef<HTMLDivElement>(null)
  const [error, setError] = useState(false)
  return (
    <section className="space-y-5 sm:space-y-7">
      <div className="flex items-center justify-between gap-4 font-mono text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
        <span className="flex items-center gap-2">
          <Radio className="size-3.5" aria-hidden="true" /> Your corner of the
          airwaves
        </span>
        <span className="hidden sm:block">Est. for a good time</span>
      </div>
      <Card className="tv-set gap-0 overflow-hidden rounded-[1.5rem] p-2 sm:rounded-[2rem] sm:p-3">
        <CardContent className="p-0">
          <div
            ref={screen}
            className={`tv-screen relative flex min-h-80 flex-col overflow-hidden rounded-[1rem] p-5 sm:min-h-[26rem] sm:rounded-[1.35rem] sm:p-8 ${standby ? "tv-standby" : ""}`}
          >
            <div className="relative z-10 flex items-center justify-between gap-4 font-mono text-[10px] tracking-[0.18em] uppercase sm:text-xs">
              <span className="flex items-center gap-2">
                <span className="size-1.5 rounded-full bg-current" />
                {status}
              </span>
              <span className="opacity-60">GUDFUN / 01</span>
            </div>
            <div className="relative z-10 flex flex-1 flex-col justify-center py-8 sm:py-12">
              {children}
            </div>
            <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 font-mono text-[9px] tracking-[0.15em] uppercase opacity-55 sm:text-[10px]">
              <span>Stay a little while.</span>
              <span>Picture · Sound · Good company</span>
            </div>
          </div>
          <div className="flex items-center justify-between px-3 pt-3 pb-1 sm:px-5 sm:pt-4 sm:pb-2">
            <span className="text-lg font-black tracking-[-0.08em] text-foreground italic">
              gudfun
              <span className="ml-1 font-mono text-[9px] font-normal tracking-normal text-muted-foreground not-italic">
                TV
              </span>
            </span>
            <div className="flex items-center gap-5">
              <span
                className="tv-speaker hidden h-3 w-16 text-muted-foreground/40 sm:block"
                aria-hidden="true"
              />
              <Button
                variant="ghost"
                size="icon"
                aria-label="View show fullscreen"
                className="size-7 rounded-full text-muted-foreground"
                onClick={() => {
                  setError(false)
                  if (!screen.current?.requestFullscreen) {
                    setError(true)
                    return
                  }
                  void screen.current
                    .requestFullscreen()
                    .catch(() => setError(true))
                }}
              >
                <Maximize2 className="size-3.5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      <div className="flex flex-wrap items-start justify-between gap-3 px-1">
        <div className="space-y-1">
          <p className="font-mono text-[10px] tracking-[0.15em] text-muted-foreground uppercase">
            {status === "On air" ? "Now showing" : "On the channel"}
          </p>
          <h1 className="text-xl font-medium tracking-tight sm:text-2xl">
            {title}
          </h1>
        </div>
        {detail && (
          <p className="max-w-sm text-sm text-muted-foreground sm:pt-5">
            {detail}
          </p>
        )}
      </div>
      {error && (
        <p role="status" className="text-sm text-muted-foreground">
          Fullscreen isn’t available in this browser. You can keep watching
          here.
        </p>
      )}
    </section>
  )
}
