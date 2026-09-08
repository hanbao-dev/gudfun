import { useState } from "react"

// Presentation-independent handling of both optimistic and authoritative failures.
export function useAdminMutation() {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  async function run(
    action: () => {
      server: Promise<{ type: string; error?: { message: string } }>
    }
  ) {
    setPending(true)
    setError(null)
    try {
      const result = await action().server
      if (result.type === "error")
        throw new Error(result.error?.message ?? "Change failed")
    } catch (error) {
      setError(error instanceof Error ? error.message : "Change failed")
    } finally {
      setPending(false)
    }
  }
  return { pending, error, run }
}
