# Teams IT Help Desk Bot

An enterprise Microsoft Teams bot that helps employees resolve common IT issues using a **Retrieval-Augmented Generation (RAG)** pipeline. Searches approved IT documentation, provides grounded answers with citations, escalates to human support via ticket forms, and includes an analytics dashboard to identify knowledge gaps.

---

## Product Overview

Employees ask IT questions in Teams. The bot:

1. **Searches** a curated IT knowledge base (password resets, VPN, MFA, Wi-Fi, printers, email, software, laptop setup)
2. **Answers** using only verified documentation — never guesses or hallucinates
3. **Translates** queries and responses for multilingual teams
4. **Remembers context** across follow-up questions in the same conversation
5. **Cites sources** so employees can read the full article
6. **Escalates** when it can't help — Adaptive Card form creates a support ticket routed to ServiceNow, Jira, or Power Automate
7. **Shows outage alerts** — proactive notifications about known IT incidents
8. **Logs every question** and surfaces analytics on a live dashboard

### Example Conversations

```
Employee: How do I reset my password?
Bot:      You can reset your password using Self-Service Password Reset [Source 1]:
          1. Go to https://passwordreset.microsoftonline.com
          2. Enter your company email address
          3. Complete the CAPTCHA verification
          4. Choose a verification method
          5. Follow the prompts to create a new password
          Sources: password-reset.md
          [Helpful] [Not Helpful]

Employee: What if I'm locked out?
Bot:      (using conversation context from the previous question)
          If your account is locked after too many failed attempts [Source 1]:
          1. Wait 30 minutes for the automatic unlock
          2. Or contact IT Support at ext. 4357 for an immediate unlock
          Sources: password-reset.md

Employee: ¿Cómo configuro la VPN?
Bot:      (detects Spanish, searches in English, responds in Spanish)
          Puede configurar la VPN siguiendo estos pasos [Source 1]:
          1. Abra la aplicación Company Portal...
          Sources: vpn-setup.md

Employee: Can I bring my personal drone to the office?
Bot:      I couldn't find a verified answer for that in our IT documentation.
          [Create IT Support Ticket]
```

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                          Microsoft Teams                             │
│    Employee asks: "How do I set up VPN?"                             │
└─────────────────────────────┬────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────────┐
│  Express Server + Bot Framework SDK                                  │
│                                                                      │
│  ┌────────────┐  ┌───────────┐  ┌────────────┐  ┌──────────────┐   │
│  │ Translator  │─▶│ Retriever  │─▶│ Responder   │─▶│ Translator    │   │
│  │ (detect)   │  │ (search)  │  │ (LLM+cite) │  │ (respond)    │   │
│  └────────────┘  └─────┬─────┘  └──────┬─────┘  └──────────────┘   │
│                        │               │                             │
│  ┌─────────────────────▼───────────────▼────────────────────────┐   │
│  │              VectorStore Factory                              │   │
│  │  ┌─────────────────┐      ┌──────────────────────────────┐   │   │
│  │  │ InMemoryStore    │      │ Azure AI Search               │   │   │
│  │  │ (dev: cosine sim)│      │ (prod: vector+BM25+reranking)│   │   │
│  │  └─────────────────┘      └──────────────────────────────┘   │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌──────────────┐  ┌────────────────┐  ┌─────────────────────┐     │
│  │ Conversation  │  │ Notification   │  │ Escalation          │     │
│  │ Memory       │  │ Service        │  │ Service             │     │
│  │ (multi-turn) │  │ (outage alerts)│  │ (webhook routing)   │     │
│  └──────────────┘  └────────────────┘  └──────┬──────────────┘     │
│                                                │                     │
│                                     ┌──────────▼──────────┐         │
│                                     │ Power Automate      │         │
│                                     │ ServiceNow / Jira   │         │
│                                     └─────────────────────┘         │
│                                                                      │
│  ┌──────────────────┐  ┌──────────────────────────┐                 │
│  │ Question Logger   │─▶│ Analytics Service         │                 │
│  │ (JSONL)          │  │ (dashboard + API)        │                 │
│  └──────────────────┘  └──────────────────────────┘                 │
└──────────────────────────────────────────────────────────────────────┘
                              ▲
