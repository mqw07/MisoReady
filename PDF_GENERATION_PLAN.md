# Full-document PDF flashcard generation plan

Status: implementation in progress; the first functional pipeline is wired into the app.
Reviewed: October 31, 2026.

## First implementation milestone

Implemented full PDF-text retention (including unreadable-page warnings and
PDF.js resource cleanup), overlapping Unicode-safe source chunks, validated
concept extraction with exact-source evidence, conservative reconciliation of
explicit terms/aliases within a scope, and one validated definition/blank card
per concept. The dialog now chooses its count automatically, shows stage progress,
and paginates draft editors. The API bounds each operation, checks provider
truncation, supports throttling/backoff, and rejects oversized Node request
streams before buffering. Completed tasks survive retry while the form remains
mounted. Bulk card insertion now appends the resulting cards once.

The legacy bounded-count API contract is retained for compatibility; the app's
automatic path does not use its source/count caps. Response parsing no longer
silently clips card collections to 20.

Outstanding work from this plan: durable IndexedDB job checkpoints and library
migration, semantic reconciliation beyond explicitly matching scoped aliases,
retention/display of merged evidence and page provenance, adaptive subdivision of
failed extraction chunks, pagination of saved CardList, durable commit markers,
and real-browser/live-model quality checks. Closing or reloading the dialog
currently discards its source, draft edits, and in-memory generation checkpoint.
Existing localStorage library capacity and save-error handling remain in place.

## Intended behavior

A user selects a course/unit and uploads a text PDF. Miso reads its full text,
identifies key terms and atomic concepts throughout the document, reconciles
duplicates, and then creates an editable definition and fill-in-the-blank prompt
for each concept. The AI-derived concept inventory determines the final count.
There is no fixed document character limit or total card-count cap.

"Unlimited" means no arbitrary product cap. Every model request remains bounded
by context, output, payload, time, and usage budgets. Processing ends when the
finite concept inventory is accounted for, rather than repeatedly asking for more
cards. Available device storage and provider capacity remain physical limits.

Recommended defaults:

- Use automatic concept coverage for both PDF text and pasted notes, through the
  same pipeline. Replace the required card-count dropdown with automatic coverage.
- Generate one card per atomic concept, with both a definition and a blank prompt.
  A compound topic can yield several distinct concepts during extraction.
- Retain human review and editing before adding cards to the library.
- Keep PDF extraction and job state on the device. Only bounded source excerpts
  needed by the current AI operation are sent to the existing server endpoint.
- Initially retain the separate 8 MiB PDF-file limit. Removing the 12,000-character
  text cap does not require accepting unbounded binary files. Show this file-size
  limit explicitly. Scanned/image-only pages require an OCR feature outside this
  change; flag unreadable pages rather than implying they were covered.
- Generation runs while the app is open. Closing it pauses new work; reopening
  offers resume from durable checkpoints. Continuing after the browser closes
  would require a separate server-side durable-job design.

The requested automatic count supersedes the older bounded-count product rule
in AGENTS.md for this feature. Keep its server-side validation, editable drafts,
local-first architecture, and one-memory-state-per-knowledge-item rules.

## What the current implementation does

- `src/services/ai/pdfNotes.ts:29` clips the combined PDF text to 12,000
  characters. The extractor already reads every page before clipping, but drops
  page identity when joining the strings. It also enforces an 8 MiB file limit.
- `src/services/ai/contract.ts:3` defines the 12,000-character source cap,
  20-card maximum, and 64 KiB request-body limit. Request validation enforces the
  first two; `parseGenerateResponse` also silently slices output to 20 cards.
- `src/components/cards/GenerateCardsDialog.tsx:99` holds all source/drafts in
  component state. It requires a count, applies the textarea character limit,
  shows the PDF-clipping notice, makes one generation request, and renders every
  draft editor at once. Closing the dialog unmounts its form and loses that state.
- `api/generate.ts:52` makes one model call directly from notes, with a 45-second
  timeout, then slices output to the requested count. There is no explicit
  concept-extraction stage or cross-chunk reconciliation. The provider is
  configurable through the existing server-only LLM environment variables.
- `api/rateLimit.ts:1` permits eight generation requests per client per ten
  minutes using a process-local map. A naive batch loop would quickly get 429s.
