# ClubOps AI — Product Requirements Document

**Hackathon:** Bit N Build'26 Gujarat Round — PS-3
**Build window:** 24 hours
**Target cost:** $0 (free-tier stack only)

---

## 1. Problem Statement (as given)

College clubs run events using a scattered mix of WhatsApp groups, spreadsheets, notes, and personal task lists. As events scale up, managing tasks, volunteers, deadlines, documents, risks, and communication becomes hard to track. The ask is a centralized, AI-powered event operations platform that brings these activities into one place — and where possible, has the AI layer actually *perform* actions inside the app rather than only generating text.

---

## 2. Product Vision

ClubOps AI is a single dashboard where a club committee plans and runs an event. Instead of manually re-reading meeting notes to figure out who owes what, the AI reads the notes for you, creates the tasks, assigns owners, and flags risks — turning unstructured club chatter into a structured, tracked event plan.

The differentiator judges should walk away remembering: **you don't just chat with an AI about your event — the AI edits your event.**

---

## 3. Goals

- Give a club committee one place to track tasks, volunteers, deadlines, documents, and announcements for an event.
- Let the AI convert raw meeting notes / text dumps into actual task records (owner + deadline), not just a text summary.
- Surface risks in plain language before they become problems (e.g., no volunteer assigned to registration desk 2 days before the event).
- Provide a simple knowledge layer so committee members can ask questions about past decisions/documents instead of scrolling WhatsApp.
- Demonstrate a real "AI performs an action" moment live, on stage, during the demo.

## 4. Non-Goals (explicitly out of scope for the 24-hour build)

- Full authentication/roles system beyond a single shared login or magic-link stub.
- Real SMS/WhatsApp integration (simulated via Discord/Slack webhook instead — see Section 9).
- Multi-club / multi-tenant support.
- Mobile app — responsive web only.
- Production-grade RAG (vector DB with re-ranking, etc.) — a lightweight retrieval approach is enough to prove the concept.

---

## 5. Target User / Persona

**Primary persona:** Riya, third-year CSE student and event lead for her college's tech club, organizing a 300-person hackathon. She currently juggles a WhatsApp group, a shared Google Doc, and her own memory. She needs to know: what's still undone, who owns it, and what could go wrong — without re-reading every message.

---

## 6. Feature List (mapped to problem statement deliverables)

Each item is tagged **MVP** (build in the 24 hours) or **Stretch** (mention in the pitch as roadmap, build only if time remains).

| # | Feature | Deliverable it satisfies | Priority |
|---|---|---|---|
| 1 | Event creation + dashboard shell | AI-assisted event planning | MVP |
| 2 | Task board (create/edit/assign/status) | Task and volunteer management | MVP |
| 3 | Volunteer roster with role assignment | Task and volunteer management | MVP |
| 4 | Meeting-notes-to-tasks AI pipeline | Meeting-note processing, automatic action-item extraction, automatic task-owner/deadline identification | **MVP — core differentiator** |
| 5 | Risk detection panel | Risk identification and explanation | MVP |
| 6 | Document repository + AI Q&A (lightweight RAG) | Club document and knowledge repository | MVP |
| 7 | AI-drafted announcement generator | AI-assisted announcements and communication | MVP |
| 8 | Announcement "send" action → Discord/Slack webhook | AI-assisted workflows that perform application actions | **MVP — core differentiator** |
| 9 | Deadline calendar view | Deadlines | Stretch |
| 10 | Meeting scheduler / minutes archive | Meetings | Stretch |
| 11 | Role-based permissions | (implied, not core) | Stretch |
| 12 | Analytics (task completion rate, overdue count) | Supporting insight | Stretch |

---

## 7. Core User Stories

1. As an event lead, I paste raw meeting notes into a text box, and the system creates individual task cards with an owner and a deadline, so I don't have to manually re-type them.
2. As a committee member, I open the dashboard and immediately see what's overdue, what's at risk, and what's assigned to me.
3. As an event lead, I ask "what did we decide about the sponsor booth?" and the system answers from the uploaded documents instead of me searching WhatsApp.
4. As an event lead, I click "Generate announcement" for a deadline reminder, review the AI-drafted text, and click "Send" — and it actually posts to the team channel.
5. As an event lead, I see a flagged risk ("No volunteer assigned to Registration Desk, event is in 2 days") before it becomes a live-event problem.

---

## 8. Functional Requirements & AI Workflow Detail

### 8.1 Meeting-Notes → Tasks Pipeline (core feature)
- **Input:** free-text box (paste minutes, a WhatsApp export snippet, or typed notes).
- **Processing:** one LLM call with a structured-output prompt (JSON-only response) that extracts an array of `{ task_description, suggested_owner, suggested_deadline, confidence }`.
- **Output:** each extracted item is shown as a review card — user can accept, edit, or discard — before it's written to the task table. This "review before commit" step is both a UX safety net and a good talking point for judges (AI proposes, human confirms, then AI acts).
- **Action performed:** on accept, the system inserts real rows into the tasks table and updates the dashboard live — this is the "AI performs an actual application action" requirement, satisfied concretely.

### 8.2 Risk Detection
- **Approach for 24 hours:** rule-based checks dressed with an LLM-generated explanation, rather than a trained risk model (out of scope for the time budget).
- **Example rules:** task overdue and unassigned; a role/desk with zero volunteers within N days of the event; a task marked "blocked" with no update in 48 hours.
- **AI's role:** given the raw signal (e.g., "Registration Desk: 0 volunteers, event in 2 days"), generate a one-line, human-readable risk explanation and a suggested next step. This keeps the AI's value visible without needing a trained model.

