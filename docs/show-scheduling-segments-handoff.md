# Next implementation: scheduling and segment configuration

Implementation notes and validation are now in
[`packages/zero/README.md`](../packages/zero/README.md). Clarifications accepted
before implementation: viewers need only the next show, with no additional
overdue-management workflow; ended shows are read-only. Show deletion, recording,
attendance, and participation tracking remain outside this phase.

## Handoff status

This branch is based on `develop` at `e6b5245`, which includes merged PR #2.
This handoff adds instructions only: no application code or migrations have been
changed for this phase. Implement the work below when the user assigns this
branch to an implementation agent. Read `AGENTS.md`, inspect the current code,
and consult the relevant documentation before coding. Target `develop` for the eventual implementation PR; the existing show
foundation is already included in that branch.

## Objective and user decisions

Build the remaining show fundamentals before LiveKit, chat, or a UI redesign:
basic scheduling and lifecycle, configurable segment types, segment editing and
removal, and correct viewer timing across time zones.

- Only one show can be live at a time. Different shows may have different formats.
- Expected volume is roughly three shows per week, generally no more than one
  per day. Do not build scheduling conflict detection, reservations, recurrence,
  automatic handovers, or complex calendar infrastructure.
- Use scheduled times with manual host/admin start and end controls for this
  phase. A scheduled time is an intention; host activation determines live state.
- Testing uses ordinary private shows granted to a normal test group. Do not
  create preview mode, special test-group behavior, or an access bypass. Preserve
  public/private visibility and generic group membership from the foundation.
- Everyone must observe the same scheduled instant and actual host-live state,
  regardless of their local time zone, when they log in or return to the app.
- Keep management on the guarded `/admin/settings` page. The `/` page is the
  viewer experience; future in-show host controls are not part of this phase.
- Keep UI minimal, replaceable, and usable in light and dark mode. A separate UI
  improvement pass is planned after the fundamentals.

## Existing foundation to reuse

- Database definitions: `packages/database/src/schemas/groups` and `schemas/shows`.
- Shared types and validation: `packages/zero/src/show-definitions.ts`.
- Permission-scoped queries and transactional writes: Zero queries and mutators.
- Viewer: `packages/web/src/components/show-view.tsx`.
- Management: `packages/web/src/components/admin-panel.tsx` and
  `packages/web/src/pages/AdminSettingsPage.tsx`.
- Tests: `packages/zero/tests/shows.test.ts`, using PGlite and real Zero operations.

Admin query context is resolved by the API from the database. Admin mutations
check the user inside the write transaction and intentionally do not trust an
`isAdmin` context snapshot. Preserve this distinction and all server permission
checks. The SPA guard is navigation behavior, not the security boundary.

## Scheduling and lifecycle

Introduce the smallest explicit lifecycle covering draft, scheduled, live, and
ended shows, with a scheduled start instant and authoritative actual start/end
timestamps. Define valid states and transitions in shared code. Reconcile or
replace the existing `isActive` flag so there is one source of truth for live
state. Preserve the database guarantee of at most one live show under concurrent
writes, but do not add schedule-overlap rules.

Allow admins to set/change an upcoming start time, start a show manually, and end
a live show. Do not start or end shows merely because a client clock reaches a
time. Record actual timestamps on the authoritative server execution; optimistic
client estimates must not determine persisted host timing. Keep replay behavior
and client/server mutation execution in mind. Repeated starts/ends must not reset
actual timestamps or accidentally reopen an ended show.

Use these default rules unless existing code reveals a concrete reason to adjust:

- A draft may be scheduled or started directly. A scheduled show may be edited,
  returned to draft, or started early/late by its host/admin.
- Ended shows are terminal for this phase; no restart/replay workflow is needed.
- Segment selection is explicit. Starting a show preserves a preselected segment
  rather than silently choosing one. A live show without a selected segment gets
  a simple waiting state.
- Ending a show clears its current selection and stops exposing its live segment
  through the viewer query. Preserve segment definitions/configuration.
- Do not allow segment selection on an ended show.

Migrate existing data deliberately: preserve active shows as live and preserve
inactive show definitions. Do not invent historical actual-start times for shows
already live at migration; represent unavailable history explicitly if necessary.

## Time zones and consistent time

Treat a time zone as a display/input concern, never as a different show schedule.

- Persist actual instants using timezone-aware PostgreSQL timestamps, represented
  consistently as UTC/epoch values across server and Zero. Never persist a bare
  browser-local datetime string as a globally meaningful instant.
- Admin scheduling fields must clearly identify their input time zone. Using the
  admin's browser IANA time zone is sufficient for this phase. Convert input to
  an absolute instant before saving and show the resolved date/time with its zone
  for review. Do not silently accept invalid or ambiguous daylight-saving input;
  use explicit offset disambiguation or ask for an unambiguous time.
- Render the same instant in each viewer's local time zone, with a clear zone
  label. Account for differing dates across zones, not just different hours.
