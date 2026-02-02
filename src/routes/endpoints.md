# Endpoints to Create

This list covers API endpoints needed to support the UI in `web/` beyond the existing `/api/auth`, `/api/users`, and `/images` routes.

## Dashboard / Overview
- GET /api/dashboard/summary — totals for requirements, effort, risks, team size, and project snapshot
- GET /api/dashboard/effort-by-category?range=week — data for the "This week's effort by category" table
- GET /api/dashboard/recent-activity — latest requirement, effort, and risk updates
- GET /api/dashboard/attention-needed — items needing follow-up (no-effort requirements, high risks, etc.)

## Requirements
- GET /api/requirements — list with filters (type, status, priority, search, paging)
- GET /api/requirements/summary — counts for overview cards
- POST /api/requirements — create a requirement
- GET /api/requirements/:id — requirement detail
- PATCH /api/requirements/:id — update requirement (status, priority, tags, acceptance criteria)
- POST /api/requirements/:id/archive — archive or restore
- GET /api/requirements/:id/effort — effort totals + last entry for a requirement
- GET /api/requirements/export — CSV export

## Effort
- GET /api/effort — list entries with filters (date range, user, category, requirement)
- POST /api/effort — create an effort entry
- GET /api/effort/:id — effort entry detail
- PATCH /api/effort/:id — update an effort entry
- DELETE /api/effort/:id — remove an effort entry
- GET /api/effort/summary — totals by requirement and category
- GET /api/effort/recent — recent effort entries for the Effort page and dashboard
- GET /api/effort/export — CSV export

## Risks
- GET /api/risks — list with filters (status, likelihood, impact, search)
- GET /api/risks/summary — counts for the risk snapshot
- POST /api/risks — create a risk
- GET /api/risks/:id — risk detail
- PATCH /api/risks/:id — update risk details
- PATCH /api/risks/:id/status — quick status update
- GET /api/risks/:id/updates — history/notes timeline
- POST /api/risks/:id/updates — add a risk update note
- GET /api/risks/:id/mitigation — mitigation plan (if stored separately)
- PATCH /api/risks/:id/mitigation — update mitigation plan
- GET /api/risks/export — CSV export

## Project Settings
- GET /api/project-settings — project info + effort defaults (used by dashboard and settings page)
- PATCH /api/project-settings — update project info + defaults
- GET /api/project-settings/change-log — change history

## Team (gaps not covered by existing /api/users endpoints)
- POST /api/team/invite — invite a member (email + create pending account)
- GET /api/team/export — export roster (CSV)

## Reference Data (optional if you do not want hardcoded lists)
- GET /api/lookup/requirement-statuses
- GET /api/lookup/requirement-priorities
- GET /api/lookup/requirement-types
- GET /api/lookup/effort-categories
- GET /api/lookup/risk-statuses
- GET /api/lookup/risk-likelihoods
- GET /api/lookup/risk-impacts
- GET /api/lookup/roles
