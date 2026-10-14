# Requirements — Priority Rankings Page

**System:** Intelligent Science Resource Gap Assessment, Prioritization and Intervention Tracking System (ISRGAPIT)  
**Feature:** Priority Rankings admin view  
**Audience:** Administrator, NGO, Field Coordinator  
**Date:** 2026-09-26

---

## 1. Purpose

The Priority Rankings page allows authorised users (primarily Administrators) to see all open resource requirements from underserved government schools, ranked by a computed composite priority score (0–100). The page enables data-driven intervention decisions: which gap to fund first, why, and how urgent it is.

---

## 2. Functional Requirements

### 2.1 Page Header

| # | Requirement |
|---|-------------|
| FR-01 | Display a breadcrumb trail: **Administrator › Priority Rankings** |
| FR-02 | Display a page title: **"Priority Rankings"** in the site's serif display typeface |
| FR-03 | Display a subtitle: *"Score (0–100) combines severity, importance, students affected, alternative availability and condition."* |
| FR-04 | Display the total count of matching requirements (e.g. "43 requirements") alongside the title or immediately below it |

### 2.2 Filter / Search Bar

| # | Requirement |
|---|-------------|
| FR-05 | Provide a free-text search input (placeholder: "Search schools, requirements…") that filters by `school_name`, `resource_name`, `district`, and `requirement_id` client-side |
| FR-06 | Provide a **Priority** dropdown filter: All priorities / Critical / High / Medium / Low |
| FR-07 | Provide a **Status** dropdown filter with all 9 `RequirementStatus` values plus "All statuses" |
| FR-08 | Provide a **District** dropdown filter, populated from unique districts in the fetched data |
| FR-09 | All filters compose (AND logic): the list narrows when multiple filters are set |
| FR-10 | Resetting any filter to its "All …" value removes that filter constraint |
| FR-11 | Filter state must be reflected in the URL via query-string params (`?priority=HIGH&status=OPEN&district=Kolar`) so the filtered view is bookmarkable and shareable |

### 2.3 Ranked Requirement Cards

Each requirement is displayed as a card, not a table row. Cards are ordered by `priorityScore` descending (highest urgency first).

| # | Requirement |
|---|-------------|
| FR-12 | Display a **rank number** (#1, #2, #3 …) based on post-filter sort position |
| FR-13 | Display the **urgency badge** (CRITICAL / HIGH / MEDIUM / LOW) with distinct colour and icon |
| FR-14 | Display the **workflow status badge** (OPEN / UNDER REVIEW / ACCEPTED / IN PROGRESS / etc.) with distinct colour and icon |
| FR-15 | Display the **Requirement ID** (e.g. REQ-001) in monospace |
| FR-16 | Display the **resource name** and **gap quantity** (e.g. "Student microscopes × 18") |
| FR-17 | Display the **school name** and **district** |
| FR-18 | Display the **composite priority score** (0–100, integer) as a large typographic number |
| FR-19 | Display the five score component bars (Severity, Importance, Students Affected, Alternative Availability, Condition), each showing a labelled horizontal progress bar and numeric value (0–100) |
| FR-20 | Display a **"View requirement"** button that navigates to `/requirements/:id` |
| FR-21 | Cards must be readable and usable on mobile (320 px viewport) — the score column and breakdown bars stack below the primary info |

### 2.4 Sorting & Ranking Logic

| # | Requirement |
|---|-------------|
| FR-22 | Default sort: `priorityScore` descending |
| FR-23 | Secondary sort tiebreaker: `requirement_id` ascending (stable ordering) |
| FR-24 | Score weights are configurable via a `SCORE_WEIGHTS` constant (not hardcoded arithmetic inline); default weights are: Severity 30%, Importance 25%, Students Affected 20%, Alternative Availability 15%, Condition 10% |
| FR-25 | When a `breakdown` object is present on a requirement, the client recomputes `priorityScore` from the weighted formula. When absent, `final_score` from the API is used directly |

### 2.5 Pagination

| # | Requirement |
|---|-------------|
| FR-26 | Display 10 cards per page |
| FR-27 | Show "N records" count on the left and "< Page X of Y >" navigation on the right |
| FR-28 | Pagination resets to page 1 when any filter changes |

### 2.6 Empty & Loading States

| # | Requirement |
|---|-------------|
| FR-29 | While data is loading, display a skeleton/loading indicator; do not show a broken empty list |
| FR-30 | When no requirements match the active filters, show a descriptive empty-state message (not a blank page) |
| FR-31 | API errors surface as a dismissable `GovAlert tone="error"` at the top of the list |

---

## 3. Data Model

### 3.1 `Requirement` (existing, used as-is)

```ts
interface Requirement {
  requirement_id: string;
  school_id: string;
  school_name: string;
  district: string;
  resource_name: string;
  category_name: string;
  gap_qty: number;
  gap_ratio: number;           // 0.0–1.0
  final_score: number;         // server-computed composite score 0–100
  priority_class: Priority;    // 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
  status: RequirementStatus;
  version: number;
  breakdown?: {
    severity: number;              // 0–100
    importance: number;            // 0–100
    students_affected: number;     // 0–100
    alternative_availability: number; // 0–100
    condition: number;             // 0–100
  };
}
```

### 3.2 `ScoreWeights` (new — client-side only)

```ts
interface ScoreWeights {
  severity: number;              // 0–1, must sum to 1.0 with the others
  importance: number;
  students_affected: number;
  alternative_availability: number;
  condition: number;
}

const DEFAULT_WEIGHTS: ScoreWeights = {
  severity: 0.30,
  importance: 0.25,
  students_affected: 0.20,
  alternative_availability: 0.15,
  condition: 0.10,
};
```

---

## 4. API

The page uses the existing `api.requirements.list()` endpoint. No new endpoints are needed.

```ts
api.requirements.list({
  page: 1,
  page_size: 200,          // fetch generous page; client handles pagination
  priority_class?: string,
  status?: string,
  district?: string,
})
```

Future: the backend may add `?sort=priority_score&order=desc` — the client should pass these when available.

---

## 5. Access Control

| Role | Access |
|------|--------|
| ADMIN | Full access |
| NGO | Full access (read-only; cannot accept from this page) |
| FIELD_COORDINATOR | Full access (read-only) |
| SCHOOL | Not exposed via sidebar link; route redirect to `/dashboard` |

---

## 6. Non-Functional Requirements

| # | Requirement |
|---|-------------|
| NFR-01 | All badge colours must meet WCAG 2.1 AA contrast (4.5:1 for text < 18px) |
| NFR-02 | All interactive elements must be keyboard-focusable with a visible saffron (#FF9933) focus ring |
| NFR-03 | Progress bars must carry `role="progressbar"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax` |
| NFR-04 | Cards must be implemented as `<article>` elements with an accessible `aria-label` |
| NFR-05 | Page must render correctly at 320 px, 768 px, and 1280 px+ |
| NFR-06 | Filter URL params must survive page refresh (persisted in `useSearchParams`) |
