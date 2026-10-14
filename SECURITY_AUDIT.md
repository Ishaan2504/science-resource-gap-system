# RBAC Security Audit

**Scope:** Backend authorization and role-visible data in the current application. Reviewed the authentication middleware and routes in `backend/src`, database schema migrations, and the frontend's route guards. This is a code audit of the current working tree, which already contained unrelated uncommitted website, Android, feedback, and FAQ-assistant work. No changes were made to those unrelated files.

**Discovery policy:** NGOs may discover open, unassigned requirements from any verified school, regardless of configured service districts or focus areas, as requested. Once a requirement is assigned, it is visible only to that NGO and administrators.

## Role permission matrix

| Capability | School | NGO | Field coordinator | Admin |
|---|---|---|---|---|
| Register account | Yes | Yes | No | No |
| Read resource catalogues | Authenticated users | Authenticated users | Authenticated users | Yes |
| Create / read school profile | Create own; read own | No | Read assigned school | Read any school; verify/reject |
| Create / edit / submit assessments | Own school; FC may work only on assigned school | No | Assigned schools | Verify/reject; no ordinary assessment editing |
| Browse requirements | Own school | Global verified-school queue (unassigned OPEN/UNDER_REVIEW) plus own assignments | Assigned schools | Global |
| Accept / update interventions | No | Accept only when organization is verified; update own assigned work | No | Admin status actions |
| Requirement feedback | Confirm completed own-school work | Feedback on own assigned requirement | No | Admin feedback and oversight |
| Reports | Own-school history | Scoped summary of global public queue plus own assigned work | No | Summary, turnaround, coverage, and school history |
| User, organization, audit, scoring administration | No | No | No | Yes |
| Instructor/service/equipment feedback | Submit and read own | Submit and read own | Submit and read own | Review all submissions |
| FAQ assistant | Authenticated FAQ | Authenticated FAQ | Authenticated FAQ | Authenticated FAQ |

Routes for registration, login, refresh, and `/health` are intentionally unauthenticated. Logout and `/api/v1/session` require authentication. The API includes an additional `FIELD_COORDINATOR` role beyond School, NGO, and Admin.

## Findings and fixes

### Fixed in this audit

1. **High — NGO cross-organization requirement disclosure.** Requirement list/detail queries exposed requirements assigned to competing NGOs, including assignment/status/fulfillment information, intervention notes, and feedback. NGO lists/details now include the generalized public queue or their own assigned work only; detail views return only that NGO's safe intervention activity and school feedback. Other organizations' assigned requirements return not found. Accept, status, data-change acknowledgement, and NGO feedback mutations now require the currently verified assigned organization; guessed IDs for another NGO's work are not confirmed by the accept endpoint.
2. **High — school views exposed private intervention notes.** Requirement detail and school history returned full intervention objects and all feedback records. School responses now include only safe progress fields and School-source feedback; assignment IDs and NGO-only workflow flags are omitted. Admin retains full history.
3. **Medium — NGO summary reports aggregated other NGOs' operations.** Summary report aggregates are now scoped to the verified public queue plus the requesting NGO's assignments. An NGO without a verified organization profile receives empty summary data.
4. **Medium — stale-version errors returned records before ownership checks.** Acceptance, status, data-change acknowledgement, and School confirmation paths now check assignment/ownership first, and return only minimal version/status metadata on authorized conflicts.
5. **Medium — assessment edit and submit lacked explicit role gates.** Both endpoints now require School or Field Coordinator; submit also checks the assessment's school assignment. The API still verifies the assessment submitter.
6. **Medium — reading a requirement changed its status.** An NGO `GET` previously changed OPEN to UNDER_REVIEW and wrote status/audit events. The GET is now read-only; state changes remain on explicit mutation endpoints.

### Remaining observations

- Authorization is enforced by the API using a conventional PostgreSQL connection pool; there is no database row-level security. A database account with unnecessary write privileges would increase impact if an application flaw is reached. The configured database role could not be checked because no local backend environment/database was available.
- Authentication/assistant endpoints have no visible per-IP or per-account rate limiting in the reviewed Express app. Add deployment-level or application-level limits, especially for login/register and any configured paid AI provider.
- The FAQ assistant is authenticated but only receives the curated FAQ content; it has no tools or queries into school, NGO, or requirement data. Thus there is no role-aware data retrieval to audit. Its output is not an authorization control.
- Frontend route guards and hidden navigation are usability controls only. The backend must remain authoritative. The client also has a mock/demo mode with client-side role switching; do not treat its behavior as proof of server authorization.
- There are no separate upload/download, delivery, or intervention-management API routes in the reviewed backend. Those capabilities therefore were not independently testable as endpoints.
- Admin has broad global powers, including creating Admins and changing roles. Role changes are audited. No multi-admin scope/approval policy exists in this schema.

## Verification and limits

- Baseline backend and frontend production builds passed before the audit changes. Backend had no project-owned test script; three focused regression tests have now been added for NGO visibility and School-safe projections.
- After fixes: backend TypeScript build passed; all 3 regression tests passed; frontend production build passed. The frontend build reports an existing large-chunk warning (about 799 kB minified). `git diff --check` passed; Git printed existing LF-to-CRLF notices for frontend files.
- The host had no backend `.env`, PostgreSQL listener, or Redis listener. No database-backed authenticated API or two-tenant exploit test could be run. The new tests exercise the visibility/projection policy helpers, not live SQL execution. Live cross-tenant verification remains necessary after database services and test identities are available.
- No changes were pushed to GitHub.
