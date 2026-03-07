export interface NextSrsState {
  repetitions: number
  interval: number
  easeFactor: number
  dueAt: Date
}

export function nextSrsState(
  quality: number,
  current: { repetitions: number; interval: number; easeFactor: number },
  now = new Date()
): NextSrsState {
  const q = Math.max(0, Math.min(5, quality))
  let repetitions = current.repetitions
  let interval = current.interval
  let easeFactor = current.easeFactor

  if (q < 3) {
    repetitions = 0
    interval = 1
  } else {
    repetitions += 1
    if (repetitions === 1) interval = 1
    else if (repetitions === 2) interval = 6
    else interval = Math.max(1, Math.round(interval * easeFactor))
  }

  easeFactor = Math.max(1.3, easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)))

  const dueAt = new Date(now)
  dueAt.setDate(dueAt.getDate() + interval)

  return { repetitions, interval, easeFactor, dueAt }
}

