export type RouteCtx<T extends Record<string, string> = Record<string, string>> = {
  params: Promise<T>;
};
