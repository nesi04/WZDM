/**
 * Truncate text to roughly maxChars, preferring to cut at a sentence or line
 * boundary so the model doesn't see a half-finished sentence.
 */
export function truncateContent(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text
  const truncated = text.slice(0, maxChars)
  const cutPoint = Math.max(truncated.lastIndexOf('.'), truncated.lastIndexOf('\n'))
  return cutPoint > maxChars * 0.7 ? truncated.slice(0, cutPoint + 1) : truncated
}

/**
 * Run fn up to `attempts` times with linear backoff (1s, 2s, ...).
 * Rethrows the last error if every attempt fails.
 */
export async function withRetry<T>(fn: () => Promise<T>, label: string, attempts = 3): Promise<T> {
  let lastError: unknown
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err
      console.error(`${label} attempt ${attempt + 1} failed:`, err instanceof Error ? err.message : err)
      if (attempt < attempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, (attempt + 1) * 1000))
      }
    }
  }
  throw lastError ?? new Error(`${label} failed after ${attempts} attempts`)
}
