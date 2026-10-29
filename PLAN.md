# PLAN.md --- Miso AI Flashcard App

## Goal

Build the Miso MVP as a reliable vertical learning loop:

``` text
Create course/unit
-> create or AI-generate cards
-> study
-> deterministic answer grading
-> FSRS schedules next review
-> earn points/streak
-> buy/equip Miso cosmetics
-> return later to due cards
```

Implement phases in order unless dependencies already exist.

## MVP scope

Included: - Course/unit sidebar organization. - Manual card CRUD. -
AI-generated editable card drafts. - Reveal, typed, fill-blank, and
mixed study modes. - Case-insensitive/conservative typo-tolerant
grading. - FSRS spaced repetition. - Today/due dashboard. - Points and
daily streaks. - White-cat Miso cosmetic shop. - Local persistence. -
Responsive UI based on supplied reference. - Vercel deployment with
server-only LLM key.

Deferred: - Authentication and cloud sync. - Public/shared decks. -
Leaderboards/social features. - Payments. - Native apps. - AI chat. -
PDF/OCR ingestion. - Personalized FSRS parameter optimization. -
Push/email reminders.

## Phase 0 --- Engineering baseline

1.  Initialize React + TypeScript + Vite.
2.  Require Node \>=20.
3.  Add Tailwind, React Router, Zod, `ts-fsrs`, Vitest, React Testing
    Library.
4.  Configure lint/typecheck/build/test scripts.
5.  Add `.env.example`; ignore real secrets.
6.  Create directories from AGENTS.md.

Acceptance: - Build, typecheck, lint, and tests pass. - Routed shell
launches. - No secret exists in browser code.

## Phase 1 --- Reference-inspired UI shell

1.  Define restrained design tokens: white/off-white surfaces, subtle
    borders, muted text, soft accent, rounded panels.
2.  Build full-height `AppLayout`.
3.  Match reference proportions: narrow left sidebar + spacious centered
    workspace.
4.  In the **middle-right dashboard position where the reference shows a
    person's portrait, render Miso's white-cat portrait/icon instead**.
5.  Match that portrait's approximate footprint, rounded container,
    alignment, and whitespace; never use a human avatar there.
6.  Build sidebar: Miso brand, Today, New Course, Courses tree, Miso,
    Shop, Stats, Settings, points/streak footer.
7.  Add desktop collapse behavior.
8.  Add mobile drawer.
9.  Build reusable panels, buttons, badges, fields, dialogs, empty
    states.
10. Add visible focus and reduced-motion behavior.

Acceptance: - UI is recognizably inspired by supplied screenshots
without copying branding. - Miso replaces the human portrait in the
specified middle-right card. - No generic admin-dashboard look. - No
horizontal overflow at 375px.

## Phase 2 --- Domain and persistence

1.  Define Course, Unit, Flashcard, ReviewRecord, UserProgress,
    MisoState.
2.  Define FSRS serialization strategy.
3.  Add root `schemaVersion`.
4.  Create repository interfaces for courses, units, cards, reviews,
    progress, Miso.
5.  Implement localStorage adapters only inside repositories.
6.  Validate loaded state with Zod.
7.  Add explicit migrations.
8.  Preserve raw data on parsing/migration failure.

Acceptance: - CRUD persists across reload. - Components never directly
call localStorage. - Invalid data fails safely.

## Phase 3 --- Courses and units

1.  Create/rename/delete courses.
2.  Create/rename/delete units.
3.  Render collapsible course rows with indented units.
4.  Add course/unit routes.
5.  Course page shows card count, due count, Study Due, Study All, Add
    Cards, units.
6.  Unit page shows cards and study actions.
7.  Confirm cascade deletes.

Acceptance: - Multiple courses/units persist and navigate correctly. -
Sidebar updates immediately.

## Phase 4 --- Manual cards

1.  Card form: term, description, aliases.
2.  Optional fill-blank prompt/answers.
3.  Implement create/edit/delete/duplicate/move.
4.  Initialize valid new FSRS state.
5.  Add validation and empty states.

Acceptance: - Full CRUD survives reload. - New cards are studyable.

## Phase 5 --- Answer matcher

1.  NFKC normalize.
2.  Trim and collapse whitespace.
3.  Lowercase.
4.  Normalize harmless punctuation while preserving meaningful technical
    symbols.
5.  Exact canonical match.
6.  Exact alias match.
7.  Levenshtein fuzzy matching.
8.  Thresholds: \<=4 exact; 5--8 one edit; \>=9
    `max(1, floor(len*0.12))`.
9.  Return structured match metadata.
10. Test casing, aliases, typos, `CPU/GPU`, `C++`, `fork()`,
    numbers/math.

Acceptance: - Case differences pass. - Safe longer typos may pass. -
Short technical false positives do not. - No network grading.

## Phase 6 --- Study engine/reveal

