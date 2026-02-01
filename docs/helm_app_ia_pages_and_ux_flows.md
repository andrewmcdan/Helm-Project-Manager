# Helm App IA, Pages, and UX Flows

This document defines Helm’s top-level pages, what content belongs on each page, and the main user flows. It is designed for a Node.js + Express + Postgres web app with token-based auth, multi-user, and a single global project.

---

## 0. Product assumptions

- Helm supports **one global project** shared by all authenticated users.
- Users must sign in to access any project data.
- Core domains (from your CP):
  - Project Info (description, owner, team members)
  - Requirements (functional and non-functional)
  - Effort logging (daily or weekly) tied to requirements and activity categories
  - Risks (with status)

---

## 1. Top-level navigation

Recommended top nav (left sidebar or top bar):

1. Dashboard
2. Requirements
3. Effort
4. Risks
5. Team
6. Project Settings
7. Help

Account menu (top right):
- Profile
- Sign out

If you want the absolute minimum MVP, you can merge Team + Project Settings into a single “Project” page, but keeping them separate improves clarity.

---

## 2. Page-by-page content and actions

### 2.1 Dashboard

**Goal:** One screen that answers “what should I do next?” and “what’s happening?”

**Content**
- Project header: project name (Helm), owner/PM name, brief description
- Quick stats tiles:
  - Total requirements (functional, non-functional)
  - Total effort logged (this week, cumulative)
  - Risks open (by status)
- “This week’s effort by category” summary (table or small chart)
- “Recently updated” list (latest requirements edited, latest effort entries, latest risk changes)
- “Attention needed” panel (optional MVP):
  - Requirements with no effort logged
  - Risks in high status (for example: High / Active)

**Primary actions**
- Add requirement
- Log effort
- Add risk

**Secondary actions**
- View all requirements
- View effort report

---

### 2.2 Requirements (Index)

**Goal:** Create and manage functional and non-functional requirements.

**Content**
- Tab switch: Functional | Non-functional
- Filter/search:
  - Search text
  - Status (Proposed, Approved, In Progress, Done, Deferred)
  - Priority (Low, Medium, High)
- Requirements table columns:
  - ID (FR-001, NFR-001)
  - Title
  - Status
  - Priority
  - Total effort (hours)
  - Last updated

**Primary actions**
- Create requirement

**Row actions**
- View details
- Edit
- Archive (soft delete)

---

### 2.3 Requirement Details

**Goal:** One place to see requirement definition and all effort logged against it.

**Content**
- Header: ID + title + status + priority
- Requirement body:
  - Description
  - Acceptance criteria (simple bullet list)
  - Type (Functional or Non-functional)
  - Tags (optional)
- Effort summary:
  - Total hours by category
  - Total hours overall
- Effort entries list (most recent first):
  - Date
  - User
  - Category
  - Hours
  - Notes

**Primary actions**
- Log effort for this requirement (prefills requirement)

**Secondary actions**
- Edit requirement
- Change status

---

### 2.4 Effort (Log Entry)

**Goal:** Make it fast to enter effort, correctly, every time.

**Content**
- Mode: Daily | Weekly (radio)
- Form fields:
  - Date or week range
  - Requirement (searchable dropdown)
  - Category (Req Analysis, Design, Coding, Testing, Project Mgmt)
  - Hours (numeric, allow 0.25 increments if you want)
  - Notes

**Primary actions**
- Save effort entry

**UX safeguards**
- Inline validation for hours (positive, reasonable max)
- Prevent saving without a requirement
- Show “remaining this week” is optional, but not required

---

### 2.5 Effort (Overview)

**Goal:** Let users see totals by requirement and by category.

**Content**
- Filters:
  - Date range (This week, Last week, This month, Custom)
  - User (All users or individual)
  - Category (All or one)
- Two core tables (MVP-compliant):
  1) Totals by requirement
     - Requirement ID, Title, Total hours
  2) Totals by category
     - Category, Total hours
- Export (optional): CSV download

**Primary actions**
- Log effort

---

### 2.6 Risks (Index)

**Goal:** Track known risks and their current status.

**Content**
- Risk list table:
  - Risk ID
  - Title
  - Description (short)
  - Likelihood (Low/Med/High)
  - Impact (Low/Med/High)
  - Status (Open, Monitoring, Mitigating, Closed)
  - Owner (optional)
  - Last updated
