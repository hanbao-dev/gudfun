export type QueryContext = {
  userId: string | undefined;
  isAdmin?: boolean;
};

declare module "@rocicorp/zero" {
  interface DefaultTypes {
    context: QueryContext;
  }
}
