import { NextRequest, NextResponse } from "next/server";
import { insertCustomer } from "@/lib/mongo";
import { sendContactEmails } from "@/lib/email";
import { FORM_TOKEN_FIELD, HONEYPOT_FIELD } from "@/lib/spam-constants";
import {
  MAX_BODY_BYTES,
  checkAndRecordRateLimit,
  cleanText,
  consumeFormNonce,
  emailDomainAcceptsMail,
  getClientIp,
  isCrossSiteRequest,
  validateContactFields,
  verifyFormToken,
} from "@/lib/spam-guard";

export const dynamic = "force-dynamic";

type Payload = {
  name: string;
  email: string;
  phone: string;
  outlineDesc: string;
  honeypot: string;
  token: string;
};

function str(v: unknown): string {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

async function readPayload(request: NextRequest): Promise<Payload> {
  const contentType = request.headers.get("content-type") || "";
  let get: (key: string) => unknown;
  if (contentType.includes("application/json")) {
    const json = (await request.json()) as Record<string, unknown>;
    get = (k) => json?.[k];
  } else {
    const form = await request.formData();
    get = (k) => form.get(k);
  }
  return {
    name: cleanText(str(get("name"))).replace(/\s+/g, " "),
    email: cleanText(str(get("email"))),
    phone: cleanText(str(get("phone"))),
    outlineDesc: cleanText(
      str(get("outline_desc") ?? get("outlineDesc") ?? get("desc")),
    ),
    honeypot: str(get(HONEYPOT_FIELD)),
    token: str(get(FORM_TOKEN_FIELD)).trim(),
  };
}

function reject(status: number, error: string) {
  return NextResponse.json(
    { ok: false, inserted: false, duplicated: false, error },
    { status },
  );
}

function blocked(reason: string, ip: string, extra?: Record<string, unknown>) {
  console.warn("[POST /api/send] blocked", { reason, ip, ...extra });
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers);
  try {
    if (isCrossSiteRequest(request.headers)) {
      blocked("cross-site", ip, { origin: request.headers.get("origin") });
      return reject(403, "Forbidden");
    }
    const declaredLength = Number(request.headers.get("content-length") || 0);
    if (declaredLength > MAX_BODY_BYTES) {
      blocked("body-too-large", ip, { declaredLength });
      return reject(413, "Payload too large");
    }

    let payload: Payload;
    try {
      payload = await readPayload(request);
    } catch {
      blocked("bad-body", ip, { contentType: request.headers.get("content-type") });
      return reject(400, "Invalid submission");
    }
    const { name, email, phone, outlineDesc, honeypot, token } = payload;

    // Bots that fill the hidden field get a fake success so they don't adapt.
    if (honeypot) {
      blocked("honeypot", ip, { email });
      return NextResponse.json({ ok: true, inserted: false, duplicated: false });
    }

    if (!name || !email || !phone || !outlineDesc) {
      return reject(400, "Missing required fields");
    }

    const invalid = validateContactFields({ name, email, phone, outlineDesc });
    if (invalid) {
      blocked(invalid, ip, { email });
      return reject(400, "Invalid submission");
    }

    const tokenCheck = verifyFormToken(token);
    if (!tokenCheck.ok) {
      blocked(tokenCheck.reason, ip, { email });
      return reject(400, "Invalid submission");
    }

    if (!(await emailDomainAcceptsMail(email))) {
      blocked("email-domain", ip, { email });
      return reject(400, "Invalid submission");
    }

    if (!(await consumeFormNonce(tokenCheck.nonce))) {
      blocked("token-replay", ip, { email });
      return reject(400, "Invalid submission");
    }

    const { limited, throttled } = await checkAndRecordRateLimit({ ip, email });
    if (limited) {
      blocked(`rate-limit:${limited}`, ip, { email });
      return reject(429, "Too many requests");
    }

    const result = await insertCustomer({
      name,
      email,
      phone,
      outlineDesc,
      ip,
      userAgent: request.headers.get("user-agent")?.slice(0, 300) ?? "",
      ...(throttled ? { emailsSkipped: true } : {}),
    });

    // Global hourly cap hit (likely a bot wave): keep the lead for the admin
    // panel, but don't let it flood the inbox or relay auto-replies.
    if (throttled) {
      blocked("rate-limit:global-hour (lead saved, emails skipped)", ip, { email });
      return NextResponse.json({
        ok: true,
        inserted: result.inserted,
        duplicated: false,
        emailSent: false,
        emailMocked: false,
      });
    }

    // Same email may submit more than once (within rate limits).
    const emailResult = await sendContactEmails({
      name,
      email,
      phone,
      outlineDesc,
    });

    // Django redirects back; API returns JSON for the Next clone + tests.
    return NextResponse.json({
      ok: true,
      inserted: result.inserted,
      duplicated: false,
      emailSent: emailResult.sent,
      emailMocked: emailResult.mocked,
      ...(emailResult.error ? { emailError: emailResult.error } : {}),
    });
  } catch (err) {
    console.error("[POST /api/send]", err);
    return NextResponse.json(
      { ok: false, error: "Failed to process contact" },
      { status: 500 },
    );
  }
}
