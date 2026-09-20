# ClubOps AI

**AI-powered event operations platform for college clubs — built for Bit N Build'26 Gujarat Round (PS-3).**

ClubOps AI centralizes everything a college club needs to run an event — tasks, volunteers, risks, documents, and announcements — and layers AI on top so the assistant doesn't just talk, it **acts**: it turns raw meeting notes into real task records, detects operational risks automatically, answers questions from your own event documents, and (with your confirmation) actually sends announcements to Discord.

The core design principle behind every AI feature here is the same: **AI proposes, a human confirms, and the application acts.**

---

## Project Resources & Demo Links

| Resource | Link | Description |
|---|---|---|
| 📑 **Postman Documentation** | [**View Postman API Docs**](https://documenter.getpostman.com/view/39215245/2sBYB1PUXp) | Complete interactive REST API endpoints collection & schemas |
| 🎬 **Demo Video** | [**Watch Video Demo**](https://drive.google.com/file/d/1a7klUylUJujVBxWSBzA87DN72HwHIqir/view?usp=sharing) | Full walkthrough of the platform, workflows, and AI actions |
| 📊 **Presentation Deck (PPT)** | [**View Slide Deck**](https://docs.google.com/presentation/d/1gjiB7T8e0K5bk7f84UPyEMnGXspEIwJx/edit?usp=sharing&ouid=111474338614420555356&rtpof=true&sd=true) | Hackathon project overview, architecture, and problem-solution fit |

---

## Table of Contents

1. [Project Resources & Demo Links](#project-resources--demo-links)
2. [Application Screenshots](#application-screenshots)
3. [Key Features](#key-features)
4. [Tech Stack](#tech-stack)
5. [System Architecture](#system-architecture)
6. [Database Schema (ER Diagram)](#database-schema-er-diagram)
7. [AI Workflows (Data Flow Diagrams)](#ai-workflows-data-flow-diagrams)
8. [Role Permissions Matrix](#role-permissions-matrix)
9. [Project Structure](#project-structure)
10. [Getting Started](#getting-started)
11. [Environment Variables](#environment-variables)
12. [API Reference & Postman](#api-reference)
13. [Demo Accounts](#demo-accounts)

---

## Application Screenshots

### 1. Operations Overview & Dashboard
Global operational console providing real-time metrics for registered clubs, active event counts, upcoming milestones, and quick role-based action triggers.

![Dashboard Overview](screenshots/dashboard-overview.png)

---

### 2. Multi-Club Event Management
Centralized event lifecycle management table allowing admins to track event schedules, cross-club operations, operational status badges, and direct action portals.

![Event Management](screenshots/event-management.png)

---

### 3. AI Meeting Notes to Structured Tasks
Extract actionable tasks, assignees, and deadlines from raw meeting notes or transcripts using Google Gemini AI, with mandatory human-in-the-loop confirmation before database persistence.

![AI Meeting Tasks](screenshots/ai-meeting-tasks.png)

---

## Key Features

- **Multi-tenant club management** — a platform-level Super Admin manages multiple clubs; each club has exactly one active Club Admin.
- **Event lifecycle management** — create, update, and track events through `upcoming → ongoing → completed / cancelled` states.
- **Volunteer roster** — assign club members to events with a specific responsibility and contact info.
- **Task management** — manual task CRUD plus AI-extracted tasks, tracked through `todo → in_progress → done / blocked`.
- **Meeting Notes → Tasks (Gemini AI)** — paste raw meeting notes and get back structured task suggestions (description, owner, deadline) that a human reviews before anything is written to the database.
- **Deterministic risk engine** — a rule-based system (not a black-box model) that detects overdue tasks, blocked tasks, unassigned tasks, and understaffed events, with deduplication and auto-resolution.
- **Document knowledge repository + RAG Q&A** — upload event documents (guidelines, schedules, venue details) and ask questions; answers are grounded strictly in retrieved content, with an explicit "not enough information" fallback instead of hallucinating.
- **AI-assisted announcements with real external action** — Gemini drafts an announcement, a human edits and confirms it, and only then does the backend dispatch it to a Discord webhook — the one step in the whole platform where the AI's output leaves the app and does something in the real world.
- **Role-based access control** — three roles (`SUPER_ADMIN`, `CLUB_ADMIN`, `VOLUNTEER`) enforced at the middleware level on every route, not just in the UI.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite, React Router v6, Tailwind CSS, lucide-react icons |
| Backend | Node.js + Express.js |
| Database | PostgreSQL (Neon / Supabase), accessed via `pg` (node-postgres) |
| AI | Google Gemini API (`@google/generative-ai`, model: `gemini-1.5-flash`) |
| Retrieval | Local PostgreSQL token/keyword relevance scoring, with optional Exa API for public search augmentation |
| External Action | Discord Webhook API |
| Auth | `bcrypt` (password hashing) + `jsonwebtoken` (JWT, 7-day expiry by default) |
| Tooling | `dotenv`, `cors`, `nodemon`, ESLint |

---

## System Architecture

```mermaid
graph TB
    subgraph Client["Client"]
        FE["React + Vite Frontend<br/>Tailwind CSS · React Router"]
    end

    subgraph Server["Express.js Backend"]
        API["REST API Layer<br/>(app.js)"]
        MW["Middleware<br/>auth · role · club · event"]
        CTRL["Controllers"]
        SVC["Service Layer<br/>gemini · risk · knowledge · announcement · discord · exa · task"]
    end

    subgraph External["External Services"]
        GEMINI["Google Gemini API"]
        DISCORD["Discord Webhook"]
        EXA["Exa Search API (optional)"]
    end

    subgraph Data["Data Layer"]
        PG[("PostgreSQL<br/>Neon / Supabase")]
    end

    FE -- "REST calls, JWT Bearer token" --> API
    API --> MW --> CTRL --> SVC
    SVC -- "SQL (pg pool)" --> PG
    SVC -- "task extraction, RAG synthesis, drafting" --> GEMINI
    SVC -- "confirmed send only" --> DISCORD
    SVC -- "optional public context" --> EXA
```

**Request flow:** every authenticated request passes through JWT verification (`auth.middleware.js`), then role authorization (`role.middleware.js`), then — for club- or event-scoped routes — a boundary check (`club.middleware.js` / `event.middleware.js`) that confirms the user actually belongs to the club/event they're trying to touch, before it ever reaches a controller.

---

## Database Schema (ER Diagram)

PostgreSQL, all primary keys are UUIDs (`gen_random_uuid()`), all foreign keys cascade or null-out per the relationship's meaning.

```mermaid
erDiagram
    CLUBS ||--o{ USERS : "has members"
    CLUBS ||--o{ EVENTS : organizes
    EVENTS ||--o{ VOLUNTEERS : "staffed by"
    USERS ||--o{ VOLUNTEERS : "assigned as"
    EVENTS ||--o{ TASKS : contains
    USERS ||--o{ TASKS : "assigned to"
    EVENTS ||--o{ RISKS : flags
    EVENTS ||--o{ DOCUMENTS : "knowledge base"
    EVENTS ||--o{ ANNOUNCEMENTS : sends

    CLUBS {
        uuid id PK
        varchar name UK
        text description
        text logo_url
        boolean is_active
        timestamptz created_at
        timestamptz updated_at
    }

    USERS {
        uuid id PK
        varchar name
        varchar email UK
        varchar password_hash
        varchar role "SUPER_ADMIN | CLUB_ADMIN | VOLUNTEER"
        uuid club_id FK
        boolean is_active
    }

    EVENTS {
        uuid id PK
        uuid club_id FK
        varchar name
        text description
        timestamptz event_date
        varchar status "upcoming | ongoing | completed | cancelled"
    }

    VOLUNTEERS {
        uuid id PK
        uuid event_id FK
        uuid user_id FK
        varchar responsibility
        varchar contact
    }

    TASKS {
        uuid id PK
        uuid event_id FK
        text description
        uuid assigned_to FK
        timestamptz deadline
        varchar status "todo | in_progress | done | blocked"
        varchar source "manual | ai_extracted"
    }

    RISKS {
        uuid id PK
        uuid event_id FK
        text description
        varchar severity "low | medium | high | critical"
        text suggested_action
        varchar status "open | resolved"
        varchar risk_code
    }

    DOCUMENTS {
        uuid id PK
        uuid event_id FK
        varchar title
        text content
        timestamptz uploaded_at
    }

    ANNOUNCEMENTS {
        uuid id PK
        uuid event_id FK
        text draft_text
        text final_text
        timestamptz sent_at
        varchar channel
    }
```

**Notable constraints beyond the base schema:**
- `idx_unique_active_club_admin` — a partial unique index ensuring at most one *active* `CLUB_ADMIN` per club.
- `idx_unique_open_risk_per_code` — a partial unique index ensuring at most one *open* risk per `(event_id, risk_code)`, which is what makes the risk engine idempotent instead of spamming duplicate risk rows every time detection runs.
- `volunteers` has a unique `(event_id, user_id)` pair — a user can't be double-assigned to the same event.

---

## AI Workflows (Data Flow Diagrams)

### 1. Meeting Notes → Tasks

The centerpiece feature: unstructured meeting notes become real, owned, deadlined task rows — but only after a human reviews and accepts them.

```mermaid
sequenceDiagram
    participant U as Club Admin
    participant FE as Frontend
    participant API as POST /api/ai/events/:id/meeting-tasks
    participant AI as Gemini Service
    participant DB as PostgreSQL

    U->>FE: Paste meeting notes (max 10,000 chars)
    FE->>API: POST /extract
    API->>AI: buildMeetingTaskPrompt(notes)
    AI-->>API: Structured task suggestions (JSON: description, owner, deadline, confidence)
    Note over API,DB: No database write yet
    API-->>FE: Task suggestion cards
    FE-->>U: Review — accept / edit / discard each suggestion
    U->>FE: Confirm selected suggestions
    FE->>API: POST /accept (batch)
    API->>DB: BEGIN — INSERT tasks (source='ai_extracted', status='todo')
    DB-->>API: COMMIT — created task rows
    API-->>FE: Success
    FE-->>U: Task board updates live
```

### 2. Deterministic Risk Detection

Explicitly **rule-based**, not a trained model — every flagged risk has a traceable, explainable cause.

```mermaid
sequenceDiagram
    participant U as Club Admin
    participant API as POST /api/events/:id/risks/detect
    participant SVC as Risk Service (rule engine)
    participant DB as PostgreSQL

    U->>API: Trigger detection
    API->>SVC: Evaluate event's tasks & volunteer counts
    SVC->>DB: BEGIN TRANSACTION
    SVC->>DB: Open/reopen newly detected risks (deduped via risk_code)
    SVC->>DB: Auto-resolve risks that no longer apply
    DB-->>SVC: COMMIT
    SVC-->>API: Open risks, sorted CRITICAL → HIGH → MEDIUM → LOW
    API-->>U: Risk list with severity + suggested action
```

| Risk Code | Condition | Severity |
|---|---|---|
| `OVERDUE_TASK` | Deadline passed, status ≠ `done` | High |
| `BLOCKED_TASK` | Status is `blocked` | High |
| `UNASSIGNED_TASK` | No assignee, status ≠ `done` | Medium |
| `NO_VOLUNTEERS` | Event has 0 volunteers (upcoming/ongoing) | High |
| `LOW_VOLUNTEER_COUNT` | Fewer than `RISK_MIN_VOLUNTEERS` (default 3) | Medium |
| `MULTIPLE_BLOCKED_TASKS` | 3+ blocked tasks | Critical |

### 3. Knowledge Repository RAG Q&A

Answers are grounded strictly in retrieved document content — if nothing relevant is found, the system says so instead of guessing.

```mermaid
sequenceDiagram
    participant U as User (own club, any role)
    participant API as POST /api/ai/events/:id/knowledge/query
    participant KS as Knowledge Service
    participant DB as PostgreSQL (documents)
    participant EXA as Exa API (optional)
    participant AI as Gemini

    U->>API: Ask a question
    API->>KS: retrieve(question)
    KS->>DB: Token/keyword relevance scoring over event documents
    alt No relevant context found
        KS-->>API: "Could not find enough information"
    else Relevant chunks found
        KS->>EXA: (optional) supplementary public search
        KS->>AI: Synthesize answer, strictly grounded in retrieved context
        AI-->>KS: Answer + source citations
        KS-->>API: Answer + document sources
    end
    API-->>U: Grounded answer with citations (no hallucination)
```

### 4. AI Announcement Draft → Human Edit → Real Discord Send

The one workflow where the AI's output leaves the application entirely.

```mermaid
sequenceDiagram
    participant U as Club Admin
    participant API as Announcement Endpoints
    participant AI as Gemini
    participant DB as PostgreSQL
    participant DC as Discord Webhook

    U->>API: POST /ai/.../announcements/generate
    API->>AI: Draft a professional announcement
    AI-->>API: Draft text
    API->>DB: INSERT (draft_text, sent_at = NULL)
    API-->>U: Draft returned for review
    U->>API: PUT /.../announcements/:id (edit final_text)
    API->>DB: UPDATE final_text
    U->>API: POST /.../announcements/:id/send
    API->>DC: Dispatch message
    alt Discord failure
        DC-->>API: Error
        API-->>U: 502 Bad Gateway (sent_at stays NULL)
    else Discord success
        DC-->>API: OK
        API->>DB: UPDATE sent_at = NOW(), channel = 'discord'
        API-->>U: 200 OK (a second send attempt returns 409 Conflict)
    end
```

---

## Role Permissions Matrix

| Resource & Action | Super Admin | Club Admin | Volunteer |
|---|:---:|:---:|:---:|
| Clubs: create / update / activate / deactivate | ✅ | ❌ | ❌ |
| Clubs: assign admin / volunteers | ✅ | ❌ | ❌ |
| Clubs: view details / members / summary | ✅ any | ✅ own club | ❌ |
| Events: create | ✅ any active club | ✅ own active club | ❌ |
| Events: list / view details | ✅ any | ✅ own club | ✅ own club |
| Events: update / change status / cancel | ✅ any | ✅ own club | ❌ |
| Event volunteers: list | ✅ any | ✅ own club | ✅ own club |
| Event volunteers: assign / update / remove | ✅ any | ✅ own club | ❌ |
| Tasks: create / update / delete | ✅ any | ✅ own club | ❌ |
| Tasks: list / view | ✅ any | ✅ own club | ✅ own club |
| Tasks: update status | ✅ any | ✅ own club | ✅ assigned task only |
| AI: extract meeting-note suggestions | ✅ any | ✅ own club | ❌ |
| AI: accept batch suggestions | ✅ any | ✅ own club | ❌ |
| Risks: run detection | ✅ any | ✅ own club | ❌ |
| Risks: list / view | ✅ any | ✅ own club | ✅ own club |
| Risks: resolve / reopen / explain | ✅ any | ✅ own club | ❌ |
| Documents: create / update / delete | ✅ any | ✅ own club | ❌ |
| Documents: list / view content | ✅ any | ✅ own club | ✅ own club |
| Knowledge: RAG query | ✅ any | ✅ own club | ✅ own club |
| Announcements: generate draft | ✅ any | ✅ own club | ❌ |
| Announcements: list / view | ✅ any | ✅ own club | ✅ own club |
| Announcements: edit final text | ✅ any | ✅ own club | ❌ |
| Announcements: send to Discord | ✅ any | ✅ own club | ❌ |

---

## Project Structure

```
Bit-N-Build-26-Hackathon/
├── frontend/                      # React + Vite SPA
│   ├── src/
│   │   ├── components/
│   │   │   ├── announcements/     # Generate, edit, preview, send modals
│   │   │   ├── auth/              # ProtectedRoute, RoleRoute
│   │   │   ├── clubs/             # Club CRUD, admin assignment modals
│   │   │   ├── documents/         # Document CRUD + viewer
│   │   │   ├── events/            # Event CRUD, status/cancel modals
│   │   │   ├── knowledge/         # RAG Q&A tab
│   │   │   ├── layout/            # AppShell, Sidebar, Topbar, MobileDrawer
│   │   │   ├── meetingTasks/      # Notes form, suggestion cards, results
│   │   │   ├── risks/             # Risk list, resolve, AI explanation modals
│   │   │   ├── tasks/             # Task CRUD + status modal
│   │   │   ├── ui/                # Shared primitives (Button, Modal, Card, etc.)
│   │   │   └── volunteers/        # Add/edit/remove volunteer, "my assignment"
│   │   ├── config/demoAccounts.js # Env-driven demo login credentials
│   │   ├── context/                # AuthContext, ToastContext
│   │   ├── lib/                    # api.js (fetch wrapper), auth.js (token storage)
│   │   ├── pages/                  # One page per route (Dashboard, Events, Tasks, ...)
│   │   └── routes/index.jsx        # All route definitions + role guards
│   └── package.json
│
└── server/                        # Express REST API
    ├── database/
    │   ├── migrate.js / seed.js
    │   ├── migrations/             # 001 initial schema → 006 risk_code
    │   └── seeds/                  # Demo clubs/events + super admin
    ├── src/
    │   ├── app.js / server.js      # Express app + graceful shutdown
    │   ├── config/database.js      # pg Pool
    │   ├── controllers/            # One per resource (auth, club, event, task, risk, document, announcement, ai, ...)
    │   ├── middleware/             # auth, role, club-boundary, event-boundary
    │   ├── routes/                 # auth, club, event, document, announcement, ai
    │   ├── services/
    │   │   ├── gemini.service.js       # Meeting-notes extraction (+ rule-based fallback)
    │   │   ├── risk.service.js         # Deterministic risk rule engine
    │   │   ├── riskExplanation.service.js
    │   │   ├── knowledge.service.js    # RAG retrieval + synthesis
    │   │   ├── announcement.service.js
    │   │   ├── discord.service.js      # Webhook dispatch
    │   │   ├── exa.service.js          # Optional public search
    │   │   └── prompts/                # Prompt builders per AI feature
    │   ├── scripts/                # createSuperAdmin.js, seedDemoAccounts.js
    │   └── utils/auth.js
    └── package.json
```

---

## Getting Started

### 1. Clone & install

```bash
git clone https://github.com/VasaraSujal/Bit-N-Build-26-Hackathon.git
cd Bit-N-Build-26-Hackathon

# Backend
cd server && npm install

# Frontend
cd ../frontend && npm install
```

### 2. Configure environment variables

Copy each `.env.example` and fill in real values (see [Environment Variables](#environment-variables)):

```bash
# from server/
cp .env.example .env

# from frontend/
cp .env.example .env
```

### 3. Set up the database

From `server/`:

```bash
npm run migrate          # runs all SQL files in database/migrations/ in order
npm run seed              # seeds demo clubs + events
npm run create:superadmin # optional: create your own super admin (see below)
```

To create a bootstrap super admin with your own credentials:

```bash
SUPER_ADMIN_NAME="Super Admin" \
SUPER_ADMIN_EMAIL="admin@clubops.ai" \
SUPER_ADMIN_PASSWORD="YourSecurePassword123" \
npm run create:superadmin
```

Or seed the pre-built demo accounts (Super Admin, Club Admin, Volunteer) with `npm run seed` followed by the `seedDemoAccounts.js` script — see [Demo Accounts](#demo-accounts).

### 4. Run the app

```bash
# Terminal 1 — backend (from server/)
npm run dev      # nodemon, http://localhost:5000

# Terminal 2 — frontend (from frontend/)
npm run dev      # vite, http://localhost:5173
```

Visit `http://localhost:5173`, log in with a demo account, and you're in.

---

## Environment Variables

### Backend (`server/.env`)

| Variable | Description | Example |
|---|---|---|
| `PORT` | API server port | `5000` |
| `DATABASE_URL` | PostgreSQL connection string (Neon/Supabase) | `postgresql://user:pass@host:5432/postgres` |
| `JWT_SECRET` | Secret used to sign JWTs | `your_jwt_secret` |
| `JWT_EXPIRES_IN` | Token lifetime | `7d` |
| `GEMINI_API_KEY` | Google Gemini API key | — |
| `GEMINI_MODEL` | Gemini model name | `gemini-1.5-flash` |
| `EXA_API_KEY` | Optional — enables public search augmentation in RAG | — |
| `DISCORD_WEBHOOK_URL` | Discord channel webhook for announcement sending | — |
| `RISK_MIN_VOLUNTEERS` | Threshold below which `LOW_VOLUNTEER_COUNT` fires | `3` |

### Frontend (`frontend/.env`)

| Variable | Description | Example |
|---|---|---|
| `VITE_API_BASE_URL` | Backend API base URL | `http://localhost:5000/api` |
| `VITE_DEMO_SUPER_ADMIN_EMAIL` / `_PASSWORD` | One-click demo login | — |
| `VITE_DEMO_CLUB_ADMIN_EMAIL` / `_PASSWORD` | One-click demo login | — |
| `VITE_DEMO_VOLUNTEER_EMAIL` / `_PASSWORD` | One-click demo login | — |

---

## API Reference

> 📘 **Interactive API Documentation**: Explore and test all endpoints with request/response schemas directly on the [**Official Postman Documenter**](https://documenter.getpostman.com/view/39215245/2sBYB1PUXp).

All routes except `/api/auth/register` and `/api/auth/login` require `Authorization: Bearer <token>`. Routes under `/api/clubs/:clubId` and `/api/events/:eventId` additionally enforce that the user belongs to that specific club/event.

### Auth — `/api/auth`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/register` | Public | Register a new user |
| POST | `/login` | Public | Log in, receive JWT |
| GET | `/me` | Authenticated | Get current user profile |

### Clubs — `/api/clubs`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/` | Super Admin | Create a club |
| GET | `/` | Super Admin | List all clubs |
| PUT | `/:clubId` | Super Admin | Update club details |
| PATCH | `/:clubId/activate` \| `/deactivate` | Super Admin | Toggle club status |
| PATCH | `/:clubId/admin` | Super Admin | Assign / replace club admin |
| PATCH | `/:clubId/volunteers/:userId` | Super Admin | Assign volunteer to club |
| DELETE | `/:clubId/volunteers/:userId` | Super Admin | Remove volunteer from club |
| GET | `/:clubId` \| `/members` \| `/summary` | Super Admin, own Club Admin | Club details / members / summary |
| GET | `/:clubId/events` | Super Admin, own club (all roles) | List a club's events |

### Events — `/api/events`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/` | Super Admin, Club Admin | Create event |
| GET | `/` | All roles | List events |
| GET | `/:eventId` | All roles (own club) | Event details |
| PUT | `/:eventId` | Super Admin, Club Admin | Update event |
| PATCH | `/:eventId/status` | Super Admin, Club Admin | Change status |
| PATCH | `/:eventId/cancel` | Super Admin, Club Admin | Cancel event |

### Event Volunteers — `/api/events/:eventId/volunteers`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/` | All roles (own club) | List event volunteers |
| POST | `/` | Super Admin, Club Admin | Assign volunteer |
| PUT | `/:volunteerId` | Super Admin, Club Admin | Update assignment |
| DELETE | `/:volunteerId` | Super Admin, Club Admin | Remove assignment |
| GET | `/my-assignment` | All roles | Current user's own assignment |

### Tasks — `/api/events/:eventId/tasks`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/` | All roles (own club) | List tasks |
| POST | `/` | Super Admin, Club Admin | Create task |
| GET | `/:taskId` | All roles (own club) | Task details |
| PUT | `/:taskId` | Super Admin, Club Admin | Update task |
| PATCH | `/:taskId/status` | All roles* | Update status (*Volunteer: assigned task only) |
| DELETE | `/:taskId` | Super Admin, Club Admin | Delete task |

### Risks — `/api/events/:eventId/risks`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/detect` | Super Admin, Club Admin | Run rule-based risk detection |
| GET | `/` | All roles (own club) | List risks |
| GET | `/:riskId` | All roles (own club) | Risk details |
| PATCH | `/:riskId/resolve` \| `/reopen` | Super Admin, Club Admin | Change risk status |
| POST | `/:riskId/explain` | Super Admin, Club Admin | AI-generated plain-language explanation |

### Documents — `/api/events/:eventId/documents`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/` | Super Admin, Club Admin | Upload document |
| GET | `/` | All roles (own club) | List metadata (content omitted) |
| GET | `/:documentId` | All roles (own club) | Full document content |
| PUT | `/:documentId` | Super Admin, Club Admin | Update document |
| DELETE | `/:documentId` | Super Admin, Club Admin | Delete document |

### Announcements — `/api/events/:eventId/announcements`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| GET | `/` | All roles (own club) | List announcements |
| GET | `/:announcementId` | All roles (own club) | Announcement details |
| PUT | `/:announcementId` | Super Admin, Club Admin | Edit / finalize text |
| POST | `/:announcementId/send` | Super Admin, Club Admin | Dispatch to Discord |

### AI — `/api/ai`

| Method | Endpoint | Access | Description |
|---|---|---|---|
| POST | `/events/:eventId/meeting-tasks/extract` | Super Admin, Club Admin | Extract task suggestions from notes (no DB write) |
| POST | `/events/:eventId/meeting-tasks/accept` | Super Admin, Club Admin | Batch-create accepted suggestions (atomic transaction) |
| POST | `/events/:eventId/knowledge/query` | All roles (own club) | RAG Q&A over event documents |
| POST | `/events/:eventId/announcements/generate` | Super Admin, Club Admin | Generate AI draft (does not send) |

---

## Demo Accounts

Seeded via `npm run seed` + the demo-accounts script, all sharing the password `Test@12345` (change these before any real deployment):

| Role | Email | Password |
|---|---|---|
| Super Admin | `superadmin@clubops.ai` | `Test@12345` |
| Club Admin | `clubadmin@example.com` | `Test@12345` |
| Volunteer | `volunteer@example.com` | `Test@12345` |

The frontend login page reads these from `VITE_DEMO_*` environment variables and offers one-click "Continue as ..." buttons for each role — useful for a fast, reliable live demo.

---

## Hackathon Context

Built for **Bit N Build'26 — Gujarat Round**, addressing **PS-3: ClubOps AI**. The problem statement asks for a centralized, AI-powered event operations platform where the AI layer doesn't just generate text but performs real application actions. That requirement is satisfied concretely in two places in this codebase: the meeting-notes-to-tasks pipeline writes real, owned, deadlined task rows into the database after human review, and the announcement workflow dispatches a human-confirmed, AI-drafted message to a live Discord webhook.