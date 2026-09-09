# Shows, schedules, and segments

Shared definitions, permission-scoped queries, and transactional mutations live
here. UI components are replaceable consumers of these operations.

## Local setup

Run `bun run db:migrate` using your existing local configuration, then restart the
API and Zero cache. This phase's generated migration preserves existing active
shows as live, inactive definitions as drafts, and placeholder configuration as
`{}`. Migrated live shows have `actualStart = null`: their historical start is
unknown. The migration was verified against isolated PGlite, not applied to the
local application database by the implementation agent.

The earlier foundation added `user.is_admin` (default false). Set it manually for
your chosen existing user, then sign out/in. No public mutation changes that flag.
Authentication remains exclusively through X. Management is at `/admin/settings`;
`/` is the viewer. API and mutation authorization is independent of the SPA guard.

## Lifecycle

- New shows are drafts. Drafts can be scheduled or started immediately.
- Scheduled shows can be rescheduled, returned to draft, or started early/late.
- Start is manual and preserves any preselected segment. A live show with no
  selected segment displays a waiting state.
- End is manual, clears selection, and preserves definitions/configuration.
  Ended shows are read-only; there is no restart, deletion, or archive UI.
- Repeated starts on a live show and repeated ends on an ended show are no-ops.
  Starting an ended show is rejected. Actual timestamps come only from server
  execution, never mutation arguments or optimistic client time.

The `status` column replaces `isActive`. PostgreSQL checks enforce valid timestamp
combinations; a partial unique index permits only one live show globally. Another
partial unique index permits one selected segment per show. Server mutations lock
the show row before lifecycle or segment reads/writes so competing changes to the
same show serialize. Group membership remains independent of show lifecycle;
deleting a group still removes its memberships and access grants.

## Viewer and time

`shows.current` returns the accessible live show and only its selected segment.
`shows.next` returns one accessible scheduled show, ordered by scheduled instant
and then ID, without its segments. `resolveViewerShow` gives live state priority.
An inaccessible live show does not hide an accessible schedule. When a show ends,
the viewer resolves the next schedule or the empty state. There is no schedule
list. An overdue schedule waits for the host until manually started/rescheduled
or returned to draft; no expiry or automatic lifecycle transitions are added.

Public means all authenticated users. Private shows require membership in a
granted group, including for admins using the viewer. Without grants, nobody can
view a private show. Switching public/private preserves grants. Admin queries can
inspect all shows, including drafts and ended shows. Mutations re-read admin
status inside their transaction; query context is resolved by the API from the
current database user.

Scheduling input uses the admin browser's IANA timezone and accepts dates from
2000 through 2100. A resolved date/time and zone are shown before saving. Invalid
calendar dates, daylight-saving gaps, and repeated local times are rejected;
choose a time outside the repeated hour. PostgreSQL stores `timestamptz`; Zero
represents these instants as epoch milliseconds. Viewer dates include the local
date and timezone, including when viewers are on different calendar days.

An authenticated, uncached `/api/time` endpoint supplies server time. The browser
estimates one-way latency from the request round trip, anchors to
`performance.now()`, and refreshes on login/Zero reconnect, tab return, pageshow,
network return, and every minute while visible. Refresh also resolves both show
queries with Zero's complete-result option. Failed synchronization leaves the
absolute schedule visible and withholds the countdown rather than trusting the
device wall clock. Disconnected viewers see a reconnecting state. Countdown zero
means waiting for the host; it cannot mark a show live.

## Adding a segment type

1. Add its key, label, and configuration schema to `segmentTypes` in
   `src/show-definitions.ts`, and add its branch to `segmentConfigurationSchema`.
   Use `SegmentConfiguration<"yourType">` for its matching TypeScript type.
2. Add its React renderer to the exhaustive renderer map and dispatch in
   `packages/web/src/components/segment-renderer.tsx`. Keep React out of shared
   validation. Saved unknown/invalid data must retain a safe fallback.
3. Add matching fields to `segment-editor.tsx` and test valid/invalid data.

Keys and configuration use text/JSON, so new types do not need SQL migrations.
The initial types are `placeholder` with `{}` and `introVideo` with a validated
HTTP(S) `url`. Video uses native controls and an explicit play action; it is not
synchronized. Failed playback displays a waiting message. There are no embeds,
uploads, hosting integrations, or autoplay requirements.

Segments can be retitled, reconfigured, changed to another validated type,
reordered, or deleted until the show ends. Deleting the current row atomically
clears selection without selecting a replacement. `chat` and `reactions` remain
reserved show-level feature keys with no implemented experience.

## Validation and limits

`bun --no-env-file test` runs isolated PGlite migrations and real Zero operations,
time conversion checks, browser lifecycle controller tests, and renderer checks.
Tests cover authorization, private/public access and revocation, lifecycle and
repeat commands, one-live constraints, next-show resolution, configuration,
selection/deletion, migration preservation, date boundaries, DST (including
half-hour changes), server clock anchoring, reconnect/resume, and stale responses.

Implementation checks: web lint, web TypeScript project build, production bundle,
and Zero/API/database type checks. Bun 1.4.2 from a temporary runtime was used for
generators because the installed default is Bun 1.2.22. The migration and Zero
schema were generated, with an inspected SQL backfill added before dropping the
old active column; generated metadata/schema were not hand-edited.

Real browser end-to-end login, light/dark visual inspection, media decoding/error
handling, and real Zero network/suspension behavior remain unverified. Controller
and renderer tests do not substitute for those browser checks. PGlite serializes
transactions, so its competing-start test is not a multi-connection PostgreSQL
stress test. Use ordinary private shows granted to a test group for browser QA.
No recording, attendance, participation, LiveKit, chat, or deployment work is
included.
