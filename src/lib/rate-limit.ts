// src/lib/rate-limit.ts
type Key = string
type Bucket = { tokens: number; ts: number }

const buckets = new Map<Key, Bucket>()
const MAX_BUCKETS = 10_000

/**
 * Token bucket limiter.
 * rate = allowed requests per intervalMs.
 * Returns true if allowed, false if limited.
 */
export function allow(key: Key, rate = 60, intervalMs = 60_000) {
  const now = Date.now()
  const b = buckets.get(key) ?? { tokens: rate, ts: now }
  const elapsed = now - b.ts
  if (elapsed >= intervalMs) {
    const intervals = Math.floor(elapsed / intervalMs)
    b.tokens = Math.min(rate, b.tokens + intervals * rate)
    b.ts = now
  }
  if (b.tokens <= 0) {
    buckets.set(key, b)
    return false
  }
  b.tokens -= 1
  buckets.set(key, b)

  // Keep memory bounded: drop the oldest entries once the map grows too large.
  if (buckets.size > MAX_BUCKETS) {
    const excess = buckets.size - MAX_BUCKETS
    let i = 0
    for (const k of buckets.keys()) {
      if (i++ >= excess) break
      buckets.delete(k)
    }
  }
  return true
}
