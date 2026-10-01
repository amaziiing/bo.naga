---
name: Backoffice Admin Panel
description: Charcoal + Amber control terminal for brand operators — light cream continuum (locked), dark warm-charcoal continuum, amber accents.
colors:
  primary-light: "#D97706"
  primary-deep-light: "#B45309"
  primary-bright-light: "#F59E0B"
  secondary-light: "#2563EB"
  success-light: "#12B76A"
  danger-light: "#991B1B"
  text-light: "#18191C"
  text-secondary-light: "#27272A"
  muted-light: "#71717A"
  placeholder-light: "#78716C"
  bg-light: "#FFF1DC"
  surface-light: "#FFF8EB"
  border-light: "#EADCC8"
  sidebar-light: "#FFE8CC"
  canvas-left-light: "#FFE8CC"
  canvas-right-light: "#FFF8EB"
  tip-bg-light: "#FFF8EB"
  tip-text-light: "#6b360c"
  money-positive-light: "#B45309"
  primary-dark: "#F59E0B"
  primary-deep-dark: "#D97706"
  success-dark: "#10B981"
  danger-dark: "#F87171"
  text-dark: "#F5F5F4"
  text-secondary-dark: "#E7E5E4"
  muted-dark: "#A1A1AA"
  bg-dark: "#2C2E38"
  surface-dark: "#383A46"
  border-dark: "rgba(255,255,255,0.10)"
  sidebar-dark: "#3A3226"
  canvas-left-dark: "#3A3226"
  canvas-right-dark: "#2C2E38"
  tip-bg-dark: "#40424E"
  money-positive-dark: "#F59E0B"
  accent-on-dark: "#2A2C36"
typography:
  ui:
    fontFamily: "ui-sans-serif, Segoe UI, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: 1.4
  sidebar-l1:
    fontWeight: 800
  mono:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
rounded:
  control: "8px"
  card: "16px"
  pill: "999px"
  nav: "10px"
  avatar-topbar: "12px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  kpi-summary-card:
    backgroundColor: "{colors.surface-light}"
    textColor: "{colors.text-light}"
    rounded: "{rounded.card}"
    padding: "16px 18px"
    height: "104px"
  kpi-summary-icon:
    backgroundColor: "rgba(217,119,6,0.12)"
    textColor: "{colors.primary-light}"
    rounded: "{rounded.pill}"
    size: "52px"
  kpi-summary-label:
    typography: "12px/800"
    textColor: "#57534E"
  kpi-summary-value:
    typography: "23px/900"
    textColor: "{colors.text-light}"
  kpi-summary-note:
    typography: "11px/600"
    textColor: "{colors.muted-light}"
---

# Design System — Charcoal + Amber

**Source of truth for all BO UI going forward.** Reference implementation: Admin Detail (`data-access-page="main_admin_detail"`).

Former **Deep Navy Cyan** (`#123B66` / `#21A6D7` / `#072647` / `#08131F`) is **retired**. Do not reintroduce navy/cyan as brand identity.

## Overview

Backoffice is a desktop-first ops panel. Visual world: **Charcoal structure + Amber interaction**.

- Light: orange→cream canvas continuum; warm cream sidebar; listing panels `#FFF8EB`. **Form pages use a layer ladder** (lift `#FFFCF7` → well `#F5EBDC` → nested `#F0E4D0`) — never one flat cream. **Locked 2026-09-14.**
- Dark: warm charcoal→cool charcoal continuum; soft surfaces (not dead black); amber neon accents.

### Light mode surfaces (locked — copy exactly)

User-confirmed on Dashboard main pane (topbar + canvas + cards). Do not regress to `#FFFFFF` or near-white ivory `#FFFCF8`.

| Role | Hex | Notes |
|------|-----|-------|
| Sidebar (opaque) | `#FFE8CC` | Warmest peach; covers content when expanded |
| Canvas / `--bo-bg` | `#FFF1DC` | Cream under panels |
| Continuum L→R | `#FFE8CC` → `#FFF1DC` → `#FFF3E0` → `#FFF6E8` → `#FFF8EB` | Canvas only; `background-attachment: fixed` |
| Surface / topbar / listing cards | `#FFF8EB` | Same cream as tip bg |
| Form section lift (Create/Edit) | `#FFFCF7` | Brighter than canvas; never flatten to one cream |
| Form border (Create/Edit) | `#DCC9A8` | Stronger than listing `#EADCC8` |
| Border (listing / default) | `#EADCC8` | Warm separator |
| Control well (inputs / currency) | `#F5EBDC` | Deeper cream inset |
| Nested well (privileges / security) | `#F0E4D0` | One step deeper than control well |
| Locked / readonly well | `#EDE4D4` | Non-editable fields |
| Accent-on (text on amber fill) | `#FFFFFF` | Only place pure white is allowed |

Reference CSS: `main-dashboard-executive.css` light tokens.

Theme toggle: `data-bo-theme` / `localStorage.bo_theme`. Prefer `--bo-*` tokens over hard-coded hex in new work.

**Canvas ownership — one rule for every new BO page (locked 2026-09-30).** The `Continuum L→R` row above is the
canvas of **every** BO page, and it is painted in exactly one place: `assets/css/bo-charcoal-shell.css`
(`html[data-bo-theme] :has(body.report-body.bo-charcoal)`), with `body` left transparent. A new BO page therefore does
**nothing** for its canvas — it ships `body.report-body.bo-charcoal` (plus the three shell lines: `bo-shell.css`, the
`data-bo-topbar` header, `bo-topbar.js`) and the continuum arrives. Do not paint `html` / `body` / `.report-shell` /
`.report-main` / `.report-content` on a BO page: an opaque `background` on any of those five replaces the continuum,
which is how ~108 pages ended up flat against 13 that showed it (`bo-charcoal-legacy.css` used to flatten the canvas
with `!important`; those two rules are gone).

**The one opt-out is deliberate and explicit.** A page whose shell is **not** the BO shell — the Main panel
(`main-*`, `main_*`, `menu-permission.html`) and the agent portal (`agent-*` with `agent-portal.js`) — keeps its own
flat canvas (light `#FFF1DC`, dark `#2C2E38`), per AGENTS.md: do not unify those shells. A page that must keep a flat
canvas while still carrying `bo-charcoal` says so itself with `bo-flat-canvas` on its `<body>`; the flat rule in
`bo-charcoal-legacy.css` is scoped to that marker plus the Main panel's own classes, and it names only classes that sit
on **no** BO page. Detail and measurements: *Canvas: BO follows the continuum, the Main panel and the agent portal keep
their flat one* at the end of this file.

> Token names `--bo-navy` / `--bo-cyan` remain in CSS for compatibility but now map to **neutral text / amber accent**, not navy/cyan hues.

## Colors

### Brand roles

| Role | Light | Dark |
|------|-------|------|
| Primary (CTA, active, focus) | `#D97706` | `#F59E0B` |
| Primary deep (hover / money+) | `#B45309` | `#D97706` |
| Bright amber (highlights) | `#F59E0B` | `#FBBF24` |
| Secondary (info / rare) | `#2563EB` | `#D97706` |
| Success | `#12B76A` | `#10B981` |
| Danger | `#991B1B` | `#F87171` |
| Accent-on (text on primary fill) | `#FFFFFF` | `#2A2C36` |

### Surfaces & text

| Role | Light | Dark |
|------|-------|------|
| Canvas / `--bo-bg` | `#FFF1DC` (warm cream under panels) | `#2C2E38` |
| Surface / cards / topbar | `#FFF8EB` cream (no ivory / no `#FFFFFF`) | `#383A46` |
| Border | `#EADCC8` | `rgba(255,255,255,.10)` |
| Text | `#18191C` | `#F5F5F4` |
| Text secondary | `#27272A` | `#E7E5E4` |
| Muted / time | `#71717A` | `#A1A1AA` |
| Control well | `#F5EBDC` | `rgba(255,255,255,.06)` |
| Placeholder | `#78716C` (on cream wells) | `#A1A1AA` |

### Row status / role pills (soft fluorescent — locked 2026-09-28)

Luminous pastel wash + calm mid ink on cream table rows. Specimen: Merchants list (`.mad-role` · `.mad-status`) · Providers list (`.mpv-status`). Sources: `assets/css/main-merchant-detail-executive.css`, `assets/css/main-provider-detail-executive.css`, `assets/css/main-provider-family-executive.css`; the role rules also live 1:1 in `assets/css/main-admin-detail-executive.css` (visible on Main > Admin Management), `assets/css/main-report-charcoal.css` and `assets/css/bo-charcoal-shell.css` (both inert).

| Part | Light fill / ink | Notes |
|------|------------------|-------|
| Role Brand Owner (`.mad-role.is-super` / `.is-partner` / `.is-merchant`) | `#F0ECFA` / `#6B5B95` | Soft fluorescent lilac — not neon violet `#EDE9FE`/`#5B21B6`, not dusty dark. Dark keeps the reference's wash `rgba(124,58,237,.22)` / `#C4B5FD`. The one-chip pass of 2026-09-28 collapsed this to the cream listing surface; restored the same day (→ Role chip) |
| Role pills, the other tones (`.is-support` / `.is-tech` / `.is-regional` · `.is-risk` · default) | blue `#DBEAFE`/`#1D4ED8` · red `#FEE2E2`/`#B91C1C` · grey `#F3F4F6`/`#4B5563` | The reference's hue-coding, kept for these groups. Dark: blue `rgba(37,99,235,.22)`/`#93C5FD`, red `rgba(239,68,68,.18)`/`#FCA5A5`, grey `rgba(255,255,255,.08)`/`#D4D4D8` |
| Status Active (`.mad-status.is-active` · `.mad-status-chip.is-active` · `.mas-status.is-success` · `.mpv-status.is-active`) | `#EAF7F0` / `#1A8A5C` · dot `#3CB87A` · hover `#D8F0E4` | Soft fluorescent mint — not neon `#D1FAE5`/`#10B981`. Providers + Merchants share this. |
| Status Suspended | `#FEE2E2` / `#B91C1C` | Unchanged |

### Sidebar & canvas continuum

**Rule:** Only the **canvas** does sidebar→page transition. Sidebar itself is **opaque** (covers content when expanded). Panels/tables stay solid surface. Source: `assets/css/bo-charcoal-shell.css`.

| Mode | Sidebar fill | Continuum (L→R, ~96px past sidebar) |
|------|--------------|-------------------------------------|
| Light | `#FFE8CC` | `#FFE8CC` → `#FFF1DC` → `#FFF3E0` → `#FFF6E8` → `#FFF8EB` |
| Dark | `#3A3226` (paint; token `--bo-sidebar-bg` may read `#2A2C36`) | `#3A3226` → `#342E28` → `#2F2E32` → `#2D2E36` → `#2C2E38` |

**Chrome (Light | Dark)**  
- Edge rail: light `::before` 2px `#F59E0B`→`#D97706` · dark `::after` amber gradient (dark `::before` = faint grid).  
- Brand / close / logout: light brown text + cream chips · logout danger `#B42318` / dark `#FF8A90`.  
- L1 weight `800`. Light text `#6b360c`. Dark default `rgba(255,255,255,.86)`.  
- L1 hover: light `rgba(255,243,224,.78)` · dark `rgba(255,255,255,.04)`.  
- L1 active: light cream gradient `#FFF8EF`→`#FFE8CC`→`#FFF3E0` + **3px left amber bar**; dark amber wash + **2px left bar** · text `#FBBF24`.

**Desktop flyout (`.nav-group-list`)** — light `#FFF8EB` + `rgba(92,74,48,.12)` (never `#fff`; beat `reports.css`). Dark `#383A46` + `rgba(255,255,255,.14)` · shadow `0 16px 40px rgba(0,0,0,.35)`.

**L2 active (`.report-sub.active`) — locked, two light chips**  
- Inline (`.report-nav a.report-sub.active`): `#FFF8EF`→`#FFE8CC` + border `rgba(217,119,6,.28)`.  
- Flyout (`.nav-group-list a.report-sub.active`): `#FFFBEB`→`#FEF3C7` + border `#D97706` + soft amber ring/shadow.  
- Dark (both): amber/charcoal chip + `rgba(245,158,11,.55)` · text `#FBBF24`.  
Hover = soft wash only (no frame). Do not use flat active wash. Full tables: `.interface-design/system.md` → Patterns → Sidebar nav.

### CSS token map (compatibility)

| Token | Light | Dark |
|-------|-------|------|
| `--bo-navy` | `#18191C` | `#F5F5F4` |
| `--bo-cyan` | `#D97706` | `#F59E0B` |
| `--bo-cyan-deep` | `#B45309` | `#D97706` |
| `--bo-ui-blue` | `#D97706` | `#F59E0B` |
| `--bo-sidebar-active` | `#D97706` | `#F59E0B` |
| `--bo-sidebar-active-bg` | `#FFE8CC` | `rgba(245,158,11,.14)` |
| `--bo-cyan-tint` | `rgba(217,119,6,.12)` | `rgba(245,158,11,.16)` |

### Components (color + locked chrome)

Every row is **Light | Dark**. Full measurements + hover/active live in `.interface-design/system.md` → Patterns (Coverage checklist).

| Element | Light | Dark |
|---------|-------|------|
| Primary CTA | amber gradient `#FBBF24`→`#F59E0B`→`#EA8608`, text white, border `#E8901A` | `#FBBF24`→`#F59E0B`→`#D97706`, text `#2A2C36`, border `#F59E0B` |
| Primary hover | reverse lift `#FCD34D`→`#FBBF24`→`#F59E0B`→`#EA8608` | reverse `#FDE68A`→`#FBBF24`→`#F59E0B` |
| Ghost / Export | `#FFFCF7`→`#F5EBDC`→`#EDE4D4`, border `#DCC9A8`, text `#18191C` (form) · listing `#FFF8EB`→`#F3E8D6` | `#4A4C58`→`#383A46`→`#2C2E38`, text `#F5F5F4` |
| Ghost hover (Create Role Back/Cancel) | reverse cream · border `#E0D0B8` · lift (no amber fill) | reverse charcoal · lift |
| Hover tip | `#FFF8EB` + amber border, text `#6b360c` · chart tips radius `8px` · **datetime / float / Last Login tips = `999px` pill** (pad `7px 14px`) | `#40424E` + amber border, text `#F5F5F4` · same radii |
| Money positive / zero | `#B45309` / `#71717A` | `#F59E0B` / `#A1A1AA` |
| Modal panel / close / scrim | cream panel · close well `#F5EBDC` · scrim `rgba(15,23,42,.55)` | `#383A46` · charcoal close · same scrim |
| Tabs active | text `#18191C` · underline `#D97706` | text `#F4F4F5` · underline `#F59E0B` |
| Filter bar / search | surface · `#EADCC8` · icon `#57534E` · **listing h `36px` / radius `8px`** (Wallet Ledger specimen) | charcoal · white/14 · muted icon · same `36px` |
| KPI summary card (`.metric` + `.bo-summary-icon`) | surface `#FFF8EB` · border `#EADCC8` · radius `16px` · pad `16px 18px` · min-h `104px` · icon↔text gap **`24px`** · icon `52×52` amber wash | surface `#383A46` · border white/10 · same geometry · icon amber neon wash |
| Status pills (Active/Suspend/All) | cream capsule thumb `999px` · idle muted dots · green/red **only when selected** · All = no dot · counts `(n)` | charcoal capsule · neon green/red when selected |
| Permission group (open) | cream `#FFFCF7` · head `#FFF8EB`→`#FFF1DC` · amber border | cool `#383A46` · open head `#40424E` · body `#2C2E38` · amber border only |
| Permission card | surface `#FFF8EB` · hover `#FFFCF7` · checked `#FFF8EB` · current `#FFF1DC` | `#2A2C36` · hover `#32343E` · checked/current amber tint only |
| Roles sticky footer Save/Cancel | Primary + Ghost 3D · h `38px` | amber Primary (dark text) + charcoal Ghost |
| Data table panel border | `#EADCC8` | `rgba(255,255,255,.14)` |
| Data table header text | `#3F3F46` / `700` | `#E7E5E4` / `700` |
| Data table cell / muted | `#374151` · muted/time `#57534E` | `#F5F5F4` · muted/time `#D4D4D8` |
| Data table row divider | `#F0E6D8` | `rgba(255,255,255,.12)` |
| Table footer bar | surface · cream top border · info `#57534E` | charcoal · white/14 edge · info `#D4D4D8` |
| Table pager inactive | `#F3F4F6` / `#9CA3AF` | `#383A46` / `#A1A1AA` + white/12 border |
| Table pager active | amber 3D gradient · white label · soft lift | amber 3D · text `#2A2C36` · amber glow |
| Action icons | `#57534E` · hover amber | `#D4D4D8` · hover amber |
| Modal close | well `#F5EBDC` · border `#EADCC8` · icon `#57534E` | charcoal well · light icon |
| Sidebar flyout panel | `#FFF8EB` · `rgba(92,74,48,.12)` · shadow `0 12px 32px rgba(60,48,32,.14)` | `#383A46` · `rgba(255,255,255,.14)` · `0 16px 40px rgba(0,0,0,.35)` |
| Sidebar L1 active | `#FFF8EF`→`#FFE8CC`→`#FFF3E0` + **3px** left amber bar | amber wash + **2px** left bar · text `#FBBF24` |
| Sidebar L2 active | inline `#FFF8EF`→`#FFE8CC` + `rgba(217,119,6,.28)` · flyout `#FFFBEB`→`#FEF3C7` + `#D97706` | amber/charcoal chip + `rgba(245,158,11,.55)` · text `#FBBF24` |
| Sidebar logout | `#B42318` / icon `#D92D20` · cream danger chip | `#FF8A90` / icon `#F87171` |
| Create / Edit section card | lift `#FFFCF7` · border `#DCC9A8` · warm shadow · **3px amber left rail** | `--bo-surface` |
| Create / Edit inputs | `#F5EBDC` · border `#DCC9A8` · placeholder `#78716C` | `#2A2C36` · `rgba(255,255,255,.12)` |
| Create / Edit nested well | `#F0E4D0` (privileges / policy / security) | faint wash |
| Create / Edit locked field | `#EDE4D4` · text `#57534E` | charcoal wash |
| Create / Edit status seg | track `#EDE4D4` · active `#FFFCF7` | charcoal |
| Create / Edit sticky footer | `#FFFCF7` · border `#DCC9A8` · stronger warm shadow | translucent charcoal |
| Roles / Create Role text inputs + Role select | surface `#FFF8EB` · border `#EADCC8` · placeholder `#78716C` (not muddy well `#F5EBDC`) | `#2A2C36` |
| Create Role chips (Select All / Clear) | surface `#FFF8EB` · border `#EADCC8` · Toggle All amber wash | charcoal · amber wash |
| Create Role Ghost (Back / Cancel) | 3D `#FFFCF7`→`#F5EBDC`→`#EDE4D4` · hover reverse cream (no amber fill) | charcoal 3D gradient |

### Topbar chrome (locked — all pages)

**Specimen (2026-09-17):** Deposit Approval (`member-deposit.html` · `body.bo-wallet-tx.deposit-approval-page`) — cream topbar with full left title + right ops cluster. Copy this anatomy; do not freestyle alternate account pills or counter rainbows.

**Anatomy**

| Side | Order (L→R) |
|------|-------------|
| Left | `.hamb` (sidebar open) → `.user-title-wrap` (`.user-title-icon` + `h1` [+ lead `<p>` on Deposit/Withdraw Approval]) |
| Right (`.report-actions`) | `.bo-theme-btn` → `[data-bo-profile]` = optional **header counters** (non-`MAIN` roles) → 1px divider → `.bo-account-link` (name + role + avatar) |

**Padding and height.** Base `.report-topbar` is `padding:10px 20px` (Dashboard value in `reports.css`). Transaction / Deposit–Withdraw pages pin height **`64px`** (`--bo-header-h`) with vertical pad `0` and centered row. Mobile variants (`padding:10px 12px`, and the `max-width:700px` `8px 10px` for `.standardized-listing-page`) are unchanged, as is the mini-sidebar `padding-left:20px`.

**Title block (`.user-title-wrap`).** Icon tile + `<h1>` on every page. **Admin / most listing pages:** title only (no lead). **Deposit / Withdraw Approval:** keep one-line lead under the title (e.g. “Review and process member deposit requests.”) — muted `12px/500`. Hide the lead at ≤768. `main-merchant-detail.js` still null-guards a missing `<p>`.

**Theme toggle (`.bo-theme-btn`)**  
`36×36`, radius `8px`, transparent fill. Light: border `rgba(24,25,28,.18)`, icon `#3F3F46`. Dark: border `rgba(245,158,11,.4)`, icon `#F59E0B`. Hover dark → `#FBBF24`. Focus outline `#D97706`.

**Header counters (`.bo-header-counter`)** — Members / Deposit / Withdraw chips injected by `auth.js` for non-`MAIN` roles. Larger cream chips (not rainbow). Light: chip `#FFFCF7` · border `#EADCC8` · **h `48px`** · radius **`10px`** · icon tile **`38×38`**. Members = charcoal icon wash; Deposit = bright amber; Withdraw = deep amber. Label `11px/800` uppercase · value `18px/800` tabular. Dark: well `#2A2C36` · border `white/16`. Full table: `.interface-design/system.md` → Patterns → Topbar.

**User Name (`.bo-account-link`)**  
No bordered pill / no gear. Name `14px/700` (`#18191C` light · `#FFFFFF` dark). Role `11px` mono (`#71717A` light · `#F59E0B` dark). Avatar `40×40` radius `12px`: light `#D97706` / white icon; dark `#F59E0B` / `#2A2C36` icon + amber glow. Hover avatar: `#B45309` / `#FBBF24`.

### Buttons (locked metrics)

| Spec | Value |
|------|-------|
| Radius | `8px` |
| Height | **`36px`** default (listing filters + page chrome) · `40px` modal · Delete Role toolbar may stay `42px` until migrated |
| Weight | `700` |
| Classes | Primary: `.mad-btn-primary` / `.mad-btn-navy` / `.bo-ui-button-primary` (all amber). Ghost: `.mad-btn-ghost` / Export |
| Motion | hover `-1px` · active `+1px` |
| Focus | amber 2px outline |

Do not freestyle topbar account chips or primary fills (no navy/cyan primary). Full tables live in `.interface-design/system.md` → Patterns.

### KPI summary card (locked — Member Wallet specimen)

Icon + label + value + note tile used on Transaction listing pages (`body.bo-wallet-tx`), specimen: **Member Wallet** (`.quick-stats .metric` + injected `.bo-summary-icon` + `.bo-summary-note`). Do not use rainbow icon chips (green/purple) — amber wash only.

| Part | Light | Dark |
|------|-------|------|
| Tile (`.metric`) | bg `#FFF8EB` · border `1px #EADCC8` · radius **`16px`** · pad **`16px 18px`** · min-height **`104px`** · shadow `--bo-shadow` | bg `#383A46` · border `rgba(255,255,255,.10)` · same pad/radius/min-h · shadow none |
| Layout | CSS grid `52px minmax(0,1fr)` · **`column-gap: 24px`** (icon↔text) · `align-items: center` | same |
| Icon well (`.bo-summary-icon`) | **`52×52`** · radius `50%` · bg `rgba(217,119,6,.12)` · border `1px solid rgba(217,119,6,.18)` · glyph `#D97706` · glyph size `22px` | bg `rgba(245,158,11,.16)` · border `rgba(245,158,11,.28)` · glyph `#FBBF24` |
| Label (`span`) | **`12px` / `800`** · `#57534E` · line-height `1.2` | `#D4D4D8` · same size/weight |
| Value (`strong`) | **`23px` / `900`** · `#18191C` · line-height `1.05` · margin `2px 0` · tabular-nums | `#F5F5F4` · same size/weight |
| Note (`.bo-summary-note`) | **`11px` / `600`** · `#71717A` · line-height `1.2` | `#A1A1AA` · same size/weight |
| Strip (`.quick-stats`) | `repeat(4, minmax(0,1fr))` · gap `14px` · **↔ table-card gap `16px`** · **≤1024 → 2 col** · **≤575 → 1 col** | same |

**Listing vertical rhythm (locked):** KPI strip → table panel = **`16px`** (flex `gap` on `.report-content`, strip `margin-bottom:0`). Filter strip inside `.table-card` = pad **`14px 16px`** + `1px` bottom hairline, then thead flush — same on User Management, Member Wallet, Deposit/Withdraw. Do not mix `12px` content gap with `16px` strip margin.

**Do not** set `gap: unset` after `column-gap` — the shorthand clears icon↔text spacing.

**Also applies to User Management** (`.user-metric` + `.metric-icon`, `index.html`) — same geometry/type/icon wash; label is `<small>` instead of `<span>`, note is `<span>` instead of `.bo-summary-note`. CSS: `bo-charcoal-legacy.css`.

CSS: `reports.css` (geometry + type) · `bo-wallet-transaction-amber.css` (amber icon + muted colors + 4-col Member Wallet strip) · `bo-charcoal-legacy.css` (User Management). Full table: `.interface-design/system.md` → Patterns → KPI summary card.

### Permission matrix (Roles & Permissions)

Light: open groups use cream/amber wash; cards `#FFF8EB` → deeper cream on hover/checked/current.  
Dark: cool charcoal only (`#383A46` / `#40424E` / `#2C2E38` / `#2A2C36`) — **no** full-panel amber wash; amber only on borders, icons, counts, checked/current tint.  
Reference CSS: `menu-permission-executive.css`. Full tables in `.interface-design/system.md` → Patterns → Permission matrix.

### Data tables (Admin — locked dark contrast)

**Transaction listing table** (`body.bo-wallet-tx`): peach-cream zebra light `#FFF8EB` / `#FFF1DC` · thead `#FFE8CC`; dark zebra `#3A3C48` / `#434653` · thead `#1F2128` (deeper than body) — **same zebra rhythm** · **no pure white** · square thead corners · cell `bold` · PENDING orange. Tokens `--bo-table-*` in `bo-wallet-transaction-amber.css`. Full table: `.interface-design/system.md` → Patterns → Data tables → Transaction listing table.

Dark panel border `rgba(255,255,255,.14)`; row line `.12`; header `#E7E5E4`; cell `#F5F5F4`; muted/time `#D4D4D8`.  
Never leave light cream borders unscoped, or use dark header `#71717A` / ultra-faint `.06` dividers.  
**Light muted on cream:** use `#57534E` (not `#9CA3AF` / `#A1A1AA` — too faint). Placeholders `#78716C`. Modal close cream well.  
**Footer pager:** light inactive slate `#F3F4F6`/`#9CA3AF`; dark inactive charcoal; **active** = amber 3D in both modes (dark label `#2A2C36`). Full table: `.interface-design/system.md` → Patterns → Data tables / Table footer pager.

### Create / Edit Admin — form hierarchy (locked)

Do **not** paint every surface the same cream. Use a **layer ladder** so the eye finds sections and the Save CTA:

| Layer | Light | Role |
|-------|-------|------|
| Canvas continuum | `#FFE8CC`→`#FFF8EB` | Atmosphere only |
| Section card (`.mac-section`) | lift `#FFFCF7` · border `#DCC9A8` · warm shadow · **3px amber left rail** | Primary content frame |
| Control well (inputs) | `#F5EBDC` · border `#DCC9A8` | Editable fields inset into card |
| Nested well (privileges / policy / security) | `#F0E4D0` | Subordinate grouping |
| Chip / tag / status active | `#FFFCF7` | Lifted controls |
| Locked / readonly | `#EDE4D4` · text `#57534E` | Non-editable |
| Ghost buttons | cream Export gradient `#FFFCF7`→`#F5EBDC`→`#EDE4D4` · border `#DCC9A8` | Secondary actions |
| Primary CTA | amber gradient | **Focal action** (Save / Create) |

Section head: bottom hairline `#EADCC8` + amber icon tile. Help `#57534E` · placeholder `#78716C`.  
Pages: `main-admin-create.html`, `main-admin-edit.html` (+ shared `.mac-*` CSS).  
Never cool `#fff` / `#FBFCFE` / `#F1F5F9` chrome. Full table: `.interface-design/system.md` → Patterns → Forms.

### Create Role (Role Name input — locked)

Light: Role Name + `.mp-search` / `#mrcFilter` + chips = surface `#FFF8EB` · border `#EADCC8` (not muddy well `#F5EBDC`). **Toggle All** = amber wash `rgba(217,119,6,.12)`.  
**Buttons (立体):** Back / Cancel = Ghost cream gradient `#FFFCF7`→`#F5EBDC`→`#EDE4D4` + lift shadow; **shared hover** = reverse cream `#FFF8EB`→`#F3E8D6` · border `#E0D0B8` · lift (no amber fill wash). Save Role = Primary amber 3D. Hover lift / active press.  
Dark: Ghost charcoal gradient; Primary amber with dark text `#2A2C36`. CSS: `main-admin-role-create.css`.

### Roles & Permissions filter (`.mp-search` / `#menuPermissionFilter` — locked)

**List page** (`menu-permission.html`): filter matches Role select — surface `#FFF8EB` · border `#EADCC8` · icon `#57534E` · placeholder `#78716C` (frame + input, incl. disabled). Height target **`36px`** when next touched (legacy CSS may still show `42px`). Input text `13.5px/500`.  
**Create Role** (`main-admin-role-create.html`): Role Name + filter both surface `#FFF8EB` (same family as list controls). Role Name `14px/600` · label `11.5px/800` uppercase.  
Always beat `reports.css` `#fff!important`. Dark: charcoal well `#2A2C36`. CSS: `menu-permission-executive.css` + `main-admin-role-create.css`.

### Role select dropdown (`.rounded-select-*` — locked)

Native `<select>` is hidden; `reports.js` builds `.rounded-select-wrap` / `-btn` / `-menu` / `-option`. Spec from Roles page CSS:

| Part | Light | Dark |
|------|-------|------|
| Trigger `.rounded-select-btn` | bg `#FFF8EB` · border `#EADCC8` · `40px` · `13.5px/600` · radius `8px` | bg `#2A2C36` · `--bo-border` |
| Open / focus | border `#D97706` · ring `0 0 0 3px rgba(217,119,6,.14)` | border amber · ring `rgba(245,158,11,.18)` |
| Menu panel | surface `#FFF8EB` · border `--bo-border` · radius `8px` · soft shadow · pad `6px` | surface `#383A46` · deep shadow |
| Option default | transparent · text `--bo-text` · weight `700` · radius `8px` | text secondary |
| Option hover | wash `--bo-cyan-tint` · text `--bo-cyan-deep` | `rgba(245,158,11,.14)` · text primary |
| Option active / selected | same as hover (light) | fill `#F59E0B` · text `#2A2C36` |
| Scrollbar (WebKit) | thumb `#98A2B3` → hover `#667085` · `4px` pill · **no** arrow buttons | thumb `#F59E0B` → `#D97706` |
| Label `.mp-role-label` | `11px/800` · tracking `.08em` · uppercase · `--bo-navy` | same weight · light text |

Do not paint options with cool blue/cyan. Attention shake (`.is-attention`) is motion-only when validation fails.

### Transaction listing family (`body.bo-wallet-tx`)

Sidebar **3. Transaction** pages use listing chrome: filter/select = surface `#FFF8EB` (not form well `#F5EBDC`); dark selected option = `#F59E0B` / `#2A2C36`; pager = mad-pager slate inactive + amber active; **date range popover** = cream panel `12px` · preset active wash `#FFF1DC`/`#B45309` (never solid CTA) · ghost month/year head · divider shadow into calendar; **table frame** = Admin Detail `.mad-panel` (viewport-locked · inner scroll · `table-layout:fixed` · radius `8px`); **table zebra** = light `#FFF8EB`/`#FFF1DC` · dark `#3A3C48`/`#434653` · head light `#FFE8CC` / dark `#1F2128` · **no pure white** · thead corners square · cell `bold` · PENDING orange / APPROVED green / REJECTED red.

**Topbar (locked — Deposit Approval specimen):** height `64px` · surface `#FFF8EB` · left = hamb + page icon + title (+ Approval lead line) · right = theme → Members/Deposit/Withdraw counters (non-`MAIN`) → User Name + amber avatar. See Topbar chrome above.

**Listing filter controls (locked — Wallet Ledger specimen):** height **`36px`** · radius **`8px`** · row gap **`10px`** · pad `0 12px` · date trigger ~`240px` · text inputs `140px` · Type `150px` · Reset/Search `width:auto` · **no** Page Size in the filter row (footer only) · flush strips: no hover `translateY`. Beat `bo-ui-standard` `--bo-filter-height:42px` / `11px` radius. Full table: `.interface-design/system.md` → Patterns → Listing filter controls.

**Deposit / Withdraw shell (locked):** bank selector above the panel = **one segmented strip on no rail** (34px skewed segments, house 6px radius, uniform width from the longest name, unselected on `--bo-control-well`, selected on `--bo-surface` with a 1px accent ring and an accent wedge pointing into the panel, pending count inline, `data-bo-ui-skip`, scrolls sideways with 4px side room) with a constant-height three-zone summary bar under it (Start / Deposit / Balance only — no account/period block and no explanation sentence; an impossible figure shows `n/a` with its reason in that slot's tooltip; 1px separators, no second fill, Balance the only accent, 8px radius; selecting a bank also narrows the table to it) · mad-pill tabs Deposit→Withdraw→All **left** + inline filters **right** inside `.table-card` (no Reset/Search/Page Size in the filter row) · filter boxes = listing **`36px`** · date `240` · keyword `140` · status `150` · gap `10` · Bank column = bold `Name (account)` · Member = username only · action chips `.bo-tx-action-btn` 26×26 / icon 15px (Approve/Reject/Ledger) · no Pending metrics strip · no Filtered Total bar · Withdraw Remark without `Admin:` sub-line. Selector styles `bo-bank-selector.css`, markup `bo-bank-selector.js`; balance contract `BANK_BALANCE_API.md` — a figure that is not known prints `-`, never a guess.

**Module navigation, not a sidebar submenu (locked):** a module whose pages are peers of one workspace lists them as page-level tabs under the page header, on the content container's left edge, and the sidebar keeps a single row that merely carries the module's active state — clicking it never opens a floating submenu over the content. Nine groups use this today — **Transaction** (`Deposit Approval · Win/Lose Adjustment · Bonus Adjustment · Bank Deposit Usage`), **Member** (`User Management · Member Wallet · Wallet Ledger · Referral Network`), **Promotion**, **VIP**, **Agent**, **Report**, **Game Management**, **Design** and **Setting**; `MODULE_TABS` in `auth.js` is the authoritative list of both the modules and the pages each row carries. **Membership carries two contracts** — a page listed there must link `assets/css/bo-module-tabs.css`, and every sidebar row of the group must be listed there — see *A module's pages must be registered and must load its row sheet* at the end of this file. Sections come from the admin's own assigned menus, so a section the role cannot open never appears, and one section alone renders no row. A database group counts as a module's group only when it holds at least two of that module's pages **and owns the module's anchor page** (`MODULE_ANCHORS` holds one anchor page per module) — without the anchor test a group that merely shares two files (a Wallet group holding Member Wallet + Wallet Ledger) would lose its own submenu to this feature. A section that is two pages (Bulk Adjustment) hands the page's own authored pair to the row instead of showing one entry. Styles `bo-module-tabs.css` (text-only tabs, active = dark text + 2px amber underline), logic in `auth.js` (`MODULE_TABS` / `MODULE_ANCHORS` / `renderModuleTabs`).


**Payment Method Config** (`payment-method.html`): same Transaction listing table/pager · Edit/Delete `.bo-tx-action-btn` wells · amber QR View link · form-well modal. **Bank Deposit Usage** twin: Active/Suspend/All pills · View QR + mad-pager · no Config link. **Bulk Adjustment / Bulk Bonus:** Manual split **60% / 40%** (Select Members · Configure) · panel pill scrollbars on member picker + selected table — light chocolate `#8B6B4A` / hover `#5C4A30` · dark `#F59E0B` / `#D97706` · **`6px`** · no arrows (not cool slate). **Wallet Ledger:** `bo-wallet-tx` · split **`.bo-tx-table-head` (fixed)** + **`.bo-tx-table-body`** (`#ledgerTableScroll` · only vertical scroller · panel pill chocolate · **`6px`**) · wrap `overflow:hidden` · type menu same pill · **specimen** for 36px filter geometry · **Created/Posted Time** = date `DD/MM/YYYY` in cell · cream pill tip `HH:MM:SS` · **no arrow** · footer **Show N entries** = same as Deposit (`-` · `10` · `20` · `50` · `100` · `All` · Role select chrome · `#ledgerSize` hidden). Full notes: `.interface-design/system.md` → Bulk / Wallet Ledger / Panel pill scrollbar / Listing filter controls / Date time tips.

**Responsive (1920→375):** ≤1456 DATE day-only + hover full time · ≤1280 bank cards = horizontal snap strip (never multi-row stack that starves the table) · toolbar tabs-then-filters · table body scrolls · mid/small hide Processed / Remark / Reference as needed · never page horizontal overflow. CSS: `bo-wallet-transaction-amber.css`. Full notes: `.interface-design/system.md` → Layout → Transaction family (+ Deposit/Withdraw chrome & responsive tables).

### Roles typography (quick scale)

| Element | Size / weight |
|---------|----------------|
| Create Role page title | `28px/800` · tracking `-0.03em` |
| Page subtitle / help | `13.5px/500` muted · help `12.5px` |
| Card title (`.mrc-card-head h3`) | `16px/800` |
| Field label (Role Name / ROLE…) | `11–11.5px/800` uppercase |
| Filter / Role select text | `13.5px` |
| Toolbar chips / Ghost / Primary | `12.5–13px/700–800` |
| Sticky footer status pill | `10.5px/800` uppercase |

### Merchant Detail — migrated 2026-09-15

The whole merchant family now runs Charcoal + Amber: `main-merchant-detail.html`, `-create`, `-settlement`, `-security`, `-profit`, `-profit-record`, `-repayments` (all `data-access-page="main_merchant_detail"`).
Page CSS: `assets/css/main-merchant-detail-executive.css` — **must load after `main-admin-detail-executive.css`**, because the legacy Deep Navy Cyan block in that file also matches this page and these rules win on equal specificity by source order.

Recipe used (reuse it for the remaining `main-merchant-*` pages):

- Scope: `body.main-admin-detail-page[data-access-page="main_merchant_detail"]` — mirrors how the Admin block scopes itself. It reaches the whole merchant family (detail, create, security, profit, profit-record, repayments, settlement) while leaving `main-merchant-roles.html` / `main-merchant-role-create.html` alone: they share the data attribute but load the Roles & Permissions stylesheets, not this file. Specificity is unchanged from the page-class form.
- The rescoped Charcoal block covers shared chrome (canvas, sidebar, topbar, tabs, filters, table, footer, pager, buttons, modals, tips). Admin create/edit-only rules are dropped; they cannot match this page.
- Components with no Admin Detail counterpart were hand-written: `.mad-status-chip` / `.mad-status-dot` (given the `.mad-status` pill treatment so both lists read alike), `.mad-merchant-icon-btn` + its tooltip, and the `.mac-currency-*` / `.mac-provider-*` chrome.
- The edit workspace (`#madEditWorkspace`) and the modals need their own block: their legacy rules are **ID-scoped**, so the class-scoped block cannot reach them, and the prefix carries `body.standardized-listing-page` to outbid the `button.mac-currency-add-btn` variants.
- `main-merchant-create.html` renders the same form vocabulary but **outside** `#madEditWorkspace`, so the ID-scoped block misses it entirely — that is why a separate `.mac-section`-scoped layer exists. It also needs the create/edit **layer ladder**, which the initial rescope dropped (those rules are scoped to `.main-admin-create-page` and could not match Merchant Detail). `main-merchant-repayments.html` carries the same class and shares it.
- **Expect a specificity fight.** The legacy file pins several merchant controls with long selectors — `... .report-content .mac-field .mac-input-group.is-prefix > input:not([type="checkbox"]):not([type="radio"]):not([type="file"])` is ten class-levels. Plain `.mac-section .form-control` loses to it. Where a control is a unique ID, two IDs in the selector settle it outright (see the `#madProviderMarkup` / `#madCurrencyModalCode` rules). Do not "simplify" those selectors without re-measuring.
- **Date-range selection UX (`main-merchant-report.js` + this family's stylesheet).** A range must read as ONE strip: without `gap:0` on `.ref-cal-days` a range is a row of unrelated chips. Edges are solid amber with only the outer corners rounded, so the band flows out of them; the middle is a flat wash. After the first click the anchor is marked immediately and hovering previews the whole span (`is-start` / `is-end` / `is-preview`).
  Two traps found while building it:
  - An earlier block in this file sets `background:transparent!important` on every day cell at (0,4,3). It silently killed the amber fill of the selected edges. Restating a fill needs a prefix at (0,6,3) or higher — see the stacked body classes in the "make the range read as ONE strip" block.
  - `renderCalendar()` replaces the day grid's innerHTML, so a click on a day reaches `document` with a **detached** target. The outside-click handler then read that as a click outside the picker and closed it — the second click of a range was impossible. Calendar clicks now call `stopPropagation()`.
- The shared **date-range picker** is already styled for amber in `main-dashboard-executive.css` (19 rules). Rescope them instead of re-deriving: `.main-dashboard-page` → the merchant family and `.main-exec-date-field` → `.ref-date-field` (both pages carry the latter), so one set serves the Dashboard and the merchant reports. Base (unselected) calendar cells come from `reports.css` as `#F7F9FC` / white and need their own rules — the Dashboard only restyled the selected states.
- **There are THREE picker implementations, not one.** `main-merchant-report.js` (`data-report-day` — settlement/balance/transactions/main_merchant_report), `main-merchant-security.js` (`data-mas-day`) and `main-merchant-profit.js` (`data-mpr-day`) each carry their own `renderCalendar`, hover wiring and click branches. The strip/after-first-click UX landed in the report picker first; the other two were ported on 2026-09-15 so all three now emit the same class contract (`in-range` / `selected` / `is-start` / `is-end` / `is-preview`). Keep that contract identical — one stylesheet styles all three, and a picker that emits only `in-range selected` renders as two rounded pills with a flat connector instead of one strip.
- **Editing a shared `.js`/`.css` without bumping its `?v=` makes the fix look broken.** The browser keys the HTTP cache on the full URL, so a page (or preview harness) pinning the old version keeps executing the previous file — a verification run then reports "no requests / no change" while the server is serving the new code. Bump `?v=` in every referencing page in the same pass; the merchant stylesheet references were unified to `1.4.2` across 14 pages for this reason.
- `main-merchant-balance.html`, `main-merchant-transactions.html` and `main_merchant_report.html` are **migrated as of 2026-09-15** through the Report family block below, not through this file — they load `main-merchant-report-executive.css` for their `.mmr-*` / `.settlement-*` deltas, and their picker shares the report family's scope.
- Page-scoped legacy files (`main-merchant-profit.css`, `main-merchant-profit-record.css`, `main-merchant-repayments.css`) carry their own navy token blocks (`--mpr-*`, `--mprr-*`, `--mprd-*`, `#FFFFFF` surfaces, `#F5F8FB` canvases). Those pages are in the family by `data-access-page`, so the shared block covers their shell and the token layer flips most of their content; only hard-coded leftovers inside the page-scoped classes needed extra rules.
- **Re-pointing the `--mprr-*` tokens is not the same as migrating the page (found 2026-09-21, Record Profit).** The Record Profit block re-pointed the tokens, which fixed everything that *reads* one — but `.mprr-card` reads `--mprr-surface`, so the form's section card landed on `#FFF8EB`, the exact fill of every control inside it. Card and fields painted the same cream: the panel stopped lifting, the fields stopped reading as inset wells, and the card lost its amber left rail. A two-way diff of the *rendered* colour sets could not see this — every value it produced was already on a sibling page — because the bug was **which** colour was applied where, not an off-palette hex. Diff computed styles per *element role*, not the palette as a whole. The fix copies `.mac-section` on `main-merchant-create.html` (#FFFCF7 · `#DCC9A8` · 8px · `0 10px 28px rgba(120,80,20,.10)` · 3px `#F59E0B`→`#D97706` rail inset 12px). Two things to keep: the rail is **light-only** (the reference card is a light-mode ladder; dark already lifts `#383A46` over `#2A2C36` wells), and the reference's `overflow:hidden` is **not** copied — this card holds house custom selects whose 280px menu panel would be clipped by the card bounds (`.report-main` already clips with `overflow:hidden`; do not add a second one).
- Field micro-labels (11.5px/800 uppercase) take `color:var(--bo-muted)` — `#71717A` light / `#A1A1AA` dark — per `main-admin-role-create.css`. `--mprr-muted` (`#57534E`) is the muted-on-cream value for footer/draft/icon text (DESIGN.md → Muted), not for field labels; re-point the label *classes*, not the token, or the footer greys go with them.
- Beware a mechanical rescope: swapping only `.main-dashboard-page` in a selector like `body.main-dashboard-page …` leaves a stray `body` and produces the invalid `bodybody…`, which silently makes every rule in that group inert. Grep for `bodybody` after any scripted rescope.
- `main-merchant-settlement.html` is in the family by `data-access-page` even though its sidebar key is a report key, so it inherits the whole block by linking the file. Its `.mre-*` report chrome lives in `main-merchant-report-executive.css`.
- The modal scrims (`.modal-clean.mad-modal`, `.sidebar-overlay`) keep a dark translucent `rgba(15,23,42,.55)` in both themes. That is a backdrop, not chrome, and reads as neutral — leave it.

**Modal mount point and action-row states (2026-09-16, user-reported on Merchant Detail).** Two
defects, both invisible to a colour sweep and to a static read of the stylesheet.

- **A modal must be a child of `<body>`, not of `main`.** `main.report-main` carries
  `position:relative; z-index:1`, so it is a **stacking context at z-index 1**. A modal nested
  inside it can raise its own `z-index` to `30000` and still paint *below* the sidebar
  (`z-index:1040`, or `1000` once the `:has(.mad-modal.show)` rule lowers it) — the sidebar sat
  fully lit over the scrim while the topbar and content were correctly dimmed. Measured on the
  user's screenshot: the sidebar sampled exactly `#FFE8CC` (undimmed) while the topbar sampled
  `#FFF8EB` under `rgba(15,23,42,.55)`. Fixed by moving the three modals in
  `main-merchant-detail.html` out of `</main>`/`.report-shell` to body level — which is where
  the reference page `main-admin-detail.html` already puts them. No CSS or JS depended on the
  old nesting (every reference is `getElementById`).
  **Still unfixed on two pages:** `main-admin-security.html` and `main-merchant-security.html`
  mount their `masDetailModal` inside `main` and have the same symptom.
- **An ID-level default rule silences every class-level `:hover`.** The credit modal's Cancel
  carried a resting-state rule at two IDs
  (`html:not([data-bo-theme="dark"]) body #madCreditModal #madCreditForm .mad-btn-ghost`), which
  out-ranks *any* `:hover` at class level — so Cancel had no hover feedback at all in light and
  only a text-colour change in dark. The hover/active steps now carry the same two IDs. This is
  DESIGN.md's own "ID level" trap (see trap 3 in the opt-in layers) surfacing inside a family
  file: when a control is pinned by an ID, its state changes belong at the same level.
- **The credit/reclaim action row is contested across two files.** `main-admin-detail-executive.css`
  still holds a navy-era block for `.mac-adjust-panel .mad-modal-actions .mad-btn-*` at (0,5,1)
  `!important` — including `background:#0E2F52` on the primary's **hover** and a literal cyan
  `rgba(33,166,215,.45)` on the ghost's. The family's amber rules for the same buttons sit at
  (0,4,1), so they won every state *except* hover: Confirm Top Up rendered correct amber at rest
  and turned navy `#0E2F52` on hover (the user's screenshot was the hover state). The locked
  states are now stated in `main-merchant-detail-executive.css` at (0,5,1) / (0,6,1) so they win
  on specificity rather than load order. Verified by hovering with a real mouse move and reading
  `getComputedStyle`, both themes — `getComputedStyle` without a hover cannot see this class of
  defect, and neither can a search for cool hues (the resting state is correct).
  **Outstanding on the admin page:** `main-admin-detail.html`'s own Adjust Credit modal
  (`macAdjustModal`) still measures hover `#0E2F52` — the same legacy block, same cause.

**Record Amount currency group — settlement (2026-09-16, user-reported).** The `.msr-amount-group`
control in `main-merchant-settlement.html` was the last navy-era `.msr-*` component on a migrated
page. Measured resting state on the live site: shell `#FFFFFF` (pure white) on a cool-grey
`#D0D5DD` border, the MYR segment on the **canvas** cream `#FFF1DC`, the inner input on the control
well — three unrelated surfaces in one 42px control, with a white hairline visible between them
because the inner halves render 40px inside a 42px shell. Its focus ring was a **literal cyan**
(`box-shadow:0 0 0 3px rgba(33,166,215,.12)`, `border-color:var(--bo-cyan,#21A6D7)`).

- **This one is a copy-paste miss, not a new derivation.** `main-provider-credentials-executive.css:607-682`
  already carried the correct retint for the *same* Record Amount dialog (Provider Credentials has
  the same control), values and all. Settlement was simply never given its copy. The fix in
  `main-merchant-detail-executive.css` copies those values rather than re-deriving them — when a
  component exists on two pages, read the one that is already right.
- **Where the fix goes matters.** The `.msr-*` rules live in `main-merchant-report-executive.css`,
  which is shared with `main_merchant_report` / `main-merchant-balance` /
  `main-merchant-transactions` / `main-provider-credentials` — retinting it in place would repaint
  four pages outside this page. The override therefore sits in the merchant family file, scoped
  `body.main-admin-detail-page[data-access-page="main_merchant_detail"]`, which is the only
  `.msr-amount-group` page carrying that attribute value. The selectors carry `.msr-payment-fields`
  as well, because the rule being beaten
  (`.msr-payment-fields .msr-amount-group.mac-input-group`) sits at (0,4,1) and the plain
  `.msr-amount-group` form only reaches (0,3,1).
- **A pinned control width and a narrower column.** `reports.css` pins the shared date trigger to
  `260px`; `.msr-payment-row` gave the date column `232px`, so the trigger overhung its own column
  by 28px **into the amount field** — which is what made the two fields read as colliding. 260px is
  this page's documented control width, so the column was widened to the trigger, not the reverse.
- **Native number steppers** sat under the right-aligned value. The family already hides them on
  merchant amount inputs (`main-admin-detail-executive.css:6881`), so the same rule was extended
  here rather than inventing a spacing fix.

Verified: computed colour of shell / addon / input / divider / placeholder in both themes, plus the
focus state (amber `#D97706` + `rgba(217,119,6,.12)`, divider following to amber) and a cool-hue
sweep over the whole dialog — **0 hits in both themes**, and the two controls measure the same
height with the date trigger flush inside its column.
Note the **date field stays on its own locked recipe** (`#FFF8EB` / `#EADCC8`) while the amount sits
on the control well (`#F5EBDC` / `#F0E4D0`): that difference is the documented date-picker trigger
recipe, not a miss — the same page's Remark textarea is on the well, so the amount group now agrees
with the field it belongs to.

**Repayments-due counter clipped by the button it sits on (2026-09-16, user-reported on Merchant
Profit).** `#mprRepayBadge` — the red count on the topbar repay link — rendered as a red **wedge**
at the button's corner with a half-cut digit. The badge's own box was correct the whole time
(17px pill, `place-items:center`, digit centred to 0.05px); what was wrong was that
`main-merchant-detail-executive.css` puts `overflow:hidden!important` on every `.bo-theme-btn`
(locked toggle chrome, there to keep the toggle's icon inside the rounded square), and the repay
link reuses that class for its geometry. A corner badge overhangs by design, so it was clipped to
the part inside the button.

- **The tell is that the visible red is not the badge box.** Measured on the user's screenshot the
  "1" sat ~2px up-and-right of the red shape's centre — which reads as a centring bug and is not
  one. Before "fixing" an off-centre badge digit, compare the digit against the badge's *box*, not
  against the painted region: a clipped badge and an off-centre digit look identical in a
  screenshot.
- Fixed with an exception beside the clipper
  (`… .bo-theme-btn:not`-style scoping is not enough here — the badge button needs the geometry and
  only the clip removed, so it is a follow-up rule at `.bo-theme-btn.mpr-repay-btn`, (0,4,1)
  against the base's (0,3,1), so load order cannot decide it). The theme toggle keeps
  `overflow:hidden` — verified after the change.
- The badge's own sizing was also made font-independent: `line-height:14px` inside an 18px box let
  the digit's vertical position follow the font's ascent/descent (it drifted up to 2px at some
  zoom levels). `line-height:1` + the grid centring pins it — measured `dy` 0.05px for `1`, `12`
  and `99+`. Size is now `17px` at `top/right:-7px` (so it sits on the corner rather than over the
  glyph), digit `10.5px/800` — the locked scale's smallest size, matching the status pill.
- Verified both themes: badge renders whole, ring is `#FFF8EB` light / `#383A46` dark, overhang
  6.2px, 5.8px of clear space to the theme toggle, still inside the topbar.
- **Not changed, and worth a decision later:** the repay link is visually a twin of the theme
  toggle (same 36×36 cream rounded square, same 18px icon) and it sits in a topbar that already
  reads as a row of similar rounded squares, so the red counter is the only thing marking it as an
  alert. Giving the button itself an alert tone when a count exists (the documented danger recipe,
  `#FEF3F2` / `rgba(239,51,64,.35)` / `#B42318`) would make it read without the badge, but that
  touches the locked topbar cluster and was left for the owner to call.

**The Action column clips on a laptop — `min-width` is inert under `table-layout:fixed` (2026-09-16,
user-reported on Merchant Profit).** On a 1551px window (the user's laptop: a 1939px screenshot is
1.25× DPR, so the CSS viewport is 1939/1.25) the ledger's last column cut the edit/delete buttons
off at the panel edge.

- **The cause is a declaration that never applied.** `main-merchant-profit.css` protected the column
  with `width:6%; min-width:88px` — but every listing table in this system is
  `table-layout:fixed` (locked: DESIGN.md → Data tables), and in fixed layout a cell's `min-width`
  is **ignored entirely**: the column takes `6%` of the table and shrinks with everything else.
  Measured content box for the action cell: 55px at 1551, 39px at 1280, 31px at 1152 — against a
  68px requirement (two 40px icon buttons), clipped by the panel's `overflow:hidden`. The panel's
  vertical-scroll frame is untouched, so there was nothing to scroll: it simply cut.
- **The fix is a px `width`, not a percentage and not `min-width`.** In fixed layout a px width IS
  honoured, and the percentage columns absorb the difference. `width:88px` (the value the old
  `min-width` always meant) holds the column at exactly 88px from 1551 down to 1152 — content box
  70px against 68px needed, 9px right gap, no clipping, no horizontal scrollbar. A percentage
  cannot do this job: the column needs ~7.1% at a 1551 window but ~10.1% at 1152, so any single
  percentage either wastes space or clips at the narrow end.
  **Rule: a column that carries fixed-width controls needs a px width and `table-layout:fixed` is
  what makes that safe. Do not "protect" such a column with `min-width` — under fixed layout it is
  silently inert, which is worse than no protection because it reads as handled.**
- Verified 1918 / 1551 / 1440 / 1366 / 1280 / 1152: column 88px (95 at 1918), content fits with a
  9px gap, the `Action` header is not clipped, and the wrap gains no horizontal scroll.

**Modal mount point — the rest of the pages (2026-09-16, third report of the same defect).** The
user hit this class three times (`main-merchant-detail`, then `menu-management`), so the whole repo
was swept instead of waiting for the next report. **Nine pages still mounted modals inside
`main.report-main`** and were moved to body level:

`admin-user`, `compliance-policy`, `menu-management`, `payment-gateway`, `payment-method`, `role`,
`social`, `main-admin-security`, `main-merchant-security`

(sweep: any page whose first `.modal-clean` container sits before `</main>`). The move is the same
one recorded above — cut the modal block out of `</main>`/`.report-shell` and paste it after the
shell's closing `</div>` — and every page was then checked in the browser: modal's parent is `BODY`
and `document.elementFromPoint()` at the sidebar's centre returns the scrim, not `report-nav`.

**Two traps in doing it mechanically — both cost a pass:**

- **A modal container's opening tag can share a line with its own panel**, e.g.
  `admin-user.html` had `<div class="modal-clean admin-create-modal" id="adminCreateModal"><div class="modal-clean-panel …">`.
  A line filter that excludes lines containing `panel` (to skip `-panel`/`-close`/`-body`
  sub-elements) therefore **skips that container entirely** — the sweep reported one modal on
  `admin-user` and missed the other. The browser check caught it (`adminCreateModal` still
  `parent: MAIN`). **Do not identify modal containers by a text filter on one line; count
  `.modal-clean` elements in the DOM** (and filter sub-elements by class, not by substring).
- **A slice that re-includes the line you already emitted duplicates the closing tags.** The first
  attempt at `admin-user` produced two `</main>` and 79/80 divs. Always assert **equal `<div` and
  `</div` counts inside the moved block *and* across the whole file** after the write — the
  in-block balance alone was true both times, and only the file-level count revealed the
  double-emit. `git checkout -- <page>` restored it and the second attempt passed.

Method that worked, per page: locate the first container and the last non-blank line before
`</main>`; assert in-block div balance; assert the shell's closing `</div>` follows `</main>`;
rewrite as `head + [</main>, </div>] + note + block + tail`; then re-assert whole-file tag balance.
Two pages needed their closing tags handled by hand because `</main>` and the shell `</div>` sat on
**one line** (`payment-gateway.html`: `</main></div>`), which also defeats a `line == '</main>'`
test — match with `in`, not `==`.

**Row avatar (2026-09-15 — merchant AND admin, unified).** The tile is a neutral index marker, not a colour-coded one: light `#F5EBDC` / `#6b360c`, dark `#2A2C36` / `#E7E5E4`. The every-third-row tint is **deleted** — it encoded row position, not data, and a colour that means nothing teaches the eye to ignore the ones that do (the Status pill, the money columns). Colour survives on exactly one avatar variant: a **suspended** row (`#FEE2E2` / `#B91C1C` light, `rgba(239,68,68,.14)` / `#FCA5A5` dark), which agrees with the Status pill instead of contradicting it. Initials come from the company **name** (`avatarInitials()` in `main-merchant-detail.js`), not the code — the code is already printed beside the tile, so repeating it made a 40×40 saturated block carry no information.

**Row Role / Status pills (2026-09-28 — soft fluorescent, owner locked).** Brand Owner lilac `#F0ECFA`/`#6B5B95` and Active mint `#EAF7F0`/`#1A8A5C` (dot `#3CB87A`) — luminous enough to read as fluorescent chips on cream zebra, calm enough not to glare. Do not revert to neon `#EDE9FE`/`#5B21B6` or `#D1FAE5`/`#10B981`, and do not darken to dusty sage/plum. Same values on `.mad-status-chip`, Security `.mas-status.is-success`, and Providers `.mpv-status.is-active` / family `.mad-status`. See Colors → Row status / role pills.
**Unified across both families.** The same treatment is applied to the Admin list (`main-admin-detail.html`) in `main-admin-detail-executive.css`, where one thing differs: `.is-self` is **kept amber** because on that page it means "this is your own account" — that is real information, so the neutral rule is written `:not(.is-self)` and the amber tile survives. Its previous every-third-row sky tint is deleted there too, which also removes the light-only-rule leak into dark mode recorded above.

A different component, and already consistent: **`.mas-avatar`** on the Security & Audit pages reads `--bo-cyan-tint` / `--bo-cyan-deep` in light and `rgba(245,158,11,.16)` / `#FBBF24` in dark, so it sits on the amber palette. The `.is-alt` class its JS still applies on every other row is **already neutralised** — a later override block gives `.mas-avatar` and `.mas-avatar.is-alt` the same wash, so it does not encode row position. Its shape is `12px`, not the legacy `50%` circle; a later block sets the radius. The only difference left from the list tile is that it carries a wash at all, which is one quiet tint rather than an encoding, so it is defensible as-is. Decide separately if it should go fully neutral.

### Report family — migrated 2026-09-15

The five Report pages now run Charcoal + Amber: `main-win-lose-report.html`, `main_provider_report.html`, `main_merchant_report.html`, `main-merchant-balance.html`, `main-merchant-transactions.html`.

Page CSS, both loaded **last** (after `bo-account-chip.css`):

| File | Covers |
|------|--------|
| `assets/css/main-report-charcoal.css` | Tokens, canvas continuum, sidebar/topbar, tabs, filter bar, scope bar, currency segment, table, footer, pager, buttons, modals, tips, date-range picker, and the `.mre-*` shell |
| `assets/css/main-report-charcoal-content.css` | In-panel content: `.mmr-*` merchant cell, `.wl-*` win-lose rows, `.settlement-*` ledger + form, KPI strips, panel wrappers, the two provider-report modals |

**No report tab strip on the two pages — 2026-09-15.** `main-win-lose-report.html` and `main_provider_report.html` no longer carry `.mad-tabs.mre-tabs`: the strip's only job was cross-linking the two, and `permission-tabs.js` (`el.hidden = !ok` from the role's menus) already reduced it to a single tab for a role that has one of the two pages but not the other — a lone label for the page you are already on. `main_merchant_report.html` keeps its two links, so the pair is still reachable from the Report family's own chrome and from the sidebar. Where a strip does remain, it now collapses when every tab is hidden (`:has()` guard in the shell file), instead of holding a 47px row.

**The date control sits in the filter row — 2026-09-15.** Moved out of `.mre-scope-bar` and into `.mad-filters` as its **first** child, before the search frame, on both pages (a pure move: every `#…From` / `#…Trigger` / `#…CalDays` id stays unique, so `getElementById` and both pickers' wiring are untouched). The scope bar is left carrying `CURRENCY` only. Two consequences worth keeping:

- The shared control is pinned to a fixed `260px` (`reports.css` sizes `.ref-range-wrap` **and** `.ref-range-trigger`, and the legacy shell sizes them again) while the wrapper around it may shrink — so the trigger used to overhang its own column and paint **over** the search frame once the row ran out of width. Measured `overlapSearch: true` at 1440 and 1280 CSS px, which is what a ~1900px window shows at Windows 125% scaling.
- **The five controls and the status pills share one line, by policy** (a folded control row was read as a broken layout, and so was a pills-only line). The bar is `flex-wrap:nowrap`, so the row *tightens* instead of folding — measured one line at every width from **1400 to 1932**, with no overlap, no overflow and no clipped date label. Wrap returns below 1400 (`@media (max-width:1399.98px)`), where the five controls can no longer fit: they then keep their own row together, pills above. Do not "fix" a wrap threshold by tuning numbers — folding is decided on the items' *hypothetical* (basis) sizes, so a threshold tuned against one window is a guess about that window only; nowrap plus shrinkable items is what makes the behaviour width-independent.
  Where the width comes from: the **search box is the shock absorber** (basis `100px`, floor `96px`, capped `168px` — it ellipsises its own placeholder), the **date control keeps `236px`** so its fixed-format label never clips, the **pills give up breathing room but not content** (track gap `4px`, pill padding `0 10px`), and the two filter selects sit at their natural `160px`.
  Two pins in the old stack have to be beaten deliberately, both found the hard way:
  - `.mre-search` is pinned by `main-provider-report-executive.css` at `flex:0 1 280px!important; min-width:180px!important` — a stylesheet `!important` with **no** `!important` on our side leaves the search on a 280px basis, which folds the row ~180px earlier than it needs to.
  - `.rounded-select-wrap` **cannot be narrowed from CSS at all**: `reports.js` writes `width / min-width / max-width / flex:0 0 160px !important` **inline** on the wrapper it builds, and inline important outranks any stylesheet important. Any further tightening has to come from the search, the date control, the pills, or `reports.js` itself.
- Anything that styles the date field by its old position (`.mre-scope-bar .ref-date-field`) no longer applies; the rules that matter are keyed on `.mre-period-group` and `.mre-date-field`, which travel with the markup.

- **Scope: one `:is()` list, not five selector copies.** `body.main-admin-detail-page:is([data-access-page="main_report"], …)` — the five `data-access-page` values. It carries one class-level more than either legacy scope (`body.main-report-exec-page`, `body.main-admin-detail-page`), so it wins on specificity; load order is belt and braces. The shell file was produced by **mechanically rescoping `main-merchant-detail-executive.css`** (`[data-access-page="main_merchant_detail"]` → that `:is()` list), which is why it is a 4 973-line file whose foreign-page sections are inert but present: a rescope that can be diffed 1:1 against its source is worth more than a pruned one.
- **Neither legacy shell file is edited.** `main-provider-report-executive.css` and `main-merchant-report-executive.css` are also loaded by `main-merchant-settlement.html` and `main-provider-credentials.html`, which carry `main-merchant-report-page`; retinting either in place would repaint pages outside this migration.
- **Three defects of long standing, fixed by the retint** (all five pages): `.mre-table tfoot` was pinned `display:none!important`, so the total row both loaders un-hide never rendered; every `.mad-page-size-select` inside a `.mad-footer` was hidden, so "Show N / page" had an invisible control the JS still bound; and `.value-positive` / `.value-negative` sit on the `<td>`, so the rescoped `.mad-table td{color:…!important}` out-ranked them and the pos/neg money columns rendered as plain text in **both** themes.
- **Dark mode needs `!important` parity, not just specificity.** `main-provider-report-executive.css` pins the date trigger's hover/focus ring to a literal `rgba(33,166,215,.18)` shadow at (0,4,2) `!important`; the cyan survives a token remap because it is not a `var()`. The counterpart in this family's file matches at (0,6,2) `!important`. Same shape for the calendar's `.in-range` / `:hover` washes and the preset rail. `bo-ui-standard.css` carries the same literal for `.ref-range-trigger:hover/:focus` at (0,1,1) `!important`.
- **`.value-positive` / `.value-negative` stay green/red.** That pair is this family's own semantic convention (the provider/brand tables' GGR and margin columns), and the token layer repaints it to the locked `--bo-success` / `--bo-danger`. The amber "money positive" row in the components table governs `.mad-money` and the Win/Lose column (`.mmr-wl.is-pos`), which is where a win/lose figure is read as money rather than as a signed result.
- **The Win/Lose picker differs by design.** `main-win-lose-report.html` runs the shared `main-exec-date-range.js`, which emits only `in-range` / `selected` (no `is-start` / `is-end` / `is-preview`), so it gets the flat amber band with rounded selected edges — not the one-strip treatment. That module is shared with four pages outside this family, so porting the class contract belongs to its own decision.
- **Known leftovers, deliberately not touched.** `main-win-lose-report.html` still links `main-merchant-report-executive.css`, whose scope (`body.main-merchant-report-page`) can never match it — a dead `<link>`, left in place rather than silently deleted. The provider report's settlement / brand / history panels have **no `[data-report-tab]` element in the markup**, so `setupTabs()` never runs and those three panels are unreachable through the UI (pre-existing; the panels and their CSS are correct, they simply have no switcher). The pill thumb ships `border-radius:999px` — inherited from the migrated merchant family, and it disagrees with the `8px` recorded in the components table; the family's value was kept for consistency between the two.


Traps found while migrating:

- `reports.css` `.report-content input{background-color:#fff!important}` paints any workspace field the page CSS does not explicitly cover pure white. Light chrome is cream only — cover inputs with the control well `#F5EBDC`, locked `#EDE4D4`.
- The shared light rule `.mad-table tbody tr:nth-child(3n) .mad-avatar` is *not* light-scoped, so it outbids the charcoal dark `.mad-avatar` rule and drops a near-white `#E0F2FE` chip onto the dark canvas on every third row. **Admin Detail still has this defect.**
- Topbar counters (`.bo-header-counter`, `reports-dashboard-original.css`) are hard-coded `#fff` and stay white in dark. They only render for non-`MAIN` roles, so they are invisible on a Main Account login.

## Typography

System UI stack. Hierarchy via weight + color. Sidebar L1 = `800`. Tabular nums for money/time; mono for credit/time cells and topbar role.

### Date-range picker (one component — reference: `main-merchant-profit.html`)

**Reference page: `main-merchant-profit.html`.** Open its picker and measure it; the tables below are what it computes, element by element, in both themes. Report pages and the Dashboard are already on these values — `main-report-charcoal.css` (report family) and `main-dashboard-executive.css` (Dashboard) carry them for their scopes. **Change one, change the other**, then re-measure all three pages: `main-merchant-profit.html`, `main-dashboard.html`, a report page (`main-win-lose-report.html` is the quickest).

Markup: `.ref-date-field > .ref-range-wrap > .ref-range-trigger` + `.ref-range-picker` (rail, calendar head, `.ref-cal-week`, `.ref-cal-days`, month/year grids). Any page that already uses these classes only needs the CSS below and the pin bump.

| Part | Light | Dark |
|------|-------|------|
| Field (`.ref-date-field`) | width is **per page** (see below) | — |
| Trigger `.ref-range-trigger` | bg `--bo-surface` `#FFF8EB` · border 1px `--bo-border` `#EADCC8` · radius `8–10px` · text `--bo-text` `#18191C` · `13px/700` · **listing h `36px`** (Wallet Ledger / `bo-wallet-tx`; MAIN executive may still measure `42px` until migrated) | bg `#2A2C36` · border `rgba(255,255,255,.12)` · text `--bo-text` `#F5F5F4` |
| Panel `.ref-range-picker` | bg `--bo-surface` `#FFF8EB` · border `--bo-border` `#EADCC8` · radius `12px` · **`box-shadow: 0 12px 30px rgba(60,48,32,.14)`** | bg `#383A46` · border `rgba(255,255,255,.14)` · radius `12px` · **`box-shadow: 0 16px 38px rgba(0,0,0,.4)`** |
| Calendar well `.ref-range-calendar` | transparent (the panel shows through) | bg `--bo-surface` `#383A46` (opaque) |
| Rail `.ref-range-presets` | bg `--bo-surface` · border `--bo-border` · width `112px` · pad `8px 0` · **same `box-shadow` as the panel** | bg `#383A46` · border `rgba(255,255,255,.14)` · same shadow as the panel |
| Rail item | transparent · text `#374151` · `12px/900` · pad `9px 12px` | text `#E7E5E4` |
| Rail item **active** | **solid** `#D97706` · label white | **solid** `#F59E0B` · label **white** |
| Head buttons (`.ref-cal-head button`, `.ref-head-pick`) | transparent · text `#374151` · the reference box carries a 1px transparent border | transparent · text `#E7E5E4` |
| Month / year grid item **active** | **plain** — transparent · text `#374151` | `#F59E0B` · label white |
| Week row `.ref-cal-week span` | `#71717A` · `11px/900` | `#A1A1AA` |
| Day cell | transparent · `#374151` · `12px/800` | transparent · `#E7E5E4` |
| Day cell, other month (`.muted`) | transparent · `#57534E` | `#A1A1AA` |
| Day cell hover | wash `rgba(217,119,6,.16)` · text `#B45309` | wash `rgba(245,158,11,.16)` · text white |
| In-range day (`.in-range`) | wash `rgba(217,119,6,.14)` · text `#B45309` | wash `rgba(245,158,11,.18)` · text `#FBBF24` |
| Range edge (`.selected`) | `#D97706` · label white · radius `8px` | `#F59E0B` · label `#2A2C36` · radius `8px` |
| Day grid `.ref-cal-days` | **`gap:0`** — cells touch, so the band is continuous | same |

**Per page, NOT part of the design** — do not "unify" these: the **control width** (settlement `260px`, report pages `236px` in a five-control filter row, Dashboard its own), the **preset list** (the Dashboard also offers `Last 7 Days`, and the rail is simply taller for it), and therefore the panel/rail **height**.

#### The band must read as ONE strip — which rules apply depends on the script

- Emits `is-start` / `is-end` / `is-preview`: `main-merchant-report.js`, `main-merchant-profit.js`, `main-merchant-security.js`, `main-provider-settlement-ledger.js`. Strip rules keyed on those classes apply directly.
- Emits only `in-range` / `selected`: `main-exec-date-range.js` (Win/Lose report, transaction history, accounting due, settlement report) and `main-dashboard.js` (Dashboard). The same strip is built without the edge classes: `.selected.in-range:not(.is-start):not(.is-end)` with `:is(:first-child,:not(.in-range)+*)` for the left outer corner and `:is(:last-child,:has(+ button:not(.in-range)))` for the right, plus the both-cases rule for a single-day range. **Without those three rules a range renders as two rounded pills joined by a flat connector.**

#### Traps that cost a pass each

1. **Some values are inherited, not the family rule's.** In dark the active preset label is **white** on the reference, but the family rule says `#2A2C36` — a page-level rule with *higher specificity* wins there. Reading the family stylesheet alone gives the wrong answer; always read `getComputedStyle` on the reference page.
2. **`!important` parity is not enough — check the weight too.** `main-dashboard-executive.css` pins `.ref-cal-head button{border:0!important}` at (0,2,2); matching the reference's transparent border needs `border:1px solid transparent!important` **and** a selector that out-ranks it (`.ref-cal-head button.ref-head-pick`).
3. **`reports.css` pins the bases**: the panel is `#fff`, the rail `#f8fafc`, the day cells `#fff` / `#F7F9FC`, hover `#eef3ff`, muted `#cbd5e1`, and the field/trigger widths at `390 / 292 / 195px` across media queries. Everything that must survive it carries `!important`, and light-only rules use the `html:not([data-bo-theme="dark"])` prefix (a shorter selector loses to those pins).
4. **The day grid needs `gap:0`**; the base sets `3px` and the band then breaks up into chips. The cell width follows from it, which is why the grid is a reliable tell in a screenshot.
5. **Audits: compare a border colour only where the border has width.** Cells with `border:0` still report a colour (the text colour), and a reference box may carry a transparent border — both produce phantom differences. Same for the panel/rail height, which depends on the preset count.
6. **A shared `.js`/`.css` edit needs its `?v=` bumped in every referencing page in the same pass** — several passes here were verified against a cached stylesheet and reported "no change".

#### Recipe for a page you have not touched

1. Look at the picker's driver (see the two contracts above) and note the field/`.ref-range-wrap` width policy for that page's row.
2. Link `main-report-charcoal.css` (or add the values to that page's own family file, like the Dashboard does) **after** every legacy sheet, then the panel/rail/day/hover/in-range/edge/shadow rules listed above, mode-split with `html:not([data-bo-theme="dark"])` / `html[data-bo-theme="dark"]`, `!important` on anything `reports.css` or a legacy block also sets.
3. Add the range-edge rules for the class contract that page's script emits, including `gap:0` on `.ref-cal-days`.
4. Bump the pin in that page.
5. Verify by measuring the reference and the new page side by side, both themes, on: trigger, panel, calendar well, rail, rail item + active, head buttons, week row, muted day, in-range day, edge day, month active, day-grid `gap`, panel/rail `box-shadow`. Ignore the per-page quantities from the list above. Light and dark should both come back empty.

**Resolved 2026-09-16 — the picker is uniform across all ten pages that carry it.** Two
inconsistencies were closed, both found by comparing `getComputedStyle` ACROSS pages rather than
by any colour audit:

- The active rail item was a **wash** on `main-merchant-balance.html` (the picker's rail buttons
  also carry `.rounded-select-option`, and the enhanced-select rule for that class paints `active`
  as a wash — with a `html:not([data-bo-theme="dark"])` prefix, one class-level above an
  unprefixed family selector, so a later unprefixed restatement lost).
- The dark label was **white** on `main-admin-security.html` and `main-merchant-security.html`
  where every other page (including the reference) measures `#2A2C36`.

Both are invisible to a colour sweep — the values are amber in every case — and invisible to a
review by eye at screenshot scale. They were only visible as a *disagreement across pages*.
**When a component appears on many pages, diff its computed style between them; that comparison
finds a class of defect nothing else does.**

Superseded note (kept for history): `main-merchant-settlement.html` painted the active rail item as a **wash** (`rgba(217,119,6,.16)` / `rgba(245,158,11,.2)`) instead of the solid fill — a page-scoped rule in `main-merchant-detail-executive.css`, not this contract. One rule to remove if the family should be fully uniform.
### Provider family — migrated 2026-09-15

`main-provider-detail.html`, `main-provider-credentials.html`, `main-provider-health.html` now run Charcoal + Amber.

- Files: `assets/css/main-provider-family-executive.css` (shared shell — the Admin Detail block rescued and rescoped) plus one page file each: `main-provider-{detail,credentials,health}-executive.css`.
- **Scope is a marker class.** All three bodies carry `main-provider-family-page`, so the family prefix is `body.main-admin-detail-page.main-provider-family-page` — (0,2,1), which beats the legacy navy token blocks at (0,1,1) and, on source order, the credentials page's merchant-report rules at (0,2,1). The marker is deliberate: `main-provider-detail-page` sits on two of the three pages and all five provider pages share `data-access-page="main_provider_detail"`, so neither can isolate one page. Page files narrow it further: `:not(.main-report-exec-page)` for detail, `.main-report-exec-page[data-report-view="settlement"]` for credentials, `.main-provider-stub-page` for health.
- `main-provider-create.html` (`main-provider-create-page`) and `main-provider-endpoints.html` (`main-provider-integration-page`) are **not** migrated and still share `main-provider-executive.css` — so that file is left untouched by this migration.
- Credentials is painted by two other families at once: `main-merchant-report-executive.css` (79 matching rules — it carries `main-merchant-report-page` + `data-report-view="settlement"`) and `main-provider-report-executive.css` (55). Anything that must win regardless of load order carries its three body classes plus the data attribute.
- Credentials' two pickers come from `assets/js/main-provider-settlement-ledger.js` — a fourth calendar implementation, now defaulting to **This Month** and emitting the locked strip contract (`in-range` / `selected` / `is-start` / `is-end` / `is-preview`) with hover preview and first-click-stays-open, like the other three.

Three inherited defects fixed with page-scoped overrides (the shared files were read, never edited):

- **Page-size select hidden** on credentials and health: `main-admin-detail-executive.css:1108-1112` declares `.mad-footer .rounded-select-wrap{display:none!important}`, which hits the wrapper `reports.js` injects around `#settlementPageSize` / `#mpaPageSize` — the control was unusable while its "Show … / page" label stayed on screen.
- **Responsive table** on health (two independent breaks): `…:671-676` and `…:707-716` hide only `th` for some columns, so the header slid off the body; and `…:1331-1360` switches to a card layout keyed to `tr.mad-row` / `td[data-label]`, neither of which `main-provider-activity.js` emits. Fixed by keeping a real table at every width. **Restoring `thead`/`tbody`/`th`/`td` is not enough — the row level is blockified too, so `tr` must be forced back to `display:table-row`**; without it each row lands in its own anonymous table (measured 379px header/cell offset at a 980px viewport).
- **Modal head/foot dividers**: `reports.css` paints `.modal-clean-head` / `.modal-clean-foot` with the cool `--line` token, and neither the Admin Detail block nor the merchant block migrated that layer (they style `.mad-modal-*` and `.modal-clean-close/-panel`). On charcoal the divider read as a light seam in **both** themes; now warm `#EADCC8` / `rgba(255,255,255,.14)`.

Inherited-but-inert, do not "fix" without checking: `--bo-secondary:#2563EB` is declared by all three family files and consumed by none; the `.mad-role.is-support|is-tech|is-regional` chips carry the reference's `#DBEAFE`/`#1D4ED8` palette and no `.mad-role` element exists on these pages — the one-chip pass of 2026-09-28 collapsed that palette there for a few hours, and the same day's revert brought it back (→ Role chip below).

Verification: per-element colour sweep (canvas, sidebar, topbar, content, modals, both pickers) in light and dark — 0 retired or saturated-blue hits on all three pages. Credentials pickers checked for default range, first-click-stays-open, hover strip and refetch (`month=2026-09`); health table checked aligned (`maxLeftDelta 0`) at 1440/1270/1190/980/420px with its page-size popover opening in-viewport.



Follow-up (same day) — the two picker defects found in review:

- **The health page now uses the family date-range picker.** It carried two native `input[type=date]` fields; it now has the same `.ref-*` markup as its siblings (`#reportDateTrigger` / `#reportRangePicker` / `#reportCal*`, 8 presets), driven by new code in `main-provider-activity.js`. The request window is unchanged (`from` / `to` on `/admin/main/provider-activity`) and it defaults to **This Month** with the strip contract, so all four provider pages read alike. That makes **five** copies of the calendar in the repo — a shared driver is the eventual cleanup.
- **The credentials ledger panel was clipped.** `main-provider-report-executive.css:125` anchors it `right:0;left:auto` while `reports.css:3595` pins the field to 292px, so the 390px panel hung 98px to the LEFT of its trigger (measured panel.x 223 vs field.x 321) and the nearest clipping ancestor (`.mad-panel`, `overflow:hidden`, x=304) cut the entire preset rail off. The merchant reference and every other page anchor left (panel.x == field.x), so the credentials file now anchors left — inside `@media(min-width:768px)`, because below that `reports.css` turns the picker into a fixed sheet (`position:fixed; top:96px`) and a page-level `left:0` would flatten it to the viewport edge. Flush-left at mobile is what the merchant pages already do, so it was left alone rather than diverging.
- **The picker treatment lives in the family file now.** The Admin Detail block never carried the calendar rules — they sit in `main-dashboard-executive.css` and were ported per family — which is why the shared file gained a rescoped copy of the merchant file's verified picker + strip sections (trigger, rail, panel, head/week/month/year grids, day cells, hover, `is-start` / `is-end` / `is-preview`).

Follow-up — the Activity Logs footer now matches the Providers tab (2026-09-21):

`main-provider-health.html`'s footer was the odd one out in the family: a three-slot bar (its own "Show N entries" select on the left, the pager centred, "Showing …" on the right) with a bespoke `.mad-btn` pager. It now uses the same two-slot contract as `main-provider-detail.html` and every other listing — "Showing X to Y of Z entries" flush left, the page ladder flush right — so the page-size control is gone and `main-provider-activity.js` pins the request to `size=20`.

That removes the health page's half of the page-size defect above, and with it the whole override block `main-provider-health-executive.css` carried to re-enable the select against `main-admin-detail-executive.css:1108-1112`. Nothing replaces it: the pager is now painted by the shared contract (`main-admin-detail-executive.css:1113-1146` geometry + `main-provider-family-executive.css:332-370` / `:1281-1296` colour), and `.mad-footer` keeps the family's `#FFF8EB` / `#EADCC8` surface via `--bo-surface` / `--bo-border`, which is what the Providers tab already resolved to.

`main-provider-activity.js` now emits `.smart-page` buttons — Previous/Next as `.nav-text`, first and last page always present, a ±2 window around the current one, gap collapsed to an ellipsis — the same ladder `main-provider-detail.js` builds, so the two tabs read as one control. Verified: both footers measure `info.left 41` / `pager.right 1559` at 1600px light mode, no horizontal overflow at 480px, and a page-2 click issues `page=1&size=20` and re-labels to "Showing 21 to 40 of 139 entries".

- **A pill set without `bo-seg-bounce` renders with no frame at all.** The family's active-pill fill is drawn by the shared `.bo-seg-thumb`, not by the pill: `main-merchant-detail-executive.css` sets `.mad-pill.is-active{background:transparent}` and puts the cream/charcoal raised chip in `.mad-pills.bo-seg > .bo-seg-thumb`. `main-merchant-profit.html` carried `.mad-pills` but never loaded `bo-seg-bounce.css`/`.js`, so its filter pills fell back to an unstyled grey chip while every other pill-bearing merchant page looked right. Both files are wired there now; the thumb is created by the script (`ensureThumb`) and positioned by `sync()`, which runs on mount, on resize and on any mutation of the track (class/text), so counts and clicks keep it aligned.

### Live Chat — migrated 2026-09-17

`livechat.html` (inbox + room) and `livechat-template.html` (Add Template form + list) now run Charcoal + Amber.

Page CSS: `assets/css/livechat-executive.css` — **must load last**, after the three `bo-charcoal-*` layers. It is the only file that owns Live Chat's own vocabulary (`.livechat-*`, `.template-form-card`, `.template-chip`). `reports.css` still carries the layout/overflow rules; this file wins colour, radius, and type by source order plus `!important` where `reports.css` already used it (composer, attach button, message menu).

Recipe:

- Scope: `body.livechat-bo-page` / `body.livechat-template-page`. Both already carry `bo-charcoal bo-account-chip`.
- **Header hamburger stays.** Desktop Live Chat uses the same 40px cream `.hamb` as the rest of BO (`bi-list`) to collapse/expand the rail (`body.sidebar-mini`). Do not hide it to keep a “permanent” sidebar — that left the page without a lock control. Mobile still opens the drawer.
- **Inbox is a listing panel** (`#FFF8EB`) joined to the room as one frame — no canvas gap between them, only a 1px `#EADCC8` divider. Rows are a flush ops list (no nested cards): date groups (Pinned / Today / Yesterday / Earlier) · avatar tile `12px` with unread pip · name + username chip · last-message · compact time in a meta rail. **Pin to top** is per-browser (`localStorage`), not a Firestore field: hover on desktop shows a pin control; tablet/mobile always show it. Right-click Pin to top / Unpin. Pinned rows sit in a `PINNED` group above the day groups and keep recency order among themselves. Search sits in the well so the list lifts one layer. Active row uses the locked **L2 chip** (`#FFFBEB`→`#FEF3C7` + `#D97706` frame) and must outrank the transparent row rule; it also carries the 3px amber left rail, an amber avatar, and an `Open` mark so the operator can see which room is open. Hover is a wash only. Idle avatars are the row tile (`12px`, cream `#F5EBDC` / `#6b360c` — not a circle, not amber). Inbox buttons must not pick up `.bo-ui-button` (36px) from `bo-ui-standard.js`.
- **Room is a split well:** the transcript sits on control well `#F5EBDC`. Date stamps are centered day chips with hairline rules on both sides so a new day is obvious. Each bubble shows clock time (`HH:MM`), not a second date. Member (customer) messages pin to the **left** of the well; admin (operator) messages pin to the **right** — full well width, not a centered column. Recalled admin messages stay a dashed ghost chip. Composer is **one reply well** flush with the transcript, filled with listing 米白 `#FFF8EB` at rest (not only on focus): template chips + Manage, a borderless textarea, then Attach left / Send right.
- **Message menu is one cream popover** attached under the kebab (icon rows + danger Delete behind a hairline). Never three `bo-ui-button` chips, never the retired Naga `#171717` circle. Delete stays danger (`#991B1B` / `#F87171`). Unread NEW/count use the same danger pair — not `#ef4444`.
- **Template Messages is a pick-then-edit workspace.** One joined frame filling the page (list left **50%** · editor right **50%**), same as inbox+room — no canvas gap, no nested cards. Hairline rows: hotkey `1–9` · title · one-line preview · Active/Off · hover Edit/Delete. A dashed **New template** row pins to the foot of the list well. Click a row to load it. Search sits above the well. Message grows with the right pane. Editor uses the layer ladder (lift `#FFFCF7` · **3px amber left rail**) with Title, Message, chip order, status. Save is the only primary; New clears; Live Chat is a header link, not a third button. Status pills use locked success/danger washes, not the cool `#dcfae6` / `#067647`. Stacks to one column below 992px.
- Dark: surfaces `#383A46` / wells `#2A2C36` / borders `rgba(255,255,255,.10–.14)` / L2 chip amber-on-charcoal. Panel scrollbars follow the chocolate/amber pill (`#8B6B4A` / `#F59E0B`, `4px`, no arrows).
- Do not restyle Live Chat inside `reports.css` — that file is shared. Further deltas go in `livechat-executive.css`.

## Layout

Shell: sidebar + sticky topbar + main. One job per section. Touch targets ≥44px on coarse pointers.

## Elevation & Depth

Light: form pages use the **layer ladder** (lifted cards + warm shadow + amber rail). Listing tables: 1px border + soft warm shadow. Dark: surface lift via border; soft charcoal shadows only. Focus rings: amber (`rgba(217,119,6,.18)` / `rgba(245,158,11,.18)`).

## Shapes

Action controls / theme toggle `8px`, cards `16px`, topbar avatar `12px`, chart hover tip `.trend-tip` `8px`, pills/switches `999px`, nav ~`10px`.

### Opt-in `bo-charcoal` layers — the mechanism for every remaining page (2026-09-15)

The twenty-odd pages documented above migrate family by family, each with its own rescoped copy
of the charcoal block. The remaining pages do not share those families and mostly do not speak
the `.mad-*` vocabulary at all, so they migrate through **three shared layers plus a marker
class** instead:

| File | Covers |
|------|--------|
| `assets/css/bo-charcoal-shell.css` | Mechanical rescope of `main-merchant-detail-executive.css` (875 prefixes, weight-preserving) — shell chrome (canvas, sidebar, topbar, tabs, filter bar, table, footer, pager, buttons, modals, tips) and the `.mad-*` content vocabulary |
| `assets/css/bo-charcoal-legacy.css` | The `reports.css` and "standard" vocabularies the unmigrated pages actually use: `.filter-card .table-card .summary-card .report-table .metric .quick-stats .field .seg .notice .table-wrap .clean-btn .standard-list-card .standard-data-table .table-footer .entries-control .pagination-clean .page-btn .user-toolbar .user-metric .permission-* .main-mod-* .settlement-*`, plus the filter-row controls, panel surfaces, icon buttons, the date-range trigger, empty states, and the Bootstrap table variables |
| `assets/css/bo-charcoal-primitives.css` | Components that had no owner or several contradictory ones: `.bo-ui-button*`, `.mad-btn*` (no base rule existed), Bootstrap and `.modal-clean*` / `.mad-modal*` / page modal families, `.rounded-select-*` (three to four competing definitions), `.bo-seg-thumb`, tips, the whole date-range picker, a toast primitive, switches, checkboxes, uploads |

**Scope and safety.** Every rule is keyed to a `bo-charcoal` marker class that is added to a
page's `<body>` only when that page is migrated. Nothing repaints until a page opts in, so the
blast radius of a shared layer is exactly the set of pages that carry the marker. The layers load
after every legacy stylesheet on the page; the rescope keeps its source's specificity exactly
(one class-level replaces one attribute-level), which is what lets the verified amber rules
transfer unchanged.

**Per-page recipe.** Add `bo-charcoal bo-account-chip` to `<body>`; append `bo-account-chip.css`,
`bo-charcoal-shell.css`, `bo-charcoal-legacy.css`, `bo-charcoal-primitives.css` after the last
`assets/css` link; put the locked theme toggle in `.report-actions` with `[data-bo-profile]` as a
direct sibling (both `auth.js` and `agent-portal.js` overwrite that element's `innerHTML`, and
`bo-account-chip.css` keys on the direct-child step); add `bo-theme.js` + `bo-account-chip.js`.
**Most of the remaining pages had no theme toggle at all**, so dark mode was simply unreachable
on them — `data-bo-theme` was never written.

### Traps this migration found (each cost a pass)

1. **A malformed `:is()` list can make a whole family inert.** `main-report-charcoal.css` had four
   `data-access-page` values concatenated without commas, so they formed one impossible compound
   selector — 1307 rules never matched. `main-merchant-transactions.html` was documented as
   migrated and still rendered the retired navy. If a migrated page shows legacy chrome, check the
   scope selector before anything else.
2. **`bootstrap.min.css` is cross-origin.** Its rules never appear in a same-origin style audit,
   and no page selector out-ranks `.table > :not(caption) > * > *` cleanly. That is why white
   `<th>`/`<td>` survived every attempt to name table classes. Bootstrap drives every table colour
   from custom properties, so the fix is `--bs-table-bg` / `--bs-table-color` /
   `--bs-table-border-color` / `--bs-table-striped-*` / `--bs-table-hover-*` (and `--bs-body-bg`,
   `--bs-border-color`, the `.btn` set) on `.table` — one rule, every Bootstrap table.
3. **`!important` parity is not enough; ID level is.** `bo-ui-standard.css` guards its filter row
   with `body:not(#bo-filter-standard-off):not(#bo-filter-standard-legacy)` — two ID-level `:not()`
   steps whose stated purpose is to out-rank "every legacy page-level filter rule". A class-level
   `!important` ties on importance and loses on specificity, so the locked layer mirrors the shape
   with two ID steps and more class weight. `bo-charcoal-off` on `<body>` is the opt-in escape.
4. **A mechanical retint must be value-driven, not list-driven.** The locked palette contains no
   cool-hued value in either theme — light's only blue is the documented "Secondary (info / rare)"
   that nothing should paint with, and dark's secondary is amber — so *every* cool-hued literal is
   wrong. A hand-written value list kept missing 3-digit `#fff`, `#65728B`, `#DFE6F0` and the
   `#FBFCFE` header tints. Classify each value by measured HSL instead: near-white → surface,
   light tint → border, grey text → muted, dark → ink, saturated → accent; keep a wash's alpha;
   migrate a neutral only where it is a surface, since a plain white label on an amber fill is the
   locked accent-on.
5. **The first declaration in a rule is easy to skip.** Splitting a block on `;` yields a first
   fragment that begins with `{`, so a `^property:` regex misses it — and first position is where
   `background:#fff` usually sits. Grep the *file* for surviving cool values after a retint; do not
   trust the transform's own report.
6. **A page that rewrites its own document defeats an inline probe.** `provider-detail.html`
   dropped the injected harness from the DOM. Such a page has to be checked by screenshot.
7. **A page that redirects on API failure cannot be measured in place, and unmeasurable is not clean.**
   `agent-portal.js` wraps its whole shell build in one try/catch: any error removes the token and
   assigns `location.href = 'agent-login.html'`. Two consequences. First, the failure is silent —
   nothing is logged, so a broken stub looks identical to a working one. Second, the probe leaves
   with the old document, so the sweep reports "no report" and the whole family reads as having
   nothing to fix. `Location.prototype.href` is not configurable in Chrome, so navigation cannot be
   blocked from an injected script. The workable method is to drop that one script from the sweep
   copy (`VERIFY_STRIP`) so the page stays put and its CSS can be measured, and to **report the
   stripped list with the result**, because whatever that script builds — the sidebar nav, the
   account chip — is then unverified. Counting such a page as clean would be a lie; counting it as
   broken is also wrong. It is a third state and must be reported as one. Note also that the stub
   has to answer each endpoint with a shape the page can actually consume: `portalMenuKeys` holds
   permission keys rather than page keys (`reports`/`products`/`provider_detail`/
   `player_game_report` → `bet_report`, `finance` → `wallet`, `withdraw` → `settlement`), and a
   response used both as a profile object and as a list has to satisfy both.
8. **An audit only answers the question it asks, and both of these lived in the channel it did not ask about.**
   Two defects survived a clean sweep and were found by eye, in the same family of mistake:

   - **A painted `background-image` is invisible to a computed-colour check.** The login page wrote
     `background:#F5EBDC url(login-background-v2.png)`: `background-color` measured warm and passed,
     while the 1.9 MB artwork painted a cold grey geometric field over the whole viewport. The rule
     now: report every element whose `background-image` is painted and is not a gradient (a data-URI
     SVG chevron on a native `<select>` is the one legitimate case), and look at the artwork itself.
   - **"Is anything cool left?" cannot see amber replaced by grey.** A classifier bug in the retint
     mapped every mid-lightness saturated cool colour to warm grey `#57534E`, producing grey primary
     CTAs, grey active tabs, grey selected calendar days. A warm grey is not a cool value, so the
     answer stayed "nothing cool" while the amber was simply gone. The rule now: grey is never a
     **fill** on an accent slot in the locked system, so an accent-named control with a `#57534E`
     fill or border is a defect **regardless of the colour counters** — and in the transform, test
     saturation before lightness, because a saturated cool colour is an accent whatever its value.

   Both were green on every gate the harness had. That is the useful part: a passing check is
   evidence about one property, not about the page. Sweep, then look at the screenshots.
9. **Verification must wait on a condition, not a delay.** Under load a probe that sweeps a fixed
   time after `load` can measure a half-styled page and report the retired palette as a defect (or
   hide a real one) — the same page flipped between 0 and 157 hits across runs. Wait until every
   declared stylesheet is present and `readyState` is `complete`, and emit the stylesheet counts, a
    canvas canary and `readyState` so a partial render is visible rather than believed.
10. **Two of my own rules can fight each other, and the loser is silent.** `bo-charcoal-legacy.css`
   painted a generic `.clean-btn` ghost at (0,4,2) `!important`, while `.bo-ui-button-primary` — the
   class `bo-ui-standard.js` adds by label to every "Create / Save / Search" button — carried the
   amber CTA at (0,3,1) `!important`. The ghost therefore out-ranked the primary **by one
   class-level**, and on User Management the "Create User" CTA rendered as a ghost: transparent
   fill, ink label, warm border, no amber anywhere. Nothing flagged it, because "amber" and "ghost"
   are both legitimate locked appearances, and the six counters only look for *foreign* colours.
   Two rules: a base rule in this layer must `:not()` the modifier classes it knows about
   (`:not(.primary):not(.bo-ui-button-primary):not(.mad-btn-primary):not(.mad-btn-navy)`) rather than
   rely on load order; and a primary restatement should carry the `body:not(#bo-charcoal-off)` ID so
   the outcome cannot depend on which file happens to sit later. **Looking for a ghost is the only
   check that finds this** — measure `background-image`, because a gradient never appears in
   `background-color`.
11. **Listing filter rows are locked at `36px` / `8px` radius (Wallet Ledger specimen).** Older notes that treated `bo-ui-standard` `--bo-filter-height:42px` / `--bo-filter-radius:11px` as a permanent second family are **superseded** for Transaction listing / `bo-wallet-tx` / `.bo-filter-row` on those pages. Beat the 42px tokens in `bo-wallet-transaction-amber.css`. MAIN executive `.mad-filters` and Roles `.mp-search` may still show legacy heights until those pages are migrated — then bring them to **`36px`**. Full metrics: `.interface-design/system.md` → Patterns → Listing filter controls.
12. **A regex in injected code is eaten before Chrome sees it.** The probe is delivered through a
   template literal, so `\w`, `\s`, `\d` and `\(` lose their backslash on the way in. A
   specificity scorer built on `/#[\w-]+/g` silently counted nothing and reported `sp=0` for every
   rule — a *plausible-looking* dump that would have justified any conclusion. Seventh occurrence of
   this mistake; the durable fix is to write no regexes in injected code at all (`indexOf`, `split`,
   `charAt`), and to sanity-check a new probe field against a case whose answer is already known.

13. **A page that redirects to another page is not the page you measured.** The twelve
   `agent-*.html` portal pages redirect an unauthenticated visitor to `agent-login.html`, and the
   stub does not change that: `--dump-dom` returns *agent-login's* document — title "Agent Portal
   Login", `login.css` in the head, no `report-shell`, and no probe report at all, because the
   probe refuses to emit on a half-built page (trap 9). So the batch-4 "clean" readings for those
   twelve are **not reproducible and should be treated as unverified**, and the screenshots for
   them show the login gate rather than the page. Anything added to their markup — including the
   theme toggle this migration adds to every adopted page — does not survive the portal's own
   render. Verify those pages in a browser with a session, not with this harness.
14. **A pixel audit has three built-in false positives; check them before believing it.** Sweeping
   the screenshots for cool-hued pixels flagged (a) the dark-theme canvas, whose locked
   `#2C2E36`/`#2A2C36` really does sit at hue ~232°, (b) **subpixel antialiasing fringes** — 368
   saturated blue pixels against 413 saturated orange ones in one title band, a signature that is
   rendering, not styling, and (c) genuine images (`site-customize`'s uploaded favicon, casino and
   currency artwork). Confirm a cluster is chrome before calling it a defect: sample the pixels
   around it, and read the *darkest* pixel of a text run, which is the declared colour.
15. **Batch D's off-scale radii.** `login.css` had drifted to 11/18/20/22px against a locked set of
   8 / 10 / 12 / 16 / 999. Normalised: both icon tiles (34px `.auth-brand-mark` on login, 62/56px
   `.auth-icon` on agent-login) take the avatar value 12px because they are one role on sibling
   pages; `.upload-status` takes 8px like the other small surfaces; the small-screen `.auth-card`
   keeps the locked 16px instead of growing to 22px. `.auth-subtitle` also gained
   `text-wrap:balance`, which removed a single-word second line. **`login.css` is referenced by two
   pages at two different versions** (`login.html` 1.0.4 and `agent-login.html` 1.0.3) — bump both.

### Adopted so far (2026-09-15)

`main-report`, `main-settlement-report`, the `main-provider-{balance,settlement,transactions,
create,endpoints}` pages, the `main-accounting-{report,settlement,due}` pages,
`main-transaction-history`, `main-balance-{adjustment,overview}`, `main-stat-detail`, `brand-*`,
`menu-management`, `index`, `online-users`, `admin-user`, `account-lock`, `admin-login-log`,
`admin-operation-log`, `role`, `root-control`, `profile`, `ip-whitelist-security`,
`compliance-policy`, the member wallet / deposit / withdrawal and `wallet-ledger` pages,
`bulk-adjustment`, `bulk-bonus-adjustment`, `duplicate-ip`, the rebate family, the VIP family,
the payment pages, the legacy provider pages, `player-provider-session`, `bank-deposit-usage`,
the game-ranking reports, `spin2-management`, `wbet-bet-limit`, `rebate-management`,
`vip-management`, `casino-overview-report`, Live Chat (`livechat.html`, `livechat-template.html`).

Verified by sweeping every rendered element's computed colour on the page in both themes —
0 retired values, 0 cool-hue hits, 0 cool-white surfaces.

## Do's and Don'ts

**Do**
- Keep light/dark parity when changing colors.
- Use continuum on canvas only; keep sidebar opaque; keep panels solid.
- Prefer `--bo-*` tokens; treat `--bo-cyan*` as amber.
- Copy locked topbar anatomy (theme → counters when present → User Name) and Primary/Ghost button recipes on every migrated page.
- Override legacy light canvas (`reports.css` `.report-body{background:#f5f7fb!important}`) on every dark page, or white frames will leak.

**Don't**
- Reintroduce Deep Navy Cyan (`#123B66`, `#21A6D7`, `#072647`, `#08131F`, `#0B1626`, `#0F1F33`).
- Purple-on-white / indigo marketing gradients as product identity.
- Dead pure black (`#000` / `#0A0A0B`) for dark canvas.
- Muddy full-page orange wash under table panels.
- Flatten Create/Edit forms to one cream (skip the layer ladder / amber rail).
- Cool `#fff` / `#FBFCFE` / `#F1F5F9` chrome on cream form pages.
- Invent a different User Name pill, theme-toggle size, or primary gradient per page.
- Assume writing tokens in MD alone paints the page — CSS must implement and win specificity wars.

**Menu Management panel tabs — the selected panel was invisible (2026-09-16, user-reported).** The
MAIN / BO segmented control at the top of `menu-management.html` rendered as two identical cream
cards: measured fill `#FFF8EB`, border `1px #EADCC8`, colour `#18191C` on **the active and the
inactive tab alike**. Only the icon colour and the small count pill hinted at which panel was
selected — the raised chip that is supposed to mark it was on both.

- **Cause: `bo-ui-standard.js` classifies buttons by their label.** It added
  `.bo-ui-button`/`.bo-ui-button-secondary` to both tabs, and `bo-charcoal-primitives.css` then
  paints every `.bo-ui-button-secondary` as a cream surface button. That rule carries the same
  class count as the tab rules in `menu-management-executive.css` and the charcoal layer loads
  later, so it won every state and flattened the selection. Same family as the documented ghost
  out-ranking a primary (trap 10 in the opt-in layers).
- **Naming one bo-ui class is not enough.** `.menu-panel-tab.bo-ui-button` only *ties* with the
  primitives layer and loses on source order — which produced a half-fixed state where the fill
  went transparent but the 1px border stayed. The tabs always carry **both** classes, so the
  selectors name both (`.bo-ui-button.bo-ui-button-secondary`), which wins outright.
- **`:not(.active)` on the unselected block is load-bearing.** Without it the base also matches the
  selected tab, and being stated after the selected block it wins their shared declarations —
  measured: the selected tab's amber label came back muted in dark mode. That is DESIGN.md's
  trap-10 rule again, and it is why the base blocks are state-qualified rather than colour-only.
- **A `background-color` win is not a background win.** The state rules above still lost the fill to
  a later `.bo-ui-button-secondary` declaration that **no readable stylesheet accounts for** —
  `bootstrap.min.css` is cross-origin, so a `cssRules` sweep cannot see it and "which rule wins"
  cannot always be enumerated. Clearing `background-image` explicitly in both branches settled it.
  When a computed-colour fix does not take, clear the shorthand and the image too before assuming
  the selector lost.
- **Verification needed a real click.** A Playwright locator click on the tab timed out (the control
  was not actionable under the stub) and a coordinate click did not register, so the state was
  checked by calling the page's **own** handler — `document.getElementById('menuTabBo').click()` —
  and re-reading computed styles in a separate evaluate. Reading only the initial paint is not
  enough here: the first read races the page's own async render and reports the fill on the wrong
  tab. After a click the states track correctly in both directions, both themes.
- Result: selected = raised cream (`#FFF8EB` light / `#2A2C36` dark — the same segmented recipe as
  `.nm-status-btn` in the New/Edit Menu modal) + amber label + amber icon + amber count wash;
  unselected = transparent on the track + muted, no border. The Refresh / New Menu buttons are
  untouched. `menu-management-executive.css` 2.1.6 → 2.2.1.
- **Left alone for the owner to call:** the `2 Groups · 9 Menus` badge still wears the full amber
  accent (wash + `rgba(217,119,6,.30)` border + `#B45309` text), i.e. the same accent as the primary
  CTA, for a static read-out — it is the loudest thing in the row. That treatment comes from the
  **shared** `bo-charcoal-legacy.css` rule for `.users-found-badge` ("Count badge, ledger
  multi-select trigger…"), so demoting it on this page alone would diverge from every other page
  that shows one; it should be a repo-wide decision.

**Sidebar "lock" did not survive a page change (2026-09-16, user-reported on merchant Roles).** The
user reported that after clicking through to Roles & Permissions the sidebar would not stay locked.
The button was not broken: clicking the hamburger does toggle `body.sidebar-mini` and the rail
measures 280px → **72px** (verified). The class was simply **never persisted** — so collapsing the
sidebar and then clicking a submenu link landed you on a page with a full-width sidebar again, which
reads exactly as "the lock doesn't work".

- Fixed in `assets/js/reports.js` with `localStorage.bo_sidebar_mini`: read and applied at script
  execution (the script is at the end of the body, so the class lands before first paint and there is
  no expanded flash), written on every toggle, and re-applied when the viewport returns to desktop —
  the resize handler only ever *stripped* the class, so the state was lost for good once you dipped
  below the 992px desktop threshold.
- Verified end to end in the browser: fresh load 280 / lock 72 + pref `1` / **navigate to another
  page → still 72** / navigate back → 72 / unlock → pref `0` and 280 after the next load.
- The state is one global preference, not per-page: a user who locks the sidebar keeps it locked
  everywhere until they unlock. That is the intent (it is a personal layout preference), but it is
  worth knowing that a support report of "the sidebar is stuck as icons" is now this key, and the
  recovery is one more click on the hamburger.
- **Pin hygiene, same trap as the stylesheets:** `reports.js` was referenced by **147 pages at two
  different versions** (`1.0.25` ×141, `1.0.26` ×6). Unifying them matters more than usual here,
  because a page left on the old pin silently keeps the *unpersisted* behaviour and the bug looks
  like it only happens on some pages. All references moved to `1.0.27` in the same pass.

**Sidebar highlighted the wrong item on Merchant Roles / Security (2026-09-16, user-reported).** On
`main-merchant-roles.html` as a MAIN account, the sidebar marked **3.1 Merchants** as current while
the page was Roles & Permissions, and the Merchant flyout showed the same wrong chip.

- **Cause: an over-broad drill-down alias in `sidebarActivePage()` (`auth.js:111`).** The active L2
  item is matched by **filename** (`pageFile(sidebarActivePage()) === pageFile(m.url)`), and that
  function aliases Merchant drill-downs to `main-merchant-detail.html` so a child page keeps the
  Merchant item lit. The list included `main-merchant-roles.html`, `main-merchant-role-create.html`
  and `main-merchant-security.html` — but Roles & Permissions (3.2) and Security & Audit (3.4) have
  **their own Merchant submenu entries**, so the alias pointed the highlight at a *different* page
  than the one you were on. **The admin side already had this right** — `main-admin-security.html`
  was never aliased to `main-admin-detail.html`, and `main-admin-role-create.html` maps to
  `menu-permission.html` (its own family) rather than to the detail page. The merchant list simply
  over-included; it now matches the admin shape: the two pages keep their own entries, and
  `main-merchant-role-create.html` follows its parent (`main-merchant-roles.html`).
- **Do not "fix" this in the second alias site.** `auth.js:~254` maps the same filenames to
  `main-merchant-detail.html` for **permission** inheritance, not for highlighting — that one is
  deliberate and was left alone. Two lists, same filenames, opposite intent.
- **`main-merchant-visibility.js` is the reason these three pages exist for MAIN only.** It deletes
  the roles/security/role-create links and redirects those pages to the merchant list for
  **non-MAIN/ROOT** users, so for a delegated admin the "Merchants" highlight was correct all along —
  which is why the alias looked right when it was written. It only misfires for MAIN/ROOT, the one
  case where those pages are actually reachable.
- Verified by swapping a stubbed copy in **at the real filename** (the verify harness serves every
  page as `.tmp-v-<name>`, so no page can ever match a menu URL and the highlight is untestable
  that way) and reading the rendered nav: the active item is now `main-merchant-roles.html`. The
  original file was restored immediately after; its only diff is the version pins.
- Pins: `auth.js` was at **three** different versions (`1.0.61` ×126, `1.0.62` ×2, `1.0.63` ×8, plus
  a date-style `20260907` ×2) — unified to `1.0.64` across all 138 pages.

### Sidebar scrollbar hidden — and it was not the element it looked like (2026-09-22, owner request)

“我要隐藏式的sidebar”, with a screenshot of the rail wearing the OS default scrollbar: a thick
grey thumb with arrow buttons at both ends, which reads as foreign chrome on the cream rail.

- **The scroller is `.report-nav`, not `.report-sidebar`.** `reports.css` declares
  `overflow:auto` on the sidebar, which is what makes it *look* like the scroll container, and the
  first pass hid the sidebar’s scrollbar. Measured in a harness carrying the real stylesheets:
  the sidebar computes `overflow-y:hidden` with `scrollHeight == clientHeight` and can never
  scroll, because `bo-ui-standard.css` pins it to `display:flex;flex-direction:column;
  overflow:hidden` and hands the scrolling to the nav two lines later (`flex:1 1 auto;
  min-height:0;overflow-y:auto`). The nav measured a **15px gutter** against the sidebar’s 1px
  border, and `elementFromPoint` on the scrollbar lane returned `nav.report-nav`.
  **A rule aimed at the sidebar would have been inert on 140 of the 141 sidebar pages** — the
  same failure mode this file records elsewhere: a rule that looks effective and is not.
- The locked rule is two declarations on the real scroller, placed in `bo-ui-standard.css` next
  to the `overflow-y:auto` it hides: `scrollbar-width:none` (Firefox, and Chromium 121+, where it
  is also the only way to kill the arrow buttons) plus `.report-nav::-webkit-scrollbar{
  display:none}` for older WebKit. The same pair is kept on `.report-sidebar` in `reports.css`
  for `layout-section.html`, the single sidebar page that does not load `bo-ui-standard.css`.
- **Hidden, not styled, and that is the point.** This repo has a scrollbar-pill recipe
  (`#8B6B4A` light / `#F59E0B` dark, `6px`, no arrows — Panel pill scrollbar). The owner asked
  for a hidden scrollbar here, so no pill was added. Wheel, trackpad and keyboard still scroll it.
- **Removing the gutter cannot cost anything.** The nav gains the 15px the scrollbar reserved, and
  the sidebar’s measured slack for its longest menu label was only 16px (→ sidebar width),
  so the extra room reduces wrap risk rather than adding any. Verified in both themes:
  `scrollbar-width:none`, gutter **15 → 0**, `scrollTop` still moves, and no scrollbar is
  painted in the rendered screenshot.
- Pins in the same pass: `reports.css` 1.0.66 → **1.0.67** (141 pages) and
  `bo-ui-standard.css` 1.0.7/1.0.6 → **1.0.8** (140 pages).

### Sidebar width set to 260px (2026-09-22, owner request)

“我的sidebar的宽度帮我改至260px” — the rail goes back out, 230 → **260px**, reversing the last of the
280 → 252 → 230 tightening steps recorded under Security & Audit above.

- **One value, four declarations.** `--sidebar-w:230px` → `260px` in `reports.css` (its two
  `:root` blocks) and the same way in its `reports-dashboard-original.css` twin. Nothing else
  needed an edit, because every consumer reads the variable: `.report-sidebar{width}`,
  `.report-main{margin-left}`, the desktop flyout’s `--bo-sidebar-flyout-left`, and the dark
  canvas gradient’s `calc(var(--sidebar-w) * .72)`. Verified on real pages rather than a harness:
  on `main-merchant-security.html` the variable, the computed sidebar width and `.report-main`’s
  margin all read **260px**, and the flyout anchors at **268px** (260 + 8) — so it follows the
  wider rail instead of leaving a gap. `--rail-w` is untouched: the mini rail is still **72px**.
- **The 30px comes out of content width, and one row notices.** The security pages’ filter row is
  the tightest layout in the app — measured above at 996px needed in 1000px available on a 1280
  viewport, i.e. 7px of slack. Re-measured on `main-merchant-security.html` at both values:

  | viewport | sidebar 230px | sidebar 260px |
  | --- | --- | --- |
  | 1920 / 1440 | one line | one line |
  | **1280** | **one line** (993 needed in 1000) | **two lines** (993 needed in 970) |
  | 1152 | two lines | two lines |

  So the wrap threshold moves from roughly 1273px to roughly 1303px: on windows inside that ~30px
  band, with the sidebar expanded and the detail panel closed, that row now folds to two lines
  where it used to fit. The owner’s own ~1900px screen is unaffected, and opening the detail panel
  still folds the rail to 72px, which is the case the row was tuned for. **Left for the owner to
  call**, because every lever in that row is deliberate — further search capping or gap trimming
  degrades a row already tuned by hand across several passes.
- **The nav cannot regress by widening.** The longest label measured 150px against a 166px text
  box at 230px, i.e. 16px of slack, so at 260px there is roughly 46px. No nav label wrapped in the
  rendered check and no page gained horizontal overflow.
- Two widths that deliberately do **not** move: the Agent Portal’s own shell
  (`.agent-modern .report-sidebar{width:250px!important}` in `agent-portal.css` — a separate
  surface no BO page loads) and `main-merchant-profit.css`’s `230px` date field, which is a
  coincidence of value rather than the rail. `bo-layout-section-md.css` and
  `brand-overview-executive.css` size a page menu with `var(--sidebar-w)`, so those panels follow
  to 260px by design.
- Pins in the same pass: `reports.css` 1.0.66 → **1.0.67** (141 pages) and the twin
  `reports-dashboard-original.css` 1.0.8 → **1.0.9**. No HTML was edited beyond the version
  string.

### Collapsed rail — no slide-out, the panel is the hover response (2026-09-24, owner request)

Owner, with a reference screenshot of another panel's icon rail (icons down the left, a floating
panel beside it, that panel headed by the group's own name): “sidebar的设计逻辑需要去调整 至像我图里的
那样 收起后的逻辑 但不更改设计”. Asked which reading of “收起后的逻辑” they wanted from the collapsed
rail, the answer was **“只弹面板，栏保持图标”** — the rail stays at its icon width and a panel opens
beside it.

**What the collapsed rail did before.** Hovering the rail slid the whole sidebar out to 260px
(`body.sidebar-mini .report-sidebar:hover{width:var(--sidebar-w)!important}`, present in four sheets
plus per-page-family copies), revealed every label inline, restyled the group rows into drawer
headers, moved the topbar's left padding to follow the wider rail, raised the rail to `z-index:6000`,
and — at the same time — opened the submenu flyout beside the *expanded* rail (measured on
`member-deposit.html`, 1440×900: rail 72 → 260 on hover, flyout anchored at x=266, i.e. 6px past a
rail that had just grown 188px under the pointer).

**What it does now.** The rail never changes width on hover. Hovering a row opens one panel, on the
same 6px gap, with two shapes:

| Row | Collapsed-rail response |
| --- | --- |
| Group (has children) | The submenu panel, unchanged anatomy — now headed by the group name |
| Top-level page, or a category whose children are all hidden | The rail label panel: the same panel shell carrying just that row's name |

The header exists because the collapsed rail shows only an icon: the panel is the one place the group
name is readable (`Wallet Management` above `Deposit Approval` / `Withdraw Approval` / … in the
reference). It is scoped to `body.sidebar-mini`, so the **expanded** sidebar's panel is untouched —
there the row above already names the group and the panel renders exactly as it did. The label panel
is what keeps a top-level page readable, which the slide-out used to provide; without it, `Dashboard`
and `Live Chat` would be anonymous icons.

**No new visual language.** Both panels use the locked *Sidebar flyout panel* values (`#FFF8EB` ·
`rgba(92,74,48,.12)` · `0 12px 32px rgba(60,48,32,.14)`; dark `#383A46` · `rgba(255,255,255,.14)` ·
`0 16px 40px rgba(0,0,0,.35)`), and the panel header is the locked body text colour (`#18191C` /
`#F5F5F4`) on the panel's own hairline. Rail fill, icon tile, active chip, radii, spacing and the
flyout skeleton are unchanged — the resting rail is identical to before.

**Files.** The slide-out anatomy was deleted rather than overridden — an override layer would have had
to beat a dozen page-family rules copy-pasted from the base one at higher specificity, and the repo
already has that lesson recorded (`!important` parity). Removed: the `:hover`/`.is-mini-hover` width,
label-reveal, row-restyle, brand-reveal, logout-reveal and topbar-shift rules in `reports.css`
(17 rules), the twin `reports-dashboard-original.css` (19), and the drawer background/shadow and
reveal variants in `bo-charcoal-shell.css`, `bo-ui-standard.css`, `brand-overview-executive.css`,
`menu-management-executive.css`, `main-dashboard-executive.css`, `main-merchant-detail-executive.css`,
`main-provider-family-executive.css`, `main-report-charcoal.css`, `menu-permission-executive.css`.
`.is-mini-hover` (added by `reports.js`) and the `:not(:hover):not(.is-mini-hover)` collapsed rules are
left in place: they are inert now but weight-neutral, and removing them would have changed cascade
weight on pages that override the same properties.

**Two traps this change walked into, both recorded because they each cost a pass:**

1. **The panel has to out-rank the sheets that pin sidebar children.** Six sheets declare
   `body.<page> .report-sidebar > *{position:relative;z-index:1}` (e.g. `bo-wallet-transaction-amber.css`'s
   `body.bo-wallet-tx .report-sidebar > *`). A direct-child label panel inherits that at a specificity
   `.report-sidebar .bo-rail-label` cannot beat: measured before the fix on `member-deposit.html`, the
   panel laid out at the rail's foot — `position:relative`, `z-index:1`, x 78 / y 855 instead of y 74 —
   i.e. it read as the feature not existing at all. The rule now carries `position:fixed!important` and
   `z-index:12050!important`, and the JS writes the `--bo-sidebar-flyout-left/top` custom properties the
   sheet consumes (an inline `left`/`top` is the weaker declaration the moment a sheet sets them — the
   same lesson as the flyout cap).
2. **The flyout's item labels used to be revealed by the slide-out.** `reports.css` revealed them under
   `.bo-flyout-hover`; the twin sheet never had that rule and relied on the sidebar `:hover` reveal that
   also drove the slide-out. Deleting it left the three twin pages (`index.html`, `member-detail.html`,
   `online-users.html`) with an **icon-only panel** — measured on `online-users.html`: item span
   `font-size:0px`. Both sheets now reveal item labels from the panel state (`font-size:inherit!important`
   added to `reports.css`'s reveal; the equivalent rule added to the twin, which had none).

**Verified** in a harness that stubs `/auth/admin/me` + menu groups so the real `auth.js` paints the
real sidebar without a login, on one page per sheet family — `member-deposit.html` (base sheet),
`online-users.html` (twin sheet + `bo-charcoal`), `main-merchant-security.html` (main-executive
family) — light and dark, collapsed and expanded:

| Check | Result |
| --- | --- |
| Rail width on hover, every row, both themes | **72px** (was 260) |
| Rail `box-shadow` on hover | **none** (was the drawer's `18px 0 40px`) |
| Rail `z-index` on hover | **1040** (was 6000) |
| Topbar `padding-left` while hovering | **unchanged** (was `calc(260px − 72px + 20px)`) |
| Group row hover | panel opens, header `Wallet Management`, items **13px** |
| Top-level / hidden-children row hover | label panel opens (`Dashboard`, `Live Chat`, `Operations`) |
| Expanded sidebar group hover | panel opens with **no** header, inline labels 14px — unchanged |
| Label panel skin | light `#FFF8EB` / `#18191C`, dark `#383A46` / `#F5F5F4` |

Two measurement notes for anyone re-running this. The in-app renderer **does not advance CSS
transitions** (a settled `box-shadow` reads `rgba(0,0,0,0) 0 0 0 0` indefinitely), so a computed style
read during a transition is not the value the owner sees — disable `transition` on the element before
reading, or the drawer shadow looks like it is still there. And the browser serves the **cached** asset
for a `?v=` pin that has not moved, which reports the pre-edit CSS as the current state; the harness
appends its own `&h=` token to every local asset URL for exactly that reason (the same trap `?v=` pins
exist to avoid, one layer down).

**Pins:** `reports.css`, `reports-dashboard-original.css`, `bo-global-quicknav.css`, `bo-ui-standard.css`,
`bo-charcoal-shell.css`, `brand-overview-executive.css`, `menu-management-executive.css`,
`menu-permission-executive.css`, `main-dashboard-executive.css`, `main-merchant-detail-executive.css`,
`main-provider-family-executive.css`, `main-report-charcoal.css` and `auth.js` re-stamped from content
by `scripts/stamp-asset-pins.py` across **151 pages** (pin-only diffs; verified that no page body
changed). `auth.js` also needed its **hardcoded** `bo-global-quicknav.css?v=` (two injection sites)
moved by hand — that string is not an HTML reference, so the stamper cannot see it, and a stale value
there ships the whole sidebar layer old. The Agent Portal's own rail (`agent-portal.css`,
`bo-charcoal-agent.css`, `.report-nav-item`) was **not** changed: it is its own shell on its own
surface, and the request was about the BO sidebar.

### One sidebar toggle in the rail, and pins off the collapsed icons (2026-09-24, owner request)

Two fixes in one pass, both about the collapsed rail:

**1. “那个点开sidebar的按键要统一像dashboard那样”.** The BO had two different controls for one action,
in two different places:

| | Dashboard shell | Every other page (before) |
| --- | --- | --- |
| Where | inside the rail's brand row (`dashboard.html` markup) | in the topbar, right of the rail |
| Size | **42×42** | 42×**48** (8px padding + 20px icon + `line-height:1.5`) |
| Radius | **11px** | 10px |
| Icon | `22px` | `20px` |

The dashboard's version is the one the owner pointed at, and the rail is also where a rail's own
control belongs (and where the reference screenshot that started the previous pass put it). So
`auth.js` now mounts that same button — same classes, same locked values, `bi-list`, `aria-label`,
`data-open-sidebar` — into `.report-brand` on every page it paints (dashboard.html still ships its own
copy; the injection is idempotent, so a menu re-render cannot stack a second one). `reports.js`'s
delegated `[data-open-sidebar]` handler drives it unchanged, so expand/collapse works from the rail in
both states.

Consequences, all deliberate:

- The **desktop topbar hamburger is hidden** now — one control, not two. It stays for the mobile
  drawer (below 992px the rail is off-canvas and needs an opener outside itself).
- The topbar's title block therefore starts at the topbar's own left padding, as on pages that never
  had a hamburger.
- The collapsed rail centres the button (`justify-content:center`, 72px rail → 42px button at x=20,
  y=11); the expanded rail puts it at the right end of the brand row (`space-between`, x=203 at
  260px), exactly as the dashboard does.
- **The hide rule lives in `bo-global-quicknav.css`, not in `reports.css`.** `reports.css` and its
  twin are also loaded by the twelve Agent Portal pages and the four scratch `_verify-*` copies, which
  render a rail without `auth.js` and therefore never get the injected button; hiding the topbar
  toggle in a sheet they load would have left those pages with no control at all. The sidebar's own
  layer is loaded only by the pages that do get the rail toggle.
- The **dark theme has a counterpart the dashboard's inline copy does not carry**: on a `#3A3226`
  rail the dashboard's `#FFF8EB` chip would be the one light-locked surface left, so the shared copy
  paints `#383A46` + `rgba(255,255,255,.10)` with the dark body text. Light keeps the dashboard's
  exact values. Dashboard.html's own rules still win inside the dashboard (`!important`), so the
  dashboard is pixel-identical to before.
- `bo-charcoal-shell.css` and `bo-charcoal-legacy.css` each carried `display:inline-flex!important`
  on `.report-topbar .hamb` (light **and** dark, plus a `referral-page` copy). Those declarations only
  existed to force the desktop hamburger visible through the charcoal chrome, so they are gone; the
  mobile block in `reports.css` shows the drawer opener on charcoal pages as it always did.
  `livechat-executive.css`'s “restore the topbar hamburger on livechat desktop” rule is gone too —
  its stated reason (the page would otherwise have no lock control) no longer holds.

**2. “sidebar隐约看到 那个pin功能的设计在sidebar的dashboard icon那边”.** The 2026-09-21 decision that
dashboard pins are *always* visible was made for the expanded rail. In the collapsed 72px rail those
same buttons are 26px wide and absolutely positioned `right:9px` inside a 51px row, so each one sat on
top of its row's own 22px icon — visible through it, which is what the owner saw. The collapsed rail
now drops them (`body.sidebar-mini … .report-nav > a[data-menu-key] > .bo-sidebar-pin{display:none}`),
which affects exactly the L1 rows that carry a pin (top-level pages; group rows never had one). Pinning
from a rail is still one gesture away: expand the rail, or use the submenu panel, which carries a pin
per entry — and the dashboard's own tiles keep their unpin control.

**Verified** in the same stub-backend harness as the pass above, one page per sheet family, both
themes:

| Check | Result |
| --- | --- |
| Rail toggle, collapsed (base / twin+charcoal / main family) | 42×42, radius 11, icon 22px, `#FFF8EB` light / `#383A46` dark |
| Rail toggle, expanded | same button at the brand row's right end (x=203 at 260px) |
| Click the rail toggle | collapses ↔ expands (`sidebar-mini` toggles, rail 72 ↔ 260) |
| Topbar hamburger, desktop 1440/1366 | **hidden** (base, twin, charcoal dark, main family) |
| Topbar hamburger, 900px | **visible** — drawer opens (`.show`), rail toggle hidden |
| L1 pin, collapsed rail | **hidden** (was overlapping the row icon) |
| L1 pin, expanded rail | visible, no overlap (row 249px, pin at x=214) |

**Pins:** `bo-global-quicknav.css`, `reports.css`, `reports-dashboard-original.css`,
`bo-charcoal-shell.css`, `bo-charcoal-legacy.css`, `livechat-executive.css` and `auth.js` re-stamped
from content; `auth.js`'s hardcoded `bo-global-quicknav.css?v=` moved by hand again (third time this
trap has bitten — it is the single string the stamper cannot see).

#### The rail work was lost once, and why (2026-09-24, owner: “我的sidebar昨天已改好的设计逻辑跑了”)

Owner report, the day after the two passes above: the sidebar's collapsed-rail logic was back to the
old slide-out. **It was not a browser cache and not a bad merge of committed code — the work had never
been committed, so a second session on this branch removed it as “not mine”.** The trail, from the
reflog:

| Commit | What it did |
| --- | --- |
| `a40a9b2d` | swept **15 uncommitted rail files** into an unrelated commit (“Access Control modals”) |
| `3bc151ae` | “Correct the previous commit: **remove 15 files that were not mine**” — reverted them |
| `3047c431` | “**Drop a colleague's uncommitted rail work** from this branch” — the same, from the other side |
| `222ec75f` / `e1f46889` | merged that branch into `main` (PR #65), so `main` shipped without them |

The result on `origin/main` was a **half-applied feature**: `auth.js` and `bo-global-quicknav.css`
carried the JS half (rail label panel, panel title header, rail toggle, pin hide) while `reports.css`
still carried all 32 slide-out rules — so the rail slid out on hover again *and* the JS painted the
collapsed-state panel beside it. Two sessions editing one working tree is what made this possible:
the second session's hygiene (never commit files another session is holding uncommitted) is correct
in itself, and it fired on the only copy that existed.

**Recovered** from the pre-revert commit: `git show a40a9b2d:<file>` held the finished versions, and
the deltas re-applied onto `origin/main` cleanly (8 of 9 hunks in `reports.css` applied by `patch`;
the 9th, the 2026-09-03 mini block, had been touched by `f7c81793` — its `font-size:14px` became
`15px` — so that block was re-edited by hand). Restored in four files: `reports.css` (32 → 2
hover rules, the two harmless positioning ones kept), `reports-dashboard-original.css` (the three
2026-07-16 hover rules), `bo-charcoal-legacy.css` (the `display:inline-flex!important` pairs), and
`main-admin-detail-executive.css` (the drawer background/shadow on hover — a gap in the original
pass, not a loss). With them, a scan for every rule class this work removed comes back empty across
`assets/css/` except `agent-portal.css`, which is the Agent Portal's own shell.

**The rule to keep from this:** in a repo where more than one session works in the same checkout,
uncommitted work is not work. Every rail file had to be re-derived from a commit that had swept it up
by accident. Commit the rail changes to the personal branch as soon as they verify — and if you are
the session *finding* another session's uncommitted edits, commit them to a scratch branch (or stash
with a note) before reverting anything; `git stash list` and the four files above are what that costs
when nobody does.

#### Whole-site audit against the deployed build (2026-09-24, owner: “我的sidebar 与当前live的设计逻辑有偏差”)

Owner asked for a site-wide audit against what the **live** site runs, then the fix, a push and a
merge into `main`. Live HTML is 403 (only assets are public), so the audit compared every asset:
`https://bo.titanx7.com/assets/{css,js}/*` for all **253** files, normalised for line endings.

**Comparison method note.** A first pass read the files as bytes and reported **241 of 253** assets as
different — every difference was a few dozen bytes, i.e. live is LF and this checkout is CRLF
(`core.autocrlf=true`). Comparing CRLF-normalised, **only 5 files differ**, and four of them are the
rail restore above (live is *older* there: 32 slide-out rules in `reports.css`, the 2026-07-16 hover
rules in the twin, the hamburger `display` pairs in `bo-charcoal-legacy.css`, the drawer hover shadow
in `main-admin-detail-executive.css`). So the owner's “偏差” is exactly this: the deployed build still
slides the collapsed rail out, while the JS half (rail toggle, panel title, rail label, pin hide —
`auth.js` + `bo-global-quicknav.css`, byte-identical to live) is already deployed. **Landing this
branch is the fix.**

**The fifth file ran the other way, and is the same failure mode in reverse.**
`main-report-charcoal.css` on live carries **six selector lines the repo never had**
(`.report-sidebar .nav-group-btn.active` and its `::before`/`i` partners, light and dark — the
“current group row” highlight added to the sibling sheets by `a0179fe5`). `git log --all -S` finds them
in no commit and no branch: they were deployed from a working copy and never committed, exactly like
the rail work was. Local now adopts live's content for that file (normalised diff = those six lines
only, so nothing else rode along).

**Audit result across the site** (150 pages carry the rail; every page's family checked against the
rule set it loads):

| Family (sheets) | Pages | Loads `auth.js` | Collapsed-rail logic |
| --- | --- | --- | --- |
| Base + `bo-charcoal` | 87 | yes | unified ✓ |
| Base + `main-admin-detail-page` | 25 | yes | unified ✓ |
| Base only | 11 | yes | unified ✓ |
| Base + `menu-permission-page` | 4 | yes | unified ✓ |
| Twin sheet (index / member-detail / online-users) | 3 | yes | unified ✓ |
| base + brand / dashboard / livechat / menu-mgmt / social / layout-section / referral / ad-popup / animation | 9 | yes | unified ✓ |
| Agent Portal (own shell) | 12 | **no** | keeps its own rail + topbar toggle (by design) |
| `_verify-*.html` scratch copies | 4 | **no** | keeps the topbar toggle; no DB menus to paint |

Browser-verified per family (stub-backend harness, real sheets): base (member-deposit), twin+charcoal
(online-users), main-admin-detail (main-merchant-security), main-dashboard, provider family
(main-provider-health), report family (main-win-lose-report, where the recovered
`.nav-group-btn.active` gradient was confirmed applied), livechat. Every one: rail **72px** on hover,
no drawer shadow, `z-index:1040`, rail toggle present, topbar hamburger hidden, panel opens with its
title and 13px items.

Harness note for future audits: the stub's `/auth/admin/me` regex must survive being written through a
shell heredoc — a lost backslash there (`/auth/admin/me/` instead of `/auth\/admin\/me/`) silently
stops intercepting the call, the page gets a real 401 and logs itself out to `login.html`, which reads
exactly like “this page has no sidebar”. Four pages were mis-diagnosed that way before the regex was
printed back.

#### Follow-up audit: does the collapsed rail move on hover anywhere? (2026-09-24)

Owner: “继续审核sidebar收起后还会自动展开问题”, with a screenshot of the **deployed** site
(`bo.titanx7.com/dashboard.html`) whose rail was expanded on hover — that is the pre-merge build, and
the merge above is the fix (see the deploy gap below). The follow-up asked the harder question: with
the width rules gone, does anything else still make the collapsed rail *react* like an expander?

**Static sweep.** Every rule in `assets/css/` whose selector mentions the sidebar and `:hover` /
`:focus*` / `.is-mini-hover` / `:has()`, checked for any `width` / `max-width` / `min-width` that is not
`--rail-w`: the BO has **none** left. The only hits are `agent-portal.css` (the Agent Portal's own
shell, which already pins its 72px rail on hover) and the `:not(:hover):not(.is-mini-hover)` collapsed
rules that were kept deliberately. The same sweep over every page's **inline `<style>`** found exactly
one real leftover, below.

**The leftover was on the dashboard shell** (`dashboard.html`, its own inline block):
`body.sidebar-mini .report-sidebar:hover .dashboard-sidebar-brand > div{display:block!important;
opacity:1!important;visibility:visible!important;width:auto!important}` — the brand row's text
(“Backoffice / Admin Panel”) resurrected itself on hover *inside* the 72px rail, clipped. It never
changed the rail's width, but it is the one place the collapsed rail still visibly reacted to the
pointer, which is what “自动展开” describes. Both reveal rules are now scoped to
`body:not(.sidebar-mini)`, so they still apply in the expanded rail (where the text is visible anyway)
and never fire in the collapsed one. `dashboard-mini-hold` and its script are left in place: that block
forces the collapsed width and hides the same reveals, so it is now redundant but harmless.

**Dynamic sweep** (stub-backend harness, 1400×880, each page rested → hover the toggle → hover the
first row): rail width, `.report-main` margin, nav label `font-size`, brand visibility, toggle `x`,
rail `box-shadow` — measured identical in all three states on `dashboard.html` (its own shell),
`index.html` (twin sheet), `member-deposit.html` (base), `livechat.html` and
`main-merchant-security.html` (main-admin-detail family). The only thing that changes is the panel or
rail label appearing, which is the intended hover response.

**Deploy gap, still open at the time of writing.** The four restored sheets are only in `main`; the live
assets still hash to the pre-merge versions (`reports.css 9b0bb6de`, twin `ff6b5448`,
`bo-charcoal-legacy ae99f4cf`, `main-admin-detail-executive 0bfec462`), so the owner will keep seeing
the old hover-expand on `bo.titanx7.com` until a deploy from `main` happens. That is the one step this
audit cannot do: the repo's own rule is that the server is a deploy target, not a workstation.

### The rail toggle appeared twice on every load (2026-09-28, owner: “sidebar的收起按键会闪烁出现两次”)

Owner, switching the Provider section tabs (Providers → Settlement → Activity Logs): “那个sidebar的收起
按键会闪烁出现两次”.

**It was one control, painted twice in sequence.** The pass above moved the toggle into the rail and
retired the topbar hamburger with a rule in `bo-global-quicknav.css` — a sheet `auth.js` injects *inside*
`renderSidebar()`, i.e. only after `/me` → `menu-groups` → `/ui-setting` had all returned. The topbar
hamburger is static markup that `reports.css` shows (`display:inline-flex`), so on every load the visible
control was the topbar one until that chain finished; then it disappeared and the same button — same
`bi-list` chip, same cream fill, ~200px to the left — reappeared in the rail. Measured with a 25ms
sampler against a stubbed backend (both API hops given a realistic 1.2s RTT): topbar chip visible
94–1326ms, rail chip from 1357ms, and **no frame ever showed both**, which is why it read as a flicker
rather than a duplicate.

**Site-wide, not a Provider-family bug.** 130 of the 153 real pages carry that exact markup shape
(`report-body` + `reports.css` + `auth.js` + topbar hamburger + no rail chip in markup), and the sampler
found the same sequence on `admin-user`, `index.html` (no `reports.css`), `layout-section.html` (no
`bo-ui-standard.css`), `menu-management.html` and the agent-shell pages. The Settlement tab is only where
the owner noticed it. `dashboard.html` was the one page that never flickered — its chip is in its markup
and its values in the page's own `<style>`; every other page got the button from JS.

**Fix: a mount and a guard that do not wait for the menu data.** `mountSidebarToggle()` in `auth.js`
injects the sheet and mounts the rail chip at boot, before the round trip — idempotent, still called by
`renderSidebar()` for a sidebar that appears later, and no longer requiring `.report-nav` to exist. The
guard (`body.report-body:not(.agent-modern):not(.dashboard-shell) .report-topbar .hamb{display:none}`,
`min-width:992px`) and the chip's own values are restated in `reports.css` and `bo-ui-standard.css`,
because only a sheet already in the cascade at first paint can retire the topbar copy from the first
frame. Both sheets carry it: `reports.css` misses `index.html`/`member-detail.html`/`online-users.html`,
`bo-ui-standard.css` misses `layout-section.html`. Values stay in sync with the canonical copy in
`bo-global-quicknav.css`, which remains the runtime backstop.

**Consequences, deliberate:**

- **The Agent Portal keeps the topbar control.** The guard is scoped `:not(.agent-modern)`; those twelve
  pages boot no `auth.js`, so the rail chip never exists there. Verified with two probe pages that differ
  only in `<body>` class: `agent-modern` → hamburger `flex`, plain BO → `none`, no `report-body` → `flex`.
- **This reverses the 2026-09-24 reasoning for keeping the hide out of `reports.css`.** The four scratch
  `_verify-*` copies boot no `auth.js` either, so on desktop they now show neither control. They are
  screenshot scaffolds, not deployed pages; `agent-modern` on their `<body>` restores the old behaviour.
- The sidebar **menu** still arrives after the DB round trip — `auth.js` documents why (menus must come
  from the DB). Only the button stops changing place.
- Below 992px nothing changes: the guard is inside `min-width:992px`, the injected sheet hides the rail
  chip there, and the topbar hamburger stays the drawer's opener.

**Verified** (25ms sampler, 10 pages; re-checked after the change):

| Page | Topbar chip, before | After |
| --- | --- | --- |
| `main-provider-credentials.html` (Settlement) | 94–1326ms | **never**; rail chip at 177ms |
| `main-provider-detail.html` / `-health.html` | 59–856ms | **never**; 57 / 63ms |
| `admin-user`, `index`, `layout-section`, `menu-management` | 131–1402ms / 229–933ms | **never**; 153–240ms |
| `agent-management.html` (agent shell, boots `auth.js`) | same shape | **never**; 162ms |
| `dashboard.html` | never | never (unchanged) |

Samples showing both controls: **0** on every page. Functional: rail chip click → 72px rail +
`bo_sidebar_mini=1`, click again → 260px + `0`; chip is `#383A46`/`#F5F5F4` in dark; at 480px the rail
chip is hidden, the topbar opener is visible and its handler opens the drawer (`.show` +
`body.sidebar-open`); two consecutive `renderSidebar()` calls still leave exactly one chip.

**Pins:** `reports.css`, `bo-ui-standard.css` and `auth.js` re-stamped
(`stamp-asset-pins.py --check` clean). The same run refreshed `main-admin-detail.js` and
`main-provider-detail.js`, which had drifted before this pass.

### 8. Report regularised — items 8.1 … 8.11 (2026-09-22, owner request)

“把图里的 8. report 从8.1至8.11 重新整顿一遍”. Eleven pages, brought onto the locked chrome
through a shared marker layer: `body.bo-report-family` + `assets/css/bo-report-family.css`,
linked LAST. Nothing repaints until a page carries the marker, so the blast radius is exactly
those eleven pages — the same opt-in mechanism as `bo-charcoal`.

Pages: `casino-overview-report`, `casino-deposit-withdraw-report`, `casino-breakdown-report`,
`casino-bonus-report`, `casino-provider-winloss-report`, `promotion-report`, `transaction-report`,
`win-lose-report`, `agent-performance-report`, `highest-turnover-games`, `frequently-played-games`.

**Measured before → after (1440px, both themes).** Every value below was read from
`getComputedStyle` on the real page, not inferred:

| Item | Before | After |
| --- | --- | --- |
| Table footer (`“Showing X to Y of Z”` + ladder) | `display:block`, **no hairline**, slots stacked, on 6 pages | `flex`, 1px hairline, info flush left, ladder flush right (16px = the padding) |
| Filter controls | 42px tall, radius 10–11px | **36px / 8px** |
| Injected `Date Range` label | `display:block` on 7 pages | hidden |
| `table-layout` | `auto` on 9 pages | **`fixed`** |
| thead corners | 11px radius | **square** |
| Body cells | 12px / 400 | **13px / 700** |
| Zebra | odd `#FFF8EB` but even **`#FFF3E0`** (legacy), and *none at all* on `agent-performance-report` | odd `#FFF8EB` / even **`#FFF1DC`**; dark `#3A3C48` / `#434653` |
| Pager | prev/next-only on 3 pages | **First · Prev · window(± 2, 1+last, ellipsis) · Next · Last**, active = amber gradient, no shadow, rungs 36×36 |
| Page size | in the filter row | in the footer (`- · 10 · 20 · 50 · 100 · All`) |

**Four traps this pass found, each measured:**

1. **The scroller’s layout half lives under a body class these pages do not carry.**
   `.mad-footer` / `.mad-footer-right` / `.mad-pager` are laid out in
   `main-admin-detail-executive.css` under `body.main-admin-detail-page`; `bo-charcoal-shell.css`
   only colours them. So building the markup contract correctly produced a *stacked, hairline-less*
   footer — the pages got worse before they got better. Six pages were in that state until the
   layout was restated in the family sheet. **A component whose markup and layout are owned by
   different files migrates as two halves; shipping one half is a regression, not progress.**
2. **Two ID-level `:not()` steps are not automatically enough — count the class-level weight.**
   `.bo-filter-row`’s geometry is guarded by `bo-ui-standard.css`’s "final authority layer"
   at **(2,6,2)** with `!important`. The first family rule matched its ID shape but reached only
   **(2,5,2)** — it lost by one class-level, which is invisible when reading the selector and
   obvious when you print both. The fix carries three extra body classes every one of these pages
   has, to reach (2,8,2). The same layer also hard-codes `42px`, so redeclaring
   `--bo-filter-height` / `--bo-filter-radius` / `--bo-control-height` on `<body>` is the *other*
   half of the fix: a token override needs no contest at all.
3. **The zebra layer loses to the legacy even-row fill, and one page had no stripe at all.**
   `bo-charcoal-legacy.css` paints odd `#FFF8EB` / even `#FFF3E0` at (0,6,5); `bo-table-zebra.css`
   sits at (0,6,4) and therefore never applied its even value. Two agents disagreed about this on
   inspection (one predicted zebra wins, one predicted legacy); injecting rows and reading the
   computed colour settled it — even rows were `rgb(255,243,224)`. `agent-performance-report.html`
   measured odd and even **identical**, i.e. no zebra whatsoever, which no static reading showed.
   **When two rules are within one class-level, measure — reading selector text is not enough.**
4. **A page can be malformed enough that markup edits silently no-op.**
   `casino-overview-report.html` has **no `</head>`** — the last `<link>` is followed directly by
   `<body>`. An insertion keyed on `</head>` refuses on that page (the script declined rather than
   writing somewhere wrong); its stylesheet link goes before `<body>` instead. Worth knowing before
   any future sweep assumes every page has a closed head.

Also worth recording, because it makes the diff safe rather than noisy: these eleven pages are
**LF in the index** while `core.autocrlf=true`, so the working tree is expected to hold CRLF. Two
agents normalised their files to CRLF and one insertion added a bare LF — git reports all six as
"LF will be replaced by CRLF", meaning it normalises them itself and the diffs stay content-only
(the largest page diff is 29 lines, not a whole-file rewrite). `git diff --numstat` is the check:
a whole-file count means an encoding accident, a handful of lines means the edit is real.

**Left deliberately, not overlooked:**

- `win-lose-report.html` **is a duplicate of `main-win-lose-report.html`** and is still in place.
  `auth.js:158-159` maps both filenames to the same sidebar title, `:379` admits both to the same
  permission rule, and `:529-540` injects `main-win-lose-report.html` when neither is configured —
  so which one opens depends on the DB menu row, and neither file can be deleted from here. They
  are also **different reports**: `win-lose-report.js` renders per-member rows from
  `WIN_LOSE_REPORT_LIST`, `main-win-lose-report.js` renders per-merchant rows with provider
  breakdowns. Both were brought to the same chrome so either is presentable; the duplicate itself
  is the owner’s call.
- `casino-overview-report.html`’s **`Commission` tile is hardcoded `0.00`** — no `id`, and
  `casino-report.js` never writes it because the summary payload carries no commission field.
  Not faked; it needs an API value.
- The two games pages have **no date control**, and `player-game-ranking.js` has never sent a date
  range (the request is `page/size/search/providerCode` only). One was not invented: that would
  guess a query contract. If the endpoint accepts `from`/`to`, the locked picker drops in.
- `transaction-report.html` keeps its own `bo-pagination-standard` class, so its footer resolves to
  `grid` rather than `flex` — the same two-slot order and the same 16px flush right, so it is
  cosmetically identical, and one rung measures 40×36 rather than 36×36.
**Two more defects found only by rendering the page with data (2026-09-22, owner report).**
The owner said the pages looked unchanged. They were looking at a *measurement harness*
(`.tmp-v-*.html`, auth stripped, no data) rather than the page — but rendering the real page
with a stubbed payload exposed two defects that every computed-style check had passed:

- **The table scrollbar was the raw OS default.** `scrollbar-color: auto`, thick grey, with the
  arrow buttons. `reports.css` styles `.table-wrap::-webkit-scrollbar` for the horizontal axis
  only (9px, cool track), and the warm pill in the tree is scoped to `.user-management-page`, so
  nothing reached these pages. Now the locked **Panel pill** recipe: webkit-only, 6px, light
  `#8B6B4A` / hover `#5C4A30`, dark `#F59E0B` / `#D97706`, `::-webkit-scrollbar-button` removed,
  with a `@supports not selector(::-webkit-scrollbar)` branch for Firefox. The standard
  properties are deliberately **not** written for WebKit: once `scrollbar-color` is set Chromium
  ignores the webkit rules and paints OS arrows, which is the trap already recorded under Panel
  pill scrollbar.
- **`table-layout:fixed` + `width:100%` clipped the last column.** The locked listing frame wants
  `fixed`, but with no floor the ten-column ranking tables shared the panel width and the
  `LAST PLAYED` header and its cells were **cut mid-value at the panel edge** — a regression this
  pass introduced, invisible to every colour/geometry check because no property had the wrong
  value; the *column* had the wrong width. Fixed with a width floor keyed on the real header count
  (`:has(thead th:nth-child(10))` → `min-width:1120px`, `:nth-child(14)` → `1520px`) so
  `.table-wrap` scrolls sideways — the locked frame’s behaviour — instead of losing content.
  Measured after: table 1120px in a 1091px wrap, `scrollWidth > clientWidth`, every column
  reachable.

**The lesson, and it is the same one twice in one pass:** computed style answers "is this property
right", not "does this look right". A `fixed` table with the correct `table-layout` value, the
correct zebra colour and the correct cell weight was still **unreadable**, because the defect was
a *width* and a *scrollbar*, and neither shows up as a wrong colour. **Render the page with real
data and look at it** — a four-agent static audit plus a full computed-style matrix both missed
these.

**Still open, and named as such rather than quietly dropped:** the *page-level* scrollbar (far
right of the viewport) is still the OS default. It is not this family’s to change — it belongs to
every page of the app, so it needs one repo-wide decision, the way `bo-table-zebra.css` was made
a shared layer. **Closed 2026-09-25** — see “One scrollbar palette, site-wide”: the decision is the
house pill, in `assets/css/bo-scrollbar.css`, linked from every page. Also still open: the footer’s `Show N entries` select stays a native `<select>`
because `bo-ui-standard.js` only upgrades selects inside `.bo-filter-row`, so it does not get the
Role-select cream chrome.
**Third defect from the same render (owner report: “日期外围有一个很丑的border”).** The date
control sat inside **three** nested frames. Walking the ancestor chain with `getComputedStyle` on
the real page:

| frame | surface | border | radius |
| --- | --- | --- | --- |
| `.filter-card` | `#FFF8EB` | 0.8px `#EADCC8` | **16px** |
| `.mad-filters.user-search-grid.bo-filter-row` | `#FFF8EB` | 0.8px `#EADCC8` | **0px** |
| `.bo-range-trigger` | `#FFF8EB` | 0.8px `#EADCC8` | 8px |

The middle one is the offender: a square-cornered duplicate of the card’s own surface, drawn
immediately inside the rounded card, so the eye reads a stray rectangle around the date field.
It is not a bug in the date control — the picker driver and the control were both correct.
It comes from `bo-charcoal-legacy.css`:
`html:not([data-bo-theme="dark"]) body.report-body.bo-charcoal:not(.user-management-page) .user-search-grid{background:#FFF8EB;border:1px solid #EADCC8}`
— a rule written for the pages where that row **is** the filter card. On these eleven it sits
inside one, so the row must own layout only and let the card own the surface and the border.
Added to the family sheet at the ID weight (`#bo-report-family-off` / `#bo-charcoal-off`).
Measured after: `.bo-range-trigger` and `.filter-card` are the only two frames left in the chain.

**Pin bumped in the same pass:** `bo-report-family.css` 1.0.0 → **1.0.1** on all eleven pages.
Every one of the three fixes above landed in a file whose URL had not changed, which is the
documented way for a fix to be verified and still reported as “no change” — the browser keys its
cache on the full URL, so an edited sheet under the same `?v=` is exactly the failure mode this
file warns about twice. The fixes were correct and invisible.
**8.2 Deposit / Withdraw Report — two more, one of them mine (2026-09-22, owner report “设计也是跑偏了”).**

- **The table headers overlapped.** Fourteen columns (`Date`, then Approved / Pending / Failed
  × Count / Amount for Deposit and Withdraw, then Net Cash Flow) drawn on top of each other,
  because this pass had set `table-layout:fixed`: with no explicit column widths, `fixed` splits the
  panel evenly, so a 14-column table got ~108px per column while `Deposit Approved Members` needs
  ~180px — and `reports.css` sets `white-space:nowrap` on those cells, so the text did not wrap,
  it **collided**. These tables were `auto` before this pass. **A width floor is not a fix either:**
  the first attempt added `:has(th:nth-child(10)){min-width:1120px}` / `:nth-child(14){1520px}`, and
  the required width depends on the header *text*, not on the column count, so any single number is
  wrong for some page. The family sheet now pins `table-layout:auto` and the floor rules are gone:
  columns take their content width and `.table-wrap` scrolls sideways. Measured after: `auto`,
  **zero** headers with `scrollWidth > clientWidth`, table 2359px inside a 1570px wrap.
  **This is a deliberate, measured deviation from DESIGN.md’s listing frame (`table-layout:fixed`)**
  and it applies only to `body.bo-report-family`: `fixed` is right for a table whose columns carry
  known widths and wrong for a dense report table that has none.
- **The footer’s page-size control stacked on three lines.** The markup is
  `<label class="cr-page-size-label">Show <select>…</select> entries</label>`, and `reports.js`
  upgrades that select into a **block** `.rounded-select-wrap` — being block, it broke the label’s
  inline flow, so the rendered control read `Show` / `[select]` / `entries` down the side of the
  footer while the ladder sat beside it. Fixed by making the label (and `.entries-control`) a flex
  row. Measured after: label height **40px** in one row, right slot 40px, text and select on the same
  line.
- Pin **1.0.1 → 1.0.2** on all eleven pages in the same pass, for the reason recorded immediately
  above — this is the second time in one session that a fix landed in an already-published URL.

**The pattern worth naming, now three times over:** every one of these defects was a *layout* defect
that no property-value audit can see. A table with the correct `table-layout` value can still have
overlapping headers; a `<label>` with the correct font can still stack; a filter row with the correct
background colour can still draw a duplicate frame. Computed style answers “is this declaration
right”; only **rendering the page and looking at it** answers “is this readable”.
- The subagent pass touched only page HTML and page-family JS; the one shared file edited is the
  new `bo-report-family.css`. No existing shared stylesheet was modified for this work.

**8.3 Win/Lose Report — three owner requests (2026-09-22, owner report with a screenshot of
`win-lose-report.html`).** “1. 调整日期设计与其他container的对齐 2. 搜索按键我觉得没必要了 通常选中那些选项就自动
输出数据了 3. table设计要优化去参考统一其他页面”.

- **The date control did not align with the select containers, and the `select` rule was already
  correct.** `reports.js` hides the native `<select>` inside a `.rounded-select-wrap` and paints a
  `.rounded-select-btn` trigger in its place. The family sheet pinned the *native select* to 36px —
  which it was — but the **visible trigger** is owned by three other files and none of them agrees
  with this row: `reports.css` pins `42px` on `.rounded-select-btn` (twice, one `!important`),
  `bo-charcoal-primitives.css` pins `40px!important` at (0,3,3), and `bo-ui-standard.css`'s authority
  layer pins `42px!important` on the hidden select at (2,6,2). So the trigger stayed 42px while the
  date trigger resolved to 36px; `.bo-filter-row` is `align-items:flex-end`, so the two shared a
  bottom edge but not a top one — measured **213→255 against 219→255**, i.e. every select in the row
  sat 6px higher than the date field, which is exactly what the screenshot shows.
  **A check of the `select` rule alone cannot find this**, because the `select` rule was already
  right; the wrong value lives on the element the row actually shows. Fixed by adding
  `.rounded-select-wrap` / `.rounded-select-btn` to the family control group. Measured after: all
  five controls 36px at `y=213` in both themes.
- **Search removed; every filter applies itself.** The button is gone from the markup and
  `wlSearch` from the script. `wlCategory`, `wlProvider`, `wlVip` and the date range each reload on
  `change`, and Reset reloads too. The range picker commits by dispatching `change` on `wlFrom`
  **and** `wlTo` in the same task, so the reload is deferred one tick and collapsed — without that,
  one date pick fires two identical requests. Verified with a `fetch` spy: one change → exactly
  **one** request, with `page` reset to 1. (The first measurement read “4 requests per change”
  because each of my own `evaluate` calls had stacked another `fetch` wrapper around the last one;
  the spy must be installed once, or it counts itself.)
- **Table brought onto the locked listing recipe** — the same one `transaction-report.html` (8.7)
  already carries, i.e. the front-end reference the owner meant by “统一其他页面”. The ten other
  family pages measured **identical to each other** (thead `background: transparent`, `th` padding
  `10px 9px`, tracking `.22px`, no column rules), so “unify with the other pages” could not mean
  “match 8.1/8.2” — they already matched. The flat head was never a decision either: `reports.css`
  gives `.standardized-listing-page .report-table thead th` a `#F5EBDC` fill and
  `bo-charcoal-legacy.css` then kills it with `background:transparent!important` at (0,4,3). The
  family sheet now carries the locked `--bo-table-head` values: head `#FFE8CC` / text `#6b360c`
  (dark `#1F2128` / `#E7E5E4`, the head **deeper** than the body), `11px/700`, uppercase, tracking
  `.04em`, sticky, plus the soft column rules and the 16px first/last cell inset.
  `.transaction-report-page` is `:not()`-excluded: it already implements this recipe, including a
  deliberate `position:static` on its head that these rules would have undone.
- **The card's 18px padding is gone, and the first column now lines up with the row above it.**
  With `18px` on `.table-card` and `9px` on the first cell, the first column's text started at
  **307px** while the filter row above it starts at **295px** — the table looked inset against the
  card it sits in. The locked frame owns the border, not the inset, so the card is `padding:0` and
  the first/last cell carries the 16px inset: measured **296px against 295px**. Interior chrome
  (`user-toolbar`, `perf-table-head`) keeps its own `12px 16px` inset so no badge touches the border,
  and the head bar and footer hairline now reach the card edge like the reference.
- **Trap re-confirmed, and it bit again here:** the first/last-inset rule was first written as
  `padding-left` / `padding-right` longhands. The rule matched, parsed, and carried `!important` at
  nominally higher specificity — and the computed value **stayed `12px`**, losing to the base rule's
  `padding` shorthand. Restating the inset as the full **`padding` shorthand** on a rule carrying a
  third ID guard fixed it. **When an `!important` rule matches and does not apply, stop counting
  `:not()` weight by hand and restate the property in the same form as the rule that is winning.**
- Pin **`bo-report-family.css` 1.0.6 → 1.0.7 on all eleven pages** and `win-lose-report.js`
  1.0.4 → **1.0.5**, for the reason this file records three times already: a fix that lands in an
  already-published URL is verified and still reported as “no change”.

**Deliberately left:** `.table-card` / `.filter-card` still resolve to **16px** radius, not the
locked panel's `8px` — `reports.css` pins both as a pair at (2,2,2) with `!important` and they are
consistent with each other, so changing one alone would look worse. `agent-performance-report.html`'s
injected `.bo-filter-search-button` is still **42px** in a 36px row (the same 6px defect on a control
the owner did not ask about); and the table body's dark cell colour resolves to `#D4D4D8` rather than
the locked `#F5F5F4` — both pre-existing, both outside this request.

### Sidebar flyout — 8.11 unreachable, and the panel jumped under the cursor (2026-09-22)

Owner, with a screenshot of the open 8. Report flyout: “我sidebar 看report 展开后 无法点到 8.11
能不能帮我处理一下 也不要 乱我的光标乱跳 导致点不到其他的页面 比如 8.1”.

**The cap the flyout JS computes was being thrown away by an `!important` rule in another sheet.**
`positionSidebarFlyout()` in `auth.js` measures the room below its own row and writes
`list.style.maxHeight = cap`. `reports.css` pins the same element with

```
.report-sidebar .report-nav > .nav-group > .nav-group-list{max-height:calc(100vh - 24px)!important}
```

and **an `!important` stylesheet declaration out-ranks a non-important inline style** — so the cap
was silently discarded. Measured on the reproduced geometry (row at y=571, 1900×950): inline
`547px`, computed **`926.4px`**. The consequences are both of the owner's symptoms, from one cause:

- The panel was permitted to run to `571 + 504 = 1075` in a 950px viewport, so **8.9 / 8.10 / 8.11
  sat below the screen**.
- Because the 504px content was still *shorter* than the 926px allowance, `overflow-y:auto` produced
  **no scrollbar either** — measured `scrollable:false`. 8.11 was neither visible nor reachable.

**And the panel was positioned on the wrong frame.** The cap, the inline write and a possible
top-correction all sat inside a `requestAnimationFrame`, so the panel painted one frame at its
uncapped height and was then shrunk and moved — a visible jump under the pointer. That is the
“光标乱跳”, and it is the mechanism the function's own comment already describes from an earlier
round (“the hover jumped and the panel shut before 8.1 could be clicked”).

**Fix, two files:**

- `assets/js/auth.js` — `positionSidebarFlyout` now computes the cap **synchronously, before paint**.
  Every input is a rect that already exists, so the rAF bought nothing; removing it makes the panel
  paint once, positioned and capped. The cap is also published as a custom property:
  `group.style.setProperty('--bo-sidebar-flyout-max', cap + 'px')`. (The inline write is kept as the
  fallback for any page that does not load the sheet below, but it is the property that wins.)
- `assets/css/bo-global-quicknav.css` — consumes it at a specificity **higher** than the
  `reports.css` rule (both `!important`, more classes):
  `.report-sidebar .report-nav > .nav-group.bo-flyout-hover > .nav-group-list{max-height:var(--bo-sidebar-flyout-max,calc(-24px + 100vh))!important}`.
  The `100vh - 24px` fallback keeps the previous behaviour wherever the JS has not run.

**Measured after** (same reproduced geometry, row 571, 1900×950): property and computed max-height
`367px`, panel `571→938` inside the viewport, `scrollable:true` (content 502px vs client 365px), and
after scrolling all eleven entries are fully in view — `8.11 Provider Report` at y=885. On the real
session (`win-lose-report.html`, row at 260) the cap resolves to `589px` with the panel fitting.

**Two traps worth keeping:**

1. **An `!important` stylesheet rule beats an inline style.** This is the second time in this session
   that a value was "set" and visibly had no effect — the first was the `padding-left` longhand losing
   to a `padding` shorthand. A JS-computed size that lives inline is not a contract; it is a
   suggestion. If the value must win, it has to reach the cascade through something that can win
   (here: a custom property consumed by a higher-specificity `!important` rule).
2. **A `requestAnimationFrame` is not a guarantee.** Diagnosing this needed a probe that could see
   the frame *not* arriving: in the in-app browser renderer rAF never fired at all (`rAF NEVER fired
   within 1.5s`, and the same starvation is why screenshots time out there), which is what exposed the
   deferred write. Geometry that needs no post-layout measurement does not belong in a frame
   callback — deferring it costs one frame of wrong layout at best, and the whole correction at worst.

**Pins bumped in the same pass, for the documented reason (a fix under an unchanged URL is verified
and still reported as “no change”):** `auth.js` 1.0.85 → **1.0.86** on all **130** pages that link it,
and `bo-global-quicknav.css` 1.1.2 → **1.1.3** in both `auth.js` injection sites plus
`menu-management.html`. Note the second one as a reminder: `auth.js` injects that sheet with a
**hardcoded** version string, so editing the sheet does nothing until that string moves.

**Correction to the reproduction method, recorded because it cost a false result:** several tabs were
open on the same URL from earlier measurements, and binding “the first tab whose URL matches” picked
one still running the **pre-fix** `auth.js` — which showed the property empty and read exactly like
the fix had failed. The in-app browser keeps released tabs visible at the same URL, so a same-URL
match is not identification; bind the tab that was just loaded, or re-navigate first.

### Sidebar flyout scrollbar — the recipe was scoped to 11 pages, not to the sidebar (2026-09-22)

Owner: “欸 我的scroll的设计以及颜色 要统一 而不是现在图里的颜色”, with a screenshot of the open 8. Report
flyout showing a thick grey OS scrollbar with arrow buttons.

**The recipe was right; its scope was wrong.** The locked **Panel pill** scrollbar for the flyout
lived in `bo-report-family.css` under `body.bo-report-family` — so it reached exactly the eleven
Report pages. But auth.js paints the sidebar (and therefore this flyout) on **every** BO page, so on
the other ~130 pages the panel fell back to the raw OS scrollbar. The exact page in the screenshot
does not need to be identified: any page without the marker reproduces it.

**Measured on one identical element, same geometry, from the scrollbar's own layout gutter**
(`offsetWidth − clientWidth`, which is *how wide the scrollbar Chromium actually reserved* — the
cheap way to tell a styled scrollbar from the OS one without a screenshot):

| scope | gutter | what paints |
| --- | --- | --- |
| with `bo-report-family` | **7px** | locked 6px pill + 1px border |
| marker absent (every other BO page) | **17px** | OS scrollbar, thick grey, arrow buttons |
| dark theme (with marker) | **7px** | locked pill |

**Fix — the sidebar's scrollbar moved into the sidebar's own layer.** The recipe now lives in
`assets/css/bo-global-quicknav.css` (injected by auth.js on every sidebar page) as
`.report-sidebar .nav-group-list:not(.rounded-select-menu)`, same locked values: webkit-only, 6px,
light chocolate `#8B6B4A` / hover `#5C4A30`, dark `#F59E0B` / `#D97706`, arrows removed. The copy in
`bo-report-family.css` is **deleted, not duplicated** — every page that loads that sheet also loads
this one, and a second copy would drift. The `@supports not selector(::-webkit-scrollbar)` branch is
kept for Firefox and must stay: setting `scrollbar-color` for WebKit makes Chromium ignore the
`::-webkit-scrollbar` rules and paint OS arrows, the trap already recorded under Panel pill scrollbar.

**Measured after:** gutter **7px** on a family page, on a page with the marker removed, and in dark
theme — one scrollbar, three scopes.

**The gate that would have caught this, now the cheap default for scrollbar work:** assert the gutter,
not the rule. Reading the stylesheet said the recipe was correct, and it was; the defect was *which
pages it reached*, which only the element's own reserved width reveals. It is one number, needs no
screenshot, and works in a renderer that never composites.

**Pins bumped in the same pass** (the reason is recorded twice above — a fix under an unchanged URL is
verified and still reported as “no change”, and it bit again here: after moving the recipe, the
non-family scope still measured 17px because `bo-global-quicknav.css?v=PIN` was cached):
`bo-global-quicknav.css` 1.1.3 → **1.1.4** (auth.js ×2 and `menu-management.html`), `auth.js`
1.0.86 → **1.0.87** on all 130 pages, and `bo-report-family.css` 1.0.7 → **1.0.8** on the eleven —
the last one because that sheet had rules *removed*, and a stale copy would keep applying them.

### One scrollbar palette, site-wide — and the page-level bar joins it (2026-09-25)

Owner: “全站main/bo 的scrollbar颜色要统一”.

**The palette was never in doubt; four others had grown beside it.** A linear scan of every sheet
plus every page's inline `<style>` (494 scrollbar rules — *not* a regex: `bo-charcoal-legacy.css`
is 12.7 MB and a `[^{}]*?` pattern over it backtracks for minutes) found the locked **Panel pill**
pair — light `#8B6B4A` / hover `#5C4A30`, dark `#F59E0B` / `#D97706` — alongside four competing
palettes on the same components in different families:

| Beside it | Where | Count |
| --- | --- | --- |
| cool slate `#98A2B3` / `#667085` | `bo-charcoal-primitives`, `provider-session`, `vip-exp/reward-log`, `main-merchant-profit-record`, `menu-permission-executive`, `main-admin-detail-executive`, `bo-wallet-transaction-amber` | 25 rules |
| zinc dark `#A1A1AA` / `#D4D4D8` / `#71717A` | `bo-wallet-transaction-amber`, `main-merchant-profit-record`, `reports.css` | 6 |
| tan `#EADCC8` / `#DCC9A8` | `bo-charcoal-shell`, `main-merchant-detail-executive`, `main-report-charcoal`, `reports.css`, `reports-dashboard-original.css`, `vip-management` | 18 |
| warm grey `#57534E` / `#78716C` | same three sheets, dark branches | 8 |

**The sweep is colour-only, by ROLE, and was verified as such.** 78 declarations across 14 sheets
now state the house pair; widths, radii, borders, arrow rules, `!important` flags and `var()`
fallbacks are untouched, and every declaration was checked to have actually changed (this repo's
trap 5 — `str.replace()` cannot fail). Two bugs in the first pass, both caught by reading the diff
rather than the transform's report: `html:not([data-bo-theme="dark"])` is a **light** rule that
contains the word `dark`, so the first version flipped the family's light thumbs to amber; and the
`@supports not selector(::-webkit-scrollbar)` branches hold a light and a dark rule inside one
block, so judging the block by its last inner selector got half of them wrong. Also excluded:
rules that only declare `scrollbar-gutter`/`scrollbar-width` (a panel reserving a gutter also
declares its own surface `background`, and rewriting that would have painted the panel chocolate),
and `var()`-valued colours — which is not a dodge: all four such vars (`--lc-thumb`,
`--lc-thumb-hover`, `--bo-cyan`, `--bo-cyan-deep`) resolve inside the house palette already, and
the rendered check below covers them.

**The page-level bar was the piece DESIGN.md had left open** (“it belongs to every page of the app,
so it needs one repo-wide decision”): `scrollbar-color: auto`, default width, **OS arrows**, on every
BO and Main Portal page — measured, not assumed. It now has the house pill in a small shared layer,
`assets/css/bo-scrollbar.css`, linked from all **150** real pages (the four that are meta-refresh
shells have no CSS at all, so they are excluded, and `backup_provider.html` is a fragment with no
`<head>`). The file carries three things: the document scroller, a `*` **fallback** for anything no
family sheet has coloured — a fallback, not an override: every family rule out-specifies it, and a
deliberately hidden bar still hides because `scrollbar-width:none` is a standard property — and the
Firefox branch under `@supports not selector(::-webkit-scrollbar)`, never `scrollbar-color` for
WebKit (Chromium would paint OS arrows and ignore every `::-webkit-scrollbar` rule).
`::-webkit-scrollbar-button:single-button` is in there beside the plain variant, because the plain
one does not cover Chromium's single-button state (the trap from the “scrollbar corner” note above).

**Verified by rendering, both themes, on 23 page renders** — every changed sheet measured on a page
that actually loads it (`account-lock`, `bank-deposit-usage`, `player-provider-session`,
`vip-exp-log`, `vip-reward-log`, `main-merchant-profit-record`, `main-merchant-balance`,
`main-merchant-create`, `admin-user-create`, `main-admin-role-create`, `index`, plus the earlier
twelve): every scrollable element was forced to overflow and its **effective** colour read —
`scrollbar-color` when it is not `auto`, otherwise `::-webkit-scrollbar-thumb`, since Chromium
honours the former over the latter. Result: **light 149–152 of 149–152 scrollers
`rgb(139,107,74)`, dark the same count `rgb(245,158,11)`, 0 off-palette.**

**The gutter gate, as the note above asks for it** (`offsetWidth − clientWidth`, the width Chromium
actually reserved — 15–17px is the OS bar, 6–8px is the pill): **no scroller anywhere in the sample
reserves more than 11px.** 134 non-root scrollers in each theme: 94 at 8px (6px pill + two 1px
borders), 17 at 6px, 12 at 0px (deliberately hidden), the rest the family's locked 9/10px horizontal
bars. Before/after of the page bar, same page and viewport, produced by disabling only this one
sheet: OS grey with up/down arrows → 6px chocolate pill, no arrows, no track lane.

**Two things this pass deliberately did not touch.** The hidden sidebar (`scrollbar-width:none`) stays
hidden — that was an owner decision, not drift — and the six pages that load neither `reports.css`
nor `bo-ui-standard.css` keep an OS-width sidebar scrollbar, which is a *visibility* difference, not
a colour one; the new layer colours it but does not hide it.


### 8.1–8.11 viewport-locked — the table header now stays put (2026-09-22)

Owner: “我的report 8.1 至 8.11 的页面所有设计 需要做到像图二那样 而且我table scroll down的时候
table header要定死 只能scroll里面的数据”. 图二 is the User Management listing (`index.html`).

**The header could not be pinned because there was nothing for it to stick to.** `position:sticky`
was already on these `th` (section 14), and it was inert: `reports.css` leaves `.report-shell` at
`min-height:100vh` and `.report-content` as plain block flow, so the **document** grew with the row
count and the whole page scrolled — the header scrolled away with it, and a sticky element inside a
non-scrolling box does nothing no matter what its own declarations say.

**Fix — the locked frame `system.md` already documents as “Fixed frame (locked — Admin Detail)”, the
one `index.html` uses**, added to `bo-report-family.css` as section 15:

| Part | Value |
| --- | --- |
| `.report-shell` | `height:100dvh` · `overflow:hidden` |
| `.report-main` | `100dvh` · flex column · `overflow:hidden` |
| `.report-content` | `flex:1` · `min-height:0` · flex column · `gap:16px` · `overflow:hidden` |
| KPI strip / `.filter-card` | `flex:0 0 auto` (they keep their height; the table takes the remainder) |
| `.table-card` | `flex:1` · `min-height:0` · flex column (keeps its own `padding:0` / `overflow:hidden` from section 14) |
| `.table-wrap` | `flex:1` · `min-height:0` · `overflow:auto` — **the only scroller** |
| `.mad-footer` | `flex:0 0 auto` — already `margin-top:auto`, so it pins to the panel bottom |

The `16px` vertical rhythm is now the flex `gap`, so each card's own `margin-bottom:16px` is zeroed —
otherwise the gap counted twice. **Desktop-only (`min-width:992px`)**: below that the sidebar is an
off-canvas drawer and a viewport-locked panel on a phone is worse than page scroll, so the natural
flow is kept there.

**Measured, `.report-table tbody` filled with 60 rows (1900×950):** the document no longer scrolls
(`scrollHeight == innerHeight`, `scrollY 0`); `.table-wrap` is the scroller (`scrollHeight 2345` vs
`clientHeight 579`); the header's viewport `y` is **283 before scrolling, 283 after 300px, 283 at the
very bottom** while the first row moves **327 → 27**; the last row is reachable at the bottom. On
`casino-deposit-withdraw-report` (the page in the owner's image 1, 14 columns) the header sits at
**163** at the top, mid-scroll and at the bottom.

**Checked at four window sizes** (1900×950, 1900×780, 1440×700, 1280×640) on `win-lose-report` and on
four sibling pages (`casino-deposit-withdraw-report`, `highest-turnover-games`, `transaction-report`,
`agent-performance-report`): in every case `.report-content` keeps a fixed height, the card bottom
stays inside the viewport, nothing is clipped and nothing overlaps the footer. At the tightest size
(1280×640) the filter row wraps to two lines and the table still gets 224px — about four rows — which
is the intended trade: the panel takes the remainder.

**Follow-up from the same render — the scrollbar corner (2026-09-22, owner “优化一下” with the
bottom-right corner of the table ringed).** Adding the inner vertical scroller put two scrollbars in
the same box, and their meeting point is painted by `::-webkit-scrollbar-corner` — which this sheet
**never styled**, so it drew a default block exactly where the owner's red box was. The locked recipe
in `bo-user-management-theme.css` styles that corner, and the family block was also missing two other
declarations the locked recipe carries:

| Missing | Consequence |
| --- | --- |
| `::-webkit-scrollbar-corner{background:transparent}` | a stray block at the bottom-right corner — the owner's red box |
| `::-webkit-scrollbar-button:single-button` (`display:none`) | the plain `::-webkit-scrollbar-button` does not cover Chromium's single-button state, so the up/down arrows keep painting on a 6px bar |
| `background:transparent` on `::-webkit-scrollbar`, `border:0` / `box-shadow:none` / `background-color` on the thumb | the bar could still take a default fill and the thumb a default border |

All three are now mirrored from the locked recipe verbatim for `.table-wrap` / `.table-card`. Measured
after: the corner rule matches the element, and the vertical gutter stays **7px** (6px pill + 1px
card border) — the additions did not thicken the bar. Also re-checked in the same pass that
`.report-shell` gaining `overflow:hidden` does **not** clip the sidebar flyout: it is
`position:fixed`, and `overflow:hidden` on an ancestor clips fixed descendants only when that ancestor
also has a transform/filter/contain. Measured with the flyout open: box fully inside the viewport
(`266 → 606` wide, `260 → 368` tall in a 1500×900 window), cap applied at `558px`.

**Deliberately kept:** the family's `table-layout:auto` deviation (section 4) and its 16px cell inset
(section 14) — this pass changed the *frame*, not the table chrome, which already matched image 2
(cream `#FFE8CC` head, uppercase `11px/700`, column rules, `13px/700` cells). `transaction-report.html`
is not excluded here the way it is in section 14: its own sheet already builds a bespoke two-table
frame from `.bo-tx-table-head` / `.bo-tx-table-body`, and section 15's `.table-card` flex column is
compatible with it — measured, the card ends at 928 inside the 950 viewport with no clipping.

**Pin bumped:** `bo-report-family.css` 1.0.8 → **1.0.9** on all eleven pages.

### 8.1–8.11 — the head is split out of the scrolling box (2026-09-22)

Owner: “我要的是这个呀”, with a write-up of the technique: **表头放在滚动容器外面，所以滚动条只覆盖表体这一段，
表头旁边干干净净**, at the cost of “列宽关系要靠 `table-layout:fixed` 自己维持，两个 table 的宽度必须一致”,
using `scrollbar-gutter:stable` on both sides “不需要任何魔法数字”, and noting the header's reserved gutter must
be filled with the header's background + a bottom border “否则右上角会缺一块”.

That is the shape this repo already ships on the transaction family — a separate head table plus a
body scroller with `scrollLeft` mirroring (`member-deposit.js`, `member-wallet.js`,
`operations-report.js`, `transaction-report.html`). The eleven report pages had the header *inside*
the scroller, so the bar ran the full panel height beside the header and its corner collided with
the card's radius — the artefact the owner first ringed as “优化一下”.

**Built:** `assets/js/report-table-split.js` (new) plus `bo-report-family.css` §16. On ≥992px, for
each `.table-card` in `body.bo-report-family` (excluding `.transaction-report-page`, which owns its
own split), the `thead` is moved into a `.bo-report-head` div above `.table-wrap`; the wrap keeps the
body and stays the only vertical scroller; a `scroll` listener mirrors its `scrollLeft` into the head
container so the wide pages' horizontal scroll still moves the headings with their columns.
Below 992px nothing is split (the page keeps its natural flow and the single sticky-header table),
matching §15's own desktop-only frame.

**Why the widths are derived by the script rather than authored into 11 pages.** The write-up's cost
is that the two tables' widths must be maintained by hand. These tables have 5 to 16 columns each
with no widths authored anywhere, and `table-layout:fixed` **without** widths is the only thing you
get for free — an even split. That is what DESIGN.md already records being measured and reverted:
“`fixed` splits the panel width evenly across the columns… a 14-column table got ~108px per column
and the headers **overlapped**”. Hand-writing 11 sets of percentages cannot be checked by looking at
the page, and getting one wrong is a visibly truncated heading. So the script measures instead: it
asks each table for its natural per-column widths (`width:max-content`), takes the **per-column max
of the header row and a body row**, scales every column by one factor to fill the card when the
content is narrower than it, and applies the result as a matching `colgroup` + `fixed` + `width` to
**both** tables. Identical by construction, content-driven, re-derived on resize and whenever the
body re-renders (a `MutationObserver` on the `tbody`).

**Measured, win-lose-report (1500×900):** head row at `y=282`, wrap starting at `y=327` — the bar
covers the body only; header `y` **282 before, 282 after scrolling the body 300px, 282 at the
bottom** while the first row moves `328 → -72`; both tables `1195px` in a `1195px` wrap (fills, no
horizontal scrollbar — same as before the split); column left edges identical between head and body;
0 truncated headings; page still doesn't scroll. **casino-deposit-withdraw (14 columns):** both tables
`2525px`, columns identical, edges aligned, 0 truncated headings (it keeps the horizontal scroll it
always had), and scrolling the body 150px moves the head to 150 — the mirror works.

**Three measurement traps this cost, each of which produced a wrong number before it was caught:**

1. **The body row alone truncates the headings.** With the header split out, the body table no longer
   knows how wide its own headings need to be. Deriving widths from a body row truncated **twelve**
   headings on the 14-column page (`Deposit Approved Members` → `Deposit Appr`). The fix is the
   per-column max with the header row — which is what the single table's `auto` layout computed, since
   the heading row *was* one of its rows.
2. **The empty/loading state is a single `<td colspan>` row.** Its one measured cell is the *full row
   width*, and taking it as column 0's need pinned column 0 to the whole card — measured columns
   `[1195, 235, 191, …]`, a **2296px table in a 1195px wrap**, on a page that had no column widths to
   begin with. The script now skips any body row that does not have one cell per column and falls back
   to header-only widths, which is exactly right while the data is loading.
3. **`min-width:100%` makes a "natural" measurement anything but.** `reports.css` pins
   `.report-table{min-width:100%}`; left in place it floors the table at the container width, so
   `max-content` returns the *filled* distribution. Max-ing two filled distributions then exceeds the
   container — measured a 1352px table in a 1195px wrap, i.e. a pointless horizontal scrollbar
   appearing on a page that filled its card before. The measurement now neutralises `min-width` and
   `max-width` as well as `width` and `table-layout`.

The pattern in all three: **the numbers were only wrong in states I did not think to measure** — the
loading state, the wide page, and the stylesheet's own floors. Each was found by asserting a specific
value (columns identical, no truncation, table width == wrap width) rather than by reading the code.

**Pins:** `bo-report-family.css` 1.0.10 → **1.0.13** (eleven pages; also bumped for the mirrored side
border, below) and the new `report-table-split.js` at **1.0.5** on the nine pages that have a table
(it is not added to `casino-overview-report.html`, which has none, nor to `transaction-report.html`,
which splits already).

**One pixel that mattered:** the head's content box started 1px left of the body's because
`.table-wrap` carries a 1px side border that the head lacked — every column edge was off by that
pixel (`deltaX 0.8px`, `columnEdgesAlign:false`). The head now carries the same side border in the
card frame's own colour, so it is invisible but the two boxes agree.

### The nested rounded box around the table body (2026-09-22, owner “奇怪的border radius”)

Owner: “我的展示数据的table 怎么有奇怪的border radius 你要帮我去除掉 不然影响我的table 美观”.

`reports.css` gives `.table-wrap` — the table's own scroll box — **a 1px border and a 12px radius**
(`.standardized-listing-page .table-wrap{border-radius:12px!important}`), i.e. a second rounded box
drawn inside the card's own 16px rounded box. The locked listing frame is explicit that the scroller
carries **no nested border/radius** — the panel owns the frame — so this was always a deviation; it
was simply *masked* while the header lived inside the scroller, because the bar covered the top of
that box and the whole thing read as one object.

Splitting the head out (above) removed the cover: the wrap became a visibly separate rounded box, and
its rounded corner sitting against the scrollbar is the shape the owner first ringed as “优化一下” and
has now named. Fixed by zeroing the nested frame on the family:

```css
body:not(#bo-report-family-off):not(#bo-charcoal-off).bo-report-family .table-card > .table-wrap{
  border:0!important;
  border-radius:0!important;
}
```

The card keeps its radius and `overflow:hidden`, so the table is still rounded — **once**, by the frame
that owns it, the same as the User Management listing.

**The paired change:** the head's side borders had been added to mirror that 1px wrap border, and they
had to come off in the same edit — with the wrap borderless, leftover side borders on the head would
have re-introduced the 1px column-edge offset from the opposite direction. Measured after: `.table-wrap`
and `.bo-report-head` both `border-radius:0`, boxes identical (`x 278.8`, `w 1202.4`, `clientWidth`
1197 both), `edgesMatch:true`, `fillsCard:true`, 0 truncated headings, header pinned at `y=282`.
The only radii left inside the table area are the 8px pager rungs and the footer select, which are
controls, not the table. Checked on `transaction-report`, `casino-breakdown-report` and
`agent-performance-report` in both themes: every `.table-wrap` `0px`, no clipping, page still fixed —
`transaction-report`'s own frame (card `12px`, `.bo-tx-table-body`) is untouched.

**Pin:** `bo-report-family.css` 1.0.13 → **1.0.14** on the eleven pages.

### Report pages: no Reset / Search / Refresh, and the Members count moved to the title (2026-09-22)

Owner: “member显示移去上面 然后report的所有reset，search，refresh按键全去除”.

**Every Reset / Search / Refresh control is gone from the eleven report pages**, and each filter now
applies itself — the same contract the owner set for Win/Lose earlier ("通常选中那些选项就自动输出数据了"),
extended to the whole family. What was removed, and what took over its job:

| Pages | Removed | Replacement |
| --- | --- | --- |
| 5 × `casino-*-report` | `casinoResetBtn`, `casinoSearchBtn` | the shared range picker already reloads on a complete range (`casino-report.js` → `autoLoadSelectedRange`), so the row needs no trigger; the dead `setTodayAndLoad` helper went with the Reset button that was its only caller |
| `promotion-report`, `transaction-report` | `reportReset`, `reportSearch` | `operations-report.js` **already** reloaded on `from`/`to`/`reportType` change; only the two listeners were removed |
| `highest-turnover-games`, `frequently-played-games` | `gameRankReset`, `gameRankSearchBtn`, `gameRankRefresh` | the two text fields reload on a 400 ms input debounce (`Enter` still works), the footer page-size on change |
| `agent-performance-report` | `perfSearch` | brand / agent / date-range reload on change, the keyword field on a 400 ms debounce |
| `win-lose-report` | `wlReset` | already self-applying from this session's earlier pass |

**Two of those scripts would have thrown on load if only the markup had been edited.**
`player-game-ranking.js` used unguarded `$('gameRankSearchBtn').onclick = …` and
`agent-performance-report.js` likewise for `perfSearch`; both are replaced by guarded wiring, so
deleting the buttons is not enough — the JS has to stop expecting them. (The casino, ops and
win-lose listeners were already `?.`-guarded, which is why only these two mattered.)

**The Members count moved into the page title.** On the two games pages the `#gameRankCount` chip sat
in a `.user-toolbar` inside the table card with a Refresh button beside it; the chip now sits next to
the `<h1>` and that toolbar is gone. **The id is unchanged**, so `player-game-ranking.js` keeps
writing the count without knowing it moved. The title's inner block becomes a flex row only on pages
that carry the chip — `:has(> .users-found-badge)` — so no other page's title is restyled.
Three casino pages still carry an **empty** `.user-toolbar`; rather than edit their markup, the
interior-chrome rule now skips `:empty` and hides it, which also removes the 24px of blank space it
was reserving above the table.

**Verified on an auth-stubbed harness** (the same pattern as the nav probe: `/auth/admin/me` and
`menu-groups` answered locally so the permission-gated pages open and their own scripts run, with no
real session touched) — all ten pages: **0 stray Reset/Search/Refresh buttons, 0 JS errors**, badge in
the title on both games pages, and the filters really do fire: casino date range → 1 request,
ranking text → 1 request **from the debounce handler** (traced by stack; an earlier count of 2 was a
leftover from the page's initial load, not a double-fire), performance keyword → 1 request. The empty
toolbar measures `display:none; height:0` with the head flush at the card top.

**Pins:** `bo-report-family.css` → **1.0.15**, `casino-report.js` → 1.0.17, `operations-report.js` →
1.0.13, `player-game-ranking.js` → 1.0.2, `agent-performance-report.js` → 1.0.2, `win-lose-report.js`
→ 1.0.6. Bumped with a filename boundary so the `main-*` pages that share these script names
(`main-win-lose-report.js`) were not touched.

### Agent Performance Report brought onto the family layout (2026-09-22)

Owner: “这个页面的设计 跟其他页面的设计不太统一 排版应该是卡片 下来就是日期那排 然后 TitanX Gaming ·
2026-08-01 - 2026-08-31 麻烦去除掉没有用 然后 再把export的功能放同一排 然后要在table的container 上方啊”.

- **Order fixed:** the page had filter row → KPI strip → table. Every other report page puts the KPI
  strip first (Win/Lose is KPI → filter → table), so this one was the odd page out. Now
  `perf-kpis` → `perf-filter-card` → `table-card`, measured on the rendered page.
- **The “TitanX Gaming · 2026-08-01 - 2026-08-31” line is gone** (`#perfScopeLabel`, with the
  `.perf-table-head` bar that held it). The script wrote to it on every load
  (`$('perfScopeLabel').textContent = …`), so the element and that write had to go **together** —
  deleting only the markup would have thrown on every load.
- **Export moved onto the filter row, above the table**, into the slot the removed Search button used
  to occupy, right-aligned like the Member listing's action cluster.
- **Radii aligned:** this page's own card pair was 14px where the family's cards are 16px (and the
  table card already resolved to 16px through `reports.css`, so the filter card was the visible
  mismatch). `.perf-filter-card`, `.perf-table-card` and the KPI tiles are now 16px.

**Two authority-layer rules had to be beaten to right-align that one button, and both are worth
knowing:**

1. `body:not(#…):not(#…).report-main .bo-filter-row` in `bo-ui-standard.css` forces
   `display:flex!important` at two-ID specificity — so **this page's own
   `.perf-filter-card .bo-filter-row{display:grid!important; grid-template-columns:…}` has never
   applied**. Measured `rowDisplay:"flex"`, `tracks:"none"`: the row is a flex line, and the grid
   tracks this sheet describes are dead weight. My first attempt (`grid-column:-2/-1`) was therefore
   a no-op.
2. The same layer resets `.report-main .bo-filter-row > *{margin:0!important}`, so a plain
   `margin-left:auto` computed to `0px` and the button stayed packed against the last field —
   measured button right **1110** against row right **1465**. The fix is the repo's usual lever for
   that layer: two `:not(#…)` ID guards plus extra classes, so the margin wins.
   **Measured after: gap to the row's right edge 0**, button 36px, on the same row as the filters and
   above the table card.

**Pins:** `agent-performance-report.css` 1.0.0 → **1.0.4** (it moved three times while the two rules
above were being beaten — each one under an unchanged URL would have looked like “no change”),
`agent-performance-report.js` → **1.0.3**.

### Report pagination footers unified with the listings (2026-09-22)

Owner: “所有report页面的 8.1 至8.11 的pagination设计 要统一跟图里和其他页面一样”.

The report family's footer was a **two-slot flex** — info on the left, `Show N entries` and the ladder
grouped on the right. Every listing page in the app (`vip-exp-log`, `index.html`, `vip-reward-log`)
uses the **three-slot grid** instead, and that is what the owner's screenshot shows:
`Show N entries` left · “Showing X to Y of Z” centred · the ladder right.

**Markup — all ten footers reordered** to `entries-control`, info, ladder as direct children, with the
`.mad-footer-right` wrapper gone. Three different shapes had to converge: the plain form (win-lose,
promotion, transaction, agent-performance), `label.cr-page-size-label` on the four casino pages, and
the two games pages where the `Show` control was **nested inside the info block** — that one was
extracted, and its `Show` wrapper became `.entries-control` like everywhere else.

**CSS — `bo-report-family.css` §1 now mirrors `table-pagination-horizontal.css` verbatim:**

```css
grid-template-columns:minmax(190px,1fr) minmax(260px,1fr) minmax(190px,1fr)!important;
.entries-control → grid-column:1 · justify-self:start
info             → grid-column:2 · justify-self:center · text-align:center
ladder           → grid-column:3 · justify-self:end
```

The columns are taken from the reference sheet rather than chosen, so the report family and the
listings agree by construction instead of by eye. §11's `.mad-footer-right{gap}` rule described the
wrapper that no longer exists and was replaced by a note.

**One page needed the ID guards.** `transaction-report-polish.css` sizes this same footer with
`grid-template-columns:auto minmax(0,1fr) auto!important` at five-class specificity, so its side tracks
were content-sized — the pinned 72px select on the left against a 232px ladder on the right — which
pushed the middle track's centre ~76px left of the footer's: measured info centre **800** against
footer centre **880**. The family's grid rule now carries the usual two `:not(#…)` guards, because IDs
out-rank class counts. **Measured after: info centre 880 against centre 880, offset 0.**

**Verified on all ten** (live for win-lose; the auth-stubbed harness for the other nine, each page's
CSS pin regenerated first so no stale sheet could pass): `display:grid`, three slots in the right
order, `Show` flush left, info centred, ladder flush right at `footer right − 16`, footer on one line,
**0 JS errors**. The earlier run that showed `transaction` off-centre was the real defect above, not a
measurement artifact.

**Pin:** `bo-report-family.css` 1.0.15 → **1.0.17** (it moved twice: once for the grid, once for the
guards).

### Agent Performance: tile design, footer dropdown, missing ladder (2026-09-22)

Owner, on the same page: “1.卡片的设计需要去统一 2.pagination的 下来选单有被遮挡 需要去调整好
3.当前页面好像没有设计到 页数器？”.

**1. The KPI tiles were the only bespoke ones in the family.** They rendered `.perf-kpi` with a
per-tile icon well cycling green → purple → amber → red and an **amber value**, where every other
report page's strip is `.quick-stats > .metric`: one amber well, `12px/800` `#57534E` label,
`23px/900` `#18191C` value, `11px/600` note. The page now emits `.metric` and `#perfKpis` carries
`.quick-stats`, so the family's CSS and `reports.js`'s decorator own it. Measured identical to
`win-lose-report`'s tiles: well **52×52**, radius `50%`, tile `border-radius:14px` /
`min-height:104px`, label 12px `#57534E`, value 23px/900 `#18191C`. The tile's own `.perf-kpi*` rules
(23 mentions) were deleted rather than left dead; the strip keeps a page-level 6-across override.

**The icon chip has to be written by the page, and that is a finding about the shared decorator.**
`reports.js` decorates `.quick-stats:not(.user-stats) .metric`, but its `MutationObserver` calls
`run(addedNode)` → `addedNode.querySelectorAll(sel)` — a **descendant** search. A tile set written
wholesale into the strip (`innerHTML = …`) arrives as six `.metric` nodes, none of which contains a
`.metric`, so nothing matches and the tiles render **without their amber well** (measured: tile
present, `.bo-summary-icon` null). Every other page's tiles are in the markup at load, which is why
only this page was affected. The page now emits the chip itself — `card()` grew an icon argument, with
the glyphs it always used — and `reports.js` skips an already-decorated tile. **Not fixed in
`reports.js` on purpose:** that file is pinned on ~141 pages, so a one-line observer fix would cost a
141-file pin sweep for one page's benefit. Worth doing in a pass that is touching that layer anyway.

**2. The footer dropdown opened out of the window.** `reports.css` positions `.rounded-select-menu`
at `top:calc(100% + 6px)`, and the family's footer sits at the bottom of a viewport-locked card —
measured menu `869 → 1099` in a 900px viewport with the card ending at 878, i.e. **not one item
reachable**. Flipped to open above the trigger in `bo-report-family.css` §17, mirroring the recipe the
referral page already ships for its own footer select (same reason: a page-size control at the bottom
of the page). Measured after: menu `622 → 815`, **5 items reachable**, opens above the trigger.

**3. No ladder on a single page.** `paintPager()` returned early for `pages<=1`
(`host.innerHTML=''`), so with one page the footer showed only `Show N entries` and the info — the
owner's “没有设计到 页数器”. The family's contract is to render First · Prev · window · Next · Last
with the ends disabled. Early return removed here **and** in `player-game-ranking.js`, which had the
same `if(total<=1)` guard. Measured in the data state: **5 rungs — First page, Previous page, 1
(active), Next page, Last page — with 4 disabled.**

**Verified on an auth-stubbed harness** whose stub also answers `/agent-performance/brands` and
`/reports/agent-performance`, so the page's real `load()` path runs rather than its 401 fallback
(`roleType:'MAIN'` exercises the MAIN-only brand field; `rootAdmin:true` is kept in the same payload
because auth.js's access gate compares the menu list against the harness filename and otherwise
bounces the page to login). Data state: 6 tiles with the family's geometry and glyphs, rows rendered,
`Showing 1 to 1 of 1 agent`, 5 rungs, dropdown above the trigger with its items reachable, **0 JS
errors**.

**Pins:** `bo-report-family.css` 1.0.17 → **1.0.18**, `agent-performance-report.css` → **1.0.5**,
`agent-performance-report.js` → **1.0.5**, `player-game-ranking.js` → **1.0.3**.

### KPI tiles lose their note line; the six-up strip stops crushing (2026-09-22)

Owner: “卡片的那些提示词就不需要了吧 然后再帮我调整一下设计就行了” — the second line under each KPI value
(`All time bets`, `Selected brand`, `Assigned players`, `House P/L`…).

**The notes are hidden in CSS, scoped to the family.** On these pages they come from two different
places — written by `agent-performance-report.js`, or injected by `reports.js`'s `.bo-summary-note`
decorator on the other ten — so the only lever that removes them from all eleven without touching the
shared decorator is a rule:

```css
body:not(#bo-report-family-off):not(#bo-charcoal-off).bo-report-family .quick-stats .metric .bo-summary-note{display:none!important}
```

`reports.js` is pinned on ~141 pages, so editing the decorator for this would have cost a 141-file pin
sweep. The tile keeps its locked geometry — radius `14px` · `min-height:104px` · 52px amber well ·
`12px/800` label · `23px/900` value — so the strip is still the same component the rest of the app
uses, minus one text line. Verified on `win-lose-report`: the note node is present, `display:none`,
height 0, and the tile still measures 104px / 14px / 52px well. The page's own JS also stopped
emitting one, so its tiles carry no dead node.

**The six-up strip has to stay on ONE row — and the tile had to be made compact to earn it.** The
first attempt sized the strip by *available width*: six tiles above 1600px, three below. On the
owner's machine that produced two rows, and the reply was “我电脑屏幕想要一排展示完” — stepping down was
the wrong answer. The tile is now made genuinely compact for six-up, and the ladder steps up only
when six tiles could no longer hold their own text:

| Band | Layout | Tile |
| --- | --- | --- |
| ≥1366px | **6 × 1 row** | 38px well · 12px gap · 11px label · 19px value · `min-height:88px` |
| 1201–1365px | **6 × 1 row** | 30px well · 9px gap · 10px label · 16px value |
| ≤1200px | 2 columns | the family's full-size tile (52px well · 12px label · 23px value · `104px`) |
| ≤575px | 1 column | same |

**The threshold is measured, not guessed.** Six tiles need ≥1200 CSS px for the longest label
(`Total Turnover`) to fit — at 1152 four labels ellipsised, which is why the step-up sits at 1200. The
owner's ~1536px viewport therefore gets one clean row at 195px per tile.

**Every declaration in that block needs `!important`, and that is the whole catch.** `reports.css`
pins the KPI tile at `.report-content .quick-stats:not(.user-stats) .metric` **with `!important`** (four
class-level selectors), and an `!important` declaration beats a *higher-specificity* rule that is not
itself important. Without it the compact recipe was completely inert — measured tile still
`52px 83.4px`, `padding:16px 18px`, `min-height:104px`, a 12px label, and `Total Turnover` truncated
(needed 87px, had 83px). With `#perfKpis` (an ID) **plus** `!important` the IDs decide and this sheet
wins. **This is the third time in this session that a rule was "set" and measurably had no effect** —
the others were a `padding-left` longhand losing to a `padding` shorthand, and an inline size losing to
an `!important` sheet rule. The pattern: check what actually won, never what was written.

**Measured at ten widths** (1920 / 1600 / 1536 / 1440 / 1366 / 1280 / 1240 / 1201 / 1200 / 1152):
notes **0**, **zero truncated labels or values** at every one, and six-in-one-row wherever a tile is
≥1201px wide — 302px per tile at 1920, 195px at 1536 — two columns below that.

**Pins (final):** `bo-report-family.css` **1.0.19**, `agent-performance-report.css` **1.0.11** (it moved
five times while the two authority-layer rules above were beaten), `agent-performance-report.js`
**1.0.6**, `player-game-ranking.js` **1.0.3**.

### 8.1–8.11: the date strip joins the table card, and the tables lose their grid (2026-09-22)

Owner: “检查report的所有页面从 8.1 至 8.11 · 1.那个日期和table 要和图二的设计一样 · 2.然后table header
是没有线条设计的”, and while the pass was running: “table数据里 也不应该有线条哈哈 要跟统一其他页面”.

**图二 is `index.html` (User Management), and what it says is that the filter row is not a card.**
There the date/search/status controls are the first band *inside* the table card (`index.html` →
`.table-card > .user-toolbar > .user-search-grid.bo-filter-row`), sitting directly on the amber head
band, so the filters and the table read as one object with one inset. Nine of the eleven report pages
instead carried a `.filter-card` of their own (8.11's is `.perf-filter-card`, 8.5's a bare
`.ops-filter`), and `reports.css` gives such a card full standalone chrome — 1px `#EADCC8`, 16px
radius, its own shadow — so each rendered as a **separate rounded box floating a gap above the table
card**. That separation is the reported defect.

**Joined in CSS, not by restructuring nine pages of markup** (`bo-report-family.css` §19, desktop-only):

| Piece | Was | Now |
| --- | --- | --- |
| strip padding | `16px` | `12px 16px` — the inset §14 already gives every band inside the card |
| strip bottom border / radii / shadow | `1px` · `16px` · own shadow | `0` · `0` · `none` |
| strip bottom margin | `0` (zeroed by §15) | `-16px`, cancelling the content column's flex gap |
| table card top border / radii | `1px` · `16px` | `0` · `0` |

`12px 16px` is not decoration: it is the same inset as `.table-card > *` in §14, which is why the
filter control and the first header cell share a left edge — measured, filter control box **295** and
the first header cell's text **295** (its box starts at 279 and carries the 16px inset).

**`:has(+ .table-card)` is load-bearing.** 8.4 Casino Overview Report has no table at all; without the
guard the negative margin drags its KPI strip up over the filter card. `transaction-report-page` stays
excluded for the reason §14 excludes it (8.7's filter is already a band inside its card and owns its
own chrome).

**The head and the body lose their vertical rules.** The head band drew
`border-right:1px solid rgba(107,54,12,.08)!important` (plus a dark `rgba(255,255,255,.08)`), the body
`rgba(107,54,12,.06)` (plus dark `.06`) — the “线条” the owner pointed at. Both are now `0`. The row
hairline stays (`1px #EADCC8`, dark `rgba(255,255,255,.12)`): rows are told apart by the zebra band and
that hairline, exactly as in 图二 and on every other listing. **8.7 needed its own rule** — its page
sheet states both column rules itself at `(0,4,2)` with `!important`, so a family rule carrying the
family's usual two `:not(#…)` guards (two IDs) is what beats it, and nothing else about 8.7's recipe is
touched.

**Measured on all eleven pages** (auth-stubbed temp harnesses, deleted after the pass): seam
**0px** on the ten merged pages, strip `border-bottom-width 0` / `border-bottom-left-radius 0` /
`box-shadow none` / `margin-bottom -16px` / `padding 12px 16px`, table card `border-top-width 0` /
`border-top-left-radius 0`; head `border-right-width 0` with the `#FFE8CC` fill intact (dark
`#1F2128` / `#E7E5E4`), body `border-right-width 0` with the `0.8px` row hairline intact;
`transaction-report` untouched inside its card; `casino-overview-report` untouched as a standalone
card. **Below 992px the merge is off** — stacked cards, seam 16px, full chrome — because there the
sidebar is an off-canvas drawer and the stack is the right shape.

**And the reported “scroll不到下方” was this same frame.** The production screenshot was
`casino-overview-report.html`: a filter strip plus **18 KPI tiles and no table**, inside a shell where
§15 sets `overflow:hidden` on `.report-shell` / `.report-main` / `.report-content`. With no
`.table-wrap` anywhere, nothing could scroll and the tiles below the fold were unreachable. Fix: the
content column may still scroll itself (`overflow:hidden; overflow-y:auto`) — the shell, the pinned
topbar and the sidebar all stay — plus a `280px` floor on the table card so a short window can never
shrink a panel to zero (a zero-height card hides its own table).

- **Costs the table pages nothing:** their `.table-card` is `flex:1 1 auto` with `min-height:0`, so it
  fits the column exactly and this scroller never activates — confirmed `contentScrollable:false` on
  all ten table pages.
- **Pre-fix proof:** at 1512×640 with the old `overflow:hidden` simulated, **2 of 18 tiles** were
  unreachable; with the fix `scrollHeight 702 > clientHeight 576` and all 18 reachable.
- **No regression on the pinned header:** 60 synthetic rows on `win-lose-report` — head band viewport
  `y` **257 before, 257 after scrolling**, first row `302 → -98`, and the document itself still not
  scrollable (`documentElement.scrollHeight == innerHeight`).

**Pin:** `bo-report-family.css` 1.0.19 → **1.0.20** on all eleven pages. Nothing else moved — no JS
changed.

### The report family's pagination is the LISTING pagination — audited page by page (2026-09-22)

Owner: “这里有问题 默认show - entries 的话 可是仍然能scroll”, then “确认好report所有页面的pagination的
功能逻辑是跟其他页面统一”.

**The house meaning of `-` is "fit the rows to the panel", and it is not a report-family invention.**
`assets/js/pagination-standardizer.js` → `resolvePageSize()` is what the ~130 non-report listings run:

| Control value | Meaning |
| --- | --- |
| `-` / blank / `auto` | **fit** — `max(5, min(200, floor(available / rowHeight) || 12))` |
| `All` | everything (`10000`) |
| a number | that number, falling back to the fit when unparsable |

`member-management.js` (`autoFitPageSize()` + `evenFillRowHeights()`) is the same recipe on the
reference listing, and `operations-report.js` even pins the trigger's label to `-` as “the VIP EXP
contract” — so `-` **staying** `-` in the control is intended; what was wrong was pages that read it
as a fixed number. With `-` read as a hard 20 the panel was over-filled and scrolled behind the
pinned head while the footer claimed `Showing 1 to N of N entries` — exactly the screenshot.

**Audit of the eleven** (each page's own script, since the family has no shared page-size module):

| Page | `-` before | `-` now | Ladder markup |
| --- | --- | --- | --- |
| Win/Lose Report | **hard 20** | **fit** | was classless `‹`/`›` buttons — **now the locked rungs** |
| the four casino reports | fit (`measureAutoPageSize()`) | fit, unchanged | locked ✓ |
| Promotion / Transaction report | fit (`operations-report.js`) | fit, unchanged | locked ✓ |
| the two games reports | fit (`fitPlan()`) | fit, unchanged | locked ✓ |
| Agent Performance Report | **no `-` option at all** (hard 20) | **option added, fits** | locked ✓ |
| Casino Overview Report | no table, no footer | — | — |

Every page's control now carries the identical option set with `-` selected
(`- · 10 · 20 · 50 · 100 · All`) — verified by reading all eleven files' markup.

**Win/Lose Report** (`win-lose-report.js`, server-paginated, so the fit has to be resolved *before*
the request): `isAutoPageSize()` / `measureAutoPageSize()` / `currentPageSize()` follow the shapes the
casino pages and `pagination-standardizer.js` already use, measuring the **body** scroller and
subtracting the head only while it is still inside it (`report-table-split.js` lifts it out at
≥992px). One refinement per session, the casino pages' pattern: the fit resolved from the placeholder
row is re-measured from real rows once they exist and the page reloads only if the two disagree —
visible in the request trace as `13@p1 → 12@p1`. Resizing re-fits while in auto mode, as
`casino-report.js` and `player-game-ranking.js` do. Its `renderPages()` was rewritten onto the locked
ladder anatomy (`smart-page first` · `smart-page nav-text` · numbered `smart-page` + ellipsis ·
`smart-page nav-text` · `smart-page last`); the old one emitted bare `‹`/`›` buttons, which miss the
rung geometry entirely because the family stylesheet sizes `.smart-page`, not `.pagination-clean button`.

**Measured** (auth- and API-stubbed harness, 57 synthetic rows, 1512×900): control on `-` →
`size=12`, 12 rows, `.table-wrap` `scrollHeight 511 == clientHeight 511` → **`wrapScrolls:false`**,
footer `Showing 1 to 12 of 57 entries`; page 2 → `size=12&page=2`, first row `13`,
`Showing 13 to 24 of 57 entries`, still no inner scroll. Ladder rungs all **36px** tall, First/Last
**36×36**, the info block dead-centre in the footer (centre **886** vs footer centre **886**).

**Agent Performance Report** was the only one of the eleven whose control had no `-` at all
(10/20/50/100/All, hard 20): the option is added and `perfSize()` resolves the fit the same way
(client-side pagination here, so no extra request — measured `-` → 8 rows at a 57px row
(`floor(511/57)`), `wrapScrolls:false`, `Showing 1 to 8 of 57 agents`, every rung `.smart-page`).

**Cost, stated plainly:** on the two server-paginated pages whose fit lands on a different number than
the placeholder-row estimate, the first paint costs **one extra request** (`13@p1` then `12@p1`). It is
the same one-shot correction the casino pages already make, and it happens once per session, not per
filter change.

**Pins:** `win-lose-report.js` 1.0.6 → **1.0.7**, `agent-performance-report.js` 1.0.6 → **1.0.7**
(plus the new `<option>` in `agent-performance-report.html`).

### Agent Performance Detail — the missing twelfth family page (2026-09-22)

Owner: “http://127.0.0.1:8080/agent-performance-detail.html?agentId=1&from=2026-09-22&to=2026-09-22
这个页面的设计 你还没帮我优化”.

It was the drill-down of 8.11 and had none of the family treatment — no `bo-report-family` marker, no
family sheet, no split head, no footer. Measured on the page as it was:

| | Before | After |
| --- | --- | --- |
| KPI strip | **raw inline text** — `TurnoverRM 1,385,271.50Valid bet` stacked down the page | the family's `.metric` tiles, 6 in one row, 88px |
| Table head | amber band **with column rules** (head and body) | lineless, per the family recipe |
| Head pinning | none — the document scrolled | split head, pinned; only the rows scroll |
| Footer | `Showing 40 betting records`, no control, no ladder | three-slot grid: page size · info · ladder |
| Panel | 40 rows in one **2468px** panel; document **3225px** in a 950px viewport | rows fitted to the panel, document locked |
| Dark mode | ops cards stayed **light** (`#FFF8EB` + `#57534E`) with light values on them | `#383A46` / `#D4D4D8`, same trio as the tile |

**Why the strip was raw text:** the tiles were `<div class="perf-kpi">` and **no stylesheet in this
repository has ever defined `.perf-kpi`** — only `.perf-detail-kpis{grid-template-columns:…}`, a grid
template on a container that was not a grid. `#detailKpis` also had no `.quick-stats`, so even the
family's tile rules had nothing to hook. Fixed by emitting the same `<div class="metric">` markup
`agent-performance-report.js` does and putting `quick-stats perf-kpis` on the container.

**It also had no pagination at all.** It now carries the listing footer with the listing's semantics
(`-` fits, `All` everything, a number that number) and the locked ladder — `Showing 1 to 6 of 40
entries` with eight rungs at 1512×950.

**The fit has to be settled against what was painted, not measured once.** Both directions of getting
it wrong were measured on this page: the pre-paint estimate is one row too many (5 rows in a 212px
panel at 54px ⇒ `scrollHeight 269 > clientHeight 212`, so the panel scrolled at the default), and a
correction loop that computes the row height as `scrollHeight / painted` **over**-corrects downward —
`scrollHeight` is clamped to `clientHeight` whenever the rows do not overflow, so a fitted page reads
back as if each row were taller than it is (3 rows became 2, leaving 54px of dead panel). `settleFit()`
therefore uses a painted row's own box and converges in at most three passes — the same
settle-what-you-painted approach `operations-report.js` already uses.

**The KPI recipe is now ONE compact band, and neither line may be cut off.** Six tiles at 1216px are
191px wide with a 111px text column; the roomier ≥1366 recipe (38px well, 11px label, 19px value)
ellipsised five of this page's six values, because `RM 1,385,271.50` needs 144px. The tightened
recipe (30px well, 10px gap, 10px label, 16px value) fits them, so it now covers the whole six-up
range and the 1366 band is gone. The `white-space:nowrap` + ellipsis pair this sheet used to set on
both lines is replaced by wrapping: a KPI number that reads `RM 1,385…` is not a number, and a label
that reads `Bonus / Settle…` is not a label. Verified at 1600/1512/1440/1366/1280/1201: **one row,
zero clipped values, zero clipped labels, `slack 0`** (at 1201 the label wraps and the tile grows to
100px, which is the honest outcome).

**Also:** the stray `<link href="bo-input-fill.css">` that sat **between `</head>` and `<body>`** moved
into the head, and the duplicated date range in the table-card title bar (`#detailRange`, already in
the topbar subtitle) went with the bar, as on 8.11.

**Pins:** `agent-performance-detail.js` **1.0.3** (new, was 1.0.0 and unstyled), the page now links
`bo-report-family.css` **1.0.20** and `report-table-split.js` **1.0.5**, and
`agent-performance-report.css` 1.0.11 → **1.0.15** (it moved for the `#detailKpis` selectors, the
perf-op radius, the collapsed KPI band and the dark ops variant).

### Every report table now sorts by column (2026-09-22)

Owner: “report的8.1 至 8.11的所有table欠缺sort功能 你去查看其他页面设计出的md 然后要确保我的数据要对齐”.

**The design was already in the repo** — the Member Wallet listing (`member-wallet.js` +
`bo-wallet-transaction-amber.css`): a head cell marked `th.bo-tx-sortable[data-sort]` whose label sits in
a `.bo-tx-sort-btn` with a CSS-drawn double triangle (`.bo-tx-sort-ico`), the states `is-sorted` /
`is-asc` / `is-desc`, and `aria-sort` kept in step (none → ascending → descending). That recipe is ported
verbatim in values onto all twelve report pages from **one shared layer** — no per-page wiring, no HTML
edits:

- **`assets/js/report-table-sort.js`** builds the control and the icon on every head cell that has a
  label, binds one delegated click + keydown per head table, and sorts the rows.
- **`bo-report-family.css` §23** carries the visual recipe, scoped to `body.bo-report-family`.

**Three things it had to solve, each measured:**

1. **The head and the body are two tables** (since `report-table-split.js`): `.bo-report-head` holds the
   `thead`, `.table-wrap` holds the `tbody`. A head cell's rows are therefore found through the **card**,
   not through a shared `<table>`. 8.7, which owns its own split (`.bo-tx-head-table` /
   `.bo-tx-body-table`), is covered rather than excluded.
2. **The global button decorator claims every `<button>`.** `bo-ui-standard.js` painted these controls as
   amber primary pills with white labels (measured `color:#fff`, amber fill) and re-scans added nodes, so
   stripping its classes back off was a race — and the body-wide observer needed to win it is what made a
   page hang. The control is now a **`<span role="button" tabindex="0">`**: outside that decorator's
   selector entirely, so there is nothing to fight. Keyboard support (Enter/Space) and a focus ring are
   wired explicitly. Verified: `tag SPAN`, zero `bo-ui-button` classes, plain `#6b360c` label with a
   small grey triangle, amber only on the sorted column.
3. **Pages that rebuild their own head.** 8.7 and 8.11 render `<thead>` from JS on every load — 8.7
   again on each autofit settle — so a decoration applied once is thrown away with the old cells
   (measured: fourteen headings decorated, then gone). A `childList` observer on the `thead`
   re-decorates and re-syncs; a second one on the `tbody` re-applies the order after a page change.

**Alignment is intact — that was the owner's second requirement.** The sort control is inside the head
cell that already carries the column's width, and it is `width:100%` of it, so nothing about the widths
moves. Measured on 8.7 after decorating and sorting both ways: **column delta 0px**, and on 8.11,
promotion and win-lose likewise 0px.

**Where the icon sits, in three passes** — each one driven by the owner pointing at a screenshot:

1. *Icon before the label, in flow* (the Member Wallet recipe, and what the owner asked for) pushed every
   heading ~19px right of its column's data — circled in red as “要好好对齐”.
2. *Icon after the label* fixed the alignment but broke the design they had pointed at
   (“他的sort的位置应该在字体之前的设计”).
3. **Icon in the cell's own padding gutter** (`position:absolute; left:-10px`), label on the content edge —
   both at once. Two follow-ups from the owner's screenshots:
   - the offset started at 13px and the first column at 16px, which parked the DATE icon 3px from the card's
     border — “图一的sort要跑出去了”; it is now **10px for every column**, so the icon sits 7px clear of the
     card edge and still inside a 12px-inset cell.
   - the right-aligned columns took the icon in their *trailing* gutter, which the owner read as the icon
     having “变去后面了” (“图二的sort在尾端了”); those columns now keep the icon **leading, in flow**, so every
     column reads `⇅ LABEL`, and the price is that a right-aligned column's label sits an icon's width left
     of its numbers — the trade the owner chose.
   **Measured on the Deposit/Withdraw Report at 1920:** DATE icon 285 (7px clear of the card at 278), label
   295 = data 295; the next three columns 392/402 = 402, 596/606 = 606, 784/794 = 794 — every `alignDelta 0`
   with the icon before its label, and Net Cash Flow's icon at 1776 before its label at 1789.

**Verified:** 8.7 → 14/14 headers sortable, click `Member` ascending then descending (first cell `1`
then `12`), delta 0. Promotion 6/6, 8.11 16/16, Win/Lose 6/6 — each ascending on first click with delta
0. Numeric columns sort as numbers through `1,200.00` / `RM 12.5` / `-40`, with a row-index tiebreak so
equal keys keep their order.

**Sorting applies to the rows the table currently holds.** On the pages that fetch the whole set and
paginate client-side that is the whole set; on Win/Lose and the two games reports (server-paginated) it
orders the page on screen — a whole-set sort there needs their endpoints to accept `sort`/`order`, which
this layer cannot assume. The wallet page makes the same bargain.

**Audit: which report pages had no sort, and why.** The first cut keyed the layer to `body.bo-report-family`,
which is only the eleven 8.x pages plus the detail drill-down — so every other report page was silently
skipped. That is the answer to “为什么我的transaction type report 没有sort”: `provider-bet-report.html`
(“Provider Bet Report”, the page with the Bet Event Type filter) is a report page that is **not** in the
family marker, so the layer never ran there.

| Page | Before | Now |
| --- | --- | --- |
| the 11 8.x pages + Agent Performance Detail | sorted | unchanged |
| `provider-bet-report.html` — **the page in the report** | nothing | **11/11 headers sortable**, styled, delta 0 |
| `main-report.html` — MAIN Report | nothing | **12/12 sortable** on its data card, delta 0 |
| `agent-bet-report.html`, `agent-player-game-report.html` | nothing | wired (the layer is structural), **unverified** — both redirect to Agent login for a non-agent session |
| `daily-rebate-report.html`, `main-accounting-report.html`, `main-settlement-report.html`, `main-win-lose-report.html`, `main_merchant_report.html`, `main_provider_report.html` | nothing | still nothing — their tables are the `standard-*` component (`.standard-list-card` / `.standard-data-table`), not `.table-card` / `.report-table`, so they are separate work |

The scope is now “the script is pinned here **and** this card has a head+body pair”, and the body class
`bo-sortable-tables` is added only once a real head cell has been decorated — that class, not the family
marker, is what turns the styling on. Ordinary listing pages are untouched: the script is not pinned
there, and nothing in §23 matches without the class.

**Pins:** `bo-report-family.css` 1.0.27 → **1.0.29**, `report-table-sort.js` **1.0.4**, both on
**sixteen** pages (the twelve, plus the four report pages outside the family).

### Transaction Report: the head had drifted off its rows — and the columns were too narrow (2026-09-22)

Owner: “Transaction Report的table header与下面的数据没有对齐”, then “反正我的transaction report要看完整所有数据”.

**Three causes, all measured.**

1. **The misalignment was introduced by the family sheet.** `bo-report-family.css` pins
   `table-layout:auto!important` on `.report-table` — deliberately, because the family's tables carry no
   authored column widths — and that rule carries two `:not(#…)` guards, so it out-ranks the transaction
   page's own `table-layout:fixed!important` (0,4,2). With `auto` in force the page's **shared
   `.tr-col-*` colgroup stopped binding**, and each of its two tables sized to its own content: the head
   to its labels, the body to its data. Measured column-by-column drift `0, 7, 20, −1, 8, 18, 23, 25, 73,
   129, 154, 162, 9, 6` px — the owner photographed exactly that. Fixed by excluding 8.7 from the rule
   (`:not(.transaction-report-page)`), the same convention §14 and §19 already use.

2. **Under `fixed`, the page's own percentages made the headings ellipsise themselves.** `MEM…`,
   `WAL…`, `CREA…`, `APPR…`, `REAS…` — the `.tr-col-*` widths were percentages (4/5/10/5/6.5/…) of a
   1320px table, several of them narrower than their own uppercased, `.04em`-tracked heading. The columns
   are now **px, each measured** as `max(heading, widest data)` on the rendered page — 40, 76, 137, 72,
   73, 70, 70, 98, 108, 73, 94, 340, 103, 103 — and the table's `min-width` is their sum (1460px), so no
   column can be squeezed below its content; when the card is narrower the body scrolls sideways (its
   design) and the head follows through the page's own scroll mirror.

3. **The head slot and the body slot reserved different gutters.** Both carry
   `scrollbar-gutter:stable`, but the autofit rule deliberately takes the body's gutter away in `-` mode
   while the head kept its own — so the two slots had different client widths, and once the card is wider
   than the columns the two tables stretch to *different* widths and the columns drift again (measured
   5px at 1904). The head's gutter is now tied to the same mode, and the head declares the same 6px bar
   the body uses (the fix `report-table-split.js` applies to the family pages).

**Verified at 1904×900 / 1600×900 / 1512×950 / 1280×800:** the two slots' client widths are **equal**
(1601/1601, 1297/1297, 1209/1209, 977/977), every column delta is **0px**, **zero clipped headings**,
**zero clipped cells** — including the full `Player exit transfer back PLAYBOY session #901` in Remark —
and at 1904 the whole table fits the card with no sideways scroll.

**Pins:** `bo-report-family.css` 1.0.24 → **1.0.25**, `transaction-report-polish.css` 1.0.11 → **1.0.14**.

### The sort triangles stopped following their icon — and Transaction Report stopped flickering (2026-09-23)

Owner, with two screenshots (Deposit/Withdraw, Win/Lose): “检查所有report的页面 当点选日期后 table
header的 sort与字体的距离 修好”, then on 8.7: “点选日期后 一直闪 不知道为什么 而且我的id也没有展示完整”.

**The icon/label distance was one CSS value, and it broke exactly the columns it was written for.**
The icon is a `<span>` whose two triangles are `::before`/`::after` — **absolutely positioned children**.
An absolutely positioned box resolves against the nearest *positioned* ancestor, so the icon is only
their containing block while it is itself positioned. The left-aligned case (icon `absolute` in the
cell's left gutter, so the label can sit on the data) kept that property; the right-aligned rule that
put the icon back in flow used `position:static` — which silently removed the containing block, and the
triangles jumped to the **button**: two little arrows painted at the middle of the header cell instead
of beside their label. Measured on Deposit/Withdraw before the fix: icon box `2721–2729`, its triangles
`2779–2786` — 52px from their own label, and on Win/Lose's wider column an entire column's width away,
which is what both screenshots circled. The rule is now `position:relative` with `top`/`left`/`transform`
reset, because a *relative* box resolves percentage offsets against the **button's** height, not its own
(the button's `align-items:center` already centres it). `position:relative` is also what the house
reference uses: Member Wallet's `.bo-tx-sort-ico` is `relative` and in flow with `gap:4px`.

**The class was renamed to say what it means, and now covers centred columns too.** It was
`bo-sort-right`, set only for `flex-end`; a *centred* column therefore kept the absolutely-positioned
gutter icon and detached from its centre-aligned label in exactly the same way — no page has one today
(checked across twelve), but the next one would have. `alignControl()` now applies `bo-sort-inline` to
every column whose computed alignment is not left/start, and the rule's job is "icon inline, immediately
before the label".

**Verified.** Isolated geometry page (only `bo-report-family.css` + `report-table-sort.js`): left/right/
centre → icon `absolute`/`relative`/`relative`, containing block the icon in every case, gap 2–3px for
the gutter icons and 5px in flow, nothing escaped, and after a real click `aria-sort="ascending"` with
the icon still in flow and the rows reordered. Twelve pages swept with the real script and sheet
(Deposit/Withdraw, Win/Lose, Breakdown, Transaction, Provider Bet, Casino Bonus, Provider Win/Loss,
Promotion, MAIN, Frequently Played Games, Highest Turnover Games, Agent Performance): every column has a
control, **zero escaped icons**, **zero centre-aligned columns**, and on the three that have a
right-aligned column — Net Cash Flow, Win/Lose, In/Out+Before+After — the icon is `relative` with its
own containing block at a 5px gap. Head-label-vs-data delta is **0px on every column of every page**.
Four pages could not be driven in the sandbox — `casino-overview-report` builds its head from data, and
`agent-bet-report` / `agent-player-game-report` / `agent-performance-detail` redirect to their portals;
all four carry the same classes and pin the same two files.

**Pins:** `bo-report-family.css` 1.0.34 → **1.0.35**, `report-table-sort.js` 1.0.11 → **1.0.12**.

**8.7 flickered because its own fit re-triggered its own fit.** `evenFillRowHeights()` writes row
heights and the table's height, and on this page the scroller's box *follows its content* — so the
`ResizeObserver` watching that scroller read our own write as a panel change, cleared `lockedAutoSize`
and re-rendered, which reset the heights, which fired the observer again. Measured: row height flipping
47↔50px, scroller 448↔446px, **1,305 mutation records in 2.6s idle and 3,730 in the 3s after a date
change**, forever. The observer now ignores any notification arriving within 400ms of a fit write, and
any notification whose box differs from the one the fit was computed against by less than a pixel in
width and 4px in height — width is the real input to a fit and is compared strictly (it measured a dead
constant 977 through the whole loop), while a genuine panel change is tens of pixels where this
feedback was 2. After the fix: **0 mutations, one distinct state, 5s idle**, and the same after a date
change.

**Two columns were too narrow for production data, not one.** The `.tr-col-*` widths are px values
measured from a sample; the id read “2…” (40px column, 24px of padding alone) and the balances “58,2…”.
Under `table-layout:fixed` the head and body colgroups must carry identical widths, so `fitColumns()`
measures the widest rendered content per column and writes the same inline width to **both** colgroups
— inline `!important`, because the sheet's own `.tr-col-*` widths are important. It only grows, and
remembers the widest seen, so paging never pulls a column back in; Remark is exempt (it truncates by
design and carries its own hover tip). The first pass can still measure before the final type is in
force (measured 120px of text for an id that is 134px), so it re-runs on `document.fonts.ready` and at
250/900ms. No `min-width` bookkeeping: fixed layout already sizes the table to the greater of its
specified width and its columns' minimum — writing one from the measured cell widths fed the layout
back into itself, adding ~10px per pass, forever. Measured after: **zero clipped columns** (id 160/160,
balances 91/91), table 1620px growing from the CSS 1460 floor, head and body the same width, head
labels at **delta 0** on all 14 columns.

**Pins:** `operations-report.js` 1.0.15 → **1.0.18**.

### Back controls live at the right end of their row — five pages were not (2026-09-23)

Owner, with a screenshot of Agent Performance Detail: “查看其他页面的back按键统一在右边”.

**The convention already existed in the sheets**, which is why most pages were right already:
`.mac-back-section` (8 create/edit pages) and `.vle-back-list` are `margin-left:auto` inside a flex
section head, `.mrc-back-list` sits last in a `justify-content:space-between` card head, `.pmc-form-head`
is `justify-content:flex-end`, `.mra-detail-toolbar` is `space-between`, `.mprr-back` is `margin-left:auto`
(and a full-width centred button below its mobile breakpoint), `.template-back` / `.banner-edit-back` sit
last in a pane head, `.md-identity-actions` is the member card's right-hand action group.

**Five were not.** Measured before → after (`gapToRowRight`, the distance from the control to its own row's
right edge): `agent-performance-detail` 1482px → **0**, `agent-detail` 53px inside a 198px group → **0**,
`agent-provider-detail` 47px with the control stacked under the title → **1**, `main-balance-adjustment`
1447px (a block of its own above the heading) → **0**, `main-stat-detail` 983px (mid-row, after Search) →
**0**. Each is fixed with the house mechanism — the control becomes the row's last child of a
`space-between`/auto-margin row; nothing new was invented.

**Two traps, both measured.** (1) `agent-detail`'s control first landed *inside* the tab strip: a button in
a `role="tablist"` is announced as a tab, and the page's own
`body[data-agent-detail="1"] .agent-detail-tabs .clean-btn{border:0!important;background:transparent!important;
padding:15px 14px!important}` stripped its chrome — measured `rgba(0,0,0,0)`, no border. Moved out to the
row as its last child, its own ghost chrome came back (0.8px `#DCC9A8`, 8px radius, `0 14px` padding).
(2) `main-stat-detail`'s `margin-left:auto` did nothing at first, because the standard sheet's
`body:not(#…):not(#…) .report-main .bo-filter-row > *{margin:0!important}` is **ID-level** (two `:not(#id)`
guards) and beats a plain `#detailBack` rule regardless of source order — measured `marginLeft 0px` with
both rules present in the CSSOM; matching that tier gives `marginLeft 983.062px` and the control flush right.

**Not moved, deliberately:** `provider-detail.html`'s control is a breadcrumb trail
(`← Provider Settlement › Provider`) — a location indicator, which belongs at the left, not the
“Back to X” action pill the owner pointed at.

### Why the search bars look different from page to page (2026-09-23)

Owner: “调查所有页面的search bar设计为什么变样了 是谁影响的 再帮我解决这个问题”.

**There is no single search field — there are eleven, and no single commit changed them.** Swept all 38
pages containing a search input (auth-stubbed copies, 1920×900): `.category-search-control`,
`.game-search-control`, `.input-icon-wrap`, `.banner-search`, `.livechat-search`, `.agent-search-box`,
`label.bonus-title-search`, `.mad-search` (+ `.mre-search`/`.mas-search`), `.mp-search`/`.mrc-search`,
`.mac-provider-search`, `.provider-list-search`, `.bo-filter-item`. Authored by different hands: the
shared recipe in `reports.css` is Wang Zai's (`962da1d3`, 2026-07-13), the `mp-search` family Jk6373's
(`6e92fd83`, 2026-09-04), the Promotion pill Jack's (`024d1f88`, 2026-09-20).

**Two heights, and that is documented, not drift.** `.mad-filters` / `.mp-search` rows measured 42px on
*every* child (search + selects + reset + date field). DESIGN.md line 349 keeps those there “until those
pages are migrated — then bring them to 36px”. The family/listing pages were already on the locked
`36px / 8px` recipe.

**The real defect: the generic input themes draw a second border inside any bespoke search component.**
`reports.css` (*“Every regular input/select follows the approved rounded field theme”*) and
`bo-charcoal-legacy.css` both theme `.report-content input` at ID-level specificity, and both excluded
bespoke fields by **enumerating ids** — `#providerSearchInput`, `#pullLogWindowValue`, `#boPassword`.
Every custom search field had been patched out one id at a time; `#bonusSearchInput` never was, so when
the Promotion page moved its field into a pill the input kept drawing its own border *inside* the pill,
and — because that shared recipe also hard-codes `#bonusSearchInput` at `height:42px` — it overshot the
`36px` pill by **6px** (measured: wrapper `0.8px/8px`, input `0.8px/10px`, `+6px`).

**Fixed:** `#bonusSearchInput` removed from the three search-recipe selector lists in `reports.css`; both
generic themes now exempt **whole components** (`:not(.mad-search input):not(.mp-search input):
:not(.mrc-search input):not(.mas-search input):not(.mac-provider-search input):not(.agent-search-box input)`,
plus `:not(.bonus-title-search input)` in place of the id). Verified after: `mad-search`, `mp-search`,
`mac-provider-search`, promotion and `bonus-title-search` each show **one** border (inner `0px/0px` in a
`0.8px/8px` wrapper), and the input-owned recipes remain only where a page sheet still documents that
split (`agent-players`, `admin-user`, `livechat`). **`game` / `game-category` later flipped to the
wrapper-owned recipe** — see the next subsection.

**`agent-players` needed the opposite fix.** Its own sheet carries seven successive attempts at this same
problem (v2.3.4 → `v2.3.7 … final single-outline fix. The wrapper is layout-only; the input owns the one
visible border`), so the page wants the *input* bordered and the wrapper chrome-less — while
`bo-charcoal-agent.css` sweeps a border onto the wrapper too, light and dark. The skin was the intruder:
its 8 wrapper/input border rules were removed (14 selector entries; rules that also served other
components kept theirs) and the broad `.agent-player-filters input` sweeps are exempted for that pill.
Verified light **and** dark: wrapper `border 0px` (layout only, radius 8), input `0.8px` / radius 8 /
`padding-left 34px` for the absolutely positioned magnifier, the row's other controls unchanged.

**The legacy tier was then migrated — the row, not the search.** One guard-tier block appended to
**`main-admin-detail-executive.css`** brings the whole `.mad-filters` row to the locked recipe (36px tall,
8px radius, `0 12px` padding, 12px type — search, selects, date trigger and ghost buttons together,
because moving the search alone leaves it 6px shorter than its own neighbours). The first attempt went into
`bo-charcoal-shell.css` and did **nothing**: the MAIN-executive pages never load that sheet (measured —
14 sheets, none of them the shell); the skeleton they share is the executive sheet. Verified on eight
cluster pages (`main_merchant_report`, `main-merchant-detail`, `main-provider-detail`, `main-win-lose-report`,
`main-merchant-security`, `main-admin-security`, `main-merchant-profit`, `main_provider_report`): every
control in the row measures **36px with an 8px radius**.

**And the reason a fix can be invisible: the cache pins had drifted.** The `?v=` query is only a cache key,
and 35 shared assets were referenced with more than one value — `bo-charcoal-cms.css` **ten** (`1.0.0` on
19 pages), `bo-ui-standard.js` nine, `bo-wallet-transaction-amber.css` seven, `config.js` five.
`scripts/stamp-asset-pins.py` now derives each pin from the asset's own content (`sha1[0:8]`), so it changes
exactly when the file changes and is identical everywhere; the tree is stamped (**0 drift**). Forcing that
fresh fetch is what *exposed* the pill defect, which the browser's cached copy had been hiding.

**The last two families are migrated too.** The roles/permissions rows (`menu-permission`,
`main-merchant-roles`, `main-admin-role-create`, `main-merchant-role-create`) measured mixed —
`.mp-toolbar` row 64 with search 42 and the action cluster 32, `.mrc-filter-row` row 42 with search 42 and
tools 34 — and now read `mp-search:36/8px` with their action clusters at 36. The two listings that ship no
sheet of their own — `game` and `game-category` (`body.standardized-game-management`) and `admin-user`
(`body.admin-management-page`) — measured a **uniformly 42px row** (every `.bo-filter-item` child 42:
search, four selects, two action buttons), so the row moved whole: search `36/8px`, selects `36/8px`,
action buttons `36/8px`. (`game` / `game-category` later moved the search chrome onto the wrapper —
bare input; see subsection below.) `livechat` is the one case that moved **alone**:
`.livechat-inbox-card` is a vertical stack (card head 36 · search · list), so the search
drops to 36 and lands flush with the head above it.

**Two lessons from this round.** (1) `game`/`game-category`/`admin-user` have no page sheet at all — they
style themselves from the shared recipes — so their block went into `reports.css` scoped by their body
class; and the search input's height came from `bo-ui-standard.css`'s
`… .bo-filter-input-item input{height:42px!important}`, so that block needed a **third** `:not(#…)` guard
(`:not(#bo-input-fill-legacy)`) to out-rank it — two were measured not enough. (2) Their action buttons sat
in a container that *is* the `.bo-filter-item`, not inside one, so
`… .bo-filter-item > .game-filter-actions > *` matched nothing; `….bo-filter-row .game-filter-actions > *`
does. Measure the control, not the markup you assumed.

### Game Category search: wrapper owns chrome; input is bare (2026-09-23)

Owner: icon跑位 + 移除 input 的 background / border.

**Recipe (locked for `body.page-game-category` / `body.standardized-game-management` search):**

| Part | Owns | Spec |
| --- | --- | --- |
| `.category-search-control` / `.game-search-control` | the **one** visible field | flex row · `align-items:center` · gap `8px` · pad `0 12px` · height **`36px`** · radius **`8px`** · light fill `#FFF8EB` · border `#EADCC8` · dark fill `#2A2C36` · border `rgba(255,255,255,.12)` |
| `> i.bi-search` | glyph only | `position:static` · flex `0 0 auto` · **not** absolute (absolute + wrapper padding parked the icon outside the bordered input) |
| `> input` / `#categorySearchInput` | text only | **no** background · **no** border · **no** focus ring on the bare input · `padding:0` · `flex:1` · transparent on hover/focus too |
| `:focus-within` on the shell | focus chrome | border `#78716C` · ring `0 0 0 3px rgba(217,119,6,.10)` |

**Why the icon escaped.** Page CSS wanted absolute icon over a bordered input (`padding-left:34px`), but
`reports.css`’s guard-tier `html:not(#bo-filter-standard-off):not(#bo-charcoal-off):not(#bo-input-fill-legacy)
… .category-search-control{padding:0 12px!important}` (ID-level) kept padding on the wrapper while the
input alone drew the border — magnifier sat in the wrapper’s left pad, outside the field.

**Why the input kept a cream fill.** `bo-input-fill.css` rule 1 paints **every** `input` `#FFF8EB` at
ID-level (`body:not(#bo-input-fill-legacy):not(#bo-input-fill-legacy-2)`), even when rule 2 already fills
the search **frame**. Measured: wrapper cream + input cream = double wall. Fixed in `bo-input-fill.css`:
nested inputs inside `.category-search-control` / `.game-search-control` / `.banner-search` /
`.input-icon-wrap` / `.ref-input-icon` / `.mad-search` / `.agent-search-box` / `.mac-provider-search` /
`.provider-list-search` force `background-color:transparent!important` (base + hover/focus). Page lock in
`game-category.html` `<style id="game-category-footer-lock">` + `reports.css` body-scoped block match that
tier so border/`background` stay off the bare input.

**Still opposite on purpose:** `agent-players` keeps input-owned border (wrapper layout-only) — do not
merge the two recipes. **SUPERSEDED 2026-09-24** — the magnifier in that recipe sat on top of the
placeholder and the input overshot its own frame by 6px; the wrapper owns the chrome there now. See
"One search control, locked (2026-09-24)".

**Wiped once and re-applied.** The back-button work and this search work were both lost when the working
tree was reset to `origin/main` (the reflog shows `reset: moving to origin/main` three times in one
session) while they were still uncommitted — the pins and the pin script survived only because they had
been committed first. Re-applied from `scripts/restore-back-controls.py` / `scripts/restore-search-fixes.py` and re-verified. Nothing
here protects uncommitted work from that reset: commit before syncing.

### One search control, locked (2026-09-24)

Owner: “我发现很多页面的搜索设计都跑偏了 但是就修改不好 没有标准化”.

**The standard.** One markup, one owner. `bo-input-fill.css` → section "5. ONE search control" is the
only place the control is defined; every other sheet must stay out of its way.

```html
<label class="bo-search-control">
  <i class="bi bi-search" aria-hidden="true"></i>
  <input id="…" aria-label="Search …" placeholder="Search …" autocomplete="off" />
</label>
```

The input carries its own `aria-label` **or** is named by the wrapping label's text (the site's older
`label` + `.mad-sr-only` idiom does the same job). Naming is uneven across the legacy controls — 47 of the
62 have neither an `aria-label` nor any text in their wrapper — and closing that is an accessibility pass
of its own, not a styling one; the controls authored here carry an explicit `aria-label`.

| Part | Owns | Light | Dark |
| --- | --- | --- | --- |
| the wrapper | the **one** visible frame | `36px` · radius `8px` · `1px #EADCC8` · `#FFF8EB` · flex row · gap `8px` · pad `0 12px` | `#2A2C36` · border `rgba(255,255,255,.12)` |
| `> i.bi-search` | glyph only | `position:static` (a flex child, **never** an overlay) · `15px` · `#78716C` | `#A1A1AA` |
| `> input` | text only | border `0` · background transparent · pad `0` · radius `0` · `12px/700` · text `#18191C` · placeholder `#78716C` | text `#F5F5F4` · placeholder `#A1A1AA` |
| `:focus-within` | the only state change | border `#D97706` · ring `0 0 0 3px rgba(217,119,6,.14)` | same |

**Why it kept drifting.** The control was never *wrong*, it was **out-voted**. Every generic input theme
in the tree exempts bespoke search components by naming them one at a time:

```css
.report-content input:not(…):not(.mad-search input):not(.mp-search input):not(…)
```

Sixteen names were in those lists; `.bo-search-control`, the standard, was the seventeenth and was never
added. So on every page that loads `reports.css`, that rule — **8 `:not(#id)` steps and 23 classes** —
out-specified the standard's own 5-id guard and painted a second border and fill *inside* the control's
frame. `index.html` and `online-users.html` looked right only because they load
`reports-dashboard-original.css` instead and never meet the rule at all. DESIGN.md had already recorded
the tidy fix and left it as a follow-up ("Adding `.bo-search-control input` to those lists beside the
other sixteen names … is left as the follow-up"); the follow-up is what this change is. Adding to a list
is also the *only* durable lever here: `:not(#id)` steps can always be out-numbered, which is why the
earlier arms race never held.

**What was wrong, measured** (`getComputedStyle`, 51 pages, 62 controls, both themes):

| Symptom | Controls | Cause |
| --- | --- | --- |
| a second border + fill inside the frame | **12** — admin-login-log ×2, agent-management, agent-bet-report, agent-bonus, agent-products, agent-promotion-admin, bank-deposit-usage, manual-rebate-approval, provider-bet-report, vip-exp-log, vip-reward-log | the 8-id list above |
| the input re-filled cream | **3** — bonus-category-title, main-admin-role-create, main-merchant-role-create | `bo-input-fill.css` rule 1 did not name `.mp-search` / `.mrc-search` / `.mas-search` / `.bonus-title-search`, so the page rules that already tried to bare them lost |
| never had the wrapper at all | **4** — admin-user, role (bare input in a `.field`, magnifier drawn by a `::before`), main-provider-health (a bare Bootstrap `form-control`, 42px, **no magnifier**), main-accounting-settlement | markup written before the standard existed |
| the magnifier printed **over** the placeholder | **1** — agent-players | the standard stated the icon's flex/size/colour but **not** `position`, so `agent-portal.css`'s `> i{position:absolute;left:12px}` still won while the input stayed bare — the box read "Search player ID / name…" with the glyph across the S. That sheet carries four successive attempts at this (v2.3.4 absolute → v2.3.5 absolute → v2.3.6 static → absolute again) |
| dark mode: cream frame on a dark page; `#18191C` text on `#2A2C36`; two greys for icon and placeholder | 2 frames + 5 controls | the dark side of the standard named only `.bo-search-control`, and `reports.css` pins `color:#18191C` on these inputs at ID level. `game` / `game-category` are the two pages with no sheet of their own, so nothing else dark-themed them |

**The fix, and where each part lives.**

1. `reports.css`, `bo-charcoal-legacy.css`, `bo-ui-standard.css` — `:not(.bo-search-control input)` added
   to **21 enumeration lists** (2 + 14 + 5 rules). Byte-checked: removing the inserted clause restores
   each file byte-for-byte, so nothing else moved inside a 12MB sheet. This is the change that fixes the
   12 double frames, and it can only ever *narrow* a rule, so it cannot touch anything outside
   `.bo-search-control`.
2. `bo-input-fill.css` — the four missing frame names (`.mp-search`, `.mrc-search`, `.mas-search`,
   `.bonus-title-search`) and `.agent-assign-search` added to rule 1's exclusion list and to the
   transparent lists in rules 2/3. Closes the 3 double fills and agent-detail's hidden control.
3. `bo-input-fill.css` — the canonical icon rule now states the position reset (`static`, `left/top:auto`,
   `transform:none`, `z-index:auto`). One page's sheet cannot be relied on to hold it; the standard can.
4. `bo-input-fill.css` — **light and dark blocks that name all 17 frames once each**, so the whole family
   shares one chrome per theme and no control inherits. Both state `color` and `::placeholder` because
   `reports.css` pins `#18191C` at ID level in two places.
5. Markup normalised to the canonical `label` on **5 pages**: `admin-user`, `role`,
   `main-provider-health`, `main-accounting-settlement`, and `agent-players` (which keeps its
   `.agent-search-box` class alongside, so the agent-portal sheet's own sizing still applies).

**Verified, not assumed.** 51 pages × 2 themes, every search input measured: **light 46/46 visible
controls byte-identical** (`fH36 fR8px fB0.8px/EADCC8 fBg#FFF8EB iB0px iBg transparent txt#18191C
ph#78716C icon#78716C`), plus 15 more inside collapsed panels carrying the same style; **dark 45/45**. The
remaining dark difference is the single documented tint below. The static census agrees with the rendered
one: **62 controls, 17 frame names, all 17 known to the sheets.**

**Two documented exceptions — deliberate, not drift.**

| Exception | Why |
| --- | --- |
| `layout-section.html` `#layoutFindInput` (`.layout-find-query`, 28px / radius 7px) | a **find-in-editor** bar in a toolbar, with a `Ctrl+F` hint and its own match count — not a listing search. Excluded from the guard by name. |
| `promotion.html` frame border `rgba(255,255,255,0.14)`, not `.12` | one rule in `bo-charcoal-cms.css` tints the whole filter row (search + selects + date trigger) together. Keeping the row self-consistent beat matching the last 2% of alpha, which on a 1px border over `#2A2C36` is not perceptible. |

The old "still opposite on purpose" note for `agent-players` is **superseded**: the wrapper owns the
chrome there too now, and its magnifier no longer overlaps its own placeholder.

**The guard.** `scripts/check-search-standard.py` — run it after touching any search control or any of the
four sheets:

```sh
python scripts/check-search-standard.py
```

It fails, naming file and line, when (a) a search input has no frame the sheets know, (b) a frame has no
`bi-search` child, or (c) an enumeration list does not name `.bo-search-control input`. Both failure modes
were exercised before landing this — removing the clause from `reports.css` and inventing a
`.fancy-new-search` wrapper each produce the expected finding — so the guard is known to be able to fail,
which is the only thing that makes it worth running. It skips the untracked `.tmp-*` scratch snapshots in
the tree, which are pre-change copies of these same pages and would otherwise report drift that no longer
exists.

### Casino Overview: the date picker joins the KPI grid in one container (2026-09-22)

Owner: “日期要与卡片在同一个container的设计”.

On 8.4 the date control had a rounded card of its own with a full-width empty band beneath it, and the
18 KPI tiles started again below in their own boxes — the page read as two stacked objects instead of
one panel with a date band. It is the same join §19 applies to the table pages, aimed at the tile grid
instead (§21, desktop only):

| Piece | Was | Now |
| --- | --- | --- |
| date strip | own card: bottom border, 16px bottom radii, own shadow, `16px` padding | no bottom border/radii/shadow, joins the panel, `12px 16px` |
| strip bottom margin | `0` (§15) | `-16px`, cancelling the content column's flex gap |
| KPI grid | transparent, no border, no padding | the panel's body: `#FFF8EB`, 1px `#EADCC8`, bottom radii 16px, 16px inset |
| KPI tiles | the family's card | **unchanged** — same `.quick-stats .metric` component as every other report page |

**Measured:** seam between the two **0px**; strip `border-bottom-width 0`, `border-bottom-left-radius 0`,
`box-shadow none`, `padding 12px 16px`, `margin-bottom -16px`; grid `background #FFF8EB`,
`border-top-width 0` / `border-bottom-width 0.8px`, `border-top-left-radius 0`,
`border-bottom-left-radius 16px`, `padding 16px`; tiles 383px wide with their own 0.8px border intact.
Dark mode: panel `#383A46` with `rgba(255,255,255,.14)` borders, date band the same surface, no bottom
hairline.

**Scoped by `:has(+ .quick-stats)`**, so only a page where the strip really is followed by a KPI grid is
affected — and that is this page alone: on Win/Lose the strip is *below* the grid, and on 8.11 the
control above the table is a `.perf-filter-card`. Verified unchanged on `win-lose-report`: its grid has
`background transparent` / `border 0` / `padding 0` and its strip still joins the table card
(`gap 0`, `margin-bottom -16px`, no bottom border).

**Pin:** `bo-report-family.css` 1.0.23 → **1.0.24** on all twelve pages.

### Filling the last sub-row band: implemented, measured, REVERTED (2026-09-22)

Owner: “report的所有页面的table在所有屏幕 当show - entries的时候 还是会有scroll的问题 建议就是把table底部拉均匀”.

**What the owner is seeing on `bo.titanx7.com` is production, and production is behind.** The fixes that
remove that scrollbar — row heights measured instead of assumed, the head not subtracted when it is
outside the scroller, the settle corrections that used to be swallowed — are all in this working tree
and **not deployed**. On the local build every report page fits its panel with the control on `-`, and
this pass took the last two pages that did not:

| Page | Was (this session's earlier audit) | Now |
| --- | --- | --- |
| Agent Performance Report | 11 rows at 603px in a 532px panel — a scrollbar at the default | **9 rows**, band 39px, no scrollbar |
| Agent Performance Detail | 20 rows at 1074px in a 575px panel — a scrollbar | **10 rows**, band 38px, no scrollbar |
| the other eight pages | already fitted | unchanged, bands of 20–29px, no scrollbar |

Two mechanisms, both small and both kept:

- **A bounded timer verifier** replaces the one-frame `requestAnimationFrame` re-check on 8.11. The
  frame version loses its correction to its own pending flag: measured, the panel wanted 10 rows and the
  chain stopped at 11 with the table 41px too tall and nothing re-armed it. `verifyOverflow()` re-checks
  at 160ms, drops one row per pass, and gives up after three; it only runs while the table overflows.
- **A timed re-fit after the first paint on the detail page** (`setTimeout(refit, 350)`), because its
  first fit runs while the split head and the compact KPI strip are still settling.

**The even fill itself was tried, measured, and reverted.** The proposal — spread the leftover band
across the rows so the table's bottom lands exactly on the panel — was implemented in
`report-table-split.js` (stretch the rows, or fill below them with an invisible spacer, plus a 1–4px
shave for rounding slivers) and verified working on eight of ten pages at 1512×950: `slack 0`, no
scrollbar, stable over repeated samples. It was removed again for one reason, measured twice:

> **A shared fill cannot know the row height the page's own fit is about to measure.** Every fit here
> decides the next row count by measuring a painted row, so any height the fill writes feeds straight
> back into the fit — and the two watchers run independently. Measured: a stretching fill walked 8.11
> from 9 rows to 14 with the table 205px too tall, and the detail page from 10 to 20; the spacer
> version then produced the opposite failure, adding a spacer on top of rows whose heights grew after
> it measured them, and *creating* the 18px overflow it was meant to remove.

Making it work needs the fill and each page's fit to be one decision — the pattern
`operations-report.js` already uses with `resetEvenFill()` → measure → `evenFillRowHeights()`, where the
page clears the fill before measuring its own rows. Doing that properly means threading a shared
`reset/apply` pair through the six page scripts that own a fit, which is a refactor rather than a
styling pass, and it is **not done**: today the pages keep their natural row heights and a band smaller
than one row sits below the last row.

**Pins:** `report-table-split.js` 1.0.5 → **1.0.13** (it moved and came back through the reverted fill;
its only surviving change is the line above `run()` that no longer exists — see the file's git status),
`agent-performance-report.js` **1.0.14** (the timer verifier), `agent-performance-detail.js` **1.0.8**
(the timed re-fit), `bo-report-family.css` **1.0.23** (the spacer rules added and withdrawn).

### Agent Performance Detail: the eight-card financial block is now a disclosure (2026-09-22)

Owner: “框中的部分 我想做成收起来的功能 因为太大了”, then “放上去一点 too much gap”.

The financial readout (Deposit · Withdraw · Bonus · Player Win · Player Loss · Settlement · Pending ·
Available Balance) is eight cards in a 2×4 grid — **247px of the page's height for reference data**,
on a page whose reason to exist is the betting-records table below it. It is now a disclosure, and
its control lives in the page's **own header row**, right-aligned after the agent name:

| | Collapsed (default) | Expanded |
| --- | --- | --- |
| Control | in the header row (`aria-expanded="false"`, chevron at rest) | same row, chevron rotated 90° |
| Cards | hidden — the panel is `display:none`, so it contributes **no** height | 211px, opened between the KPI strip and the table |
| Table panel | **636px → 9 rows** fitted (1904×900) | 409px → 5 rows |

**Why the control moved twice.** As its own row it cost a 36px band *plus* two 16px gaps, and the
owner read it as a floating chip between the KPI strip and the table. Moving it into the header row
removes the band entirely. The cards themselves stay where they were — between the KPI strip and the
table — so the reading order is unchanged: headline numbers, then their breakdown, then the records.

**The second, less obvious gap.** Hiding only the grid left a **0px-high panel in the flex column**,
and the column's 16px gap applies on both sides of it, so the KPI strip and the table card ended up
**32px** apart when collapsed — the very “too much gap” the control was moved up to remove. Measured
before/after: `gapKpiToCard` 32 → **16**. The panel is now `display:none` as a whole.

**Toggling re-fits the table.** This page is viewport-locked (§15), so collapsing the block hands
~270px to the table panel and the fitted row count has to be re-derived — a disclosure that only
changes `display` would leave the table sized for the expanded layout. `setOpsOpen()` therefore
resets the fit and re-renders when the control is used.

**The state persists** (`localStorage: bo_perf_detail_ops_open`) because it is a preference about the
panel's height, and it is applied **before the first render** — `setOpsOpen(opsOpen(), false)` runs
ahead of `renderRows()`, so the fit is measured against the panel the reader will actually see.
Applying it afterwards would fit rows to the expanded height and then collapse the block out from
under them. Verified collapsed → expanded → collapsed → reload: 9 / 5 / 9 / 9 rows at 1904×900.

**The summary line is the first thing to go, not the name:** below 1500px the
`Deposit · withdraw · bonus · settlement · balance` hint is hidden and the control shrinks to its
label (measured 453px → 179px at 1366), with the agent name ellipsising rather than being squeezed.

**The toggle keeps the page's own button chrome** — measured `#FFF8EB` fill, 1px `#EADCC8`, 8px
radius, 36px tall, the same treatment `Back to Report` gets beside it. The first version also
declared `border:0; background:transparent; width:100%`, and **all three were dead**: a global
`.report-main button` rule wins them. They are deleted rather than left in place, because
declarations that are written and never applied are exactly how this file has been misread before.

**Pins:** `agent-performance-report.css` 1.0.15 → **1.0.19**, `agent-performance-detail.js`
1.0.3 → **1.0.5**.

### The `-` page-size fit, audited page by page across the family (2026-09-22)

Owner: “你看还有一些report的页面 没调整好他的默认 entries 但能scroll的问题 处理完后记得 要帮我审核清楚”.

The screenshots were the two games pages: `Showing 1 to 14 of 15 members` with the last row cut behind a
scrollbar while the control still read its default `-`. **Four distinct bugs** were found behind that
one symptom, and each was measured before it was changed:

1. **A hard-coded row height.** `player-game-ranking.js` measured with `ROW_H = 40` while these rows
   render at **41** (13px text, 10px cell padding, the provider pill), so `floor(avail / 40)` asked
   the server for exactly one row more than the panel can show. Now measured from a painted row
   (`measureRowH`), with 41 only as the fallback.
2. **A head subtracted that was no longer there.** `casino-report.js` and `operations-report.js` both
   used `headH = head ? height : 44` — a stand-in for "no thead found". At ≥992px
   `report-table-split.js` lifts the head **out** of the scroller, so the wrap is body-only and there
   is no head to subtract; the 44 came off anyway, worth one row. Measured on the casino reports:
   676px of panel at 38px rows, `(676 − 44) / 38 = 16.6 → 16`, leaving a 68px dead band above the
   footer. Now `: 0`.
3. **Settle corrections that never reached the request.** Three separate reasons, all silent:
   `player-game-ranking.js` read `plan.size` in its auto path and so ignored the `fitLock` it had just
   computed (which also made it loop — eight identical `size=18` calls); its `load(false)` was called
   from inside `load()`'s `try` block where `loading` is still true, and `load()` bails on that guard;
   and `operations-report.js`'s `settleAutofit()` required `tableBodyEl`, which does not exist on
   promotion-report at all (`#reportTableBody` and `.bo-tx-table-body` are the transaction page's),
   so the whole settle was skipped on one of the two pages that share it. All three are fixed —
   the size now comes from one place (`requestedSize()`), the reload is deferred a tick, and both
   settle paths read `scrollHost` (`tableBodyEl || tableWrap`).
4. **A fit that converges against transient geometry.** The panel's height still moves during the
   first paints (the head is split out; a `min-width:1500px` table claims its 6px horizontal bar), so
   a fit that agrees at convergence can be one row long a frame later. Measured on 8.11: 10 rows at
   57px = 570 in a 562px panel — the last 6px of the last row behind the bar — and on the games page
   at 1280×760: 12 rows at 41px = 492 in a 491px panel. Both now **verify one frame later**
   (`requestAnimationFrame` re-check) and step down once if the painted rows really do overflow, the
   same post-paint verification `operations-report.js` already had.

**The audit, all twelve pages, on a stubbed API** (57 rows / 20 rows, 1512×950; every harness stubbed
the API before any page script — `operations-report.js` loads at parse time and had to be intercepted
first):

| Page | Rows fitted | Row height | Panel cap | Verdict |
| --- | --- | --- | --- | --- |
| Win/Lose Report | 13 | 41px | 561px | no scroll |
| Casino Deposit/Withdraw | 17 | 38px | 676px | no scroll |
| Casino Breakdown | 17 | 38px | 676px | no scroll |
| Casino Provider Win/Loss | 17 | 38px | 681px | no scroll |
| Casino Bonus | 17 | 38px | 681px | no scroll |
| Promotion Report | 17 | 41px | 681px | no scroll |
| Transaction Report | 16 | 43px | 722px | no scroll |
| Frequently Played Games | 16 | 41px | 681px | no scroll (also 12/531, 11/491, 14/591, 15/631 at 1366/1280/1440/1600) |
| Highest Turnover Games | 16 | 41px | 681px | same five widths |
| Agent Performance Report | 9 | 57px | 562px | no scroll, 6 tiles one row |
| Agent Performance Detail | 6 | 54px | 362px | no scroll, 6 tiles one row |
| Casino Overview Report | no table | — | — | 18 tiles scroll inside the content column (see §15) |

On every one: the control reads `-`, the document itself is **not** scrollable, the content column is
not scrollable, no panel has a scrollbar at the fitted size, and no tile label or value is clipped.

**A note on the measurement harness**, because it cost two false readings: `API_CONFIG.BASE_URL` on a
local machine resolves to the **production** host, so a harness that stubs `fetch` after `config.js`
silently measures *production's* 401 — and a harness that stubs it after `operations-report.js` misses
that page's parse-time load entirely. The stub goes first in `<head>`, before every other script.

**Pins:** `player-game-ranking.js` 1.0.3 → **1.0.8**, `casino-report.js` 1.0.17 → **1.0.19**,
`operations-report.js` 1.0.13 → **1.0.15**, `agent-performance-report.js` 1.0.7 → **1.0.9**
(and `win-lose-report.js` **1.0.7** from the earlier pass in this same audit).

### The DB-side menu label defect (reported, not fixable here)

In the 8. Report flyout, **item 3 renders as `Win/Lose Report` with no `8.3` prefix** while every
neighbour is numbered (`8.1 Overview Report` … `8.11 Frequently Games Report`). These labels do
not exist in this repository: `auth.js` builds the sidebar from "DB-backed menus from localStorage"
and its own comment says "Database Menu Management is authoritative. Never rewrite a configured
menu URL in the sidebar." The label is therefore a menu record, editable in
`menu-management.html` — not a code change, and not something this pass could or should have
worked around in JS.

### Table zebra on the MAIN panel pages (2026-09-16, owner request)

"All tables on the main pages must have zebra." They did not: measured on
`main-admin-detail` / `main-merchant-detail` / `main-merchant-profit`, every body row was
`background: transparent` on one panel colour, separated only by hairlines — a wide row was hard
to follow across. Only the report family (a faint amber wash) and the transaction family
(`bo-wallet-transaction-amber.css`) had any rhythm.

- **New shared layer: `assets/css/bo-table-zebra.css`**, linked as the **last** stylesheet on the
  27 `main-*` / `main_*.html` pages that actually contain a `<table>` (12 more have none and were
  left alone). The scope is the link, not the selector — that is what keeps the blast radius at
  exactly those pages.
- **Values are the locked ones**, so every listing in the panel now stripes alike:
  light odd `#FFF8EB` / even `#FFF1DC` / hover `#FFE8CC`; dark odd `#3A3C48` / even `#434653` /
  hover `#444654`. These are the `--bo-table-*` values from
  `.interface-design/system.md` → Patterns → Data tables → Transaction listing table, re-declared
  as `--bo-zebra-*` in this layer. The report family's own faint amber wash (`rgba(217,119,6,.045)`)
  loses to this by specificity, so the family no longer has a second, different rhythm.
- **The stripe is painted on the cells, not on the `<tr>`.** A row background is covered by any
  cell that sets its own — the hover rules, `.value-positive`/`.value-negative`, the avatar tints —
  whereas painting the cells makes the stripe the base layer those sit on. It also keeps the
  `border-collapse` hairlines crisp.
- **Hover is restated inside this layer, after the stripes.** The pages' own `tr:hover td` rules sit
  at a lower specificity than the striping here, and a stripe that out-ranks the hover is how a
  table stops feeling interactive. Verified with a real mouse move: light row `#FFF1DC` → `#FFE8CC`,
  dark `#3A3C48`/`#434653` → `#444654`, both matching the locked hover token.
- **Semantic rows keep their meaning.** `.is-suspended-row` is excluded from the stripes *and* its
  cells are cleared, because its red tint is painted on the `<tr>` — clearing the cells lets it
  through (verified: cells measure transparent, the row tint still shows). `.total` is excluded but
  deliberately **not** cleared: its fill lives on the `td` (`tr.total td`), so a transparent
  override would have erased the total row. The single colspan empty-state row (`:has(> td.mad-empty)`)
  is not striped.
- Verified both themes on four pages across three families: `main-admin-detail`,
  `main-merchant-detail`, `main-merchant-profit`, `main_merchant_report` — odd/even alternate to the
  exact token values, hover intact, suspended row intact.
### Provider Pricing & Markup → Selected pricing: dark-mode Override, and the two lines at the bottom (2026-09-21, user-reported)

Two reports in one message, then a correction on the second.

- **Dark: the typed Override number was invisible.** Measured on a harness that reproduces
  `main-merchant-detail.html`'s edit workspace with the real stylesheets (`getComputedStyle`, CSS
  transitions disabled — a control mid-transition otherwise reports its light value): in dark,
  `.mac-provider-override-control` computed `#FFF8EB` while its `input` took its colour from the
  dark token (`#F5F5F4`) — white text on a cream well. The `%` segment and the Effective pill
  computed `#F7F9FC`, lit pills on a dark card. Cause: the LIGHT rules that pin those three frames
  carry `#madEditWorkspace` (e.g. `body.main-merchant-detail-page #madEditWorkspace
  .mac-provider-eff` is (1,1,2)), and an ID out-ranks any class count, so the dark rules meant to
  flip them (0,3,2, no ID — `html[data-bo-theme="dark"] body.main-merchant-detail-page
  .mac-provider-eff-wrap .mac-provider-eff`) never applied inside the edit workspace. That is
  DESIGN.md's own ID trap: when a control is pinned by an ID, its other theme belongs at the same
  level. Fixed by restating those three dark halves with the same ID — `#2A2C36` /
  `var(--bo-border)`, the locked dark well. The input needed no new rule: its colour and
  transparent fill were already right, they were landing on the wrong surface.
  The provider/currency dark block in `main-admin-detail-executive.css` appears **twice** (~6405
  and ~6505) and both copies are inert for these three frames; the ID-level restatement is the one
  that decides. `main-merchant-create.html` never had the bug — its form renders outside
  `#madEditWorkspace` (see the "same form vocabulary, but outside" note above) — verified by
  re-measuring the harness with the create page's body class set.
- **The bottom of the screen carried TWO parallel hairlines.** The sidebar's account block
  (`.bo-sidebar-account-footer`) and the sticky edit bar are the same band across the bottom: both
  end flush with the viewport, but the block was 70px (10px/12px padding around a 48px Logout row,
  `main-merchant-detail-executive.css:442`) against the bar's 73px (14px padding ×2 + the 44px
  button + its 1px border), so their top borders sat 3px apart — measured at x=180 image and x=1200
  image of the owner's screenshot: block hairline y=872, bar hairline y=868. Fixed by pinning the
  block to the bar's height for `.mad-editing` only (the bar is the only reason the two share an
  edge): `height:73px`, flex-centred, padding-top/bottom zeroed. Pinned rather than
  padding-tweaked so it survives any future change to the Logout row's own height. Verified: block
  and bar both top 827 / bottom 900, so the two hairlines are one line, in both themes.
- The bar's hairline was also the wrong colour for a shared line: `var(--bo-line, #E6EDF5)`, a
  token **defined nowhere in this theme**, so the cool blue-grey fallback painted against the
  sidebar block's warm `rgba(92,74,48,.1)`. The bar now states the sidebar's value, and dark
  matches the block's `rgba(255,255,255,.08)` (was `.14`). One line, one colour.
- **Do not inset the bar to "line it up with the content."** The first attempt anchored it at
  `calc(var(--sidebar-w) + 24px)` / `right:24px` with rounded top corners, on the theory that the
  bar stuck 24px out past the section card (the workspace's own side padding is 24px). The owner
  rejected it outright — the bar is full-bleed by design, and the defect was the *second* line,
  not the bar's edges. Reverted in the same pass. The reading that survives is the one written
  above: balance the two lines against each other, leave the band alone.
- **The Selected-pricing card chrome's light palette — as the owner specified.** The first report
  ("Selected Pricing 颜色需要调整") was about the cool-grey chrome inside these cards. After one
  rejected direction (all-beige) and a rendered three-way choice, the owner's answer was explicit
  and is what is in the tree: the **card keeps the owner-specified rung `#FFFCF7`** (not white, not
  the pane's `#FFF8EB`), and the Base tag and the Effective value take the amber metadata recipe
  `rgba(217,119,6,.12)` / `#B45309` — the same one `.mac-provider-count` in the pane head above them
  uses — with the `%` segment on the nested well `#F5EBDC`. Applied to BOTH
  `main-merchant-detail-page` and its `main-merchant-create-page` twin. The cool-grey literals
  `#F0F3F8` / `#667085` / `#F7F9FC` are gone from this component in light; `#98A2B3` remains on the
  small OVERRIDE / EFFECTIVE labels.
  **Dark keeps the charcoal well** — the tag already took `rgba(255,255,255,.06)`+muted and the
  `%` segment / Effective pill take `#2A2C36` from the ID-level block above. One trap came with the
  amber: the light rule for the Effective value states a literal `#B45309` and carries
  `#madEditWorkspace`, so it is (1,1,2) and would win in dark too — amber on charcoal. The dark
  colour is restated at the same level (`var(--bo-text)`).
  **Lesson for the next colour request:** the value the owner states (`#FFFCF7`) is the value to
  apply; a rendered option that keeps the pills but changes the card fill is still a change to the
  thing they specified.
- `?v=` was bumped `1.0.219 → 1.0.220` on all 25 `main-admin-detail-executive.css` references in
  the same pass (a page pinning the old version keeps executing the old file, and the fix then
  reads as "not applied").
- **Do not blanket-`sed -i` over `*.html` in this repo.** `sed -i` rewrote the line endings of every
  file it touched (CRLF → LF) and `git status` then reported ~150 files modified with no content
  change. Bump pins with a byte-level replace that leaves the rest of the file byte-identical.

### The bottom band on every page with a sticky action bar (2026-09-21, owner request)

"其他页面也是要去调整下方的平行线" — the two-hairline defect is not specific to Merchant Detail, so it
is now fixed wherever a page has both a sticky bottom bar and the sidebar account block.

- **Measured at 1440×900, light and dark (heights are theme-independent):** `.mac-footer-actions`
  73px · `.mprr-footer` 65px · `.mrc-sticky-footer` 69px · `.pmc-sticky-footer` 71px ·
  `.mp-footer` 60px · `.vle-footer` 68px — against account blocks of 66–70px, so **every** page with
  a bar was off by 1–8px: Add Admin / Add Merchant / Add Provider / Merchant Repayments (73 vs 70),
  Merchant Profit Record (65 vs 70), Create Role (69 vs 68), Payment Method Create (71 vs 70),
  Menu Permission (60 vs 68), VIP Level Edit (68 vs 68 ✓ the one page that happened to match).
- **One rule set in `bo-ui-standard.css`**, next to the `.bo-sidebar-account-footer` definition it
  overrides — the one stylesheet all twelve bar pages load. The block is pinned to *its* page's bar
  height and becomes a flex box that centres the Logout row, so a future change to that row cannot
  break the alignment again. Each rule is keyed on the bar element itself with `:has()` —
  `body:has(.mprr-footer) .report-sidebar .bo-sidebar-account-footer{height:65px}` — which keeps
  pages that carry the create-page class without a bar (`main-provider-endpoints.html`) untouched,
  and needs no per-page list. Merchant Detail is the exception: its bar is in the DOM while the edit
  workspace is closed, so it is keyed on `.mad-editing` instead and excluded from the `:has()` form.
- **One hairline, one colour:** the block draws `rgba(92,74,48,.1)` light / `rgba(255,255,255,.08)`
  dark on every page; the bars had their own values (`#DCC9A8`, `#EADCC8`, `var(--bo-line,#E6EDF5)`,
  white `.1`–`.14`). The bars now state the block's value, so the band closes on one line in one
  colour. `vip-pages-targeted.css` states its own hairline at a higher class count, so that one is
  escalated with the repo's `:not(#…)` id step rather than edited and re-pinned in five pages.
- Verified by measurement on all twelve pages in both themes (bar top == block top, border colours
  equal), plus a control: `dashboard.html` and `main-provider-endpoints.html` keep the block at its
  natural height because they have no bar.
- **The band's FILL is the owner-specified `#FFFCF7` too** ("指标的颜色也是还没改到我要的颜色", with the
  DevTools pointed at `.mac-edit-actions`). The bars were a mix — `#FFF8EB` (from `--bo-surface`),
  `#FFFCF7` (bo-charcoal) and a translucent `rgba(255,255,255,.96)` — so the strip changed tone from
  page to page, and a translucent fill reads as whatever is underneath rather than as the value. All
  six bar classes now state `#FFFCF7` solid in light and `rgba(56,58,70,.96)` in dark, from the same
  block in `bo-ui-standard.css`; Merchant Detail's own rule states `#FFFCF7` in place as well, next
  to the geometry it owns. This is the locked sticky-footer value in `.interface-design/system.md`
  ("Sticky footer | #FFFCF7 · border #DCC9A8 · stronger warm shadow"). Note the earlier revert of
  "the current look" was aimed at the bar's *geometry* (the inset + rounded experiment) — the warm
  fill went out with it by mistake and is back.
- `?v=` for `bo-ui-standard.css` unified to `1.0.7` on all 139 referencing pages — it was at
  1.0.4 and 1.0.6, and a page pinned to either would keep serving the file without the new rules.
### Repayments Due table — the ops-table recipe was leaking into it (2026-09-21, user-reported)

"Payment Due 字体和table 都需要再调整." Measured against the Profit Report's own ledger
(`.mad-table` on the same body class, both themes), the page differed in four ways — three of them
leaks from a rule set written for a different table.

- **Cell 3/4 alignment.** `main-admin-detail-executive.css` right-aligns cell 3 ("Credit Balance")
  and centres cell 4 ("Last Active") for **every** `.mad-table` under `body.main-admin-detail-page`,
  padding included. Here those cells are **Merchant** and **Status**: the merchant name was pushed to
  the right edge of a 24% column with ~280px of empty column to its left, and the status pill sat
  centred over a left-aligned body. Restated at that rule's own weight from the later sheet
  (`text-align:left`, padding back to 12px) — the ledger's equivalents (Merchant, Type) are both
  left-aligned. Measured `nameOffsetFromCellLeft` 12px after the fix.
- **Columns disappeared below 1400px.** The same sheet hides cells 4/6/7/8 on every `.mad-table`
  under 1400px (and 6/7/8 under 1200). Headers hid; the body cells never did — they carry no
  `data-label` — so the head simply stopped matching the body: measured 9/9 headers at 1600,
  **8/9 at 1366** (no "Payment amount", on the most common laptop width), 5/9 at 1100. The Profit
  ledger already carries the guard for this ("don't inherit Merchant list column-hiding"); this page
  now carries it too, plus the `thead`/`tbody`/`tr` half of it so the ≤992px "card list" rebuild
  cannot take the grid either (its cells are the amount inputs). Verified 9/9 headers and cells with
  head↔body column widths equal at 1600 / 1366 / 1200 / 1100 / 992 / 900 / 768 / 430.
- **Head type was a step small.** 11px / `.01em` / 12px padding → the family's `.mad-table th`
  recipe, 12px / `.03em` / `14px 12px`. The head now matches the ledger's rather than reading as a
  different table on the same screen.
- **Money cells were not bold.** Due and Paid measured 400 while the ledger's Amount column is 800 —
  only "Balance" read as a figure (it was already 800, and red). `td.num` is now 800 + tabular-nums;
  Date stays 400, so the emphasis is money-only. The status pill's 10px was a step off the locked
  scale; the ledger's own chip (`.mpr-kind`) is 11px/800, so both read at 11px.
- `?v=` bumped `1.0.5 → 1.0.7` (two passes) in the same change, per the pin rule above.
- **The amount control, second report** ("这里的设计 是不是要再调整？" — a crop of the "Payment amount"
  header over the input). Three things, all of them the same leak family or the family recipe:
  - **The native steppers sat on the right-aligned value.** `type="number"` with no reset — the same
    defect `main-merchant-detail-executive.css:4448` already fixes for the settlement modal's
    `.msr-amount-group` ("The native steppers sat under the right-aligned value"), which this input
    shares the `mac-input-group is-prefix` markup with. Both `-webkit-*-spin-button` resets +
    `appearance:textfield` now apply here too.
  - **The group was 168px wide inside a 244px cell**, right-aligned: 64px of empty cell sat to its
    left, so the right-aligned "Payment amount" header floated over a half-empty column. The group now
    fills its column (`max-width:none`) and shares both edges with it.
  - **Below 992px it then collapsed to 94px.** That layout is content-driven, where a percentage
    width does not feed intrinsic sizing — and the same card block also zeroes `min-width` on every
    direct child of a cell (`… .mad-table td > *`), which killed the first floor I set. The floor
    (`150px`) is restated inside the ≤991.98 block, scoped `td > .mprd-row-amount` at (0,3,2). It
    stays out of the base rule on purpose: in the fixed desktop layout a cell's `min-width` is
    ignored and cells do not clip, so the group spilled past its column at 992–1366px. Measured input
    width after: 105px at ≤900, 74–187px from 992 to 1600, group never outside its cell, 9/9 headers
    and head↔body widths equal at 1600 / 1440 / 1366 / 1280 / 1200 / 1100 / 992 / 900 / 768 / 430.
  - **The typed figure was 12px/700** while the money columns beside it are 13px/800 — the amount you
    type read a size down from the amount you are paying. Now 13px/800.

### Security & Audit — the detail view is a right-hand drawer, and the list paginates (2026-09-21, owner request)

"我要更改所有安全页面的audit log", with the target as a mockup: the detail opens as a panel on the
right instead of a centred dialog, and the list area changes with it. Both Security & Audit pages —
`main-merchant-security.html` and `main-admin-security.html`, which share the `.mas-*` component and
the `body.main-admin-security-page` scope.

- **The detail column is no longer a `<dl>` of two columns with the payload under it.** The old body
  was a 140px/1fr term-definition grid plus an uncopyable `<pre>` that filled the panel, and the head
  repeated the event as a subtitle. It is now three sections from the mockup: the event's own fields
  as **label over value**, `Event Details` (the payload in its own well, copy button in the section's
  title row), and `Related Information` (Event Type / Target Resource / Merchant — **Administrator**
  on the admin page). The head is the static title `Audit Log Detail`.
- **`Reason` is a conditional fourth section** (owner: "reason的话没有用的话就移除"). A successful
  event has no `failureReason`, so the section is dropped entirely rather than shown as an empty
  labelled box with a `—` in it. **This needed a change in the mapper, not just the renderer:**
  `mapLogin` produced `Reason: row.failureReason || '—'`, and that placeholder is a truthy string —
  the first pass rendered "Reason: —" for every successful login. It is now `|| ''`, and the section
  hides on the empty string. Verified all three shapes: successful login → 2 sections, blocked login →
  3 with "Invalid username or password", an operation row (which carries no `Reason` key at all) → 2.
- **The fields come from the event's existing `detail` map, not a new one.** `mapLogin` already
  produced exactly the mockup's set, so only two keys were renamed for the new layout (`Time` → the
  formatted `2026-09-21 14:44:19`, not the raw `…T14:44:19.358465`; `IP` → `IP Address`) and
  `Reason` is filtered out of the grid to be rendered once, in its own section. `mapOperation` gets
  the same two renames; it deliberately gains **no** `User Agent` row, because operation rows carry
  no `userAgent` and a permanent `—` is noise, not fidelity.
- **The two long values take the whole row.** `IP Address` and `User Agent` are full-width
  (`is-wide`, `grid-column:1/-1`); at a 460px drawer a half column wraps a user agent into a tower.
- **The copy button sits in the `Event Details` title row, not inside the well (owner: "event details
  的设计需要再调整").** Floating it in the well's top-right corner forces one of two bad outcomes:
  reserve a blank band at the top of the JSON for it (what the first pass did — measured a 38px dead
  strip above the `{`), or let a long line run underneath it. Moving it out costs nothing and the
  well becomes pure content, with the JSON starting 8px under the title. The well is also taller
  (`max-height` 280 → 320px) so the common login payload fits without an inner scrollbar — verified
  `scrollHeight == clientHeight` at 285px for a 12-line payload, where 280 still clipped it.
- **It is a column, not an overlay — the second owner pass ("我想看完整的table + Audit Log Detail").**
  The first version was a right-hand drawer over the list, which covered the Details column and
  part of Status/IP. At ≥1440px the workspace becomes a two-column grid and the panel is an
  `<aside>` **sibling of the table panel**, so the tabs and the KPI chips above keep the full
  width and the table simply yields the column — every column of the table stays visible while an
  event is open. There is no scrim, no backdrop, and no body scroll lock on desktop: the list
  stays live and `View` on another row just swaps the panel's contents. Esc and both Close
  controls still close it. Below 1440 there is no room for both, so the panel is a full-screen
  view instead.
- **Below 1440 the panel is `position:fixed;inset:0`, and that needed two fixes found by
  measuring, not by reading:**
  - **The sticky topbar painted over the panel's head**, hiding the title and the X. Cause:
    `.report-content` is a stacking context (`position:relative`, `z-index:1`, the latter
    declared `!important` in `reports.css`), so the panel's own `z-index:10000` is only ordered
    *inside* it while the topbar (`z-index:5000`) is a sibling above the whole thing. The content
    is lifted to `z-index:6000!important` while `body.mas-detail-open` is set.
  - **The panel rested 10px down, invisible, at `opacity:0`.** An entrance `@keyframes` with
    `animation-fill-mode:both` holds the `from` state; a panel un-hidden without the animation
    actually running stays there. The keyframes are gone — a full-screen surface does not need
    an entrance animation, and a stuck one is worse than none.

- **The scrim is lighter than the modal's (`.24` against `.55`).** The mockup keeps the list legible
  behind the panel; a full modal scrim on a side panel that covers a third of the screen reads as a
  different component. The page is still dimmed, so the panel is still the obvious focus.
- **The panel's body child keeps `border-radius:0`.** A full-height drawer has no bottom edge for the
  child's square corners to fight with, so the earlier `0 0 8px 8px` fix has nothing to do here.
- **The list paginates at 10, in the footer, with the family's own pager.** `pageButtons()` is
  copied verbatim from `main-merchant-detail.js` (first / last / two either side, ellipsis), and the
  `.mad-pager` + `.mad-footer-right` chrome already existed under `body.main-admin-detail-page` — the
  security CSS even had the amber `.smart-page.active` rule waiting for it. The footer's text follows
  the family ("Showing 11 to 20 of 25 records"), not the old "Showing 25 records".
- **The pager keeps its page; every filter change resets to page 1.** `applyFilters()` sets `page = 1`
  and the pager calls `renderTable()` directly — otherwise a filter change on page 7 lands on an empty
  page. Verified: page 2 → click a category pill → page 1, "Showing 1 to 4 of 4 records".
- **Row position, not page position, drives the avatar wash.** `avClass` uses `start + idx` so the
  alternation does not restart at row 1 on every page.
- **The pills row moved below the filter row, per the mockup.** This is a DOM swap, not `order`: the
  toolbar becomes `display:block` below 768px, where `order` stops applying and the pills would jump
  back to the top with their `margin-bottom` still set. That mobile rule is neutralised to `margin:10px
  0 0` in the same change.
- **A panel head ("Audit Log / View all system activities and changes") was built from the mockup and
  then removed on the owner's word — it is not in the final markup.** It never reached a commit; the
  panel still opens straight into the filter bar.
- **The table's columns are px, not percentages, and that is what fixed the crushing.** The
  percentage set needed `306px + 72% ≤ table width` to resolve — a table of **1093px or more**.
  With the detail column open the table panel is 960–1370px, and below 1093 the middle columns
  collapsed: measured on the 1280 viewport, Merchant **47px**, Action/Event **55px**, Target
  **44px**, with the target chip one character per line — exactly what the owner saw. A px set
  (96/140/162/108/142/100/72) that sums to the table's own floor is deterministic there, and the
  browser hands spare width to the columns above it. Measured after, with the panel open:
  1440 → 96/130/151/121/290/100/72; 1568 → 97/159/185/148/294/101/73; 1920 → 125/204/238/191/378/131/94;
  1280 (full-screen panel) → 105/171/200/160/318/110/79. No column wraps to a single character.
- **The head and body scrollers must share the same `scrollbar-gutter`.** They are two separate
  tables; the body reserves 15px for its vertical scrollbar and the head does not unless told
  to. With that mismatch every column misaligned by 15px (measured `headTableW 1376` against
  `bodyTableW 1361`). The head stays `overflow-x:hidden` and is scrolled programmatically, but
  keeps `scrollbar-gutter:stable`. After: header and body cell offsets are 0 at 1280 / 1440 /
  1568 / 1920.
- **Space is bought back where it is cheapest**, per the owner ("多节省空间 不要太多gap和padding"):
  the column gap 16→12px, the panel `clamp(330px,23vw,410px)` rather than a flat 460px, the
  detail body padding 18/20→14/14, the section gap 18→14, the table cell padding 16→10px, the
  toolbar gap 12→10px, the row avatar 40→34px with its gap 12→9px.
- **The list side needed the header-scroll sync the admin page already had.** Narrowing the table
  panel below the table's floor makes the body scroll sideways; the merchant page never had the
  `scrollLeft` mirror that `main-admin-security.js` carries, so it was added there too.
- **Drawer and pager were verified in a real browser, not reasoned about.** A throwaway harness page
  (real markup + real stylesheets, a stubbed `fetch` and a MAIN session in `localStorage`) was served
  by the dev server at 127.0.0.1:8080: 10 rows on page 1, 10 on page 2, 5 on page 3, the scroller
  reset to top on each page change, Esc / backdrop / Close all closing, the copy button flipping to
  `Copied`, the drawer 460×720 flush to the right edge at 1280 (no horizontal overflow:
  `scrollWidth == clientWidth`), full-bleed 390×844 in a 390px frame, and 10 rows filling the panel
  without a gap at a 1000px-tall viewport. Both themes, both pages. The harness files were deleted
  after the pass.
- **The second pass was verified the same way**, per-event: successful login → `Event Details` +
  `Related Information` only; blocked login → 3 sections with the reason text; operation row → 2
  sections; copy button centred with the `Event Details` title on the admin page in dark.
- **The third pass was measured at four widths** in frames of the real pages (auth scripts
  stripped from the harness this time, because a same-site iframe gets its own partitioned
  localStorage and the login guard bounced the frame to `login.html`): workspace/grid state,
  panel position/width/z-index, per-column widths, header↔body cell offsets, and whether any
  cell wrapped to one character. Both branches, both pages, both themes.
- **The owner's own screen still failed after all of that, and the cause was the cache, not the
  code.** The server was provably serving the new stylesheet (`curl` showed the HTML referencing
  `?v=PIN` and the CSS containing the px column set), but the page they were looking at
  rendered the *new panel layout with the old percentage columns* — a state that only existed
  between two of my own pin bumps. So the rules that took four passes to get right now live in
  **their own file, `assets/css/bo-security-audit.css`, linked last on the two pages**: a URL the
  browser has never fetched cannot be served stale, and a mid-edit in-place change to a 9,800-line
  stylesheet cannot leave one page half-updated. Their duplicates were deleted from
  `main-admin-detail-executive.css` in the same pass, so there is one source of truth per rule.
  **A reload is still needed once** — the *HTML* they had open referenced the old pins and had no
  link to the new file.
- **The toolbar was over-wide for real, independently of the cache**: search 360 + date 260 +
  three selects at 140 + Reset needed ≈ 1010px in a 1023px panel with the detail open, and the
  merchant page's extra Merchant select — an enhanced `.rounded-select-wrap` whose width is
  content-driven, not the native `.mad-select` — pushed it over. Caps are now search 200/date
  206/select 96 with the row gap at 5px. **Measured at 1500px with the panel open: the filter row
  is one line (200+260+169+160+80 = 869 in 1023), the table panel is 1023, and the columns are
  118/172/198/132/174/123/88 — every column readable, the IPv6 on one line, no horizontal scroll.**
  Note the date field's 260px is pinned `!important` by an earlier fix (its range label needs the
  room), so it survives these caps on purpose; on the merchant page at ~1568 the extra select still
  wraps the last control to a second line.
- **The Details column is gone; the row is the control** (owner: "把 details 的功能去除 用点击 active
  的方式去呈现 那么就省空间了"). Six columns now, and the freed 72px went back to the ones that
  needed it — Action/Event +24, IP +28, Target +20. The row takes `cursor:pointer`, `tabindex="0"`
  and an `aria-label`, opens the panel on click *and* on Enter/Space, and the open event keeps an
  amber wash plus a 3px left accent bar. Blocked rows keep their red: their two wash states are
  restated after the amber ones at the same weight, so selection never erases the semantic colour.
  Measured after: selected row `rgba(245,158,11,.26)`, blocked+selected `rgba(239,51,64,.20)`,
  plain odd `rgb(58,60,72)` / even `rgb(67,70,83)` in dark.
- **The active wash needed the stripe layer's own selector shape, and this is the trap worth
  remembering.** `bo-table-zebra.css` paints these cells `!important` through
  `html:not([data-bo-theme="dark"]) :is(.mad-table,…) > tbody > tr:nth-child(odd):not(…) > td` —
  **(0,6,4)** — and the security tables carry `mad-table` too. My plain selector with `!important`
  was (0,4,4) and lost, so the selected row kept the zebra stripe and only the accent bar appeared.
  The fix mirrors that shape with `.is-active` added, reaching (0,7,5). Same lesson as the
  `.rounded-select-wrap` caps below: when a rule is pinned `!important`, matching **specificity**
  is what decides, not load order alone.
- **The toolbar now fits by construction rather than by `flex-wrap`.** The enhanced selects'
  widths are content-driven (they ignored a `max-width` cap — measured 194/169/160 either way) and
  the date range is pinned at 260px by an earlier fix, so on the merchant page the row exceeded
  the panel and dropped Event Types / Status / Reset to a second line. What actually binds:
  the date range is overridden with a doubled class (`.mas-filters.mas-filters`, +1 specificity) to
  240px, the search is capped at 160, Reset's padding is trimmed to 10px, gaps are 4px. Measured
  needed-vs-available with the panel open — one line at all three: **1440 → 939 in 982;
  1500 → 1015 in 1042; 1568 → 1015 in 1097**, no clipping of any select's label.
- **`getComputedStyle().flexWrap` is not trustworthy in the in-app browser pane**, and one
  diagnostic proved it: setting `element.style.flexWrap='nowrap'` inline still read back `wrap`,
  and a CSSOM sweep found no matching rule declaring it. Geometry (rects) stayed consistent, so
  every conclusion in this pass is drawn from measured widths and heights, not from that property.
  The `flex-wrap:nowrap!important` rule is kept because it is still the right behaviour, but
  nothing depends on it.
- **The sidebar is narrower, and that is a change to the whole app, not to these two pages**
  (owner: "sidebar的空间可能可以再节省收紧一点点 让我页面的展示更有空间"). `--sidebar-w` went
  **280px → 252px → 230px** in `reports.css` — and in its `reports-dashboard-original.css` twin,
  which three pages still link — (the second step was the owner asking for 230 outright), with the nav chrome trimmed to match: `.report-nav` padding 10 → 8px and the
  row padding 10px/12px → 9px/10px. Those trims return 8px to the labels, so the sidebar's usable
  text width only drops from 212px to 186px while the sidebar itself gives the content 50px.
  **Every page moves, together, on purpose**: the sidebar is shared furniture, and a width that
  differed between pages would jump as you navigate. Consumers all read `var(--sidebar-w,280px)`
  — `.report-main{margin-left}`, the desktop flyout's `--bo-sidebar-flyout-left`, and the dark
  canvas gradient's `calc(var(--sidebar-w) * .72)` — so one value moves all of them.
  **Measured slack before choosing it** (canvas text widths against the row's real text box, with
  every nav group expanded): the longest label in the whole menu is `11.1 Menu Management` at
  150px against 166px of text box at 230px — **16px of slack**, next is `2.2 Roles & Permissions`
  at 145px / 21px slack. Zero labels wrap. That 16px is the headroom on this decision: a menu
  label longer than ~166px, or a sub-item indent grown by more than 16px, will wrap.
- **These two pages also give back their own outer padding**: the workspace held 24px on each side
  at desktop widths (48px of table width spent on margin) and is now `clamp(10px,1.6vw,16px)`.
  Together with the sidebar that is **+66px of content width** on both security pages (measured:
  workspace 1028 → 1050, table panel 996 → 1018 at a 1280 viewport).
- **Bumping `reports.css`'s pin meant touching all 140 pages that reference it** (`?v=PIN` →
  `1.0.65`). That is the cost of a shared-shell change, and it is the repo's own pin rule: leaving
  some pages on the old pin would leave them on the old cached stylesheet and on a 280px sidebar.
- **Known limit, measured, not hidden:** on the merchant page at a 1280 viewport *with the sidebar
  expanded*, the filter row still wrapped at the time of the 252px pass (it needed ≈1033px in
  970px); re-measured at 230px it needs 1033px in 992px, still two lines. That is the whole
  arithmetic of the row: search 160 + date 240 + three content-sized selects 216/169/160 + Reset 68
  + 20 of gaps = 1033, and no label here can be shortened without truncating it. It fits from
  roughly a 1600px window up, and on the owner's own screen (≈1900px) it is one line. — the Reset button drops
  to the second line. It is no worse than before this pass (the row needed more room then; the
  narrower sidebar is what brought it from 952 to 996 of panel width), and it resolves on any
  window from roughly 1600px up, or with the sidebar collapsed to the 72px rail. Closing the last
  63px would mean truncating the date-range label, which is not worth it.
- **Opening the detail folds the sidebar to its 72px rail** (owner: "他wrap下来了 可是 我不要 或者
  就是 我点开audit log detail后 我的sidebar自动收起"). This is what makes the filter row fit without
  truncating anything: measured at a 1280 viewport, the table panel goes 1018 → 1176px and the
  filter row's 996px requirement sits in 1150px of room instead of 992.
  Three things keep it from fighting the rest of the app:
  - it is **desktop-only** (`matchMedia('(min-width:801px)')`); ≤800px the sidebar is an off-canvas
    drawer, not a column;
  - the saved preference is **never written** — `bo_sidebar_mini` is untouched — and the fold is
    only undone if this code is what folded it (`body.dataset.masFolded`), so a rail the user chose
    stays a rail after the panel closes;
  - `reports.js`'s own hover-expand still works on the rail, so the nav is one hover away.
  Verified end to end: closed → sidebar 230 / main margin 230 / panel 1018; open → 72 / 72 / 1176;
  close → back to 230 with the marker cleared and the preference still `null`.
- **The row was also trimmed to fit, so it is one line in *both* states** — the fold gives room
  while reading, the trim gives it while not: search capped at 132px, gaps at 3px, Reset's padding
  at 6px, and the filter bar's own padding at 10/8 instead of 10/12. Measured at 1280 with the
  sidebar expanded: **996px needed in 1000px available — one line, no clipping.**
- **`flex-wrap:nowrap` was removed rather than kept.** Forcing it does produce one line, but the
  row then overflows and `.mas-panel`'s `overflow:hidden` clips the Reset button — measured 1007px
  into 970px. Wrapping is the better failure mode, and with the trims above it no longer triggers.
  (Whether that property was even reaching the element could not be settled: an inline
  `flex-wrap:nowrap!important` changed the layout, the stylesheet rule with the same declaration
  did not, and a CSSOM sweep found no competing rule. Nothing depends on it now.)
- **The `Action / Event` head is left-aligned like its cells** (owner: "action/event的align 与下面的
  不对齐"). It was the only column in this table whose head disagreed with its body: `th:nth-child(3)`
   carried `text-align:center` while `td:nth-child(3)` was left — inherited from the original
  stylesheet and preserved through the column-width rewrite without being questioned. The caption
  sat half a column (≈40px) to the right of every event title beneath it. Measured after: head text
  and cell text share a left edge (delta 0) on Time & Date, Merchant, Action/Event and IP; Target
  and Status read −10px only because those cells begin with a chip that carries its own 10px of
  padding, so the head lines up with the chip's box, which is correct.
- **The panel's information architecture now follows the reference the owner supplied**, using
  only what these events actually carry. What the reference has, and what happened to it:
  | reference block | here |
  | --- | --- |
  | Identity card (avatar, name, role chip, `Username · User ID`) | built from `adminName`, `roleLabel`, `username` and `raw.adminId` |
  | IP Address + geo, with copy | built from `ipAddress` / `location` |
  | Result / risk | **Result** only — the status plus the failure reason. There is no risk score |
  | Client OS, Browser Engine | parsed out of the `userAgent` the row already has (Windows / macOS / iOS / Android / Linux; Edge / Opera / Chrome / Firefox / Safari) |
  | User Agent, full width | the field itself |
  | Tabs `Raw JSON` / `Key-Value` + `Copy JSON` | Raw = `e.raw`; Key-Value = Event Type / Target Resource / actor + the event's `detail` map, i.e. what the old "Related Information" section carried |
  | `ESC` hint in the head | real — Esc does close the panel |
  | `Audit Chain Verified · SHA256 · Tamper-proof · Immutable` | a **client-computed** digest of the payload as displayed, labelled as exactly that. Not presented as a server audit chain, because this system has none |
  | `Password + TOTP 2FA` | **omitted** — nothing in a login-log row says how the user authenticated |
  | `View Admin Profile →` | **omitted** — operation rows carry an actor *name*, not an id, so the link would be dead half the time |
- **`Password + TOTP 2FA` and the risk level are the two things worth revisiting**: they are the
  only reference blocks with no data behind them. If the login-log endpoint ever returns an auth
  method or the admin record exposes a 2FA flag, both drop straight into the "Security & Network
  Details" grid.
- **Cards degrade instead of showing dashes.** An operation row carries no `userAgent` at all, so
  its panel builds two cards (IP Address, Result) rather than five with three empty ones.
- **The panel did not get bigger.** Same `clamp(300px,20vw,380px)` column, same table panel beside
  it — this pass re-organises the panel's own content only, per the owner's "别搞坏我屏幕的设计空间".
  Measured in the narrow column (1500 viewport): panel 300px, identity card + 2-column mini cards
  at 124px each, the User Agent card 255px full width, **no text overflow in any card or label**,
  and the table panel still 926px with all six columns readable.
- Verified end to end in the harness: identity (`BO` / `boss2` / `Administrator` / `Username: k ·
  User ID: #14`), the five cards with OS and browser parsed from both a Windows-Chrome and a
  macOS-Safari agent, tab switching both ways, the card copy button flipping to a check for 1.2s,
  the payload hash line, Reason appearing only on the blocked event, and the admin page's actor
  label reading Administrator where the merchant page's reads Merchant.
- **The detail panel was rebuilt a second time to the owner's mockup** — a titled head, sectioned
  label/value rows, and a compact Technical Details line:
  | mockup block | here |
  | --- | --- |
  | Head: event title + result chip + `actor · time` | was a static "Audit Log Detail"; now `e.title`, a Success/Blocked/Failed chip and `adminName · time` |
  | Login Information (Administrator, Username, IP Address, Login Time) | label→value rows; the label becomes **Event Information** and the rows Actor / Action / Target / IP / Time for operation rows |
  | Device & Location (OS, Browser, Device, Location + User Agent + Copy) | OS and Browser parsed from the row's user agent, Device is Desktop/Mobile, Location is `location`; **the whole group disappears** when an event has neither a user agent nor a location — operation rows have no user agent at all |
  | Technical Details (Event ID / Admin ID / Brand ID + `View JSON`) | the ids as a row of label/value pairs plus a toggle that reveals the payload, which keeps its Raw JSON / Key-Value tabs and Copy JSON |
  | Reason, payload digest | kept from the previous pass |
  | `View ›` Details column, `10 / page` selector, Windows/Chrome brand logos | **not taken**: the column was removed on the owner's own instruction (the row is the click target and it buys 72px), the family hides the page-size select on these pages, and there are no brand assets to draw — bootstrap icons stand in |
  | `Password + TOTP 2FA`, risk level | still no data behind them |
- **At a 1280 viewport the panel is full-screen, and that is deliberate.** The mockup shows a
  side-by-side at 1280, but it also carries **three** filter controls where these pages carry six,
  and it has no sidebar competing for width. The arithmetic here: an 820px table floor + a 300px
  panel + the sidebar leaves the filter row ~864px, and that row needs 996px — it would wrap to two
  lines, which the owner has already asked twice not to happen. Split stays at ≥1440.
- **The sidebar fold was broken for three revisions by my own bulk edit, not by the design.** The
  splice that replaced `fillDetail` ran from the wrong start marker to `function openDetail(id){`
  and swallowed `setActiveRow` and `MINI_CLASS`/`foldSidebar`, which sat in between — leaving their
  call sites behind. The symptom was exact: the panel opened and `mas-detail-open` was applied (the
  line before the call), then the click handler died, so the sidebar never folded **and the row
  highlight never appeared**. Caught by collecting `window.onerror` on the live page rather than by
  re-reading the patch. A static check is now part of the loop: strip comments and strings, then
  flag any called-but-undefined name (it would have caught all three occurrences).
- **The fold guard had a second bug worth stating**: on the second row the user clicked, the code
  saw an existing rail and concluded "the user wants a rail", clearing the marker — so closing the
  panel left the sidebar folded for good. It now returns early when the marker is already set.
  Verified end to end at 1280: closed → sidebar 230, panel 1018; open → 72, panel **1176** (the
  content really does reflow); second row → still 72 with the marker intact; close → 230 and the
  row highlight cleared; `bo_sidebar_mini` still `null` throughout.
- **The payload's two tabs fell back to browser-default buttons, and it was the same splice.**
  The block that replaced the panel's information architecture spanned from the old section
  comment to `/* ---- Page padding`, and the `.mas-tab` rules lived inside it — `.mas-tabs` (the
  container) was restored, the three rules that style the buttons were not. So `Raw JSON` and
  `Key-Value` rendered as native `<button>` chrome with a border each, which is exactly what the
  owner photographed. They were also `flex:1 1 auto`, stretching to ~560px each at a wide panel,
  which is not the mockup's compact chip; both are now content-width (73px and 72px measured, no
  text clipped) with the copy button riding at the right of the same row.
- **Two static guards now run before any page is opened**, because this class of loss — a splice
  that removes a definition but leaves its call or its rule — has now happened three times and is
  invisible in a diff you are skimming:
  - `undefined calls`: strip comments and string literals, then flag any called-but-undefined
    function name. It catches all three occurrences.
  - `missing class rules`: collect every `mas-*` / `bo-*` class the two pages and their scripts
    use, and check each against **every** stylesheet in `assets/css`. It catches the `.mas-tab`
    loss. Current state: 74 classes used, 72 with a rule; the two exceptions are deliberate —
    `mas-raw-copy-label` (a span targeted by JS for the Copied label, styled by inheriting the
    button's font) and the `mas-table-head-table` / `mas-table-body-table` markers (styling comes
    from `.mas-table`, which both tables also carry).
- **Both payload panes are now the same well, and the scrollbar is the table's, not the browser's**
  (owner: "图一 container 间距 还有 scrollbar颜色 / 图二 event type开始的align问题与上面的 raw json |
  key value 的不对称 要对齐").
  - **The asymmetry was real and measurable**: only the Raw JSON pane was a framed well (border +
    10px padding), so its text started at x=25 while the Key-Value list, being a bare `<dl>` inside
    the body padding, started at x=14 — switching tabs shifted the text 11px left. Both panes now
    carry `.mas-payload-pane` (same background, border, radius, 10px padding, 320px max-height) and
    the measured text offsets are **equal at x=25 (delta 0)**.
  - **The scrollbar was the browser default** — no colour, and the JSON ran under the thumb. Both
    panes now use the table's recipe (`#98A2B3`, hover `#667085`, rounded thumb inset by a 3px
    transparent border, 12px lane) plus `scrollbar-gutter:stable`, so the lane is reserved and the
    text never sits beneath it.
  - **The gap between the tab row and the pane was 0**, because the pane's own `margin-top` lost to
    the inherited `.mas-payload .mas-detail-raw{margin-top:0}`; it is now 8px on the head, measured
    8px in both panes.
- **The scrollbars are warm now, because a cool blue-grey on cream reads as another palette**
  (owner: "scrollbar颜色不对 与系统主题色系不对"). The panes had been given `#98A2B3` — copied from
  the old table recipe, which is a cool slate — on a `#F5EBDC` well. They now use the warm recipe
  this app already ships on several families (`bo-social-md`, `bo-layout-section-md`,
  `bo-advertisement-popup-md`, `bo-animation-effect-md`, `bo-user-management-theme`, the `vip-*`
  sheets): **`#8B6B4A` in light, `#F59E0B` in dark, `scrollbar-width:thin`**, applied to the panel
  body and both payload panes. Measured: `rgb(139,107,74)` light / `rgb(245,158,11)` dark.
  - **The `::-webkit-scrollbar*` pair was deleted rather than kept**, because it can never win:
    `bo-charcoal-shell.css` records the finding that once `scrollbar-color` is set Chromium ignores
    the webkit rules and takes the thumb from the standard property. Writing both is a rule that
    looks effective and is not.
  - **The audit table's scroller was deliberately left alone.** It already has a documented
    decision — the retired slate grey was replaced with the warm border tone `#EADCC8` in light and
    amber in dark — enforced by a `!important` rule in `main-merchant-detail-executive.css`, so a
    rule here could not win and should not overturn it. Both tones are warm; measured table value
    in light is `rgb(234,220,200)`.
- **The Reset button was the odd one out in its own row** (owner: "reset按键的设计需要再调整一下 有点
  不是很美观的大小"). Measured against the controls beside it: **6px of horizontal padding** where the
  select chips use 10-12px, a **6px** gap between its icon and label where they use **10px**, and a
  10px radius on the date trigger against 8px everywhere else. It now carries 0 12px / 10px gap /
  8px radius at the same 42px height and 13px/600 type as the select chips — measured 80×42.
  Its darker fill (`#F3E8D6` against the fields' `#FFF8EB`) was left alone: that is the one thing
  marking it as an action rather than another field.
- **Two controls in that row cannot be restyled from CSS at all, and it is worth knowing why:**
  - **The merchant select's width is inline `!important`.** `bo-ui-standard.js` measures its widest
    option and the wrapper ends up with
    `style="width:216px !important; min-width:216px !important; max-width:216px !important"`.
    Inline `!important` outranks every stylesheet declaration, so even setting the
    `--bo-select-width` custom property — which does take, measured 176px on the element — changes
    nothing, because the wrapper's inline width beats the `var()` rule that consumes it. Its 216px
    therefore grows with the brand list.
  - **The date trigger's 10px radius is not in any stylesheet.** A CSSOM sweep for a rule matching
    it with `border-radius` returns nothing, and `border-radius:8px!important` from this sheet does
    not move it either — so the picker writes it inline with priority, the same wall as the select.
- **The row was kept on one line by the levers that do bind** rather than by fighting those two:
  the search box (118px) and the row gaps (2px). Measured with the Reset at its proper size:
  **993px needed in 1000 available — one line, 7px of slack**, search not clipped.
- Verified pins: `main-admin-detail-executive.css` was at a single version across its 24 pages and
  is now `1.0.230` on all 24 (bumped 221 → 230 across this change and its five owner passes);
  `bo-security-audit.css` is new and linked last on the two security pages at `?v=PIN`;
  `reports.css` 1.0.64 → `1.0.66` on all 140 pages that reference it (two passes);
  `main-admin-security.js` 1.1.18 → `1.2.1`; `main-merchant-security.js` 1.0.13 → `1.1.1`.
### The Access Control family (11.2 – 11.6) onto the listing anatomy (2026-09-23)

Owner: "优化在 access control 的 11.2 至 11.6 页面", then "你应该去参考图里的页面设计和 report 的
页面设计", then three notes as the work landed: the count belongs beside the page title ("图二 acc
展示的位置要像图一那样"), Reset/Search come out ("reset 和 search 可以去除"), and the first cut of
11.2 read wrong ("在 11.2 的视觉效果很差 设计跑偏了").

**Two references, one recipe.** The owner named **User Management** (`index.html`,
`body.user-management-page`) and **the report family**. Both resolve to the same panel, which this
document already locks as the listing tier — so this pass applied the product's own listing look to
these five pages rather than inventing one:

| Piece | Value | Source |
| --- | --- | --- |
| Panel | `#FFF8EB` · `1px #EADCC8` · radius `8px` · `flex column` · `padding 0` | User Management `.table-card` |
| Strip (the card's first row) | `padding 14px 16px 12px` · `flex row wrap` · `space-between` · `gap 10px 12px` | same |
| Strip fields | 36px / 8px radius / `padding 0 12px` / 12px · **field labels hidden** | same |
| Strip actions | `margin-left:auto` · `align-self:flex-end` | same |
| Body | `flex:1 1 auto` · own scroll · chocolate 6px pill scrollbar, no arrows | same |
| Head | `#FFE8CC` head · `#6b360c` ink · 11px/700 · `.04em` · uppercase | DESIGN.md → Transaction listing table |
| Cells | 13px/700 · `padding 10px 12px` · first/last child 16px · tabular-nums | same |
| Zebra / hover | `#FFF8EB` / `#FFF1DC`, hover `#FFE8CC` | same |
| Dark | panel `#383A46`, head `#1F2128`, zebra `#3A3C48` / `#434653`, hover `#40424E` | same |

**The structural change is the point.** 11.2, 11.4 and 11.6 had their filter in a *separate*
`.filter-card` above the table, plus a title bar inside it — two stacked panels where the reference
has one. The filter row moved into the card, the title bar was dissolved, and 11.5's
`.standard-list-card` / `.standard-card-head` became the same `.table-card` / `.user-toolbar` pair,
so all five speak one vocabulary. 11.3 (`role.html`) shipped **no filter row at all** and now has one.
The two listings with **no footer** (11.3, 11.6) got one from a new shared module,
`assets/js/access-control-listing.js` — opt in with `data-ac-listing` on the card; it owns the footer
markup and the app-wide `.smart-page` pager, the page keeps owning its rows, and a MutationObserver
re-applies paging after the page re-renders (both pages redraw on save/toggle).

**Page chrome, per the owner's notes.** The row count moved out of the card and beside the `<h1>`
(`#adminCountBadge`, `#roleCountBadge`, `#loginLogCount`, `#ipwBadge` — **ids unchanged**, so the page
scripts keep writing them), and the title's inner block became a flex row so the chip sits on the
title's own line, as on `highest-turnover-games.html`. Every Reset / Search came out: the text fields
apply on a 400 ms debounce and the selects on change, the contract the report family already uses.
Two scripts would have **thrown on load** if only the markup had been edited — `admin-login-log.js`
and `admin-operation-log.js` wired the removed buttons with unguarded `.onclick =`, the same trap the
report pass recorded; both are re-wired. Refresh stays: it re-queries rather than filters, and
11.4–11.6 have no other way to re-fetch.

**Sorting** comes from the shared `report-table-sort.js`, which decorates every `thead th` with a
label inside a `.table-card`. Its styling lives in `bo-report-family.css` /
`bo-wallet-transaction-amber.css`, which these pages do not load, so the head cells got the control
and nothing to draw it with — the two-triangle recipe is copied into the family sheet rather than
loading a whole family sheet for one glyph.

**Defects this pass also cleared** (all measured on the rendered pages, both themes, before the
restyle; the harness is `.tmp-ac-review/`, an auth-stubbed copy of the tracked pages):

- dark **11.2** `.admin-cell-user b` `#18191C` on a `#2A2C36` row — **contrast 1.27**; `td small`
  1.82. The admin's own username was unreadable, and it was the light-mode literal from
  `reports.css:1473`.
- dark **11.3** `.role-permission-count` `#18191C`, `.role-code-pill` a light `#F5EBDC` chip on a
  dark row, and a role-type sub-label carrying an **inline** `style="color:#667085"` written into
  `access-management.js` — a cool slate at 2.79 that no theme could correct, because an inline
  declaration beats every selector without `!important`. It is a class now.
- dark **11.6** `.ipw-control-card p` `#57534E` on `#383A46` (1.8), and `.ipw-warning` a `#FFF7ED`
  band with a `#FED7AA` border across the top of a dark page, at radius 15px against the locked set.
- light **11.2** `.role-pill.super` painted `#f0e7ff` / `#7c3aed` — **the purple this document
  rejects** — and the Role column too narrow for its own pills (`overflow:visible` spill on 7 of 16
  rows; Role now takes 3 points of Display Name's width, which had the slack).
- both **11.5** the Details cell measured `clientWidth 157` against `scrollWidth 396` with
  `white-space:nowrap; overflow:visible`, painting an operator sentence over the Result badge. The
  table is `table-layout:fixed`, so the column widths are the fix; Details takes the remainder,
  ellipsises, and carries the full text on the cell's `title`. **A `table-layout:fixed` column with
  `overflow:visible` spills — it does not shrink its text** — the first cut pinned the narrow columns
  and the date then pushed into Admin.
- both **11.4** the pager markup held two `U+FFFD` bytes where its chevron icons should have been, so
  the footer rendered the literal string `?/button>` twice and offered no next arrow. It is the
  family's `.smart-page` pager now; 11.5's own `renderPager` emitted a second pager vocabulary
  (`.page-btn`) and was folded into the same one.
- **Trap re-confirmed (guard tiers).** The first cut of the strip was 108px tall with the actions on a
  second line: `bo-ui-standard.css` pins these filter grids at `width:100%` behind **two** ID-level
  `:not()` steps, and a one-ID prefix loses to it — the grid took the whole row and pushed the actions
  down. Every strip-layout rule now carries the same two-ID step as the control-tier rules
  (DESIGN.md → trap 3, again).
- **Trap (line endings).** `git checkout -- assets/css/reports.css` on this Windows clone rewrote the
  file as CRLF, and a pin is a content hash: `scripts/stamp-asset-pins.py --check` then reported 179
  pages out of date. The committed object is LF. Restoring the blob
  (`git cat-file blob HEAD:assets/css/reports.css`) returned the pin to zero drift. Do not "fix" a
  restamped pin by re-stamping — check the file's bytes first.
- **Trap (overflow copy).** The reference panel carries `overflow:hidden`, and it is deliberately
  **not** copied: this card holds house controls whose popovers live inside it (the `reports.js` role
  select builds a 280px menu; 11.4's date field holds `.ref-range-picker` inline) and
  `overflow:hidden` clips both — the same trap already recorded for the merchant create card. The
  corners are rounded on the body and the footer instead.

Scoping: `assets/css/access-control-executive.css`, every rule keyed to `body.bo-access-control` (a
marker on these six pages only), loaded last on each. **11.1 keeps its own matrix workspace** — it
carries the marker but no rule in the sheet matches it.

**Read the harness from its own origin.** The auth-stubbed copies are served on a second port
(`http://127.0.0.1:8090/.tmp-ac-review/<page>.html?theme=light|dark`) — **not** the port the real pages
use. Two reasons, both learned the hard way on 2026-09-23:

- The stub seeds `bo_admin_token` / `bo_admin_user` so a page opens without signing in. localStorage is
  per-origin, so served from the real pages' origin it also replaced the operator's own session — the
  next real page loaded with a fake token, got a 401 and logged them out.
- The stub used to set `bo_api_base` as belt-and-braces isolation. From the same origin that also
  pointed the REAL pages at `http://127.0.0.1:8080/api`, which does not exist, so a real page reported
  "Request failed" with the sidebar falling back to raw group keys while looking logged in. The override
  is gone: `resolve()` in the stub already answers every path containing `/api/`, mapping it or returning
  an empty envelope with a console warning, so isolation never needed it.

A second origin gives each its own storage: previews cannot see or disturb a signed-in session.

Verified: computed styles per element role on all six pages in both themes — head `#FFE8CC` /
`#1F2128` at 11px uppercase, cells 13px with the zebra pair, controls 36/8px, footer present,
`.smart-page` pager on all five listings, sort icons on every head cell, the count chip on the title's
line, no Reset/Search left, **0 non-clipping cell spills**, no text under 4.5 contrast, no cool-hue
chips — and the light-mode bands read straight off the render (`#FFF8EB` strip → `#FFE8CC` head →
`#EADCC8` divider → alternating `#FFF8EB` / `#FFF1DC`).
### Access Control: the follow-up unification pass (2026-09-23, owner “有一部分页面的设计需要调整统一”)

Three things still differed inside the family after the restyle. All three are now the same on
11.2–11.6, and all three were **measured on the rendered pages**, not inferred.

**1. The footer's `Show … entries` control overlapped its own text — on four of the five listings.**
Owner's screenshot: the select read `10 ⌄` with the word `entries` painted under its arrow. Cause was
in `assets/js/reports.js`, not in this family: the compact-auto-width branch pins the select's
*container* to the select's content width, and its `closest()` list included `.entries-control` —
the one container that also holds the words "Show" and "entries". Measured on `admin-user`:
`clientWidth 72` against `scrollWidth 161`. The branch already excluded `.bo-filter-row` for exactly
this reason (the note in the code says so — it used to clip VIP Reward Log's keyword field);
`.entries-control` was simply missed. It is out of that list now, and the wrap below it still gets
the exact width. Verified: 0 overflow on `admin-user`, `role`, `admin-login-log`, **and on
`index.html` (User Management)**, which shares the file and the footer — so the fix is not a
family-local workaround, it removes the defect wherever that footer appears.

**2. 11.3 had no filter field at all.** Its strip held a label and one button while its four siblings
each opened with fields. `role.html` now opens with a group search, wired in
`access-control-listing.js` — the module that already owns this card's rows, so the search and the
pager share one notion of "the rows": the page size, the `Showing a to b of c` line and the pager all
count the rows the search left, so a search reads as a smaller listing rather than one with holes.
Opt in with `data-ac-search` on the field; text waits out the same 400 ms debounce the report family
uses. Verified by typing "master" (17 → 6 rows, footer `Showing 1 to 6 of 6 entries`) and clearing it
with real keystrokes (back to 17 / 10 visible). *Note for the next reader: Playwright's `fill('')` and
`Control+a` do not clear this input in the harness — an empty value has to be produced with
`Backspace`, or by setting `value` and dispatching `input`. The two artifacts cost a debugging pass;
neither is a product defect.*

**3. 11.5 had no count beside its title.** The other four carry one. It now has `#opLogCount`, filled
from the same server total that writes the footer line, so it reads `26 Records` beside "Admin
Operation Log".

**4. 11.5's narrow columns truncated their own text.** With `table-layout:fixed`, a column narrower
than its text clips it — measured at a 1280px viewport the timestamp read `2026-09-24 09:38:…`. Each
narrow column now carries its **measured** natural width at 13px/700 (the text's own width plus the
28px of cell padding): 180 / 166 / 210 / 192 / 134 / — / 96, with Details taking the remainder, and
the table gets `min-width:1200px`. That is the reference's own answer (User Management pins
`min-width:1560px` and scrolls): a narrow window scrolls **inside the card** instead of dropping
data, and the page itself never scrolls horizontally. Verified: `Date / Time`, `Admin`, `Action`,
`Module` and `IP Address` all render in full at 1280; only `Details` clips, by design, with the full
sentence on the cell's `title`.
#### The page-size control opens on `-` — done, and what it still needs (2026-09-23)

Owner: “我的 show entries 应该统一其他页面的逻辑啊 先是默认 show - entries”.

Done. All five Access Control footers now carry the app's own list — **`-` · 10 · 20 · 50 · 100 ·
`All`** — and open on **`-`**, which is the acceptance line the report family is held to
(“on every one: the control reads `-`”). They were the only listings in the product that shipped
`10`/`25`/`50` and opened on `10`. `All` shows everything; a number means that number.

Where it lives: one resolver, `window.boAc` in `assets/js/access-control-listing.js`
(`FIT` / `ALL` / `resolve(value, card)` / `options()`), loaded **before the page scripts** on all six
pages and used by `admin-user.js`, `admin-login-log.js`, `admin-operation-log.js` and the module's own
footer. `-` resolves to `fitRows(card)`: `(window height − card top − thead − footer − 8) ÷ a painted
row's height`.

**Measured, each page, 1280×720:** every footer reads `-`, no `NaN`, no page shows an empty state, and
no panel scrolls. The fitted counts differ per page (7 / 8 / 9 / 10 / 3) because each card sits under a
different amount of chrome — a 4-tile KPI strip, a 3-tile one plus a notice band, a protection card.

**What is not right yet, and the real reason.** `admin-user` still shows 10 rather than its fit, and on
the others the fitted footer lands **22–46px below the fold**. Both come from the same cause: **this
card's height is its content's height, so "fit the panel" is circular** — an empty card is short, so
the first measurement is generous (the fit computed 10 with no rows, then 6 with rows), and each row
added makes the card taller and moves the target. The report pages do not have this problem because
their panel is **viewport-locked** (DESIGN.md §1451 “8.1–8.11 viewport-locked”, §1524 the head split
out of the scroller): the panel's height comes from the viewport, not from the rows, so `floor(avail /
rowH)` is a fixed point rather than a chase.

So the correct next step is not more arithmetic in `fitRows` — it is to bring these five listings onto
the viewport-locked panel the report family already has (card pinned to the viewport, head split out,
body the only scroller), which makes `-` exact and the footer stay put. Until then `-` is a good
approximation on four of the five pages and a no-op on `admin-user`.

Two self-inflicted breakages in this pass, both caught and repaired, both worth knowing: a text-level
insertion landed **inside a `const` declaration** and produced `Missing initializer in const
declaration` (the page stopped rendering entirely), and a re-fit hook was inserted **above** the
`const total` it tested, so it threw on the temporal dead zone and rendered nothing — “Showing 0 to 0
of 0 entries” with rows present is the signature of both. Verify a text-level edit by parsing the file
(`node --check`), and by rendering the page, not by reading the diff.
#### Access Control strip + table: audited against the references (2026-09-23)

Owner: “我的 access control 页面的下拉选单的设计 图里的 all status 设计需要调整 和 searchbar 没有统一设计
也是跑偏了 还有我的 table 设计应该没有 border radius 的吧 你要去审核其他页面的设计 再去优化”.

**Audited first, then changed.** Measured references: `index.html` (User Management) and
`win-lose-report.html`, both themes, on the rendered pages.

**1. The table has no radius — it never should have.** Reference: `thead th:first-child` radius
**0**, `.table-wrap` radius **0**, and the panel's curve comes from the card
(`overflow:hidden`, radius 8px). The family had inherited **11px on the head's outer cells** and
**12px on the body's bottom-left** — a rounded table, against this document's own rule
(“thead corners square”, → Data tables). Now 0 on every table part, with `overflow:hidden` on the card
so the panel's corners still read. Verified: `headRadius 0/0`, `wrapRadius 0` on all five pages.

**2. `All Status` was drawn wrong, and it was the same mechanism as the footer's select.**
Reference: the wrap *is* the button — wrap 150 = button 150, **no padding on the wrap**, the button at
`padding 0 12px` + `justify-content:space-between` so its own border holds the chevron at its right
edge (measured: chevron 13px inside). The family's wrap carried `padding:0 12px` (a control-tier rule
this pass added), so the visible button sat **inset inside a wider transparent box** — chevron at the
button's edge, wrap's box 12px past it. Fixed: wrap padding 0, the native `<select>` out of the flow,
the button filling the box. Verified: wrap 495…663 = button 495…663, chevron 13px inside — the
reference's own number.

**3. The search field now shares the control row's design** — height 36, radius 8, background
`#FFF8EB`, font 12/700 all equal to the select's. Two of those needed a fight worth recording: the
generic field theme paints `#DCC9A8` (form border) and `10px` radius, and it guards itself by
**enumerating ids inside its `:not()` chain** — `:not(#providerSearchInput):not(#pullLogWindowValue):
:not(#boPassword)` — each of which contributes a **full ID** to its specificity. That is why a
family-sheet rule at three ID-steps lost to it. The fix is the one this repo already established for
`.mad-search`, `.mp-search`, `.mrc-search`, `.mac-provider-search` and `#bonusSearchInput`: exempt the
component in the theme itself (→ “Why the search bars look different from page to page”). Added to
both themes.

**Still open, and honest about it:**

- The search field's **border colour** is still `#DCC9A8` on 11.2/11.3 (the select beside it is
  `#EADCC8`). Exempting the field in the two themes fixed the *radius*, then revealed a third rule
  painting that border, which the same exemption did not reach. Identified: one of the
  `bo-charcoal-legacy.css` field themes; not yet silenced.
- **11.5's selects are still 40px / 13.5px**, not 36/8. Reason found: its controls sit inside
  `<label>` elements in `.standard-filter-grid`, and the family's control-tier selectors descend
  through `.user-search-grid > .field`, so they never match that page. One selector needs widening.
#### The panel is viewport-locked — the rule the family was missing (2026-09-23)

Owner: “其他页面的 table 不会因为数据多 让整个页面屏幕需要 scroll 其他的页面只是 scroll 里面的
table数据 你好好再去审核清楚 member的 User Management 和 report 页面的设计逻辑”.

**Both references do this, and this document records both. The Access Control listings had
neither, so a long listing made the whole page scroll.**

- Member → User Management (`bo-charcoal-legacy.css:2024-2035`): `.report-content` is a flex column
  with `overflow:hidden`, the KPI strip is `flex:0 0 auto`, the listing card is
  `flex:1 1 auto; min-height:0`.
- the report family (`bo-report-family.css`, `@media (min-width:992px)`): `.report-shell{height:100dvh}`
  gives the flex chain a bounded height, and its comment states the consequence of not having it —
  with `min-height:100vh` and block flow “the document grew with the row count and the whole **page**
  scrolled while the header scrolled away with it. `position:sticky` … had nothing to stick inside”.

Applied to the family (desktop-only, `≥992px`, as the report family scopes it — below that the sidebar
is a drawer and page scroll is the better behaviour): `.report-shell` `height:100dvh` →
`.report-main` flex column `overflow:hidden` → `.report-content` `flex:1; min-height:0;
overflow:hidden` → everything above the listing `flex:0 0 auto` → the listing card `flex:1;
min-height:0` → the body `.table-wrap` the only scroller, with `thead th{position:sticky;top:0}` so
the head stays put (sticky is inert until something actually scrolls — that is the whole point).

**Measured, all six pages at 1280×720, same harness:**

| page | document scrolls | card bottom vs window | footer in view | head | fitted rows |
| --- | --- | --- | --- | --- | --- |
| index (User Management, reference) | **no** | −16 | yes | static | 5 |
| 11.2 | **no** | −16 | yes | sticky | 8 |
| 11.3 | **no** | −16 | yes | sticky | 7 |
| 11.4 | **no** | −16 | yes | sticky | 6 |
| 11.5 | **no** | −16 | yes | sticky | 8 |
| 11.6 | **no** | −16 (listing card) | yes | sticky | 5 |

The card ending exactly **16px above the window bottom** is the reference's own value — the same
`padding-bottom:16px` on the content column.

**Still approximate, stated plainly:** on 11.2 and 11.6 the body scrolls by about a row, i.e. `-`
over-counts slightly there. The panel's height is now stable, so the fit is a fixed point rather than
a chase, but the *first* measurement still happens before the rows exist. The report family's own
pages settle this with one refinement pass (`13@p1 → 12@p1` in their request trace); the family's
one-shot re-fit should converge on the same thing and does not yet on those two.
#### The Access Control items closed out (2026-09-23)

**1. The search field's border is now the listing's `#EADCC8`, like the select beside it.** The rule
painting the form value was `bo-charcoal-legacy.css`'s filter-row input theme
(`… .report-main .bo-filter-row>.bo-filter-input-item input:not([type=hidden])…`). My earlier
exemption had been appended to the `:not(.mad-search input)`-style component lists, and this rule's
chain enumerates **attribute** steps instead, so it never matched. Exempted at all eight sites.
Measured on 11.2 and 11.3: search `36px / rgb(234,220,200)` == the select's `36px / rgb(234,220,200)`.

**2. 11.5's strip controls are on the 36/8 tier.** Its fields are `<label>`-wrapped inside
`.standard-filter-grid`, and the family's control-tier selectors descended through
`.user-search-grid > .field`, so they never matched that page — it measured 40px / 13.5px against the
tier's 36 / 12. The tier selectors now cover `.standard-filter-grid > label > input/select/
.rounded-select-btn` too. Measured: `36px / 8px`.

**3. `-` now converges, so "fit" means fit.** Two separate causes, both measured:

- `fitRows()` measured the **placeholder** row: "Loading…" is a single line (38px) where a real row is
  two (57px), so 11.2 computed `319 / 38 = 8` rows where `319 / 57 = 5` fit — the body then scrolled by
  135px. It now measures the first row that has more than one cell.
- the settle pass re-applied the same size instead of re-measuring, and on 11.2/11.4 it was wired at
  **init** (before any rows existed) rather than at the end of each render. Both fixed: the module's
  settle re-resolves `boAc.resolve()` before repainting, and the page hooks sit on the render tail.

Measured after: 11.2 **5 rows, `overflowBy 0`, `wrapScrolls false`**; 11.3 7 / 0 / false; 11.4 6 / 0 /
false; 11.5 8 / 0 / false. Every page `docScrolls: false`.

**11.6 keeps an inner scrollbar, deliberately.** Its column carries a notice band, a KPI strip and the
protection card before the listing, which leaves the panel ~195px — and the house clamp
(`max(5, …)`, `pagination-standardizer.js`) will not go below five rows, so five rows in a 195px panel
scroll. That is the rule working, not failing: the **page** does not scroll, only the table data does,
which is what the owner asked for.

**4. 11.6's functions are verifiable now, and they work.** They never were verifiable before: the stub
answered `POST /entry` with `{saved:true}` and then returned the same frozen 14 rows on re-read, so a
successful write and a failed one looked identical — and the protection switch's "flipped checkbox,
stale label" was indistinguishable from a failed POST. The stub is stateful now (it mutates its own
copy and answers the next read from it, and the router threads the request `init` through so the body
reaches the handler). Measured: **Add Rule** 14 → 15 rules, badge `14 Rules` → `15 Rules`, the new
`198.51.100.7` row present; **rule toggle** Disable 0 → 1; **protection switch** opens the page's own
**Confirm Action** dialog ("Disable BO IP whitelist? …"), so it changes state only on Confirm — which
is why an unconfirmed click had looked like a stale label.
#### The Access Control modals' buttons get the house hover effect (2026-09-23)

Owner: “access control 的 admin management 的 edit admin 的按键要统一跟其他页面一样的按键效果”.

**Geometry was already identical; the missing piece was the hover effect.** Measured, 11.2's Edit
Admin row vs 11.3's Add Group row: both `36px · radius 8 · 13px/700`, ghost = cream 3D gradient
`#FFFCF7`→`#F5EBDC` with border `#DCC9A8`, primary = amber 3D with border `#E8901A` — the same pair on
both. What differed is that **neither moved on hover**: the ghost's computed `transform` was
`matrix(1,0,0,1,0,0)` — a `translateY(0)` — where the reference page's ghost measures
`matrix(1,0,0,1,0,-1)`, the locked `-1px` lift.

**Why they never had it: there is no global `.clean-btn:hover` lift in this product.** Each family
states it for its own action rows — `bo-charcoal-cms.css` for `site-customize-page .customize-head`
and `promotion-bonus-page .standardized-toolbar-title`, `bo-advertisement-popup-md.css` for
`.ad-actions`, `bo-layout-section-md.css` for `.layout-editor-actions`, `main-admin-role-create.css`
for `.mrc-btn-ghost` / `.mrc-btn-primary` (at `translateY(-1px)!important`). The Access Control
modals were simply never given theirs.

Added to the family sheet, scoped to its three action rows (`.admin-edit-actions`,
`.admin-form-actions`, `.role-create-actions`), with values copied from the locked recipes rather than
invented — DESIGN.md → Buttons (“Motion hover `-1px` · active `+1px`”, Ghost hover = reverse cream
`#FFF8EB`→`#F3E8D6` · border `#E0D0B8`) and the dark pair from `main-admin-role-create.css`
(ghost `#52545E`→`#3A3C48` · `rgba(255,255,255,.22)`; primary `#FCD34D`→`#FBBF24`→`#F59E0B` with
`#2A2C36` ink).

Measured after, both themes: Save/Submit → `translateY(-1px)` + reverse amber; Close/Cancel →
`translateY(-1px)` + reverse cream (light) / `#52545E`→`#3A3C48` (dark); `:active` → `+1px`. The
reference page's own ghost is unchanged, so the effect now matches it rather than diverging.
#### The search field showed two frames when focused (2026-09-23)

Owner: “搜索设计也有问题需要去修改”, with a zoomed crop of the focused field showing a box inside a box.

`reports.css` paints the focus state on **both** halves of a search field: the input gets its own
border and ring, and the wrapper gets

```css
.input-icon-wrap:focus-within{ border-color:#78716C!important; box-shadow:0 0 0 3px rgba(217,119,6,.10)!important }
```

Measured on 11.2 while focused: input `0.8px #EADCC8` + `rgba(217,119,6,.1) 0 0 0 3px`, and
`.input-icon-wrap` the same ring — **two concentric rounded frames**. The reference page's wrapper
measures `border 0 · radius 0 · shadow none` in every state; it is layout-only and the input owns the
single frame, which is the contract this document already states for these fields (“one border per
field”, → “Why the search bars look different from page to page”).

The wrapper is now layout-only in every state for the family's fields (guarded, scoped to the strip's
`.user-search-grid` / `.standard-filter-grid`). Measured after: wrapper `0px transparent` · `shadow
none`, input unchanged with its own ring — one frame. The select beside it was already correct on
focus (only `.rounded-select-btn` takes the amber border + `rgba(217,119,6,.14) 0 0 0 3px`, its wrap
stays bare).
#### Create Admin is a page now, not a modal (2026-09-23)

Owner: “create admin 也需要做成切入到一页的设计 然后再帮我优化调整设计”.

**The house already has this shape, and the modal was fighting it.** `main-admin-create.html` is the
locked Create/Edit Admin form: `.report-content.mac-workspace > form.mac-form > section.mac-section`
cards (lift, `#DCC9A8` border, 3px amber rail) over a footer of
`a.mad-btn.mad-btn-ghost` (Cancel) + one amber submit. Those rules are scoped
`body.main-admin-create-page …` in `main-admin-detail-executive.css`, so the new page carries that
class and inherits the hierarchy rather than re-deriving it.

**`admin-user-create.html`** replaces the modal: same 9 fields and the same endpoint
(`AUTH_ADMIN_CREATE`) as the modal had, `admin-user-create.js` fills Role / Branding / Permission
group from the same two sources, wires the password reveals, validates and returns to the listing.
Two defects the modal had are structurally impossible here:

- **the password eye buttons sat OUTSIDE their fields** in the modal (its markup had no pass-wrap);
  here each password is a `.mad-pass-wrap` with its `.mad-eye` inside it — measured: both eyes are
  within their input's box in both themes;
- **the action row was two amber buttons**; it is a Ghost Cancel + one amber Primary (measured:
  `mad-btn-ghost` Cancel, `mad-btn-primary` Create Admin), and the family's hover/active rule set now
  covers `.mac-footer-actions` so the pair lifts like every other modal footer.

`.admin-user.html` loses the create modal (−3.1 kB) and its wiring (−40 lines from `admin-user.js`,
whose `createForm`/`createBtn`/`createStatus` consts go with it); “Add Admin” is now an
`<a href="admin-user-create.html">`, so the listing keeps one modal — the edit one.

Verified in both themes: 2 sections, 9 fields, Status 2 / Role 6 / Branding 5 / Permission group 7
options populated, document does not scroll, sidebar intact.
#### 11.4: the filter row's controls share one height, and Refresh is gone (2026-09-23)

Owner: “admin login log 的 all status 的大小与其他 container 没有对齐 而且帮我去除 refresh 按键”.

**Measured before:** date range 42px · search 42px · **All Status 36px** · IP search 42px, with the
select sitting at top 222 against its neighbours' 216 — the owner's “大小没有对齐”. The previous
pass onto the locked tier reached only the **select** (its `.rounded-select-wrap` matched the family's
control-tier selectors); 11.4's other three controls are a bare `.field > input` (no
`.input-icon-wrap`) and the `.ref-range-trigger`, which those selectors never matched — so the row was
left at two heights.

All four now carry the locked listing value (36px · radius 8 · pad `0 12px` · 12px type, three
ID-steps because the generic field themes guard at two). Measured after, both themes:
**every control 36px at top 216** — `sameTop` and `sameHeight` both true.

**Refresh is removed** from the strip (markup and its `loginLogRefresh` handler), completing the
report family's contract for this page: no Reset, no Search, no Refresh — the text fields apply on the
debounce and the date range reloads on a complete range. 11.4's strip is now fields only.

Note for the next pass on this file: an insertion anchored on a selector block that had since been
edited produced a **silent no-op** — `str.replace()` cannot fail, so the script printed success while
writing nothing, and the braces count it reported was the unchanged file's. Every write in this repo
should be verified by re-reading the file for the inserted marker, not by trusting the transform's own
report (DESIGN.md → trap 5, and the same lesson as the retint's “do not trust the transform's own
report”).
#### 11.5: Refresh removed too (2026-09-23)

Owner: “Admin Operation Log 也不需要 refresh 按键” — the same subtraction as 11.4, and the report
family's contract: no Reset, no Search, no Refresh on a listing strip whose fields apply themselves.
The button and its `$('refreshBtn').onclick=load` handler are both gone, so the strip is fields only
(`.user-toolbar-actions` is empty and removed with it). Measured after, both themes: no `#refreshBtn`,
9 rows, `Showing 1 to 9 of 26 entries`, 7 sortable headers, document does not scroll — the page's
behaviour is otherwise untouched.
#### Admin Management: Edit is a page too, and the listing has no modals left (2026-09-23)

Owner: “点了 add admin 和 edit 按键 都没有跳转到正确页面”.

**Add Admin was already a link** — `admin-user.html` at `add8a35d` carries
`<a href="admin-user-create.html">` and no JS binds it any more, and :8899 was serving exactly that.
The reason a click did nothing is the **cache asymmetry**: the HTML has no `?v=` pin while its scripts
do, so a browser holding the previous `admin-user.html` runs the new `admin-user.js` (new pin) against
old markup whose handler no longer exists — a dead button. Hard-reload fixes it; the lesson is
DESIGN.md's own (“editing a shared .js without bumping its ?v= makes the fix look broken”), from the
other side: **the document itself is the one asset that cannot be re-pinned.**

**Edit is now the same page**, `?id=N`:

| | page in create mode | page with `?id=3` |
| --- | --- | --- |
| heading | Create Admin | **Edit Admin** |
| submit | Create Admin | **Save Changes** |
| password | Password * / Confirm Password * | **New Password (leave empty if no change)** / Confirm New Password, blank |
| fields | empty | **prefilled** `desmond.lim` · Desmond Lim · role 2 · status 1 |

`admin-user-create.js` gained the mode: it pre-fills from the list the listing itself uses (a page has
no `data-row` button to read), posts to `adminUpdateUrl(id)` with the modal's payload
(`{username, displayName, status, roleId, brandId, password}`), and returns to the listing. The row's
pencil and the mobile card's Edit are `<a href="admin-user-create.html?id=N">`, and **both modals are
gone from `admin-user.html`** (−3.1 kB create earlier, −2.5 kB edit now); `admin-user.js` lost
`openEdit`, the delegated edit branch and the edit submit handler.

**A cut of mine took two neighbours with it, and the check that caught it was a click, not the diff.**
Removing the delegated branch that called `openEdit` cut to the end of the shared click listener, which
also held the **delete** and **password-reveal** branches. Restored verbatim from HEAD, then verified by
clicking: the delete button still opens its dialog and still refuses the logged-in account
(“You cannot delete the admin account currently logged in”), and both edit controls measure as links
(`pencilTag: a` → `admin-user-create.html?id=1`). Two more of my own slips in the same pass — a regex
that matched nothing while printing success, and a duplicated quote that broke the file's syntax — are
why every substitution in this pass is now asserted (`assert n == expected`) and the file is parsed
before anything is committed.
#### Why the new pages bounced to the dashboard — and the form footer's size (2026-09-23)

Owner: “我点 add admin 和 edit admin 都会跳回去 dashboard 而且我的 edit admin 的按键设计跑了”.

**`enforcePageAccess` carries an alias table for exactly this case, and the new pages were not in
it.** `auth.js` maps every create/edit drill-down onto the listing whose menu permission it inherits —
`main-admin-create.html` → `main-admin-detail.html`, `main-admin-role-create.html` → `menu-permission.html`,
`slider-edit.html` → `slider.html`, `vip-level-edit.html` → `vip-management.html`,
`payment-method-create.html` → `payment-method.html`, and a dozen more — with the comment repeated at
each one: “so users are not redirected to their landing page”. `admin-user-create.html` and
`role-create.html` were missing from that table, so a non-ROOT admin opening them was judged to have
no permission and sent back to the dashboard. Both now inherit their listing
(`admin-user-create.html` → `admin-user.html`, `role-create.html` → `role.html`).

Verified through the shipped function rather than by reading it: a **non-root** admin holding only the
listing's menu gets `enforcePageAccess → true` and the page stays put on both; the negative control —
the same admin with a different menu — returns `false` and is redirected away, so the test is not
vacuous.

**The form footer was on the wrong rung.** `.mad-btn` (from `main-admin-detail-executive.css`, the MAIN
panel's form footer) measured **44px · 13.5px/700 · pad 0 22px**; this family's locked metric is
**36px · radius 8 · 13px/700** (DESIGN.md → Buttons — 44px is not in the locked set at all). The family
sheet now states the 36px rung for `.mac-footer-actions .mad-btn`, measured after: both buttons 36px,
radius 8, 13px/700, the ghost cream gradient and the amber primary intact.

**And one invented class of mine went with it.** The edit-mode hint used `mac-help-inline`, which no
sheet defines — it rendered as body text inside the label at 13px/`#27272A`. The house's own constructs
are a plain `<small>` under the input (`main-admin-create.html`'s email field does exactly that) and
`.mac-label-row` + `.mac-link-btn` when the extra thing belongs in the label. The hint is a `<small>`
now: 12px, muted `#57534E`, shown only in edit mode, with the label simply “New Password”.
#### The edit pencil sat in a smaller box than the delete beside it (2026-09-23)

Owner: “图一的 edit 按键跑位了”.

The edit action became an `<a>` (it opens `admin-user-create.html?id=N`), and **this product's
row-action sizing and centring are written for `button.icon-action`** — an anchor inherits none of it.
Measured: the anchor **18×27** with its glyph in a 13×17 inline box, against the delete button's
**36×36** with a 13×13 centred glyph. Both now carry one box (36×36 · radius 8 · `inline-grid` ·
`place-items:center`), measured identical in both themes — `identicalBox: true`, glyph 13×13 centred
on each.

Scope note: the rule is keyed to `.table-card tbody .icon-action`, so it covers every action control
in the family's listings and is indifferent to the tag — the same reason a `<button>` was the right
element until a page needed to link.
#### A working-tree asset can silently revert a committed fix (2026-09-23)

Owner, after the alias commit: “点 add admin 和 edit admin 又跳回 dashboard了”.

**It was not the new code — it was the checkout.** `assets/js/auth.js` carries **someone else's
uncommitted work** in this working copy (the collapsed-sidebar rail-label feature). Every pass in this
session moves that work aside to derive asset pins from *committed* content, and moving it back
overwrites the file — so the alias I had just committed (and verified through the shipped function)
was gone from the working tree while remaining correct in the commit. Their local server serves the
working tree, so the redirect came back.

Fixed in place: the alias is now written into the working-tree `auth.js` as well, appending only the
two lines — their rail-label code is untouched — and the `.tmp-wip/` backup was refreshed to match, so
a future move-aside/restore cycle cannot drop it again.

**The rule this leaves:** when a fix lives in a file that also holds foreign uncommitted work, the
commit is not the environment. Check the served file, not just the branch — and keep the aside-copy in
step with anything you add. Verified after: a non-ROOT admin holding only the listing's menu gets
`enforcePageAccess → true` and both new pages stay put, with the negative control still redirecting.

### The Add/Edit Admin page on the house's own create-page ladder (2026-09-24)

Owner: “先修改优化设计再 决定要不要给这个add admin和 edit admin页面scroll”. The design authority is
`main-admin-create.html` — the house's own create page for an admin account, i.e. the same job as
`admin-user-create.html` (`?id=N` = edit). Measured A/B, computed style, light and dark:

| element | reference | family (after) |
|---|---|---|
| section head | `.mac-section-head` + `<h3>` 13px/800/uppercase/ls .78 | identical |
| section icon | 28×28 · `rgba(217,119,6,.16)` · glyph `#B45309` (dark `.12` / `#F59E0B`) | identical |
| field label | 13px/700 `#27272A` | identical |
| field help | `<small>` 12px/500 `#57534E` | identical |
| **input** | `1px solid #EADCC8` · **radius 10px** · 44px · pad `0 14px` · 13.5px/500 | identical |
| **footer band** | `fixed` · pad `14px 24px` · **73px** | identical |
| **footer button** | 44px · pad `0 22px` · 13.5px/700 · radius 8 | identical |

Two things were wrong, both mine:

**1. The footer was on the wrong ladder.** I had pinned `.mac-footer-actions .mad-btn` to the listing
tier (36px). But `bo-ui-standard.css` documents this band as **73px (14px ×2 + the 44px button + 1px)**
and pins the *sidebar account block* to 73px on any page carrying `.mac-footer-actions`
(`body:not(#bo-bottom-band-off):has(.mac-footer-actions) .bo-sidebar-account-footer{height:73px}`).
A 36px button made the bar **65px against a 73px block** — precisely the pair-of-parallel-hairlines
defect that block exists to prevent. The 44px button also matches the 44px fields above it. The 36px
tier is for *listing* controls (filter rows, pagination), not a form's action bar.

**2. The field kept `#DCC9A8` / 8px.** The winner was not the field ladder (`bo-input-fill.css`) but
`bo-charcoal-legacy.css`:

```
html:not([data-bo-theme="dark"]) body:not(#bo-charcoal-off).report-body.bo-charcoal .report-content
  input:not(...#providerSearchInput):not(#pullLogWindowValue):not(#boPassword):not(…)
```

**4 ID-steps and 23 class-steps.** So the `:not(#…)` escalation this repo uses elsewhere **cannot**
beat it — parity on classes is hopeless and a fifth ID would be needed. The sheet's own design is an
*enumeration of what it does not own*, so the fix is to extend that enumeration, exactly as its
`.bo-access-control .input-icon-wrap input` entries already do: `:not(.bo-access-control
.mac-field .form-control)` on its **4** input sites (light base/focus, dark base/focus). Select and
textarea needed nothing — their legacy rules are shallower and the family sheet already out-ranked
them, which is why only the two `<input>`s were wrong.

The structural difference underneath: **`main-admin-create.html` carries no `bo-charcoal` class at
all**, so the legacy sheet never reaches it; its inputs come from `reports.css`'s
`.report-content input…` rung. The exemption lands the family's inputs on that same rung — measured
after: `1px solid rgb(234, 220, 200)` / `10px`, byte-identical to the reference in both themes.

#### The scroll decision, measured rather than assumed

Form pages **scroll**; listings **stay locked**. The lock is scoped `:has(.table-card)`, and the house
create page is never clamped — auto-height shell with `.report-content{overflow:auto}` as its scroller.

The subtlety that corrected my earlier claim: **`docScrolls` is a property of the window, not of the
page.** At the harness's 1600×2000 panel *nothing* scrolls — my page and the house's alike — so
"the reference scrolls" was really "the reference was measured in a shorter window". At a realistic
**1600×800** panel the form outgrows the window, the document scrolls, and scrolling to the end leaves
the last field clear of the fixed 73px bar. Both new pages now render at 1600×800 in the harness so
this stays tested (at 2000px the check would silently pass on a page that could never scroll).

`verify-preview.py` now judges the two page kinds on their own terms: **form pages** on fields, labels,
section head, 13px/800 title, the input ladder, a fixed 73px footer, `overflow:auto` content, a shell
that is *not* clamped to `100dvh`, and the last field reachable above the bar; **listings** on the
document not scrolling and `.table-card > .table-wrap` being the scroller. Result, light and dark:
**10 of 11 pages OK** — the one remaining is `role-create.html`, still on the listing markup.

Working-tree note: this pass ran with the colleague's uncommitted rail work set aside (166 files
copied to `.tmp-wip/cur2/`). Their work is unstaged, untouched, and restored on disk afterwards; the
only files in this commit are the family's own.

### The role page: a shared script's modal assumptions, and the row actions (2026-09-24)

Owner: “Role Management的add 和 edit 也要跳去一个页面 然后也要优化调整设计”. The page gets the same
treatment as the admin one — `main-admin-create-page` on the body so the house create ladder applies,
two `<header class="mac-section-head">` + `<h3>` pairs, fields on the `.mac-field` ladder, the
`.mac-footer-actions` band (measured `fixed`, 73px), and the matrix toolbar where the sibling modal
keeps it (`.role-permission-quick`, trailing the section head).

**Why edit mode showed 0 of 25 ticks.** `openEdit` writes the modal title and subtitle through an
**unguarded** dereference, 17 lines below the *guarded* version of the same write in `resetModal()`. On
a page with no modal that throws **after** the name and the hidden id are set and **before** the
permission fetch — so the page looked half-loaded and the matrix stayed empty. It was invisible
because `msg()` is null-safe: the error went into an element that does not exist on this page.
Sampled trace before the fix, every 250ms from 250ms to 4s:

```
checked=0  boxes=75  name="Senior Master"  status=""  badge="17 Groups"  editId=3
```

After guarding those two writes, the same trace measures **25 of 25 grants ticked** (26 checked boxes
— the extra is the group toggle the matrix derives, verified against the fixture's 25 ids).

**Wiring.** The listing opts in with `body[data-role-edit-page="role-create.html"]`; the shared renderer
emits `<a class="clean-btn role-edit-btn" href="role-create.html?roleId=N">` row actions when that
attribute is present and keeps its `<button data-edit-role>` path everywhere else, so no other page
changes behaviour. `role.html`'s Add button is a link to the page and its modal (1733 bytes) is gone;
the three modal hooks the shared script still touches (`#accessForm`, `#selectAllPermission`,
`#clearAllPermission`) are now guarded. The opener (`#openRoleModalBtn`) and the `#checkList` render
already were. Measured after: 17 rows, `roleActions.tags = "A"`, first href
`role-create.html?roleId=2`, Add → `role-create.html`.

**A regression this pass caught, and the gate hole it exposed.** `const editPage` was first declared
inside the *desktop* row builder's arrow function, so the *mobile* builder threw
`ReferenceError: editPage is not defined` — and the listing rendered **one row containing that error
text**. The gate stayed green because its listing rule only asked for more than zero rows; it now
requires a floor of five for a family listing, and that an opted-in page's row actions are anchors
pointing at `<page>?roleId=N`. Verify: light and dark, **0 of 12 pages failing** (9 family/reference
pages, 2 form pages, plus the edit-mode variant the harness now renders at `?roleId=3`).

#### Access & Scope to the owner's reference: four-up row, generous gaps (2026-09-24)

Owner, with a reference image: “add admin 和 edit admin的设计要优化成像图里那样”. Measured off the image
itself rather than eyeballed — its own control height calibrates the scale (78px there = our 44px, so
one image pixel is 0.564 here):

| what | image | ours |
|---|---|---|
| column gap between the four fields | 52px | **28px** |
| row gap (select row → Remark row) | 46px | **26px** |
| Remark textarea height | 159px | **90px** |
| field width | 482px | 1fr (286px at this card) |
| control height | 78px | 44px (unchanged) |
| accent bar | ~8px | 3px (unchanged) |

The house deck is a grid of **five fixed 236px tracks**, so a four-field row used 4x236px of a 1228px
card and left **512px blank**, and the Remark inherited the form's 14px gap instead of the row's 26px.
Now: rows that actually carry four fields become `repeat(4, minmax(0,1fr))`, the owner's gaps apply,
and the Remark carries `mac-field-full` (`grid-column:1 / -1`) **inside the same grid**, so the row gap
above it is the grid's. Scoped by `:has(> .mac-field:nth-child(4))`, so the role page's single-field row
keeps the house metric instead of stretching one field across the card.

**A measurement worth recording, because it nearly sent me the wrong way.** My first pass scanned the
image for "dark runs" and reported the accent bar as **48px** wide — which would have meant overriding
the locked 3px accent with a 27px slab. Sampling the actual pixels showed the amber is only ~8px at
image scale (**4.5px here**, i.e. the house bar), and the wide run was the amber *glow* plus the first
field's border being collated into one range by a first/last-only scan. Measure the colour, not the
extent.

Placeholders now match the reference — Select role / Select status / Select branding scope / Select
permission group — and they **exposed a real bug in edit mode**: `prefill()` ran at line 175 while
`loadBrands()` ran at 252, and the bootstrap's own `loadRoles()` landed *after* prefill had chosen the
role, re-filling the select and resetting the choice to its **first option**. Edit mode had therefore
been showing a plausible-looking but wrong role (the first in the list, not the record's) for as long
as the first option was a real role. The values are now ordered (`bootReady` — the bootstrap starts
first, prefill awaits it) and measured: `role = 2 "Platform Master"`, `status = 1 "Active"`, and
`branding = ""` because that admin genuinely has `brandId: null`.

Three of the four selects are optional or defaulted, and the role check the page already had covers
both create and edit, so the placeholder state is safe to submit.

#### Hiding a strip label took its field with it (2026-09-24)

Owner, on `admin-operation-log.html`: “有按键被移除了 不小心留出一小节了” — an empty band above the table,
which reads as leftover space from the Refresh button I removed there. It was not that; it was my own
rule.

The family sheet hid **every** `.standard-filter-grid > label` to drop the field captions (the reference
identifies a strip field by its placeholder / selected value). That is correct where a label **is** the
caption — the `.field > label` shape 11.2 and 11.5 use — and wrong where the label **wraps** the field,
which is how this page writes it: `<label><span>Admin</span><input/></label>`. The sheet itself styles
that shape (`.standard-filter-grid > label > input`, a few rules below), so the hide rule contradicted
its own neighbour. Measured: **both fields 0x0 with `display:none`**, so the toolbar kept its padding
and rendered as a 26px empty band.

Fixed by hiding the caption, never the field: `label:not(:has(input, select, textarea))` takes
caption-only labels whole, and `> label > span:first-child` drops just the caption inside a wrapper.
Verified after: strip children **190x36** and **207x36**, visible controls **190x36** (input) and
**207x36** (the enhancement's button — the 42px native `<select>` is the hidden one behind it), both on
the locked 36px tier with `#DCC9A8` / 8px radius like 11.5's.

**The gate missed this class of defect entirely**: it checked the document, the table scroller and a row
floor, none of which care whether the strip renders — and the page passed while showing an empty band.
It now asserts that every direct child of a family listing's filter strip renders a non-zero box *and* a
non-zero control, which is the generic form of this bug.

#### One line per row: the name once, the date in the cell, the time on hover (2026-09-24)

Owner: “在admin的column 下面数据展示为啥 还要多一个提示词 麻烦移除” and “last login 和 last logout
展示日期 然后时间统一其他页面的悬浮设计”.

**1. The Admin cell printed the username twice** — `<b>username</b><br><small>username</small>`. That
second line was my invention; the member listing's name cell is the username alone
(`cell('name', first(m,['username'],'-'))`). Removed; the `Current Login` pill stays. Measured before,
the cell read `admin admin`; after, `KUkunzz Current Login` (avatar initials · name · pill).

**2. LAST LOGIN and CREATED stacked date over time** with a `<br>` (my `shortDt`), which made every row
two lines tall for columns that only need the day. They now use the member listing's own pattern —
**date in the cell, time in the hover tip** — through `boAc.dtCell()`, added to this family's shared
listing script. Two deliberate choices: the date stays **ISO** (this family's format) rather than the
member listing's DD/MM/YYYY, and the tip element (`#umTimeTip`) plus its stylesheet (`.um-time-tip`, in
bo-charcoal-legacy.css) are global, so a page running both controllers shares one tip instead of
drawing a second.

Verified functionally, not just by eye — dispatching a real `mouseover` on a cell creates `#umTimeTip`
with `is-on`, `opacity: 1`, `visibility: visible`, positioned at that cell (1030,286), and `mouseout`
clears it. Cells measure `text="2026-09-24" tip="09:41:07" tabindex="0"`, 16px tall, so rows are one
line and the fit shows more of them.

**3. Found while in there:** `access-control-listing.js` was included **twice** on four family pages
(admin-user, admin-login-log, admin-operation-log, ip-whitelist-security) — the same duplicate I had
already fixed on role.html and menu-permission.html. Harmless, because its `init()` is guarded by
`data-ac-ready`, but it was two copies of a 334-line script per page.

**Gate.** The Admin cell must not repeat a word or carry a `<small>`; a family timestamp cell must show
the date alone, tip the time, and stay one line (≤26px). Both assertions are scoped to this family, so
the member listing's own DD/MM/YYYY cells are not judged — which the first run proved by firing on
`index.html` before I scoped it. Light and dark: 0 of 12 failing.

#### Admin Login Log: the Login Time cell gets the same treatment (2026-09-25)

Owner: “这个页面的日期和时间展示 改为时间悬浮 像其他页面一样” — the LOGIN TIME column circled, every row
reading `25/09/2026 16:40:38`.

`admin-login-log.js` printed the whole stamp in the cell (`dt()` → `toLocaleString('en-GB')`). It now
uses the family's own pair, the same two the section above landed on Admin Management: `dt()` produces
the ISO stamp, and the cell is drawn by `boAc.dtCell()` — **date in the cell, time in the hover tip**.
The page already loads `access-control-listing.js`, so the tip element (`#umTimeTip`) and its delegated
handlers were already there; the only new page-side code is that pair, and the only new CSS is the cell's
own affordance in `admin-login-log-targeted.css` (`display:inline-block`, no wrap, `tabular-nums`,
`cursor:help` — the member listing's and Wallet Ledger's four properties). No colour override: the cell
reads like every other cell in this table, in both themes.

**The visible date format changes with it — `25/09/2026` becomes `2026-09-24`.** Deliberate: ISO is this
family's timestamp format (the choice recorded above), and the column's own sort (`report-table-sort.js`
compares cell *text*) then orders as a date rather than by day-of-month. Verified by holding the whole
set on one page (size `All`) and clicking LOGIN TIME: `2026-09-22` first, `2026-09-24` last, `aria-sort`
`ascending`, 0 JS errors.

**Verified with a real mouse on the real page, not a synthetic event.** Fixtures + the API stub injected
before the page's own scripts (`Page.addScriptToEvaluateOnNewDocument`), then
`Input.dispatchMouseEvent` onto the cell at (516,327): `#umTimeTip` takes `is-on`, `opacity: 1`,
`visibility: visible`, text `09:41:07`, `position: fixed`, `z-index: 40000`, cream pill
`rgb(255,248,235)` / `rgb(107,54,12)` / `999px` in light, `rgb(64,66,78)` / `rgb(245,245,244)` in dark —
the locked tip in both themes. It sits 8px above the cell (`aboveCell: true`, cell 84×17 at y 318, tip
86×29 at y 282), and moving the mouse off clears it (`is-on` gone, `opacity: 0`, `visibility: hidden`).
Cells measure `text="2026-09-24" tip="09:41:07" tabindex="0"`.

Two things this pass did **not** change. Rows stay 55px tall: the Admin cell here is
`<b>username</b><br><small>display name</small>` — a second *field*, not a repeated word, so it keeps its
two lines and the date cell's win is consistency rather than height. And for the **first** row the tip
lands over the thead, because the helper prefers above the cell and the header is right there; that is
what every other page using this tip does (`if (top < 8)` is the only flip), so it was left alone.

#### Anchor-styled buttons were underlined (2026-09-24)

Owner: “为什么我的access control的所有页面的 add 按键 下面都有underline 麻烦移除可以吗”. The Add and Edit
controls are **anchors** now (they navigate to the create/edit pages), and `.clean-btn` — the base rule
in `reports.css`, mirrored in `reports-dashboard-original.css` — was written for `<button>`, so it never
reset `text-decoration`. An `<a class="clean-btn primary">` therefore painted the browser's default
**underline** under its label: measured `text-decoration-line: underline` with `color: white`, which on
the orange "Add Admin" fill reads as a line under the text (and on the cream Edit buttons too).

Fixed where the class is defined, not per page: `text-decoration:none` on the base rule in both sheets.
That reaches every anchor-button on the product — **24 pages** carry `<a class="clean-btn">`
(game-category, agent-detail, bank-deposit-usage, …), and the three I sampled all load `reports.css`.
Verified on the family page: **0 of 20 anchors** still compute an underline, while the plain footnote
links that *should* be underlined (none in this family) are untouched.

The gate now counts underlined anchors on a family page and fails if any remains, so re-styling a
`<button>` as an `<a>` cannot quietly bring the line back.

#### The title icon, and one search-bar standard across the family (2026-09-24)

Owner: “1.大标题的左边icon设计跑了 2.access control页面的searchbar 是否设计都统一标准”.

**1. The title icon.** My own rule was the cause:

```css
body.bo-access-control .user-title-wrap > div { display:flex; align-items:center; gap:10px }
```

The icon tile is **also** a `div` child of `.user-title-wrap`, so this re-declared it `display:flex` and
dropped the base rule's `display:grid; place-items:center` — which is what centres the glyph. The tile
still measured 36×36 at the right position, which is why it read as "the icon moved" rather than "the
icon is wrong": the glyph was simply off-centre inside it. Fixed with
`> div:not(.user-title-icon)`. Verified: tile `display:grid`, `place-items:center`, glyph 20×21 with
equal 8/8/8/8 insets. **Same trap as the filter strip's labels**: a `> div` / `> label` child selector
reaching a child that is not the one meant.

**2. The search bars were not unified.** Measured across all five listings:

| | 11.2 | 11.3 | 11.4 | 11.5 | 11.6 | reference (`index.html`) |
|---|---|---|---|---|---|---|
| field height / radius | 36 / 8px | 36 / 8px | 36 / 8px | 36 / 8px | 36 / 8px | 36 / 8px |
| border | `#EADCC8` | `#EADCC8` | `#DCC9A8` | `#DCC9A8` | `#DCC9A8` | `#DCC9A8` |
| input width | **166** | 190 | 190 | 190 | 190 | 260 |
| padding | `0 12px 0 34px` | `0 12px 0 34px` | `0 12px` | `0 12px` | `0 12px` | `0 12px` |
| wrapper | `.input-icon-wrap` | `.input-icon-wrap` | `.field` | `.field` | `.field` | `.field` |
| magnifier icon | yes | yes | no | no | no | no |

So 11.2 and 11.3 were the outliers on three counts at once: a magnifier icon, an `.input-icon-wrap`
wrapper with its own padding (which is what made the input 166px and left a second inside-edge), and the
listing border colour `#EADCC8` instead of the control colour `#DCC9A8`. Only those two pages in the
whole family carried a `bi-search`; the other three listings, the reference listing and
`highest-turnover-games.html` all ship a plain bordered field.

Unified **to the reference**: the wrapper and icon are gone, the input is a direct child of `.field`,
and it measures `190×36`, radius `8px`, `1px #DCC9A8`, padding `0 12px`, `12px/700` — identical to
11.4/11.5/11.6 and to the reference in both themes (dark uses the family's `rgba(255,255,255,.12)`).
Only the width still differs, and that comes from each page's own grid column.

The gate now asserts the standard for every family listing: 36px tall, 8px radius, `1px #DCC9A8`
(light) / white .12 (dark), `0 12px` padding, `12px/700`, and **no icon inside the field** — which is
the assertion that would have caught 11.2 and 11.3 being different in the first place.

#### The search control, site-wide (2026-09-24)

Owner: “全站页面统一bonus-category-title.html的搜索按键 确保设计都不会有问题”. Canonical, measured on that
page: the **wrapper is the frame** (1px `#EADCC8`, radius 8px, 36px tall, pad `0 12px`), the magnifier is
a **flex child inside** it (15px, `#78716C`), the input inside is **borderless with no padding**, and
focus is an amber frame with a 3px `rgba(217,119,6,.14)` ring.

**Audited before touching anything.** A script measured each control's *own parent* — an earlier
regex-based pass had walked up to the page shell and reported body classes, which is why it looked like
every page had a different wrapper. All **51 pages that carry a search input** (62 controls: 42 visible,
20 inside closed modals) were rendered and measured. The finding: most of the site already ships the
canonical shape, and the deviations are two clean groups:

- **5 wrappers off** — bulk-adjustment (`40px`), game-provider (`radius 10px`, icon `#A8A29E`),
  livechat + livechat-template (`13px` icon on a `#DCC9A8` frame), main-merchant-create (`40px`, icon
  `#71717A`).
- **16 visible controls with no frame or icon at all**, because their `.field` **input** owns the border
  instead of a wrapper.

**Landed now:** one block in `reports.css` normalises the sixteen search-wrapper idioms to the canonical
box, radius, padding, icon size/colour, borderless input and focus ring — in one place rather than five
page sheets, so the next page that reuses an idiom inherits the standard instead of inventing a sixth
variant. Verified by re-running the same audit: all five now measure canonical (e.g. `mac-provider-search`
was `40px` with a `#71717A` icon, now `36px / 8px / 0 12px / 15px #78716C`). This family's own pages use
`.field`, not these idioms, so they are untouched — the gate stays **0 of 13** in light.

**Still open, measured rather than guessed:** the 16 icon-less `.field` searches on 12 pages
(admin-user, role, admin-login-log ×2, online-users ×2, manual-rebate-approval, provider-bet-report,
index.html, agent-management, agent-promotion-admin, bank-deposit-usage, vip-exp-log, vip-reward-log,
main-provider-health). **7 of those fields carry a visible caption `<label>` inside them**, so giving them
the magnifier means restructuring markup (caption above, then a bordered wrapper holding icon + input) —
not another CSS rule; and on this family's pages the family sheet's own input-border rules sit at a deeper
guard, so they must be adapted in the same pass or the field ends up with two frames. Two cases left alone
deliberately: `layout-section.html`'s `layout-find-query` (a 28px find-in-code box, not a listing search)
and `main-provider-health.html`'s bare flex toolbar.

One shade-level residue: where a page sheet pins the icon colour at a deeper guard
(`category-search-control`, `banner-search`), the glyph stays `#57534E` rather than `#78716C`.

#### The magnifier for the `.field`-shaped searches (2026-09-24)

Owner, after the wrapper pass: “改了吗 怎么我没看到 那个搜索icon与bonus-category-title.html同款”. Correct — the
sixteen controls that lacked a frame at all were the ones left for the follow-up, and the screenshot was
one of them.

They get the canonical frame and magnifier **from CSS, with no markup change**, and only where the input
is the field's sole content:

```css
.field:has(> input[type="search"]):not(:has(> label)),
.field:has(> input[placeholder*="earch" i]):not(:has(> label)) { … frame, flex, gap 8 … }
… ::before { content:"\f52a"; font-family:"bootstrap-icons"; font-size:15px; color:#78716C }
… > input  { border:0; padding:0; height:100%; flex:1 1 auto }
```

Two things this run taught, both worth the record:

- **The family's inputs carry no `type="search"`** — only a placeholder. The first attempt matched
  `input[type="search"]` and silently did nothing on this family's pages (the frame came from the
  family sheet and the glyph never appeared). The selector now accepts either shape.
- **The `\f52a` escape was eaten**: written through a Python non-raw string, `\f` became a form-feed
  character, so the CSS shipped `content:"52a"` — an invisible glyph with a reserved 15px box, which
  reads as "the icon is missing but the text is pushed right". Repaired with an explicit backslash and
  verified by screenshot: the magnifier now renders in the field.

Guarded at **three** ID steps, not two, because on this family's pages the family sheet states the
input's own border at three — at two this would lose and the field would end up with two frames.

Fields that also carry a caption `<label>` (agent-management's "Search Agent", bank-deposit-usage's
"Bank / Display Name", …) are still deliberately untouched: framing them would swallow the caption, and
that needs markup restructuring. Two cases remain out of scope by design: `layout-section.html`'s 28px
find-in-code box and `main-provider-health.html`'s bare flex toolbar.

#### The search field's own width (2026-09-24)

Owner, seeing the new magnifier: “发生什么事了？”. The field had cut its own placeholder. Measured:
“Search username or display name” is **199px** at 12px/700, and a 190px field leaves the input **117px**
once the frame's padding (24px) and the magnifier (15px + 8px gap) are out — so the text was clipped
mid-word, and it had been marginal even before the icon (166px for a 199px string).

Fixed at the family: the search field takes **`min-width:260px`**, which is
`bonus-category-title.html`'s own search width — 199 + 23 + 24 = 246, so it fits with room to spare.
Two notes on getting there:

- The first attempt matched the selector but computed **110px**: a house rule pins this field's minimum
  at a deeper guard, so the rule needed the **three** ID-step form this family already uses.
- The visual diff showed as a *byte-identical* screenshot, which is what gave it away — a rule that
  matches but loses the cascade renders exactly like no change at all.

### One search control, site-wide — the captioned fields move to markup (2026-09-24)

Owner: “全站的搜索设计要统一 一个设计啊 只要有搜索功能都要统一标准 如 bonus-category-title.html 做标志统一”.
`bonus-category-title.html` is the standard; every page carrying a search control was measured against it.

**The standard, measured on the reference:** the *wrapper* is the frame (`1px #EADCC8`, radius `8px`,
height `36px`, `padding: 0 12px`, flex row, gap `8px`; `#FFF8EB` light, `#2A2C36` + `rgba(255,255,255,.12)`
dark), the magnifier is a **flex child inside** it (15px, `#78716C`), the input is borderless
(`padding:0`, `height:100%`, `flex:1 1 auto`, 12px/700), and `:focus-within` paints `#D97706` +
`0 0 0 3px rgba(217,119,6,.14)`.

**The class.** `bo-input-fill.css` gains section 5 defining **`.bo-search-control`**:

```html
<label class="bo-search-control">
  <i class="bi bi-search" aria-hidden="true"></i>
  <input id="…" placeholder="Search …" autocomplete="off" />
</label>
```

It is defined **there**, not beside the sixteen legacy wrapper names in `reports.css`, for a measured
reason: `reports.css` is loaded by 49 of the 51 pages that have a search control, and the two it misses —
`index.html` and `online-users.html` — are exactly the two whose search field was still unframed.
`bo-input-fill.css` is on **51 of 51** (verified by parsing every page's `<link>` list).

**Fifteen controls on thirteen pages now carry that markup** (the frame moved off the input; a caption
that a page still renders stays outside the frame):

| Page | Control | Before (measured) | After |
| --- | --- | --- | --- |
| `admin-login-log.html` ×2 | `#loginLogSearch`, `#loginLogIp` | field `36x36`, border **0px**, radius 0, pad 0, **no magnifier** | frame `36/8px/#EADCC8/0 12px`, icon 15px `#78716C`, input bare |
| `manual-rebate-approval.html` | `#searchFilter` | same | same |
| `online-users.html` ×2 | `#onlineSearchName`, `#onlineSearchMobile` | same | same |
| `index.html` | `#memberSearchQ` | same | same |
| `provider-bet-report.html` | `#betKeyword` | frame **0px** border with an **always-on** `#D97706` border, input 42px | same |
| `bank-deposit-usage.html` | `#usageKeyword` | field `40x40`, border 0 | same |
| `agent-management.html` | `#adminAgentSearch` | field `42x42`, border 0 | same |
| `agent-promotion-admin.html` | `#agentPromotionSearch` | field `42x42`, border 0 | same |
| `agent-bet-report.html` | `#agentReportPlayerSearch` | field `42x62`, border 0 | same |
| `agent-bonus.html` | `#agentBonusSearchText` | field `42x62`, border 0 | same |
| `agent-products.html` | `#agentProductSearch` | field `42x62`, border 0 | same |
| `vip-exp-log.html` | `#vipLogKeyword` | **no wrapper at all** — a bare input in the filter row, owning its own border | same |
| `vip-reward-log.html` | `#rewardKeyword` | same | same |

**Five magnifiers were off-spec, each pinned by its own page sheet rather than by the shared one**, so
each was corrected where it was pinned:

| Page | Was | Now |
| --- | --- | --- |
| `livechat.html` (+ template) | `13px` (`livechat-executive.css`, which loads after `reports.css` at the same three id steps) | `15px` |
| `promotion.html` | `#57534E` (`bo-charcoal-cms.css`, promotion section) | `#78716C` |
| `slider.html` | `#57534E` — the banner icon is `color:inherit`, so the **frame's** colour was the icon's colour | frame `#78716C` |
| `game-category.html` | `14px #57534E` in the page's own inline `<style>` | `15px #78716C` |

**Three defects remain in the `.field`-shaped CSS path — diagnosed, reported, NOT fixed.** That block
frames a caption-free `.field` from CSS and draws its magnifier with a `::before` glyph. Three of its four
rules list their two selectors inconsistently, so the `> input`, `::before` and `:focus-within`
declarations land on the **field** instead of on its input: the frame vanishes (measured on
`provider-bet-report.html`: a `36px` field with border `0px`), the focus ring is always on
(`rgb(217,119,6)` on an unfocused field), and the field grows a stray `::before` box. Only a field whose
input carries `type="search"` is hit — this site's family inputs are placeholder-only, which is why it
went unnoticed. The one-line-per-rule repair was written and then lost twice to concurrent housekeeping in
this checkout (another session was resetting the uncommitted tree), so it is NOT in this commit: the same
block sits in one of the two sheets that keep being restored, and the repair is recorded here as the
follow-up. It is inert today — after this pass no page frames a search field through that path — so a
page that needs it should use `.bo-search-control` markup instead. The comment above the block also
carried a raw **form feed** where its author wrote the `52a` escape through a non-raw string (the
*value* is intact, verified by byte, only the comment was damaged); the three form feeds in this
document's own earlier search entry were repaired and stay repaired.

**Widths: the frame costs about 47px of text room, and that had to be paid for page by page.** Moving the
frame off the input onto a wrapper takes the input's 12px padding (×2) plus the 15px magnifier and its 8px
gap. Where the field had that room the placeholder still fits; where it did not it was cut, so every case
was measured and fixed at the level that could win:

| Page | Text room before | After the wrapper | Fix |
| --- | --- | --- | --- |
| `admin-login-log.html` | 236px (needed 199) | 211px | the family's 260px minimum now also matches `.field:has(> .bo-search-control)` |
| `provider-bet-report.html` | 166px (needed 202) | 211px | `.field:has(> .bo-search-control)` floor, 260px, at four ID steps |
| `online-users.html` | 116px (needed 146) | 210px | same floor — its field was capped at 140px by the house sheet, so the floor lifts `max-width` too |
| `bank-deposit-usage.html` | 166px | 211px | same floor (the frame had collapsed to **26px** with its input at `0px` before it) |
| `vip-exp-log.html` | 272px (needed 229) | 251px | `vip-pages-targeted.css` states this page's own 300px on the wrapper, at four ID steps |
| `vip-reward-log.html` | 272px | 251px | same |
| `manual-rebate-approval.html` | — | 91px (needed 93) | still 2px short: that page's own filter grid pins the field at 140px and beating it needs a fifth ID step. Documented, not fixed |

**Two of those were regressions this pass introduced and then fixed**, both invisible to a computed-style
audit — only the rendered width showed them. `bank-deposit-usage`'s well collapsed to 26px because the
well's `width:100%` was stated at class level while the house sheet states `width`/`max-width` for these row
items (it now lives inside the 4-id block, with `max-width:none`); and `manual-rebate-approval` hid the
**entire** well, because that page hides every `<label>` inside its filter grid and the frame *is* a
`<label>` — it needed one explicit exemption in `bo-charcoal-cms.css`.

**Why the input rule carries a fifth ID step.** The field-wide input rules theme every `input` on a report
page and exempt the sixteen search wrappers by name (`:not(.mad-search input)`, …).
`.bo-search-control` is the seventeenth name and those lists do not know it yet, so it has to out-specify
them instead of being exempted. Measured step by step on `agent-bonus.html`: at two steps the control kept
its old frame; at three the **frame** won but the input did not (42px tall, with its own
`1px rgb(220,201,168)` border, inside the 36px frame); at four `reports.css`'s
`.report-content input:not(#providerSearchInput)…` was beaten; `bo-charcoal-legacy.css` still painted
`#DCC9A8` at four ID steps plus its own long exclusion list, so the input rule alone carries a fifth.
Adding `.bo-search-control input` to those lists beside the other sixteen names is the tidier fix, left as
the follow-up; this version does not depend on it. The input rule also zeroes `min-height`/`max-height`,
because the family pins `min-height:42px` on filter inputs and a 42px box in a 36px frame is an overflow,
not a frame.

**Evidence.** `measure-search.py` renders all 51 pages that contain a search control and reads each
control's own parent with `getComputedStyle`:

- **62 controls, 42 visible, and 2 visible deviations — both of them the documented exclusions below.**
  The other 12 controls the harness cannot see are hidden modals and wizards (`mad-search`,
  `mac-provider-search`, `agent-assign-search` at `0x0`), as expected.
- Focus verified on four pages (`bonus-category-title`, `index`, `vip-reward-log`, `agent-bonus`): focused
  border `1px #D97706` plus the 3px ring, at rest `1px #EADCC8` and no shadow — identical to the reference.
- Screenshots (light: `index`, `admin-login-log`, `online-users`, `vip-exp-log`, `provider-bet-report`,
  `bank-deposit-usage`, `manual-rebate-approval`; dark: `index`, `vip-exp-log`) show the frame `36/8px`, the
  magnifier inside, the placeholder not clipped, no second frame and no row overflow, at 1600×700 and at
  1600×420.
- Five pages cannot be rendered by the Access-Control harness at all (the agent-portal pages redirect to
  `agent-login.html`, because `agent-portal.js` wants an `agent_token`). They were measured through a probe
  copy that seeds that session and answers `/agent/*` locally: `agent-bet-report`, `agent-bonus`,
  `agent-products` — all canonical. `agent-players` (already canonical before this pass, wrapper-owned) and
  `bulk-bonus-adjustment` (a `.mad-search` well, canonical under the sixteen-name normalisation) were
  measured by the earlier audit and are unchanged by this pass.
- **The family gate: 6 of 13 problem pages before this pass, 3 of 13 after** — measured both ways with the
  same harness, the "before" in a scratch worktree at `85896a2e`. The three that remain are
  `admin-login-log`, `admin-operation-log` and `ip-whitelist-security`, and they fail the *same* three
  search-field checks before and after: that gate reads the frame from `input.closest('.field')`, i.e. it
  expects the **field** to be the frame, while the Access Control family currently gives the border to the
  **input**. This pass moved two of those fields onto the standard wrapper, which is one level deeper than
  the probe looks. Making the family's field the frame belongs to the Access Control migration whose sheets
  are being edited in this same tree — it is not the search standard's remaining work. (One page in that
  run, `admin-user.html`, failed with "PROBE FAILED to produce a report" under a machine running several
  Chrome instances at once; it re-runs clean, `0 of 1`.)

**Two exclusions, deliberate:** `layout-section.html`'s 28px `.layout-find-query` find-in-code box (a
code-search field, not a table search well, and 28px is its own documented recipe) and
`main-provider-health.html`'s bare flex toolbar (a row of filter controls, not a search well). Both are
reported as known non-conformances rather than silently passed. `agent-players.html` already measured
canonical before this pass and was left alone.

### Every date filter opens on today (2026-09-25, owner “全站bo/main 日期 默认当日”)

**The inventory first, because "全站" hides four different implementations.** 156 pages scanned; 63 carry a
date control (BO `bo-date-range.js` and its two family copies, the Main Portal's
`main-exec-date-range.js` → `MAIN_DATE_RANGE`, and **eighteen** page scripts with their own
`presetRange`/`preset` dictionaries), 93 carry none. Before this pass: **35 already opened on today** (the
BO family's implicit fallback — `bo-date-range.js` fills empty inputs with today) and **26 did not** —
25 on *this month*, `main-stat-detail.html` on *last month* — plus two with no default at all.

**41 default-setting expressions across 23 files now say today**: `presetRange('thisMonth')`,
`preset('thisMonth')`, `defaultPreset:'thisMonth'`, `o.defaultPreset||'thisMonth'`, `k='thisMonth'`, the
third argument of `setRange(a,b,'thisMonth',false)` (the preset pill that gets marked active), and the two
`data-range-default` attributes. The preset **dictionaries are untouched** — `key==='thisMonth'` and the
`data-*-preset="thisMonth"` option buttons are what the user clicks, so the regexes match the init call
shapes only, and the scan that follows reports **0** remaining default-shaped occurrences.

**Two of the 26 were not where the inventory pointed, and that is the part worth keeping.** The first
sweep missed every `setRange(a, b, 'thisMonth', false)` — the space after the comma — which is the
argument that lights the *This Month* pill, so those five pages would have opened on today with the wrong
pill highlighted; found by listing *every* quoted `'thisMonth'` and classifying it by hand rather than
trusting the pattern. And two pages override the shared picker entirely from their own script:
`main-stat-detail.js` computed month-to-date (`mtdFrom`/`mtdTo`) after `bo-date-range.js` had already put
today in the inputs, and `agent-management.js` set `adminAgentBetFrom` with `isoMonthStart()` — both keep
comparing as before, they just start from today now.

**Verified by rendering, not by the rule.** `check.py` loads each page and reads what the filter actually
holds (every `*From`/`*To` input), the label the trigger shows, and which preset pill is marked active:
**19 of 20 pages `2026-09-25 → 2026-09-25` with the Today pill, 1 deliberate harness case**
(`brand-management.html`'s picker is MAIN-only — its script returns early for any other role — and
verifies clean once measured as a MAIN user, which is its own precondition). One reading that looked like
a failure was my probe's: `main-provider-credentials.html`'s first label in document order is the
settlement modal's *payment date* ("Select date"), not the range label; the range itself was already
today. Theme is not a variable here — no page branches its default on `data-bo-theme` — so this pass was
measured in light only.

**Two exclusions, deliberate.** `index.html` (the member roster) keeps an **empty** range: it filters
`createdAt`, i.e. *registration* date, so "today" would open the roster showing only members who
registered today. It is a listing with an all-time default by design, not a report. And
`backup_provider.html` has date inputs (and everything else) with **no page script at all** — a fragment
with no driver, so there is nothing to default.

### The Role chip is one chip — the reference's hue-coding is gone (2026-09-28, owner "role的brand owner的设计 没有跟其他页面统一设计和颜色")

> **Reversed the same day (2026-09-28, owner 「我要恢复到 我同事那款」).** The hue-coded Role column is
> back in the same five sheets, wearing the soft-fluorescent lilac the row pass locked in Colors → Row
> status / role pills: owner/master `#F0ECFA` / `#6B5B95` (dark keeps the reference's
> `rgba(124,58,237,.22)` / `#C4B5FD`), `is-support` / `is-tech` / `is-regional` the reference's blue,
> `is-risk` its red, the rest the neutral grey. Only the colour came back — the chip is a borderless
> 999px capsule again (this pass's `1px #EADCC8` frame and its `box-sizing:border-box` are gone) — and
> the Access Control `.role-pill.super` amber variant is still untouched.
>
> **Why the md and the code disagreed for a day.** The colleague's `6f50adb1` locked the lilac in both
> md files and painted it on the merchant sheet only; 18 seconds earlier `919d352f` had deleted those
> same seven rules off the same base, so his own merge of `origin/main` (`6462e1ed`) resolved the role
> half back to this pass and kept only the mint status half. The md shipped either way — it never
> conflicted — which is how a documented, "owner locked" colour ended up in no stylesheet at all.
>
> **Verified on the rendered pages** (harness carrying both pages' own stylesheet lists and
> `data-access-page`, computed style read per chip, both themes). Merchant **and** Admin `Brand Owner`
> measure `rgb(240,236,250)` on `rgb(107,91,149)` in light and `rgba(124,58,237,.22)` on
> `rgb(196,181,253)` in dark; `Regional Master` `rgb(219,234,254)` / `rgb(29,78,216)`; a risk role
> `rgb(254,226,226)` / `rgb(185,28,28)`; a plain role `rgb(243,244,246)` / `rgb(75,85,99)` — height
> **26**, radius 999px, **border 0** in all four combinations. The Status pills did not move: light mint
> `rgb(234,247,240)` / `rgb(26,138,92)` with dot `rgb(60,184,122)`, dark `rgba(16,185,129,.14)` /
> `rgb(110,231,183)`. One expected difference: Admin Management's Active pill was never inside
> `6f50adb1`'s scope and still runs the older mint `rgb(209,250,229)` / `rgb(4,120,87)`.
> Everything below this box documents the reverted pass.

**What the owner saw.** On the Merchants list (Main → Merchant → Merchants) the Role column painted
`Brand Owner` as a **violet** capsule — `#EDE9FE` on `#5B21B6`, measured — while every other chip on the
page is the amber/cream listing vocabulary. `Regional Master` came out **blue** (`#DBEAFE` / `#1D4ED8`)
and a risk role **red** (`#FEE2E2` / `#B91C1C`): three cool or alarm hues on a role *name*, in a column that
in the owner's data holds one value. The same violet is on Main → Admin Management, because both Role
columns are the same recipe.

**The ruling was already written — only its scope was missing.** This exact purple was rejected on
2026-09-24 for the Access Control family (→ the 11.2 defect list above): “the purple the design system
rejects. Super scope is a permission fact, so it takes the amber signal the rest of the family uses for
‘elevated’, **not a second hue**.” That pass was scoped to the six Access Control pages, so the listing
family kept the imported reference's hue-coded column, and the four files that were later rescoped from
it (`main-merchant-detail-executive`, `main-provider-family-executive`, `main-report-charcoal`,
`bo-charcoal-shell`) carried it along.

**One chip for every role, and that chip is the Access Control one.** A role name is a **label, not a
state** — the same argument the row avatar got on 2026-09-15 (“a colour that means nothing teaches the
eye to ignore the ones that do”). So the Role column now wears the signed-off recipe of the Access Control
Role column, verbatim in colour:

| | light | dark |
|---|---|---|
| fill | `#FFF8EB` (listing surface) | `#2A2C36` (charcoal well) |
| frame | `1px solid #EADCC8` | `1px solid rgba(255,255,255,.12)` |
| ink | `#57534E` | `#D4D4D8` |

**Mechanically: 7 rules → 1 in each of five sheets, both themes.** The base `.mad-role` and each
`[data-access-page=…]` block lost their tone groups (`.is-super`, `.is-partner`, `.is-merchant`,
`.is-support`, `.is-tech`, `.is-regional`, `.is-risk`) and kept a single rule. `roleTone()` stays in
`main-admin-detail.js` / `main-merchant-detail.js` and its classes stay in the markup as **inert hooks** —
the two lists are the only pages in the repo that render a `.mad-role` element, so the three rescoped
copies are inert and were repainted anyway to stay **1:1 diffable with their source sheet**, which is the
property recorded for the charcoal shell. Geometry is untouched but for the frame: 999px capsule, 12px/700,
and `box-sizing:border-box` so the 1px frame does not grow the 26px pill into its column.

**Verified on the rendered pages** (stubbed fixtures, both themes, `.tmp-ac-review/`): Merchant
`Brand Owner` + `Regional Master` and Admin `Root Account` + `Platform Master` all measure
`rgb(255,248,235)` / `rgb(87,83,78)` on `rgb(234,220,200)` in light and `rgb(42,44,54)` / `rgb(212,212,216)`
on `rgba(255,255,255,.12)` in dark, height **26** in both — the same three colours the Access Control
`role-pill` measures in both themes (25px, 6px radius: its own geometry, same paint). Role cells report
`clientWidth == scrollWidth` on both lists. An 8-page × 2-theme sweep (provider detail, `main-report`,
merchant report / settlement, `win-lose-report`, `admin-user`) found no other chip moved.

**Left alone, deliberately.** The Access Control `.role-pill.super` **amber** variant is their signed-off
decision and is untouched — scope colouring still exists there, where a role name says “super”
(`roleTone()`'s classes no longer paint anything on the listing pages).

**Observation, not fixed here (pre-existing).** The Merchant list's Role column is **121px** (`width:11%`,
`padding-right:12px`) and its chips measure `Brand Owner` **100px** (fits), `Regional Master` **118px**
(9px past the cell's content box) and `Naga Brand Owner` **133px** (24px past) — the last two spill out of
the cell with `overflow:visible`, exactly as the Access Control Role column did before 11.2 widened it, and
2px of that is this pass's frame (the old chip had no border). The other columns here are content-fitted
and the merchant sheet carries two copies of the width map (base at 11%, the ≤1399.98px one at 16%), so
column widths stayed out of a colour pass. What it would take: `nth-child(3)` to ~14% plus the same
donation from `Created By` or `Company`, in both maps.

### One button recipe for the three chrome roles — Back, footer Cancel and footer Save (2026-09-28, owner 「帮我检查全站 我图里全起的设计是否统一css 没有的话 请帮我去统一」)

Owner ringed three controls on **Edit Merchant** (`main-merchant-detail.html`, edit workspace): the
section-head **Back to List**, the footer **Close**, and the footer **Save Merchant**. The request was
whether the same three read the same everywhere, and if not, to make them.

**Measured, not read.** A headless-Chrome sweep read `getComputedStyle` for all three roles on every page
that carries one — **49 pages × light and dark** — because a source reading cannot tell you which of ~100
sheets won. Baseline, distinct rendered shapes: **Back 12 (light) / 11 (dark) · footer secondary 16 ·
footer primary 15 (16 dark)**. Heights were split across 32/36/38/40/42/44px, weights across 700/750/800,
and the primary fill across amber-gradient, flat `#D97706` and one **solid navy `#18191C`**.

**What was wrong, and its cause.**

| # | Defect | Cause | Fix |
|---|---|---|---|
| 1 | **34 of 35 primary controls carried a drop shadow** | each family re-stated the amber recipe with its own `box-shadow` + inset highlight, which `system.md -> Primary CTA` forbids outright ("Do **not** add amber glow, inset highlight, `translateY` lift, or any `box-shadow` on Primary") | 101 declaration blocks flattened to `box-shadow:none` across 22 sheets; focus rings drawn with `box-shadow` were identified and **kept** |
| 2 | the ghost's resting fill shipped in **three** shapes at once — three-stop form cream, an undocumented **two-stop** `#FFFCF7→#F5EBDC`, and the two-stop **listing** cream | `.mad-btn-ghost` had two competing owners (`bo-charcoal-shell.css` listing cream, `bo-charcoal-primitives.css` two-stop form cream) and the winner was "whichever sheets this page loads" | 8 starting-point owners converged on the locked three-stop `#FFFCF7 0% → #F5EBDC 55% → #EDE4D4 100%` with border `#DCC9A8` |
| 3 | **Back rendered 12 different ways** — 40px and weight 800 on Create Role, 38px on the banner/category/slider editors, 32px with no chrome at all on Live Chat, a bare 21px `14px/400` text link on Balance Adjustment | the back control never had one owner; each family styled whatever class its own markup happened to carry | one documented recipe stated per family (below) |
| 4 | **`.mad-btn-navy` rendered solid navy on three pages and amber on six** | `main-admin-detail-executive.css` painted `var(--bo-navy)` while `bo-charcoal-primitives.css` painted the gradient; source order and the `bo-charcoal` marker decided which. `system.md:501` says "**Never** restore navy fill as primary" | the navy rule is now the amber gradient, so the class name no longer decides the colour |
| 5 | labels split across 700/750/800 and 12.5/13/13.5px | per-family freestyle | normalised to **700**, and 13.5px (outside the documented band) to 13px |

**The locked recipe for all three roles** (light · dark):

```
Back control (page chrome)  36px · radius 8 · pad 0 14px · 12.5px/700
Footer secondary (Close)    the bar's own measured rung · radius 8 · 12.5–13px/700
Footer primary (Save)       the bar's own measured rung · radius 8 · 12.5–13px/700

secondary fill   #FFFCF7 0% → #F5EBDC 55% → #EDE4D4 100%   |  #4A4C58 0% → #383A46 48% → #2C2E38 100%
secondary border #DCC9A8 · ink #18191C                     |  rgba(255,255,255,.12) · ink #F5F5F4
secondary hover  reverse cream #FFF8EB→#F3E8D6 · lift -1px |  #383A46→#2C2E38 · lift -1px

primary fill     #FBBF24 0% → #F59E0B 42% → #EA8608 100%    |  #FBBF24 0% → #F59E0B 45% → #D97706 100%
primary border   #E8901A · ink #FFFFFF                     |  #F59E0B · ink #2A2C36
primary hover    reverse stops on the same axis, no lift,  |  same
                 and NO shadow in either theme
```

**Heights were deliberately NOT unified.** An earlier note in this file (2026-09-23) put the form footer
on the 36px listing tier, and the **2026-09-24 entry measured that change back out**: a 36px button makes
`.mac-footer-actions` 65px against the 73px sidebar-account block that `bo-ui-standard.css` pins whenever
the bar is present, which is the pair-of-parallel-hairlines defect that pin exists to prevent. The owner
chose "unify the look, keep each bar's measured height", so only the *paint* converged. Likewise the Back
control is stated **separately** from its family's footer rule where the two share one declaration
(`.mrc-btn-ghost` is 40px because `.mrc-sticky-footer` is pinned at 69px = 14×2 + 40 + 1) — narrowing the
shared rule would have taken that bar off its pinned height.

**Measured after** (same harness): Back **5 shapes light / 6 dark** from 12/11; and by paint alone —
- Back **42 of 44 controls** on one paint (3-stop cream · `#DCC9A8` · `#18191C` · lift)
- footer primary **66 of 70** on one paint (amber gradient · `#E8901A` · white · **no shadow**)
- footer secondary **66 of 84** on one paint (3-stop cream · `#DCC9A8` · `#18191C` · lift)

The residual controls are **not** style drift and were left alone: they sit in quiet quick-action strips
(`game-provider.html`'s `data-wallet-action` row, `game.html`'s Reset/Download strip) whose chrome is
deliberately removed, and `backup_provider.html` — a 3.4 KB stub that **links no stylesheet at all**, so
its buttons are browser defaults. Listing filter strips are also untouched by design: they carry their own
locked 36px/no-lift spec, and `main-stat-detail.html`'s "Back" is a filter-row control, so it keeps that
spec rather than the back-control one.

**One self-inflicted bug worth recording.** The first cut of the back-control patch emitted a multi-line
selector list with the scope written once — `A,\nB:hover{...}` — which attaches `:hover` to **B only**, so
**A shipped the hover paint at rest**, and `html[data-bo-theme="dark"] A,\nB{...}` painted B with the dark
fill in light mode. The browser face of it was unambiguous once asked directly (`computed
background-image` on `.mrc-back-list` was the reverse-cream hover value at rest); the rule is that every
scope in a generated rule must be repeated per selector, and the sweep must be re-run before believing a
patch. Pins were re-stamped with `scripts/stamp-asset-pins.py` (940 references, `--check` clean) so no page
serves a stale vintage.

### Status pills: `All` moves to the end, and the Access Control listings get the control (2026-09-28, owner: “report所有页面的table上方all按键切换要放在末端” and “其他页面比如bo的access control的table active，suspended，all 类似这样的设计需求”)

**The order was the odd one out, not the design.** `Components` has documented `Status pills (Active/Suspend/All)` since the
merchant listing, and every other page that carries the group already ends on `All` — `main-merchant-detail.html`,
`main-admin-detail.html`, the `bo-tx-tabs` family (`Deposit → Withdraw → All`), Agent Management. The report family was the
one place `All` led, so the ten pages that show the group above a table now read **`Active → <off state> → All`**, with `All`
still the arrival selection: the same rows appear on load as before, so the change is positional only.

| pages | before | after |
|---|---|---|
| `main-win-lose-report`, `main_merchant_report`, `main-merchant-{balance,transactions,settlement}` | All · Active · Suspended | Active · Suspended · **All** |
| `main_provider_report`, `main-provider-{balance,transactions,settlement}` | All · Active · Maintenance | Active · Maintenance · **All** |
| `main-provider-detail` | All · Active · Maintenance · Suspended | Active · Maintenance · Suspended · **All** |

Deliberately untouched, and worth stating because the request said "all": the **transaction-type** group on the same pages
(`All / Transactions / Settlements / …`) and `main-merchant-profit.html`'s ledger-type group. The strip's own `All Status`
`<select>` also stays. No CSS or JS moved with these ten edits — every handler keys off `data-*-status`, not DOM position,
and `bo-seg-bounce.js` positions the thumb from whichever pill carries `is-active`.

**The log-category group followed** (same day, owner: “这个页面的all logs 也是要放在末端”): `main-admin-security.html` and
`main-merchant-security.html` carry `.mas-cats` — `All Logs (n) / Account Activity / Permission Changes / Credit Control /
Security Events` — and `All Logs` now sits last there too, still the arrival selection. Both keep their own reading: the
group is a horizontally scrollable strip under the filter row (`main-admin-detail-executive.css` → `.mas-cats`), and nothing
in that recipe keys off a child's position, so again this was two markup moves — `main-admin-security.js` /
`main-merchant-security.js` read `data-mas-cat` and set `is-active` by value (click handler at :1300, Reset at :1331).

**Access Control's three listings got the same control** — `admin-user.html` (Active / **Disabled**), `role.html` (Active /
**Inactive**), `ip-whitelist-security.html` (Active / **Disabled**) — counts in `(n)`, `All` last and selected, each page's
own word for the off state so a pill and the badge in the row it filters can never disagree. The buttons carry the shared
recipe's own vocabulary (`data-mad-status="active" | "suspended" | "all"`), so `bo-charcoal-shell.css` and
`bo-charcoal-primitives.css` paint them unchanged in both themes. Two things per page did have to be added: the
`bo-seg-bounce.css` / `bo-seg-bounce.js` pair (**without them the selected pill has no frame at all** — the Profit Report
trap recorded above), and a `.ac-status-pills` placement block in `access-control-executive.css`, because the strip here is
`.user-toolbar` (fields left, actions right), not the report family's `.mad-filter-bar`. The family's caption-hiding and
36px-control rules are keyed to `.field` / `label` / `select`, so nothing in that sheet reaches a `.mad-pill`.

**Three defects surfaced while wiring them up.**

1. **Admin Management's status `<select>` became redundant.** The pills own status now: `applyFilters()` reads `statusTerm`,
   which the buttons set, and `#adminStatusFilter` is gone from the page (the CSV export rides `filteredAdmins`, unchanged).
   The same numbers the metric cards above the strip carry are written back onto the pills, so the two cannot disagree.
2. **IP Whitelist Security never rendered its table.** `ip-whitelist-security.js` writes `ipwBadge.textContent`, but no element
   with that id existed anywhere in the repo — so `render()` threw a `ReferenceError` inside `load()`'s own try/catch, which
   painted `ipwBadge is not defined` into the tbody and left the page reading "Loading…" forever. The page now carries the
   family's count chip (`<span class="users-found-badge" id="ipwBadge">0 Rules</span>`, the same shape as `#roleCountBadge`
   and `#adminCountBadge`) and the rules render. A status filter over a table that could not paint a row would have been dead
   control.
3. **The listings' filter pass only understood the search.** In `access-control-listing.js`, the "hide what the filter
   rejected" step was keyed on `this.term`, so a status filter re-counted the footer to `Showing 1 to 6 of 6 entries` while
   the rejected rows stayed on screen. It is keyed on `rows.length !== all.length` now, which covers both filters.
   `fitRows()` also skips rows with no layout when it samples a row height: a hidden row measures 0 tall, and a 0 sample
   fits three rows too many on the `-` page size.

**Verified** on local harnesses (`.tmp-verify/`, gitignored — `BO_AUTH` + `fetch` stubbed, CDN vendored because the headless
browser in this sandbox has no outbound network): pills in the requested order with `All` framed, counts matching the metric
cards above them (Admin 5/3/8, Staff Permission 6/3/9, IP Whitelist 3/2/5), each click re-counting the footer *and* the row
set (Active → 6 rows, the off state → 3, All → 9) and the two Security & Audit pages (log-category clicks: 12 events → 2
permission / 1 credit / 2 security, All Logs back to 12), both themes, and `scripts/stamp-asset-pins.py --check` clean for
every asset this change touched.

### One field theme, site-wide — the Create User input, in both themes (2026-09-28, owner: "member的夜间模式 在create user 用户点选框后 那个input给出的设计 要统一到全站页面")

The reference the owner pointed at is the Member → **Create User** dialog's input in night mode:
a `#2A2C36` well, `1px` `rgba(255,255,255,.12)` border, `#F5F5F4` ink, `#A1A1AA` placeholder, and
on focus an **amber border `#F59E0B` with a `0 0 0 3px rgba(245,158,11,.18)` ring**. The ask was
to make that the site's answer.

**Why that dialog was right and the rest of the panel was not.** `index.html` is one of the
**nine** pages that do not load `reports.css`. Everywhere else, the rule that actually painted the
fields was `.report-content input/select/textarea` in `reports.css` — declared **once, with no
theme guard**, so it applied its light values in dark mode too: fill `#FFF8EB`, border `#EADCC8`,
focus border `#78716C` (grey) and ring `rgba(217,119,6,.12)`. Its selector list carries **nine
`:not(#…)` steps**, so it out-specified every properly themed dark rule in the library.

**Measured on the real pages** (headless Chrome, the auth/API stub, both themes) before the fix:

| Theme | Symptom | Fields |
|---|---|---|
| dark | grey focus border + light amber `.12` ring | **318** |
| dark | light `#FFF8EB` cream fill kept on the `#2C2E38` canvas | **300+** |
| light | focus border grey `#78716C` instead of amber `#D97706` | **295** |

**The fix, in two mechanisms — the same pair `bo-input-fill.css` documents for the light fill:**

1. **`reports.css`, value-split at the source.** That one rule pair became a guarded light pair
   and a dark pair. The dark branch **repeats the nine `:not(#…)` steps on purpose**: that
   escalation is what makes the rule win, and a slimmer dark selector would hand the fields back
   to a lower tier. Light also moved to the reference pair (`#DCC9A8` border, `#D97706` +
   `rgba(217,119,6,.14)` focus), which is what `bo-charcoal-legacy.css:121` /
   `bo-charcoal-cms.css:13` already stated.
2. **`bo-field-standard.css`, the backstop.** A new last-in-cascade standard covering
   `input` / `select` / `textarea` on every page, with the light/dark token pair, the search-frame
   exclusion list, and `!important`. It also clears the **85** further unguarded field rules the
   guard found across the library.

**`!important` is load-bearing here.** The first draft had none, and the sheet loaded, parsed and
matched while changing nothing: the legacy rules it competes with all declare `!important`, and an
important declaration beats a normal one **at any specificity**. Measured on `member-detail.html`
— the sheet's selector out-ranked the legacy rule 7 ids to 0 and still lost.

**Also learned, and worth not re-learning:** two probe artefacts made this drift look larger than
it was, and both are now documented in the harness rather than in my head. A focus ring is usually
**transitioned**, so reading `getComputedStyle` synchronously after `.focus()` returns the
transition's *start* value — a transparent, zero-spread shadow — and the sweep reported a missing
ring that a screenshot of the same page showed plainly. And some controls **refuse focus** (the
code panes on `page-customize.html`), so their "missing ring" is unreachable by a user.

**Result at landing**, per element, focused, both themes, the auth/API stub, 154 real pages:

| | dark | light |
|---|---|---|
| canonical, standalone fields | **160** | **172** |
| frame-owned (correctly bare inner inputs) | 226 | 228 |
| remaining | **18** | **16** |

The residual is inside wrapper components whose **own** sheets still carry unthemed rules — the
debt `scripts/check-field-standard.py` reports (85 rules today). They are the next pass, not a
regression.

**Updated:** the owner's scope was explicit — **text inputs, selects and textareas**; the
date-range trigger, select trigger, checkbox, switch and inline row buttons keep their own
documented focus recipes (the checkbox is `.22` in dark). And **theme treatment only**: the size
tiers are untouched (listing filters `36px`, filter rows and dialogs `42px`, form fields `44px`;
radius `8/10/11px`).

**Guarded:** `scripts/check-field-standard.py` asserts the sheet is present and loaded **last** on
every real page, that the token pair still holds the canonical values, that **every declaration
still carries `!important`**, and reports the unguarded-rule debt without failing on it.
`scripts/check-search-standard.py` now includes this sheet in its `SHEETS` list, so its exclusion
list is checked against every search frame in the markup too. The new sheet is loaded last on
156 pages, and `scripts/stamp-asset-pins.py` carries its content hash.

### One button recipe for the three chrome roles — Back, footer Cancel and footer Save (2026-09-28, owner 「帮我检查全站 我图里全起的设计是否统一css 没有的话 请帮我去统一」)

Owner ringed three controls on **Edit Merchant** (`main-merchant-detail.html`, edit workspace): the
section-head **Back to List**, the footer **Close**, and the footer **Save Merchant**. The request was
whether the same three read the same everywhere, and if not, to make them.

**Measured, not read.** A headless-Chrome sweep read `getComputedStyle` for all three roles on every page
that carries one — **49 pages × light and dark** — because a source reading cannot tell you which of ~100
sheets won. Baseline, distinct rendered shapes: **Back 12 (light) / 11 (dark) · footer secondary 16 ·
footer primary 15 (16 dark)**. Heights were split across 32/36/38/40/42/44px, weights across 700/750/800,
and the primary fill across amber-gradient, flat `#D97706` and one **solid navy `#18191C`**.

**What was wrong, and its cause.**

| # | Defect | Cause | Fix |
|---|---|---|---|
| 1 | **34 of 35 primary controls carried a drop shadow** | each family re-stated the amber recipe with its own `box-shadow` + inset highlight, which `system.md -> Primary CTA` forbids outright ("Do **not** add amber glow, inset highlight, `translateY` lift, or any `box-shadow` on Primary") | 101 declaration blocks flattened to `box-shadow:none` across 22 sheets; focus rings drawn with `box-shadow` were identified and **kept** |
| 2 | the ghost's resting fill shipped in **three** shapes at once — three-stop form cream, an undocumented **two-stop** `#FFFCF7→#F5EBDC`, and the two-stop **listing** cream | `.mad-btn-ghost` had two competing owners (`bo-charcoal-shell.css` listing cream, `bo-charcoal-primitives.css` two-stop form cream) and the winner was "whichever sheets this page loads" | 8 starting-point owners converged on the locked three-stop `#FFFCF7 0% → #F5EBDC 55% → #EDE4D4 100%` with border `#DCC9A8` |
| 3 | **Back rendered 12 different ways** — 40px and weight 800 on Create Role, 38px on the banner/category/slider editors, 32px with no chrome at all on Live Chat, a bare 21px `14px/400` text link on Balance Adjustment | the back control never had one owner; each family styled whatever class its own markup happened to carry | one documented recipe stated per family (below) |
| 4 | **`.mad-btn-navy` rendered solid navy on three pages and amber on six** | `main-admin-detail-executive.css` painted `var(--bo-navy)` while `bo-charcoal-primitives.css` painted the gradient; source order and the `bo-charcoal` marker decided which. `system.md:501` says "**Never** restore navy fill as primary" | the navy rule is now the amber gradient, so the class name no longer decides the colour |
| 5 | labels split across 700/750/800 and 12.5/13/13.5px | per-family freestyle | normalised to **700**, and 13.5px (outside the documented band) to 13px |

**The locked recipe for all three roles** (light · dark):

```
Back control (page chrome)  36px · radius 8 · pad 0 14px · 12.5px/700
Footer secondary (Close)    the bar's own measured rung · radius 8 · 12.5–13px/700
Footer primary (Save)       the bar's own measured rung · radius 8 · 12.5–13px/700

secondary fill   #FFFCF7 0% → #F5EBDC 55% → #EDE4D4 100%   |  #4A4C58 0% → #383A46 48% → #2C2E38 100%
secondary border #DCC9A8 · ink #18191C                     |  rgba(255,255,255,.12) · ink #F5F5F4
secondary hover  reverse cream #FFF8EB→#F3E8D6 · lift -1px |  #383A46→#2C2E38 · lift -1px

primary fill     #FBBF24 0% → #F59E0B 42% → #EA8608 100%    |  #FBBF24 0% → #F59E0B 45% → #D97706 100%
primary border   #E8901A · ink #FFFFFF                     |  #F59E0B · ink #2A2C36
primary hover    reverse stops on the same axis, no lift,  |  same
                 and NO shadow in either theme
```

**Heights were deliberately NOT unified.** An earlier note in this file (2026-09-23) put the form footer
on the 36px listing tier, and the **2026-09-24 entry measured that change back out**: a 36px button makes
`.mac-footer-actions` 65px against the 73px sidebar-account block that `bo-ui-standard.css` pins whenever
the bar is present, which is the pair-of-parallel-hairlines defect that pin exists to prevent. The owner
chose "unify the look, keep each bar's measured height", so only the *paint* converged. Likewise the Back
control is stated **separately** from its family's footer rule where the two share one declaration
(`.mrc-btn-ghost` is 40px because `.mrc-sticky-footer` is pinned at 69px = 14×2 + 40 + 1) — narrowing the
shared rule would have taken that bar off its pinned height.

**Measured after** (same harness): Back **5 shapes light / 6 dark** from 12/11; and by paint alone —
- Back **42 of 44 controls** on one paint (3-stop cream · `#DCC9A8` · `#18191C` · lift)
- footer primary **66 of 70** on one paint (amber gradient · `#E8901A` · white · **no shadow**)
- footer secondary **66 of 84** on one paint (3-stop cream · `#DCC9A8` · `#18191C` · lift)

The residual controls are **not** style drift and were left alone: they sit in quiet quick-action strips
(`game-provider.html`'s `data-wallet-action` row, `game.html`'s Reset/Download strip) whose chrome is
deliberately removed, and `backup_provider.html` — a 3.4 KB stub that **links no stylesheet at all**, so
its buttons are browser defaults. Listing filter strips are also untouched by design: they carry their own
locked 36px/no-lift spec, and `main-stat-detail.html`'s "Back" is a filter-row control, so it keeps that
spec rather than the back-control one.

**One self-inflicted bug worth recording.** The first cut of the back-control patch emitted a multi-line
selector list with the scope written once — `A,\nB:hover{...}` — which attaches `:hover` to **B only**, so
**A shipped the hover paint at rest**, and `html[data-bo-theme="dark"] A,\nB{...}` painted B with the dark
fill in light mode. The browser face of it was unambiguous once asked directly (`computed
background-image` on `.mrc-back-list` was the reverse-cream hover value at rest); the rule is that every
scope in a generated rule must be repeated per selector, and the sweep must be re-run before believing a
patch. Pins were re-stamped with `scripts/stamp-asset-pins.py` (940 references, `--check` clean) so no page
serves a stale vintage.

### Status pills: `All` moves to the end, and the Access Control listings get the control (2026-09-28, owner: “report所有页面的table上方all按键切换要放在末端” and “其他页面比如bo的access control的table active，suspended，all 类似这样的设计需求”)

**The order was the odd one out, not the design.** `Components` has documented `Status pills (Active/Suspend/All)` since the
merchant listing, and every other page that carries the group already ends on `All` — `main-merchant-detail.html`,
`main-admin-detail.html`, the `bo-tx-tabs` family (`Deposit → Withdraw → All`), Agent Management. The report family was the
one place `All` led, so the ten pages that show the group above a table now read **`Active → <off state> → All`**, with `All`
still the arrival selection: the same rows appear on load as before, so the change is positional only.

| pages | before | after |
|---|---|---|
| `main-win-lose-report`, `main_merchant_report`, `main-merchant-{balance,transactions,settlement}` | All · Active · Suspended | Active · Suspended · **All** |
| `main_provider_report`, `main-provider-{balance,transactions,settlement}` | All · Active · Maintenance | Active · Maintenance · **All** |
| `main-provider-detail` | All · Active · Maintenance · Suspended | Active · Maintenance · Suspended · **All** |

Deliberately untouched, and worth stating because the request said "all": the **transaction-type** group on the same pages
(`All / Transactions / Settlements / …`), `main-merchant-profit.html`'s ledger-type group, and the strip's own `All Status`
`<select>`. Only the status group above the table was in scope. No CSS or JS moved with these ten edits — every handler keys
off `data-*-status`, not DOM position, and `bo-seg-bounce.js` positions the thumb from whichever pill carries `is-active`.

**Access Control's three listings got the same control** — `admin-user.html` (Active / **Disabled**), `role.html` (Active /
**Inactive**), `ip-whitelist-security.html` (Active / **Disabled**) — counts in `(n)`, `All` last and selected, each page's
own word for the off state so a pill and the badge in the row it filters can never disagree. The buttons carry the shared
recipe's own vocabulary (`data-mad-status="active" | "suspended" | "all"`), so `bo-charcoal-shell.css` and
`bo-charcoal-primitives.css` paint them unchanged in both themes. Two things per page did have to be added: the
`bo-seg-bounce.css` / `bo-seg-bounce.js` pair (**without them the selected pill has no frame at all** — the Profit Report
trap recorded above), and a `.ac-status-pills` placement block in `access-control-executive.css`, because the strip here is
`.user-toolbar` (fields left, actions right), not the report family's `.mad-filter-bar`. The family's caption-hiding and
36px-control rules are keyed to `.field` / `label` / `select`, so nothing in that sheet reaches a `.mad-pill`.

**Three defects surfaced while wiring them up.**

1. **Admin Management's status `<select>` became redundant.** The pills own status now: `applyFilters()` reads `statusTerm`,
   which the buttons set, and `#adminStatusFilter` is gone from the page (the CSV export rides `filteredAdmins`, unchanged).
   The same numbers the metric cards above the strip carry are written back onto the pills, so the two cannot disagree.
2. **IP Whitelist Security never rendered its table.** `ip-whitelist-security.js` writes `ipwBadge.textContent`, but no element
   with that id existed anywhere in the repo — so `render()` threw a `ReferenceError` inside `load()`'s own try/catch, which
   painted `ipwBadge is not defined` into the tbody and left the page reading "Loading…" forever. The page now carries the
   family's count chip (`<span class="users-found-badge" id="ipwBadge">0 Rules</span>`, the same shape as `#roleCountBadge`
   and `#adminCountBadge`) and the rules render. A status filter over a table that could not paint a row would have been dead
   control.
3. **The listings' filter pass only understood the search.** In `access-control-listing.js`, the "hide what the filter
   rejected" step was keyed on `this.term`, so a status filter re-counted the footer to `Showing 1 to 6 of 6 entries` while
   the rejected rows stayed on screen. It is keyed on `rows.length !== all.length` now, which covers both filters.
   `fitRows()` also skips rows with no layout when it samples a row height: a hidden row measures 0 tall, and a 0 sample
   fits three rows too many on the `-` page size.

**Verified** on local harnesses (`.tmp-verify/`, gitignored — `BO_AUTH` + `fetch` stubbed, CDN vendored because the headless
browser in this sandbox has no outbound network): pills in the requested order with `All` framed, counts matching the metric
cards above them (Admin 5/3/8, Staff Permission 6/3/9, IP Whitelist 3/2/5), each click re-counting the footer *and* the row
set (Active → 6 rows, the off state → 3, All → 9), both themes, and `scripts/stamp-asset-pins.py --check` clean for every
asset this change touched.

#### "create provider 没有hover" — and the two site-wide hover defects behind it (2026-09-28, owner 「没有hover」)

The owner pointed at `main-provider-create.html`'s footer. Every resting property on that page already
matched its siblings to the pixel — **Cancel 160×44, Create Provider 160×44, Back to List 117×36, the
band 1322×73, identical fills and borders** — so the first pass of this investigation read the page as
correct. It was not. **Hover had never been measured**, because the verification sweep read
`getComputedStyle` with no pointer over the element, and in that state a dead hover, a losing hover and
a working one are byte-identical.

Forcing the real pseudo-state over the DevTools protocol (`CSS.forcePseudoState`) found **two defects,
both site-wide, both invisible to a resting-state sweep**:

**1. The primary's hover was dead on every `bo-charcoal` page.** `bo-charcoal-legacy.css` restates the
primary's resting paint at one ID level so it cannot lose to the ghost base in the same file — its own
comment explains why ("one ID level so the outcome cannot depend on which rule happens to sit later").
The restatements had **no `:hover` counterpart**, so they pinned the *resting* gradient at **(1,4,2)**
while the strongest hover rule anywhere is **(0,4,1)**. A hover can never beat that. Measured:
`main-provider-create.html`'s **Create Provider changed 0 properties on hover**, while its three
non-`bo-charcoal` siblings changed 3. Fixed by restating `:hover` and `:active` at the same ID level,
with the locked reverse-gradient hover and **no lift, no shadow** (Primary keeps neither).

**2. The footer Cancel/Close hovered the forbidden amber wash.** Three rules pinned the ghost hover to
`#FFFBEB → #FEF3C7` with a `#D97706` border at **(0,5,3)**, out-ranking the correct reverse-cream rule
at (0,4,1). `system.md → Ghost / Export` locks that hover to reverse cream `#FFF8EB → #F3E8D6` with
border `#E0D0B8`, lift `-1px`, and **no amber fill wash**. All three were restated as the locked hover.
A **fourth** owner (`main-report-charcoal.css`) was found only by the new guard, after the first three
had been fixed by hand from a four-page sample — which is the argument for having the guard.

**Measured after**, all nine create-family pages in light and dark: **zero dead hovers**, on every
selector whose element the page actually renders.

**Two lessons worth keeping.** First: a resting-state sweep cannot certify a component. It has to be
paired with a forced-state check, and both now exist — `scripts/check-button-standard.py` for what is
decidable from the source, `scripts/check-button-hover.mjs` for what is not. Second: the guard was
written to catch the dead-hover case and **that check was then removed on purpose** — as a static rule
it flagged 22 rules on a tree whose hovers all work, because whether a hover wins needs the DOM's
cascade. A guard that cries wolf on a clean tree is worse than no guard; the docstring records the
removal and points at the runtime checker instead.

### Status pills arrive on the first pill — `Active` — not on `All` (2026-09-28, owner: “许多页面的pill active在末端 需要统一像图二那样pill active在第一个”)

**The order was settled earlier today; the arrival state was the leftover.** The `All`-to-the-end pass moved the group's
members and deliberately kept `All` as the arrival selection (“positional only”). The owner's reference this time is
`main-merchant-detail.html` — `Active` first **and** framed — so the rule is now the component's own: the selection
arrives on, and `Reset` returns to, the **first** pill. That is what `main-admin-detail.js`
(`statusPill='active'`, and the `Reset` handler that re-selects `active`) and `main-merchant-detail.js` already did; the
thirteen pages below were the ones still arriving on the last pill.

| pages | group | arrival before | arrival after |
|---|---|---|---|
| `admin-user`, `role`, `ip-whitelist-security` | Active · *off word* · All | **All** | **Active** |
| `main-provider-detail` | Active · Maintenance · Suspended · All | **All** | **Active** |
| `main-win-lose-report` | Active · Suspended · All | **All** | **Active** |
| `main_provider_report` / `main_merchant_report` | Active · *off word* · All | **All** | **Active** |
| `main-{provider,merchant}-{balance,settlement,transactions}` | Active · *off word* · All (in a panel, see below) | **All** | **Active** |

**Two halves had to move together, or the pill and the rows it filters would disagree.** The markup is the arrival —
`bo-seg-bounce.js` positions the thumb from whichever pill carries `is-active` — and the script variable is what the row
filter reads, so the thirteen pages got the `is-active` / `aria-pressed` move *and* the six handlers got
`statusPill`/`statusTerm` (and their `Reset`) changed from `'all'` to `'active'`: `main-provider-detail.js`,
`main-win-lose-report.js`, `main-provider-report.js`, `main-merchant-report.js`, `admin-user.js`,
`access-control-listing.js`. Nothing about the groups' order, geometry or paint changed with them, and no CSS moved.

**The 8 report pages carry their strip inside a panel, and on 6 of them that panel never shows.** `main_provider_report`
and `main_merchant_report` display it on arrival; on `main-provider-{balance,settlement,transactions}` and
`main-merchant-{balance,settlement,transactions}` the strip lives in the `provider`/`merchant` panel while `brand` /
`balance` / `settlement` / `history` is the panel that is shown, and `setupTabs()` returns early for the anchor tabs
(`if(b.tagName==='A' && b.getAttribute('href')) return;`) — those tabs navigate to the report page instead. Their markup
is kept consistent anyway so the panel cannot arrive on a different pill if it is ever bound to an in-page tab. Those
pages' *visible* group is the transaction-type strip, which still leads on `All` and was not touched.

**Deliberately untouched.** The transaction-type group (`All / Transactions / Settlements / …`) and
`main-merchant-profit`'s ledger-type group: those are not status groups and `All` **is** their first pill, so they
already satisfy the rule. The two Security & Audit pages' log-category strip (`.mas-cats`) also stays: `All Logs` sits
last *and* remains its arrival selection, because its first pill is a category, not a state — arriving there would drop
Security Events from a security page's landing view. That one asks for its own decision from the owner. The strip's own
`All Status` `<select>` also stays.

**Verified in the browser** on the live pages at `127.0.0.1:8099` (both themes): on all seven pages whose status strip
is displayed, the first pill is the one carrying `is-active`, and the thumb's box lands on it —
`main-provider-detail` measured `left 300.8 / width 105` over the Active pill's `300.8 / 105.3`, and the same alignment
holds in dark mode. With a fixture of four providers (2 Active / 1 Maintenance / 1 Suspended) the arrival paints
**2 rows**, counts `2 / 1 / 1 / 4`, footer `Showing 1 to 2 of 2 providers`; clicking `All` paints 4 and moves the thumb
to the fourth pill (`701.8`, matched to the pixel); `Reset` returns to the first pill. `main-admin-detail` and
`main-merchant-detail` were re-measured unchanged, and a click there still moves the thumb, so the shared control did
not regress. Two conditions were found and left alone, both pre-existing and neither caused by this change: the six
panel pages mount their hidden strip at width 0 — so the thumb has no width until something re-syncs — and the
provider/merchant `*_report` pages keep a second, hidden group for transaction types. The six edited scripts were
re-stamped with `scripts/stamp-asset-pins.py`'s own recipe, scoped to those six (`--check` clean for each; the remaining
40 stale assets and 156 real pages are the drift main already carried, left for a separate pass).

### Menu Management's toolbar wears the radius of the block under it (2026-09-28, owner: “没有border radius 要统一下面的border radius”)

**A framed strip with square corners.** `.user-toolbar` gets its frame — background and border — from the shared rule
in `bo-charcoal-legacy.css`, and that rule carries no `border-radius`. On `menu-management.html` the MAIN/BO strip
therefore rendered square while the `.table-wrap` directly beneath it keeps `reports.css`'s 12px: measured toolbar
`0px` against table-wrap `12px`, in both themes.

The fix is one declaration in the page-scoped block that already owns this strip's padding — page-scoped for the
reason that block's own comment gives (`.user-toolbar` is a shared component, and the pages whose toolbar is
legitimately square are not touched). Measured after: toolbar `12px` = table-wrap `12px`, with the same paint in light
(`#FFF8EB` / `#EADCC8`) and dark (`#383A46` / `rgba(255,255,255,.14)`).

**Left alone, with the measurement.** The sibling `.user-search-grid` in the same shared rule is unframed on the pages
that carry it (`frequently-played-games`, `casino-breakdown-report` measure a transparent background), so it has no
square frame to match; the report pages' own cards and table-wraps there sit at 0px (`bank-deposit-usage`,
`admin-login-log` at 8px), so no single value would unify that stack. The Access Control strip is deliberately
unframed — `access-control-executive.css` gives it `background:transparent; border:0`. The changed sheet's pin was
re-stamped with `scripts/stamp-asset-pins.py`'s recipe (`--check` clean for it).

### The module row's top and bottom spacing — 8px under the header, 16px to the first block (2026-09-30, owner: “这个框和上方TABS的位子也要统一。需要有间距”)

**What was still drifting, measured rather than eyeballed.** `auth.js`'s module row is the first child of `.report-content`.
Its **top** inset was already unified — `bo-shell.css` block `0c-1`, desktop only: `padding-top:8px` on
`.report-content:has(> .bo-module-tabs)`, which every module page now computes. Its **bottom** spacing was still whatever
the page's own content column happened to declare. Measured with the row painted on every page that renders it — 27 captured
in the browser, and page-customize read from its own sheet because its headless run never settles:

| Content column | Pages | row → first block |
|---|---|---|
| `display:flex; flex-direction:column; gap:16px` | index, member-wallet, wallet-ledger, referral, bank-deposit-usage, rebate-management, manual-rebate-approval, promotion-debug, vip-management, vip-exp-log, vip-reward-log, all six Agent pages, image-to-url | **16px** |
| `display:block` (no column at all) | slider (Banner Management) | **0px** |
| `display:flex; flex-direction:column; gap:0px` | site-customize, social, layout-section | **0px** |
| `display:flex; flex-direction:column`, `gap` unset (`normal`) | advertisement-popup, frontend-display | **0px** |
| own rhythm | page-customize **14px** (its own `gap:14px`), member-deposit **14px** (its own `gap:14px`) | 14px |

So the row sat 16px above the first block on the Member / Transaction / Promotion / VIP / Agent modules and was **welded to
the card below it** on six Design pages — the same row, two spacings, on a page switch. `16px` is the value the majority
already computes and what User Management (the owner's own reference) shows.

**The rule — `bo-shell.css` block `0c-2`.** One declaration, desktop only like the three insets above it, scoped by body
page class to exactly the six pages that computed 0:

```css
@media (min-width:1024px){
  html:not(#bo-charcoal-off) body.report-body:is(.banner-management-page,.site-customize-page,
      .advertisement-popup-page,.frontend-display-page,.social-page,.layout-section-page)
    .report-shell .report-main .report-content:has(> .bo-module-tabs) > .bo-module-tabs{
    margin-bottom:16px!important;
  }
}
```

`margin-bottom` on the row, not `gap` on the container, on purpose: a container gap re-spaces **every** sibling on those
pages, so site-customize / social / layout-section / advertisement-popup / frontend-display would each have gained 16px
between their own cards as well — a different change nobody asked for. Scoped by page class for the same reason: the
pages that already resolve to a gap of their own are not touched at all, so nothing doubles.

It lands in `bo-shell.css` because `.report-content` is a shell selector and `scripts/check-shell-drift.js` refuses a new
`gap` / `padding` / `flex` declaration on it anywhere else. `node scripts/check-shell-drift.js` → **OK** (2616 known
declarations still on the baseline).

**Measured after.** The six pages compute row `margin-bottom:16px` and row → first block **16px**; index, image-to-url and
bank-deposit-usage keep `margin-bottom:0` with their own 16px gap; member-deposit keeps 14px. Re-checked in both themes
(light `#FFF8EB` card on the cream canvas, dark `#383A46`) — the tab row's 1px bottom border and the 2px amber active
underline are unchanged.

**Left alone, deliberately.** `page-customize` keeps its own 14px (the same rhythm as Deposit Approval, and it already has
a gap — it is not the welded case) and `image-to-url` keeps 16px from its own column. `promotion.html` computes 0 for the
same reason as the six but belongs to the Promotion module; the owner scoped this change to Design and left that one for
its own decision. The narrow layout is untouched: `bo-module-tabs.css` already carries `margin-bottom:12px` at
`max-width:991.98px`, and `0c-2` is `min-width:1024px`.

**Outstanding.** The changed sheet's pin (`assets/css/bo-shell.css?v=c58ff0e3`, shared by ~150 pages) was **not**
re-stamped, together with `assets/js/auth.js?v=1.0.33` for the module row itself: a site-wide pin bump is its own
decision. The repo is already carrying that drift — hashing every `assets/css|js/...?v=` reference against its file finds
~1400 out-of-date ones today, so restamping `bo-shell.css` alone would rewrite ~150 pages in one unrelated pass. Until
that pass happens, a browser holding the old `?v=` can serve the previous sheet — hard-refresh to see this change.

### Canvas: BO follows the continuum, the Main panel and the agent portal keep their flat one (2026-09-30, owner: “这里的背景色也要统一” → “所有的bo 网页背景”, then “只 BO，Main panel 恢复纯色”)

**One shell, two canvases — measured.** `html` carried the locked light/dark continuum on 13 pages (the 11
`bo-wallet-tx` members of the Member/Transaction families plus `index.html` and `referral.html`, which
`bo-page-canvas.css` rescued page by page) and an opaque flat cream `#FFF1DC` (dark `#2C2E38`) on the other ~108. The
cause was two rules in `bo-charcoal-legacy.css`:

```css
html:not([data-bo-theme="dark"]) body.report-body.bo-charcoal,
html:not([data-bo-theme="dark"]):has(body.report-body.bo-charcoal){ background:#FFF1DC!important; }
```

`bo-charcoal-shell.css` declares the continuum for the same pages but **without** `!important`, so the flatten always
won the cascade and painted an opaque body over the gradient. Same shell, same class, two different canvases depending
on which page you opened — e.g. Banner Management flat against User Management in continuum.

**The fix is a deletion, not a copy.** The two declarations are gone; the shell's continuum now reaches every
`body.report-body.bo-charcoal` page, and `body` stays transparent as the shell already required. Nothing was
re-stated anywhere, so the canvas has one source instead of a second copy to keep in step.

**The Main panel and the agent portal keep the flat canvas they always had** — AGENTS.md says their shells are not to be
unified, and the owner chose “只 BO”. The flat rule now names them explicitly. Its class list was **checked page by
page** against `bo-charcoal` pages:

| Class used | Pages | Verified |
|---|---|---|
| `main-mod-page` | 5 | only Main pages |
| `provider-exec`, `accounting-settlement-page`, `main-provider-create-page`, `main-provider-integration-page`, `main-report-exec-page`, `main-report-page` | 1 + 1 + 1 + 1 + 3 + 1 | only Main pages |
| `agent-modern` | 12 | only portal pages |
| `bo-login-body` | `agent-login` + `login` | own opaque auth shell |
| `bo-flat-canvas` | `main-profile`, `main-stat-detail` | marked in markup (see below) |

`main-admin-detail-page` and `main-admin-create-page` were **rejected** for this: they also sit on
`admin-user-create`, `role-create` and `game-provider-create`, which are BO pages. `main-profile.html` and
`main-stat-detail.html` carry no distinguishing class at all — their `<body>` is exactly the BO shell’s — so they opted
out in markup instead: one class, `bo-flat-canvas`, on the body. That marker is the only thing to add if a future page
ever needs the flat canvas while carrying `bo-charcoal`; a page that needs nothing does nothing.

**The Main *report* family needed no entry:** `main-report-charcoal.css` already declares the same continuum for it
against `[data-access-page=...]`, so those pages were never meant to be flat — the legacy flatten was covering their own
canvas rule too.

**Measured, both themes.** 60 BO pages captured page by page in light mode and 12 in dark: `html` computes the
continuum (`linear-gradient(90deg, #FFE8CC …)`, `background-attachment: fixed`) and `body` computes
`rgba(0, 0, 0, 0)`. The Main panel (9 sampled), the agent portal and both login pages compute the flat canvas exactly
as before the change — verified against a `git stash` of the sheet, i.e. a real before/after rather than an argument
from an opaque wrapper. `node scripts/check-shell-drift.js` → OK.

**`bo-page-canvas.css` was deleted** with its two `<link>`s (`index.html`, `referral.html`): its three rules were a
per-page copy of the same continuum, needed only while the flatten existed. `referral.html` still hides most of its
canvas behind `.report-content`’s own `#F5EBDC`, unchanged.

**Deliberately untouched:** every inner surface that legitimately sits on `#FFF1DC` — control wells, zebra rows, chips,
permission groups, `.ref-table` even rows, `main-executive-modules.css`’s `.main-mod-page{background:#FFF1DC}` — keeps
its own rule. Only `html`/`body` canvas paint was in scope.

**Cache pins.** `auth.js`, `bo-shell.css`, `bo-charcoal-legacy.css` and `bo-module-tabs.css` were re-stamped to their own
content hash across every page that references them (137 / 93 / 124 / 29 pages). The repo carried the same file under up
to five different `?v=` keys — `auth.js` was pinned `1.0.32` on one page, `18abdbbc` on thirteen, `238cb5af` on three and
`1.0.33` on 119 — so a browser could hold two vintages of one file at once. The rest of the repo’s stale pins (~1400
references, every other shared asset) are untouched and remain a separate pass. Deleting `bo-page-canvas.css` trips
`scripts/git-hooks/pre-commit`’s deletion guard, which is written for accidental deletions; the intended-deletion path is
`git commit --no-verify`.

### A module's pages must be registered and must load its row sheet (2026-09-30, owner: “这个帮我一样移去表头下方”)

Moving the Game Management group onto the row (the owner's third such request, after Design and Setting) ran into a
merge with the SPA branch, and that merge exposed two defects the same mechanism will produce again the next time a
group joins. Both were measured, not inferred.

**1. A registered page that does not link `bo-module-tabs.css` renders a bare row.** `auth.js`'s own comment states the
contract — “A page listed here must also link assets/css/bo-module-tabs.css” — and 16 pages broke it: the seven Game
Management pages and the nine Report pages, registered in `81715c5e` / `2aa6d686`, carried no link at all. Their row
measured `display:block`, 21px tall, no bottom rule, 0px underline and Bootstrap blue `rgb(13,110,253)` for the active
tab: a line of plain links under the header. The sheet is what makes the row *the row* — flex, 48px, 1px `#EADCC8`
bottom rule, 2px amber active underline. Fixed with one line per page, in the same position every other module page
uses.

**2. A sidebar row added to a module's group must be registered in the same change.** The moment a group is claimed as
a module's group, `renderSidebar` replaces its submenu with the single module row — so a visible page with no
`MODULE_TABS` entry is then reachable from *neither* the sidebar *nor* the row. `MODULE_TABS` is a complete list, not a
sample, and the group must keep owning the module's anchor page (`MODULE_ANCHORS`). Add a page to a group in Menu
Management and it has to be added here too.

**3. The name fallback could claim a group that had nothing to do with the module.** `groupModuleKey()`'s fallback tests
the group's key and title with a regex built from the module key, so a group holding *one* of a module's pages and
called “Game Report” was claimed as the Game module — its submenu replaced by a one-tab row, hiding that group's other
rows. The fallback now also requires that every row the group exposes is carried by a registered tab (directly, or
through `MODULE_SECTION_PAGES` for a section's second page, e.g. Bulk Adjustment's bonus page). The primary test — two
or more of the module's pages **and** the anchor — is deliberately untouched, because a group that satisfies it cannot
hide anything by construction; that is why this guard cannot regress Promotion, Transaction or any other module that
was already working.

**4. `bo-shell.css` 0c-2 needed the five Game pages** whose content column computes a 0px gap (Provider, Provider
Sessions, Game Category, Game Sub Category, Game), so the row sits 16px above the first block as it does everywhere
else; Provider Transactions and Provider Bet Report already carried 16px of their own. The Report pages needed no
spacing work — their own column gap is 16px.

**5. A cache pin left behind is a feature left broken.** The SPA merge changed `assets/js/auth.js` (content hash
`a0f5ca99`) without re-stamping its cache key, so 136 pages still asked for `auth.js?v=e2d80ce7`. The module
registrations for Report, Game Management, Design and Setting all live in that file, so a browser holding the old key
would render none of those rows at all. Re-stamped with the house recipe (`scripts/stamp-asset-pins.py`'s content
hash).

**Measured after** (light and dark): Game 7 tabs, Report 9, Design 8, Member 4 — every row `display:flex`, 48px, 1px
rule, 2px amber active underline, row-to-content 16px, and each module's sidebar group collapsed to one row.
`node scripts/check-shell-drift.js` OK · `node scripts/check-global-collisions.js` 0 collisions ·
`node scripts/check-spa-readiness.js` byte-identical before and after this work (it reports 130 pages missing
`router-pin`, a pre-existing finding of the SPA audit that this change does not touch).

### The KPI strip carried its own bottom margin on top of the content column's gap (2026-09-30, owner “user management，member wallet，wallet ledger … 卡片的上下间距设计 都有问题”)

**Referral Network was named as the page that is right, and it was.** The strip sat **16px** above the block
below it there, where the Member module's pages showed **32px**. Both halves were correct on their own:
`.report-content` is a flex column whose **16px gap** is the locked listing rhythm (DESIGN.md → KPI summary
card → “Listing vertical rhythm”: the strip's `margin-bottom` is 0, the gap owns the spacing), and the
strip *also* declares its own `margin-bottom:16px` — so the two stacked. Measured with the card painted,
1568×900, `row bottom → next block top`:

| page | gap: module row → strip | gap: strip → block below | strip `margin-bottom` |
|---|---|---|---|
| `referral.html` (reference) | 16 | **16** | 0 |
| `index.html` (User Management) | 16 | **32** | 16 |
| `online-users.html` | — (no module row) | **32** | 16 |
| `member-wallet.html` | 16 | **32** | 16 |
| `wallet-ledger.html` | 16 | **32** | 16 |

**Two owners, two edits — the value corrected where it was pinned, no new layer.**

- `bo-charcoal-legacy.css`: `.user-management-page … .quick-stats.user-stats{margin-bottom:16px!important}`
  (light **and** dark). It carries `.user-stats` on top of the page classes, so the later
  `… .report-content > .quick-stats{margin-bottom:0!important}` in the same sheet lost by exactly one
  class-level — the specificity trap this file records a dozen times. Both blocks now state `0`.
  **`online-users.html` carries `user-management-page` too**, so it is fixed by the same two declarations
  rather than a third.
- `bo-wallet-transaction-amber.css`: `body.bo-wallet-tx .quick-stats{margin-bottom:16px!important}` against the
  `… .report-content > .quick-stats` rule in the same sheet, which stated only `flex:0 0 auto`. That rule is
  now `(0,3,1)` and says `margin-bottom:0` as well — exactly what the `> .table-card` rule beside it already
  does, and for the same reason.

**Why not one shared rule.** The pages whose content column has **no** gap of its own are handed that 16px on
the module row instead (`bo-shell.css` block `0c-2`, a page-class whitelist), so zeroing the strip at shell
level would have welded it to the card below on those. Two family-scoped edits keep the blast radius at the
pages that measurably had the doubling — verified by re-measuring all nineteen `.quick-stats`-bearing pages
and all eleven `bo-wallet-tx` pages: nothing else moved. `promotion-debug`, `admin-user`, `admin-login-log`,
`agent-management`, `ip-whitelist-security`, `win-lose-report`, `agent-performance-report` and
`casino-overview-report` already read 16 (their strips were already on `margin-bottom:0`, or the strip sits
below the filter card), and `member-deposit`'s bank dock (14 / 18px) is its own documented rhythm.

**Measured after, both themes:** index / online-users / member-wallet / wallet-ledger all read
**16 / 16** with `margin-bottom:0`, identical to Referral Network, and the card's own
label → number → note rhythm (24 / 41..65 / 67..80 on a 104px card, the pass recorded in `988365ad`) is
untouched. Pins re-stamped — `bo-charcoal-legacy.css` `80879e44` → **`46e2928f`** and
`bo-wallet-transaction-amber.css` `75ef419b` → **`6b167772`** — on the 125 referencing pages
(`node scripts/check-asset-pins.js` → 0 stale). Guards all green: `check-shell-drift.js` OK ·
`check-global-collisions.js` 0 collisions · `check-spa-readiness.js` exit 0 · `pin-spa.js --check` 0 pages.

### The Main panel's content rhythm is one gap now — and the drift guard learned the two shells apart (2026-09-30)

Owner: “main所有页面 也需要 spa … 我切换页面时 我的夜间模式点不了”, and on the spacing, “都需要”.

**The Main panel had a different block rhythm on almost every page**, because each page sheet declared its own
spacing instead of letting one container own it. Measured on the rendered pages (light, 1568x900, `previous block
bottom -> next block top`), before this change:

| page | head -> first block | block -> block |
| --- | --- | --- |
| `main-report` | 14 | 14 |
| `main-accounting-settlement` | 24 | 28 / 22 |
| `main-accounting-due` | 24 | 20 |
| `main-accounting-report` | 34 | — |
| `main-settlement-report` | 24 | 20 / 16 / 18 |
| `main-transaction-history`, `main-balance-overview` | 24 | 18 |
| `main-stat-detail` | 16 | 16, but carried by Bootstrap `mt-3` |
| `main-merchant-profit` | 18 | 18 |
| ~25 other Main pages | already a 16px flex gap | 16 |

**One sheet, `assets/css/main-content-rhythm.css`, linked last on all 39 Main-shell pages.** It applies the same
answer BO locked long ago (DESIGN.md -> KPI summary card -> “Listing vertical rhythm”): the content column is a flex
column, its gap is **16px**, and a child's own margin is **0** because a margin stacks on the gap. Scoped by
`html[data-bo-shell="main"]` — the attribute `scripts/adopt-bo-spa.js` stamps per page and the same key `bo-spa.js`
uses to decide the shell — so there is no per-page class list and the block is inert on BO pages by construction.
Desktop-only (`min-width:1024px`): below that `main-mobile-responsive.css` owns the layout. Re-measured after: **all
39 Main pages compute `flex / gap 16px` and 16px gaps** (before: the table above).

**This is the content frame, not the shell.** AGENTS.md forbids unifying the BO shell and the Main panel — the
topbar, the rail and the canvas stay two separate implementations, and a cross-shell link still navigates for real.
What was unified is the spacing *inside* the content frame, which is the same question and therefore the same
answer.

**And the guard had to learn the difference.** `scripts/check-shell-drift.js` refuses a layout metric on a shell
selector in any sheet but `bo-shell.css`, and `.report-content` is in that selector list — so the new sheet was
refused, even though its rule can never match a BO page. The fix is a documented carve-out: a rule scoped by
`data-bo-shell="main"` is the Main panel's own frame, not the BO shell drifting. Deliberately narrow — the guard was
re-tested with a plain `.report-content{gap:9px}` appended to the same sheet and it still fails it, so the escape
hatch is not a hole.

**A `display:flex!important` on `.report-content` un-hid a hidden content frame (2026-10-01, user-reported).**
Merchant Detail keeps its edit workspace (`#madEditWorkspace`) as a SECOND `.report-content` on the same page and
hides it with the `hidden` attribute until the pencil is clicked. The first rule above matched it anyway - an
important declaration beats the UA sheet's `[hidden]{display:none}` and the page's own
`body.main-merchant-detail-page #madEditWorkspace{display:none}` (not important) - so the whole edit form was
painted under the merchant list: owner “我的merchant页面 他的add merchant的设计跑来前面了”. The leaked form also
took the height the list's auto page-size measures against, so the table fitted 5 rows and painted none while its
footer still read “Showing 1 to 5 of 10 merchants”. Measured on the deployed bytes in headless Chrome
(`CSS.getMatchedStylesForNode`): the winning rule was `(min-width:1024px) html[data-bo-shell="main"] .report-content
-> display:flex !important`; the element read `hidden=true`, computed `display:flex`, box 1290x381 at top 367.
Fixed with `:not([hidden])` on that selector. Re-measured on the fixed sheet: list `flex / gap 16px / 684px` with 5
rows painted, edit workspace `hidden / display:none / 0px`, pencil -> `flex / 1591px`, Back to List -> hidden again.
`main-merchant-detail.html` is the only Main page that hides a `.report-content` in its markup today - the rule
would have hit any page that adds one, so anything declaring `display` on this frame must carry the `:not([hidden])`.

**The theme toggle died on every navigation, and a cloned header is why.** `bo-spa.js` replaces
`.report-main > .report-topbar` with a clone of the target page's header on every swap, so the `#boThemeToggle` the
click was bound to no longer exists — and `bo-theme.js` bound it directly. Measured in a real browser,
`index.html -> menu-management.html`: before the swap two clicks flipped `data-bo-theme` normally; after it the
button read `bound=-` and two clicks left the theme at `light`. Fixed by delegating at the document level in
`bo-theme.js` (the same answer `reports.js` already uses for `[data-open-sidebar]`, registered once per realm so a
re-run cannot double-bind), the same fix in `main-dashboard.js`'s duplicate copy of that code (that page does not
load `bo-theme.js`), and a `BO_THEME.initThemeToggle()` call in `bo-spa.js` after the header is mounted — the button
is rebuilt from markup, so its *state* has to be re-applied even though the handler no longer needs rebinding.
Recorded for page authors in `SPA.md` section 10.4: **any listener bound to a topbar element dies on a swap**.

### The Transaction module lost its rail highlight - two independent causes, both measured (2026-09-30)

Owner: “在transaction 页面 我点 Win/Lose Adjustment / Bonus Adjustment / Bank Deposit Usage sidebard的
transaction不会active着”. Reproduced in the browser before anything was changed, and the two causes are
separate - each one alone was enough to leave the rail with nothing lit.

**A. A module page whose file appears in no menu row.** A module's rail row is ONE direct link (to the
module's first page) and the highlight was resolved by matching the **current file** against the group's menu
rows. Bulk Adjustment's Win/Lose and Bonus entries come from the page's own tab row, so no menu row points at
`bulk-adjustment.html`; every comparison missed and the whole rail rendered unmarked - measured
`bulk-adjustment.html` → `active row(s): NONE`, while `member-deposit.html` and `bank-deposit-usage.html`
lit the row (their rows exist in the harness menus).

Fixed in `auth.js` (`renderSidebar`): the existing search became `resolvePrimary(file)`, and **only when
nothing matched** it retries against the module's ANCHOR page (`MODULE_ANCHORS` - the page a group is
required to own to be claimed as that module's group at all). Because it is a fallback, every page that
already had a row keeps exactly the row it lit before. Measured after: `bulk-adjustment.html` →
`nav-group-btn "Wallet Management"` (the owner's database calls that group Transaction).

**B. `activateRail` cleared the highlight and then had nothing to set.** `bo-spa.js` looked for a rail link
whose href equals the destination, fell back to “the element that was active before the swap” when
`nav.contains(prev)`, and then **unconditionally cleared every `.active`**. But several page scripts call
`BO_AUTH.renderSidebar()` on boot (`bank-deposit-usage.js:309`, `bulk-member-operation.js`,
`game-category-edit.js`, …), which rewrites `nav.innerHTML` and **detaches** the node captured a moment
earlier - so `nav.contains(prev)` was false, the fallback did nothing, and the clear left the rail blank.

Proved it was a rebuild rather than a stale reference: marking `.report-nav` and its active `<a>` before the
swap, the nav node survived (`true`) while the marked anchor was gone from the DOM (`false`). Measured
before the fix, `member-deposit.html → bank-deposit-usage.html` (clicking the module tab): the row went from
`[ACTIVE]` to no marked row, while a DIRECT load of the same page lights it - and the two paths really are
different code (`renderSidebar` vs `activateRail`).

Fixed in `bo-spa.js`: when `prev` is detached, the row is re-found by the keys it carries
(`data-menu-key` first, then `href`) instead of by node identity; and **when there is no target at all the
function now returns without clearing** - either the rail already shows the correct row, or the rebuild has
just resolved it from the new URL, and clearing there is exactly what produced "nothing is lit".

Measured after: same-module navigation keeps the row (`member-deposit → bank-deposit-usage`,
`[ACTIVE]` throughout), and a cross-module navigation still MOVES it (`index.html → promotion.html`:
Wallet Management off, Bonus Management on). Twelve module pages re-measured for the direct-load path;
`agent-management.html` reads `NONE` in the harness only because that fixture's admin has no Agent menus at
all (no Agent row is rendered), and the fallback can only ever ADD a highlight, never remove one.

Pins: `auth.js` and `bo-spa.js` re-stamped across the 136 pages that reference them (`check-asset-pins` 0
stale). Guards: shell-drift OK · global-collisions 0 · spa-readiness exit 0 · pin-spa 0.
