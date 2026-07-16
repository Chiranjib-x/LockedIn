Debug a Supabase RLS (Row Level Security) issue.

Ask the user: which table, which operation (SELECT/INSERT/UPDATE/DELETE), and what error or unexpected behavior they're seeing.

**Diagnostic steps**:

1. **Check the policy exists**:
```sql
select policyname, cmd, qual, with_check
from pg_policies
where tablename = '<table>';
```

2. **Test as the authenticated role** — RLS runs as `authenticated`, not `postgres`:
```sql
set role authenticated;
set request.jwt.claims to '{"sub": "<user-uuid>", "role": "authenticated"}';
select * from <table> where id = '<row-id>';
```

3. **Check `get_my_college_id()` returns what you expect**:
```sql
select get_my_college_id();  -- must be called as authenticated with JWT set
```

**Common traps in this project**:

- **UPDATE without WITH CHECK**: the USING clause filters which rows can be updated, but WITHOUT WITH CHECK, PostgREST checks USING against the NEW row too — any update that removes your own claim (e.g. setting `college_id = null`) silently updates 0 rows. Fix: add `WITH CHECK (college_id = get_my_college_id())` or use a SECURITY DEFINER function.

- **Column-level revokes**: tables like `profiles` have column-level SELECT grants revoked (`room`, `contact_pref`). A `select *` from such a table returns 403. Fix: use `my_profile()` SECURITY DEFINER RPC for owner reads, or select only allowed columns.

- **Expand/contract ordering**: if you drop a column while a deployed build still selects it, PostgREST errors on every query touching that table. Deploy the code change first, then apply the migration.

- **SECURITY DEFINER functions bypass RLS**: use them for privileged cross-user operations (e.g. `find_by_username`, `record_checkin`), but make sure the function itself enforces the authz logic you need.

Report: paste the policy definitions you found and the exact fix applied.
