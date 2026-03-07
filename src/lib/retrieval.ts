export interface RetrievedChunk {
  id: string
  text: string
  score: number
}

function tokenize(input: string): string[] {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
}

export function splitIntoChunks(text: string, maxChars = 500): string[] {
  const clean = text.replace(/\r\n/g, '\n').trim()
  if (!clean) return []

  const paragraphs = clean.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)
  const chunks: string[] = []
  let current = ''

  for (const paragraph of paragraphs) {
    if (!current) {
      current = paragraph
      continue
    }
    if ((current + '\n\n' + paragraph).length <= maxChars) {
      current += `\n\n${paragraph}`
      continue
    }
    chunks.push(current)
    current = paragraph
  }

  if (current) chunks.push(current)

  // Fallback when a paragraph is too long.
  const normalized: string[] = []
  for (const chunk of chunks) {
    if (chunk.length <= maxChars) {
      normalized.push(chunk)
      continue
    }
    for (let i = 0; i < chunk.length; i += maxChars) {
      normalized.push(chunk.slice(i, i + maxChars))
    }
  }

  return normalized
}

export function retrieveTopChunks(content: string, query: string, take = 3): RetrievedChunk[] {
  const chunks = splitIntoChunks(content)
  if (!chunks.length) return []

  const queryTokens = new Set(tokenize(query))
  if (!queryTokens.size) {
    return chunks.slice(0, take).map((text, idx) => ({ id: `c${idx + 1}`, text, score: 0 }))
  }

  const scored = chunks
    .map((text, idx) => {
      const tokens = tokenize(text)
      const tokenSet = new Set(tokens)
      let overlap = 0
      for (const qt of queryTokens) {
        if (tokenSet.has(qt)) overlap += 1
      }
      const density = tokens.length ? overlap / tokens.length : 0
      const score = overlap * 2 + density
      return { id: `c${idx + 1}`, text, score }
    })
    .sort((a, b) => b.score - a.score)

  return scored.slice(0, take)
}

