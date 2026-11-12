/**
 * Server-side anti-spam for the public contact form (`/api/send`).
 *
 * Layers (cheapest first):
 *  1. Cross-site / oversized request rejection
 *  2. Honeypot field
 *  3. Strict field validation (same rules as the client + URL / spam-term checks)
 *  4. HMAC-signed, time-gated, single-use form token
 *  5. Email domain must resolve (no auto-replies to fake domains)
 *  6. Rate limits per IP, per email, and a global hourly cap on SMTP sends
 */
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { promises as dns } from "node:dns";
import type { Db } from "mongodb";
import { getDb } from "@/lib/mongo";
import {
  FORM_TOKEN_MAX_AGE_MS,
  FORM_TOKEN_MIN_AGE_MS,
} from "@/lib/spam-constants";
import {
  validateDescription,
  validateEmail,
  validateName,
  validatePhone,
} from "@/lib/validation";

export type ContactFields = {
  name: string;
  email: string;
  phone: string;
  outlineDesc: string;
};

// ---------------------------------------------------------------------------
// Form token
// ---------------------------------------------------------------------------

const DEV_SECRET = "dev-only-change-me-elnahass-admin-session-secret-32chars";

function tokenSecret(): string {
  return (
    process.env.FORM_TOKEN_SECRET ||
    process.env.SESSION_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    DEV_SECRET
  );
}

function sign(payload: string): string {
  return createHmac("sha256", tokenSecret())
    .update(`contact-form:${payload}`)
    .digest("base64url");
}

/** `<issuedAt base36>.<nonce>.<hmac>` */
export function issueFormToken(now = Date.now()): string {
  const payload = `${now.toString(36)}.${randomBytes(16).toString("base64url")}`;
  return `${payload}.${sign(payload)}`;
}

export type TokenCheck =
  | { ok: true; nonce: string; issuedAt: number }
  | { ok: false; reason: string };

export function verifyFormToken(token: string, now = Date.now()): TokenCheck {
  if (!token || token.length > 200) return { ok: false, reason: "token-missing" };
  const parts = token.split(".");
  if (parts.length !== 3) return { ok: false, reason: "token-malformed" };
  const [ts, nonce, sig] = parts;

  const expected = Buffer.from(sign(`${ts}.${nonce}`));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) {
    return { ok: false, reason: "token-bad-signature" };
  }

  const issuedAt = parseInt(ts, 36);
  if (!Number.isFinite(issuedAt)) return { ok: false, reason: "token-malformed" };
  const age = now - issuedAt;
  if (age < FORM_TOKEN_MIN_AGE_MS) return { ok: false, reason: "token-too-fast" };
  if (age > FORM_TOKEN_MAX_AGE_MS) return { ok: false, reason: "token-expired" };
  return { ok: true, nonce, issuedAt };
}

// ---------------------------------------------------------------------------
// Request-level checks
// ---------------------------------------------------------------------------

export const MAX_BODY_BYTES = 8 * 1024;

export function getClientIp(headers: Headers): string {
  // On Vercel these are set by the edge network (client-supplied values are overwritten).
  const real = headers.get("x-real-ip")?.trim();
  if (real) return real;
  const fwd = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return fwd || "unknown";
}

/**
 * Rate-limit key for an IP. IPv6 clients usually control a whole /64, so
 * rotating addresses inside it must not reset their limits.
 */
export function ipRateKey(ip: string): string {
  if (!ip.includes(":") || ip.startsWith("::ffff:")) {
    return `ip:${ip.replace(/^::ffff:/, "")}`;
  }
  const [head, tail = ""] = ip.split("%")[0].toLowerCase().split("::");
  const headParts = head ? head.split(":") : [];
  const tailParts = tail ? tail.split(":") : [];
  const missing = Math.max(0, 8 - headParts.length - tailParts.length);
  const full = ip.includes("::")
    ? [...headParts, ...Array(missing).fill("0"), ...tailParts]
    : headParts;
  return `ip6:${full.slice(0, 4).map((h) => h || "0").join(":")}::/64`;
}

/** True when a browser tells us the POST came from another site. */
export function isCrossSiteRequest(headers: Headers): boolean {
  if (headers.get("sec-fetch-site") === "cross-site") return true;
  const origin = headers.get("origin");
  if (!origin || origin === "null") return origin === "null";
  const host = headers.get("x-forwarded-host") || headers.get("host");
  if (!host) return false;
  try {
    return new URL(origin).host !== host;
  } catch {
    return true;
  }
}

// ---------------------------------------------------------------------------
// Content validation
// ---------------------------------------------------------------------------

/** Zero-width / bidi marks that sneak in when pasting Arabic text. */
const INVISIBLE_CHARS = /[​-‏‪-‮⁦-⁩؜﻿]/g;

