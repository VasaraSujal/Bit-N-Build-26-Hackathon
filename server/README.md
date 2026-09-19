# ClubOps AI - Backend (Parts 1 to 10: Foundation to AI-Assisted Announcements & External Action)

ClubOps AI is an AI-powered event operations platform for college clubs. This backend provides core API services, relational data persistence, secure JWT authentication, multi-tenant club management, event operations, volunteer assignments, task management, Google Gemini AI meeting transcript task extraction, deterministic rule-based operational risk detection & management, event-scoped document knowledge repositories with RAG Q&A, and AI-assisted announcements with human-confirmed external Discord webhook execution.

## Tech Stack
- **Runtime:** Node.js (JavaScript)
- **Framework:** Express.js
- **Database:** PostgreSQL (Supabase / Neon)
- **Driver / Pooling:** `pg` (node-postgres)
- **AI Integration:** Google Gemini API (`@google/generative-ai`)
- **Search / Retrieval:** Local PostgreSQL token ranking + Optional Exa API (`EXA_API_KEY`)
- **External Action:** Discord Webhook API (`DISCORD_WEBHOOK_URL`)
- **Authentication:** `bcrypt` (password hashing) & `jsonwebtoken` (JWT tokens)
- **Environment Management:** `dotenv`
- **CORS:** `cors`

---

## Getting Started

### 1. Install Dependencies
Navigate into the `server` directory and install packages:
```bash
cd server
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to create your local `.env` file:
```bash
cp .env.example .env
```

Edit `.env` and configure your settings:
```env
PORT=5000
DATABASE_URL=postgresql://username:password@db.<project-ref>.supabase.co:5432/postgres
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-1.5-flash
EXA_API_KEY=your_exa_api_key
DISCORD_WEBHOOK_URL=your_discord_webhook_url
RISK_MIN_VOLUNTEERS=3
```

---

## Database Migrations & Seeds

### Run Migrations
Executes all SQL files in `server/database/migrations/` in sequence:
```bash
npm run migrate
```

### Run Seed Data
Seeds demo clubs and events:
```bash
npm run seed
```

### Bootstrap Initial Super Admin Account
```bash
SUPER_ADMIN_NAME="Super Admin" SUPER_ADMIN_EMAIL="admin@clubops.ai" SUPER_ADMIN_PASSWORD="YourSecurePassword123" npm run create:superadmin
```

---

## AI Announcements & External Action Workflow (Part 10)

ClubOps AI ensures that **AI proposes, human confirms, and application acts**:

```
Organizer Request (`POST /api/ai/events/:eventId/announcements/generate`)
    │
    ▼
Gemini Generates Professional Draft (Draft saved in DB, NO external action)
    │
    ▼
Organizer Reviews / Edits Final Text (`PUT /api/events/:eventId/announcements/:announcementId`)
    │
    ▼
Organizer Explicitly Confirms Send (`POST /api/events/:eventId/announcements/:announcementId/send`)
    │
    ▼
Discord Webhook Service Dispatches Message
    │
    ├── [Discord Failure] ──► Keep `sent_at = NULL`, return 502 Bad Gateway
    │
    ▼
[Discord Success]
 └── Update Database: `sent_at = NOW()`, `channel = 'discord'`
 └── Return 200 OK (Future send attempts return 409 Conflict)
```

### Announcement Endpoints

| Method | Endpoint | Access Roles | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/ai/events/:eventId/announcements/generate` | `SUPER_ADMIN`, `CLUB_ADMIN` | Generates AI draft announcement and saves it to DB with `status = 'draft'` |
| `GET` | `/api/events/:eventId/announcements` | `SUPER_ADMIN`, `CLUB_ADMIN`, `VOLUNTEER` | Lists all announcements for an event (newest first) |
| `GET` | `/api/events/:eventId/announcements/:announcementId` | `SUPER_ADMIN`, `CLUB_ADMIN`, `VOLUNTEER` | Retrieves single announcement with event boundary check |
| `PUT` | `/api/events/:eventId/announcements/:announcementId` | `SUPER_ADMIN`, `CLUB_ADMIN` | Edits/finalizes announcement text (`finalText`) without sending |
| `POST` | `/api/events/:eventId/announcements/:announcementId/send` | `SUPER_ADMIN`, `CLUB_ADMIN` | Explicitly triggers Discord webhook dispatch and records `sent_at` |

