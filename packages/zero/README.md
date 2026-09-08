# Show foundation

Show definitions, permission-scoped queries, and mutations live in this shared
package. UI components are replaceable consumers of these operations.

## Local setup

Run `bun run db:migrate` with your existing local database configuration, then
restart the API and Zero cache to pick up the schema. The feature migration adds
`user.is_admin` with a default of `false`. Manually set that column to `true` for
your chosen existing user, then sign out and back in to refresh the auth session.
There is no public mutation or auth input for changing this flag.

Admin management lives at `/admin/settings`, linked from the authenticated app
for admins. Its client route guard waits for the user record and redirects
non-admins to `/`; signed-out visitors return to the login page. The main `/`
page only displays the current show. API authorization still protects all
management operations independently of this SPA guard.

An admin can create groups, toggle membership for existing users, create an
inactive public or private show, grant groups access to private shows, add/reorder segments, select a current
segment, and activate the show. Deactivate the previous show before activating
another. Public shows are visible to all logged-in users without groups. Private shows
without grants are visible to nobody, including admins in the viewer experience.
Existing shows default to private. Switching to public preserves saved grants,
which apply again when the show is made private. Admin management queries can still inspect inactive and
unassigned shows.

The viewer resolves only an active show that is public or has a grant to one of
their groups. Public visibility still requires authentication.
Its segment relation includes only the current segment. No active show and no
access deliberately share the same empty state. Removing a membership, grant,
or group removes that private-show access. Group deletion also removes its memberships and
grants.

## Extending the foundation

`src/show-definitions.ts` defines valid segment and feature keys and labels.
Persisted keys use text/JSON, so adding a key does not require a SQL migration.
Only `placeholder` segments exist. `chat` and `reactions` are reserved configuration
flags with no implemented experience. `hasShowFeature` is the shared feature
check. Add future renderers independently of the queries and mutations.

The basic show state is active/inactive. PostgreSQL partial unique indexes enforce
one active show globally and one current segment per show, including competing
writes. Selecting a segment clears the previous selection in the same transaction.
Ordering validates the complete segment ID list and sorts ties by ID, so concurrent
appends remain deterministic. No scheduling, media, or custom realtime transport
is included; the application continues to use its existing Zero data layer.

All admin mutations check the current database user inside the transaction.
Admin query context is constructed by the API from a fresh database lookup;
client-provided admin claims are not accepted by that endpoint. Mutations only
need userId in server context: they resolve isAdmin within the transaction rather
than trusting a pre-transaction flag. The optional context flag is for queries.
Group and membership tables live in schemas/groups; show tables, segments, and
show access grants live in schemas/shows in the database package. Viewer access is
part of the query itself. Authentication remains exclusively through X.

## Validation

`bun test` runs the generated migrations and the real Zero queries/mutations
against an isolated in-memory PGlite database; it never connects to your local
application database. Tests cover authorization, access revocation, state changes,
segment ordering/selection, validation, and database constraints.
