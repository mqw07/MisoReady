# Browser persistence

The application still saves locally, using the existing app-document repository.
No account, network service, or database is required. Existing schema-v1 data loads
without migration; the session checkpoint is optional and validated separately so
a malformed checkpoint cannot hide an otherwise valid library.

## Concurrency and recovery

One mounted application holds the `miso-library-writer` Web Lock. Other tabs wait
and disable interaction. When the writer closes, the next tab reloads the latest
document before enabling study. Web Locks require a supported browser and a secure
context (HTTPS or localhost). Unsupported contexts disable editing rather than
silently accepting unsafe concurrent writes.

The repository also checks its last loaded/saved raw document before saving.
This catches external modifications, storage clearing, and writes by older app
versions. Conflicts are rejected, never blindly overwritten. The Web Lock closes
the race between checking that baseline and writing among current app instances.

Failed saves retain changes in memory, show a retry control, and request the
browser's leave-page warning. Retrying saves that same state, including review IDs,
instead of recording another review. Browsers may suppress leave-page prompts;
closing a tab with unsaved changes can still lose those changes. Browser storage
clearing and device loss remain outside this local-only protection.

Each rating writes its review, schedule, rewards, and session checkpoint together
in one document write. Reload restores rated progress and summary totals. Answers
that have not been rated must be entered again. Starting a new session clears the
checkpoint without clearing reviews. A deleted card or missing review invalidates
only the checkpoint. One checkpoint is retained; studying another scope or mode
can replace it when its first rating is submitted.

## Learn format compatibility

Learn checkpoints retain historical multiple-choice attempts, but remove that
format from active selections on load. Choice-only selections become typing;
previous recognition counters/history remain, while cards lacking typed recall
mastery are queued again. Mixed selections retain their supported formats. This
field-level compatibility migration keeps schema-v1 libraries readable without
wiping cards or progress. New sessions default to typing and fill-in-the-blank.
Committed attempts determine the next format per card, so reload resumes that
format. Unsubmitted answers are entered again. Learn remains practice only and
does not write FSRS schedules, review records, points, or streak credit.

## Future Postgres adapter

Keep storage access in repositories and domain transitions in services/mutations.
The current synchronous repository is a browser adapter, not a network API contract.
A server adapter should use asynchronous commands and loading/error UI, authenticated
user ownership, server-side revision checks, and unique review/command IDs for retries.
Write the review, FSRS transition, reward changes, and session checkpoint in a single
Postgres transaction. Do not port whole-document last-writer-wins saves to SQL.
The browser-wide lock can then be replaced with server concurrency control; offline
commands will require an explicit synchronization and conflict policy.

## Verification

Repository recovery tests cover stale saves, quota failures and retry, partial and
completed custom/scheduled session reloads, duplicate submission after completion,
and missing cards/history. Provider tests simulate Web Locks to verify writer
handoff, fresh-state loading, blocked writes, and leave-page warnings. These are
automated browser-environment tests, not a native multi-tab browser certification.