---

## Documents & Knowledge Repository (RAG) (Part 9)

ClubOps AI empowers clubs to maintain an event-scoped knowledge base of guidelines, schedules, and venue details, allowing organizers and volunteers to query event knowledge using Retrieval-Augmented Generation (RAG):

```
User Query (`POST /api/ai/events/:eventId/knowledge/query`)
    │
    ▼
Verify Event & Club Boundary Authorization
    │
    ▼
Local Document Retrieval (PostgreSQL Token/Keyword Relevance Scoring)
    │
    ├── [No Relevant Context] ──► Return "Could not find enough information" (No Hallucinations)
    │
    ▼
Top Relevant Document Chunks + Optional Public Exa Search
    │
    ▼
Google Gemini RAG Synthesis (Strict grounding & source citation)
    │
    ▼
Response with Answer & Document Source Citations
```

### Document Endpoints

| Method | Endpoint | Access Roles | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/events/:eventId/documents` | `SUPER_ADMIN`, `CLUB_ADMIN` | Uploads a knowledge document (`title`, `content`) |
| `GET` | `/api/events/:eventId/documents` | `SUPER_ADMIN`, `CLUB_ADMIN`, `VOLUNTEER` | Lists document metadata (id, title, timestamps; full content omitted for performance) |
| `GET` | `/api/events/:eventId/documents/:documentId` | `SUPER_ADMIN`, `CLUB_ADMIN`, `VOLUNTEER` | Retrieves full document content |
| `PUT` | `/api/events/:eventId/documents/:documentId` | `SUPER_ADMIN`, `CLUB_ADMIN` | Updates document title or content |
| `DELETE` | `/api/events/:eventId/documents/:documentId` | `SUPER_ADMIN`, `CLUB_ADMIN` | Deletes document |

### Knowledge Query Endpoint (RAG)

- **Route:** `POST /api/ai/events/:eventId/knowledge/query`
- **Access:** `SUPER_ADMIN`, `CLUB_ADMIN` (own club), `VOLUNTEER` (own club)

---

## Risk Detection & Management (Part 8)

ClubOps AI utilizes a **rule-based, deterministic** risk detection engine executed inside a database transaction with deduplication and auto-resolution:

```
Trigger Detection (`POST /api/events/:eventId/risks/detect`)
    │
    ▼
Check Event Tasks & Volunteer Counts (Rule-based evaluation)
    │
    ▼
Database Transaction (BEGIN)
 ├── Open/Reopen newly detected risks (Prevent duplicates via idx_unique_open_risk_per_code)
 ├── Auto-resolve obsolete risks (Preserve audit history without deleting)
 └── COMMIT
    │
    ▼
Return Open Risks sorted by Severity Priority (CRITICAL > HIGH > MEDIUM > LOW)
```

### Risk Detection Rules

| Risk Code | Condition | Severity | Suggested Action |
| :--- | :--- | :---: | :--- |
| `OVERDUE_TASK` | Task deadline < current time and status != `done` | `HIGH` | Review task, contact assignee, update deadline or complete task |
| `BLOCKED_TASK` | Task status is `blocked` | `HIGH` | Identify blocker and assign action owner to unblock task |
| `UNASSIGNED_TASK` | Task `assigned_to` is NULL and status != `done` | `MEDIUM` | Assign task to an appropriate club member |
| `NO_VOLUNTEERS` | Event has 0 volunteers (for `upcoming` or `ongoing` events) | `HIGH` | Assign volunteers before event operations begin |
| `LOW_VOLUNTEER_COUNT` | Event has > 0 and < `RISK_MIN_VOLUNTEERS` (default: 3) | `MEDIUM` | Recruit or assign additional volunteers |
| `MULTIPLE_BLOCKED_TASKS` | Event has 3 or more blocked tasks | `CRITICAL` | Review blocked tasks immediately and resolve blockers |

---

## Gemini AI Meeting Notes → Tasks Workflow (Part 7)

```
Meeting Notes (Text, Max 10,000 chars)
    │
    ▼
