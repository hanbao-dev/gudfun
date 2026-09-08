function requiredClientEnv(name: "VITE_API_URL" | "VITE_ZERO_CACHE_URL") {
  const value = import.meta.env[name]

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }

  return value
}

export const config = {
  apiUrl: requiredClientEnv("VITE_API_URL"),
  zeroCacheUrl: requiredClientEnv("VITE_ZERO_CACHE_URL"),
}
