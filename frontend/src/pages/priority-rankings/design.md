# Design — Priority Rankings Page

**System:** ISRGAPIT  
**Stack:** React 18 · TypeScript · Tailwind CSS v4 · Recharts · Lucide React  
**Design system:** GovUI (government-blue #0f3460 / white / grey palette, Source Serif 4 display, Inter body)

---

## 1. Information Architecture

```
/priorities
├── Page header
│   ├── Breadcrumb (Administrator › Priority Rankings)
│   ├── Title + record count
│   └── Subtitle
├── Filter bar (inline row)
│   ├── Search input
│   ├── Priority dropdown
│   ├── Status dropdown
│   └── District dropdown
└── Ranked list
    ├── PriorityRankingCard × N
    │   ├── Rank medallion
    │   ├── Badges (urgency + status)
    │   ├── Identity block (ID · resource × qty · school · district)
    │   ├── Score column (large number + label)
    │   ├── Breakdown (5 × ScoreBar)
    │   └── "View requirement" button
    └── Pagination footer (record count + page nav)
```

---

## 2. Component Tree

```
PriorityPage                    ← page container, data fetching, filter state
  FilterBar                     ← inline search + 3 dropdowns
  PriorityRankingCard           ← article card for one requirement
    RankMedallion               ← #N number circle
    StatusBadge (urgency)       ← CRITICAL / HIGH / MEDIUM / LOW
    StatusBadge (workflow)      ← OPEN / UNDER REVIEW / etc.
    ScoreDisplay                ← large serif number + "priority score" label
    ScoreBar × 5               ← labelled progress bar + numeric value
  PaginationFooter              ← record count + prev/next buttons
```

All new components live in `frontend/src/components/PriorityComponents.tsx`.  
`PriorityPage` replaces the current implementation in `frontend/src/pages/AnalysisPages.tsx`.

---

## 3. Visual Design

### 3.1 Layout

- Canvas: `bg-[#f4f6f9]` (existing site canvas colour)
- Cards: `bg-white border border-[#e5e7eb] rounded-md` — slightly more rounded than the standard `rounded-sm` used in tables, to differentiate "card" from "panel"
- Card spacing: `mb-3` between cards, `px-5 py-4` internal padding
- Responsive: single column on mobile, two-column layout on ≥1280 px (score column moves to the right side of each card)

### 3.2 Card anatomy

```
┌─────────────────────────────────────────────────────────────────────┐
│  #1  [↑ CRITICAL]  [● OPEN]                            REQ-001      │
│                                                                       │
│  Student microscopes × 18               ┌──────────────────────┐    │
│  Govt. Higher Secondary School, Kolar   │         87           │    │
│                                         │   priority score     │    │
│  Severity           ████████░░  84      └──────────────────────┘    │
│  Importance         ███████░░░  79                                   │
│  Students Affected  ██████░░░░  72     [View requirement →]         │
│  Alt. Availability  ██████░░░░  70                                   │
│  Condition          █████░░░░░  62                                   │
└─────────────────────────────────────────────────────────────────────┘
```

**On mobile** (< 768 px): score display moves below the resource name; breakdown bars are full-width below.

### 3.3 Rank Medallion

- Circle `w-9 h-9` with `bg-[#0f3460]` fill and white `#N` text in Inter 700
- Rank 1: `bg-[#0f3460]`
- Ranks 2–3: `bg-[#1b3f73]`  
- Ranks 4+: `bg-[#4b6077]`
- Displayed at the top-left of the card

### 3.4 StatusBadge (new component — supersedes using GovBadge for priority)

A more expressive badge than GovBadge — adds an icon prefix and slightly taller pill.

| Value | Icon | Background | Text | Border |
|-------|------|------------|------|--------|
| CRITICAL | `AlertOctagon` | `#fef2f2` | `#7f1d1d` | `#fca5a5` |
| HIGH | `ArrowUp` | `#fffbeb` | `#78350f` | `#fcd34d` |
| MEDIUM | `Minus` | `#eff6ff` | `#1e3a8a` | `#93c5fd` |
| LOW | `ArrowDown` | `#f8fafc` | `#374151` | `#cbd5e1` |
| OPEN | `Circle` | `#eff6ff` | `#1e3a8a` | `#93c5fd` |
| UNDER_REVIEW | `Clock` | `#fffbeb` | `#78350f` | `#fcd34d` |
| ACCEPTED | `CheckCircle` | `#f0fdf4` | `#14532d` | `#86efac` |
| IN_PROGRESS | `Loader` | `#fffbeb` | `#78350f` | `#fcd34d` |
| PARTIALLY_COMPLETED | `PieChart` | `#fffbeb` | `#78350f` | `#fcd34d` |
| COMPLETED | `CheckCircle2` | `#f0fdf4` | `#14532d` | `#86efac` |
| NOT_FEASIBLE | `XCircle` | `#fef2f2` | `#7f1d1d` | `#fca5a5` |
| DISPUTED | `AlertTriangle` | `#fef2f2` | `#7f1d1d` | `#fca5a5` |
| CLOSED | `Lock` | `#f8fafc` | `#374151` | `#cbd5e1` |

### 3.5 ScoreBar (new component)

```
Label          ██████████░░░░░░  84
```

- Label: Inter 12px, `text-[#4b6077]`, fixed width `w-40` on desktop, full-width on mobile
- Bar: `h-2 rounded-full bg-[#e5e7eb]` track, fill colour by value:
  - ≥ 75: `#b91c1c` (critical red)
  - ≥ 55: `#d97706` (amber)
  - < 55: `#1b3f73` (government navy)
- Numeric value: Inter 12px bold, tabular-nums, `text-[#0f2540]`, right-aligned `w-8`
- `role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}`

### 3.6 Score Display

- Number: Source Serif 4, 48px, weight 700, `text-[#0f2540]`, tabular-nums
- Label: Inter 11px uppercase tracked, `text-[#6b7c93]`
- Rendered inside a right-aligned block on desktop, below resource name on mobile

### 3.7 Filter bar

Matches the design already established on the Requirements page:
- `bg-white border border-[#e5e7eb] rounded-md px-4 py-3 mb-4`
- Search: `<Search>` icon, `w-48` input
- Three `<select>` dropdowns with chevron icons

### 3.8 Pagination footer

- `flex items-center justify-between px-0 py-3 text-xs text-[#6b7c93]`
- Left: "N records"
- Right: `‹ Page X of Y ›`

---

## 4. Scoring Logic (client-side)

```ts
const DEFAULT_WEIGHTS = {
  severity: 0.30,
  importance: 0.25,
  students_affected: 0.20,
  alternative_availability: 0.15,
  condition: 0.10,
};

function computeScore(breakdown: BreakdownFactors, weights = DEFAULT_WEIGHTS): number {
  return Math.round(
    breakdown.severity              * weights.severity +
    breakdown.importance            * weights.importance +
    breakdown.students_affected     * weights.students_affected +
    breakdown.alternative_availability * weights.alternative_availability +
    breakdown.condition             * weights.condition,
  );
}
```

When `breakdown` is absent, `final_score` is used directly and no client recomputation occurs.

---

## 5. URL State

Filter state is persisted in `useSearchParams`:

| Param | Values |
|-------|--------|
| `q` | free-text search string |
| `priority` | `CRITICAL` \| `HIGH` \| `MEDIUM` \| `LOW` |
| `status` | any `RequirementStatus` value |
| `district` | district name string |
| `page` | integer ≥ 1 |

---

## 6. File Structure

```
frontend/src/
├── components/
│   └── PriorityComponents.tsx     ← StatusBadge, ScoreBar, PriorityRankingCard
├── pages/
│   ├── AnalysisPages.tsx          ← PriorityPage rewritten here (exports unchanged)
│   └── priority-rankings/
│       ├── requirements.md
│       ├── design.md
│       └── tasks.md
```

No new routes, no new API endpoints, no new TypeScript types needed.
