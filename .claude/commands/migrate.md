Create a new Supabase migration for this project.

Steps:
1. List files in `supabase/migrations/` to find the current highest number (pattern: `NNNN_feature_name.sql`).
2. Increment by 1 for the new migration number.
3. Ask the user what this migration does if not already stated.
4. Write the SQL file at `supabase/migrations/NNNN_<name>.sql`.

Project rules to follow:
- **Tenancy**: every new content table needs `college_id uuid references colleges(id) not null` and RLS policies scoped via `get_my_college_id()`.
- RLS UPDATE policies must include `WITH CHECK` — any transition removing the actor's own claim silently updates 0 rows without it (use a SECURITY DEFINER function for such cases).
- Never drop a column until every deployed build has stopped reading it (expand/contract pattern).
- Stamp `college_id` server-side on insert, never trust the client.
- After writing the SQL, apply it using the `SUPABASE_DB_URL` from the environment: `psql "$SUPABASE_DB_URL" -f supabase/migrations/NNNN_<name>.sql`

When done, report: migration path, key tables/policies created, and any follow-up code changes needed.
