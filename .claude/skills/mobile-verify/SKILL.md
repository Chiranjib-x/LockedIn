---
name: mobile-verify
description: "Open a LockedIn route in Chrome at 390×844 mobile viewport and visually verify it. Use after any UI change to confirm it looks right on a phone screen before committing. Handles dev server startup, login if needed, and screenshot."
argument-hint: "<route> [--login | --login-as <email>] [--dark]"
allowed-tools:
  - Bash
  - mcp__claude-in-chrome__tabs_context_mcp
  - mcp__claude-in-chrome__tabs_create_mcp
  - mcp__claude-in-chrome__navigate
  - mcp__claude-in-chrome__computer
  - mcp__claude-in-chrome__read_page
  - mcp__claude-in-chrome__resize_window
  - mcp__claude-in-chrome__javascript_tool
  - mcp__claude-in-chrome__gif_creator
---

# /mobile-verify

Visually verify a LockedIn route at iPhone-sized viewport (390×844).

**Dev accounts** (password `testpass1234`):
- `lockedin.phase1.test@gmail.com` — founder/moderator (Demo College)
- `lockedin.test.girl@gmail.com` — student female (Demo College)
- `lockedin.test.boy@gmail.com` — student male (Demo College)

**Dev server:** always port **3001** (port 3000 is another app — never use it).

## What you must do

### Step 1 — Parse arguments

From `$ARGUMENTS`:
- `route` = first arg (e.g. `/marketplace`, `/communities/new`)
- `--login` = use default founder account
- `--login-as <email>` = use specified account
- `--dark` = enable dark mode before screenshot
- `--gif` = record interaction as GIF

If no route given, ask: "Which route should I verify?"

### Step 2 — Ensure dev server is running

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/
```

If not 200: run `npm run dev -- --port 3001` in background, wait ~8 seconds, then retry. If still not up after 15s, tell the user to start the dev server (`npm run dev -- --port 3001`) and stop.

### Step 3 — Open Chrome at mobile viewport

Load browser tools if not already loaded:

```
ToolSearch: select:mcp__claude-in-chrome__tabs_context_mcp,mcp__claude-in-chrome__tabs_create_mcp,mcp__claude-in-chrome__navigate,mcp__claude-in-chrome__computer,mcp__claude-in-chrome__resize_window,mcp__claude-in-chrome__javascript_tool
```

1. Call `tabs_context_mcp` to see existing tabs
2. Create a new tab with `tabs_create_mcp`
3. Set window size to **390×844** with `resize_window`

### Step 4 — Navigate and optionally log in

Navigate to `http://localhost:3001<route>`.

If `--login` or `--login-as` was given AND the page redirected to `/login`:
1. Navigate to `http://localhost:3001/login`
2. Fill email field with the account email
3. Fill password field with `testpass1234`
4. Click the sign-in button
5. Wait for redirect back to `<route>`

If `--dark` was given, inject dark mode:
```javascript
document.documentElement.classList.add('dark');
localStorage.setItem('li-theme', 'dark');
```

### Step 5 — Screenshot and report

Wait 1 second for animations to settle, then take a screenshot.

Read the page to check for:
- Any visible error messages or empty states that shouldn't be there
- Missing content (empty cards, no data when data is expected)
- Obvious layout breaks (text overflow, elements cut off)

Report:
```
Mobile verify: <route> at 390×844
Status: [PASS / ISSUES FOUND]
Screenshot: [taken]

[If issues] Found:
- <description of issue>
```

If `--gif` was given: use `gif_creator` to record the interaction from navigation through the final state.

### Step 6 — Offer follow-up

Ask: "Anything specific to interact with? (scroll, tap a button, check a form)"

If yes, perform the interaction and take another screenshot.

## Rules

- Never navigate to port 3000
- Never click buttons that trigger browser confirm/alert dialogs
- Always create a NEW tab — never reuse existing tabs
- The viewport must be exactly 390×844 before navigating
- If Chrome is not connected, tell the user to open Claude-in-Chrome extension and refresh