1.  Define reusable StudySession state.
2.  Implement reveal -\> answer -\> Again/Hard/Good/Easy.
3.  Add progress and session summary.
4.  Add keyboard controls.
5.  Ensure one submitted review event per card attempt.
6.  Distinguish custom Study All from scheduled review.

Acceptance: - Reveal session works end-to-end without duplicate reviews.

## Phase 7 --- FSRS

1.  Wrap `ts-fsrs` behind scheduler service.
2.  Create new cards, apply ratings, query due cards.
3.  Persist returned scheduler state + review record.
4.  Use ISO timestamps.
5.  Build Today page with total due, course due counts, streak,
    Miso/points.
6.  Use FSRS defaults for MVP.
7.  Test with fixed clock.

Acceptance: - Rating changes future due date. - Reload restores
scheduling. - Future cards are excluded. - Presentation modes share one
card state.

## Phase 8 --- Typed answers

1.  Render prompt + text input.
2.  Grade through shared matcher.
3.  Show correct/incorrect and expected answer.
4.  Let user confirm Again/Hard/Good/Easy after feedback.
5.  Prevent double-submit.
6.  Enter submits.
7.  Award points only after committed eligible review.

Acceptance: - Case-insensitive and alias matching works. - Conservative
typo handling works. - Same FSRS state is updated.

## Phase 9 --- Fill in the blank + mixed

1.  Render stored fill-blank prompt.
2.  Grade with shared matcher.
3.  Deterministically derive a blank only when the term can safely be
    replaced in description.
4.  Otherwise mark card ineligible until prompt exists.
5.  Add editing for fill-blank content.
6.  Add fill-blank and mixed session modes.
7.  Never create duplicate scheduling histories.

Acceptance: - Prompts test underlying card content. - Broken blanks
never appear. - Mixed mode shares one FSRS state.

## Phase 10 --- Points and streaks

1.  Centralize economy config.
2.  Start with +10 for correct eligible scheduled/new reviews.
3.  Record awarded points on review events for idempotency.
4.  Daily goal: 10 legitimate reviews OR all cards due at day's start if
    fewer than 10.
5.  Implement local-calendar streak.
6.  Award daily bonus once.
7.  Prevent repeated custom-review farming.
8.  Test midnight boundaries.

Acceptance: - Reload cannot duplicate points. - Opening app cannot
increment streak. - Streak qualifies once/day.

## Phase 11 --- Miso/shop

1.  Create original white-cat Miso base asset.
2.  Cosmetic catalog: hats, glasses, collars, beds, backgrounds.
3.  Build Miso page.
4.  Build shop with price, preview, owned/equipped/insufficient states.
5.  Implement atomic purchase.
6.  Prevent duplicate purchases.
7.  Equip/unequip per category.
8.  Add subtle study reactions.
9.  Respect reduced motion.

Acceptance: - Earn -\> buy -\> equip -\> reload preserves appearance. -
Points never go negative. - Miso remains a white cat.

## Phase 12 --- AI generation

Create `POST /api/generate`.

Request:

``` json
{
  "content": "source notes",
  "courseId": "uuid",
  "unitId": "uuid",
  "numberOfCards": 10
}
```

Response:

``` json
{
  "cards": [{
    "term": "fork()",
    "description": "Creates a new process by duplicating the calling process.",
    "acceptedAnswers": ["fork", "fork()"],
    "fillBlank": {
      "prompt": "_____ creates a new process by duplicating the calling process.",
      "acceptedAnswers": ["fork", "fork()"]
    }
  }]
}
```

Tasks: 1. Read `LLM_API_KEY` only server-side. 2. Zod-validate request.
3. Limit source size/card count. 4. Request structured output. 5.
Zod-validate model output. 6. Return drafts only. 7. Preserve notes on
errors. 8. Draft review screen supports edit/remove. 9. Commit only
approved drafts. 10. Initialize committed cards with new FSRS state. 11.
Add rate limiting before public release. 12. Do not log note bodies in
production.

Acceptance: - Browser contains no secret. - Failed generation creates
zero cards. - User edits drafts before save. - Normal studying makes no
LLM calls.

## Phase 13 --- Stats/polish

1.  Derive truthful stats from reviews: reviews today, correctness,
    streak, due count, points.
2.  Add all empty/loading/error states.
3.  Polish spacing against reference.
4.  Audit mobile, keyboard, contrast, reduced motion.
5.  Remove dead/placeholder controls.

Acceptance: - Every visible action works. - No console errors in core
flows. - Desktop study can be completed keyboard-only.

## Phase 14 --- End-to-end verification

Manually execute: 1. Fresh state. 2. Create `CSC209`. 3. Create
`Processes`. 4. Create `fork()` manually. 5. Create another course and
verify sidebar separation. 6. Generate AI drafts. 7. Edit one draft;
reject another; save approved cards. 8. Typed review with different
capitalization. 9. Test safe typo. 10. Test clearly wrong short token.
11. Complete review and verify FSRS due change. 12. Run fill-blank. 13.
Run mixed mode and verify shared scheduler state. 14. Earn points. 15.
Reach daily qualification; streak increments once. 16. Buy/equip Miso
cosmetic. 17. Reload. 18. Verify all domain data persists. 19. Verify
Miso portrait appears in the reference UI's middle-right avatar
position. 20. Repeat core navigation/study flow at mobile width. 21.
Confirm LLM key is absent from browser source/network payloads.

