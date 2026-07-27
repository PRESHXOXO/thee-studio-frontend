# Thee Studio

The primary Thee Studio product: creator identity, creative direction, campaign
production, quality review, motion, and delivery in one React application.

## Local development

```powershell
npm install
npm run dev -- --host 127.0.0.1
```

Without Supabase configuration, the app uses account-isolated browser storage
and local production previews. This keeps UI development and Playwright tests
self-contained.

## Cloud mode

Copy `.env.example` to `.env.local` and set:

```text
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

Cloud mode activates:

- Supabase email/password and Google OAuth authentication
- row-level-security-backed campaign and creator records
- private creator-reference, generation-asset, and export storage
- authenticated Edge Functions for still, clip, and export providers

The schema and Edge Functions remain in the backend repository:

```text
sienna-studio-private/supabase/migrations/202607170001_crisp_creator_clip_pipeline.sql
sienna-studio-private/supabase/functions/
```

Apply that migration and deploy those functions before enabling cloud mode.

## Unified product boundary

`src/` is the only customer-facing Studio UI. The former
`sienna-studio-private/web/` application is the migration source for production
capabilities and should not be developed or deployed as a separate product.

The shared production runtime is under:

```text
src/context/ProductionContext.jsx
src/production/
src/screens/CampaignStudio.jsx
src/screens/ProductionExports.jsx
src/screens/ProductionRuns.jsx
```

## Verification

```powershell
npm run build
npm run test:e2e
```
