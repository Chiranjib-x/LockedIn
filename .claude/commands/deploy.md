Run pre-deploy checks and deploy to production.

**Pre-deploy checklist** (run all, fix failures before deploying):
1. `npx tsc --noEmit` — TypeScript must be clean
2. `npm run build` — build must succeed
3. `npm run lint` — no lint errors
4. Check `git status` — no uncommitted changes that should be in this deploy
5. Check `git log --oneline origin/main..HEAD` — confirm what's going out

**Deploy** (only after all checks pass):
```
git push
```
Auto-deploy is wired via Vercel Git integration. Verify by checking the Vercel dashboard for a new deployment, or run `vercel --prod` as fallback if the webhook is broken.

**Post-deploy smoke check** (prod: https://www.chiranjib.online):
- `/` — landing loads
- `/login` — auth page renders
- `/home` — redirects to login if unauthed (do not log in on prod)
- Any new routes added in this deploy — confirm they return 200

**Important reminders**:
- NEVER force-push to main
- If deploying a migration alongside code, follow expand/contract: deploy code first, THEN apply the migration (never drop a column the live build still reads)
- Pending unapplied migration `0038_drop_contact_pref.sql` is safe to apply — see docs/STATE.md

Report: build output summary, deploy URL, smoke check results.
