# Univotel CRM — Design Reference

**Gold standard:** `/my-day` (`pages/my-day.tsx` + `components/my-day/*`). When building or refactoring UI elsewhere, match My Day's density, card treatment, spacing rhythm, and interaction patterns — not older pages that use flatter `Card` shells.

**Token source of truth:** `styles/globals.css` — all brand colors live as CSS variables. Prefer Tailwind theme classes (`text-text-primary`, `bg-surface-card`, `border-border-default`) over raw hex or arbitrary Tailwind grays.

---

## Brand & Color System

### Core palette

| Token              | Light value | Tailwind class         | Use                                          |
| ------------------ | ----------- | ---------------------- | -------------------------------------------- |
| `--blue`           | `#2e3fa3`   | `brand-blue`           | Primary actions, active tabs, links, sidebar |
| `--blue-light`     | `#eef0ff`   | `brand-blue-light`     | Selected rows, accent backgrounds            |
| `--blue-mid`       | `#6b7fe3`   | `brand-blue-mid`       | Focus rings                                  |
| `--blue-hover`     | `#253494`   | `brand-blue-hover`     | Primary button hover                         |
| `--red`            | `#b83228`   | `brand-red`            | Destructive, errors, SLA breach              |
| `--brand-gradient` | blue → red  | `.brand-gradient-text` | Marketing accents only                       |

### Surfaces & text

| Role            | Variable / class                 |
| --------------- | -------------------------------- |
| Page background | `bg-surface-page` (`#f4f4f8`)    |
| Card / panel    | `bg-surface-card` (`#ffffff`)    |
| Sidebar         | `bg-surface-sidebar` (`#2e3fa3`) |
| Primary text    | `text-text-primary`              |
| Secondary text  | `text-text-secondary`            |
| Tertiary / meta | `text-text-tertiary`             |
| Default border  | `border-border-default`          |
| Strong border   | `border-border-strong`           |
| Row hover       | `hover:bg-row-hover`             |
| Row selected    | `bg-row-selected`                |

### Semantic badges (funnel / SLA)

Use `StatusBadge` + `Badge` variants — they map to CSS variables (`--badge-call-*`, `--badge-visit-*`, etc.). Do not invent new pill colors for funnel stages.

### Category accent chips (My Day pattern)

My Day assigns each task/metric category a **tinted icon chip** — not the global badge tokens:

```
bg-{color}-500/10 text-{color}-600   (or teal-700 for calls)
```

Established mappings in `components/my-day/config.ts` and `PerformanceTab`:

| Category         | Chip classes                         |
| ---------------- | ------------------------------------ |
| Nurtures         | `bg-amber-500/10 text-amber-600`     |
| Calls            | `bg-teal-600/10 text-teal-700`       |
| Visits           | `bg-indigo-500/10 text-indigo-600`   |
| Post-visit       | `bg-violet-500/10 text-violet-600`   |
| Move-ins / deals | `bg-emerald-500/10 text-emerald-600` |
| Recent / neutral | `bg-slate-500/10 text-slate-600`     |
| Brand KPI        | `bg-brand-blue/10 text-brand-blue`   |

Reuse these chips for new grouped sections — do not mix unrelated hues per page.

### Dark mode

Theme toggles via `[data-theme='dark']` on an ancestor. All tokens above have dark overrides in `globals.css`. Test both themes when changing surfaces or borders.

---

## Typography

| Role     | Family                       | Weight  | Typical classes                      |
| -------- | ---------------------------- | ------- | ------------------------------------ |
| Headings | Poppins (`font-heading`)     | 700     | Page titles, KPI values, card titles |
| Body     | Inter (`font-body`)          | 400/500 | All UI copy (default on `body`)      |
| Mono     | JetBrains Mono (`font-mono`) | —       | IDs, codes, timestamps               |

**Base scale** (`html { font-size: 14px }`):

| Element                | Size    | Classes                                                                |
| ---------------------- | ------- | ---------------------------------------------------------------------- |
| App topbar title       | 15px    | `font-heading text-[15px] font-bold`                                   |
| Page greeting (My Day) | 20px    | `text-xl font-semibold text-text-primary`                              |
| Card / section title   | 16px    | `text-base font-semibold`                                              |
| Body / row primary     | 14px    | `text-sm font-medium`                                                  |
| Meta / subtitle        | 12px    | `text-xs text-text-tertiary`                                           |
| Section label (caps)   | 11px    | `text-[11px] font-semibold uppercase tracking-wide text-text-tertiary` |
| KPI value              | 24–36px | `text-2xl` or `text-4xl font-bold tabular-nums`                        |

**Rules:**

- Use `tabular-nums` on all metrics, percentages, and counts.
- Headings use Poppins; never set Poppins on long body paragraphs.
- Links: `text-brand-blue` with underline on hover (global `a` style).

---

## Layout & Spacing

### App shell (`AppShell`)