- `vite.config.ts` exposes the same Node handler during local development. Any
  API changes need to work in both that middleware and the deployed function.
- `src/types/domain.ts` already represents a term, description, aliases, and
  optional fillBlank on one card. Study presentation and matching can reuse it.
- `src/features/library/mutations.ts:153` bulk-inserts by repeatedly copying the
  growing cards array. That is unnecessarily expensive for large generated sets.
- `src/repositories/appDocument.ts` persists the entire app as JSON in one
  localStorage entry. `LibraryProvider.tsx` assumes synchronous load/save and
  already implements writer locking, conflict detection, and recovery.
- CoursePage and UnitPage close generation immediately after calling createCards;
  that call does not return a durable-save acknowledgement. Large-job completion
  needs a stronger commit result before deleting draft checkpoints.
- `src/components/cards/CardList.tsx:21` also renders the entire saved unit list.

These are several interacting constraints. Changing only MAX_SOURCE_CHARS and
MAX_CARD_COUNT would leave payload limits, truncation, timeouts, throttling,
recovery, and large-list behavior unresolved.

## Recommended implementation sequence

### 1. Preserve the full source and introduce resumable job contracts

Change PDF extraction to return a source document with stable page IDs, page
numbers, page text, and extraction warnings, without calling clipExtractedNotes.
Preserve useful line breaks instead of collapsing all content into a single
paragraph. Report extraction progress and release PDF.js page/document resources
on completion, failure, and cancellation. Ignore results from replaced files.

Introduce versioned generation types separate from the saved Flashcard model:

- SourceDocument: source identity/revision, filename, pages, warnings.
- SourceChunk: stable chunk ID, page/offset references, text, and coverage ranges.
- ConceptCandidate: application-assigned ID, label, scope/topic, aliases, and
  evidence references into the source.
- Concept: canonical ID plus the candidate IDs and source references it covers.
- GenerationJob: source revision, prompt/config version, stage, chunk/concept
  task statuses, retry state, drafts, and durable commit markers.

Put job persistence behind a repository, using IndexedDB for full source text and
incremental checkpoints. Keep this data outside the current localStorage root.
Persist completed work before scheduling its successors. Protect job ownership
across tabs and reject stale responses using job/revision/task IDs. Source edits
create a new revision and invalidate dependent results.

Expected files: `pdfNotes.ts`, new `src/services/ai/generationTypes.ts`,
`src/services/ai/generationContract.ts`, and
`src/repositories/generationJobs.ts`, with focused tests.

### 2. Extract concepts across every source chunk

Implement a deterministic, page-aware chunker. Prefer paragraph/sentence
boundaries, allow a small overlap, and split long individual pages/paragraphs.
Track non-overlap coverage so overlapping text does not inflate completion.
Validate both estimated model tokens and actual UTF-8 JSON request bytes,
including IDs, instructions, and response headroom. Chunk size is an internal
transport setting, never a document-length cap.

Extend `POST /api/generate` with a Zod-discriminated operation contract:
`extractConcepts`, `mergeConcepts`, and `generateCards`. Update the client with
typed helpers. Keep the existing Node/Vite entry point and server-only provider
configuration. The final public UI uses these operations rather than the legacy
notes-plus-numberOfCards request.

The extraction prompt identifies independently testable concepts supported by
the current chunk; it does not ask for a fixed quantity. Ignore document text
that attempts to supply instructions. Require evidence references and verify
that returned references/quotes exist in the supplied source. A chunk containing
only non-study content may legitimately return no concepts.

Detect provider refusal, output truncation, malformed output, and omitted task
results. Retry or subdivide an overflowing chunk instead of silently keeping
the first N concepts. Give persistent failures an explicit unresolved status.

Expected files: new `src/services/ai/chunkSource.ts`, generation contracts,
`api/generate.ts`, and `src/services/ai/client.ts`. Share provider-call helpers
server-side without importing server dependencies into browser code.

### 3. Reconcile the concept inventory, then generate cards

Run extraction for every readable chunk before final card generation. Normalize
labels and aliases conservatively; preserve punctuation meaningful in terms such
as C++, and distinguish the same label used with different meanings.

