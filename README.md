# Teams IT Help Desk Bot

An internal Microsoft Teams bot that helps employees resolve common IT issues using a **Retrieval-Augmented Generation (RAG)** pipeline. The bot searches approved company IT documentation, provides grounded answers with source citations, and escalates unresolved issues by creating support tickets — all within Teams.

---

## Product Overview

Employees ask IT questions in Teams. The bot:

1. **Searches** a curated IT knowledge base (password resets, VPN, MFA, Wi-Fi, printers, email, software, laptop setup)
2. **Answers** using only verified documentation — never guesses or hallucinates
3. **Cites sources** so employees can read the full article
4. **Escalates** when it can't help — presents an Adaptive Card form to create an IT support ticket
5. **Logs every question** for analytics and continuous improvement

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

Employee: How do I request Photoshop?
Bot:      Adobe Creative Suite requires manager approval [Source 1]:
          1. Go to the IT Service Portal at https://it.company.com/request
          2. Select "Software Request"
          3. Fill in the software name and business justification
          4. Your manager will receive an approval request
          5. Once approved, IT will make it available within 2 business days
          Sources: software-requests.md
          [Helpful] [Not Helpful]

Employee: Can I bring my personal drone to the office?
Bot:      I couldn't find a verified answer for that in our IT documentation.
          I'd recommend reaching out to the IT team directly,
          or I can create a support ticket for you.
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
│  ┌──────────┐    ┌─────────────┐    ┌────────────┐                  │
│  │ HelpDesk │───▶│  Retriever   │───▶│ Responder  │                  │
│  │ Bot      │    │ Embed+Search │    │ LLM+Cite   │                  │
│  └────┬─────┘    └──────┬──────┘    └─────┬──────┘                  │
│       │                 │                  │                          │
│       │          ┌──────▼──────┐    ┌─────▼──────┐                  │
│       │          │ VectorStore  │    │ Azure      │                  │
│       │          │ (cosine sim) │    │ OpenAI     │                  │
│       │          └─────────────┘    └────────────┘                  │
│       │                                                              │
│  ┌────▼─────────────┐  ┌───────────────┐                            │
│  │ Escalation       │  │ Question      │                            │
│  │ Service          │  │ Logger        │                            │
│  │ (Ticket + Webhook)│  │ (JSONL)       │                            │
│  └──────────────────┘  └───────────────┘                            │
└──────────────────────────────────────────────────────────────────────┘
                              ▲
