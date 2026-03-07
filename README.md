# WZDM - AI Study Notes and Revision Workspace

WZDM is a personal knowledge app for studying with AI.

It lets you:
- Write notes in Markdown
- Organize by tags, favorites, archive
- Search by content/tag
- Auto-summarize notes with AI
- Auto-generate tags with AI
- Chat about a specific note (with excerpt citations)
- Generate flashcards from notes
- Run spaced-repetition study sessions
- Generate quick quiz questions from a note
- Import external text into notes

## Tech Stack

- Framework: Next.js 15 (App Router), React 19, TypeScript
- Styling/UI: Tailwind CSS v4, lucide-react, motion
- Auth: NextAuth (Google OAuth)
- Database: PostgreSQL + Prisma ORM
- AI: Google Gemini (`@google/generative-ai`)

## Architecture Overview

- Frontend page: `src/app/page.tsx`
- Notes CRUD API: `src/app/api/notes/*`
- Search API: `src/app/api/search/route.ts`
- AI APIs:
  - Summarize: `src/app/api/ai/summarize/route.ts`
  - Auto-tags: `src/app/api/ai/tags/route.ts`
  - Chat: `src/app/api/chat/route.ts`
  - Flashcards: `src/app/api/ai/flashcards/route.ts`
  - Quiz: `src/app/api/study/session/quiz/route.ts`
- Study APIs:
  - Session feed: `src/app/api/study/session/route.ts`
  - Review grading: `src/app/api/flashcards/[id]/review/route.ts`
- Topic graph seed API:
  - Related notes: `src/app/api/notes/related/route.ts`

## Environment Variables

Create `.env.local` (dev) and set these in Vercel/Render (prod):

```bash
# Database
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DB?schema=public"

# NextAuth
NEXTAUTH_SECRET="replace-with-long-random-secret"
NEXTAUTH_URL="https://your-domain.com"

# Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Gemini
GEMINI_API_KEY="your-gemini-api-key"
GEMINI_MODEL="gemini-2.5-flash"
```

Notes:
- `DATABASE_URL` is required by Prisma.
- `NEXTAUTH_SECRET` is required for stable auth/session encryption.
- `NEXTAUTH_URL` should match your deployed base URL.
- `GEMINI_MODEL` is optional and lets you switch model IDs without code changes.
- In Vercel preview environments, set auth callback URLs appropriately in Google Cloud Console.
- Render/Vercel can both host this app as long as env vars above are set.

## Google OAuth Setup

In Google Cloud Console:
- Add authorized JavaScript origin:
  - `http://localhost:3000` (dev)
  - your production URL (e.g. `https://your-app.vercel.app`)
- Add authorized redirect URI:
  - `http://localhost:3000/api/auth/callback/google`
  - `https://your-domain.com/api/auth/callback/google`

## Local Development

## Run Now (Updated)

### Fresh setup

```bash
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run dev
```

### If you already had an older DB schema

This project now includes new study tables (`Flashcard`, `FlashcardReview`), so run a new migration:

```bash
npx prisma migrate dev --name add_study_features
npm run dev
```

Open `http://localhost:3000`.

### If migration history is already managed in your environment

```bash
npx prisma generate
npm run dev
```

## Production Build

```bash
npm run build
npm run start
```

## Data Model (High-Level)

- `User`
- `Note`
- `Tag`
- `NoteTag` (many-to-many)
- `Flashcard`
- `FlashcardReview` (review log for spaced repetition)

## API Summary

### Notes
- `GET /api/notes`
- `POST /api/notes`
- `GET /api/notes/[id]`
- `PUT /api/notes/[id]`
- `DELETE /api/notes/[id]`
- `GET /api/notes/related?noteId=...`

### Search
- `GET /api/search?q=...&tag=...&archived=true|false`

### AI
- `POST /api/ai/summarize` with `{ noteId }`
- `POST /api/ai/tags` with `{ noteId }`
- `POST /api/chat` with `{ message, noteId? }`
- `POST /api/ai/flashcards` with `{ noteId, count? }`
- `POST /api/study/session/quiz` with `{ noteId, questionCount? }`

### Study
- `GET /api/study/session?tag=...&limit=...`
- `GET /api/flashcards?due=true&noteId=...&limit=...`
- `POST /api/flashcards/[id]/review` with `{ quality: 0..5 }`

### Import
- `POST /api/import/text` with `{ title, content, sourceUrl?, tags? }`

## Current Rate Limiting

AI endpoints are wrapped by an in-memory limiter (`src/lib/rate-limit.ts`).

Important production note:
- This limiter is per-instance and resets on deploy/restart.
- For horizontal scale, replace with Redis/Upstash-backed distributed rate limiting.

## What Was Recently Added

- Retrieval-grounded chat:
  - Chat now retrieves top note excerpts for the user query
  - Assistant responses return citation snippets (`[c1]`, `[c2]`)
- Flashcards + spaced repetition:
  - AI flashcard generation endpoint
  - Study session feed for due/new cards
  - SRS grading endpoint (`quality: 0..5`) with review history logging
  - Dashboard study modal UI
- Quiz generation:
  - AI-generated quiz question endpoint from note content
  - Trigger actions in note UI
- Related notes:
  - Related-notes endpoint using shared tags + title overlap
  - Related notes panel in note modal
- Import:
  - Text import API (`title`, `content`, optional `sourceUrl`, `tags`)
  - Import modal in dashboard
- Stability/cleanup:
  - Removed debug logs in search and theme flows
  - Fixed loading-state JSX issue
  - Gemini env validation moved to runtime access (build-safe)

## Roadmap

- Persist quiz attempts and study analytics
- Better semantic retrieval for citations (embedding-based)
- Rich importers (PDF/URL transcription pipeline)
- Graph visualization for note relationships
- Zod validation on all API routes
- Redis-backed rate limiting

