/**
 * Browser fetch wrapper that auto-handles the "token wiped" case.
 * When the server returns 401 with { tokenMissing: true } (e.g. after dev
 * restart cleared the in-memory store), we send the user to /api/auth/logout
 * → clean session → /meta/login.
 */
export async function apiFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const res = await fetch(input, init);
  if (res.status === 401) {
    try {
      const data = await res.clone().json();
      if (data?.tokenMissing) {
        window.location.href = "/api/auth/logout";
        // Return the response so callers don't crash; the redirect is already in flight.
        return res;
      }
    } catch {
      // not JSON — fall through
    }
  }
  return res;
}
