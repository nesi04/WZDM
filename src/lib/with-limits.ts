// src/lib/with-limits.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { User } from '@prisma/client'
import { allow } from './rate-limit'
import { getAuthedUser } from './server-auth'

type AuthedHandler = (req: NextRequest, user: User) => Promise<Response> | Response

/**
 * Wraps an API handler with authentication and per-user rate limiting.
 * Unauthenticated requests get 401 before any work (or AI spend) happens.
 *
 * Note: the limiter is in-memory, so limits are per server instance and reset
 * on restart. Swap `allow` for a Redis/Upstash-backed limiter when scaling out.
 */
export function withLimit(handler: AuthedHandler, scope = 'global', rate = 60, intervalMs = 60_000) {
  return async (req: NextRequest) => {
    const user = await getAuthedUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!allow(`${scope}:${user.id}`, rate, intervalMs)) {
      return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 })
    }
    return handler(req, user)
  }
}
