// Server-only API Direct integration — disabled-safe.
// Official docs (apidirect.io/docs) are rendered client-side and their endpoints/prices could not be verified,
// so no endpoint is implemented. Never add endpoints, prices or coverage claims without verified docs.

export type ApiDirectStatus = { state: "disabled" | "blocked"; reason: string };

export function apiDirectStatus(): ApiDirectStatus {
  if (!process.env["APIDIRECT_API_KEY"]) return { state: "disabled", reason: "APIDIRECT_API_KEY not configured" };
  return { state: "blocked", reason: "unverified: official endpoint documentation not yet confirmed" };
}

/** Never makes a network call until an endpoint is verified; returns null instead of mock data. */
export async function apiDirectFetch(_capability: string): Promise<null> {
  return null;
}
