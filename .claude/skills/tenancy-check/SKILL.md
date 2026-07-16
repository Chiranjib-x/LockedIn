---
name: tenancy-check
description: "Audit any SQL migration or TypeScript module for multi-college tenancy compliance. Run before committing any new table or server action. Catches missing college_id FKs, missing RLS, policies without get_my_college_id(), and client-trusted college_id inputs."
argument-hint: "[file-path | migration-number | module-name]"
allowed-tools:
  - Read
  - Grep
  - Bash
  - Glob
---

# /tenancy-check

Deep audit of a file or directory for LockedIn's multi-college tenancy rules.

**The tenancy rule (zero exceptions):** Every content table has `college_id` FK. RLS reads/writes scoped via `get_my_college_id()`. `college_id` stamped server-side on insert. Users belong to college via email domain → `colleges` table.

## What you must do

### Step 1 — Resolve the target

If `$ARGUMENTS` is empty: audit the most recent migration (`ls supabase/migrations/ | sort | tail -1`) AND `git diff --name-only HEAD` to find recently changed files.

If `$ARGUMENTS` is a number (e.g. `61`): target `supabase/migrations/00<N>_*.sql`.

If `$ARGUMENTS` is a file path: audit that file directly.

If `$ARGUMENTS` is a module name (no extension, no slash): audit `modules/<name>/` and `app/<name>/`.

### Step 2 — SQL audit (for .sql files)

Read each `.sql` file and check every `CREATE TABLE` block:

**Must have:**
- `college_id uuid references colleges(id) not null` — FK to colleges
- `alter table <name> enable row level security;` — RLS enabled

**Every SELECT policy must contain** one of:
- `college_id = get_my_college_id()`
- `is_app_moderator()`
- A join that transitively filters by college

**Every INSERT policy must contain:**
- `with check (college_id = get_my_college_id())`

**Every function that INSERTs must NOT:**
- Accept `college_id` as a parameter (it gets stamped inside)
- Contain `college_id = $N` where $N is a user-supplied argument

**Permitted exceptions** (mark as OK, not a finding):
- `colleges` table itself (it IS the tenancy anchor)
- `profiles` table (scoped by `auth.uid()`, college enforced at signup)
- Lookup/reference tables with no user content (e.g. `subject_codes`, `college_templates`)
- Junction tables where the parent already enforces tenancy (note the parent)

### Step 3 — TypeScript audit (for .ts / .tsx files)

Grep the file for any of these patterns and flag if found:

```bash
# Client-supplied college_id
grep -n "college_id.*req\|college_id.*body\|college_id.*params\|college_id.*searchParams" <file>

# Inline createClient (must use lib/supabase/)
grep -n "createClient(" <file> | grep -v "from '@/lib/supabase"

# Missing college filter on .from() queries
grep -n "\.from(" <file>
```

For every `.from('tableName')` call found: check that the query chain includes `.eq('college_id', ...)` OR is a server component using RLS (supabase/server.ts client) — RLS handles filtering automatically, so server-side queries with no `.eq('college_id')` are usually fine. Flag only if it's a `supabase/client.ts` (browser) client querying without RLS enforcement context.

### Step 4 — Output the report

Format findings as:

```
TENANCY AUDIT: <file(s)>
─────────────────────────
✅ PASS  — <table/function>: <what checked out>
❌ FAIL  — <table/function>: <specific violation>
⚠️  WARN  — <table/function>: <needs review but may be intentional>
```

At the end, one of:
- `ALL CHECKS PASSED — safe to commit.`
- `N FAILURE(S) — fix before committing.` + list of specific fixes needed.

### Step 5 — Offer to fix

If there are failures, ask: "Fix these now? I'll add the missing `college_id` columns/policies."

If yes: make the minimum edits to the SQL file to address each FAIL finding. Do not refactor or reorder SQL. Add only what's missing.

## Common fixes cheatsheet

**Missing college_id on table:**
```sql
college_id uuid references colleges(id) not null,
```

**Missing RLS enable:**
```sql
alter table <table> enable row level security;
```

**Missing SELECT policy:**
```sql
create policy "<table>: college read" on <table>
  for select to authenticated
  using (college_id = get_my_college_id());
```

**Missing INSERT check:**
```sql
create policy "<table>: college insert" on <table>
  for insert to authenticated
  with check (college_id = get_my_college_id());
```

**Stamp college_id server-side in function:**
```sql
-- In function body, replace any parameter-sourced college_id with:
college_id = get_my_college_id()
```