Do not declare MVP complete until this passes.

## Phase 15 --- Vercel

1.  Create Vercel project.
2.  Configure production build.
3.  Add server-side LLM environment variable; never `VITE_LLM_API_KEY`.
4.  Verify serverless generation route.
5.  Verify direct SPA routes.
6.  Confirm errors leak no secrets.
7.  Exclude notes/secrets from production logs.
8.  Run Phase 14 against production.

## Implementation order

``` text
Foundation
-> UI shell
-> persistence/domain
-> courses/units
-> manual cards
-> answer matcher
-> study engine
-> FSRS
-> typed mode
-> fill blank/mixed
-> points/streak
-> Miso/shop
-> AI generation
-> stats/polish
-> E2E
-> Vercel
```

The first technical milestone is:
`create card -> study -> grade -> FSRS schedule -> reload with state preserved`.

The first complete product milestone adds:
`legitimate review -> points/streak -> buy/equip Miso cosmetic`.

## Assumptions

- Miso's on-screen art follows the supplied reference sprite sheet (cream and white ragdoll-style cat, `design/miso-sprite-sheet.jpg`). Sprites used by the UI are cut by `tools/sprites/cut.ps1` into `src/assets/miso/`. This supersedes the earlier hand-drawn pure-white cat.
- Pixel-stepped borders are drawn with CSS `clip-path` (`.pixel-box`). Because `clip-path` clips outlines, focus on those elements is shown by recolouring the frame.
- Persistence uses one browser-storage document (`miso.persistedAppState`) with `schemaVersion` 1. FSRS card fields are stored as ISO timestamps and numeric `state`. Parse or migration failure keeps the raw document and blocks overwrites; the session uses empty in-memory state.
- Duplicating a card copies content and fill-blank data but initializes a new FSRS state. Editing content does not reset the schedule. Moving a card to another unit keeps the same scheduler state.
- Study Due / Study All navigate to `/study` with course/unit/scope query params. `mode` defaults to reveal; Type / Blank / Mixed are chosen on the study page. Scheduled sessions persist a review and apply `ts-fsrs` with fuzz disabled. Custom Study All persists the review but does not change FSRS state. Mixed picks reveal, typed, then fill-blank when eligible, by queue index. Fill-blank uses a stored prompt, or derives one only when the term appears as its own token in the description.
- Points live in `ECONOMY`: +10 for a correct scheduled review, +50 daily-goal bonus, +20 streak bonus, goal of 10 legitimate reviews or all cards due at first scheduled review of the local day if fewer than 10. Custom practice never awards points. `ReviewRecord.pointsEarned` is the source of truth so reloads cannot pay twice. Streaks use the device's local calendar date.
- Shop looks are full sitting portraits from `design/Purchase_Designs`, copied into `src/assets/miso/looks/`. Equipping a look replaces the idle portrait instead of overlaying SVG. Catalog: round glasses 50, brown sunglasses 90, bell collar 30, blue bow 60, wicker basket 120, night window 100. A first-day qualified review (80 points) can buy the bell collar or round glasses. Only one look is equipped at a time. Purchase does not auto-equip. Preview swaps the sitting portrait locally. Unknown equipped ids render as the base cat. Study reactions still use sprite-sheet poses other than idle. The shop preview uses a flowerless `flat` grass strip so the caption stays readable.
- Card generation is `POST /api/generate`. The browser sends notes, course/unit ids, and a card count (1–20, max 12,000 note characters). A PDF can be uploaded in the generate dialog; text is extracted on-device with pdf.js, then sent as ordinary notes. A **Generate fill-in-the-blank prompts** checkbox (on by default for paste and PDF) sends `preferFillBlank`; the server synthesizes a blank when the model omits one. The handler reads `LLM_API_KEY` from the server environment, never from the client or `VITE_*`. Model JSON is sanitized before Zod validation: string aliases become arrays, `question`/`answer` and `flashcards` envelopes are accepted, and unusable cards are dropped instead of failing the whole batch. The user edits or removes drafts before `insertCards` creates new FSRS cards. Existing cards are never overwritten. Local `npm run dev` serves the same handler through a Vite middleware. Requests are rate-limited per IP after a valid parse. Note bodies are not logged.
- Typed and fill-blank grading expand terms like `Random Variable (RV)` at match time when a space precedes `(`, so the full name or the abbreviation is accepted. Function-style answers such as `wait(2)` and `fork()` are not split. Extra aliases are not persisted. Type, Blank, and Mixed sessions show a running correct count beside Miso and again on the session summary. Reveal ratings do not add to that count.
