import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { createClient, listClients, serializeId } from "@/lib/admin-data";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const clients = await listClients();
    return NextResponse.json(clients.map((c) => serializeId(c)));
  } catch (err) {
    console.error("[GET /api/admin/clients]", err);
    return NextResponse.json(
      { error: "Failed to list clients" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const body = (await request.json()) as { name?: string };
    if (!body.name?.trim()) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }
    const client = await createClient(body.name);
    return NextResponse.json(serializeId(client), { status: 201 });
  } catch (err) {
    console.error("[POST /api/admin/clients]", err);
    return NextResponse.json(
      { error: "Failed to create client" },
      { status: 500 },
    );
  }
}
