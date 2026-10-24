# More specific support answers

## Intent and constraints

The support helper currently replaces every recognized task question with the same broad, fixed question before calling GPT-4.1 nano. This protects typed details but makes answers repetitive and sometimes broader than the user's request. The helper should answer the particular MindRise feature question in plain language, while staying limited to documented prototype behavior. It must not read or send localStorage. Crisis and medical requests keep deterministic responses; unrelated requests are declined.

## Approaches

1. Keep only fixed questions and add more action-specific templates. This best protects privacy but cannot handle varied follow-ups naturally.
2. Send the typed feature question after server-side screening and redaction, with bounded screened history. This preserves the user's meaning and was chosen by the project owner, who accepts that automated redaction can miss some personal details.
3. Send every typed message directly to the model. This would be simpler but needlessly exposes unrelated and sensitive text, so it is rejected.

## Proposed behavior

- Apply the crisis check first and the fixed medical refusal next. Block or redact obvious contact details, names introduced as personal details, and school-identifying phrases before any model call. Never claim this catches all personal data.
- Keep a server-side feature-topic gate. For a recognized MindRise topic, send the screened wording of the current question rather than a broad replacement question. Screen at most six prior messages and send only safe prior user questions; client-supplied assistant history is untrusted and omitted. Omit prior sensitive, crisis, medical, and unrelated user messages. Do not send browser storage, profile fields, or hidden app state.
- Ask the model to answer the exact question in a few short sentences, using only the help facts. It should avoid copying a whole help paragraph, adding adjacent feature summaries, or inventing a button or step the facts do not establish. Unknown details get an honest uncertainty answer.
- Update the visible disclosure so end users know their typed questions are processed by the AI provider and should not contain personal or sensitive details. Keep the existing length, origin, history, and output caps, Azure-only routing, and no-training request.

## Verification and limits

Regression checks should cover distinct add/edit task replies, the task typo, prompt injection, unrelated requests, private text, history screening, and deterministic crisis and medical responses. The Preview is protected by Vercel Authentication, so live response quality and any reported echo must be checked in the owner's authenticated browser. Redaction cannot guarantee that arbitrary names or school details typed by a user never reach the provider; avoiding that risk requires returning to fixed or structured questions.