/** Normalize a free-text field before validation and storage. */
export function cleanText(value: string): string {
  return value
    .normalize("NFKC")
    .replace(INVISIBLE_CHARS, "")
    .replace(/\r\n?/g, "\n")
    .trim();
}

/** Letters (any script, incl. Arabic) plus space . , ، ' ’ & ( ) / - */
const NAME_PATTERN = /^[\p{L}\p{M}][\p{L}\p{M}'’.,،&()/ -]*$/u;

/** A dot glued to a letter ("reelshub.com") — a domain, not "Dr. Ahmed". */
const NAME_DOMAIN_TOKEN = /[.。．․]\p{L}/u;

/** Unambiguous link markers (any case). */
const LINK_MARKERS =
  /(https?:|ftp:|www\.|\.(php|html?|aspx?)\b|<\s*a\b|\[\s*url|\b(bit\.ly|t\.me|tinyurl|wa\.me|cutt\.ly|rb\.gy)\b)/i;

/**
 * Bare spammy-TLD domains. Lowercase only, so a missing space after a
 * sentence ("Zayed.Site visit") is not mistaken for a domain.
 */
const BARE_SPAM_DOMAIN =
  /\b[a-z0-9-]{2,}\.(ru|su|xyz|top|click|link|shop|site|online|icu|buzz|live|cn|tk|ml|ga|cf|gq|cc|biz)\b/;

/** Location links customers legitimately share. */
const MAP_LINKS =
  /\bhttps?:\/\/(maps\.app\.goo\.gl|goo\.gl\/maps|(www\.)?google\.[a-z.]+\/maps|maps\.google\.[a-z.]+)\S*/gi;

const SPAM_TERMS =
  /\b(crypto|bitcoin|btc|usdt|casino|betting|1win|forex|airdrop|viagra|cialis|porn|seo|backlinks?|claim your|check your balance|free money)\b/i;

/** Emoji / pictographs / dingbats — never in a genuine name. */
const PICTOGRAPHS = /[\p{Extended_Pictographic}✀-➿]/u;

function hasLink(text: string): boolean {
  return LINK_MARKERS.test(text) || BARE_SPAM_DOMAIN.test(text);
}

/** Expects fields already passed through cleanText(). */
export function validateContactFields(f: ContactFields): string | null {
  const { name, email, phone, outlineDesc } = f;

  if (name.length < 2 || name.length > 80) return "name-length";
  if (validateName(name) || !NAME_PATTERN.test(name)) return "name-format";
  if (NAME_DOMAIN_TOKEN.test(name)) return "name-domain";
  if (name.split(/\s+/).length > 12) return "name-words";

  if (email.length > 254 || validateEmail(email)) return "email-format";

  if (validatePhone(phone)) return "phone-format";
  if (/^(\d)\1+$/.test(phone)) return "phone-repeated";

  if (outlineDesc.length > 200 || validateDescription(outlineDesc)) {
    return "desc-length";
  }

  for (const value of [name, email, phone, outlineDesc]) {
    if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(value)) {
      return "control-chars";
    }
  }
  if (PICTOGRAPHS.test(name)) return "emoji";
  if (hasLink(name) || hasLink(outlineDesc.replace(MAP_LINKS, ""))) return "link";
  if (SPAM_TERMS.test(name) || SPAM_TERMS.test(outlineDesc)) return "spam-terms";
  if (SPAM_TERMS.test(email.split("@")[1] ?? "")) return "spam-domain";
  return null;
}

// ---------------------------------------------------------------------------
// Email domain check
// ---------------------------------------------------------------------------

const DNS_TIMEOUT_MS = 4_000;

type Lookup<T> = { ok: true; value: T } | { ok: false; code: string };

async function lookup<T>(p: Promise<T>): Promise<Lookup<T>> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<Lookup<T>>((r) => {
    timer = setTimeout(() => r({ ok: false, code: "TIMEOUT" }), DNS_TIMEOUT_MS);
  });
  try {
    return await Promise.race([
      p.then(
        (value): Lookup<T> => ({ ok: true, value }),
        (err): Lookup<T> => ({
          ok: false,
          code: String((err as { code?: string } | null)?.code ?? "ERROR"),
        }),
      ),
      timeout,
    ]);
  } finally {
    clearTimeout(timer);
  }
}

const NO_RECORD = new Set(["ENOTFOUND", "ENODATA"]);

/**
 * False only when DNS definitively says the domain cannot receive mail
 * (RFC 7505 null MX, or no MX and no A record). Timeouts / resolver errors
 * fail open so real leads are never lost to DNS hiccups.
 */