```
Sidebar: 220px expanded / 60px collapsed (pl-[220px] | pl-[60px])
Topbar:  h-[52px], border-b, bg-surface-card, px-5
Main:    px-5 py-[18px], inner max-w-[1280px]
```

My Day overrides content width to `max-w-[1400px]` for its 3-column grid — use **1400px** for dashboard-style multi-card layouts; **1280px** for single-column forms and tables.

### Spacing rhythm (My Day)

| Context               | Value                                                          |
| --------------------- | -------------------------------------------------------------- |
| Section gap           | `space-y-5` or `gap-5`                                         |
| Below tabs / greeting | `mb-5`                                                         |
| Card internal header  | `px-5 pt-5 pb-3`                                               |
| List row              | `px-3 py-2.5`                                                  |
| Grid gutters          | `gap-5` (cards), `gap-3` (KPI tiles), `gap-4` (2-col sections) |

### Responsive grids (My Day)

```tsx
// Task containers — priority order preserved in DOM for mobile
grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3

// KPI tiles
grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6

// Two-column analytics
grid gap-4 md:grid-cols-2

// Counter strip (when used)
grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-7
```

Mobile-first: single column default, scale columns at `md` / `xl` / `lg` breakpoints. Prioritize actionable content first in DOM order.

---

## Border Radius & Elevation

| Component type            | Radius                      | Shadow        |
| ------------------------- | --------------------------- | ------------- |
| **My Day cards** (target) | `rounded-2xl`               | `shadow-sm`   |
| Global `Card` (legacy)    | `rounded-[10px]`            | `shadow-none` |
| Icon chips                | `rounded-xl`                | —             |
| Inline rows               | `rounded-lg`                | —             |
| Buttons / inputs          | `rounded-lg` / `rounded-md` | —             |
| Pills / count badges      | `rounded-full`              | —             |

**Migration rule:** New work and refactors should use **My Day card treatment** (`rounded-2xl border border-border-default bg-surface-card shadow-sm`), not the flatter global `Card` defaults.

---

## Icons

- **Library:** `@tabler/icons-react` (My Day standard)
- **Chip icon:** `h-5 w-5` inside `h-10 w-10` chip; KPI tile icons `h-4 w-4` in `h-9 w-9` chip
- **Inline meta:** `h-3 w-3` – `h-3.5 w-3.5`
- Always `shrink-0` on icons beside truncating text
- Decorative icons: `aria-hidden`

---

## Global Components (`components/ui/`)

Use these primitives; style them to match My Day when they diverge.

| Component                            | Path                            | Notes                                                                                                       |
| ------------------------------------ | ------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `Button`                             | `components/ui/Button.tsx`      | `default` = brand-blue fill; `secondary` = bordered card; `text-xs` default                                 |
| `Badge` / `StatusBadge`              | `badge.tsx`, `status-badge.tsx` | Funnel + SLA pills; funnel mapping in `status-badge.tsx`                                                    |
| `Tabs`                               | `tabs.tsx`                      | Underline active state (`border-b-2 border-brand-blue`); used on My Day                                     |
| `KpiCard`                            | `kpi-card.tsx`                  | Colored tiles (blue/red/amber) + neutral; `rounded-[10px]` — consider `rounded-2xl` when aligning to My Day |
| `Card`                               | `card.tsx`                      | Legacy shell — prefer My Day card classes for new dashboards                                                |
| `Skeleton`                           | `skeleton.tsx`                  | Match parent radius (`rounded-2xl` for cards)                                                               |
| `Select`, `Input`, `Dialog`, `Sheet` | `components/ui/*`               | Form patterns; keep `text-xs` density                                                                       |

---

## My Day Component Patterns (reference only)

Do not copy these files into other routes verbatim — **extract the patterns**.

### 1. Task container card — `TaskContainerCard`

The canonical elevated card shell:

```tsx
// Shell
flex flex-col rounded-2xl border border-border-default bg-surface-card shadow-sm

// Header: icon chip + title + count pill + optional "Tümünü gör →"
// Body: maxHeight 420, overflow-y-auto, divide-y divide-border-default/60
```

States built in:

- **Loading:** 3 pulse skeleton rows inside card
- **Empty:** Centered faded chip icon + `text-sm text-text-tertiary` message from `config.ts`

### 2. List row — `LeadTaskRow` / visit rows

```tsx
flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-row-hover
// Primary: text-sm font-medium text-text-primary truncate
// Meta: StatusBadge + text-xs text-text-tertiary
// Action: shrink-0 rounded-md border border-border-default bg-surface-card
//         px-2.5 py-1 text-xs font-medium text-text-secondary
//         hover:border-border-strong hover:text-text-primary transition-colors
```

Row click opens detail panel; action button uses `stopPropagation`.

### 3. Page header strip (Bugün tab)

```tsx
<h1 className="text-xl font-semibold text-text-primary">Merhaba, {name}</h1>
<p className="text-sm text-text-tertiary capitalize">{dateLabel}</p>
```

### 4. Tab navigation