┌─────────────────────────────┴────────────────────────────────────────┐
│  Document Ingester (startup)                                         │
│  knowledge-base/*.md ──▶ Chunker (512 tok, sentence-aware) ──▶ Embed │
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
       ├─ Embed query (Azure OpenAI or fake embeddings in dev)
       ├─ Search vector store (cosine similarity, top N)
       │
       ├─ Top score < threshold? ──▶ "Can't verify" + offer escalation card
       │
       └─ Top score >= threshold
            ├─ Build grounded prompt with retrieved chunks
            ├─ Call LLM (temperature=0, max 1024 tokens)
            ├─ Extract [Source N] citations
            └─ Return Adaptive Card with answer + sources + feedback buttons
```

### Why These Design Choices

| Decision | Reasoning |
|---|---|
| **Confidence threshold gating** | Short-circuits before the LLM call when retrieval is weak — eliminates hallucination by design and saves API cost |
| **Sentence-aware chunking** | 512-token chunks with 50-token overlap that never split mid-sentence — preserves semantic coherence for better retrieval |
| **Fake embeddings in dev** | Deterministic character-based vectors let the full RAG pipeline run locally with zero Azure credentials |
| **JSONL question logging** | Append-only format is simple, grep-friendly, and easy to pipe into analytics tools later |
| **Adaptive Card escalation** | Native Teams UI for the ticket form — no external links or context switches for the employee |
| **Webhook-based escalation** | Optional Power Automate integration — works without it (logs to console), scales when connected |

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Runtime** | Node.js 18+, TypeScript (strict) |
| **Bot Framework** | Bot Framework SDK v4 (Teams channel) |
| **LLM** | Azure OpenAI (GPT-4 / GPT-3.5) |
| **Embeddings** | Azure OpenAI `text-embedding-ada-002` (1536-dim) |
| **Vector Search** | In-memory cosine similarity |
| **Document Sources** | Local markdown files, extensible to SharePoint via Graph API |
| **Escalation** | Power Automate webhook (optional) |
| **Auth** | Azure AD via `@azure/identity` |
| **Validation** | Zod schema for all environment config |
| **Testing** | Jest with 80% coverage enforcement |
| **CI/CD** | GitHub Actions (lint, test, deploy) |

---

## Folder Structure

```
src/
  index.ts                     # Express server entry point
  config/
    config.ts                  # Zod-validated environment configuration
  bot/
    helpDeskBot.ts             # TeamsActivityHandler — message routing + card actions
    cards/
      welcomeCard.ts           # Welcome message with topic list
      answerCard.ts            # Answer + sources + feedback buttons
      escalationCard.ts        # IT support ticket form
  knowledge/
    types.ts                   # DocumentChunk, SearchResult, RawDocument
    chunker.ts                 # Sentence-aware sliding window text chunker
    embeddings.ts              # Azure OpenAI embeddings (+ fake embeddings for dev)
    vectorStore.ts             # In-memory cosine similarity search
    ingester.ts                # Document loading, chunking, embedding, upserting
  services/
    retriever.ts               # Query embedding + vector search + confidence check
    responder.ts               # Grounded LLM prompt + citation extraction
    escalation.ts              # Ticket creation + Power Automate webhook
    questionLog.ts             # JSONL question logging for analytics
    auth.ts                    # Azure AD credential management
    graphClient.ts             # Microsoft Graph API client
  __tests__/
    unit/                      # Unit tests for chunker, vector store, escalation, logger
knowledge-base/                # IT documentation (markdown) — the bot's knowledge source
  password-reset.md
  vpn-setup.md
  mfa-setup.md
  wifi-network.md
  printer-setup.md
  software-requests.md
  laptop-setup.md
  email-troubleshooting.md
.github/workflows/
  ci.yml                       # Test on pull requests
  deploy.yml                   # Build, test, deploy to Azure App Service
```

---

## Setup

### Prerequisites

- Node.js >= 18
- npm >= 9
- [Bot Framework Emulator](https://github.com/microsoft/BotFramework-Emulator/releases) (for local testing)

### Install and Run

```bash
# Clone the repository
git clone https://github.com/dannyphantomx64/teams-it-helpdesk.git
cd teams-it-helpdesk

# Install dependencies
npm install

# Configure environment (development mode needs no Azure credentials)
cp .env.example .env

# Start with hot-reload
npm run dev
```

The bot starts at `http://localhost:3978`. Development mode uses fake embeddings and returns knowledge base content directly — no Azure OpenAI or Azure AD required.

### Connect the Bot Framework Emulator

1. Open Bot Framework Emulator
2. Click **Open Bot**
3. Enter URL: `http://localhost:3978/api/messages`
4. Leave App ID and Password blank for local testing
5. Click **Connect**
6. Try asking: "How do I reset my password?"

### Production Setup

For production deployment with Azure OpenAI:

1. Create an Azure AD app registration
2. Create an Azure OpenAI resource with GPT-4 and text-embedding-ada-002 deployments
3. Register a Bot Framework bot with Teams channel enabled
4. Fill in all `.env` variables (see `.env.example`)
5. Set `NODE_ENV=production`

---

## Testing

```bash
npm test                # Run all tests
npm run test:coverage   # Run with 80% coverage enforcement
```

| Test Type | Location | Covers |
|---|---|---|
| **Unit** | `src/__tests__/unit/chunker.test.ts` | Sentence-aware chunking, boundary handling |
| **Unit** | `src/__tests__/unit/vectorStore.test.ts` | Cosine similarity, upsert, topN search |
| **Unit** | `src/__tests__/unit/questionLog.test.ts` | JSONL logging, recent log retrieval |
| **Unit** | `src/__tests__/unit/escalation.test.ts` | Ticket ID generation, uniqueness |

---

## Deployment

### CI/CD Pipeline

```
Push to main
  └─▶ Install ──▶ Build ──▶ Test (80% gate) ──▶ Package ──▶ Deploy to App Service ──▶ Health Check
```

### Azure Infrastructure Needed

| Resource | Purpose |
|---|---|
| **App Service** | Hosts the bot (Node.js, Linux) |
| **Azure Bot Service** | Teams channel registration |
| **Azure OpenAI** | GPT-4 chat + ada-002 embeddings |
| **Azure AD** | App registration for Graph API / SharePoint |
| **Key Vault** (optional) | Secrets management |

### Manual Deploy

```bash
npm run build
# Copy dist/, knowledge-base/, package.json, package-lock.json to server
# npm ci --omit=dev
# NODE_ENV=production node dist/index.js
```

---

## Security

- **Grounded responses only** — the LLM only sees retrieved chunks, never searches the internet
- **Confidence gating** — low-confidence queries are rejected before reaching the LLM
- **No secrets in code** — all credentials via environment variables, validated at startup
- **Zod validation** — every config value is type-checked; missing values fail fast with clear errors
- **Teams-only access** — bot is registered through Bot Framework; only authorized Teams tenants can interact

---

## Future Improvements

- [ ] **Azure AI Search** — replace in-memory store with hybrid vector + BM25 search for production scale
- [ ] **SharePoint ingestion** — pull documents directly from SharePoint via Microsoft Graph
- [ ] **Scheduled re-indexing** — cron-based document refresh to keep the knowledge base current
- [ ] **Conversation memory** — multi-turn context for follow-up questions
- [ ] **Power Automate integration** — route tickets to ServiceNow, Jira, or email via webhook
- [ ] **Analytics dashboard** — visualize question logs to identify knowledge gaps
- [ ] **Proactive notifications** — alert employees about known outages or maintenance windows
- [ ] **Multi-language support** — translate responses for global teams

---

## License

PRIVATE
