import { ShowSchedule } from "@/components/show-schedule"
import { SegmentEditor } from "@/components/segment-editor"
import { useState } from "react"
import { useQuery, useZero } from "@rocicorp/zero/react"
import {
  mutators,
  queries,
  showFeatureTypes,
  type Schema,
  type ShowFeature,
} from "zero"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { useAdminMutation } from "@/hooks/use-admin-mutation"

export function AdminPanel() {
  const zero = useZero<Schema>()
  const [shows, showsResult] = useQuery(queries.admin.shows())
  const [groups, groupsResult] = useQuery(queries.admin.groups())
  const [users, usersResult] = useQuery(queries.admin.users())
  const [showId, setShowId] = useState("")
  const [groupId, setGroupId] = useState("")
  const { pending, error, run } = useAdminMutation()
  const show = shows.find((s) => s.id === showId)
  const group = groups.find((g) => g.id === groupId)
  const results = [showsResult, groupsResult, usersResult]
  if (results.some((r) => r.type === "error"))
    return (
      <p role="alert">
        Unable to load admin data. Reload after checking your admin access.
      </p>
    )
  if (results.some((r) => r.type !== "complete"))
    return <p role="status">Loading admin…</p>

  return (
    <section className="space-y-6">
      {error && (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      )}
      {pending && (
        <p role="status" className="text-muted-foreground">
          Saving…
        </p>
      )}
      <fieldset disabled={pending} className="space-y-6 disabled:opacity-60">
        <section className="space-y-3">
          <h3 className="font-semibold">Groups</h3>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              const name = String(new FormData(e.currentTarget).get("name"))
              void run(() =>
                zero.mutate(
                  mutators.groups.create({ id: crypto.randomUUID(), name })
                )
              )
            }}
          >
            <Input
              name="name"
              aria-label="New group name"
              placeholder="Group name"
              required
              maxLength={200}
            />
            <Button type="submit">Create group</Button>
          </form>
          <NativeSelect
            aria-label="Manage group"
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
          >
            <NativeSelectOption value="">Choose group</NativeSelectOption>
            {groups.map((g) => (
              <NativeSelectOption key={g.id} value={g.id}>
                {g.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          {group && (
            <div className="space-y-3 rounded-lg border p-4">
              <form
                key={`${group.id}:${group.name}`}
                className="flex flex-wrap gap-2"
                onSubmit={(e) => {
                  e.preventDefault()
                  const name = String(new FormData(e.currentTarget).get("name"))
                  void run(() =>
                    zero.mutate(mutators.groups.rename({ id: group.id, name }))
                  )
                }}
              >
                <Input
                  name="name"
                  aria-label="Group name"
                  defaultValue={group.name}
                  required
                  maxLength={200}
                />
                <Button type="submit">Rename</Button>
                <Button
                  variant="destructive"
                  onClick={() =>
                    void run(() =>
                      zero.mutate(mutators.groups.remove({ id: group.id }))
                    )
                  }
                >
                  Delete group and its access grants
                </Button>
              </form>
              <p className="text-sm text-muted-foreground">Members</p>
              {users.map((user) => {
                const member = group.members.some((m) => m.userId === user.id)
                return (
                  <div
                    key={user.id}
                    className="flex items-center justify-between gap-2"
                  >
                    <span>
                      {user.name}{" "}
                      <span className="text-sm text-muted-foreground">
                        {user.username ? `@${user.username}` : user.id}
                      </span>
                    </span>
                    <Button
                      variant="outline"
                      aria-pressed={member}
                      onClick={() =>
                        void run(() =>
                          zero.mutate(
                            mutators.groups.membership({
                              groupId: group.id,
                              userId: user.id,
                              enabled: !member,
                            })
                          )
                        )
                      }
                    >
                      {member ? "Remove" : "Add"}
                    </Button>
                  </div>
                )
              })}
            </div>
          )}
        </section>
        <section className="space-y-3">
          <h3 className="font-semibold">Shows</h3>
          <form
            className="flex flex-wrap gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              const data = new FormData(e.currentTarget)
              const title = String(data.get("title"))
              void run(() =>
                zero.mutate(
                  mutators.shows.create({
                    id: crypto.randomUUID(),
                    title,
                    features: [],
                    isPublic: data.get("visibility") === "public",
                  })
                )
              )
            }}
          >
            <Input
              name="title"
              aria-label="New show title"
              placeholder="Show title"
              required
              maxLength={200}
            />
            <NativeSelect
              name="visibility"
              aria-label="New show visibility"
              defaultValue="private"
            >
              <NativeSelectOption value="private">Private</NativeSelectOption>
              <NativeSelectOption value="public">Public</NativeSelectOption>
            </NativeSelect>
            <Button type="submit">Create show</Button>
          </form>
          <NativeSelect
            aria-label="Manage show"
            value={showId}
            onChange={(e) => setShowId(e.target.value)}
          >
            <NativeSelectOption value="">Choose show</NativeSelectOption>
            {shows.map((s) => (
              <NativeSelectOption key={s.id} value={s.id}>
                {s.title}
                {` (${s.status})`}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          {show && (
            <fieldset
              disabled={show.status === "ended"}
              className="space-y-4 rounded-lg border p-4"
            >
              <ShowSchedule
                key={`${show.id}:${show.scheduledStart}`}
                show={show}
              />
              <form
                key={`${show.id}:${show.title}`}
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault()
                  const title = String(
                    new FormData(e.currentTarget).get("title")
                  )
                  void run(() =>
                    zero.mutate(
                      mutators.shows.update({
                        id: show.id,
                        title,
                        features: [...(show.features ?? [])] as ShowFeature[],
                      })
                    )
                  )
                }}
              >
                <Input
                  name="title"
                  aria-label="Show title"
                  defaultValue={show.title}
                  required
                  maxLength={200}
                />
                <Button type="submit">Save title</Button>
              </form>
              <h4 className="font-medium">Visibility</h4>
              <NativeSelect
                aria-label="Show visibility"
                value={show.isPublic ? "public" : "private"}
                onChange={(e) =>
                  void run(() =>
                    zero.mutate(
                      mutators.shows.setVisibility({
                        id: show.id,
                        isPublic: e.target.value === "public",
                      })
                    )
                  )
                }
              >
                <NativeSelectOption value="private">Private</NativeSelectOption>
                <NativeSelectOption value="public">Public</NativeSelectOption>
              </NativeSelect>
              <p className="text-sm text-muted-foreground">
                {show.isPublic
                  ? "All logged-in users can view this show. Saved group grants apply only when private."
                  : "Only members of allowed groups can view this show, including admins. Without groups, nobody has access."}
              </p>
              {!show.isPublic && (
                <div className="space-y-3">
                  <h4 className="font-medium">Group access</h4>
                  {!groups.length && (
                    <p className="text-sm text-muted-foreground">
                      Create a group to grant access.
                    </p>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {groups.map((g) => {
                      const enabled = show.grants.some(
                        (grant) => grant.groupId === g.id
                      )
                      return (
                        <Button
                          key={g.id}
                          variant={enabled ? "default" : "outline"}
                          aria-pressed={enabled}
                          onClick={() =>
                            void run(() =>
                              zero.mutate(
                                mutators.shows.access({
                                  showId: show.id,
                                  groupId: g.id,
                                  enabled: !enabled,
                                })
                              )
                            )
                          }
                        >
                          {g.name}: {enabled ? "allowed" : "no access"}
                        </Button>
                      )
                    })}
                  </div>
                </div>
              )}
              <h4 className="font-medium">Available features</h4>
              <p className="text-sm text-muted-foreground">
                Configuration only; these experiences are not implemented yet.
              </p>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(showFeatureTypes) as ShowFeature[]).map(
                  (feature) => {
                    const enabled = (show.features ?? []).includes(feature)
                    const features = (
                      enabled
                        ? (show.features ?? []).filter((f) => f !== feature)
                        : [...(show.features ?? []), feature]
                    ) as ShowFeature[]
                    return (
                      <Button
                        key={feature}
                        variant={enabled ? "default" : "outline"}
                        aria-pressed={enabled}
                        onClick={() =>
                          void run(() =>
                            zero.mutate(
                              mutators.shows.update({
                                id: show.id,
                                title: show.title,
                                features,
                              })
                            )
                          )
                        }
                      >
                        {showFeatureTypes[feature].label}
                      </Button>
                    )
                  }
                )}
              </div>
              <h4 className="font-medium">Segments</h4>
              <SegmentEditor key={show.id} showId={show.id} />
              {!show.segments.length && (
                <p className="text-sm text-muted-foreground">
                  No segments yet.
                </p>
              )}
              {show.segments.map((segment, index) => (
                <div
                  key={segment.id}
                  className="flex flex-wrap items-center gap-2"
                >
                  <span className="mr-auto">
                    {index + 1}. {segment.title}
                    {segment.isCurrent ? " (current)" : ""}
                  </span>
                  <SegmentEditor
                    key={JSON.stringify([
                      segment.title,
                      segment.type,
                      segment.configuration,
                    ])}
                    showId={show.id}
                    segment={segment}
                  />
                  {([-1, 1] as const).map((direction) => (
                    <Button
                      key={direction}
                      variant="outline"
                      disabled={
                        index + direction < 0 ||
                        index + direction >= show.segments.length
                      }
                      aria-label={`Move ${segment.title} ${direction < 0 ? "up" : "down"}`}
                      onClick={() => {
                        const ids = show.segments.map((s) => s.id)
                        ;[ids[index], ids[index + direction]] = [
                          ids[index + direction],
                          ids[index],
                        ]
                        void run(() =>
                          zero.mutate(
                            mutators.segments.reorder({ showId: show.id, ids })
                          )
                        )
                      }}
                    >
                      {direction < 0 ? "↑" : "↓"}
                    </Button>
                  ))}
                  <Button
                    variant="outline"
                    onClick={() =>
                      void run(() =>
                        zero.mutate(
                          mutators.segments.setCurrent({
                            showId: show.id,
                            id: segment.isCurrent ? null : segment.id,
                          })
                        )
                      )
                    }
                  >
                    {segment.isCurrent ? "Clear current" : "Make current"}
                  </Button>
                </div>
              ))}
            </fieldset>
          )}
        </section>
      </fieldset>
    </section>
  )
}