Gemini AI Analysis (`POST /api/ai/events/:eventId/meeting-tasks/extract`)
    │
    ▼
Structured Task Suggestions + Conservative Member Resolution
    │
    ▼
Human Review (Client/Dashboard checks suggestions, NO DB writes)
    │
    ▼
Batch Acceptance (`POST /api/ai/events/:eventId/meeting-tasks/accept`)
    │
    ▼
Atomic Database Transaction (Created with `source = 'ai_extracted'`, `status = 'todo'`)
```

---

## Role Permissions Matrix

| Resource & Action | `SUPER_ADMIN` | `CLUB_ADMIN` | `VOLUNTEER` |
| :--- | :---: | :---: | :---: |
| **Clubs: Create / Update / Toggle Status** | ✅ | ❌ | ❌ |
| **Clubs: Assign Admin / Volunteers** | ✅ | ❌ | ❌ |
| **Clubs: View Details / Members / Summary** | ✅ Any | ✅ Own Club | ❌ |
| **Events: Create Event** | ✅ Any Active Club | ✅ Own Active Club | ❌ |
| **Events: List Events / View Details** | ✅ Any Event | ✅ Own Club Event | ✅ Own Club Event |
| **Events: Update Event / Status / Cancel** | ✅ Any Event | ✅ Own Club Event | ❌ |
| **Event Volunteers: List Volunteers** | ✅ Any Event | ✅ Own Club Event | ✅ Own Club Event |
| **Event Volunteers: Assign / Update / Remove** | ✅ Any Event | ✅ Own Club Event | ❌ |
| **Tasks: Create / Update / Delete Task** | ✅ Any Event | ✅ Own Club Event | ❌ |
| **Tasks: List Tasks / View Task Details** | ✅ Any Event | ✅ Own Club Event | ✅ Own Club Event |
| **Tasks: Update Task Status** | ✅ Any Event | ✅ Own Club Event | ✅ Assigned Task Only |
| **AI: Extract Meeting Notes Suggestions** | ✅ Any Event | ✅ Own Club Event | ❌ |
| **AI: Accept Batch AI Suggestions** | ✅ Any Event | ✅ Own Club Event | ❌ |
| **Risks: Run Deterministic Detection** | ✅ Any Event | ✅ Own Club Event | ❌ |
| **Risks: List / View Risks** | ✅ Any Event | ✅ Own Club Event | ✅ Own Club Event |
| **Risks: Resolve / Reopen Risk** | ✅ Any Event | ✅ Own Club Event | ❌ |
| **Risks: Explain Risk (AI / Fallback)** | ✅ Any Event | ✅ Own Club Event | ❌ |
| **Documents: Create / Update / Delete** | ✅ Any Event | ✅ Own Club Event | ❌ |
| **Documents: List Metadata / View Content** | ✅ Any Event | ✅ Own Club Event | ✅ Own Club Event |
| **Knowledge: Query (RAG Q&A)** | ✅ Any Event | ✅ Own Club Event | ✅ Own Club Event |
| **Announcements: Generate AI Draft** | ✅ Any Event | ✅ Own Club Event | ❌ |
| **Announcements: List / View** | ✅ Any Event | ✅ Own Club Event | ✅ Own Club Event |
| **Announcements: Edit Final Text** | ✅ Any Event | ✅ Own Club Event | ❌ |
| **Announcements: Send to Discord** | ✅ Any Event | ✅ Own Club Event | ❌ |



