---
trigger: always_on
---

# VISION — Project Core Memory

## Identity

**VISION** is a **Personal AI Operating System**: a modular, AI-native desktop assistant inspired by the ambition of JARVIS, but designed as an original system with its own identity, architecture, capabilities, and personality.

VISION is **not** a JARVIS clone, chatbot, Siri/Alexa-style command collection, or simple AI API UI. Its purpose is to turn natural user intent into safe, real digital actions.

## North Star

> **Make VISION better at understanding user intent and safely turning that intent into real action.**

Core loop:

**Understand → Plan → Permission → Act → Observe → Verify → Respond**

---

## Long-Term Vision

VISION should eventually be able to:

* Listen and understand natural language.
* Support Arabic, Egyptian Arabic, English, and mixed technical conversation.
* Maintain conversational context.
* Remember useful long-term and project-specific information.
* See and understand the user's digital environment.
* Use tools to control applications, files, browser, terminal, Git/GitHub, APIs, and system functions.
* Execute multi-step tasks and reusable workflows.
* Recover from failures and verify results.
* Automate complex workflows.
* Operate autonomously within explicit security boundaries.

---

# Core Architecture

VISION is organized around these components:

1. **Interface Layer** — voice, text, desktop UI.
2. **Conversation Manager** — messages, context, session state.
3. **Agent Core** — reasoning, planning, task execution.
4. **AI Provider Layer** — model abstraction; OpenAI is the initial provider.
5. **Tool Registry** — discovers and exposes available tools.
6. **Permission Manager** — determines whether actions are allowed.
7. **Execution Engine** — executes approved tools.
8. **Observation Layer** — collects results, screenshots, logs, and system/application state.
9. **Memory Manager** — session, local, cloud, project, and semantic memory.
10. **Automation Engine** — workflows, triggers, schedules.
11. **Plugin/Integration Layer** — modular external capabilities.

**Critical rule:** The AI model is NOT the authorization layer. AI decisions must pass through the permission system before sensitive actions execute.

---

# Technology Constitution

## Core Stack

* **TypeScript** — primary programming language.
* **Node.js** — primary runtime and execution environment.
* **Electron** — desktop application framework.
* **React** — UI framework.
* **Tailwind CSS** — styling system.
* **OpenAI API** — initial AI intelligence provider.
* **SQLite** — primary local database.
* **Drizzle ORM** — type-safe database access and migrations.
* **Zod** — runtime validation.
* **Git + GitHub** — version control and remote repository.

## Later / Advanced Technologies

* **Supabase** — cloud backend, authentication, synchronization, and cloud data.
* **PostgreSQL** — cloud relational database through Supabase.
* **pgvector** — semantic/vector memory and retrieval.
* **Playwright** — browser automation.
* **Speech-to-Text** — voice input.
* **Text-to-Speech** — voice output.
* **WebSocket** — real-time communication where actually needed.
* **Python** — specialized AI/ML, computer vision, audio, or model-inference workloads only.

---

# Technology Responsibilities

### TypeScript + Node.js

Primary implementation for the Agent Core, tools, plugins, permissions, database access, APIs, automation, logging, Electron main process, and system integration.

### Electron

Provides the desktop body of VISION: application lifecycle, windows, system tray, notifications, native dialogs, OS integration, and IPC.

**Main Process:** privileged operations.
**Renderer:** UI.
**Preload:** controlled bridge between Renderer and Main.

Renderer must not receive unrestricted Node.js access.

### React + Tailwind CSS

Build the desktop interface including assistant/chat, voice state, task progress, tool activity, permissions, memory, logs, plugins, automation, settings, and system information.

### OpenAI API

Provides language intelligence, reasoning, planning, structured outputs, tool selection, code analysis, and supported vision/voice capabilities.

The AI provider must remain abstracted so other providers or local models can be added later.

### SQLite + Drizzle

SQLite stores local settings, conversations, tasks, action history, permissions, local memory, workflows, project metadata, and caches.

Drizzle handles schemas, queries, migrations, and type safety.

### Filesystem

Use for large/local data such as screenshots, audio, imported documents, caches, logs, and local model files. Do not store every file inside the database; store metadata when useful.

### Supabase + PostgreSQL

Cloud layer for authentication, synchronization, cloud profile/preferences, cloud memory, projects, workflows, remote metadata, and future multi-device functionality.

Cloud data should not automatically duplicate all local data.

### pgvector

Future semantic-memory/RAG layer for project knowledge, documents, conversations, and long-term memory retrieval.

### Playwright

Future controlled browser automation: navigation, reading pages, clicking, typing, forms, extraction, and web-app testing.

### Voice

Initial implementation should prioritize reliable cloud STT/TTS. Local voice processing may be added later for privacy, offline capability, and reduced network dependency.

### Python

Python is **not** part of the VISION core. Use it only when specialized AI/ML, vision, audio, or inference workloads justify it. Prefer a service boundary between Python and the TypeScript core.

---

# Local-First + Cloud

