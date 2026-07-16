Scaffold a new feature module following LockedIn project conventions.

Ask the user for the feature name if not provided (e.g. "events", "polls", "leaderboard").

**Files to create** (minimum set — add only what's needed):

```
app/<feature>/page.tsx          # Route entry point (server component)
app/<feature>/layout.tsx        # Optional: only if needs its own layout
modules/<feature>/actions.ts    # Server actions (use server Supabase client)
modules/<feature>/<feature>-card.tsx  # Card component for list items
```

**Conventions to follow**:

`app/<feature>/page.tsx`:
- Server component, imports `createClient` from `lib/supabase/server.ts`
- Redirects to `/login` if no session
- Fetches data server-side with `.eq('college_id', college_id)` scoping
- Returns `<Section>` + list of `<FeatureCard>` components

`modules/<feature>/actions.ts`:
```ts
'use server'
import { createClient } from '@/lib/supabase/server'
// stamp college_id server-side on every insert — never trust client
```

`modules/<feature>/<feature>-card.tsx`:
- Client component (`'use client'` only if needs interactivity)
- Uses `Card` from `components/ui.tsx`
- Mobile-first, no hardcoded hex (use CSS token vars from `app/globals.css`)

**Tenancy rule** (mandatory, no exceptions):
- New table migration needs `college_id uuid references colleges(id) not null`
- RLS: read policy uses `college_id = get_my_college_id()`
- Insert policy stamps `college_id = get_my_college_id()` server-side

After scaffolding, remind the user to: run `npx tsc --noEmit`, add the route to the bottom nav if it's a primary feature, and write a migration if a new table is needed (use `/project:migrate`).