export async function emailDomainAcceptsMail(email: string): Promise<boolean> {
  if (process.env.CONTACT_EMAIL_DNS_CHECK_DISABLED === "1") return true;
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return false;

  const [mx, a] = await Promise.all([
    lookup(dns.resolveMx(domain)),
    lookup(dns.resolve4(domain)),
  ]);

  if (mx.ok && mx.value.length > 0) {
    // Null MX ("0 .") means the domain explicitly accepts no mail.
    return mx.value.some((r) => r.exchange !== "" && r.exchange !== ".");
  }
  const mxMissing = mx.ok || NO_RECORD.has(mx.code);
  const aMissing = a.ok ? a.value.length === 0 : NO_RECORD.has(a.code);
  return !(mxMissing && aMissing);
}

// ---------------------------------------------------------------------------
// Mongo-backed nonce replay protection + rate limits
// ---------------------------------------------------------------------------

type NonceDoc = { _id: string; createdAt: Date };
type SubmissionDoc = { keys: string[]; createdAt: Date };

const NONCES = "contactFormNonces";
const SUBMISSIONS = "contactSubmissions";
const DAY_S = 24 * 60 * 60;

let indexesReady: Promise<void> | null = null;

async function spamDb(): Promise<Db> {
  const db = await getDb();
  if (!indexesReady) {
    indexesReady = Promise.all([
      db
        .collection(NONCES)
        .createIndex(
          { createdAt: 1 },
          { expireAfterSeconds: Math.ceil(FORM_TOKEN_MAX_AGE_MS / 1000) + 3600 },
        ),
      db.collection(SUBMISSIONS).createIndex({ createdAt: 1 }, { expireAfterSeconds: DAY_S }),
      db.collection(SUBMISSIONS).createIndex({ keys: 1, createdAt: -1 }),
    ])
      .then(() => undefined)
      .catch((err) => {
        indexesReady = null;
        throw err;
      });
  }
  await indexesReady;
  return db;
}

/** Marks the token nonce used. Returns false if it was already used (replay). */
export async function consumeFormNonce(nonce: string): Promise<boolean> {
  const db = await spamDb();
  try {
    await db.collection<NonceDoc>(NONCES).insertOne({ _id: nonce, createdAt: new Date() });
    return true;
  } catch (err) {
    if ((err as { code?: number }).code === 11000) return false;
    throw err;
  }
}

function envInt(name: string, fallback: number): number {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

type Limit = { key: string; windowMs: number; max: number; label: string };

export type RateLimitResult = {
  /** Label of a hard per-IP / per-email limit that was exceeded → reject. */
  limited: string | null;
  /** Global hourly cap exceeded → keep the lead but send no emails. */
  throttled: boolean;
};

/**
 * Records this submission, then counts it together with every other recent
 * one (insert-then-count, so a parallel burst cannot slip past the caps).
 *  - Per-IP / per-email limits are hard rejects (our record is rolled back).
 *  - The global hourly cap only throttles email sending, so real leads are
 *    still saved for the admin even while a bot burns through the quota.
 */
export async function checkAndRecordRateLimit(params: {
  ip: string;
  email: string;
}): Promise<RateLimitResult> {
  if (process.env.CONTACT_RATE_LIMIT_DISABLED === "1") {
    return { limited: null, throttled: false };
  }

  const ipKey = ipRateKey(params.ip);
  const emailKey = `email:${params.email.toLowerCase()}`;
  const hardLimits: Limit[] = [
    { key: ipKey, windowMs: 10 * 60_000, max: envInt("CONTACT_LIMIT_IP_10MIN", 3), label: "ip-10min" },
    { key: ipKey, windowMs: DAY_S * 1000, max: envInt("CONTACT_LIMIT_IP_DAY", 8), label: "ip-day" },
    { key: emailKey, windowMs: DAY_S * 1000, max: envInt("CONTACT_LIMIT_EMAIL_DAY", 3), label: "email-day" },
  ];
  const globalLimit: Limit = {
    key: "global",
    windowMs: 60 * 60_000,
    max: envInt("CONTACT_LIMIT_GLOBAL_HOUR", 30),
    label: "global-hour",
  };

  const db = await spamDb();
  const col = db.collection<SubmissionDoc>(SUBMISSIONS);
  const now = Date.now();

  const { insertedId } = await col.insertOne({
    keys: [ipKey, emailKey, "global"],
    createdAt: new Date(now),
  });

  const all = [...hardLimits, globalLimit];
  const counts = await Promise.all(
    all.map((l) =>
      col.countDocuments({ keys: l.key, createdAt: { $gte: new Date(now - l.windowMs) } }),
    ),
  );

  const exceeded = hardLimits.find((l, i) => counts[i] > l.max);
  if (exceeded) {
    await col.deleteOne({ _id: insertedId });
    return { limited: exceeded.label, throttled: false };
  }
  return { limited: null, throttled: counts[all.length - 1] > globalLimit.max };
}