First merge exact matches within the same scope. Then reconcile likely synonyms
and repeated concepts through bounded topic/alias candidate groups. Use additional
bounded passes when a group is too large; never send the entire inventory in one
request. Preserve every candidate's source evidence through a merge. Validate
merge mappings so the AI cannot silently omit or invent candidate IDs. Conservative
non-merging is preferable when meanings are ambiguous.

After reconciliation, the unique concept count determines the planned card count.
Give each concept a task status. Generate small batches, initially around 5-10
concepts and always subject to token/byte budgets. Send the concept's relevant
source passages, including surrounding explanation, rather than only its label
or a summary of the whole PDF.

Each result must name its input concept ID and provide a term, source-grounded
definition, aliases, and one fill-in-the-blank prompt with accepted answers.
Definitions and blanks are presentations of the same card and share one FSRS
state. Preserve current field-length validation and deterministic study grading.
Require exactly one valid result per requested atomic concept; retry only missing
or invalid results. Flag genuinely unsupported concepts for review.

Validate exactly one blank and a usable accepted answer. Reuse the existing
whole-token matching helper for any fallback blank creation; the AI contract's
current substring replacement can blank part of another word. Do not silently
truncate a long definition into a misleading fallback prompt. Validate or retry.

Remove total-count slices from response parsing and the handler. Enforce only
the size of each requested batch, and aggregate validated batches without a
global count cap. Never mark a job fully covered while chunks or concepts remain
unresolved. Surface unsupported/failed concepts separately from user exclusions.

### 4. Add orchestration, progress, and recoverable failures

Create `src/services/ai/generationPipeline.ts` and a small generation-session
hook. Keep orchestration outside the dialog's rendering logic; no new general
state-management library is needed.

- Start with one in-flight AI request per job; make concurrency configurable.
- Persist chunk and concept completion independently. Resume only unfinished
  tasks, keeping accepted results and stable IDs.
- Add bounded retries/backoff for transient failures and honor Retry-After.
  Pause with a useful error after retries are exhausted; retain partial drafts.
- Replace the eight-request assumption with configurable per-operation throttling
  appropriate for a multi-request job. Keep request/usage protection server-side;
  a client-supplied job ID must not exempt a request from limits.
- Return Retry-After on throttling. A long job waits and resumes rather than
  treating a rate window as its maximum total card count.
- The current in-memory limiter is best effort across server instances. A public
  multi-instance release needs shared enforcement; do not present the map as a
  durable global budget. Keep this separate from adding accounts or payments.
- Enforce body-byte limits while reading the Node request stream, before buffering
  the whole body. Retain bounded model output and operation-specific timeouts.
- Propagate cancellation where supported and invalidate late responses locally.
  Restarting an interrupted task may repeat an upstream billable call; local
  checkpoints prevent duplicate drafts, not guaranteed exactly-once model billing.

Replace the compose/review flow with source, analysis/generation progress, and
draft review states. Show pages read, chunks analyzed, unique concepts identified,
and cards completed. Avoid a fabricated overall percentage before the concept
inventory is known. All close paths, including dialog X/Escape/backdrop and route
unmount, pause/abort consistently while preserving a resume checkpoint.

### 5. Support large draft sets and reliable saving

Paginate draft editors and saved CardList, initially 25 items per page. Retain
edits/errors/selections across pages, with review/remove and save-selected actions.
Show source pages for drafts so users can inspect the grounding. Large source
preview should also be paged rather than one giant textarea.

Move durable library storage behind an asynchronous IndexedDB repository before
calling large-set support complete. Keep the AppState/domain shape where possible,
with separate stores for library records, generation jobs, and commit/provenance
metadata. Use transactions for related review/schedule/progress/session writes and
for saving generated cards together with their job/draft-to-card commit markers.

This is a distinct implementation step: changing the current synchronous adapter
requires provider hydration, ordered writes, error propagation, and updates to
the repository interfaces, LibraryProvider/libraryContext, and save callers.
Preserve immediate in-memory study feedback while serializing durable writes;
retain dirty state, retry, leave-page protection, writer locking, and revision
checks. Do not replace current safeguards with last-writer-wins persistence.

