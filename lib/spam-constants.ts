/**
 * Contact-form anti-spam constants shared by the client forms and the
 * `/api/send` route. Must stay free of Node-only imports (used in client code).
 */

/** Hidden honeypot input. Humans never see it; bots that fill it are dropped. */
export const HONEYPOT_FIELD = "website";

/** Signed, single-use form token fetched by the form before submitting. */
export const FORM_TOKEN_FIELD = "form_token";
export const FORM_TOKEN_ENDPOINT = "/api/form-token";

/** A token younger than this was not filled in by a human. */
export const FORM_TOKEN_MIN_AGE_MS = 3_000;
/** Tokens expire after this long (page left open overnight → refetched). */
export const FORM_TOKEN_MAX_AGE_MS = 12 * 60 * 60 * 1000;
