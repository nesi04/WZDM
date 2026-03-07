export function extractJsonArray(raw: string): string | null {
  const text = (raw || '').trim()
  if (!text) return null

  // Exact JSON array.
  if (text.startsWith('[') && text.endsWith(']')) return text

  // ```json ... ``` or ``` ... ```
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fence?.[1]) {
    const inner = fence[1].trim()
    if (inner.startsWith('[') && inner.endsWith(']')) return inner
  }

  // First array-looking slice.
  const start = text.indexOf('[')
  const end = text.lastIndexOf(']')
  if (start !== -1 && end !== -1 && end > start) {
    return text.slice(start, end + 1)
  }

  return null
}
