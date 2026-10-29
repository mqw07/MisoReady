# AGENTS.md --- Miso AI Flashcard App
## Mission
Build **Miso**, a polished AI-assisted study application for creating,
organizing, and reviewing flashcards. The product combines active
recall, FSRS spaced repetition, typed-answer/fill-in-the-blank practice,
and a virtual-pet reward loop centered on a white cat named **Miso**.
This file is the coding-agent operating contract. Read it before
modifying code. Prefer simple, testable, reversible implementations.
Build the core learning loop before secondary features. \## Product
principles 1. Studying is primary. Miso, points, animations, and AI
support learning and must not obstruct it. 2. Reviews must feel instant.
Never call an LLM during normal answer submission or scheduling. 3.
Grade deterministically first: normalization, aliases, and conservative
typo tolerance. 4. AI creates editable draft content; it does not decide
ordinary answer correctness. 5. One knowledge item has one memory state.
Reveal, typed, and fill-blank modes share one schedule. 6. MVP is
local-first. Hide persistence behind repositories so localStorage can
later become Supabase/Postgres. 7. LLM secrets stay server-side in
Vercel functions. 8. Match the attached reference UI's restrained visual
language without copying its branding. \## Required stack - React +
TypeScript + Vite.; Tailwind CSS.; React Router. - `ts-fsrs` for FSRS
scheduling; do not build a homemade scheduler.; Zod for persisted-data
and AI-response validation.; Vitest + React Testing Library. - Vercel
serverless API route for LLM calls.; Node.js \>=20.;
`crypto.randomUUID()` for IDs unless the existing repository has a
stable alternative. \## Reference UI direction The supplied screenshots
are the frontend visual reference. Reproduce their **layout character
and design system**, not the source product's identity. \### Desktop
shell - Full-height app with a narrow fixed/collapsible left sidebar and
large white main workspace. - Expanded sidebar target: 240--270px. -
Center main content with generous whitespace; readable max width roughly
960--1100px. - Use thin low-contrast borders, off-white/gray surfaces,
restrained shadows, and 12--18px radii. - Clean sans-serif typography;
strong headings; muted secondary labels. - Avoid dense admin-dashboard
styling, heavy gradients, neon colors, glassmorphism, and large
shadows. - Selected sidebar row gets a lightly tinted rounded
background. - Use icon + text navigation at approximately the density
shown in the reference. \### Sidebar Order: - Miso logo/name. - Today. -
`+ New course`. - `COURSES` heading. - Collapsible course rows. -
Expanded course shows indented units. - Bottom utilities: Miso, Shop,
Stats, Settings. - Compact points/streak status near the lower
sidebar. - Collapsible on desktop; drawer/sheet on mobile. \### Main
workspace - Prominent page heading with one concise supporting line.;
Modular rounded panels modeled after the reference cards.; Dashboard
priority: due today, continue studying, course summaries, streak/points,
Miso. - **The portrait/avatar in the middle-right area of the reference
dashboard must be replaced by Miso's white-cat icon/portrait.** - Miso's
portrait should occupy approximately the same visual footprint, rounded
treatment, alignment, and whitespace as the human portrait in the
reference. - Never render a human profile photo in that position. - The
Miso card may communicate a compact reward/study status such as streak,
today's goal, or next cosmetic. - Do not recreate the reference chatbot
composer unless an AI-chat feature is explicitly requested. This is a
study app, not a chatbot. \### Responsive behavior - Desktop: persistent
sidebar.; Tablet: collapsible sidebar.; Mobile: sidebar drawer; study
card uses most available width; primary actions remain
thumb-accessible. - No horizontal scrolling at common viewport widths.
\## Core information model Hierarchy: `Course -> Unit -> Flashcard`.
``` ts
type ReviewRating = "again" | "hard" | "good" | "easy";
type StudyMode = "reveal" | "typed" | "fillBlank" | "mixed";
interface Course {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}
interface Unit {
  id: string;
  courseId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}
interface FillBlank {
  prompt: string;
  acceptedAnswers: string[];
}
interface Flashcard {
  id: string;
  courseId: string;
  unitId: string;
  term: string;
  description: string;
  acceptedAnswers: string[];
  fillBlank?: FillBlank;
  fsrs: FsrsCardState;
  createdAt: string;
  updatedAt: string;
}
interface ReviewRecord {
  id: string;
  cardId: string;
  reviewedAt: string;
  mode: StudyMode;
  rating: ReviewRating;
  userAnswer?: string;
  pointsEarned: number;
}
interface UserProgress {
  points: number;
  currentStreak: number;
  longestStreak: number;
  lastQualifiedStudyDate?: string;
}
interface MisoState {
  ownedCosmeticIds: string[];
  equipped: Record<string, string | undefined>;
}
```
Use actual `ts-fsrs` types where practical. Persist enough scheduler
state and review history to restore scheduling exactly. \## Architecture
boundaries Suggested structure:
``` text
src/
  components/{layout,cards,study,miso,ui}/
  pages/
  features/{courses,cards,study,miso}/
  services/{answerMatching,scheduler,gamification,ai}/
  repositories/
  types/
  hooks/
  utils/
api/
  generate.ts
```
### Repository rule
No React component may directly call `localStorage`. Define repositories
for courses, units, cards, reviews, progress, and Miso. MVP
implementations use localStorage. Future persistence must be swappable
without rewriting UI/domain logic. \### Service rule - Answer matching:
`services/answerMatching`.; FSRS adapter: `services/scheduler`.;
Points/streak/shop: `services/gamification`. - AI client/server
contract: `services/ai` and serverless endpoint. - React components
render state and call services; they do not duplicate domain rules. \##
Flashcard creation Support manual create, edit, delete, duplicate, and
move-to-unit. Required fields: term and description. Accepted aliases
are optional. A course/unit must be selected before save. Show inline
validation. Confirm destructive deletion of meaningful data. \### AI
creation - User pastes source notes and chooses a bounded card count.;
Browser calls only the app's server endpoint.; Server calls the LLM and
requests structured JSON. - Validate request and response with Zod.; AI
output is always an editable **draft**.; User can edit/remove drafts
before committing. - AI may propose aliases and fill-blank prompts. -
Never silently overwrite cards. \## Answer matching Create a pure,
heavily tested matcher. Never use the LLM for normal grading.
Normalization: 1. Unicode NFKC. 2. Trim outer whitespace. 3. Locale-safe
lowercase. 4. Collapse repeated internal whitespace. 5. Normalize
harmless surrounding punctuation. 6. Preserve semantically meaningful
punctuation for programming/math. Match order: 1. Exact normalized
canonical answer. 2. Exact normalized alias. 3. Conservative fuzzy match
against canonical answer/aliases. 4. Otherwise incorrect. Baseline typo
policy: - Length \<=4: exact only. - Length 5--8: allow at most one
edit. - Length \>=9: allow `max(1, floor(length * 0.12))` edits. - Do
not equate short technical tokens such as CPU/GPU. - Return
`{ correct, matchType, matchedAnswer, distance? }`. - Do not
indiscriminately strip `+`, `-`, decimal points, operators, or function
syntax. Test casing, whitespace, Unicode, aliases, punctuation,
one-character typos, short-token false positives, and technical answers
such as `C++` and `fork()`. \## Study modes \### Reveal Show
front/prompt -\> reveal answer -\> Again/Hard/Good/Easy. \### Typed Ask
user to recall the term/answer. Grade locally. Show correct/incorrect
plus expected answer. Do not infer a separate memory state. \### Fill in
the blank Use stored `fillBlank.prompt` and accepted answers. Grade with
the same matcher. Prompt must test knowledge represented by the
underlying card. \### Mixed Choose among eligible presentations while
sharing one FSRS state. Desktop keyboard: - Enter submits typed
answers. - Space/Enter reveals when focus is not in an input. - Optional
rating shortcuts must be discoverable. - Never hijack normal text-entry
keys. \## Spaced repetition Use `ts-fsrs`. - New cards receive valid
initial FSRS state. - Review submission passes Again/Hard/Good/Easy to
FSRS and persists returned state. - Due queries use scheduler
timestamps, never homemade intervals. - Today shows due cards/counts by
course. - All study modes update the same underlying card state. -
Custom Study All must not accidentally reschedule cards unless
explicitly configured as a review session. - Persist timestamps as ISO
strings; streak calculations use the user's local calendar day. - Use
default FSRS parameters for MVP; do not optimize parameters without
sufficient review history and an explicit design. \## Points and streaks
Gamification rewards useful studying, not grinding. Initial configurable
values: - Correct eligible scheduled/new answer: +10. - Daily goal
completion: +50. - Optional streak bonus once per qualified day. Keep
values in one config object. Anti-farming: - Repeated custom reviews of
an already completed card cannot yield unlimited points. - Prefer points
for due/new cards in legitimate sessions. - Each review stores points
awarded so reloads cannot award the same event twice. Daily streak
qualification: - Complete 10 legitimate reviews, OR complete all cards
due at the day's start if fewer than 10. - Opening the app never
counts. - Store last qualified local date. - Consecutive dates
increment; missed dates reset on next qualification. - Test midnight/day
boundaries. \## Miso and shop Miso is always a **white cat**. -
Cosmetics layer onto the base cat. - Categories may include hat,
glasses, collar, bed, and background. - Cosmetics never affect learning
performance. - Flow: preview -\> affordability check -\> purchase -\>
inventory -\> equip/unequip. - Purchase must atomically deduct points
and add inventory. - Prevent duplicate purchases. - During study, use
subtle non-blocking reactions. - Use original/local assets; do not
scrape copyrighted game art. \## Dashboard Today is the default route.
Show: - Greeting/title. - Total cards due today. - Current streak. -
Primary `Study due` CTA. - Course panels with due counts. - Miso
white-cat portrait in the reference UI's middle-right avatar position. -
Compact points/reward progress. - Helpful empty states for no courses,
no cards, and nothing due. Never show fabricated analytics. \##
Error/loading/empty states Every async AI operation needs loading,
success, empty, and error states. Generation errors preserve pasted
notes. Malformed AI output is never committed. Repository parse failures
must not silently delete raw stored data. Disable buttons while
destructive/duplicate submissions are in flight. \## Security/privacy -
Never commit secrets.; Never expose LLM keys through `VITE_*`.;
Serverless function reads a server-only variable such as
`LLM_API_KEY`. - Validate request body size and requested card count
server-side.; Add rate limiting before public launch.; Do not log full
pasted notes in production. - Render user/AI content as text by default;
sanitize Markdown if added later. \## Accessibility - Keyboard-reachable
controls.; Visible focus states.; Semantic HTML and labels. -
Correctness cannot be communicated only by color.; Maintain contrast
despite muted styling.; Respect `prefers-reduced-motion`. \## Testing
gates Before marking a feature complete: - Unit tests pass. - Typecheck
passes. - Lint passes. - Production build passes. - No console errors in
core flows. Must-have unit coverage: - answer normalization/matching; -
FSRS adapter transitions; - due filtering; - points anti-farming; -
streak qualification; - shop purchase/equip; - repository
serialization/migrations. Must-have integration flows: - course -\> unit
-\> card -\> study -\> persisted review; - typed answer case/typo
handling; - fill-blank grading; - reload restores data; - cosmetic
purchase/equip survives reload; - AI failure does not lose input. \##
Data versioning Persist a root schema version:
``` ts
interface PersistedAppState {
  schemaVersion: number;
  // collections...
}
```
Add explicit migrations for schema changes. Never resolve
incompatibility by silently wiping user data. \## Agent discipline -
Inspect existing code before editing.; Make the smallest coherent change
completing the current plan item.; Do not rewrite working modules solely
for style. - Avoid new state-management libraries until complexity
proves one necessary. - Do not add auth, Supabase, payments, social
features, leaderboards, chat, or notifications unless requested. - Do
not replace FSRS with custom intervals.; Do not call AI during every
review.; Do not expose secrets. - Do not leave placeholder buttons in
completed flows.; Prefer derived values over duplicated persisted
counters.; Keep domain functions pure where possible. - Comment why, not
obvious syntax. - Preserve the reference UI's whitespace and restraint.
\## Definition of MVP done MVP is complete only when a user can: 1.
Create multiple courses and units from the sidebar. 2.
Create/edit/delete cards in a selected unit. 3. Generate editable AI
draft cards through a protected Vercel endpoint. 4. Study with reveal,
typed, fill-blank, and mixed modes. 5. Receive case-insensitive and
conservative typo-tolerant grading. 6. Have every legitimate review
update one shared FSRS memory state. 7. Return later and see correct due
cards. 8. Earn points through legitimate study. 9. Build a daily streak
under defined qualification rules. 10. Buy/equip cosmetics on white cat
Miso. 11. Reload without losing courses, cards, schedules, reviews,
points, streaks, inventory, or equipped cosmetics. 12. Use the core
experience accessibly on desktop and mobile. When ambiguous, preserve
user data, choose the simpler reversible implementation, and document
the assumption in `PLAN.md`.
