import { describe, expect, it } from 'vitest'
import { nextSrsState } from './srs'

const fresh = { repetitions: 0, interval: 1, easeFactor: 2.5 }
const now = new Date('2026-01-01T00:00:00Z')

describe('nextSrsState', () => {
  it('follows the SM-2 interval ladder 1 → 6 → interval × EF on good answers', () => {
    const first = nextSrsState(4, fresh, now)
    expect(first).toMatchObject({ repetitions: 1, interval: 1 })

    const second = nextSrsState(4, first, now)
    expect(second).toMatchObject({ repetitions: 2, interval: 6 })

    const third = nextSrsState(4, second, now)
    expect(third.repetitions).toBe(3)
    expect(third.interval).toBe(Math.round(6 * second.easeFactor))
  })

  it('resets repetitions and interval on a failed answer (quality < 3)', () => {
    const state = nextSrsState(1, { repetitions: 5, interval: 40, easeFactor: 2.5 }, now)
    expect(state.repetitions).toBe(0)
    expect(state.interval).toBe(1)
  })

  it('never lets ease factor drop below 1.3', () => {
    let state = { ...fresh }
    for (let i = 0; i < 20; i++) state = nextSrsState(0, state, now)
    expect(state.easeFactor).toBe(1.3)
  })

  it('raises ease factor on a perfect answer and keeps it for quality 4', () => {
    expect(nextSrsState(5, fresh, now).easeFactor).toBeCloseTo(2.6)
    expect(nextSrsState(4, fresh, now).easeFactor).toBeCloseTo(2.5)
  })

  it('clamps out-of-range quality values', () => {
    expect(nextSrsState(99, fresh, now)).toEqual(nextSrsState(5, fresh, now))
    expect(nextSrsState(-3, fresh, now)).toEqual(nextSrsState(0, fresh, now))
  })

  it('sets dueAt = now + interval days', () => {
    const state = nextSrsState(4, { repetitions: 1, interval: 1, easeFactor: 2.5 }, now)
    const days = (state.dueAt.getTime() - now.getTime()) / 86_400_000
    expect(days).toBe(state.interval)
  })
})
