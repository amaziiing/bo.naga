# Design System — Backoffice Admin Panel

Locked theme for this product. Do not invent alternate palettes.

## Direction

**Product:** Backoffice Admin Panel (admin / SaaS dashboard)  
**Personality:** Modern ops terminal — precision, density, enterprise trust  
**Theme name:** Charcoal + Amber  
**Foundation:** Soft charcoal structure + amber interaction  
**Depth:** Light = 1px border + soft warm shadow · Dark = borders / soft surface lift (no dead black)  
**Signature:**  
- Light: orange→cream canvas continuum · opaque sidebar `#FFE8CC` · listing surface `#FFF8EB` · **form layer ladder** (`#FFFCF7` → `#F5EBDC` → `#F0E4D0`) · amber active (**locked**)  
- Dark: warm charcoal→cool charcoal continuum · opaque sidebar `#3A3226` · amber neon active  

**Reference implementation:** Admin Detail pages (`data-access-page="main_admin_detail"`); light cream chrome confirmed on Dashboard (`main-dashboard.html`); form hierarchy on Create/Edit Admin.

### Light mode (locked 2026-09-14)

Do not use pure white `#FFFFFF` or ivory `#FFFCF8` for canvas / topbar / panels. Do not flatten Create/Edit forms to one cream.

| Role | Hex |
|------|-----|
| Sidebar | `#FFE8CC` |
| `--bo-bg` | `#FFF1DC` |
| Continuum | `#FFE8CC` → `#FFF1DC` → `#FFF3E0` → `#FFF6E8` → `#FFF8EB` |
| `--bo-surface` (topbar, listing cards) | `#FFF8EB` |
| Form section lift | `#FFFCF7` |
| Form border | `#DCC9A8` |
| `--bo-border` (listing) | `#EADCC8` |
| Control well | `#F5EBDC` |
| Nested well | `#F0E4D0` |
| Locked / readonly | `#EDE4D4` |
| Accent-on only | `#FFFFFF` |

## Intent

- **Who:** Brand / ops executives scanning accounts, roles, credits — not designers browsing demos  
- **Task:** Manage admins → adjust credit → audit security  
- **Feel:** Calm charcoal room with amber signals — never navy/cyan identity, never playful purple SaaS defaults  

## Rejected defaults (retired)

- **Deep Navy Cyan** (fully retired): `#123B66`, `#21A6D7`, `#1B94C2`, `#072647`, `#08131F`, `#102030`, `#0B1626`, `#0F1F33`, `#243B55`
- Purple-on-white / indigo gradients
- Warm cream (`#F4F1EA`) + terracotta editorial look as a *marketing* default (warm continuum is intentional brand here — use documented amber tokens only)
- Inter / Roboto / Arial as display identity
- Generic `#2864ed` BO blue
- Dead black canvas (`#000` / `#0A0A0B`)

---

## Tokens

### Brand (shared roles)

| Role | Light | Dark |
|------|-------|------|
| Primary CTA / active / focus | `#D97706` | `#F59E0B` |
| Primary deep / hover | `#B45309` | `#D97706` |
| Bright amber | `#F59E0B` | `#FBBF24` |
| Secondary (rare info) | `#2563EB` | `#D97706` |
| Success | `#12B76A` | `#10B981` |
| Danger | `#991B1B` | `#F87171` |
| Accent-on (on primary fill) | `#FFFFFF` | `#2A2C36` |

### Surfaces & text

| Token | Light | Dark | Role |
|-------|-------|------|------|
| `--bo-bg` | `#FFF1DC` | `#2C2E38` | Page canvas base (warm cream) |
| `--bo-surface` | `#FFF8EB` | `#383A46` | Cards, panels, topbar (cream — not ivory/white) |
| `--bo-border` | `#EADCC8` | `rgba(255,255,255,.10)` | Separators / inputs |
| `--bo-text` | `#18191C` | `#F5F5F4` | Primary text |
| `--bo-text-secondary` | `#27272A` | `#E7E5E4` | Secondary text |
| `--bo-muted` | `#71717A` | `#A1A1AA` | Meta, time, captions |
| `--bo-control-well` | `#F5EBDC` | `rgba(255,255,255,.06)` / dark inputs `#2A2C36` | Input wells (cream — never `#F0EFEA` / `#fff`) |
| `--bo-placeholder` | `#78716C` | `#A1A1AA` | Placeholders on cream / charcoal wells |

### Compatibility aliases (names kept, hues changed)

| Token | Light | Dark | Meaning now |
|-------|-------|------|-------------|
| `--bo-navy` | `#18191C` | `#F5F5F4` | Primary text / emphasis (not navy) |
| `--bo-cyan` | `#D97706` | `#F59E0B` | Amber accent (not cyan) |
| `--bo-cyan-deep` | `#B45309` | `#D97706` | Amber deep |
| `--bo-ui-blue` | `#D97706` | `#F59E0B` | Same as primary amber |
| `--bo-sidebar-active` | `#D97706` | `#F59E0B` | Active nav |
| `--bo-sidebar-active-bg` | `#FFE8CC` | `rgba(245,158,11,.14)` | Active nav fill |
| `--bo-cyan-tint` | `rgba(217,119,6,.12)` | `rgba(245,158,11,.16)` | Soft amber wash |

### Sidebar & canvas continuum

| Mode | Opaque sidebar | Canvas L→R (~96px past sidebar edge) |
|------|----------------|--------------------------------------|
| Light | `#FFE8CC` | `#FFE8CC` → `#FFF1DC` → `#FFF3E0` → `#FFF6E8` → `#FFF8EB` |
| Dark | `#3A3226` | `#3A3226` → `#342E28` → `#2F2E32` → `#2D2E36` → `#2C2E38` |

Rules:

1. Continuum lives on **html/canvas** only (`background-attachment: fixed`).
2. Sidebar is **opaque** (never transparent when expanded over content).
3. Panels / tables stay **solid** `--bo-surface` (never tinted by continuum wash).
4. Amber 2px edge rail on sidebar right edge (light `::before` · dark `::after`; dark also paints a faint grid on `::before`).
5. L1 nav labels: `font-weight: 800`. Light L1 color: `#6b360c`. Dark L1 default `rgba(255,255,255,.86)`.
6. Shell source: `assets/css/bo-charcoal-shell.css` — page CSS must not repaint sidebar fill/L1/L2/flyout.

### Tips / money / chrome

| Element | Light | Dark |
|---------|-------|------|
| Hover tip bg | `#FFF8EB` | `#40424E` |
| Hover tip text | `#6b360c` | `#F5F5F4` |
| Hover tip border | `rgba(217,119,6,.28)` | `rgba(245,158,11,.35)` |
| Tip radius | Chart `.trend-tip` **`8px`** · datetime / float / icon tips **`999px` pill** | same |
| Money positive | `#B45309` | `#F59E0B` |
| Ghost / Export gradient | soft gray | `#4A4C58` → `#383A46` → `#2C2E38` |
| Modal z-index | `30000` (above sidebar / flyout) | same |

### Spacing

Base: `4px`  
Scale: `4, 8, 10, 12, 14, 16, 18, 20, 24, 32`

### Radius

| Use | Value |
|-----|-------|
| Action buttons / theme toggle / filter controls | `8px` (locked Admin chrome) |
| Cards / panels | `16px` |
| Nav items | `10px` |
| Avatar (topbar) | `12px` |
| Pills / switches | `999px` |
| Chart hover tip (`.trend-tip`) | `8px` |
| Datetime / float / icon tip (`.mad-float-tip` · `.wl-time-tip` · Last Login) | `999px` pill |

### Typography

- UI: system stack; hierarchy via weight + color
- Sidebar L1: `800`
- Money / time: tabular nums; mono OK for dense cells
- **Roles / Create Role scale:** page title `28px/800` · card title `16px/800` · field label `11–11.5px/800` uppercase · body/filter `13.5px` · chips/buttons `12.5–13px/700–800` · status pill `10.5px/800` uppercase · topbar name `14px/700` · topbar role `11px` mono

### Depth

| Mode | Strategy |
|------|----------|
| Light | 1px `#E4E4E7` + soft warm shadow |
| Dark | Surface `#383A46` on canvas `#2C2E38`; prefer border over heavy shadow |

---

## Layout

- Shell: left sidebar + topbar + main
- Sidebar width: `--sidebar-w` (**260px**, locked 2026-09-22); mini-rail `--rail-w` (72px)
- Modals: append under `body` (outside `report-shell` / `main`) so backdrop covers sidebar
- First viewport: no marketing collage; one job per section

### Transaction family (sidebar category 3 — listing)

Classic BO listing shells (`reports.css` + `bo-ui-standard.css`), **not** MAIN executive pages.

| Item | Value |
|------|-------|
| Scope | `body.bo-wallet-tx` |
| CSS | `assets/css/bo-wallet-transaction-amber.css` (load after `bo-ui-standard`) |
| Pages | `member-deposit`, `member-withdraw`, `member-wallet`, `wallet-ledger`, `bulk-adjustment`, `bank-deposit-usage`, `bulk-bonus-adjustment`, `payment-method` |
| Filter / select recipe | **Listing filter controls (locked)** — height **`36px`** · radius **`8px`** · gap **`10px`** · surface `#FFF8EB` · border `#EADCC8` · never form well `#F5EBDC` · Type multi = Role select option chrome |
| Dark select selected | solid `#F59E0B` · text `#2A2C36` (same as Role select) |
| Pager | **Table footer pager** — anatomy **First · Prev · pages(+ellipsis) · Next · Last** · light inactive slate `#F3F4F6`/`#9CA3AF` · amber gradient active · **no shadow** |
| Date range | **Date range picker** pattern (preset wash, ghost head, cream panel) — listing trigger height **`36px`** · width ~`240px` — see Patterns |
| Filter titles | Hidden on listing filters (placeholder + value carry meaning) |
| Filter Page Size | **Not** in the filter row — footer `Show N entries` only (Deposit / Withdraw / Wallet Ledger / Member Wallet / VIP logs). Options **`-` · `10` · `20` · `50` · `100` · `All`**. `-` = auto-fit · no body scroll · trigger shows **`-`**. `All` = 10000 · **body scrolls** (VIP EXP Log specimen). Fixed sizes may scroll. Chrome = **Role select** recipe. |
| Deposit / Withdraw tabs | `.bo-tx-tabs` / `.bo-tx-tab` — **Status filter pills** recipe · order Deposit → Withdraw → All · cream **capsule** thumb (`999px`) + muted idle dots · green/red only when selected · counts `(n)` · requires `bo-seg-bounce` |
| Hover / focus / open | Same as Merchant Profit + Role select: border `#D97706` + `0 0 0 3px rgba(217,119,6,.14)` (dark: `#F59E0B` + `rgba(245,158,11,.18)`). Inputs, selects, date triggers — one recipe. Idle chrome must not kill the ring. |
| Table frame | **Same as Admin Detail `.mad-panel`** — viewport-locked panel · inner scroll · `table-layout:fixed` · radius `8px` · no nested `.table-wrap` border · footer pins to panel bottom |
| Table light paint | **Transaction listing table** (peach-cream zebra — no pure white) — see Patterns → Data tables |
| Table dark paint | Same zebra rhythm: odd `#3A3C48` · even `#434653` · head `#1F2128` (deeper than body) — never flat slab |
| Row Approve / Reject / Ledger | `.bo-tx-action-btn` **26×26** · icon `15px` · padding `0` · radius `6px` · light: control-well chip `#F5EBDC`/`#EADCC8` · dark: charcoal well `#2A2C36`/`white/14` · semantic icon (approve `#067647` · reject `#B42318` · ledger muted) · hover success/danger wash. Ledger uses `a.bo-tx-action-btn.is-ledger` — **not** reports `.bo-icon-action` |
| Status pills | **PENDING** orange · **APPROVED** green · **REJECTED** red — see Patterns → Data tables → Status pills |
| Filtered total bar | **Removed** on Deposit / Withdraw — do not restore `.approval-total-bar` |
| Pending metrics strip | **Removed** on Deposit / Withdraw — do not restore Pending Count / Pending Amount metrics above the table |

#### Deposit / Withdraw page chrome (locked)

Reference pages: `member-deposit.html` · `member-withdraw.html`. Same shell; Withdraw adds Remark + Ledger.

