# Support Answer Quality Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make MindRise support answers respond to the user's particular feature question while keeping deterministic safety routes and best-effort personal-detail screening.

**Architecture:** Keep server-side topic gating, but send screened feature-question wording rather than a broad fixed question. Screen bounded history independently, and tighten the model's response instructions. Do not read app state or localStorage.

**Tech Stack:** Existing CommonJS Vercel function, vanilla JavaScript UI, Node built-in test runner; no new dependencies.

**Spec:** `docs/superpowers/specs/2026-10-24-support-answer-quality-design.md`

## Global Constraints

- Crisis and medical requests return fixed responses before any model call.
- Only MindRise feature questions go to GPT-4.1 nano through Azure with `disallowPromptTraining: true`.
- Typed-text screening is best effort and cannot guarantee removal of all personal information; disclose this to users.
- Keep message, history, and output caps; never read or forward localStorage/profile state.

## Review Focus

- A task typo remains eligible and does not lose its intent.
- Distinct add/edit questions stay distinct upstream.
- Obvious names, school details, contact details, and private history do not reach the model.
- Unrelated, crisis, and medical requests do not call the model.
- A model answer with unavailable or unknown facts does not invent UI steps.

---

### Task 1: Screen and forward specific feature questions

**Files:** Modify `api/chat.js`; test `tests/chat.test.js`.

**Interfaces:** `screenQuestion(text)` returns screened question wording; `isFeatureQuestion(text)` remains the topic gate.

- [x] Add a failing test proving add and edit task questions reach the model as distinct screened wording, including the existing `taks` case.
- [x] Run `node --test tests/chat.test.js` and confirm the new test fails because the server sends the broad fixed question.
- [x] Implement `screenQuestion(text)` with conservative PII handling; preserve the current private-data block, crisis/medical checks, and topic gate. Screen bounded history and forward only safe prior user questions; omit assistant history because callers can forge it.
- [x] Update the system prompt to answer the precise question briefly from help facts and say when a step is unknown.
- [x] Add and run tests for blocked obvious PII, no app-state access, safe history, unrelated input, medical/crisis bypass, and a prompt-injection attempt; confirm all pass.

### Task 2: Make data handling visible

**Files:** Modify `index.html`; test via source check/manual Preview.

- [x] Update the visible disclosure to say typed questions are sent to an AI provider and to avoid personal or sensitive information.
- [x] Run `node --test tests/chat.test.js` and `git diff --check`.

**Live verification remaining:** After this branch is pushed, compare add/edit answers, the task typo, unrelated input, and the fixed medical reply on an authenticated Preview. The Preview is protected, so the owner must perform this check.
