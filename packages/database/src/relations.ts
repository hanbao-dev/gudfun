import { defineRelations } from "drizzle-orm";

import * as auth from "./schemas/auth";
import * as shows from "./schemas/shows";
import * as groups from "./schemas/groups";
const schema = { ...auth, ...groups, ...shows };

export const relations = defineRelations(schema, (r) => ({
  user: {
    memberships: r.many.groupMember(),
    sessions: r.many.session(),
    accounts: r.many.account(),
  },
  group: {
    members: r.many.groupMember(),
    grants: r.many.showGroup(),
  },
  groupMember: {
    group: r.one.group({ from: r.groupMember.groupId, to: r.group.id }),
    user: r.one.user({ from: r.groupMember.userId, to: r.user.id }),
  },
  show: {
    grants: r.many.showGroup(),
    segments: r.many.segment(),
  },
  showGroup: {
    show: r.one.show({ from: r.showGroup.showId, to: r.show.id }),
    group: r.one.group({ from: r.showGroup.groupId, to: r.group.id }),
  },
  segment: {
    show: r.one.show({ from: r.segment.showId, to: r.show.id }),
  },
  session: {
    user: r.one.user({
      from: r.session.userId,
      to: r.user.id,
    }),
  },
  account: {
    user: r.one.user({
      from: r.account.userId,
      to: r.user.id,
    }),
  },
}));