| Part | Spec |
|------|------|
| Module navigation | `.bo-module-tabs` rendered by `auth.js` as the first child of `.report-content` (left edge = content container, never the sidebar): text-only tabs, active = dark text + 2px amber underline, scrolls sideways when narrow. Transaction = Deposit Approval · Win/Lose Adjustment · Bonus Adjustment · Bank Deposit Usage; Member = User Management · Member Wallet · Wallet Ledger · Referral Network. The sidebar row for such a module is a **direct link** (no chevron, no flyout) and only shows active; a DB group qualifies only with ≥2 of the module's pages **and the module's anchor** (`MODULE_ANCHORS`). The Bulk Adjustment pair comes from that page's own authored links (`MODULE_SECTION_PAGES`). **Every tab also carries its own Dashboard pin** — the same control and the same store as the sidebar rows (`headerMenuKeys`, written through `PUT /admin/ui-setting`), because a module's rail row is a single direct link and its pages therefore have no row of their own to pin. It is revealed by the tab that owns it (hover/focus), always on for touch and below 992px: **18px glyph, no backdrop** · 12px `bi-pin-angle` → `bi-pin-angle-fill` in `--bo-cyan` · hover turns the glyph amber and a pinned one scales 12% · 26px target · and the **label**, never the tab box, gives up the 8px (`transform`), so the resting row is byte-identical |
| Body | `body.bo-wallet-tx.deposit-approval-page` / `.withdraw-approval-page` — keep this class; charcoal shells must **not** replace it |
| Bank selector + summary bar | `#depositBankCards` / `#withdrawBankCards` inside `.bo-bank-dock` · `.deposit-bank-card-stats.bo-bank-chips` · **one segmented navigation strip, no rail**: the row itself is transparent (nothing stacked behind it) and each bank is a 34px segment whose face is a skewed rounded rectangle (`transform:skewX(-7deg)`, `border-radius:6px` — the house radius; a clip-path would have cut the radius off). Unselected segments take `--bo-control-well` so they are visible against the page in both themes; the selected one takes `--bo-surface` (which is also the panel's surface, so it reads as the same surface as the bar it opens) plus a 1px accent inset ring, stronger text and a 26px accent wedge (`.bo-bank-chip-pointer`, `clip-path` triangle) that drops through the 7px bridge onto the panel. Pending counts ride inline after the name as a 16px tag in the family's danger colour. Every segment has one width, measured from the longest name by `equalizeChips()` (measured at the bold weight, so the selected one cannot grow). Chips opt out of the global button standard with `data-bo-ui-skip`. The row never wraps: it scrolls sideways, with 4px of side padding so the skewed outermost edges are not clipped. The panel below is one 8px-radius surface (hairline inset ring, no second fill) split by 1px separators into **three zones**: `Start`, `Deposit`, `Balance` (19/19/21px, Balance in the accent — the only accent in the bar). Labels are 11px muted; values are bold and high-contrast, the bar is a constant 63px in every state. Nothing else is printed: the account, the period and the status are not repeated here (they are in the page's own filter row and each chip's tooltip), and a figure that cannot be computed shows `n/a` with its reason in that slot's tooltip instead of a sentence under it. Two columns ≤1000px, one column ≤600px. Selecting a bank also narrows the table to it. Colour comes only from the page's tokens (`bo-wallet-transaction-amber.css` on `body.bo-wallet-tx`), so the module follows the theme; the only fixed geometry tokens are `--bnk-cut-panel`-style values inside `.bo-bank-dock` (skew, gaps, bridge, 6/8px radii). Balance = `bankUsage`; `Start = Balance − Deposit`; a figure that is not known prints `-`, never a guess (contract: `BANK_BALANCE_API.md`) |
| Toolbar | Inside `.table-card` → `.deposit-inline-filter` → `.bo-tx-toolbar`: **left** `.bo-tx-tabs.bo-seg` · **right** `.bo-tx-filter-controls` (date range + keyword + status) |
| Filter controls | **Listing filter controls (locked)** — height **`36px`** · gap **`10px`** · radius **`8px`** · date **`240px`** · keyword **`140px`** · status **`150px`** · surface `#FFF8EB` / `#EADCC8` (same as Wallet Ledger specimen) |
| Filter strip | **No** Reset / Search / Page Size in the filter row — page size lives in footer only (`#depositSize` / `#withdrawSize` stay hidden) |
| Columns (Deposit) | Date · Member · Amount · **Bank** (header label, not Method) · Reference · Status · Processed · Action |
| Columns (Withdraw) | Date · Member · Amount · Bank · Reference · Remark · Status · Processed · Action |
| Member cell | Username only (no nested bank line) |
| Bank cell | Bold `BankName (account)` via `formatMethodLabel` / `formatBankLabel` |
| Remark (Withdraw) | Player remark only — **no** `Admin: …` sub-line under the cell |
| DATE cell | `.bo-tx-datetime` · day + time spans · `title` = full datetime — see Responsive |

#### Deposit / Withdraw responsive (1920 → 375)

Preserve colors / hierarchy / business logic; change width, stack, and density only. CSS lives in `bo-wallet-transaction-amber.css` (Deposit + Withdraw shared). Target audit: **1920 · 1440 · 1280 · 1024 · 768 · 390 · 375**. Never page-level horizontal overflow — table scrolls inside `.bo-tx-table-body`.

| Breakpoint | Behavior |
|------------|----------|
| ≤1456 | **DATE** shows calendar day only (`.bo-tx-datetime-time{display:none}`) · hover/`title` still shows full `YYYY-MM-DD HH:mm:ss` |
| ≤1280 | Bank cards → **one-row horizontal snap strip** (do not wrap into 2–3 tall rows) · toolbar **column**: tabs row then filters row (`flex-flow: row nowrap` on filters) · table `min-width` ~980–1080 · cells `overflow:hidden` + ellipsis · `.bo-tx-table-body` scrolls x/y · table-card keeps `min-height` so ledger rows stay reachable |
| ≤1024 | Filters may wrap · hide topbar subtitle + account meta text · bank cards stay strip |
| ≤768 | Compact bank strip · hide **Processed** (Deposit col 7 / Withdraw col 8) · Withdraw also hide **Remark** (col 6) · stronger table-card / body `min-height` · approval modal `#bankApprovalPopup` full-bleed |
| ≤575 / 390 / 375 | Hide header **Members/Deposit/Withdraw** counters · hide title icon · filters stack full-width · hide **Reference** (+ Remark/Processed as above) · action hit area ≥36px · touch fields `min-height:44px` |

Head/body column sync: body `scroll` sets `.bo-tx-table-head` `scrollLeft` (Deposit + Withdraw + Wallet Ledger + Member Wallet JS).

#### Payment Method Config (locked)

Reference: `payment-method.html` · `body.bo-wallet-tx.payment-method-page`. Same Transaction listing table / pager / status pills as Deposit.

| Part | Spec |
|------|------|
| Shell | `bo-wallet-tx` + `bo-wallet-transaction-amber.css` (not charcoal shell) |
| Panel | `.pm-list-card` = viewport-locked `.table-card` · toolbar strip · inner `.table-wrap` scroll · footer pager |
| Toolbar | Right-aligned Ghost `Bank Deposit Usage` / `Refresh` + primary amber `Create Payment Method` (no left title badge) |
| Columns | Order · Type · Display (name + subtitle) · Details · QR · Status · Action |
| QR | Amber `.bo-tx-link` **View** (never default blue) · `-` when empty |
| Status | `.status-pill.active` ACTIVE · `.status-pill.off` INACTIVE |
| Action | `.bo-tx-action-btn` **26×26** · Edit `is-edit` (amber well) · Delete `is-reject` (danger) |
| Modal | Form wells `#F5EBDC` · focus amber ring · full-bleed ≤768 |

#### Bank Deposit Usage (locked)

Reference: `bank-deposit-usage.html` · `body.bo-wallet-tx.bank-deposit-usage-page`. Companion to Payment Method.

| Part | Spec |
|------|------|
| Shell | `bo-wallet-tx` + amber CSS + `bank-deposit-usage.css` (not charcoal) |
| Filters | Inline toolbar · **left** `.bo-tx-tabs.bo-seg` **Active → Suspend → All** — locked **Status filter pills** specimen (cream capsule thumb · muted idle dots · green/red only when selected · All has no dot · counts `(n)` · `bo-seg-bounce`) · **right** date range + keyword + `Create` + `Refresh` · **no** Payment Method Config · **no** Reset / Search |
| Summary | **Removed** — do not restore `.usage-summary-grid` metric cards |
| Panel | Viewport-locked · tabs left + filters/actions right · no title badge · no link underline |
| Table | Peach-cream zebra · square thead · `table-layout:fixed` · inner scroll · never page overflow |
| Status | `.status-pill.active` **Active** · `.status-pill.off` **Suspend** · click to toggle |
| Action | `.bo-tx-action-btn` **26×26** · **View** `is-view` (eye · QR open in new tab · disabled when no QR) · Edit `is-edit` · Delete `is-reject` |
| Pager | Footer `.bo-usage-pager-host` · `.smart-pagination` / `.smart-page` (mad-pager amber active) · client page size **10** |
| Meter | Track `#F5EBDC` · fill `#B45309` · warn `#F59E0B` · over `#EF4444` |

Theme: FOUC + `#boThemeToggle` sibling of `[data-bo-profile]` + `bo-theme.js`.

#### Bulk Adjustment / Bulk Bonus (locked)

Reference: `bulk-adjustment.html` · `bulk-bonus-adjustment.html` · `body.bo-wallet-tx.bulk-adjustment-page` / `.bulk-bonus-adjustment-page` · `bulk-member-operation.css`.

| Part | Spec |
|------|------|
| Shell | `bo-wallet-tx` + amber CSS + `bulk-member-operation.css` (not charcoal) |
| Mode tabs | Manual Selection · Excel / XLSX Upload — family segment chrome |
| Manual split | `.bulk-operation-layout` — **Select Members `60%`** (`3fr`) · **Configure `40%`** (`2fr` · min `280px`) · stacks to `1fr` on narrow |
| Search | `.mad-search.bulk-member-search` — listing surface recipe |
| Panel scrollbars | **Panel pill scrollbar** on `.member-picker-list` **and** `.selected-table tbody` · light chocolate `#8B6B4A` / hover `#5C4A30` · dark `#F59E0B` / hover `#D97706` · **`6px`** · no arrows |

#### Panel pill scrollbar (Bulk · Wallet Ledger)

Thin pill · **no** end arrows. Webkit only — **do not** set `scrollbar-width` / `scrollbar-color` to a coloured pair (Chromium then paints OS arrows and ignores `::-webkit-scrollbar`). Firefox: `@supports not selector(::-webkit-scrollbar)` with `scrollbar-width:thin` + matching `scrollbar-color`.

Applies to:
- Bulk `.member-picker-list` · `.selected-table tbody`
- Wallet Ledger `.table-card > .table-wrap > .bo-tx-table-body` (vertical · body only) · `#ledgerTypeOptions` (type menu)
- Member Wallet Provider Detail modal `#providerWalletDetailModal .table-wrap` (vertical)

| Part | Light | Dark |
|------|-------|------|
| Width / height | **`6px`** | **`6px`** |
| Thumb | chocolate `#8B6B4A` | `#F59E0B` |
| Thumb hover | deep chocolate `#5C4A30` | `#D97706` |
| Track / buttons | transparent · `::-webkit-scrollbar-button{display:none;height:0}` | same |

**Do not** use cool slate `#98A2B3` / `#667085` on these cream panels — light must read warm chocolate. **Do not** use zinc `#71717A` / `#A1A1AA` for dark. Role select menus keep their own slate light thumb (see Role select). Listing table body scrollbars on Deposit/Withdraw (`.bo-tx-table-body`, 14px + end arrows) are a different recipe — do not copy here.

Theme: FOUC + `#boThemeToggle` sibling of `[data-bo-profile]` + `bo-theme.js`.

#### Wallet Ledger (locked)

Reference: `wallet-ledger.html` · `body.bo-wallet-tx.wallet-ledger-page` · `bo-wallet-transaction-amber.css`.
**Specimen for listing filter control size** — measure here; other Transaction listing pages unify to the same metrics.

| Part | Spec |
|------|------|
| Shell | `bo-wallet-tx` (not `bo-charcoal`) + amber CSS · FOUC theme script |
| Filter strip | Inside `.table-card` → `.filter-card.wallet-inline-filter` · pad `10px 14px` · bottom hairline `#EADCC8` · **no** Page Size in row |
| Filter controls | **Listing filter controls (locked)** — see Patterns · date `240px` · Member/Provider `140px` · Type `150px` · Reset/Search `auto` (content + `0 12px`) |
| Type multi-select | Trigger = listing control chrome · menu/options = **Role select** option recipe (cream · amber wash hover · dark selected solid amber) |
| Table | Split `.bo-tx-table-head` (**fixed** · does not scroll) + `.bo-tx-table-body` (`#ledgerTableScroll` · **only** vertical scroller) · wrap `overflow:hidden` · **no** page/H-scrollbar when columns fit · **Panel pill scrollbar** on body (chocolate light / amber dark · **`6px`** · no arrows) |
| Type menu scroll | `#ledgerTypeOptions` — same pill recipe |
| Wallet Ledger Created/Posted | Cell = **`DD/MM/YYYY`** · hover cream pill `.wl-time-tip` = **`HH:MM:SS`** · **no arrow / beak** · `999px` · pad `7px 14px` · cream `#FFF8EB` / text `#6b360c` · fixed escape overflow |
| Hover in strip | Reset/Search: **no** `translateY(-1px)` / upward shadow (flush under `.table-card` top border) |
| Footer Show N | Same as **Deposit** — options `-` · `10` · `20` · `50` · `100` · `All` via hidden `#ledgerSize` · Role select cream chrome · open upward · bold options · amber wash selected |

Theme: FOUC + `#boThemeToggle` sibling of `[data-bo-profile]` + `bo-theme.js`.

#### Member Wallet (locked)

Reference: `member-wallet.html` · `body.bo-wallet-tx.member-wallet-page` · same Transaction listing chrome as Wallet Ledger.

| Part | Spec |
|------|------|
| Shell | `bo-wallet-tx` + amber CSS · FOUC theme script |
| KPI strip | 4 `.metric` tiles (Main / Provider / Total Bet / Net Win-Loss) · Member Wallet KPI specimen (icon chip amber wash) |
| Filter strip | Inside `.table-card` → `.filter-card.wallet-inline-filter` · keyword only + Reset/Search · **no** Page Size in row |
| Filter controls | **Listing filter controls (locked)** — keyword **`280px`** (min `220` · max `360` · flex grow) · Reset/Search `auto` · `36px` / `8px` · no hover lift |
| Member cell | Username only (no `ID: …` sub-line) |
| Action | `.bo-tx-action-btn` **26×26** · Ledger `is-ledger` · Adjust `is-edit` |
| Table | Split `.bo-tx-table-head` (fixed) + `.bo-tx-table-body` (scroll) · panel pill scrollbar on body · colgroup sync |
| Footer Show N | Same as Deposit — `-` · `10` · `20` · `50` · `100` · `All` via hidden `#walletSize` |

Theme: FOUC + `#boThemeToggle` sibling of `[data-bo-profile]` + `bo-theme.js`.

---

## Patterns

### Listing filter controls (locked — Wallet Ledger specimen)

**Canonical size for Transaction listing filters** (`.bo-filter-row` / `.wallet-inline-filter` / Deposit–Withdraw inline toolbar). Reference: `wallet-ledger.html` filter strip. **Do not** ship `42px` / `11px` radius on these rows going forward — beat `bo-ui-standard` `--bo-filter-height:42px` with the amber layer.

| Spec | Value |
|------|-------|
| Height | **`36px`** · `min/max-height:36px` · `box-sizing:border-box` |
| Radius | **`8px`** (not `11px`) |
| Row gap | **`10px`** |
| Strip padding | `10px 14px` (inline-in-table-card) |
| Surface | `#FFF8EB` · border `#EADCC8` · never form well `#F5EBDC` |
| Text | inputs `12px/700` · date trigger `13px/700` · buttons `12.5px/800` |
| Control pad | `0 12px` (text inputs / buttons) · **select trigger `0 28px 0 12px`** (room for pinned chevron) |
| Focus / open | border `#D97706` + `0 0 0 3px rgba(217,119,6,.14)` (dark: `#F59E0B` + `rgba(245,158,11,.18)`) |
| Labels | Hidden (placeholder + value) |
| Select chevron | **Pinned `right:12px`** — see Role select dropdown · never trail the label |

| Control | Width (desktop) |
|---------|-----------------|
| Date range trigger | `240px` (flex `0 0 240px` · min `220`) |
| Text input (Member / Provider / keyword) | `140px` |
| Type multi / select-like | `150px` |
| Page size | **Not in filter row** — footer only |
| Reset / Search | `width:auto` · `flex:0 0 auto` · pad `0 12px` |

**Buttons in the strip:** Ghost Reset + Primary Search — same **`36px`** · listing Ghost / Primary 3D fills · **no** hover lift when the strip sits flush under a panel top border.

**Out of scope (keep their own heights until migrated):** Roles `.mp-search` / Role select trigger on `menu-permission` · MAIN executive `.mad-filters` · modal footers (`40px`). When those listing-adjacent filters are next touched, bring them to **`36px`**.

### Sidebar nav

Source of truth: `assets/css/bo-charcoal-shell.css` (shared shell). Do not invent alternate fills from page CSS.

#### Shell chrome — `.report-sidebar`

| Spec | Light | Dark |
|------|-------|------|
| Fill (opaque paint) | `#FFE8CC` | `#3A3226` (continuum left stop; token `--bo-sidebar-bg` may still read `#2A2C36` — prefer paint stop) |
| Border-right | `1px solid rgba(92,74,48,.14)` | `1px solid rgba(245,158,11,.22)` |
| Text | `#6b360c` | `#FFFFFF` |
| Expanded / mini-hover shadow | `18px 0 40px rgba(60,48,32,.14)` | `18px 0 40px rgba(0,0,0,.35)` |
| Edge rail | `::before` 2px · `#F59E0B`→`#D97706` · opacity `.75` | `::after` 2px · `#FBBF24`→`#F59E0B`→`#D97706` · opacity `.85`; `::before` = faint grid texture |
| Brand `.report-brand` | text `#6b360c` · bottom `rgba(92,74,48,.1)` · small `10px/700` opacity `.78` | text `#FFFFFF` · bottom `rgba(245,158,11,.18)` · small amber `rgba(245,158,11,.78)` + soft glow |
| Close `.close-side` | bg `rgba(255,255,255,.55)` · border `rgba(92,74,48,.12)` · `#6b360c` | bg `rgba(255,255,255,.1)` · `#fff` |
| Account footer | transparent · top `rgba(92,74,48,.1)` | transparent · top `rgba(255,255,255,.08)` |
| Logout `.bo-sidebar-logout` | text `#B42318` · icon `#D92D20` · bg `rgba(255,255,255,.45)` · border `rgba(180,35,24,.12)` · hover `#912018` on `rgba(254,243,242,.95)` | text `#FF8A90` · icon `#F87171` · transparent · hover white on `rgba(248,113,113,.1)` + red ring |
| Nav slab `.report-nav` | transparent · pad `12px 10px 10px` · gap `3px` · **no** nested glass | same pad · transparent |
| Nav scrollbar (`.report-nav`) | **hidden** — `scrollbar-width:none` + `.report-nav::-webkit-scrollbar{display:none}`. The nav is the rail’s real scroll area (`bo-ui-standard.css` gives it `overflow-y:auto` and pins `.report-sidebar` to `overflow:hidden`), so this slot belongs to the nav, never the sidebar. Wheel / trackpad still scroll. | same — no colour is involved |

Never put `backdrop-filter` / `isolation` on `.report-sidebar` — it clips the desktop L2 flyout (`position:fixed`).

#### L1 — `.nav-group-btn` / top-level `a:not(.report-sub)` (locked)

| State | Light | Dark |
|-------|-------|------|
| Default | text/icon `#6b360c` · weight `800` · radius `10px` · transparent · icons opacity `.72` | text `rgba(255,255,255,.86)` · icons `rgba(255,255,255,.7)` · weight `800` |
| Hover / flyout-hover | wash `rgba(255,243,224,.78)` · soft lift `0 1px 2px rgba(60,48,32,.05)` | wash `rgba(255,255,255,.04)` · text `rgba(255,255,255,.95)` · icon hover `#FBBF24` |
| **Active / open / has-active-child** | gradient `135deg #FFF8EF → #FFE8CC → #FFF3E0` · inset white + ring `rgba(217,119,6,.18)` + lift `0 6px 16px rgba(217,119,6,.12)` · **3px left bar** `#FBBF24`→`#D97706` + soft amber glow | gradient `90deg rgba(245,158,11,.16) → .05 → transparent` · text `#FBBF24` · amber inset + glow · **2px left bar** `#FDE68A`→`#F59E0B`→`#D97706` · icon drop-shadow |

L1 active = **left amber bar**, never the L2 bordered frame.

#### Desktop flyout panel — `.nav-group-list`

`reports.css` sets desktop flyout `background:#fff!important`. Shell must beat it (include `.report-nav > .nav-group > .nav-group-list`).

| Spec | Light | Dark |
|------|-------|------|
| Panel bg | `#FFF8EB` | `#383A46` |
| Panel border | `1px solid rgba(92,74,48,.12)` | `1px solid rgba(255,255,255,.14)` |
| Panel shadow | `0 12px 32px rgba(60,48,32,.14)` | `0 16px 40px rgba(0,0,0,.35)` |

#### L2 — `.report-sub` (inline nav + flyout)

Two light active chips ship in CSS — copy the matching selector, do **not** flatten to a single wash.

| State | Light | Dark |
|-------|-------|------|
| Default | text/icon `#6b360c` · transparent · radius `9px` · border transparent | text `rgba(255,255,255,.62–.68)` · icons `rgba(255,255,255,.55)` |
| Hover (inline) | wash `rgba(255,243,224,.72)` · **no** frame | `rgba(255,255,255,.05)` · text `.92` · no frame |
| Hover (flyout) | wash `rgba(217,119,6,.08)` · **no** frame | same as inline dark hover |
| **Active — inline** `.report-nav a.report-sub.active` | `135deg #FFF8EF → #FFE8CC` · border `1px solid rgba(217,119,6,.28)` · shadow `0 4px 12px rgba(217,119,6,.1)` · text `#6b360c` | `180deg rgba(245,158,11,.18) → rgba(43,37,33,.92)` · border `rgba(245,158,11,.55)` · text `#FBBF24` · amber ring/glow + inset |
| **Active — flyout** `.nav-group-list a.report-sub.active` | `180deg #FFFBEB → #FEF3C7` · border `1px solid #D97706` (`--bo-sidebar-active`) · shadow `0 0 0 1px rgba(245,158,11,.12), 0 4px 14px rgba(217,119,6,.12)` · text `#6b360c` | same dark chip as inline |
| Active `::after` rail | none (`display:none`) | none |

Do **not** use flat `rgba(217,119,6,.12)` wash alone for active. Shared on: Dashboard, Roles & Permissions, Administrators, Security & Audit, and every page on `bo-charcoal-shell.css`.

### Topbar (locked chrome — copy exactly)

**Specimen:** Deposit Approval topbar (`member-deposit.html` · `body.bo-wallet-tx`) — user-confirmed 2026-09-17.

**Surface**

| Mode | Topbar bg | Height (Transaction / Approval) |
|------|-----------|----------------------------------|
| Light | solid `#FFF8EB` | `64px` (`--bo-header-h`) · pad-y `0` · items centered |
| Dark | solid `#383A46` | same |

**Full anatomy (L→R)**

| Zone | Contents |
|------|----------|
| Left | `.hamb` → `.user-title-wrap` = `.user-title-icon` + `h1` (+ lead `<p>` on Deposit/Withdraw Approval only) |
| Right `.report-actions` | `.bo-theme-btn` → `[data-bo-profile]` (optional `.bo-header-counters` + `.bo-account-link`) |

**Right cluster order (L→R):** Theme toggle → **Members / Deposit / Withdraw** counters (non-`MAIN` only, injected by `auth.js`) → 1px divider (`[data-bo-profile]::before`) → User Name / profile.

Do not invent alternate topbar account pills, bordered username chips, navy theme icons, or rainbow counter icons.

#### Page title — `.user-title-wrap`

| Spec | Light | Dark / notes |
|------|-------|--------------|
| Icon `.user-title-icon` | amber wash / border · glyph `--bo-cyan` (`#D97706`) · ~`36×36` · radius `10–12px` | charcoal wash · amber glyph |
| Title `h1` | `22px/900` · `#18191C` (Approval pages may use text token; hide overflow with ellipsis) | `#F5F5F4` |
| Lead `p` | Approval only · `12px/500` · `#57534E` / `--bo-muted` · one line | muted · **hide ≤768** |
| Admin / most listings | **no** lead `<p>` | title + icon only |

#### Theme toggle — `.bo-theme-btn`

| Spec | Light | Dark |
|------|-------|------|
| Size | `36×36` (`flex: 0 0 36px`) | same |
| Radius | `8px` | same |
| Border | `1px solid rgba(24,25,28,.18)` | `1px solid rgba(245,158,11,.4)` |
| Background | `transparent` | `transparent` |
| Icon color | `#3F3F46` | `#F59E0B` |
| Icon size | `18px` (both sun/moon in same slot; `[hidden]` only fades) | same |
| Hover | bg `rgba(24,25,28,.05)` · border `rgba(24,25,28,.28)` · color `#18191C` | bg `rgba(245,158,11,.10)` · border `#F59E0B` · color `#FBBF24` |
| Focus | `outline: 2px solid #D97706; outline-offset: 2px` | same amber |

Storage / attribute: `localStorage.bo_theme` + `html[data-bo-theme="light|dark"]`.

#### Header counters — `.bo-header-counter` (ops chrome · Deposit Approval specimen)

Members / Deposit / Withdraw chips. Charcoal+amber family with **per-chip identity** — no purple / green / cool rainbow. Hidden for `roleType === MAIN`.

| Spec | Light | Dark |
|------|-------|------|
| Chip | `#FFFCF7` · border `#EADCC8` · height **`48px`** · radius **`10px`** · pad `5px 14px 5px 5px` · min-width `118px` · gap `10px` | well `#2A2C36` · border `white/16` |
| Icon tile | **`38×38`** · radius `8px` · glyph `18px` | same size |
| Icon · Members | wash `rgba(24,25,28,.08)` · glyph `#18191C` | wash `white/10` · glyph `#F5F5F4` |
| Icon · Deposit | wash `rgba(217,119,6,.18)` · glyph `#D97706` | wash `rgba(245,158,11,.20)` · glyph `#FBBF24` |
| Icon · Withdraw | wash `rgba(180,83,9,.14)` · glyph `#B45309` | wash `rgba(217,119,6,.18)` · glyph `#F59E0B` |
| Label `small` | `11px/800` uppercase · tracking `.06em` · Members `#44403C` · Deposit `#B45309` · Withdraw `#92400E` | Members `#D4D4D8` · Deposit `#FBBF24` · Withdraw `#F59E0B` |
| Value `b` | `18px/800` tabular · `#18191C` | `#F5F5F4` |
| Hover / focus | border `#D97706` · bg `#FFF8EB` · ring `0 0 0 3px rgba(217,119,6,.14)` | border `#F59E0B` · bg `#32343F` · amber ring |
| ≤1199 | icon-only square `46×46` (label/value collapse) | same |

Links: Members → `index.html` · Deposit → `member-deposit.html` · Withdraw → `member-withdraw.html`. Counts from operation-notification summary.

#### User Name / profile — `.bo-account-link`

**Structure:** text meta (`.bo-account-meta`) left of avatar (`.report-avatar`). No gear icon (`.bo-account-setting-icon` hidden). No bordered pill around the whole control.

| Spec | Light | Dark |
|------|-------|------|
| Wrapper | transparent · no border · no radius · no shadow · gap `12px` | same |
| Name `.bo-account-name` | `14px` / `700` / `#18191C` · max-width `160px` ellipsis | `#FFFFFF` |
| Role `.bo-account-role` | `11px` / `500` / `#71717A` · mono stack | `#F59E0B` |
| Avatar size | `40×40` · radius `12px` | same |
| Avatar fill | `#D97706` · icon `#FFFFFF` | `#F59E0B` · icon `#2A2C36` + amber glow shadow |
| Avatar hover | `#B45309` | `#FBBF24` |
| Divider before profile host | `1px × 28px` `rgba(24,25,28,.12)` on `[data-bo-profile]::before` | `rgba(255,255,255,.14)` |

### Buttons (locked — Admin Detail reference)

**Shared metrics (page actions / chrome / modal footers)**

| Spec | Value |
|------|-------|
| Base height | **`36px`** (listing filters / page chrome). Modal actions `40px`. Danger Delete Role may stay `42px` until that toolbar is migrated |
| Modal action height | `40px` |
| Padding | `0 12–14px` (listing filter buttons `0 12px` · modal `0 16px`) |
| Radius | `8px` |
| Font | `12.5–13px` / weight `700–800` |
| Gap (icon+label) | `6–8px` |
| Motion | hover `translateY(-1px)` · active `translateY(1px)` · ease ~`0.14s` — **except** flush inline filter strips (Wallet Ledger): no lift |
| Focus | `outline: 2px solid` amber (`--bo-cyan` / `#D97706`) · offset `2px` |

**Classes:** Primary = `.mad-btn-primary` / `.mad-btn-navy` / `.bo-ui-button-primary` (alias; all amber). Ghost / Export = `.mad-btn-ghost` / `#madExportBtn`. Never restore navy fill as primary.

**The three chrome roles are unified (2026-09-28).** Back control, footer secondary (Close / Cancel) and
footer primary (Save / Create / Submit) now render one recipe each, measured on 49 pages × both themes:

| Role | Geometry | Paint |
|------|----------|-------|
| Back control (page chrome, section head) | **`36px`** · radius `8` · pad `0 14px` · `12.5px/700` | the Ghost column below |
| Footer secondary (Close / Cancel) | **each bar's own measured rung** (see the footer table in Patterns) · radius `8` · `12.5–13px/700` | the Ghost column below |
| Footer primary (Save / Create / Submit) | same rung as the footer secondary | the Primary CTA columns below |

Do **not** narrow a footer's shared Ghost rule to move its Back control: on Create Role `.mrc-btn-ghost`
paints Back *and* Cancel, and its `40px` is what keeps `.mrc-sticky-footer` at its pinned `69px`
(`14×2 + 40 + 1`). State the back control separately, per family, naming the class or id it carries.
Same reason the Back control is `36px` while its family's bar buttons are not.

Measured after the pass: Back **42/44** controls on one paint, footer primary **66/70**, footer secondary
**66/84** — the remainder sit in quiet quick-action strips whose chrome is deliberately removed, or on
`backup_provider.html`, which links no stylesheet at all.

#### Primary CTA

| State | Light | Dark |
|-------|-------|------|
| Default fill | `linear-gradient(180deg, #FBBF24 0%, #F59E0B 42%, #EA8608 100%)` | `linear-gradient(180deg, #FBBF24 0%, #F59E0B 45%, #D97706 100%)` |
| Border | `#E8901A` | `#F59E0B` |
| Label | `#FFFFFF` | `#2A2C36` |
| Shadow | **none** (no drop / lift / inset) | **none** |
| Hover fill | reverse stops on same axis `linear-gradient(180deg, #EA8608 → #F59E0B → #FBBF24)` | reverse `linear-gradient(180deg, #D97706 → #F59E0B → #FBBF24)` |
| Hover border | `#F59E0B` | `#FBBF24` |
| Active fill | `linear-gradient(180deg, #F59E0B → #EA8608)` | `linear-gradient(180deg, #F59E0B → #D97706)` |

Hover motion is **gradient reverse only** (stop order flipped on `180deg`). Do **not** transition `background-image` (browsers skip the flip). Do **not** add amber glow, inset highlight, `translateY` lift, or any `box-shadow` on Primary.

#### Ghost / Export

| State | Light | Dark |
|-------|-------|------|
| Default fill | Form Ghost: `#FFFCF7`→`#F5EBDC`→`#EDE4D4` · Listing may use `#FFF8EB`→`#F3E8D6` | `#4A4C58`→`#383A46`→`#2C2E38` |
| Border | `#DCC9A8` (form) / `#EADCC8` (listing) | `rgba(255,255,255,.12–.14)` |
| Label | `#18191C` | `#F5F5F4` |
| Hover (Create Role Back/Cancel — locked) | reverse cream `#FFF8EB`→`#F3E8D6` · border `#E0D0B8` · lift `-1px` · **no** amber fill wash | reverse charcoal · lift · **no** amber border wash |
| Hover (listing Export) | reverse gradient · slightly stronger border | reverse · border `rgba(255,255,255,.18)` |
| Active | press `+1px` · deeper cream `#FFF1DC`→`#EADCC8` | press into `#383A46`→`#2C2E38` |

#### Secondary / default `.mad-btn` (non-primary, non-ghost)

| Spec | Light / Dark |
|------|----------------|
| Fill | `--bo-surface` |
| Border | `--bo-border` |
| Label | `--bo-text-secondary` |
| Hover | amber tint `--bo-cyan-tint` · border `rgba(217,119,6,.45)` · text `--bo-text` |

#### Danger (bulk delete)

| Spec | Light | Dark |
|------|-------|------|
| Fill / border / text | `#FEF3F2` / `rgba(239,51,64,.35)` / `#B42318` | danger wash / `rgba(239,51,64,.4)` / `#FF8A90` |

### Forms

**Owner (2026-09-28): `assets/css/bo-field-standard.css`.** One sheet states the field theme for
both themes, is loaded LAST on every page, and carries `!important` on every declaration. It
sets only theme-owned properties — fill, border colour, ink, placeholder, focus border, focus
ring — and never geometry: the size tiers below stand.

| Token | Light | Dark |
|-------|-------|------|
| fill | `#FFF8EB` | `#2A2C36` |
| border | `#DCC9A8` | `rgba(255,255,255,.12)` |
| ink | `#18191C` | `#F5F5F4` |
| placeholder | `#78716C` | `#A1A1AA` |
| focus border | `#D97706` | `#F59E0B` |
| focus ring | `0 0 0 3px rgba(217,119,6,.14)` | `0 0 0 3px rgba(245,158,11,.18)` |

- Inputs: dark soft charcoal `#2A2C36` on dark; light surface `#FFF8EB` on light — **never**
  `#FFFFFF` chrome
- Focus: amber border plus the ring above (never cyan, never a grey `#78716C` border). The **ring
  alpha differs per theme** — `.14` light, `.18` dark. A single `.12`/`.16` value for both is the
  drift this standard exists to remove
- `!important` is load-bearing, not decoration: the legacy rules this sheet competes with all
  declare it, and an important declaration beats a normal one at any specificity. The sheet
  loads, parses and matches without it, and changes nothing
- **Create/Edit hierarchy:** never one flat cream — use the layer ladder below so Save CTA and sections read clearly

#### Create / Edit Admin Account — light form hierarchy

Reference: Charcoal block + `.mac-*` / `.mae-*` in `main-admin-detail-executive.css` (`main-admin-create.html`, `main-admin-edit.html`).

**Layer ladder (required):**

| Layer | Hex | Notes |
|-------|-----|-------|
| Canvas | continuum `#FFE8CC`→`#FFF8EB` | Atmosphere only |
| Section card | `#FFFCF7` · border `#DCC9A8` · warm shadow · **3px amber left rail** | Primary frame |
| Input well | `#F5EBDC` · border `#DCC9A8` · placeholder `#78716C` | Editable inset |
| Nested well | `#F0E4D0` | Privileges / policy / security |
| Chip / status active | `#FFFCF7` | Lifted controls |
| Locked field | `#EDE4D4` · text `#57534E` | Readonly username |
| Ghost buttons | `#FFFCF7`→`#F5EBDC`→`#EDE4D4` · border `#DCC9A8` | Secondary |
| Primary CTA | amber gradient | Focal action |

| Element | Light | Dark |
|---------|-------|------|
| Section (`.mac-section`) | `#FFFCF7` · border `#DCC9A8` · warm shadow · amber rail | `--bo-surface` |
| Inputs | `#F5EBDC` · border `#DCC9A8` · placeholder `#78716C` | `#2A2C36` |
| Privilege / policy / security nested | `#F0E4D0` | faint wash |
| Locked username | `#EDE4D4` · text `#57534E` | charcoal wash |
| Status seg track | `#EDE4D4` · active pill `#FFFCF7` | charcoal |
| Sticky footer | `#FFFCF7` · border `#DCC9A8` · stronger warm shadow | translucent charcoal |
| Section head | hairline `#EADCC8` + amber icon tile · title `#18191C` | charcoal |
| Help text | `#57534E` | muted |

Do **not** flatten all layers to one cream, or leave cool `#fff` / `#FBFCFE` / `#F1F5F9` wells.

#### Create Role (`main-admin-role-create.html` / `main-merchant-role-create.html`)

Reference: `main-admin-role-create.css` (must beat `reports.css` `.report-content input { background-color:#fff!important }`).

| Element | Light | Dark |
|---------|-------|------|
| Role Name input (`.mrc-field .form-control`) | surface `#FFF8EB` · border `#EADCC8` · `14px/600` · amber focus ring | `#2A2C36` · amber focus |
| Search (`.mrc-search` / `#mrcFilter`) | surface `#FFF8EB` (= Role Name) · icon `#57534E` · placeholder `#78716C` | charcoal `#2A2C36` |
| Chips Select All / Clear | surface `#FFF8EB` · border `#EADCC8` · `13px/700` · height `34px` | charcoal well |
| Toggle All (`.mrc-chip-btn.is-accent`) | amber wash `rgba(217,119,6,.12)` · never cool cyan | `rgba(245,158,11,.16)` |
| Back / Cancel (`.mrc-btn-ghost`) | 3D Ghost `#FFFCF7`→`#F5EBDC`→`#EDE4D4` · height `40px` · `13px/700` · shared hover reverse cream | charcoal 3D + reverse hover |
| Save Role (`.mrc-btn-primary`) | 3D Primary amber · height `40px` · `13px/800` · white label (dark: text `#2A2C36`) | amber 3D |
| Role Information card (`.mrc-card`) | surface `#FFF8EB` · radius `8px` | `--bo-surface` |
| Page title | `28px/800` | same weight |
| Field label | `11.5px/800` uppercase · muted | muted |

#### Role select dropdown (Roles list — `.rounded-select-*`)

Native select hidden; enhancer builds custom control (`reports.js` → `.rounded-select-btn` + `.bi-chevron-down`). Reference: VIP EXP Log All Sources + `menu-permission-executive.css`. Listing filters use this chrome at **`36px`**.

| Part | Light | Dark |
|------|-------|------|
| Trigger | `#FFF8EB` · border `#EADCC8` · listing **`36px`** (Roles form may stay `40px`) · `12px/700` · `8px` radius · padding **`0 28px 0 12px`** (room for chevron) | `#2A2C36` · same padding |
| **Chevron (locked)** | `bi-chevron-down` · **`position:absolute; right:12px; top:50%; transform:translateY(-50%)`** · `font-size:12px` · color `#57534E` · `pointer-events:none` | same pin · color `#D4D4D8` |
| Label span | left-aligned · `flex:1` · ellipsis · **never** share row gap with chevron (chevron is not `space-between` sibling layout) | same |
| Open / focus | border `#D97706` · `0 0 0 3px rgba(217,119,6,.14)` | amber border + `rgba(245,158,11,.18)` ring |
| Menu | surface · border · `8px` · soft shadow · pad `6px` | surface · deep shadow |
| Option hover | `--bo-cyan-tint` · text `--bo-cyan-deep` | `rgba(245,158,11,.14)` |
| Option selected (dark) | — | fill `#F59E0B` · text `#2A2C36` |
| Scrollbar thumb | `#98A2B3` / hover `#667085` · `4px` pill · no arrows (menu only — Bulk/Wallet panels use chocolate **`6px`**) | `#F59E0B` / `#D97706` |
| Field label | `11px/800` uppercase · tracking `.08em` | same |

**Do not** leave the chevron trailing the label (flex gap / `space-between` with huge right padding from `bo-ui-standard` `padding-right:32px`). Pin it to the trigger’s right inset **`12px`**. Footer Show N (narrow `72px`) may use **`right:10px`**.

#### Date range picker (`.bo-range-*` / `.ref-range-*` — locked)

Two-pane popover: left presets · right calendar. Reference: Transaction / Merchant Profit listing. Kill `reports.css` cool gray/blue (`#f8fafc` / `#eef2ff` / `#5061f5`).

| Part | Light | Dark |
|------|-------|------|
| Panel | bg `#FFF8EB` · border `#EADCC8` · radius **`12px`** · warm shadow `0 18px 40px rgba(92,74,48,.16)` | bg `#383A46` · border white/14 · deep shadow |
| Preset rail | **same** cream as panel (not darker sand) · hairline `#EADCC8` | same surface · hairline white/10 |
| Preset idle | text `#18191C` · `13px/700` · transparent | `#F5F5F4` |
| Preset hover | wash `rgba(217,119,6,.10)` · text `#B45309` | wash `rgba(245,158,11,.14)` · `#FBBF24` |
| **Preset active** | wash `#FFF1DC` · text `#B45309` · **never** solid amber + white | wash `rgba(245,158,11,.16)` · `#FBBF24` · never solid fill |
| Head (month/year/arrows) | **ghost** — transparent · no border · charcoal `#18191C` / `700` | transparent · `#F5F5F4` |
| Head hover | wash `rgba(217,119,6,.10)` · `#B45309` · no focus ring | wash · `#FBBF24` |
| Week labels | `#78716C` · `11px/700` | `#A8A29E` |
| Day idle | `#18191C` · `700` · radius `8px` | `#F5F5F4` |
| Day muted (other month) | `#C4B5A0` | `#78716C` |
| Day hover | same as preset hover | same as preset hover |
| Day start / end | solid `#D97706` · text `#fff` (calendar selection) | solid `#F59E0B` · text `#2A2C36` |
| Day in-range | `rgba(217,119,6,.12)` · text `#B45309` | `rgba(245,158,11,.18)` · `#FBBF24` |
| Month / year grid active | same as **preset active** (wash, not solid) | same |

**Do not** paint preset `.active` like Primary CTA. Solid amber is reserved for calendar day endpoints (and Role select dark selected option).

#### Roles toolbar / footer extras

| Element | Spec |
|---------|------|
| Filter `.mp-search` | height `42px` · surface `#FFF8EB` · icon `#57534E` · placeholder `#78716C` |
| Tool chips `.mp-tool-btn` | `12px/700` · height `32px` · surface; `.is-accent` = amber wash |
| Add Role | Primary CTA 3D (Buttons spec) · `12.5px/700` |
| Delete Role | danger wash · border `rgba(239,51,64,.28)` · text `#B42318` · height `42px` |
| Save / Cancel footer | Primary + Ghost 3D · `12.5px` · height `38–40px` |
| Assigned pill | success wash · green dot |

### Data tables (Admin Management — locked contrast)

Reference: `main-admin-detail.html` / `main-admin-security.html` + Charcoal block in `main-admin-detail-executive.css` (`.mad-panel` / `.mad-table` / `.mad-table-wrap`).

**Rule:** Scope light cream borders under `html:not([data-bo-theme="dark"])` so they never leak into dark. Dark must set full `border` / `border-bottom` (not only `border-*-color`), or cream edges “跑掉.”

**Fixed frame (locked — Admin Detail):** Listing tables use a viewport-locked panel, not a page that grows with rows.

| Spec | Value |
|------|-------|
| Shell | `.report-main` = `100dvh` flex column · `overflow:hidden` |
| Panel | `.mad-panel` / Transaction `.table-card` = `flex:1` · `min-height:0` · `overflow:hidden` · radius **`8px`** · single outer border |
| Scroll | `.mad-table-wrap` / `.table-wrap` = `flex:1` · `overflow-y:auto` · **no** nested border/radius |
| Table | `table-layout:fixed` · `width:100%` · `border-collapse:collapse` |
| Header | sticky top inside wrap · surface bg · bottom hairline |
| Footer | pager / total bar `flex:0` · top hairline · pins to panel bottom (`margin-top:auto`) |

| Spec | Light | Dark |
|------|-------|------|
| Panel / wrap bg | `#FFF8EB` | `#383A46` |
| Panel outer border | `#EADCC8` | `1px solid rgba(255,255,255,.14)` |
| Header text (`.mad-table th`) | `#3F3F46` / weight `700` | `#E7E5E4` / weight `700` |
| Header bottom border | `#EADCC8` | `1px solid rgba(255,255,255,.14)` |
| Body cell text (`.mad-table td`) | `#374151` | `#F5F5F4` |
| Row divider | `#F0E6D8` | `1px solid rgba(255,255,255,.12)` |
| Row hover | `#FFF1DC` | `rgba(255,255,255,.05)` |
| Muted / time / email / detail | `#57534E` (never `#9CA3AF` / `#A1A1AA` on cream) | `#D4D4D8` (never `#71717A` / `#A1A1AA` on charcoal) |
| Money zero | `#71717A` | `#A1A1AA` |
| Username emphasis | `#18191C` | `#F5F5F4` |
| Action icons | `#57534E` · hover amber | `#D4D4D8` · hover amber |
| Filter bar / footer edge | cream border `#EADCC8` | `rgba(255,255,255,.14)` |
| Footer bar (`.mad-footer`) | bg surface `#FFF8EB` · top border cream | bg `#383A46` · top border white/14 |
| Footer info text | `#57534E` · `12.5px/600` | `#D4D4D8` / muted |
| Search / form placeholder | `#78716C` on cream wells | `#A1A1AA` |
| Modal close (`.modal-clean-close`) | `#F5EBDC` · border `#EADCC8` · icon `#57534E` | charcoal well · light icon |

#### Table footer pager (locked light/dark)

**Specimen:** VIP EXP Log (`#vipLogPagination` / `.pagination-clean`) — same chrome as `.mad-pager .smart-page`. Metrics: min-width `40px` · height `36px` · radius `8px` · gap `8px` · `13px/700`. First/Last icon buttons: `36×36` · padding `0`.

**Required anatomy (left → right) — every listing footer uses this:**

| Slot | Control | Icon / content | Behavior |
|------|---------|----------------|----------|
| 1 | First | `bi-chevron-bar-left` (bar+‹) | `data-*-page="1"` · disabled on page 1 |
| 2 | Previous | `‹` or `bi-chevron-left` | current − 1 · disabled on page 1 |
| 3 | Page window | numbered buttons | always include **1** and **last**; window ±2 around current; insert `…` (`span.smart-page-ellipsis`) when gaps > 1 |
| 4 | Next | `›` or `bi-chevron-right` | current + 1 · disabled on last |
| 5 | Last | `bi-chevron-bar-right` (›+bar) | jump to `totalPages` · disabled on last |

Do **not** ship prev/next-only pagers on new or touched listing pages. Match VIP EXP Log `renderPages` (First · Prev · window+ellipsis · Next · Last). When touching Wallet Ledger / Member Wallet `pageButtons`, add Prev/Next to reach the same anatomy.

| State | Light | Dark |
|-------|-------|------|
| Default (inactive / nav) | bg `#F3F4F6` · text `#9CA3AF` · no border · **no shadow** | bg `#383A46` · border `rgba(255,255,255,.12)` · text `#A1A1AA` · **no shadow** |
| Hover (not active) | bg `#E5E7EB` · text `#374151` | bg `#444654` · border white/18 · text `#E7E5E4` |
| Active (current page) | amber gradient `180deg #FBBF24 → #F59E0B → #D97706` · border `#D97706` · text `#fff` · **no shadow** (no lift / inset) | same gradient · border `#F59E0B` · text `#2A2C36` · **no shadow / no glow** |
| Disabled | opacity ~`.42` · `cursor:not-allowed` | bg `#2A2C36` · border white/06 · text `#52525B` |
| Ellipsis | text `#9CA3AF` · not a button | muted |

Light inactive stays cool slate (not cream) so the amber active page is the only warm signal. Dark inactive is charcoal — never cream. Do not use navy/cyan for active. Active page follows Primary CTA: gradient only, **never** drop/inset shadow.

Do **not** use dark header `#71717A` or row borders `rgba(255,255,255,.06–.08)` — fails contrast on `#383A46`.

#### Transaction listing table — light + dark (locked)

Reference: Deposit / Withdraw (`body.bo-wallet-tx`) + `bo-wallet-transaction-amber.css` tokens `--bo-table-*`. **Both themes locked.** Same rhythm: **odd / even zebra** (never flat slab). Light: peach-cream family — **never pure white**. Dark: charcoal zebra + **deep thead** — never all `#383A46`, never lifted head `#40424E`.

| Token | Light | Dark | Role |
|-------|-------|------|------|
| `--bo-table-paper` | `#FFF8EB` | `#383A46` | Panel / wrap / table canvas |
| `--bo-table-head` | `#FFE8CC` | `#1F2128` | Sticky thead — dark is **deeper** than body (not a lift) |
| `--bo-table-row` | `#FFF8EB` | `#3A3C48` | Odd rows |
| `--bo-table-row-alt` | `#FFF1DC` | `#434653` | Even rows (locked) |
| `--bo-table-hover` | `#FFE8CC` | `#444654` | Row hover |
| `--bo-table-line` | `#EADCC8` | `rgba(255,255,255,.12)` | Hairlines · cell borders |
| `--bo-table-chip` | `#F5EBDC` | `#2A2C36` | Action button wells |

| Spec | Light | Dark |
|------|-------|------|
| Thead | bg `#FFE8CC` · text `#6b360c` · `11px` / **`bold` (700)** · uppercase · tracking `.04em` · sticky | bg `#1F2128` · text `#E7E5E4` · same metrics |
| Thead corners | **`border-radius: 0`** on first/last `th` (kill `reports.css` `11px` top radii) | same |
| Body cell | text `#18191C` · `13px` / **`bold` (700)** — pin `font-weight: bold` (never UA `bolder`) | text `#F5F5F4` · same weight |
| Cell padding | `10px 12px` · first/last column `16px` inset | same |
| Vertical rules | soft `rgba(107,54,12,.06–.08)` · last column no right border | `rgba(255,255,255,.06)` |
| Action `.bo-tx-action-btn` | well `#F5EBDC` · border `#EADCC8` · approve `#067647` · reject `#B42318` | well `#2A2C36` · border white/14 · approve `#6EE7B7` · reject `#F87171` |
| Filter strip inside `.table-card` | bg row cream · bottom hairline `#EADCC8` | bg row charcoal · white/12 hairline |
| Footer pager strip | bg `#FFF8EB` · top hairline `#EADCC8` | bg `#383A46` · white/12 |
| Do **not** | muddy yellow parchment · pure white zebra · Filtered Total Amount bar | flat single-tone rows · lifted thead `#40424E` · cool gray/blue zebra |

#### Status pills (Transaction listing)

Bare `.status-pill` = PENDING · `.active` = APPROVED · `.off` = REJECTED.

| State | Light | Dark |
|-------|-------|------|
| PENDING | bg `#FFEDD5` · text `#EA580C` · border orange/35 | bg amber/20 · text `#FBBF24` · border amber/35 |
| APPROVED `.active` | bg `#DCFCE7` · text `#166534` | bg success/18 · text `#6EE7B7` |
| REJECTED `.off` | bg `#FEE2E2` · text `#B91C1C` | bg danger/18 · text `#F87171` |

### Date / time tips

| Spec | Light | Dark |
|------|-------|------|
| Chart tip `.trend-tip` | bg `#FFF8EB` · text `#6b360c` · border amber/28 · radius **`8px`** | bg `#40424E` · text `#F5F5F4` · border amber/35 · **`8px`** |
| Icon / float tip `[data-tip]` / `.mad-float-tip` / Last Login | cream `#FFF8EB` · text `#6b360c` · border `rgba(217,119,6,.28)` · shadow `0 8px 22px rgba(60,48,32,.16)` · pad `7px 14px` · **`999px` pill** · beak arrow | `#40424E` · `#F5F5F4` · border `rgba(245,158,11,.35)` · shadow `0 12px 28px rgba(0,0,0,.35)` · **`999px`** |
| Wallet Ledger Created/Posted `.wl-time-tip` | Cell date `DD/MM/YYYY` · tip time `HH:MM:SS` · cream pill · **no arrow** · `position:fixed` | same |
| Never | navy `#0F1F33` tip · native `title` inside overflow-hidden tables | navy tip |

### Admin listing chrome (filters / tabs / row chrome — locked light/dark)

Reference: Charcoal block `main-admin-detail-executive.css` (`data-access-page="main_admin_detail|main_admin_security"`). Merchant twin: `main-merchant-detail-executive.css`.

#### Tabs — `.mad-tab`

| State | Light | Dark |
|-------|-------|------|
| Default | muted text | muted / secondary |
| Active / current | text `#18191C` · **amber underline** `#D97706` | text `#F4F4F5` · underline `#F59E0B` (amber bar only — label stays neutral, not `#FBBF24`) |
| Hover | slightly stronger text | slightly stronger text |

#### Filter bar — `.mad-filter-bar` / `.mad-search` / filter selects

| Part | Light | Dark |
|------|-------|------|
| Bar | surface `#FFF8EB` · bottom border `#EADCC8` | surface `#383A46` · bottom `rgba(255,255,255,.14)` |
| Search frame `.mad-search` / `.category-search-control` / `.game-search-control` | **shell** owns fill + border (`#FFF8EB` / `#EADCC8`, `36×8`) · icon static in flex · **input bare** (no bg, no border, no own focus ring) · placeholder `#78716C` · focus-within on shell | shell `#2A2C36` · border `rgba(255,255,255,.12)` · icon muted · input bare · placeholder `#A1A1AA` |
| Filter select / rounded trigger | cream surface · amber focus ring · height **`36px`** (listing) | `#2A2C36` · amber focus |
| Reset / secondary action | height **`36px`** · Ghost/surface (listing) | charcoal Ghost |
| Bulk delete | `#FEF3F2` / border danger/35 / text `#B42318` | danger wash / `#FF8A90` |

Transaction listing / Wallet Ledger: use **Listing filter controls (locked)** — not the old `42px` / `11px` `bo-ui-standard` tokens.

#### Status filter pills — `.mad-pill` / `.bo-tx-tab` + `.bo-seg-thumb` (locked)

Reference specimen: Active / Suspend / All on Bank Deposit Usage (and Admin Detail / Deposit–Withdraw family). **Do not** invent a different chip style.

**Anatomy**

| Part | Spec |
|------|------|
| Track | `.mad-pills.bo-seg` or `.bo-tx-tabs.bo-seg` · transparent · `inline-flex` · gap `6px` · `position:relative` · `overflow:visible` |
| Thumb | `.bo-seg-thumb` (from `bo-seg-bounce`) draws the **only** selected frame — pills themselves stay transparent when `.is-active` |
| Order (status) | **Active → Suspend → All** |
| Order (Deposit family) | Deposit → Withdraw → All (same chrome; green/red dots on first two) |
| Counts | `.bo-tx-tab-count` / `.mad-pill-count` · tabular nums · wrapped as `(n)` via `::before`/`::after` |
| Motion | `bo-seg-bounce.css` + `BO_SEG_BOUNCE.mount(...)` — without the thumb script the selected frame disappears |

**Selected chip (thumb)**

| Spec | Light | Dark |
|------|-------|------|
| Fill | lift cream `linear-gradient(180deg, #FFFCF7 0%, #FFF8EB 55%, #F3E8D6 100%)` — **lighter than** toolbar `#FFF8EB` so the chip reads | charcoal 3D `#383A46`→`#2A2C36` |
| Border | `1px solid #E0D0B8` | `1px solid rgba(255,255,255,.14)` |
| Shadow | `0 1px 2px rgba(24,25,28,.08), 0 2px 8px rgba(92,74,48,.10)` | soft dark lift |
| Radius | **`999px`** (capsule — matches specimen) | same |
| Height | `36px` (full track height) | same |

**Tab label states**

| State | Light | Dark |
|-------|-------|------|
| Idle text | muted `#71717A` · weight `700` · `12.5px` · height `36px` · pad `0 14px` · radius `999px` · **no fill** | muted `#A1A1AA` |
| Selected text | ink `#18191C` · weight `700` · fill **transparent** (thumb shows through) | `#F5F5F4` |
| Hover (not selected) | soft wash `rgba(24,25,28,.04)` · text slightly stronger | soft white/5 wash |

**Status dots (`::before` — 6×6 circle)**

| Tab | Idle (not selected) | Selected (`.is-active`) |
|-----|---------------------|-------------------------|
| **Active** | muted slate `#B8C0CC` | green `#059669` (dark: `#34D399`) |
| **Suspend** | muted lavender-grey `#C4C0D0` | red `#DC2626` (dark: `#F87171`) |
| **All** | **no dot** | **no dot** |

Deposit / Withdraw reuse the same recipe: Deposit = green when selected · Withdraw = red when selected · All = no dot.

**Do not**

- Paint selected fill on the button itself (breaks bounce thumb)
- Put a red/green dot on idle Suspend/Active (idle stays muted grey)
- Add a dot to All
- Use cool blue / pure white chips
- Ship tabs without `bo-seg-bounce` when the track has class `bo-seg`

#### Row chrome — avatar / status / role / money

| Part | Light | Dark |
|------|-------|------|
| Admin `.mad-avatar` | cool indigo tile `#EEF2FF`/`#3730A3` · **self** amber `#FEF3C7`/`#B45309` | charcoal `#383A46`/`#A1A1AA` · self amber tint |
| Merchant `.mad-avatar` | **neutral** `#F5EBDC`/`#6b360c` · suspended red only | `#2A2C36`/`#E7E5E4` · suspended red wash |
| Status active (`.mad-status.is-active` · `.mad-status-chip.is-active` · `.mas-status.is-success` · `.mpv-status.is-active`) | soft fluorescent mint `#EAF7F0` / `#1A8A5C` · dot `#3CB87A` · hover `#D8F0E4` | green wash / bright green |
| Status suspended | `#FEE2E2` / `#B91C1C` | red wash / `#FCA5A5` |
| Role Brand Owner (`.mad-role.is-super` / `.is-partner` / `.is-merchant`) | soft fluorescent lilac `#F0ECFA` / `#6B5B95` | purple wash / `#C4B5FD` |
| Role pills (other Admin) | support/tech/regional blue `#DBEAFE`/`#1D4ED8` · risk red `#FEE2E2`/`#B91C1C` · default grey `#F3F4F6`/`#4B5563` | semantic dark washes |
| Money + | `#B45309` | `#F59E0B` |
| Money 0 | `#71717A` | `#A1A1AA` |
| `.mad-you` self badge | `#FEF3C7` / `#B45309` | amber wash / `#F59E0B` |

**Soft fluorescent (locked 2026-09-28, Merchant + Provider lists):** luminous pastel wash + calm mid ink — not neon mint `#D1FAE5`/`#10B981` (too glare on cream) and not dusty `#E6E2F0`/`#1B5C45` (too dark). Sources: `main-merchant-detail-executive.css`, `main-provider-detail-executive.css` (`.mpv-status`), `main-provider-family-executive.css` (`.mad-status`).

### Modals (locked light/dark)

| Part | Light | Dark |
|------|-------|------|
| Scrim | `rgba(15,23,42,.55)` (neutral backdrop — both modes) | same |
| Panel `.mad-modal-panel` / `.modal-clean-panel` | cream / surface · warm border | `#383A46` · `rgba(255,255,255,.10)` |
| z-index | `30000` (above sidebar) | same |
| Close `.modal-clean-close` | well `#F5EBDC` · border `#EADCC8` · icon `#57534E` | charcoal well · light icon |
| Fields | control well `#F5EBDC` · placeholder `#78716C` · amber focus | `#2A2C36` · `#A1A1AA` · amber focus |
| Footer actions | Ghost + Primary 3D (Buttons spec) · height `40px` | charcoal Ghost + amber Primary (dark text `#2A2C36`) |
| Adjust-credit summary well | nested cream | `#2A2C36` |

Mount modals under `body`, not inside `main`.

### Permission matrix (Roles & Permissions — locked)

Reference: `menu-permission.html` + `assets/css/menu-permission-executive.css` (also `main-merchant-roles`, `main-*-role-create`). Classes: `.mp-group` / `.mp-group-head` / `.mp-group-body` / `.mp-menu-card`.

**Principle**

| Mode | Panel surfaces | Amber role |
|------|----------------|------------|
| Light | Cream / amber **wash** on open group + selected cards | Borders, icons, accents, CTA |
| Dark | Cool **charcoal** only — no full-panel amber/brown wash | Borders, icons, counts, checked/current tint only |

Never paint dark matrix groups with cream gradients or muddy amber fills; that reads brown and muddy.

#### Control card / toolbar — `.mp-control-card` / `.mp-toolbar`

| Part | Light | Dark |
|------|-------|------|
| Control card | surface `#FFF8EB` · border `#EADCC8` · radius `8px` · pad `18px` | `--bo-surface` · white/10 border |
| Role label | `11px/800` uppercase · `#18191C` | light text |
| Role select | see Role select dropdown | see Role select |
| Delete Role | danger wash · border `rgba(239,51,64,.28)` · text `#B42318` · h `42px` | danger wash · `#FF8A90` |
| Scope track `.mp-scope` | cream well · border `#EADCC8` | `rgba(255,255,255,.06)` |
| Scope btn active | amber wash + amber icon | amber tint + `#F59E0B` icon |
| Tool chips `.mp-tool-btn` | surface · h `32px` · `12px/700` | charcoal · muted |
| Tool `.is-accent` | amber wash | amber wash |
| Add Role | Primary CTA 3D · `12.5px/700` | Primary dark (text `#2A2C36`) |
| Filter `.mp-search` | surface `#FFF8EB` · h `42px` · icon `#57534E` · placeholder `#78716C` | `#2A2C36` · `#A1A1AA` |

#### Open group — `.mp-group.is-open`

| Spec | Light | Dark |
|------|-------|------|
| Group bg | `#FFFCF7` | `#383A46` |
| Border | `rgba(217,119,6,.45)` + soft amber ring | Default `rgba(255,255,255,.10)` · open `rgba(245,158,11,.28)` |
| Shadow | soft lift | none |
| Head | gradient `#FFF8EB` → `#FFF1DC` · bottom border `rgba(217,119,6,.22)` | `#40424E` · bottom `rgba(245,158,11,.22)` |
| Body | `#FFFCF7` | `#2C2E38` |
| Icon chip | surface + border `rgba(217,119,6,.35)` · icon `#D97706` | `#2A2C36` + border `rgba(245,158,11,.35)` · icon `#F59E0B` |
| Count pill | meta / amber | `rgba(245,158,11,.16)` / `#FBBF24` |

Collapsed group (dark): same cool `#383A46` surface, white/10 border — not cream.

#### Menu cards — `.mp-menu-card`

| State | Light | Dark |
|-------|-------|------|
| Default | `#FFF8EB` (surface) · border `#EADCC8` / `--bo-border` | `#2A2C36` · `rgba(255,255,255,.10)` |
| Hover | bg `#FFFCF7` · border `rgba(217,119,6,.5)` | bg `#32343E` · border `rgba(245,158,11,.35)` |
| Checked | bg `#FFF8EB` · border `rgba(217,119,6,.4)` | bg `rgba(245,158,11,.10)` · border `rgba(245,158,11,.40)` |
| Current | bg `#FFF1DC` · border `#D97706` + soft ring | bg `rgba(245,158,11,.14)` · border `#F59E0B` |
| Title | `--bo-navy` / charcoal | `#F5F5F4` |
| Meta (checked/current) | `#B45309` | `#A1A1AA` (muted; amber stays on border) |
| Accent checkbox | `accent-color: --bo-cyan` (amber) | same |
| Badges `.mp-menu-badge` | current amber fill/white · super cream/`#B45309` · neutral `#F4F4F5`/`#52525B` | prefer amber/charcoal variants — no cool blue |

#### Sticky footer — `.mp-footer` (list Save/Cancel)

| Part | Light | Dark |
|------|-------|------|
| Bar | surface · top border · soft up-shadow | charcoal surface · white/10 |
| Meta / role name | muted · strong `#18191C` | muted · strong `#F5F5F4` |
| Dirty hint | `--bo-cyan-deep` amber | amber bright |
| Cancel `.mp-btn-ghost` | cream 3D Ghost · h `38px` · reverse-cream hover | charcoal 3D Ghost |
| Save `.mp-btn-save` | amber 3D Primary · h `38px` · white label | amber 3D · text `#2A2C36` |

#### Create Role sticky footer / page chrome — `.mrc-*`

| Part | Light | Dark |
|------|-------|------|
| Page title | `28px/800` | same |
| Card `.mrc-card` | surface `#FFF8EB` · radius **`8px`** (tighter than listing `16px`) | `--bo-surface` |
| Card icon tile | amber tint / charcoal | amber tint |
| Sticky footer `.mrc-sticky-footer` | surface · top border · warm up-shadow | charcoal · white/10 |
| Footer icon | amber tint `40px` tile | amber wash |
| Status `.mrc-ready` | well `#F5EBDC` · `10.5px/800` uppercase | charcoal well |
| Status `.is-ready` | green `#ECFDF3` / `#027A48` | green wash |
| Back / Cancel / Save | Ghost + Primary 3D · h `40px` (Buttons + Create Role specs) | charcoal Ghost + amber Primary |

### Coverage checklist (every slot · Light | Dark)

Use this when reviewing a page. Each row must exist as a Light|Dark table (or token) above — if CSS ships it and this list has no home, update MD before shipping.

| Zone | Must document |
|------|----------------|
| Shell | continuum, sidebar fill, L1/L2, logout, flyout |
| Topbar | surface, theme btn, user name/avatar, hamb, page title icon |
| Tabs | default / active underline |
| Filters | bar, search, selects, reset, bulk delete, status pills |
| Cards / frames | listing panel, form section lift, Roles control card, Create Role card |
| Fields | listing surface inputs vs form wells, placeholders, focus rings, locked |
| Date range picker | cream panel, preset wash active, ghost head, day endpoints solid |
| Buttons | Primary, Ghost (+ shared hover), secondary, danger, pager, chips |
| Table | panel, header, cells, dividers, hover, money, status, avatar, footer, pager |
| Transaction table (locked L|D) | `--bo-table-*` zebra · deep dark head `#1F2128` · square thead · bold cells · PENDING orange · action wells · no Filtered Total |
| Modals | scrim, panel, close, fields, footer actions |
| KPI strip | tile, label, value, note, grid (Report family — see below) |
| KPI summary card (listing) | `.metric` + `.bo-summary-icon` — Member Wallet specimen (icon chip + type metrics) |
| Roles | control card, select, scope, toolbar, matrix group/card, badges, sticky footer |
| Create Role | title, cards, inputs, chips, ghost/primary, sticky footer status |

### KPI summary card — listing (`.quick-stats .metric`, Member Wallet specimen)

Icon readout tile for Transaction listing / `bo-wallet-tx` pages. Markup: `.metric` → `.bo-summary-icon` (injected) + `span` label + `strong` value + `.bo-summary-note`. **Not** the Report-family strip below (that strip has no icon chip).

| Part | Light | Dark |
|------|-------|------|
| Tile | `#FFF8EB` · `1px solid #EADCC8` · radius **`16px`** · pad **`16px 18px`** · min-h **`104px`** · `--bo-shadow` | `#383A46` · `1px solid rgba(255,255,255,.10)` · same pad/radius/min-h · shadow none |
| Grid | `52px minmax(0,1fr)` · **`column-gap: 24px`** · align center | same |
| Icon well | `52×52` · `50%` · bg `rgba(217,119,6,.12)` · border `rgba(217,119,6,.18)` · glyph `#D97706` / `22px` | bg `rgba(245,158,11,.16)` · border `rgba(245,158,11,.28)` · glyph `#FBBF24` |
| Label (`span`) | `12px` / `800` · `#57534E` · lh `1.2` | `#D4D4D8` |
| Value (`strong`) | `23px` / `900` · `#18191C` · lh `1.05` · margin `2px 0` | `#F5F5F4` |
| Note (`.bo-summary-note`) | `11px` / `600` · `#71717A` · lh `1.2` | `#A1A1AA` |
| Strip | `repeat(4,minmax(0,1fr))` · gap `14px` · **↔ table-card `16px`** · ≤1024 → 2 · ≤575 → 1 | same |

**Listing vertical rhythm:** `.report-content` flex `gap:16px` between KPI strip and `.table-card`. Filter strip pad `14px 16px` + bottom hairline, then thead. Do not use `12px` here.

**Never** `gap: unset` after `column-gap` (clears icon↔text space). Amber icons only — no green/purple rainbow wells. CSS: `reports.css` + `bo-wallet-transaction-amber.css`.

**User Management** (`.user-metric`): same locked specimen — radius `16px` · pad `16px 18px` · min-h `104px` · icon `52×52` amber wash · gap `24px` · label (`small`) `12px/800` · value `23px/900` · note (`span`) `11px/600`. CSS: `bo-charcoal-legacy.css`.

### Report family KPI strip (`.report-summary-grid`, `.mre-history-kpis`)

One recipe serves both strips — the brand / balance summary grid and the provider report's transaction-history KPIs. Tiles are `.report-summary-card` / `.settlement-summary-card`.

| Part | Light | Dark |
|------|-------|------|
| Tile | `#FFF8EB` · `1px solid #EADCC8` · radius `14px` · pad `16px` · `--bo-shadow` | `#383A46` · `1px solid rgba(255,255,255,.14)` |
| Label (`small`) | `11.5px/800` uppercase `.06em` · `#57534E` | `#D4D4D8` |
| Value (`strong`) | `22px/800` · `-.02em` · tabular-nums · `#18191C` | `#F5F5F4` |
| Note (`span`) | `11px/600` · `#57534E` | `#D4D4D8` |

Grid `repeat(5,minmax(0,1fr))`, gap `12px`. **No per-tile accent rail and no icon chip** — a read-out strip keeps amber on interaction, matching the merchant KPI chips (`.mpr-mini`, `.mas-kpi`). CSS: `main-report-charcoal-content.css`; the rest of the Report family is documented in `DESIGN.md` → Report family — migrated 2026-09-15.

### Theme dual-mode (locked)

Light mode uses the **light cream Charcoal+Amber** continuum. Dark mode uses the **cool charcoal** continuum. Never retint a light page to cold slate/light-gray as a “simplification,” and never leave cream wells / white tiles unpainted in dark.

| Mode | Surfaces | Controls | Table | Accent |
|------|----------|----------|-------|--------|
| Light | canvas `#FFF1DC` · cards `#FFF8EB` · wells `#F5EBDC` · borders `#EADCC8` | listing `36px`/`8px` · surface `#FFF8EB` | zebra `#FFF8EB`/`#FFF1DC` · thead `#FFE8CC` | amber `#D97706` |
| Dark | canvas `#2C2E38` · cards `#383A46` · wells `#2A2C36` · borders white/10–14 | same geometry · wells `#2A2C36` | zebra `#3A3C48`/`#434653` · thead `#1F2128` | amber `#F59E0B` |

**Joined controls must retint explicitly in dark** — password + eye (`#boPassword` / `.gpc-pass-toggle`), Window value + Minutes (`.gpc-window-group` / `.rounded-select-btn`), and any other cream `!important` light rule. General `.gpc-fields input` dark rules do **not** win against ID-scoped cream locks.

**Logo / image tiles in dark:** soft light gray `#E4E4E7` (not pure white, not cream) so colored logos stay readable — beat `reports.css` `.manage-thumb{background:#F5EBDC!important}` with equal-or-higher specificity + `!important`.

**Modal scrim:** `rgba(15,23,42,.55)` + `backdrop-filter:blur(2px)` (Create User specimen). Never amber `#D97706` wash on Bootstrap `.modal-backdrop` for opted-in pages.

### Provider Bet Report (`provider-bet-report.html`)

Report-family listing specimen for provider bet / event rows. Marker: `body.bo-report-family.provider-bet-report-page.bo-charcoal`.

| Part | Spec |
|------|------|
| Theme | Light cream · Dark charcoal — see Theme dual-mode above |
| Sheet | `bo-report-family.css` linked last · `report-table-split.js` · `report-table-sort.js` |
| Filters | Date range · Member ID · Provider Code · Game Code · Event Type select · **no** Search/Reset · text debounce ~350ms · select/date `change` |
| Event Type | `<select>`: All · SESSION · BET · SETTLE · CANCEL · REFUND |
| Interior chrome | **No** “Bet Report List” toolbar badge |
| Footer | Three-slot `.mad-footer`: Show N (`-`·`10`·`20`·`50`·`100`·`All`) · Showing x–y of z · First·Prev·pages·Next·Last |
| Autofit `-` | Canonical Show N autofit spec (floor · verifyAndLock · even-fill when gap &lt; one row) |
| JS | `assets/js/provider-bet-report.js` |

---

## Accessibility

- Maintain WCAG AA: amber on charcoal / dark text on cream
- Focus ring: amber outline with soft glow
- Respect `prefers-reduced-motion`

---

## Decisions

| Decision | Rationale | Date |
|----------|-----------|------|
| Charcoal + Amber locked as product system | User confirmed Admin trial as final light+dark identity | 2026-09-14 |
| Deep Navy Cyan fully retired | Replaced by Admin continuum system | 2026-09-14 |
| Canvas-only continuum | Avoid muddy wash under panels; sidebar stays opaque | 2026-09-14 |
| Light tip cream / dark tip charcoal | Replace navy tooltips | 2026-09-14 |
| Keep `--bo-cyan*` token names | Compatibility; values are amber | 2026-09-14 |
| Admin Detail = reference implementation | Roll out to remaining pages using this file | 2026-09-14 |
| Topbar theme btn + User Name + Primary/Ghost buttons locked | Prevent page-to-page drift; specs from Admin Detail CSS | 2026-09-14 |
| Action control radius `8px` (not 10px) | Match shipped Admin chrome | 2026-09-14 |
| Permission matrix: light cream wash / dark cool charcoal | User locked Roles & Permissions open-group look; dark avoids muddy amber panel | 2026-09-14 |
| Create Role Role Name + filter = surface `#FFF8EB` (not well `#F5EBDC`) | User: Create Role inputs still looked muddy vs card | 2026-09-15 |
| Create Role Ghost hover = reverse cream (shared Back/Cancel); no amber fill wash | User: Back vs Cancel hover must match; yellow wash felt wrong | 2026-09-15 |
| Role select dropdown (rounded-select) documented | Options/scrollbar/focus were shipped in CSS but missing from MD | 2026-09-15 |
| `--bo-control-well` light = `#F5EBDC` (not `#F0EFEA`) | Align token table with locked cream well | 2026-09-15 |
| Table footer pager light/dark states documented | CSS already split; MD only had footer edge/info before | 2026-09-15 |
| Full chrome inventory: tabs, filters, pills, row chrome, modals, Roles toolbar/footer, Create Role footer — all Light\|Dark | User: every slot/frame/button must be classified light vs dark in MD | 2026-09-15 |
| Transaction listing filters = surface `#FFF8EB` (not form well `#F5EBDC`); dark selected option = solid amber | Align `bo-wallet-tx` to renewed listing / Role select MD | 2026-09-15 |
| Light surfaces = cream `#FFF8EB` locked (no ivory / no pure white) | User confirmed Dashboard light main pane (topbar + canvas + cards) 2026-09-14 | 2026-09-14 |
| Dark table: stronger borders + lighter text | User: dark Admin table borders “跑掉”; headers/cells too close to charcoal bg | 2026-09-14 |
| L2 flyout active = cream chip + amber frame | User: Roles flat wash wrong; Admin Detail bordered chip correct — unify all pages | 2026-09-14 |
| Sidebar MD synced to `bo-charcoal-shell.css` | Documented shell fill/rail/brand/close/logout + L1 + inline vs flyout L2 active (`#FFF8EF`→`#FFE8CC` vs `#FFFBEB`→`#FEF3C7`); dark L1 hover `.04` | 2026-09-17 |
| Merchant Detail migrated to Charcoal + Amber (new `assets/css/main-merchant-detail-executive.css`, scoped to `.main-admin-detail-page.main-merchant-detail-page`, loads after the shared file) | Page still ran retired navy; matches Admin Detail reference. Scope by page class, not `data-access-page` — 8 pages share `main_merchant_detail` | 2026-09-15 |
| Merchant family runs the Charcoal block: scope widened to `body.main-admin-detail-page[data-access-page="main_merchant_detail"]`; `main-merchant-create.html` migrated | One block serves the whole family (detail/create/security/profit/profit-record/repayments/settlement); roles pages share the attribute but load a different stylesheet, so they stay untouched | 2026-09-15 |
| Merchant row avatar = neutral tile `#F5EBDC` / `#2A2C36`; every-third-row tint deleted; colour only on suspended rows; initials from the company name | User approved. The tint encoded row position, not data, and the indigo tile repeated the code printed beside it. Admin Detail keeps the old vocabulary | 2026-09-15 |
| **Row Role / Status pills = soft fluorescent** — Brand Owner `#F0ECFA`/`#6B5B95` · Active `#EAF7F0`/`#1A8A5C` · dot `#3CB87A` · hover `#D8F0E4` (not neon `#EDE9FE`/`#D1FAE5`/`#10B981`, not dusty dark). Merchants (`.mad-status` / `.mad-status-chip` / `.mas-status.is-success`) + Providers (`.mpv-status.is-active` · family `.mad-status`). CSS: `main-merchant-detail-executive.css` · `main-provider-detail-executive.css` · `main-provider-family-executive.css` | User: Role/Status 太亮刺眼 → 柔荧光锁定 · Providers 统一 | 2026-09-28 |
| **Role hue-coding restored in CSS** — the same morning's one-chip pass reverted. Merchant + Admin Management Role column back to the reference's tone groups: owner/master `#F0ECFA`/`#6B5B95` (dark `rgba(124,58,237,.22)`/`#C4B5FD`), regional/tech/support `#DBEAFE`/`#1D4ED8`, risk `#FEE2E2`/`#B91C1C`, default `#F3F4F6`/`#4B5563`. Same five sheets; borderless 999px capsule, no frame | Owner: 我要恢复到 我同事那款 — the lilac above was documented everywhere but its CSS was lost in the `6462e1ed` merge | 2026-09-28 |
| Date range picker: preset active = amber wash + amber text; ghost head; cream panel `12px` | User locked to listing reference (not solid amber preset / not filled well head) | 2026-09-15 |
| Transaction table frame = Admin Detail mad-panel (viewport-locked, inner scroll, table-layout fixed) | User: Deposit table 框 must match main-admin-detail fixed frame | 2026-09-15 |
| Transaction table light paint = peach-cream zebra (`#FFF8EB`/`#FFF1DC`/`#FFE8CC` head) · no pure white · thead corners square · cell weight `bold` · PENDING orange | User: white rows刺眼; muddy parchment 违和; then locked cream family | 2026-09-15 |
| Transaction table dark = zebra `#3A3C48`/`#434653` · deep head `#1F2128` · status pills · action wells locked to MD | User: dark even row → `#434653`; was `#252730` | 2026-09-15 |
| Deposit/Withdraw Filtered Total Amount bar removed | User: 这个部分我不要 | 2026-09-15 |
| Deposit/Withdraw page chrome locked: bank cards strip · tabs left + inline filters right · Bank `Name (account)` · no Reset/Search in filter · action 26×26 · no Pending metrics | User aligned Withdraw to Deposit shell | 2026-09-16 |
| Deposit/Withdraw responsive 1920→375: bank strip · stacked toolbar · scrollable table · ≤1456 DATE day-only + hover time · hide secondary columns on tablet/phone | User: mid widths messy / table too short / DATE ellipsis | 2026-09-16 |
| Withdraw Remark cell = player text only (no `Admin:` sub-line) | User: 这个也帮我移除 | 2026-09-16 |
| Bulk panel pill scrollbar locked: light chocolate `#8B6B4A` / hover `#5C4A30` · dark `#F59E0B` / `#D97706` · **`6px`** · no arrows · webkit only (never cool slate / zinc) | User: scrollbar 再粗一点点；was `4px` | 2026-09-17 |
| Wallet Ledger = `bo-wallet-tx` · table-wrap + type menu use Panel pill chocolate scrollbar · Type dropdown retired cool blue | User: Wallet Ledger scrollbar 跟着 MD | 2026-09-17 |
| Sidebar active chip: first matching menu URL only (wallet-ledger under Transaction wins over Member duplicate) | User: Wallet Ledger sidebar 跟着 MD；Member 不应同时高亮 | 2026-09-17 |
| **Listing filter controls locked at `36px` / radius `8px` / gap `10px`** (Wallet Ledger specimen) — date `240` · inputs `140` · Type `150` · Reset/Search auto · no Page Size in filter row · no hover lift in flush strips | User: 按钮和框大小更新进 MD，之后统一用这个大小 | 2026-09-17 |
| Wallet Ledger Created/Posted = cell `DD/MM/YYYY` · cream pill tip `HH:MM:SS` · **no arrow** (图一标准 hover) | User: 图一无箭头；图二有箭头错；格子显示日期 | 2026-09-17 |
| Footer **Show N entries** = Deposit contract (`-` · `10` · `20` · `50` · `100` · `All` · Role select cream · `#ledgerSize`) | User: 跟 new deposit 一样，写进 MD | 2026-09-17 |
| Deposit/Withdraw toolbar filters = listing MD geometry (`36px` · gap `10` · date `240` · keyword `140` · status `150`) | User: 这里的框的大小跟着 MD 的来调 | 2026-09-17 |
| Bulk Manual split = Select Members **60%** · Configure **40%** (`3fr` / `2fr`) | User: 左边 60% · 右边红框 40% | 2026-09-17 |
| Panel pill scrollbar thickness **`6px`** (was `4px`) — Bulk · Wallet Ledger · Livechat | User: scrollbar 再粗一点点 · 更新 MD | 2026-09-17 |
| **Member Wallet** aligned to listing MD — no Page Size in filter · footer `#walletSize` · action 26×26 wells · username-only Member cell · panel pill scrollbar | User: 用MD来调整这些东西 | 2026-09-17 |
| **Topbar anatomy locked** (Deposit Approval specimen): left hamb + icon + title (+ Approval lead) · right theme → Members/Deposit/Withdraw counters `48×`/`10px` · User Name + avatar · height `64px` | User: 把表头的部分更新进 MD | 2026-09-17 |
| **Primary CTA = amber gradient + reverse on hover · no shadow** (drop / lift / inset all off) | User: 主按钮渐变倒反、不要阴影；更新 MD | 2026-09-21 |
| **Table footer pager anatomy locked** — First · Prev · pages(+ellipsis) · Next · Last · amber active · **no shadow** · VIP EXP specimen | User: 这个帮我更新在md 之后全部用这个 | 2026-09-21 |
| **Role select chevron pinned right:12px** (absolute · never trail label) · listing trigger pad 0 28px 0 12px · VIP EXP All Sources specimen | User: chevron pin right 12px into MD | 2026-09-21 |
| Footer Show N: **`-` · `10` · `20` · `50` · `100` · `All`** · `-` no scroll · **`All` scrolls** (VIP EXP Log) | User: All 的功能参考 VIP EXP LOG，show=all 可以 scroll | 2026-09-21 |
| **VIP Reward Log** toolbar filters = listing MD geometry (`36px` · gap `10` · keyword **`140`** · Type **`150`** · Role select chevron `right:12px`) | User: 这里的框要跟着MD来调整 | 2026-09-21 |
| Autofit even-fill (`-`) only **stretches rows when leftover gap < one row height**; if gap ≥ one row, leave natural height (no forced stretch) — VIP EXP Log + VIP Reward Log | User: table 展示数据空间少于一行数据框才要自动拉高 | 2026-09-21 |
| Autofit row-count (`-`) reverted to **`Math.floor`** (ceil regressed — a row added past capacity went invisible, clipped by `overflow:hidden`) — never add a row that doesn't fully fit; a leftover gap smaller than one row is handled only by the even-fill stretch, never by adding a row — VIP EXP Log + VIP Reward Log | User: tbody 只能完美显示11行，第12行看不到数据；空间少于一行高度就该拉匀不是加数据 | 2026-09-21 |
| Autofit lock **must reset on every filter/tab change** (status tab, type/source select, keyword search) — a status tab with taller row content (e.g. longer remark wrap) reused the row count locked in by the *previous* tab and overflowed, clipping the last row under `overflow:hidden`; every filter mutation now clears the lock before reloading so `settleAutofitFromPaint` re-measures against the new content — VIP EXP Log + VIP Reward Log | User: 还是一样 (Paid tab still clipping row 12 after floor revert) | 2026-09-21 |
| Autofit settle **must verify with a real post-paint overflow check on every path**, including when the floor-calculated target already equals the current row count — a cold first paint (F5) can under-measure `avail`/`rowH` and lock one row too many with no reload to trigger a recheck (the "already matches → lock immediately" shortcut skipped verification), while a manual reselect happened to route through the reload branch and got checked; fixed by wrapping both the "keep current rows" and "reload to new count" paths in the same `verifyAndLock()` (rAF-based, shrinks by 1 and retries until no `scrollHeight>clientHeight` overflow) — VIP EXP Log + VIP Reward Log | User: F5 刷新后变成显示 12（手动点选时是完美的 11） | 2026-09-21 |
| **Autofit (`-`) behavior CONFIRMED — canonical spec** for any listing footer `Show N entries`: (1) trigger always paints literal `-`, never the fitted count; (2) body scroll locked off (`overflow-y:hidden`) only while `-` is active — `All`/`10`/`20`/`50`/`100` may scroll; (3) row count = `Math.floor(availableHeight / rowHeight)` — **never** `Math.ceil` or any count that could add a row not fully visible, since an overflowing row is clipped invisible by `overflow:hidden` rather than becoming scrollable; (4) leftover gap is stretched evenly across existing rows **only when the gap is smaller than one row height** — a gap ≥ one row height means load more rows instead of stretching; (5) the settle/measure cycle (and its `lockedAutoSize` cache) must be reset on **every** trigger that can change row content — page-size change, status/segment tab, type/source select, keyword search (input debounce + Enter) — so a new dataset with different row heights is always re-measured, never inherits a stale locked count from the previous dataset. (6) before locking any settled count — whether reached by reload or by the first paint already matching — re-verify with an actual `scrollHeight>clientHeight` check on the next frame and shrink-by-1-and-retry if it still overflows; never trust the floor calculation alone as proof of fit. Reference implementation: `assets/js/vip-exp-log.js` + `assets/js/vip-reward-log.js` (`measureAutoPageSize`, `scrollAvail`, `settleAutofitFromPaint`, `verifyAndLock`, `evenFillRowHeights`, `reloadForFilterChange`). Any new listing that adopts `-`/`All` must follow this spec exactly. | User: 对了, show = - 的功能就是这样 | 2026-09-21 |
| **Sidebar nav scrollbar hidden** (“我要隐藏式的sidebar”) — `scrollbar-width:none` + `::-webkit-scrollbar{display:none}` on **`.report-nav`**, the rail’s actual scroller, not `.report-sidebar` (which `bo-ui-standard.css` pins to `overflow:hidden`, so a sidebar rule is inert on 140 of the 141 sidebar pages). The bootstrap `.report-sidebar` pair in `reports.css` is kept only for `layout-section.html`, the one sidebar page that does not load `bo-ui-standard.css`. Wheel / trackpad still scroll; the nav gains the 15px the scrollbar reserved | Owner: 我要隐藏式的sidebar | 2026-09-22 |
| **Sidebar width 230 → 260px** (“我的sidebar的宽度帮我改至260px”) — `--sidebar-w` in all four `:root` declarations across `reports.css` and its `reports-dashboard-original.css` twin; consumers follow the variable (`.report-sidebar{width}`, `.report-main{margin-left}`, the flyout anchor at 260+8=268, the dark canvas gradient). Mini rail untouched at `--rail-w:72px`. Costs 30px of content width: on `main-merchant-security.html` the filter row’s wrap threshold moves ~1273 → ~1303px (measured; 993px needed in 1000 at 230px vs in 970 at 260px), so it folds to two lines on windows in that band. Agent Portal keeps its own 250px — separate surface | Owner: 我的sidebar的宽度帮我改至260px | 2026-09-22 |

| **8. Report family regularised (8.1–8.11)** — new `body.bo-report-family` marker + `assets/css/bo-report-family.css` (linked last on the eleven pages). Two-slot `.mad-footer` (info left, ladder flush right), 36px/8px filter controls (beats the (2,6,2) `!important` authority layer with extra body classes **and** a `--bo-filter-height`/`--bo-control-height` token override), hidden injected date label, `table-layout:fixed`, square thead, 13px/700 cells, locked zebra pair (odd `#FFF8EB`/even `#FFF1DC` light, `#3A3C48`/`#434653` dark), First·Prev·window·Next·Last ladder 36×36 | Owner: 帮我把 8. Report 从 8.1 至 8.11 重新整顿一遍 | 2026-09-22 |
| **Listing filter row: pin the select *trigger*, not the native `select`** — `reports.js` hides the `<select>` inside a `.rounded-select-wrap` and paints a `.rounded-select-btn`, which `reports.css` pins to `42px` (twice, one `!important`) and `bo-charcoal-primitives.css` to `40px!important`. The 36px family rule reached only the hidden `select`, so with `align-items:flex-end` every select sat **6px higher** than the 36px date trigger (measured 213→255 vs 219→255). Add `.rounded-select-wrap` / `.rounded-select-btn` to the control group. Related trap: an `!important` longhand (`padding-left`) at nominally higher specificity **lost** to a base rule's `padding` shorthand — restate the inset as the full `padding` shorthand | Owner: 调整日期设计与其他container的对齐 | 2026-09-22 |
| **Report-family table = locked Transaction listing recipe** — head `#FFE8CC` / text `#6b360c`, dark head `#1F2128` / `#E7E5E4` (deeper than the body), `11px/700` uppercase `.04em`, sticky, soft column rules, first/last cell 16px inset. `.table-card` padding `0` so the head bar and footer hairline are flush and the first column lands at 296px against the filter row's 295px; interior chrome (`user-toolbar`, `perf-table-head`) keeps a `12px 16px` inset. `transaction-report.html` (`:not()`-excluded) already carried it with a deliberate `position:static` head — it is the reference the owner meant by “统一其他页面” | Owner: table设计要优化去参考统一其他页面 | 2026-09-22 |
| **Report-family filters are self-applying — no Search button** — category / provider / VIP / date range each reload on `change` with `page` reset to 1. The range picker commits `change` on both date inputs in one task, so the reload is deferred a tick and collapsed (one date pick = one request, verified with a single `fetch` spy) | Owner: 搜索按键我觉得没必要了 通常选中那些选项就自动输出数据了 | 2026-09-22 |
| **Sidebar flyout height belongs to the row, not the viewport** — `reports.css` pins `.nav-group-list` to `max-height: calc(100vh - 24px) !important`, and **an `!important` stylesheet rule out-ranks an inline style**, so the cap `positionSidebarFlyout()` computed from the room below the row was discarded (measured inline 547px vs computed 926.4px). With the Report row at 571 in a 950px window the panel ran to 1075, putting 8.9–8.11 below the screen — and since 504px of content was shorter than the 926px allowance, `overflow-y:auto` gave **no scrollbar either**, so 8.11 was neither visible nor scrollable. The JS now publishes the cap as `--bo-sidebar-flyout-max` (consumed by `bo-global-quicknav.css` at higher specificity, `100vh - 24px` fallback) and computes it **synchronously, before paint** — the write used to ride inside a `requestAnimationFrame`, so the panel painted uncapped and was then shrunk/moved under the cursor. **Two rules to carry:** a JS-computed size written inline is a suggestion, not a contract; and geometry needing no post-layout measurement does not belong in a frame callback | Owner: 我sidebar 看report 展开后 无法点到 8.11 … 也不要 乱我的光标乱跳 导致点不到其他的页面 比如 8.1 | 2026-09-22 |
| **The sidebar flyout's scrollbar is SHARED CHROME — its recipe lives in the sidebar's layer, not a page-family sheet.** The locked Panel pill (`6px` · light `#8B6B4A`/hover `#5C4A30` · dark `#F59E0B`/`#D97706` · no arrows) sat in `bo-report-family.css` under `body.bo-report-family`, so the eleven Report pages got it and the other ~130 pages got the raw OS scrollbar — auth.js paints the sidebar flyout on **every** BO page. Now in `bo-global-quicknav.css` as `.report-sidebar .nav-group-list:not(.rounded-select-menu)`; the family copy is deleted, not duplicated. **Gate for scrollbar work: assert the scrollbar's own layout gutter (`offsetWidth − clientWidth`), not the rule** — reading the sheet says the rule is right and says nothing about which pages it reaches; measured 7px with the marker, 17px without, 7px in dark | Owner: 欸 我的scroll的设计以及颜色 要统一 而不是现在图里的颜色 | 2026-09-22 |
| **8.1–8.11 carry the locked fixed frame — sticky header, inner row scroll** (`bo-report-family.css` §15, **desktop-only** `min-width:992px`): `.report-shell`/`.report-main` = `100dvh` `overflow:hidden`, `.report-content` = `flex:1` `min-height:0` flex column `gap:16px` (the cards' own `margin-bottom` is zeroed or the gap counts twice), KPI + `.filter-card` `flex:0 0 auto`, `.table-card` `flex:1` `min-height:0`, `.table-wrap` `flex:1` `overflow:auto` = **the only scroller**, `.mad-footer` `flex:0 0 auto`. The `th` were already `position:sticky` and inert — a sticky element inside a non-scrolling box does nothing while the *document* grows, which is why the header scrolled away. Measured with 60 rows: header viewport `y` 283 before / 283 mid-scroll / 283 at the bottom while the first row moves 327 → 27; page `scrollY` 0. Verified unclipped at 1900×950 / 1900×780 / 1440×700 / 1280×640 on five pages | Owner: 我的report 8.1 至 8.11 的页面所有设计 需要做到像图二那样 而且我table scroll down的时候 table header要定死 只能scroll里面的数据 | 2026-09-22 |
| **Panel-pill scrollbar block was incomplete for the table wrap** — the locked recipe carries four things this sheet had three of: `::-webkit-scrollbar-corner{background:transparent}` (unstyled it paints a default block where the two bars meet — the owner ringed exactly that corner once the table gained an inner vertical scroller), `::-webkit-scrollbar-button:single-button` (the arrow state Chromium actually matches — the plain button selector leaves the arrows painting on a 6px bar), `background:transparent` on `::-webkit-scrollbar`, and `border:0`/`box-shadow:none`/`background-color` on the thumb. Mirror the locked recipe verbatim, not from memory; measured after: corner rule matches, vertical gutter still 7px (6px pill + 1px border). Also: `overflow:hidden` on `.report-shell` does **not** clip the `position:fixed` sidebar flyout (measured inside the viewport, cap 558px) | Owner: 优化一下 | 2026-09-22 |
| **8.1–8.11: the table head is a SEPARATE table outside the scroller** (`assets/js/report-table-split.js` + `bo-report-family.css` §16, desktop-only) — 表头放在滚动容器外面，滚动条只覆盖表体; `scrollbar-gutter:stable` on both the head and the wrap so both reserve the same 6px (the head must declare the same `::-webkit-scrollbar{width:6px}` or it reserves the OS 15px instead — the asymmetry the technique's "no magic numbers" line exists to avoid); the head's reserved gutter is painted by its own background + bottom hairline; `scrollLeft` mirrored from the wrap; widths DERIVED, not authored — per-column **max of the header row and a body row** (body-only truncated 12 headings on the 14-column page: `Deposit Approved Members` → `Deposit Appr`), skipping any `<td colspan>` placeholder row (its one cell is the FULL row width: measured columns `[1195,235,191,…]`, a 2296px table in a 1195px wrap), and neutralising `reports.css`'s `min-width:100%` while measuring (left on, `max-content` returns the *filled* distribution and the per-column max exceeds the container — a 1352px table in a 1195px wrap). Measured: head `y=282` before/after/bottom while the first row moves `328 → -72`, wrap starts at `y=327` (bar covers the body only), both tables 1195px in a 1195px wrap, edges identical, 0 truncated headings; on 14 columns both 2525px with the head mirroring 150/150 | Owner: 我要的是这个呀 | 2026-09-22 |
| **No nested frame around the table body** — `reports.css` gives `.table-wrap` its own `1px` border and a `border-radius:12px!important`, a second rounded box inside the card's 16px one; the locked listing frame says the scroller has **no nested border/radius** and the panel owns the frame. Masked while the header lived inside the scroller, exposed the moment the head was split out. Now `border:0!important; border-radius:0!important` on `.table-card > .table-wrap` at the family scope; the card keeps its radius + `overflow:hidden` so the table is rounded exactly once. The head's mirroring side borders were removed in the same edit — with the wrap borderless they would have re-created the 1px column-edge offset. Measured: both boxes `x278.8 w1202.4 clientW1197`, `edgesMatch:true`, 0 truncated headings, only the 8px pager/select control radii left | Owner: 我的展示数据的table 怎么有奇怪的border radius 你要帮我去除掉 | 2026-09-22 |
| **Report family has NO Reset / Search / Refresh buttons — every filter self-applies** (`casino-*-report` · `promotion-report` · `transaction-report` · the two games pages · `agent-performance-report` · `win-lose-report`). Text fields reload on a 400ms input debounce, selects / date ranges / page-size on `change`. **Editing the markup alone would have thrown on two pages**: `player-game-ranking.js` and `agent-performance-report.js` bound their buttons with unguarded `.onclick =` — the JS must stop expecting them, not just the HTML. The `#gameRankCount` Members chip moved out of the table card into the page title (`:has(> .users-found-badge)` scopes the flex row; the id is unchanged so the script still writes it), and the interior-chrome rule skips `:empty` so the three casino pages' empty `.user-toolbar` reserves no blank space. Verified on an auth-stubbed harness: 0 stray buttons, 0 JS errors, 1 request per filter change (debounce traced by stack) | Owner: member显示移去上面 然后report的所有reset，search，refresh按键全去除 | 2026-09-22 |
| **Agent Performance Report onto the family layout** — order KPI strip → filter card → table (it had filter first), the dead `TitanX Gaming · dates` scope line and its `.perf-table-head` bar removed (**with** the JS write, which would otherwise throw), Export moved into the filter row right-aligned, and the page's own 14px cards/kpis brought to the family's 16px. **Two `bo-ui-standard.css` authority rules beat this page's sheet**: `display:flex!important` on `.report-main .bo-filter-row` at two-ID specificity (so the page's own `display:grid` + `grid-template-columns` never applied — measured `tracks:"none"`), and `> *{margin:0!important}` (so `margin-left:auto` computed `0px`, button right 1110 vs row right 1465). Right-alignment needed the usual two `:not(#…)` guards; measured gap 0 | Owner: 这个页面的设计 跟其他页面的设计不太统一 | 2026-09-22 |
| **Report pagination footer = the listing three-slot grid** — `Show N entries` left · info centred · ladder right, columns copied verbatim from `table-pagination-horizontal.css` (`minmax(190px,1fr) minmax(260px,1fr) minmax(190px,1fr)`) so the family and the listings agree by construction. Was a two-slot flex (info left, Show+ladder grouped right). All ten footers reordered to `entries-control` · info · ladder as direct children with the `.mad-footer-right` wrapper removed — including the two games pages, where `Show` was nested inside the info block. `transaction-report-polish.css` sizes this footer itself at five-class specificity (`auto minmax(0,1fr) auto!important`), which floated the info 76px off-centre (800 vs 880); the usual two `:not(#…)` guards fix it (IDs out-rank class counts). Measured after: offset 0 on all ten, 0 JS errors | Owner: 所有report页面的 8.1 至8.11 的pagination设计 要统一跟图里和其他页面一样 | 2026-09-22 |
| **Agent Performance: family KPI tiles · footer dropdown opens up · ladder always renders** — the page's `.perf-kpi` strip (per-tile green/purple/red wells, amber value) became the family's `.quick-stats > .metric` (amber well 52×52, `12px/800` label, `23px/900` value, 14px/104px tile), measured identical to win-lose's. The **icon chip is written by the page on purpose**: `reports.js`'s decorator walks `.quick-stats .metric` *descendants* of a mutated node, so a tile set written wholesale via `innerHTML` is never matched (measured tile present, `.bo-summary-icon` null) — every other page's tiles are in the markup at load. Fixing the observer itself would cost a pin sweep on ~141 pages, so it is left for a pass already touching that layer. Footer `.rounded-select-menu` flipped to open **above** the trigger (was `top:calc(100%+6px)`: measured menu 869→1099 in a 900px viewport, 0 items reachable; now 622→815, 5 reachable) — same recipe the referral page ships for its footer select. `paintPager`/`pager()` no longer hide the ladder when `pages<=1`; the family contract is First·Prev·window·Next·Last with ends disabled (measured 5 rungs, 4 disabled) | Owner: 1.卡片的设计需要去统一 2.pagination的 下来选单有被遮挡 3.当前页面好像没有设计到 页数器？ | 2026-09-22 |
| **Report-family KPI tiles carry no note line, and six-up stays on ONE row** — notes hidden at `body.bo-report-family .quick-stats .metric .bo-summary-note` (they come from two sources: the page's own JS and `reports.js`'s decorator, pinned on ~141 pages, so CSS is the only scoped lever); tile geometry untouched, so the strip stays the app's component. Owner then asked for one row (“我电脑屏幕想要一排展示完”), so the tile is made COMPACT for six-up — ≥1366: 38px well/11px label/19px value/min-height 88px; 1201–1365: 30px/10px/16px; ≤1200: 2 columns with the family's full tile. Threshold measured: six tiles need ≥1200px for `Total Turnover` (at 1152, four labels ellipsised). **Every declaration needs `!important`** — `reports.css` pins this tile with `!important` at `.report-content .quick-stats:not(.user-stats) .metric`, and important beats higher specificity; without it the compact recipe was inert (tile still 52px/104px, label truncated 87 vs 83px). Third instance this session of a rule that was set and had no effect | Owner: 我电脑屏幕想要一排展示完 | 2026-09-22 |
| **8.1–8.11: the filter/date strip is a BAND INSIDE the table card, not a card of its own** (`bo-report-family.css` §19, desktop ≥992px) — 图二 (`index.html`, User Management) puts its filter row at `.table-card > .user-toolbar > .user-search-field`, directly on the amber head band; nine report pages instead had a separate rounded box floating a gap above the table card. Joined: strip loses bottom border/radii/shadow, gains the card's own `12px 16px` band inset, and its `-16px` bottom margin cancels the content column's flex gap; the table card loses its top border/radii. **`:has(+ .table-card)` is required** — 8.4 has no table and the negative margin would drag its KPI strip over the filter card. Measured: seam **0px** on all ten merged pages, filter control box **295** = first header cell text **295**; ≤991px unchanged (stacked, seam 16px) | Owner: 检查report的所有页面从 8.1 至 8.11 · 那个日期和table 要和图二的设计一样 | 2026-09-22 |
| **Report tables have NO vertical rules — head or body** — the head band's `rgba(107,54,12,.08)` and the body's `.06` column rules are gone (dark `.08`/`.06` with them); the row hairline (`1px #EADCC8` light, `rgba(255,255,255,.12)` dark) and the zebra band are what separate rows, as on every other listing. 8.7 needed its own rule: `transaction-report-polish.css` states both column rules itself at `(0,4,2)!important`, so the family's two `:not(#…)` guards (two IDs) are the lever. Measured `border-right-width 0` on `th` and `td` on all eleven, fill/hairline intact | Owner: table header是没有线条设计的 + table数据里 也不应该有线条哈哈 要跟统一其他页面 | 2026-09-22 |
| **The viewport-locked frame must let a table-less page scroll** — `casino-overview-report.html` is a filter strip + 18 KPI tiles with no `.table-wrap` at all, and §15's `overflow:hidden` on `.report-shell`/`.report-main`/`.report-content` left nothing scrollable, so everything below the fold was unreachable (“scroll不到下方”). `.report-content` is now `overflow:hidden; overflow-y:auto` (the shell, the pinned topbar and the sidebar stay) and `.table-card` carries a `280px` floor so a short window cannot shrink a panel to zero. Costs the table pages nothing: their card is `flex:1 1 auto` + `min-height:0`, so it fits exactly and the scroller never activates (`contentScrollable:false` on all ten). Pre-fix proof at 1512×640: 2 of 18 tiles unreachable; after: `scrollHeight 702 > clientHeight 576`, all 18 reachable, and `win-lose-report` still pins (head `y` 257 before and after, first row 302 → −98, document not scrollable) | Owner: scroll不到下方 | 2026-09-22 |
| **Agent Performance Detail is the report family's twelfth page — it had no design at all** — no `bo-report-family` marker, no family sheet, no split head, no footer; its KPI tiles were `<div class="perf-kpi">`, **a class defined in no stylesheet in the repo** (only a `grid-template-columns` rule on a container that was not a grid), so the strip rendered as raw inline text (`TurnoverRM 1,385,271.50Valid bet`), and 40 rows sat in one 2468px panel with the document at 3225px in a 950px viewport. Now: `quick-stats` + the family `.metric` markup (6 tiles, one row, 88px), the split/pinned lineless table, and the three-slot footer with the listing page-size semantics + locked ladder. Its `.perf-op` cards also had **no dark variant** (light card, light values) — fixed with the family's `#383A46`/`rgba(255,255,255,.14)`/`#D4D4D8` trio. **Fit rule for a client-side table: settle against the painted rows, never trust one pre-paint measurement** — that estimate came out one row too many (5 rows in a 212px panel at 54px ⇒ scrolled at the default), and correcting from `scrollHeight / painted` over-corrects downward because `scrollHeight` is clamped to `clientHeight` when rows do not overflow. Verified 1600→1201: one tile row, zero clipped values/labels, `slack 0` | Owner: 这个页面的设计 你还没帮我优化 | 2026-09-22 |
| **KPI tile text WRAPS — it is never ellipsised** — the six-up compact band was 38px well / 11px label / 19px value at ≥1366, which ellipsised five of six values on Agent Performance Detail, where a value is a six-figure RM amount (`RM 1,385,271.50` needs 144px in a 111px text column). One tightened band (30px well, 10px gap, 10px label, 16px value) now covers the whole six-up range, and the `white-space:nowrap`+ellipsis pair is replaced by wrapping on both lines: a number reading `RM 1,385…` is not a number, and a label reading `Bonus / Settle…` is not a label. The tile grows past its 88px floor when a line wraps, which is visible and honest; an ellipsis is silent data loss | Owner: 这个页面的设计 你还没帮我优化 | 2026-09-22 |
| **Column sorting on the report family reuses the Member Wallet recipe, from one shared layer — and the SCOPE bug is the lesson** — the repo already had the design: `th.bo-tx-sortable[data-sort]` with a `.bo-tx-sort-btn` + a CSS-drawn `.bo-tx-sort-ico`, states `is-sorted`/`is-asc`/`is-desc`, `aria-sort` in step (`member-wallet.js` + `bo-wallet-transaction-amber.css`). Ported as `assets/js/report-table-sort.js` + `bo-report-family.css` §23 — the script BUILDS the markup (no HTML edits) and finds a head cell's rows through the **card**, because `report-table-split.js` made the head and body two tables (`.bo-report-head` / `.table-wrap`) and 8.7 owns its own split (also covered). **The scope was wrong the first time:** gating on `body.bo-report-family` covers only the eleven 8.x pages, so every other report page was silently skipped — which is exactly why `provider-bet-report.html` (“Provider Bet Report”, the Bet Event Type page) had no sort (owner: “为什么我的transaction type report 没有sort 你再审核好哪一些report页面还没设计sort”). Eligibility is now “the script is pinned here AND the card has a head+body pair”, with `bo-sortable-tables` added to the body once a heading is decorated — that class, not the family marker, gates the styling. Sixteen pages: the twelve + Provider Bet Report, Agent Bet Report, Game Bet Report, MAIN Report. Still uncovered, listed in DESIGN.md: `daily-rebate-report`, `main-accounting-report`, `main-settlement-report`, `main-win-lose-report`, `main_merchant_report`, `main_provider_report` — they use the `standard-*` table component, not `.table-card`/`.report-table`. **Three measured traps:** (1) the control must be a `<span role="button" tabindex="0">` — `bo-ui-standard.js` paints every real `<button>` as a primary pill (measured `color:#fff`, amber fill) and re-scans added nodes, so stripping its classes was a race and the body-wide observer needed to win it is what hung a page; (2) watch the `thead` — 8.7 and 8.11 render theirs from JS on every load (8.7 again on each autofit settle), so a one-off decoration is thrown away (measured: 14 headings decorated, then gone); (3) watch the `tbody` to re-apply the order after a page change. **Alignment preserved AND the icon before the label — the icon lives in the cell's padding gutter** (`position:absolute; left:-10px`, label on the content edge), which is the only way to have both. Getting there took three passes, each from a screenshot: icon-before-the-label **in flow** pushed every heading ~19px right of its data (owner circled it); icon-after-the-label aligned but broke the design they had pointed at (“他的sort的位置应该在字体之前的设计”); and the first column's deeper 16px offset parked the DATE icon flush on the card border (“那个date的sort … sort的位置不美观”), so there is now ONE offset for every column and the first/last overrides are gone. **Measured on the Bonus Report:** DATE icon 4px clear of the card edge, label 295 = data 295; Reference/Promotion 537/550 = 550; Members 944/957 = 957; Claims 1136/1149 = 1149 — every delta 0. A column that is NOT left-aligned cannot use the gutter (its label sits at the far right, or centred, so a gutter icon parks an entire column away from it): those get `bo-sort-inline`, which puts the icon in flow immediately before the label — see the containing-block row below, where the first attempt at that broke the triangles. Sorting applies to the rows the table HOLDS: the whole set on client-paginated pages, the visible page on Win/Lose + the games reports | Owner: report的8.1 至 8.11的所有table欠缺sort功能 你去查看其他页面设计出的md 然后要确保我的数据要对齐 + 为什么我的transaction type report 没有sort 你再审核好哪一些report页面还没设计sort | 2026-09-22 |
| **A page that owns a `fixed` table layout must be EXCLUDED from the family's `table-layout:auto`** — 8.7 Transaction Report's head drifted off its rows by up to 162px (owner photographed it). Cause: `bo-report-family.css` pins `table-layout:auto!important` on `.report-table` with two `:not(#…)` guards, which out-ranks the page's own `table-layout:fixed!important` (0,4,2) — so the shared `.tr-col-*` colgroup stopped binding and each of its two tables sized to its own content (the head to its labels, the body to its data). Fixed with `:not(.transaction-report-page)`, the convention §14/§19 already use. **Then two more, on the same page:** the `.tr-col-*` widths were percentages, several narrower than their own uppercased `.04em` headings, so the head ellipsised itself (`MEM…`, `APPR…`) — they are now px values measured as `max(heading, widest data)` with `min-width` their sum (1460px), so no column is squeezed below its content; and the head slot reserved a 6px gutter while the body's was taken away in autofit, giving the two tables different widths once the card is wider than the columns (5px drift at 1904) — the gutters are now tied per mode. Verified 1904/1600/1512/1280: equal client widths, **0px column delta**, zero clipped headings, zero clipped cells | Owner: Transaction Report的table header与下面的数据没有对齐 + 反正我的transaction report要看完整所有数据 | 2026-09-22 |
| **A filter strip above a KPI grid is ONE container** (`bo-report-family.css` §21, desktop) — on 8.4 Casino Overview the date picker had a card of its own with a full-width empty band under it and the 18 KPI tiles restarted below in their own boxes, so the page read as two stacked objects. Same join as §19 aimed at the tile grid: the strip loses its bottom border/radii/shadow, gains the card's `12px 16px` band inset and a `-16px` margin that cancels the content column's flex gap; the grid becomes the panel's body (`#FFF8EB`, 1px `#EADCC8`, bottom radii, 16px inset). **The tiles are untouched** — they stay the family's `.quick-stats .metric`, so this page's cards still match the other report pages. Scoped by `:has(+ .quick-stats)`: only a page where the strip is followed by a KPI grid matches, and that is this page alone (on Win/Lose the grid sits above the strip; 8.11's control is a `.perf-filter-card`). Measured: seam 0px, dark panel `#383A46` / `rgba(255,255,255,.14)`, `win-lose-report` verified unchanged (grid `transparent`/`0`/`0`) | Owner: 日期要与卡片在同一个container的设计 | 2026-09-22 |
| **The sub-row band at the bottom of a fitted table stays — the even fill cannot be shared** — owner asked for the leftover to be stretched evenly (“建议就是把table底部拉均匀”). Implemented in `report-table-split.js` (stretch rows / invisible spacer below them / a 1–4px shave for slivers) and measured: `slack 0` and no scrollbar on eight of ten pages at 1512×950, stable over repeated samples. Reverted, because **a shared fill cannot know the row height the page's own fit is about to measure** — every fit here decides the next row count from a painted row, so any height the fill writes feeds back into it while the two watchers run independently. Measured: a stretching fill walked 8.11 from 9 rows to 14 (table 205px too tall) and the detail page from 10 to 20; the spacer version then added a spacer on top of rows that grew after it measured them, creating the 18px overflow it was meant to remove. Doing it properly is a refactor — thread a `reset/apply` pair through the six page scripts that own a fit, the way `operations-report.js` already does with `resetEvenFill()` → measure → `evenFillRowHeights()`. **What survives from the attempt:** 8.11's one-frame `requestAnimationFrame` re-check became a bounded 160ms timer (`verifyOverflow()`, one row per pass, three passes), because the frame version loses its correction to its own pending flag (panel wanted 10 rows, chain stopped at 11, 41px too tall); and the detail page re-fits once at 350ms because its first fit runs while the split head and the compact KPI strip are still settling. Both pages now fit exactly (9 rows / 10 rows) with bands of 39px / 38px and no scrollbar at 1512×950 | Owner: report的所有页面的table在所有屏幕 当show - entries的时候 还是会有scroll的问题 建议就是把table底部拉均匀 | 2026-09-22 |
| **A tall reference block on a viewport-locked page is a DISCLOSURE whose control belongs in the header row, and toggling it must re-fit the table** — Agent Performance Detail's eight-card financial readout is 247px of page height for reference data, above the table that is the page's actual purpose. The control now sits right-aligned in the page's own header row (as its own row it cost a 36px band plus two 16px gaps and read as a floating chip); the cards open between the KPI strip and the table, so the reading order is unchanged. State persists in `localStorage` and is applied **before the first render** so the fit matches the panel the reader sees. Because the page is viewport-locked (§15), collapsing hands ~270px to the table panel and the fitted row count must be re-derived (measured 636px → 9 rows collapsed vs 409px → 5 rows open). **Hide the PANEL, not just its contents**: a 0px-high panel left in the flex column still contributes the column's 16px gap on both sides, so the KPI strip and the table card measured **32px** apart when collapsed — `gapKpiToCard` 32 → 16 after switching to `display:none`. Below 1500px the summary hint hides and the name ellipsises rather than being squeezed | Owner: 框中的部分 我想做成收起来的功能 因为太大了 + 放上去一点 too much gap | 2026-09-22 |
| **The `-` fit has FOUR failure modes, and every one of them was a silent no-op** — the owner photographed two pages whose default `-` still scrolled (“Show 1 to 14 of 15 members” with the last row cut). (1) a hard-coded `ROW_H = 40` where the rows render 41 → one row too many; (2) `headH = head ? h : 44` — the 44 was a stand-in for “no thead”, subtracted even after `report-table-split.js` lifted the head OUT of the scroller (a 676px panel at 38px rows: `(676−44)/38 = 16.6 → 16`, a 68px dead band); (3) settle corrections that never reached the request — a page read `plan.size` and ignored its own `fitLock` (also looping, eight identical `size=18` calls), a `load(false)` called while `loading` was still true (the guard swallowed it), and a settle gated on `tableBodyEl`, which does not exist on promotion-report; (4) a fit that converged against **transient** geometry stays one row long a frame later (10 rows × 57 = 570 in a 562px panel; 12 × 41 = 492 in a 491px panel at 1280×760) → verify with a `requestAnimationFrame` re-check after painting. **Rule: measure a painted row, derive the capacity from the scroller you actually scroll, honour the settled size in the request, and verify one frame later.** Audited all twelve pages afterwards: control on `-`, no panel scrollbar, page not scrollable, no clipped tile text | Owner: 还有一些report的页面 没调整好他的默认 entries 但能scroll的问题 处理完后记得 要帮我审核清楚 | 2026-09-22 |
| **Report pagination = the LISTING pagination; `-` means FIT the panel on every one of the eleven** — the house semantics live in `pagination-standardizer.js` → `resolvePageSize()` (`-`/blank/`auto` → `max(5,min(200,floor(available/rowHeight)\|\|12))`, `All` → `10000`, a number → that number) and `member-management.js` is the reference implementation; `operations-report.js` calls the `-` label “the VIP EXP contract”, so `-` **displaying** as `-` is intended. Two pages violated it: **Win/Lose Report** read `-` as a hard 20 (panel over-filled ⇒ scrolled behind the pinned head while the footer claimed “Showing 1 to N of N”), and **Agent Performance Report** had no `-` option at all. Both now fit. Win/Lose's ladder was also classless `‹`/`›` buttons — the family stylesheet sizes `.smart-page`, not `.pagination-clean button` — now the locked rungs. Measured (57 synthetic rows, 1512×900): `-` → `size=12`, `wrapScrollHeight 511 == clientHeight 511`, `Showing 1 to 12 of 57 entries`; page 2 → `size=12&page=2`, first row 13; rungs 36px, First/Last 36×36, info centred 886 vs 886. **Cost:** one extra request on the first paint of a server-paginated page whose placeholder-row estimate differs (`13@p1` → `12@p1`), the casino pages' own one-shot correction | Owner: 默认show - entries 的话 可是仍然能scroll + 确认好report所有页面的pagination的功能逻辑是跟其他页面统一 | 2026-09-22 |
| **A CSS-drawn icon is its triangles' containing block only while it is POSITIONED — the sort arrows escaped to the button and painted mid-cell** — `report-table-sort.js` builds `span.bo-tx-sort-btn` containing `span.bo-tx-sort-ico` + the label, and the two arrows are the icon's `::before`/`::after` at `position:absolute; left:50%`. For a left-aligned column the icon is itself `absolute` (out of flow, in the cell's gutter, so the label can sit exactly on the data) and therefore is their containing block. The right-aligned rule — icon back in flow so it can sit before a right-hugging label — used `position:static`, which **removed** that containing block: the triangles re-anchored to the BUTTON and painted at the middle of the header cell. Measured on Deposit/Withdraw: icon box `2721–2729`, its triangles `2779–2786` — **52px from their own label**, and on Win/Lose's wider column a whole column away (owner, two screenshots: “当点选日期后 table header的 sort与字体的距离 修好”). Fix: `position:relative` with `top`/`left`/`transform` reset — a *relative* box resolves percentage offsets against the **button's** height, not its own, and the button's `align-items:center` already centres it; `relative`-and-in-flow is also the house reference (`bo-wallet-transaction-amber.css`: `.bo-tx-sort-ico` relative, in flow, `gap:4px`). The class is now `bo-sort-inline`, applied to every column whose computed alignment is not left/start, so a **centred** column cannot fall into the same trap. **Verified:** an isolated geometry page (only the sheet + the script; left/right/centre → icon `absolute`/`relative`/`relative`, containing block the icon each time, gap 2–3px in the gutter and 5px in flow, nothing escaped, and after a click `aria-sort="ascending"` with the icon still in flow and rows reordered) plus twelve pages swept with the real files — every column has a control, zero escapes, zero centred columns, and on the three with a right-aligned column the icon is `relative` with its own containing block at a 5px gap; head-label-vs-data delta **0px on every column of every page**. Four pages cannot be driven in the sandbox (Casino Overview builds its head from data; Agent Bet / Agent Player Game / Agent Performance Detail redirect to their portals) — all four carry the same classes and pin the same two files | Owner: 检查所有report的页面 当点选日期后 table header的 sort与字体的距离 修好 | 2026-09-23 |
| **A fit that writes row heights re-triggers itself through a ResizeObserver — 8.7 flashed forever, and its columns were sized from a data sample** — on Transaction Report the scroller's box follows its content, so `evenFillRowHeights()`' own writes read as a panel change: the observer cleared `lockedAutoSize`, re-rendered, which reset the heights, which fired it again. Measured: row height flipping 47↔50px, scroller 448↔446px, **1,305 mutation records in 2.6s idle and 3,730 in the 3s after a date change**, indefinitely. The observer now ignores any notification within 400ms of a fit write, and any box whose width differs by <1px **and** height by ≤4px from the one the fit was computed against — width is the real fit input and is compared strictly (measured a dead constant 977 through the whole loop), while a genuine panel change is tens of px where this feedback was 2. After: **0 mutations, one distinct state, 5s idle**, same after a date change. Second defect on the same page: the `.tr-col-*` px widths were measured from a sample, so production values ellipsised themselves — the id read “2…” (40px column, 24px of padding alone) and the balances “58,2…” (owner: “我的id也没有展示完整”). `fitColumns()` now measures the widest rendered content per column and writes the same inline width to **both** colgroups (head and body must agree; inline `!important` because the sheet's own widths are important), grows only and remembers the widest seen so paging never pulls a column back in, exempts Remark (it truncates by design, with a hover tip), and re-runs on `document.fonts.ready` + at 250/900ms because the first pass can measure before the final type is in force (measured 120px of text for a 134px id). **No `min-width` bookkeeping:** fixed layout already sizes the table to the greater of its specified width and its columns' minimum, and writing one from the measured cell widths fed the layout back into itself — +10px per pass, forever. Measured after: zero clipped columns (id 160/160, balances 91/91), table 1620px up from the CSS 1460 floor, head and body identical widths, head labels at delta 0 on all 14 columns | Owner: 点选日期后 一直闪 不知道为什么 而且我的id也没有展示完整 | 2026-09-23 |
| **Theme dual-mode locked in words:** light = cream Charcoal+Amber · dark = cool charcoal — never retint light pages to cold light-gray as a simplification; never leave cream/`!important` joined controls (password+eye, Window+Minutes) or white logo tiles unpainted in dark; logo tiles dark = soft `#E4E4E7`; modal scrim = Create User `rgba(15,23,42,.55)` + blur (not amber `#D97706` wash). Patterns → Theme dual-mode | Owner: light mode 用 light的色系，dark mode 用dark的设计 | 2026-09-23 |
| **Provider Bet Report** onto report family — `body.bo-report-family.provider-bet-report-page` · fixed broken HTML (family CSS was after `</head>`) · no Search / no “Bet Report List” badge · Event Type select · three-slot `.mad-footer` with `-`·`10`·`20`·`50`·`100`·`All` + VIP ladder · autofit · `report-table-split`/`sort`. Patterns → Provider Bet Report | Owner: /interface-design 帮我调整 + 写进 MD | 2026-09-23 |
| **Provider Transactions** listing (Wallet Ledger MD) — combined keyword search · no Search/Refresh/Reset · VIP footer · Show `-` autofit + even-fill · Member **column** removed · ID col widened · Payload modal = cream→light-gray JSON wells · MD meta chips · Create User scrim | Owner: Provider Transactions MD pass + Payload / Member column | 2026-09-23 |
| **A back control belongs at the RIGHT end of its row — and the rule pinching it is ID-level** — owner: 查看其他页面的back按键统一在右边, with a screenshot of Agent Performance Detail whose “← Back to Report” sat at the far left while other pages put theirs at the right. The convention was already in the sheets (`.mac-back-section` / `.vle-back-list` = `margin-left:auto` in a flex head, `.mrc-back-list` / `.template-back` / `.banner-edit-back` last in a `space-between` row, `.pmc-form-head` `flex-end`, `.mra-detail-toolbar` `space-between`, `.mprr-back` auto-margin, `.md-identity-actions` the member card's right-hand group) — measured right, untouched. **Five were left:** Agent Performance Detail 1482px from its row's right edge, Agent Details 53px (of a 198px group), Agent Provider Detail 47px (stacked under the title — `.user-toolbar` is `space-between` but held ONE child), Balance Adjustment 1447px (a block of its own above the heading), Main Stat Detail 983px (mid-row after Search) → now **0/0/1/0/0px**. **Two traps:** (1) on Agent Details the control first landed INSIDE the `role="tablist"` strip — announced as a tab, and the page's `border:0!important;background:transparent!important;padding:15px 14px!important` for that strip stripped its chrome (measured `rgba(0,0,0,0)`, no border); moved out to the row, its ghost chrome came back (0.8px `#DCC9A8`, 8px radius, `0 14px`). (2) Main Stat Detail's `margin-left:auto` lost to `body:not(#…):not(#…) .report-main .bo-filter-row > *{margin:0!important}` — **ID-level** — regardless of source order (measured `marginLeft 0px`; matching that tier → 983.062px). Not moved on purpose: `provider-detail.html`'s control is a breadcrumb trail, not the “Back to X” pill | Owner: 查看其他页面的back按键统一在右边 | 2026-09-23 |
| **A generic "every input" theme draws a SECOND border inside any bespoke search component — exempt the COMPONENT, not the id** — owner: 调查所有页面的search bar设计为什么变样了 是谁影响的 再帮我解决这个问题. Eleven search components across 38 pages (`.category-search-control`, `.game-search-control`, `.input-icon-wrap`, `.banner-search`, `.livechat-search`, `.agent-search-box`, `label.bonus-title-search`, `.mad-search`/`.mre-search`/`.mas-search`, `.mp-search`/`.mrc-search`, `.mac-provider-search`, `.provider-list-search`, `.bo-filter-item`) from different authors over months (Wang Zai `962da1d3`, Jk6373 `6e92fd83`, Jack `024d1f88`) — no single regression. What IS real: `reports.css` (*“Every regular input/select follows the approved rounded field theme”*) and `bo-charcoal-legacy.css` both theme `.report-content input` at ID-level specificity, and both excluded bespoke fields by **enumerating ids** (`#providerSearchInput`, `#pullLogWindowValue`, `#boPassword`); `#bonusSearchInput` was never added, so once Jack moved that field into a pill the input kept drawing its own border inside it — and the same recipe hard-codes `#bonusSearchInput{height:42px}` → **42px inside a 36px pill (+6px)**. **Fix:** the id came out of the three recipe lists in `reports.css`, and both themes now exempt whole components — measured after: every pill `0px/0px` inside one `0.8px/8px` wrapper. **`agent-players` needed the OPPOSITE fix:** its own sheet’s v2.3.7 comment says “wrapper is layout-only; the input owns the one visible border”, so the charcoal agent skin was the intruder — its 8 wrapper/input border rules removed (14 selector entries), verified light **and** dark. **The legacy 42px tier is documented, not drift** (DESIGN.md 349: migrate the ROW, not the search) and is now migrated for `.mad-filters` by one guard-tier block in **`main-admin-detail-executive.css`** — measured 36px/8px on every control across eight cluster pages; the first attempt went into `bo-charcoal-shell.css` and changed nothing because those pages never load that sheet (14 sheets, none the shell). All migrated: the roles family (`menu-permission`, both `main-*-roles`, both `*-role-create`) now reads `mp-search:36/8px` with its action clusters at 36; `game`/`game-category`/`admin-user` measured a uniformly 42px row (every `.bo-filter-item` child), so their whole row moved to 36/8 via `reports.css` scoped by body class — and beating `bo-ui-standard.css`'s `.bo-filter-input-item input{height:42px!important}` needed a THIRD `:not(#…)` guard, two were measured not enough; `livechat` moved alone (vertical stack) and lands flush with its 36px card head. **A fix can also be invisible because 35 assets were pinned with different values** — `bo-charcoal-cms.css` ten ways (`1.0.0` on 19 pages), `bo-ui-standard.js` nine, `config.js` five; `scripts/stamp-asset-pins.py` derives every pin from the asset’s content hash (`sha1[0:8]`, idempotent, `--check` reports drift), tree stamped, **0 drift**. **Wiped once by `git reset --hard origin/main` while still uncommitted** (reflog: three such resets in one session) and re-applied + re-verified — commit before syncing | Owner: 调查所有页面的search bar设计为什么变样了 是谁影响的 再帮我解决这个问题 | 2026-09-23 |
| **Game Category search: shell owns chrome; bare input (no bg / no border)** — owner: icon跑位 + 移除 input 的 background 和 border. Absolute icon + bordered `#categorySearchInput` fought `reports.css` ID-tier `… .category-search-control{padding:0 12px!important}` and parked the magnifier in the wrapper pad outside the field. **Locked recipe:** `.category-search-control` / `.game-search-control` = flex shell (`36×8`, fill `#FFF8EB` / dark `#2A2C36`, border `#EADCC8`) · icon `position:static` · input **transparent, border 0, no own focus ring** · focus-within on the shell. **`bo-input-fill.css`:** rule 1 was still painting cream onto nested search inputs even though rule 2 fills the frame — added transparent overrides (base + hover/focus) for `.category-search-control > input`, `.game-search-control > input`, `.banner-search > input`, `.input-icon-wrap > input`, `.ref-input-icon > input`, `.mad-search > input`, `.agent-search-box > input`, `.mac-provider-search > input`, `.provider-list-search > input`. Page lock in `game-category.html` `#game-category-footer-lock` + `reports.css` body-scoped block. **Do not merge with `agent-players`** (still input-owned border). Patterns → Filter bar | Owner: 这个icon的位置跑掉了 + 移除 input 的background 和 border | 2026-09-23 |
| **Wallet Ledger table = fixed `.bo-tx-table-head` + body-only scroll** — same Deposit / Member Wallet split: wrap `overflow:hidden` · `.bo-tx-table-body` (`#ledgerTableScroll`) is the only vertical scroller · panel pill `6px` on body · no H-scrollbar when columns fit · body `scroll` mirrors head `scrollLeft` | User: 表头要fix死的，scrollbar只是在表身滚动 · 更新进 MD | 2026-09-24 |
| **One button recipe for the three chrome roles** — Back control, footer secondary (Close/Cancel) and footer primary (Save/Create/Submit) now render one recipe each, measured on **49 pages × light and dark** with `getComputedStyle`. Baseline was **12/11 shapes for Back, 16 for the footer secondary, 15/16 for the footer primary**. Four causes: (1) **34 of 35 primary controls carried a `box-shadow`** the Primary spec forbids outright — each family re-stated the amber recipe with its own glow and inset, so **101 declaration blocks across 22 sheets** were flattened to `box-shadow:none` (focus rings drawn with `box-shadow` were found and kept); (2) the ghost resting fill shipped in **three** shapes — three-stop form cream, an undocumented **two-stop** `#FFFCF7→#F5EBDC`, and the two-stop **listing** cream — because `bo-charcoal-shell.css` and `bo-charcoal-primitives.css` both owned `.mad-btn-ghost` and "which sheets this page loads" picked the winner, so 8 starting-point owners converged on the locked three-stop; (3) the Back control had **no owner at all** (40px/800 on Create Role, 38px on the banner/category/slider editors, 32px with no chrome on Live Chat, a bare 21px `14px/400` link on Balance Adjustment) and is now stated per family; (4) **`.mad-btn-navy` rendered solid navy on three pages and amber on six** — source order plus the `bo-charcoal` marker decided, and "Never restore navy fill as primary" now holds. Labels normalised to `700` and 13.5px → 13px. **Heights deliberately NOT unified:** the 2026-09-23 note that put the form footer on the 36px tier was measured back out on 2026-09-24 (a 36px button makes `.mac-footer-actions` 65px against the 73px pinned sidebar block = the pair-of-parallel-hairlines defect), and on Create Role `.mrc-btn-ghost` paints Back *and* Cancel so its 40px is load-bearing for the pinned 69px bar — the back control is therefore stated separately rather than by narrowing the shared rule. **Measured after:** Back **42/44** controls on one paint, footer primary **66/70**, footer secondary **66/84**; the remainder are quiet quick-action strips whose chrome is deliberately removed (`game-provider` wallet row, `game` Reset strip) and `backup_provider.html`, which links no stylesheet at all. Listing filter strips untouched (own 36px/no-lift spec; `main-stat-detail`'s "Back" is a filter-row control and keeps it). Pins re-stamped, `--check` clean. **Trap:** a generated rule must repeat its scope per selector — `A,
B:hover{}` attaches `:hover` to B only, so A shipped the hover paint at rest, and a dark-scoped list painted its second selector dark in light mode | Owner: 帮我检查全站 我图里全起的设计是否统一css 没有的话 请帮我去统一 | 2026-09-28 |

Family-by-family migration (each family with its own rescoped copy of the charcoal block) covers
the pages documented in `DESIGN.md`. Every other page migrates through a `bo-charcoal` marker
class on `<body>` plus three shared layers loaded last:

| Layer | Owns |
|-------|------|
| `bo-charcoal-shell.css` | Shell chrome + the `.mad-*` vocabulary (mechanical rescope of the merchant family block) |
| `bo-charcoal-legacy.css` | The `reports.css` / "standard" vocabularies: listing cards, `.report-table`, `.metric`, `.clean-btn`, `.standard-*`, pagers, `.user-toolbar`, the permission matrix, the `.main-mod-*` / `.settlement-*` deltas, plus the **Bootstrap table variables** and the two-ID guard that out-ranks `bo-ui-standard.css`'s filter-row authority layer |
| `bo-charcoal-primitives.css` | Components with no owner: `.bo-ui-button*`, `.mad-btn*`, Bootstrap and custom modal families, `.rounded-select-*`, `.bo-seg-thumb`, tips, the date-range picker, a toast primitive, switches, checkboxes, uploads |

Nothing repaints until a page carries the marker, so a shared layer's blast radius is exactly the
pages that opted in. A page that opts in must also ship the locked topbar chrome — most of them had
no theme toggle at all, so dark mode was unreachable there.

Two consequences worth keeping in mind when reviewing a page:

- **Scope selectors are load-bearing.** A migrated page showing legacy chrome usually means its
  scope selector is wrong or malformed, not that a rule is missing — a single missing comma in a
  family `:is()` list made 1307 rules inert.
- **A cool-hued value is always a defect**, in both modes: the locked palette has no cool hue. That
  makes an audit mechanical — sweep every rendered element's computed colour — and it also makes a
  *mechanical* retint correct, which is how the page-scoped sheets were migrated. Compare rendered
  colours, never selector text: Bootstrap's table cells, ID-scoped legacy rules and anything the
  family blocks never re-declared are all invisible to a grep.

## Agent rules

1. Always read `DESIGN.md` and this file before UI work on this repo.
2. Never substitute another palette “for taste.” Never restore Deep Navy Cyan.
3. `frontend-design` may refine typography, hierarchy, and micro-detail — **not** brand hex values, topbar chrome, or locked button gradients.
4. When adding CSS tokens, prefer `--bo-*` names; map accents through amber (`--bo-cyan` = amber).
5. Offer to update this file when a pattern is reused 2+ times with stable measurements.
6. New pages must follow Charcoal + Amber; migrate legacy navy/cyan pages toward these tokens when touched.
7. **Unify chrome:** every page’s Theme toggle, header counters (when present), User Name block, Primary CTA, and Ghost/Export must match the Topbar + Buttons specs above — do not freestyle.
8. **Dark mode must beat legacy CSS:** `reports.css` still has `.report-body{background:#f5f7fb!important}`. Page CSS must override body/html/canvas with equal-or-higher specificity + `!important`, or white frames will leak around dark cards. Never assume MD tokens alone paint the canvas.
9. **Permission matrix dual wash:** light = cream/amber group wash; dark = cool charcoal surfaces only (amber accents, never muddy amber panel fill). Copy from Patterns → Permission matrix.
10. **No pure white in light chrome:** canvas end, topbar, and panels use cream `#FFF8EB` (continuum → `#FFF6E8` → `#FFF8EB`). Keep `#FFFFFF` only for text-on-amber (`--bo-accent-on`). Do not settle for near-white ivory (`#FFFCF8`) on Dashboard main pane.
11. **Dark data tables:** outer/row borders ≥ `rgba(255,255,255,.12–.14)`; header text `#E7E5E4`; cells `#F5F5F4`; muted/time `#D4D4D8`. **Transaction listing** (`body.bo-wallet-tx`): zebra odd `#3A3C48` / even `#434653` · thead `#1F2128` (deeper than body — never lifted `#40424E`). Scope light cream table CSS with `html:not([data-bo-theme="dark"])`. Copy from Patterns → Data tables → Transaction listing table.
12. **Sidebar L2 active:** inline = `#FFF8EF`→`#FFE8CC` + border `rgba(217,119,6,.28)`; flyout = `#FFFBEB`→`#FEF3C7` + border `#D97706`. Dark both: amber/charcoal chip + `rgba(245,158,11,.55)`. Never flat amber wash only. Beat `reports.css` flyout `#fff`. Copy from Patterns → Sidebar nav (shell CSS).
13. **Every new chrome needs Light|Dark:** before shipping a frame/button/slot, add or update a two-column table in this file (see Coverage checklist). Do not leave “dark inherits” undocumented. Light = cream continuum · Dark = cool charcoal — see Patterns → Theme dual-mode.
14. **Table footer pager anatomy:** First · Prev · page window (+ ellipsis) · Next · Last. Specimen: VIP EXP Log. Amber active = gradient only (**no shadow**). Do not ship prev/next-only pagers on new or touched listing pages. Copy from Patterns → Data tables → Table footer pager.
15. **Role select chevron:** pin `bi-chevron-down` at **`right:12px`** (absolute, vertically centered). Do not let it trail the label. Beat `bo-ui-standard` `padding-right:32px` on custom triggers. Copy from Patterns → Role select dropdown.
16. **Joined cream controls in dark:** any light rule that locks cream with `!important` on a joined control (password+eye, Window+Minutes, etc.) needs a matching dark `#2A2C36` override at equal-or-higher specificity — general input dark rules will lose.
17. **Provider Bet Report** and other Game-Management report pages that are not yet on `bo-report-family` must opt in when touched — marker + family sheet last + three-slot footer + self-applying filters. Copy from Patterns → Provider Bet Report.

18. **Main panel content rhythm = the same 16px, in `assets/css/main-content-rhythm.css`.** Every Main-shell page
    (`html[data-bo-shell="main"]`) makes `.report-content` a flex column with a 16px gap and zeroes its children's
    margins, exactly as BO does — the topbar / rail / canvas stay two separate shells (AGENTS.md), the spacing
    inside the frame does not. Add a new Main page to the same sheet's link list. `check-shell-drift.js` exempts a
    selector scoped by `data-bo-shell="main"` for this reason; a plain `.report-content` metric is still refused.
19. **Anything bound to a topbar element must be delegated.** `bo-spa.js` replaces `.report-main > .report-topbar`
    with a clone on every swap, so a per-element listener dies with the old node — this is what killed the theme
    toggle until `bo-theme.js` moved to a document-level delegated handler. See `SPA.md` section 10.4.
