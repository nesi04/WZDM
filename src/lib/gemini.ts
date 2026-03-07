// src/lib/gemini.ts
import { GoogleGenerativeAI } from '@google/generative-ai'

const DEFAULT_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash'

export const MODELS = {
  summarize: DEFAULT_MODEL,
  tags: DEFAULT_MODEL,
  chat: DEFAULT_MODEL,
} as const

// Helper to get a model instance
export function getModel(name: keyof typeof MODELS) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is missing. Add it to .env.local')
  }
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  return genAI.getGenerativeModel({ model: MODELS[name] })
}
