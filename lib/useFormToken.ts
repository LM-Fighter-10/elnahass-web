"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  FORM_TOKEN_ENDPOINT,
  FORM_TOKEN_MAX_AGE_MS,
  FORM_TOKEN_MIN_AGE_MS,
} from "@/lib/spam-constants";

type TokenEntry = { token: string; fetchedAt: number };

async function fetchToken(): Promise<TokenEntry | null> {
  try {
    const res = await fetch(FORM_TOKEN_ENDPOINT, { cache: "no-store" });
    if (!res.ok) return null;
    const body = (await res.json()) as { token?: unknown };
    return typeof body.token === "string"
      ? { token: body.token, fetchedAt: Date.now() }
      : null;
  } catch {
    return null;
  }
}

/**
 * Prefetches a signed single-use contact-form token once the form is opened.
 * `takeToken()` returns a token that is old enough to pass the server's
 * min-age check (waiting if needed) and queues a fresh one for the next submit.
 */
export function useFormToken(enabled: boolean): () => Promise<string> {
  const pending = useRef<Promise<TokenEntry | null> | null>(null);

  const refresh = useCallback(() => {
    pending.current = fetchToken();
    return pending.current;
  }, []);

  useEffect(() => {
    if (enabled && !pending.current) void refresh();
  }, [enabled, refresh]);

  return useCallback(async () => {
    let entry = await (pending.current ?? refresh());
    const stale =
      entry && Date.now() - entry.fetchedAt > FORM_TOKEN_MAX_AGE_MS - 10 * 60_000;
    if (!entry || stale) entry = await refresh();
    // Tokens are single-use: queue the next one now.
    void refresh();
    if (!entry) return "";
    const wait = FORM_TOKEN_MIN_AGE_MS + 300 - (Date.now() - entry.fetchedAt);
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    return entry.token;
  }, [refresh]);
}
