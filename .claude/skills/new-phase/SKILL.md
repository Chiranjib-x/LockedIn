---
name: new-phase
description: "Scaffold a complete new feature phase for LockedIn: next migration file, module directory with actions.ts + client.tsx stubs, and app route with page.tsx. Use when starting any new feature wave."
argument-hint: "<phase-name> [brief description of what this phase does]"
allowed-tools:
  - Read
  - Write
  - Bash
  - Glob
  - Grep
---

# /new-phase

Scaffold a complete new LockedIn feature phase in one shot.

## What you must do

### Step 1 — Determine next numbers

```bash
ls supabase/migrations/ | sort | tail -3
```

Take the highest `NNNN` and increment by 1 for the migration number.

Read `PROJECT.md` to find the current last phase number — it appears in the phase tracker table. Increment by 1 for the new phase number.

If `$ARGUMENTS` is empty, ask the user: "What is this phase called and what does it do?" Then wait.

Parse `$ARGUMENTS` as: first word(s) = phase name slug, rest = description. If no description provided, ask.

### Step 2 — Create the migration file

Write `supabase/migrations/NNNN_<slug>.sql` with this skeleton:

```sql
-- NNNN: <one-line description from $ARGUMENTS>
-- Phase <phase_number>: <phase name>

-- ponytail: add only the tables/columns/policies this phase actually needs

-- [schema here]

-- TENANCY CHECK before committing:
-- □ Every new table has: college_id uuid references colleges(id) not null
-- □ Every new table has: alter table <t> enable row level security;
-- □ Every SELECT policy filters: using (college_id = get_my_college_id())
-- □ Every INSERT policy stamps: with check (college_id = get_my_college_id())
-- □ INSERT functions set college_id server-side, never from client input
```

### Step 3 — Create the module directory

Create `modules/<slug>/` with two files:

**`modules/<slug>/actions.ts`**:
```typescript
'use server';
import { createClient } from '@/lib/supabase/server';

// Server actions for <phase name>
// All queries are automatically college-scoped via RLS (get_my_college_id())
```

**`modules/<slug>/client.tsx`**:
```typescript
'use client';
// Client components for <phase name>
```

### Step 4 — Create the app route

Create `app/<slug>/page.tsx`:
```typescript
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function <PhaseName>Page() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return (
    <main className="p-4 pb-24">
      {/* <phase name> */}
    </main>
  );
}
```

### Step 5 — Update PROJECT.md

Append the new phase to the phase tracker table in `PROJECT.md`. Find the last `| Phase N |` row and add:
```
| Phase <N+1> | <phase name> | 🔲 Not started |
```

### Step 6 — Report

Print:
```
Phase <N> scaffolded:
  migration:  supabase/migrations/NNNN_<slug>.sql
  module:     modules/<slug>/actions.ts + client.tsx
  route:      app/<slug>/page.tsx
  PROJECT.md: updated

Next: write the SQL schema in the migration, then run /migrate to apply it.
```

## Rules

- Never add extra files beyond what's listed — no index.ts barrel, no types.ts, no README.
- The migration file is a template with the tenancy checklist comment — the user fills in the actual SQL.
- Module stubs are intentionally minimal; don't pre-populate functions.
- Slug must be kebab-case, matching the route directory name.
