// src/lib/gemini.ts
import { GoogleGenerativeAI } from '@google/generative-ai'

if (!process.env.GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY is missing. Add it to .env.local')
}

export const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

export const MODELS = {
  summarize: 'gemini-2.0-flash-exp',
  tags: 'gemini-2.0-flash-exp',
  chat: 'gemini-2.0-flash-exp',
} as const

// Helper to get a model instance
export function getModel(name: keyof typeof MODELS) {
  return genAI.getGenerativeModel({ model: MODELS[name] })
}