┌─────────────────────────────┴────────────────────────────────────────┐
│  Document Ingester (startup + scheduled cron)                        │
│  Local files ───┐                                                    │
│  SharePoint ────┼──▶ Chunker (512 tok, sentence-aware) ──▶ Embed    │
│  (Graph API)    │                                                    │
└──────────────────────────────────────────────────────────────────────┘
```

### Request Lifecycle

```
User message
  │
  ├─ Adaptive Card action? ──▶ Handle feedback / escalation form / ticket submit
  │
  └─ Text query
       │
       ├─ Show active outage notifications (if any)
       ├─ Detect language + translate to English (if translation enabled)
       ├─ Load conversation history for multi-turn context
       ├─ Embed query → search vector store (cosine similarity, top N)
       │
       ├─ Top score < threshold? ──▶ "Can't verify" + offer escalation card
       │
       └─ Top score >= threshold
            ├─ Build grounded prompt with retrieved chunks + conversation history
            ├─ Call LLM (temperature=0, max 1024 tokens)
            ├─ Translate response back to user's language
            ├─ Store in conversation memory
            ├─ Log question + outcome
            └─ Return Adaptive Card with answer + sources + feedback buttons
```

---

## Key Design Decisions

| Decision | Reasoning |
|---|---|
| **VectorStore factory pattern** | Swaps between in-memory (dev) and Azure AI Search (prod: hybrid vector + BM25 + semantic reranking) without changing any business logic |
| **Confidence threshold gating** | Short-circuits before the LLM call when retrieval is weak — eliminates hallucination and saves API cost |
| **Sentence-aware chunking** | 512-token chunks with 50-token overlap that never split mid-sentence — preserves semantic coherence |
| **Conversation memory with TTL** | Map-based per-conversation history with automatic cleanup after 30 minutes of inactivity — no external dependencies for demo |
| **JSONL question logging** | Append-only, grep-friendly format that feeds the analytics dashboard — no database needed |
| **Webhook-based escalation routing** | Category-aware routing to ServiceNow (hardware/software), Jira (all tickets), and Power Automate — each webhook is optional |
| **Translation via LLM** | Uses the same Azure OpenAI deployment for language detection and translation — no separate service needed |
| **Proactive notifications** | In-memory notification store with expiry — bot shows active alerts before answering each question |
| **Fake embeddings in dev** | Deterministic character-based vectors let the full RAG pipeline run locally with zero Azure credentials |

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Runtime** | Node.js 18+, TypeScript (strict) |
| **Bot Framework** | Bot Framework SDK v4 (Teams channel) |
| **LLM** | Azure OpenAI (GPT-4 / GPT-3.5) |
| **Embeddings** | Azure OpenAI `text-embedding-ada-002` (1536-dim) |
| **Search (prod)** | Azure AI Search (hybrid vector + BM25, semantic reranking) |
| **Search (dev)** | In-memory cosine similarity |
| **Document Sources** | Local markdown, SharePoint (Graph API), PDF support |
| **Escalation** | Power Automate, ServiceNow, Jira (webhook routing) |
| **Scheduling** | node-cron for periodic re-indexing |
| **Auth** | Azure AD via `@azure/identity` |
| **Validation** | Zod schema for all environment config |
| **Testing** | Jest with 80% coverage enforcement |
| **CI/CD** | GitHub Actions |
| **Dashboard** | Zero-dependency HTML + vanilla JS |

---

## Folder Structure

```
src/
  index.ts                         # Express server + API routes + service wiring
  config/
    config.ts                      # Zod-validated environment configuration
  bot/
    helpDeskBot.ts                 # TeamsActivityHandler — message routing + card actions
    cards/
      welcomeCard.ts               # Welcome message with topic list
      answerCard.ts                # Answer + sources + feedback buttons
      escalationCard.ts            # IT support ticket form
      notificationCard.ts          # Outage/maintenance alert card
  knowledge/
    types.ts                       # DocumentChunk, SearchResult, IVectorStore interface
    chunker.ts                     # Sentence-aware sliding window text chunker
    embeddings.ts                  # Azure OpenAI embeddings (+ fake embeddings for dev)
    vectorStore.ts                 # InMemoryVectorStore (cosine similarity)
    azureSearchStore.ts            # AzureSearchStore (hybrid vector + BM25 + reranking)
    vectorStoreFactory.ts          # Returns correct store based on environment
    ingester.ts                    # Document loading + SharePoint ingestion + cron scheduling
  services/
    retriever.ts                   # Query embedding + vector search + confidence check
    responder.ts                   # Grounded LLM prompt + citation extraction + multi-turn
    escalation.ts                  # Ticket creation + multi-webhook routing
    questionLog.ts                 # JSONL question logging
    analytics.ts                   # Log analysis: rates, top questions, knowledge gaps
    notifications.ts               # Proactive outage/maintenance notifications
    conversationMemory.ts          # Per-conversation multi-turn history with TTL cleanup
    translator.ts                  # Language detection + query/response translation
    auth.ts                        # Azure AD credential management
    graphClient.ts                 # Microsoft Graph API client (SharePoint access)
  __tests__/
    unit/                          # 32 tests across 7 suites
