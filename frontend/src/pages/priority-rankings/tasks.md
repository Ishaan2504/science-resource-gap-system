# Tasks — Priority Rankings Page

**System:** ISRGAPIT  
**Implements:** requirements.md + design.md  
**Status:** In progress

---

## Phase 1 — Spec (done)

- [x] T-01 Write requirements.md
- [x] T-02 Write design.md
- [x] T-03 Write tasks.md (this file)

---

## Phase 2 — Data

- [ ] T-04 Enrich all 6 mock `Requirement` objects in `api/mock.ts` with a `breakdown` object
       (severity, importance, students_affected, alternative_availability, condition)
       so that the ScoreBar component has real values to render in demo mode.

---

## Phase 3 — Components (`src/components/PriorityComponents.tsx`)

- [ ] T-05 Export `SCORE_WEIGHTS` constant and `computePriorityScore()` helper
- [ ] T-06 Export `ScoreBar` — labelled horizontal progress bar with aria attributes
- [ ] T-07 Export `StatusBadge` — icon-prefixed pill badge for urgency and workflow states
- [ ] T-08 Export `RankMedallion` — numbered circle, colour-coded by rank position
- [ ] T-09 Export `PriorityRankingCard` — full card composing all sub-components

---

## Phase 4 — Page (`src/pages/AnalysisPages.tsx`)

- [ ] T-10 Replace existing `PriorityPage` body with:
         - URL-persisted filter state via `useSearchParams`
         - Client-side search filter (q param)
         - Client-side pagination (page param, PAGE_SIZE = 10)
         - Card list rendering via `PriorityRankingCard`
         - Loading skeleton and empty state

---

## Phase 5 — Verification

- [ ] T-11 Run `tsc --noEmit` — zero errors
- [ ] T-12 Confirm all 6 mock requirements render with breakdown bars
- [ ] T-13 Confirm search, priority, status, district filters compose correctly
- [ ] T-14 Confirm URL params update on filter change and survive refresh
- [ ] T-15 Confirm "View requirement" navigates to `/requirements/:id`
