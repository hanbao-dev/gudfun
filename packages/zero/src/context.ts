export type QueryContext = {
  userId: string | undefined;
  // API-resolved for query authorization. Mutators deliberately ignore this
  // snapshot and check the user within their own transaction instead.
  isAdmin?: boolean;
};

declare module "@rocicorp/zero" {
  interface DefaultTypes {
    context: QueryContext;
  }
}