VISION intentionally uses hybrid storage.

### Local / SQLite

* Fast access
* Offline operation
* Private device state
* Logs
* Cache
* Local memory

### Supabase / PostgreSQL

* Synchronization
* Authentication
* Backup
* Cloud memory
* Remote state
* Multi-device functionality

**Principle:** Local by default; Cloud when there is a clear benefit.

---

# Tool System

Every capability should preferably be a modular **Tool**, not hardcoded Agent Core logic.

A tool should define:

* Name
* Description
* Input schema
* Output schema
* Permission level
* Risk level
* Execution handler
* Logging policy

Potential tools:

* Open/close/focus applications
* Read/write/search filesystem
* Execute terminal commands
* System information
* Screenshots
* Browser
* Web search
* Git/GitHub
* VS Code/development workflows
* Media/system controls
* External APIs

**AI-generated tool arguments are untrusted. Validate them with Zod before execution.**

---

# Permissions

Actions are classified as:

* **Level 0 — Read-only:** generally automatic.
* **Level 1 — Low risk:** usually automatic.
* **Level 2 — Moderate:** confirmation may be required.
* **Level 3 — High risk:** explicit confirmation required.
* **Level 4 — External/Irreversible:** explicit confirmation required.

Strong protection is required for:

* File deletion
* Privileged commands
* Security changes
* Sending messages/emails
* Publishing
* Purchases
* Remote destructive operations

> **AI intent never equals authorization.**

---

# Memory

VISION has multiple memory levels:

### Session Memory

Current conversation and task state.

### Local Persistent Memory

Stored in SQLite.

### Project Memory

Project-specific knowledge, decisions, commands, architecture, issues, and context.

### Cloud Memory

Synchronized information when appropriate.

### Semantic Memory

Future embeddings + pgvector for semantic retrieval/RAG.

---

# Agentic Behavior

VISION's agent loop is:

**Goal → Plan → Tool Selection → Permission → Action → Observation → Evaluation → Next Action / Completion**

The Agent must not blindly execute actions.

It should observe results, determine whether actions succeeded, recover from recoverable failures, and stop safely when user intervention is required.

---

# Personality

VISION should be:

* Intelligent
* Precise
* Calm
* Efficient
* Professional
* Slightly witty when appropriate
* Not unnecessarily verbose

Personality must never compromise accuracy or safety.

---

# Engineering Rules

1. Understand the existing architecture before major changes.
2. Never assume planned features are implemented.
3. Distinguish **Implemented / In Development / Planned / Experimental**.
4. Prefer modular solutions over hardcoded integrations.
5. Do not introduce unnecessary technologies or complexity.
6. Security and permissions are first-class concerns.
7. Autonomous actions require explicit execution boundaries.
8. Tools require explicit schemas and predictable outputs.
9. Significant agent actions must be observable and debuggable.
10. Keep the system extensible.
11. Prefer the simplest technology that correctly solves the problem.
12. Treat AI output as untrusted input when it reaches tools or privileged operations.

---

# Initial MVP

Start with:

**TypeScript + Node.js + Electron + React + Tailwind CSS + OpenAI + SQLite + Drizzle + Zod + Git/GitHub**

MVP goal:

> **Prove the core assistant architecture before adding advanced infrastructure.**

Do not initially add:

* Firebase
* SQL Server
* MongoDB
* Redis
* Kafka
* Kubernetes
* Microservices
* Multiple databases serving the same purpose
* Multiple AI providers

unless a concrete requirement justifies them.

---

# Development Roadmap

**Phase 0 — Foundation**
Repository, configuration, core interfaces, logging, tool abstraction, desktop shell.

**Phase 1 — Voice**
Microphone, STT, LLM, TTS, basic commands.

**Phase 2 — Computer Control**
Applications, keyboard, mouse, filesystem, screenshots, system information.

**Phase 3 — Tool Architecture**
Registry, schemas, discovery, execution, permissions, logging.

**Phase 4 — Memory**
Conversation memory, persistent memory, project memory, retrieval.

**Phase 5 — Vision**
Screen understanding, OCR, UI recognition, visual reasoning.

**Phase 6 — Developer Agent**
Terminal, Git, GitHub, codebase analysis, build/test, debugging, code modification.

**Phase 7 — Automation**
Workflows, schedules, triggers, events.

**Phase 8 — Autonomous Agent**
Multi-step planning, evaluation, error recovery, goal-oriented execution.

**Phase 9 — Personal AI OS**
Unified voice, vision, memory, tools, automation, applications, projects, and online services.

---

# Project State

**Current status:** Conceptual architecture and technology direction are defined.

Implementation must **not** be assumed complete.

When this memory differs from the actual implementation, the **codebase and explicitly documented implementation decisions take precedence**. This memory should then be updated when a major architectural decision becomes official.

---

# One-Sentence Definition

> **VISION is a modular Personal AI Operating System that combines voice, language understanding, memory, vision, tools, and autonomous planning to understand user intent and safely control, understand, and automate the user's digital environment.**
