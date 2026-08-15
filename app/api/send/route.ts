import { NextRequest, NextResponse } from "next/server";
import { insertCustomer } from "@/lib/mongo";
import { sendContactEmails } from "@/lib/email";

export const dynamic = "force-dynamic";

async function readPayload(request: NextRequest): Promise<{
  name: string;
  email: string;
  phone: string;
  outlineDesc: string;
}> {
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const json = (await request.json()) as Record<string, unknown>;
    return {
      name: String(json.name ?? ""),
      email: String(json.email ?? ""),
      phone: String(json.phone ?? ""),
      outlineDesc: String(json.outline_desc ?? json.outlineDesc ?? json.desc ?? ""),
    };
  }

  const form = await request.formData();
  return {
    name: String(form.get("name") ?? ""),
    email: String(form.get("email") ?? ""),
    phone: String(form.get("phone") ?? ""),
    outlineDesc: String(
      form.get("outline_desc") ?? form.get("outlineDesc") ?? form.get("desc") ?? "",
    ),
  };
}

export async function POST(request: NextRequest) {
  try {
    const payload = await readPayload(request);
    const { name, email, phone, outlineDesc } = payload;

    if (!name || !email || !phone || !outlineDesc) {
      return NextResponse.json(
        {
          ok: false,
          inserted: false,
          duplicated: false,
          error: "Missing required fields",
        },
        { status: 400 },
      );
    }

    const result = await insertCustomer({ name, email, phone, outlineDesc });

    // Always insert + send — same email may submit multiple times.
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
