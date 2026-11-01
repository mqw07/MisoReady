# Landing page transition — Sky Studio

Status: proposed implementation plan, October 31, 2026. No application changes
are included in this planning step.

## Direction

Build option B as Miso's public front door, within the existing React/Vite project
and Vercel deployment. Keep the study application accessible as a distinct route
branch. Launch with today's device-local storage and working study flows, then
add accounts and database persistence in a separate release.

Reference: `design/landing-mockups/option-b-sky-studio.png`.

## 1. Establish public and application routes

- `/`: public landing page with its own layout and normal document scrolling.
- `/app`: existing Today dashboard and application shell.
- `/app/learn`, `/app/study`, `/app/courses/:courseId`, and
  `/app/courses/:courseId/units/:unitId`: application pages. Move Miso, Shop,
  Stats, and Settings under the same prefix.
- Redirect existing non-root application URLs to their new equivalents using
  history replacement; retain path parameters, query strings, and fragments.
  The old `/` bookmark necessarily becomes the landing page; provide an obvious
  Open Miso action and keep `/app` directly bookmarkable.
- Centralize route builders and update sidebar links, breadcrumbs, delete
  destinations, study exits, dashboard detection, and route tests together.
- Keep the existing origin, storage key, and persisted schema. Moving a URL path
  does not require migrating the existing browser library.

Mount `LibraryProvider` inside the application route boundary. Today it wraps all
routes, loads the library, and requests the `miso-library-writer` Web Lock.
The public page must not load study data or acquire that lock. Lazy-load the app
branch so PDF, scheduling, and study code are not required for the public page.
Reuse existing visual tokens without inheriting the app's fixed-height scrolling
shell or global heading treatment accidentally.

Before allowing navigation out of the application branch, handle failed saves
and in-progress generation explicitly. The existing beforeunload warning does
not protect React Router navigation that unmounts the provider. Preserve retryable
state or block departure with recovery/cancel actions; release the writer lock
only after a safe exit. Ordinary navigation within `/app` keeps the provider mounted.

## 2. Build the visual experience

- Header: Miso wordmark, How it works anchor, and Open Miso.
- Sky-blue hero: "A calmer way to learn.", a concise explanation, and Start
  studying. Use the current sky `#C3E0F2` and tan `#FEF8EC` with cream panels.
- Product preview: a small, explicitly labelled example showing typed recall or
  fill-in-the-blank. A local demonstration can accept an answer and show feedback
  without accessing the user's library, awarding points, or invoking AI.
- Tan lower section: explain the real sequence—add notes, review editable AI
  drafts, then learn and revisit due cards. Finish with a concise Miso/rewards
  section and a repeated entry action.
- Both entry actions go to `/app`. Existing users see their library; new users see
  the existing empty state and course creation flow. State clearly that progress
  is saved on this device. Reserve login/signup placement for the later release.

Use pixel typography selectively for branding and accents, with readable body
text and generous spacing. Scope landing-page styles so existing study screens
do not change as a side effect. Use only implemented capabilities in the preview;
omit the mockup's unsupported Notes and Show hint controls and unverified claims.

## 3. Treat artwork as assets

Inspect and reuse the existing Miso, books, and plant sprites first. If matching
the reference needs new artwork, generate separate transparent assets using the
existing cat as the visual reference. Review the composed hero at desktop and
mobile sizes before extending the rest of the page.

Render detailed artwork as images with preserved aspect ratios, explicit sizes,
and pixel rendering. Build layout, borders, stepped dividers, and simple clouds
with HTML/CSS or SVG. Give decorative images empty alt text; keep meaningful
product text and controls as real HTML. On small screens, simplify decoration
and stack the composition instead of shrinking the entire desktop mockup.

## 4. Prepare for accounts without implementing them yet

The public/app split establishes the future authentication boundary. Keep
authentication state separate from study-library state; do not introduce fake
users or a temporary login screen in this release.

When authentication is implemented, add `/login`, `/signup`, and `/auth/callback`;
resolve session state before loading an account library. Preserve a validated
internal destination when sending users through sign-in. Route guards control
navigation, while server APIs and database policies enforce actual ownership.
At that point, choose whether anonymous local study remains supported.

Sign-out and account switching must clear account-specific in-memory data and
isolate caches by owner. AI generation also needs verified identity and durable
usage limits when account access is introduced. Keep model credentials server-side.

## 5. Migrate persistence as its own release

The existing repository and pure domain transitions are useful boundaries, but
`AppDocumentRepository.load/save` and the provider's mutations are synchronous.
Before database integration, introduce asynchronous queries/commands with loading,
failure, and retry states. Keep UI components independent of the database SDK.

Store user-owned courses, units, cards, reviews, progress, Miso inventory, and
session checkpoints with validated relationships. Commit each review, FSRS change,
reward, and checkpoint atomically. Use unique command/review IDs and revision
checks so retries cannot duplicate rewards or overwrite concurrent changes.
Do not transfer the current whole-document save strategy directly to SQL.

On first sign-in, offer an explicit import of device-local study data. Validate
the import, preserve entity relationships, schedules, history, and cosmetics,
and make retries idempotent with a durable import identifier. Define a merge
policy for accounts that already have data. Retain the original local library
until server verification succeeds; do not silently upload or delete it.
Cross-device offline sync requires a separate conflict/replay policy.

## 6. Delivery sequence and completion checks

1. Add the public/app route split, compatible redirects, safe provider lifecycle,
   and regression coverage while preserving today's dashboard.
2. Implement B's hero and artwork composition, then the product demonstration,
   explanatory sections, and responsive states.
3. Verify landing-to-app entry, existing-library reload, course/unit deep links,
   Learn input modes, due review persistence, and legacy query-string redirects.
   Check that a public tab never blocks an active study tab and that leaving after
   a failed save cannot discard the only recoverable copy.
4. Check keyboard use, focus visibility, contrast, reduced motion, small-screen
   overflow, and image sizing. Compare screenshots against B on desktop/mobile.
5. Run tests, typecheck, lint, and production build; validate Vercel direct-route
   refreshes and unchanged API/asset routing. Add landing title, description, and
   social preview metadata. Use synthetic preview data for QA and check a real
   same-origin upgrade preserves an existing library.
6. Deploy the landing-page release. Implement authentication and database
   migration afterward against the documented boundaries above.

First-release acceptance: B's sky/tan identity is recognizable, all entry actions
work, the existing local study application remains usable, and the public page
is independent of study storage. Account creation and cloud sync are future work.
