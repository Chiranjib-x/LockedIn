Review the current git diff for bugs, security issues, and convention violations before committing.

Run `git diff HEAD` (or `git diff --staged` if changes are staged) and review every changed file for:

**Correctness**
- Logic errors, off-by-one, wrong null checks (use `=== null` / `=== undefined`, never truthiness on values that can be 0, "", or false)
- Async/await mistakes, missing error handling on I/O paths
- Type mismatches or unsafe `as any` casts

**Security**
- Missing RLS policies on new Supabase tables
- `college_id` not stamped server-side on inserts (tenancy leak)
- SQL injection via unsanitized interpolation in RPC/query strings
- Client-side trust of user-supplied IDs without server-side ownership check

**Project conventions**
- Supabase client from `lib/supabase/client.ts` (browser) or `lib/supabase/server.ts` (server) — never `createClient` inline
- No hardcoded hex colors — use tokens from `app/globals.css @theme`
- UI components from `components/ui.tsx` (Card, Button, Section, inputClass)
- New routes follow the `app/<feature>/page.tsx` + `modules/<feature>/` pattern
- Mobile-first: no fixed pixel widths that break at 390px

**Output format**: list findings as `[SEVERITY] file:line — description` where SEVERITY is BUG / SECURITY / CONVENTION / STYLE. Flag BUG and SECURITY items that must be fixed before commit. Skip STYLE items that are subjective.