### 8.3 Document Repository + Lightweight RAG
- Upload plain text / markdown docs (skip PDF parsing to save build time unless time allows).
- Store doc chunks with simple keyword + embedding similarity search (can use a free embeddings endpoint, or fall back to keyword search if time is short — keyword search is a legitimate fallback to state explicitly in the pitch).
- Q&A box: user question → retrieve top matching chunks → LLM call to answer using only retrieved context → answer shown with a "source" reference to the original doc.

### 8.4 Announcement Generation + Action
- Input: announcement type (deadline reminder, schedule change, general update) + free-text context.
- LLM generates a draft message.
- User reviews/edits, clicks Send.
- **Action performed:** backend posts the message to a Discord or Slack webhook URL configured for the "team channel" — this is the real, demoable action, standing in for SMS/WhatsApp/email in production.

---

## 9. Technical Architecture

```
┌─────────────┐      ┌──────────────┐      ┌───────────────┐
│  Next.js     │◄────►│  Node/Express │◄────►│  PostgreSQL    │
│  Frontend    │ REST │  Backend      │      │  (Neon/Supabase)│
└─────────────┘      └──────┬───────┘      └───────────────┘
                             │
                     ┌───────┴────────┐
                     │  Gemini API     │  (free tier — extraction,
                     │  (LLM calls)    │   risk explanations, Q&A,
                     └────────────────┘   announcement drafting)
                             │
                     ┌───────┴────────┐
                     │ Discord/Slack   │  (webhook — simulates
                     │ Webhook         │   "send announcement" action)
                     └────────────────┘
```

- **Frontend:** Next.js + Tailwind CSS (matches your existing stack from PillNear/VendorBridge).
- **Backend:** Node.js + Express, REST API.
- **Database:** PostgreSQL via Neon or Supabase free tier (or Mongo Atlas free tier if you'd rather move faster with a schema-less store given the time limit).
- **AI:** Gemini API (1.5/2.0 Flash) — genuinely free tier, no card required, sufficient for demo-scale calls.
- **"Action" channel:** Discord or Slack incoming webhook — free, instant to set up, and visibly "does something" on stage.
- **Hosting:** Vercel (frontend, free) + Render/Railway (backend, free tier) or run the backend locally during the live demo to avoid cold-start delays.

**Total cost: $0**, provided all of the above stay on free tiers and no paid SMS/telephony provider is wired in.

---

## 10. Data Model (simplified)

**Event**
`id, name, date, description`

**Task**
`id, event_id, description, owner, deadline, status (todo/in_progress/done/blocked), source (manual/ai_extracted), created_at`

**Volunteer**
`id, event_id, name, role, contact`

**Risk**
`id, event_id, description, severity, suggested_action, status (open/resolved), created_at`

**Document**
`id, event_id, title, content, uploaded_at`

**Announcement**
`id, event_id, draft_text, final_text, sent_at, channel`

---

## 11. 24-Hour Build Plan

| Hours | Work |
|---|---|
| 0–3 | Repo setup, schema, basic Next.js shell, seed one demo event with realistic fake data |
| 3–8 | Task board CRUD + volunteer roster (manual create/edit first, no AI yet) |
| 8–13 | **Meeting-notes-to-tasks AI pipeline** (the centerpiece — prioritize this over polish elsewhere) |
| 13–16 | Risk detection panel (rule checks + AI-generated explanation text) |
| 16–19 | Document repo + lightweight Q&A |
| 19–21 | Announcement generator + Discord/Slack webhook "send" action |
| 21–23 | UI polish pass, seed realistic demo data, fix obvious bugs |
| 23–24 | Rehearse the live demo script (see Section 12) |

If time runs short, cut in this order: analytics → deadline calendar → document Q&A → risk panel. **Never cut the meeting-notes-to-tasks pipeline or the announcement "send" action** — those two are what prove the "AI performs actual actions" requirement, which is the differentiator this problem statement is explicitly scored on.

---

## 12. Demo Script (for judges)

1. Open the dashboard for a pre-seeded event ("TechFest 2026") already showing a few tasks and one open risk.
2. Paste in a chunk of realistic, messy meeting notes live. Show the AI extracting 3–4 tasks with owners and deadlines. Accept them — watch the board update in real time.
3. Point at the risk panel — show a flagged risk with its AI-written explanation.
4. Ask the document Q&A box a question about an uploaded doc, get a sourced answer.
5. Generate an announcement, edit one line, click Send — switch to a Discord channel and show the message land there live. This is the moment to land hardest: it's the AI genuinely acting, not just talking.

---

## 13. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| LLM extraction returns malformed JSON | Force structured output with a strict prompt + JSON schema; wrap parsing in try/catch with a manual-entry fallback |
| Gemini free-tier rate limits during demo | Cache/pre-run key demo calls beforehand; have a backup recorded response if live call fails |
| Backend cold-start delay on free hosting | Run backend locally for the live demo instead of relying on a sleeping free instance |
| Running out of time for RAG piece | Fall back to keyword search over documents — still answers the requirement, just simpler |
| Judges question "is the AI really acting or just showing text?" | The Discord webhook send and the real task-row insert are both genuine side effects — call this out explicitly during the demo |

---

## 14. Success Criteria (for the hackathon)

- All MVP-tagged features in Section 6 are functional end-to-end on a seeded demo event.
- The meeting-notes-to-tasks flow and the announcement-send flow both work live, without needing a recorded backup.
- The pitch explicitly names the "AI performs actual application actions" requirement and points to the two concrete moments that satisfy it.
