/**
 * Auth Fetch Helper
 *
 * Attaches the Supabase JWT to all outgoing requests.
 * Falls back silently if no session exists (guest mode).
 */
import { supabase } from "./supabase";

export async function authFetch(
  input: string | URL | Request,
  init?: RequestInit,
): Promise<Response> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  return fetch(input, {
    ...init,
    headers,
  });
}
