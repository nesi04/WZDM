// src/lib/with-limit.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { allow } from './rate-limit'

export function withLimit<T extends (req: NextRequest, ...rest: any[]) => Promise<Response> | Response>(
  handler: T,
  scope = 'global',
  rate = 60,
  intervalMs = 60_000
) {
  return async (req: NextRequest, ...rest: any[]) => {
    const ipHeader = req.headers.get('x-forwarded-for')
    const ip = ipHeader?.split(',')[0]?.trim() || '127.0.0.1'
    const key = `${scope}:${ip}`
    if (!allow(key, rate, intervalMs)) {
      return NextResponse.json({ error: 'Too Many Requests' }, { status: 429 })
    }
    return handler(req, ...rest)
  }
}
