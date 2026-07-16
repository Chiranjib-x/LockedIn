---
name: design-check
description: "Scan TypeScript/TSX files for design system violations: hardcoded hex/rgb/oklch colors, non-token spacing, and components not from components/ui.tsx. Run before committing any UI change. Optionally fixes violations by mapping to the nearest design token."
argument-hint: "[file-path | module-name | --staged | --all]"
allowed-tools:
  - Read
  - Grep
  - Bash
  - Edit
  - Glob
---

# /design-check

Audit UI files for LockedIn design system compliance.

**Design system rules (from CLAUDE.md):**
- Tokens live in `app/globals.css` `@theme` — **never hardcode hex**
- Palette: warm cream paper + cobalt blue + transaction green
- Components: `Card`, `Button`, `Section`, `inputClass` from `components/ui.tsx`
- Glassmorphism: **only** for floating layers (header, bottom nav, sheets)
- Motion: CSS-only (`animate-fade-up`, `.press`, `.shimmer`)
- Touch targets: min 44px (min-h-11 in Tailwind)

## What you must do

### Step 1 — Resolve the target

If `$ARGUMENTS` is `--staged`: scan `git diff --staged --name-only | grep -E '\.(tsx?|css)$'`

If `$ARGUMENTS` is `--all`: scan all `app/**/*.tsx`, `modules/**/*.tsx`, `components/**/*.tsx`

If `$ARGUMENTS` is a file path: scan that file.

If `$ARGUMENTS` is a module name: scan `modules/<name>/` and `app/<name>/`.

If empty: scan `git diff HEAD --name-only | grep -E '\.(tsx?|css)$'` (changed files since last commit).

### Step 2 — Scan for violations

Run these greps on each target file:

**1. Hardcoded hex colors:**
```bash
grep -n "#[0-9a-fA-F]\{3,8\}" <file>
```

**2. Hardcoded rgb/hsl/oklch values (not in globals.css):**
```bash
grep -n "rgb(\|hsl(\|oklch(" <file>
```
Skip hits in `app/globals.css` — that file defines the tokens and may contain raw values.

**3. Inline style with color:**
```bash
grep -n "style=.*color\|style=.*background" <file>
```

**4. Tailwind arbitrary color values:**
```bash
grep -n "\[#[0-9a-fA-F]\|bg-\[rgb\|text-\[rgb\|border-\[rgb" <file>
```

**5. Touch targets below 44px (Tailwind h-8, h-9, h-10 on interactive elements):**
```bash
grep -n "className=.*\bh-8\b\|className=.*\bh-9\b\|className=.*\bh-10\b" <file>
```
Flag only if the element is a `button`, `a`, or input — not decorative elements.

**6. Inline `createClient` (must come from lib/supabase/):**
Not a design issue but a convention check included here since it's caught in the same pass:
```bash
grep -n "createClient(" <file> | grep -v "from '@/lib/supabase"
```

**7. Glassmorphism outside floating layers:**
```bash
grep -n "backdrop-blur\|bg-white/\|bg-card/" <file>
```
Flag only if the component is NOT a header, bottom nav, modal, or sheet.

### Step 3 — Map violations to tokens

For each hardcoded color found, identify the closest design token from `app/globals.css`:

| Hardcoded | Token to use |
|-----------|-------------|
| `#f6f5f1` or similar cream | `bg-background` |
| `#0b0b0d` or near-black | `text-foreground` |
| `#ffffff` | `bg-card` |
| `#e7e5df` | `bg-muted` / `border-border` |
| Cobalt blue (~`#2563eb`) | `text-primary` / `bg-primary` |
| Green (~`#16a34a`) | `text-accent` / `bg-accent` |
| Red (~`#dc2626`) | `text-destructive` |

If a hardcoded value doesn't match any token, note it as `NO TOKEN — discuss with design`.

### Step 4 — Output the report

```
DESIGN AUDIT: <file(s)>
────────────────────────
✅ PASS  — no violations
❌ HEX   — line N: `#3b82f6` → use `text-primary`
❌ RGB   — line N: `rgb(246,245,241)` → use `bg-background`
⚠️  TOUCH — line N: `h-9` on <button> → use `min-h-11` (44px)
⚠️  GLASS — line N: `backdrop-blur` outside floating layer — is this a modal?
```

Summary: `N violation(s) found` or `All clean`.

### Step 5 — Offer to fix

If violations found: "Fix the hardcoded colors automatically? I'll replace them with the correct tokens."

If yes: use Edit to replace each hardcoded value with its token. For Tailwind classes, replace inline. For `style=` props, convert to className with token. For NO TOKEN cases, leave a `// ponytail: no design token for this — needs design decision` comment and skip.

Do not fix touch-target warnings or glassmorphism warnings automatically — those need context.

## Design token quick reference

```
bg-background     → warm cream paper (#f6f5f1)
bg-card           → white (#ffffff)
bg-muted          → soft beige (#e7e5df)
text-foreground   → near-black ink (#0b0b0d)
text-primary      → cobalt blue
text-accent       → transaction green (#16a34a)
text-destructive  → red (#dc2626)
border-border     → soft beige (#e7e5df)
```

Dark mode variants are handled automatically by the `@theme` block — never write separate dark-mode color rules.