```tsx
<TabsList className="mb-5">
  <TabsTrigger value="…">…</TabsTrigger>
</TabsList>
```

Three tabs max per row; labels short and task-oriented.

### 5. KPI tile — `PerformanceTab` / `GenelPerformansTab`

```tsx
flex flex-col gap-3 rounded-2xl border border-border-default bg-surface-card p-4 shadow-sm
// Icon chip (h-9 w-9 rounded-xl) → value (text-2xl font-semibold tabular-nums) → label (text-xs text-text-tertiary)
```

### 6. Section card — analytics blocks

```tsx
rounded-2xl border border-border-default bg-surface-card p-5 shadow-sm
// Title: text-[11px] font-semibold uppercase tracking-wide text-text-tertiary mb-3
// Rows: divide-y divide-border-default/60
```

### 7. Progress / conversion bar

```tsx
// Track
h-1.5 overflow-hidden rounded-full bg-border-default/40
// Fill
h-full rounded-full bg-brand-blue transition-all   // or bg-rose-400 for loss reasons
```

### 8. Error & retry

```tsx
// Inline banner (Bugün tab)
rounded-lg border border-border-default bg-surface-card px-4 py-3 text-sm text-text-secondary
// With underline text button for retry

// Performance tabs
text-sm text-brand-red + underline "Tekrar dene" button
```

### 9. Inline alerts (VisitsCard hint)

```tsx
rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-700
// Include dark: variants when using semantic alert colors
```

### 10. Side panel integration

My Day opens `LeadDetailPanel` via shallow route `?selected={uuid}`. Any page with row click → panel should follow the same URL-driven pattern for consistency.

---

## Interaction & Feedback

| Pattern        | My Day approach                                                                     |
| -------------- | ----------------------------------------------------------------------------------- |
| Row hover      | `hover:bg-row-hover` — subtle, no border shift                                      |
| Primary CTA    | Filled `Button` default variant OR row-level ghost action button                    |
| Navigation CTA | `text-xs text-brand-blue hover:underline` or `Tümünü gör →` in `text-text-tertiary` |
| Loading        | Skeleton inside the card/tile being loaded — never full-page spinners for sections  |
| Empty          | Icon + short copy inside the card — never hide the card shell                       |
| Count badge    | `rounded-full bg-surface-page px-2 py-0.5 text-xs font-medium text-text-secondary`  |
| Urgency        | Amber chip for time-sensitive flags (e.g. 24h WhatsApp window)                      |

---

## Accessibility Checklist (project-specific)

- Radix primitives (`Tabs`, `Select`, `Dialog`) already handle focus — do not strip `focus-visible:ring-2 focus-visible:ring-ring`
- Row `div` click targets: ensure keyboard users have an equivalent path (panel open via button or link)
- Action buttons must be `type="button"` inside clickable rows
- `tabular-nums` helps screen magnification users scan metrics
- Respect `motion-reduce:animate-none` (see `TabsContent` animation)
- Minimum touch target: row `py-2.5` + action `py-1` — prefer `py-2.5` on standalone buttons (≥44px height with text-xs)

---

## Anti-Patterns (seen elsewhere — avoid)

| Don't                                                              | Do instead (My Day)                            |
| ------------------------------------------------------------------ | ---------------------------------------------- |
| Flat `Card` with `shadow-none` and `rounded-[10px]` for dashboards | `rounded-2xl shadow-sm` task/section cards     |
| Hardcoded `#2e3fa3` or raw `gray-*` for UI chrome                  | `brand-blue`, `text-text-*`, `border-border-*` |
| Full-width tables with no max-width on dashboard pages             | `max-w-[1400px]` content wrapper               |
| Spinner replacing entire page section                              | Inline `Skeleton` matching layout              |
| Missing empty state (blank card body)                              | `EmptyState` pattern from `TaskContainerCard`  |
| Inconsistent icon library                                          | `@tabler/icons-react`                          |
| Large filled buttons on every row                                  | Compact bordered `text-xs` action buttons      |
| Mixed border radii on same view                                    | `2xl` cards, `lg` rows, `xl` chips             |

---

## File Index

| Purpose                | Path                                                                |
| ---------------------- | ------------------------------------------------------------------- |
| Design tokens          | `styles/globals.css`                                                |
| Fonts                  | `pages/_document.tsx`                                               |
| App chrome             | `components/layout/AppShell.tsx`, `Topbar.tsx`, `Sidebar.tsx`       |
| **Gold standard page** | `pages/my-day.tsx`                                                  |
| Task containers        | `components/my-day/TaskContainerCard.tsx`, `config.ts`              |
| List rows              | `components/my-day/LeadTaskRow.tsx`                                 |
| Performance UI         | `components/my-day/PerformanceTab.tsx`, `GenelPerformansTab.tsx`    |
| KPI strip              | `components/my-day/CounterStrip.tsx` + `components/ui/kpi-card.tsx` |
| Shared UI              | `components/ui/*`                                                   |