Migrate legacy localStorage data only after parsing, validating, and successfully
committing it to IndexedDB. Keep the original document intact as a recovery copy;
use a validated migration marker and explicit database-version upgrades. Failure
must preserve recoverable data, never silently load an empty replacement library.
Old tabs must not be allowed to become competing writers during migration.

Replace insertCards' repeated whole-array copying with construction of all new
cards followed by one append. Preserve fresh FSRS states, IDs, course/unit checks,
and timestamps. Await a durable commit acknowledgement before reporting a save
as successful or cleaning up the corresponding drafts. Stable commit markers make
retries and resume safe from duplicate insertion. Revalidate a destination unit
that may have been deleted while a job was paused.

Handle quota failures explicitly and keep the job/drafts available for retry or
export. IndexedDB improves capacity and write behavior; it does not make storage
infinite. Preserve old libraries and their schedules through migration tests.

### 6. Verify the full flow and update product documentation

Replace tests that assert PDF clipping and a required total count. Retain request
validation, malformed-output handling, server-key isolation, and editable drafts.

Required automated coverage:

- A PDF fixture over 12,000 extracted characters with unique concepts near the
  beginning, middle, and end; all readable source ranges are scheduled.
- More than 20 unique concepts produces more than 20 reviewed/saved cards, across
  multiple extraction and generation calls, with no parser clipping.
- Overlap and synonymous mentions reconcile; distinct meanings sharing a label
  remain distinct; merged concepts retain evidence from multiple pages.
- Unicode/escaped JSON byte budgets, a very long page, empty chunks, mixed text
  and scanned pages, and PDF read failures behave explicitly.
- Extraction/merge/generation outputs with missing IDs, invalid evidence,
  truncation, or invalid blanks are retried or shown as unresolved, never counted
  as complete. Legitimate zero-concept extraction is accepted.
- 429/Retry-After, transient errors, exhaustion, cancellation during PDF reading
  and AI calls, source replacement, modal closure, navigation, and reload retain
  consistent checkpoints and reject stale results.
- Paginated edits survive navigation; save retry/reload does not duplicate cards;
  invalid/deleted destinations and storage failures preserve drafts.
- IndexedDB migration, quota/retry, writer handoff, conflict checks, study-session
  recovery, review transaction consistency, and existing FSRS behavior pass.

Manually test a representative long lecture PDF with the configured live model:
review concept coverage, synonym handling, definitions, blank quality, request
count, duration, token usage, and cost. Mocked tests prove control flow and
bookkeeping, not semantic completeness. Log aggregate timings/counts/error codes
without logging source content. Benchmark representative 1,000- and 10,000-card
libraries for import, review rendering, save, reload, and ordinary study; these
are validation fixtures, not proposed product count limits.

Run unit/integration tests, typecheck, lint, and the production build. Exercise
both the Vite middleware and deployed Node adapter. Update PLAN.md, AGENTS.md's
outdated generation requirement, PERSISTENCE.md, and any new server configuration
documentation to match the delivered behavior.

## Architecture boundary and rollout

Recommend browser-orchestrated, checkpointed batches for the current local-first
product. The server remains a stateless gateway for one bounded operation per
request. Do not run the entire PDF pipeline inside one HTTP invocation or use an
in-memory server Map as a job database.

Vercel documents finite invocation durations and a 4.5 MB request/response payload
limit. Bounded requests avoid depending on a larger timeout or sending the full
document in one payload. Source: [Vercel Functions limits](https://vercel.com/docs/functions/limitations),
checked October 31, 2026. Actual model budgets remain configuration/provider
dependent; this plan does not assume a particular model context size.

Implement in the numbered dependency order, with large-library persistence as its
own reviewable change. Release the complete automatic flow after recovery and
storage checks pass. Server-side continuation after closing the browser can be
added later with durable job storage and a worker/workflow, retaining the same
stage contracts; it is not part of the proposed local-first scope.

## Review validation

The existing targeted generation/library/persistence baseline passed: 8 test
files, 41 tests. This includes pdfNotes, AI contract/client, generate endpoint,
GenerateCardsDialog, library mutations, repository recovery, and provider
persistence. Tests used mocked AI/PDF UI results; no live AI generation or
deployed endpoint was exercised. No application code was changed for this plan.