- Derive countdowns from the scheduled instant and a shared server-time reference.
  Reconcile device clock skew with a lightweight server-time offset, refreshed on
  login/reconnect/return from suspension. Use the existing data/API architecture;
  a small authenticated time endpoint is appropriate if Zero cannot supply this.
  Avoid a new custom realtime transport or an elaborate clock service.
- A countdown reaching zero while the host has not started means waiting for the
  host. It must not independently mark the show live or count below zero forever.
- On login, refresh, reconnect, and return to a backgrounded tab, resolve the
  current authoritative show state. Someone joining late sees the host's current
  show and selected segment, not a new session starting from their login time.
- Distinguish schedule time from actual live start. If an elapsed-live indicator
  is shown, base it on the authoritative actual start, not the schedule or local
  page load time. Do not promise frame-accurate video/media synchronization in
  this phase.

## Viewer resolution

Keep this logic in shared, permission-scoped queries/helpers rather than JSX:

1. An accessible live show takes priority.
2. Otherwise show the next accessible scheduled show and its local start time /
   countdown, including a waiting-for-host state if its start has passed.
3. Otherwise show the simple no-show-available state.

Unauthenticated visitors still see login. Inaccessible shows must not leak their
titles, times, segments, or configuration. Do not let an inaccessible live show
hide an accessible upcoming show. A private show without grants remains invisible
to everyone in the viewer, including admins. Admin management can still inspect
all shows. After ending, return to the next accessible schedule or empty state;
a simple ended message for a viewer who was watching is enough, with no archive
or history product.

## Segment configuration and rendering

A segment instance has a title, a type, a position, and configuration. Its type
selects its renderer and behavior; its title is a label. Multiple instances may
share a type while having different titles/configuration.

- Extend the central segment registry with a validation schema per type and a
  matching TypeScript configuration type. Use discriminated validation so the
  selected type and configuration cannot disagree.
- Persist configuration in JSON, with allowed type keys defined in application
  code, not SQL enums. Adding a future type should require shared definitions and
  web UI, not a database migration.
- Add a web renderer map keyed by segment type. Keep React components out of the
  shared server/client validation module. Make omitted renderer mappings visible
  at compile time where practical and provide a safe fallback for unknown data.
- Add matching minimal admin configuration fields when adding/editing a segment.
  Validate on the server even if the client has already validated.
- Implement one simple configured segment to prove the whole flow: an intro video
  with a validated HTTP(S) video URL. Use a plain video element for a browser-
  playable source; do not add uploads, arbitrary HTML/embed execution, media
  hosting, provider integrations, or synchronized playback infrastructure. Handle
  missing/unplayable media and browser autoplay restrictions gracefully.
- Preserve the placeholder type and migrate its existing configuration to an
  appropriate empty value. Render saved data safely if a type becomes unknown.
- Support editing titles/configuration, deleting segments, and existing ordering.
  If editing the type is offered, replace/revalidate configuration for that type.
  Deleting the current segment must clear selection atomically; viewers then see
  the waiting state. Never implicitly select the next segment.
- Feature keys remain show-level capabilities, separate from segment types.
  Do not implement chat, reactions, or their UI as part of this work.

## Explicit exclusions

No preview mode; special audience types; show templates; formal NFT/coding show
categories; recurring schedules; schedule-conflict management; automatic show
activation; LiveKit; broadcast/speaker controls; chat; reactions; Q&A; polished
UI; production deployment configuration; or new secret management.

## Validation and delivery

Extend the existing meaningful integration tests and add focused time-conversion
checks. Cover:

- Valid/invalid transitions, manual early/late starts, end behavior, repeated
  commands, and enforcement of one live show.
- Public/private access, group grants, no leakage of inaccessible upcoming shows,
  accessible-live priority, and next-show/empty/waiting states.
- Identical absolute schedule/countdown targets across distant time zones and
  date boundaries, daylight-saving edge cases, device clock skew, reconnect, and
  late joining after actual host start.
- Type/config validation, unknown types, editing/removing/reordering segments,
  deletion of the current segment, and migration of existing records.
- Existing non-admin/unauthenticated denials at query and mutation boundaries.

Use private-group shows for end-to-end testing, never a preview access exception.
Run applicable web lint, type checks, production build, Zero/API/database type
checks, integration tests, and `git diff --check`. Generate and inspect Drizzle
migrations and regenerate the Zero schema; never edit generated schema/metadata
by hand. Do not read, print, or modify `.env` values. The foundation used a
current temporary Bun runtime because installed Bun 1.2.22 could not run current
generators; inspect available runtimes before assuming this issue persists.

Document lifecycle rules, scheduling input/display conventions, how to add a
segment type, tests performed, and any unverified browser behavior. Keep domain
logic independent of the disposable UI. Open a focused implementation PR against
the appropriate base when ready; do not merge or deploy automatically.