knowledge-base/                    # IT documentation (the bot's knowledge source)
  password-reset.md
  vpn-setup.md
  mfa-setup.md
  wifi-network.md
  printer-setup.md
  software-requests.md
  laptop-setup.md
  email-troubleshooting.md
public/
  dashboard.html                   # Analytics dashboard (zero-dependency)
.github/workflows/
  ci.yml                           # Test on pull requests
  deploy.yml                       # Build, test, deploy to Azure App Service
```

---

## Setup

### Prerequisites

- Node.js >= 18
- npm >= 9
- [Bot Framework Emulator](https://github.com/microsoft/BotFramework-Emulator/releases) (for local testing)

### Install and Run

```bash
git clone https://github.com/dannyphantomx64/teams-it-helpdesk.git
cd teams-it-helpdesk

npm install

cp .env.example .env
# Development mode needs no Azure credentials

npm run dev
```

The bot starts at `http://localhost:3978`. Development mode uses fake embeddings and returns knowledge base content directly.

### Endpoints

| Endpoint | Description |
|---|---|
| `POST /api/messages` | Bot Framework messages |
| `GET /health` | Health check with system stats |
| `GET /dashboard` | Analytics dashboard UI |
| `GET /api/analytics` | Analytics data (JSON) |
| `GET /api/notifications` | List all notifications |
| `POST /api/notifications` | Create outage notification |
| `DELETE /api/notifications/:id` | Deactivate notification |

### Create an Outage Notification

```bash
curl -X POST http://localhost:3978/api/notifications \
  -H "Content-Type: application/json" \
  -d '{"title":"Email Outage","message":"Outlook is experiencing intermittent sync issues. IT is investigating.","severity":"warning"}'
```

The bot will show this alert to every employee before answering their next question.

### Connect the Bot Framework Emulator

1. Open Bot Framework Emulator
2. Click **Open Bot**
3. Enter URL: `http://localhost:3978/api/messages`
4. Leave App ID and Password blank for local testing
5. Click **Connect**
6. Try asking: "How do I reset my password?" then follow up with "What if I'm locked out?"

---

## Testing

```bash
npm test                # Run all 32 tests
npm run test:coverage   # Run with 80% coverage enforcement
```

| Suite | Tests | Covers |
|---|---|---|
| chunker | 5 | Sentence-aware chunking, boundaries, empty input |
| vectorStore | 5 | Cosine similarity, upsert, topN, updates |
| questionLog | 4 | JSONL logging, recent retrieval, directory creation |
| escalation | 2 | Ticket ID generation, uniqueness |
| analytics | 4 | Answer rates, top questions, knowledge gaps |
| conversationMemory | 5 | Multi-turn history, trimming, cleanup, isolation |
| notifications | 5 | Create, deactivate, auto-expire, active filtering |

---

## Deployment

### CI/CD Pipeline

```
Push to main → Install → Build → Test (80% gate) → Package → Deploy to Azure App Service → Health Check
```

### Azure Infrastructure

| Resource | Purpose |
|---|---|
| **App Service** | Hosts the bot (Node.js, Linux) |
| **Azure Bot Service** | Teams channel registration |
| **Azure OpenAI** | GPT-4 chat + ada-002 embeddings |
| **Azure AI Search** | Hybrid vector + BM25 search (production) |
| **Azure AD** | App registration for Graph API / SharePoint |

### Production Environment Variables

Set `NODE_ENV=production` and fill in all required variables from `.env.example`. The bot will:
- Use Azure AI Search instead of in-memory store
- Pull documents from SharePoint via Graph API
- Route escalation tickets to configured webhooks
- Enable translation if `ENABLE_TRANSLATION=true`
- Re-index documents on the configured cron schedule

---

## Security

- **Grounded responses only** — LLM only sees retrieved chunks, never the internet
- **Confidence gating** — low-confidence queries rejected before reaching the LLM
- **No secrets in code** — all credentials via environment variables, validated at startup
- **Zod validation** — every config value type-checked, missing values fail fast
- **Teams-only access** — registered through Bot Framework, authorized tenants only
- **XSS-safe dashboard** — built with `textContent` and `createElement`, no innerHTML

---

## License

PRIVATE
