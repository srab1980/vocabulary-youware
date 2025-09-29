# Excel-to-Illustrated Vocabulary WebApp Guide

## Overview
Interactive React + TypeScript application that turns bilingual vocabulary spreadsheets into a curated library with AI-generated illustrations. Frontend is built with Vite and Tailwind, state handled by Zustand. Backend is a Cloudflare Worker that exposes REST endpoints backed by a D1 SQLite database.

## Essential Commands
- Install frontend dependencies: `npm install`
- Install backend dependencies: `npm install --prefix backend`
- Build production bundle (runs type checking via Vite): `npm run build`
- Deploy backend worker (after verifying build): `npm run deploy --prefix backend`
- Local worker dev (optional debugging): `npm run dev --prefix backend`

## Application Architecture
### Frontend (`src/`)
- **App.tsx** sets up layout. Upload/import handled by `components/UploadPanel.tsx` with SheetJS parsing via `hooks/useExcelImport.ts`.
- **State**: `store/useWordsStore.ts` loads/creates words and now exposes `exportVocabulary`, while `store/useImageGenerationStore.ts` orchestrates AI icon jobs. `store/useCategoriesStore.ts` caches categories.
- **WordTable.tsx** renders AG-grid-like table, controls icon regeneration, supports per-word icon downloads (fetching either remote URLs or inline data URIs), and triggers Excel export by calling backend `/api/export` with `ExportWordsInput` payload and downloading the resulting workbook.
- **API client** (`api/client.ts`) targets `https://backend.youware.me/api`, wrapping fetch calls with consistent error handling; now includes `exportVocabulary` that returns `{ blob, suggestedFileName }`.
- **AI Integration** configured via `yw_manifest.json` (`ai_config.vocab_image`). Frontend directly calls `https://api.youware.com/public/v1/ai/images/generations` using the Youware AI SDK runtime token (`sk-YOUWARE` placeholder).

### Backend (`backend/`)
- Worker entry `src/index.ts` uses `itty-router`. Routes:
  - `/api/categories` CRUD
  - `/api/words` CRUD
  - `/api/export` (new) accepts `ExportWordsInput` and returns XLSX (SheetJS `xlsx` package, stored as `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`). Embedded images currently unsupported (warns when `embedImages=true`).
- **Database**: `schema.sql` defines STRICT tables `categories`, `words`, `word_tags` with indices. Words reference categories, and include icon key plus optional metadata.
- **Auth**: `requireAuth` reads `X-Encrypted-Yw-ID` / `X-Is-Login`. Creation & updates require authenticated users.

## Data Contracts
- Types live in `src/types/api.ts`. Notable additions: `ExportWordRow`, `ExportWordsInput`. Frontend stores conform to these when calling export.
- Word objects mirror backend columns with camelCase conversion.

## Workflow Notes
1. **Import**: SheetJS reads `.xlsx/.xls/.csv` → `useWordsStore.bulkImportWords` for local preview.
2. **Generate Icons**: `useImageGenerationStore` queues AI jobs, caches results, and saves URLs in `word.wordIconKey` via store update → persists after manual save.
3. **Export**: `WordTable.handleExport` builds payload from current table state, posts to `/api/export`, then downloads returned file.
4. **Categories**: `CategoryList` reads categories and allows creation (UI in future).

## Deployment & Storage
- Worker deployment uses Wrangler (configured in `backend/wrangler.toml`). After backend changes, run `npm install --prefix backend`, `npm run build`, then `npm run deploy --prefix backend`.
- AI outputs currently stored as data URLs; future work should persist to R2 via presigned uploads when needed.

## Known Limitations / Follow-ups
- `/api/export` currently returns icon URLs, not embedded images. Extend using SheetJS image embedding if required.
- Frontend shows network error banners when `backend.youware.me` unreachable inside screenshot sandbox; safe to ignore in actual runtime.
- Chunk warning (>500 kB) logged during build; consider code-splitting once feature set stabilizes.
