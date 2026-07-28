# Thee Studio

The primary Thee Studio product: creator identity, creative direction, campaign
production, quality review, motion, and delivery in one React application.

## Local development

```powershell
npm install
npm run dev -- --host 127.0.0.1
```

Vite development mode can use account-isolated browser storage and local
production previews. Production builds require Supabase unless
`VITE_ALLOW_LOCAL_MODE=true` is explicitly set for a non-production demo.

## Cloud mode

Copy `.env.example` to `.env.local` and set:

```text
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

Cloud mode activates:

- Supabase email/password and Google OAuth authentication
- row-level-security-backed creators, references, library, history, and campaigns
- private creator-reference, generation-asset, and export storage
- authenticated Edge Functions for still, clip, and export providers
- managed monthly generation credits with an idempotent usage ledger
- persistent generation jobs with progress, cancellation, retry, and recovery
- client and provider error telemetry
- versioned Creator Memory that learns Brand DNA from review decisions
- full-resolution Library originals separated from fast review thumbnails

The schema and Edge Functions remain in the backend repository:

```text
sienna-studio-private/supabase/migrations/202607170001_crisp_creator_clip_pipeline.sql
sienna-studio-private/supabase/migrations/202607270001_p0_release_foundation.sql
sienna-studio-private/supabase/migrations/202607280001_creator_memory.sql
sienna-studio-private/supabase/functions/
```

Apply all migrations in filename order and deploy the three `crisp-*` Edge
Functions before enabling cloud mode. Configure provider secrets on the server;
customers use managed credits by default. Personal provider keys remain under
Generation Settings → Advanced provider setup.

Creator Memory stores explicit Brand DNA plus learned approval/rejection
signals. Director, Scene Flow, and Campaign prompts consume the same versioned
memory, making output consistency improve as a customer reviews more work.

The first Campaigns visit creates a safe, editable sample workspace when the
account has no campaign data. This gives a new account a useful path to explore
without presenting generated demo media as the customer’s own work.

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
