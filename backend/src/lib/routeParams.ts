/** Normalize Express `req.params` values that may be typed as `string | string[]`. */
export function routeParam(params: Record<string, string | string[] | undefined>, key: string): string {
  const v = params[key];
  if (v === undefined) return "";
  return Array.isArray(v) ? v[0] ?? "" : v;
}