- Filters:
  - Status
  - Likelihood
  - Impact

**Primary actions**
- Add risk

**Row actions**
- View/edit risk
- Update status

---

### 2.7 Risk Details

**Goal:** Provide enough detail to be useful, without becoming a full risk register tool.

**Content**
- Title, description
- Likelihood, impact, status
- Mitigation plan (free text)
- Notes / updates timeline (optional): small append-only log

**Primary actions**
- Update risk (status, mitigation)

---

### 2.8 Team

**Goal:** Manage team member list for the project.

**Content**
- Team member list:
  - Name
  - Email/username
  - Role (Admin, Member) or (Project Manager, Contributor)
  - Status (Active/Inactive)
- Invite/add user (depends on your auth model)

**Primary actions**
- Add member

**MVP note**
- If you do not implement invites, you can keep this page as a read-only list sourced from your user table.

---

### 2.9 Project Settings

**Goal:** Maintain global project info.

**Content**
- Project description (editable)
- Owner/PM name (editable)
- Basic defaults (optional):
  - Default effort entry mode (daily/weekly)
  - Default week start day

**Primary actions**
- Save project settings

---

### 2.10 Help

**Goal:** Reduce confusion and guide correct usage.

**Content**
- What Helm is
- How to add requirements
- How to log effort (with examples)
- Definitions:
  - Functional vs non-functional
  - Effort categories
  - Risk likelihood vs impact
- Troubleshooting:
  - Can’t sign in
  - Missing requirements in dropdown

---

### 2.11 Profile (Account)

**Goal:** Basic account management.

**Content**
- Display name
- Email
- Change password (optional)
- API token session info (optional)

---

## 3. Core UX and action flows

### Flow A: First login and initial setup
1. User signs in
2. If project has no owner/description yet:
   - Prompt to complete Project Settings (lightweight onboarding)
3. User lands on Dashboard

Success criteria:
- User can see project header and empty states with clear “Add your first…” actions.

---

### Flow B: Add requirements
1. Navigate to Requirements
2. Click “Create requirement”
3. Choose type: Functional or Non-functional
4. Enter title, description, acceptance criteria, priority, status
5. Save
6. Redirect to Requirement Details

Empty state UX:
- When no requirements exist, show CTA button and an example requirement.

---

### Flow C: Log effort (most frequent action)
Option 1 (global):
1. Navigate to Effort → Log Entry
2. Select requirement, category, hours, date/week, notes
3. Save
4. Show success toast and “Log another” or “View requirement”

Option 2 (contextual):
1. Open Requirement Details
2. Click “Log effort” (requirement preselected)
3. Save
4. Return to Requirement Details with updated totals

Guardrails:
- Always require requirement selection
- Always require category selection

---

### Flow D: Review totals
1. Navigate to Effort → Overview
2. Select date range
3. Review totals by requirement and category
4. (Optional) Export CSV

---

### Flow E: Add and manage risks
1. Navigate to Risks
2. Add risk
3. Set likelihood, impact, status, mitigation plan
4. Update status over time

---

## 4. MVP data model (high level)

You can implement pages cleanly if your schema supports these tables:

- users
- sessions or tokens (depending on implementation)
- project (single row)
- team_members (or user roles for project)
- requirements
- effort_entries
- risks

Minimum important fields:
- requirements: id, type, title, description, status, priority, created_at, updated_at
- effort_entries: id, requirement_id, user_id, date, hours, category, notes
- risks: id, title, description, likelihood, impact, status, mitigation, updated_at

---

## 5. UI patterns that keep the UX clean

- Consistent primary CTA per page (Add requirement, Log effort, Add risk)
- Empty states with a single sentence and one button
- Use “Details” pages for deep information, keep Index pages scannable
- Avoid modal overload. Prefer dedicated create/edit pages or in-page forms

---

## 6. Suggested build order (fast path)

1. Requirements Index + Create + Details
2. Effort Log Entry (with requirement dropdown)
3. Effort Overview totals (by requirement, by category)
4. Risks Index + Create/Edit
5. Dashboard (aggregate views)
6. Team + Project Settings
7. Help + Profile polish

