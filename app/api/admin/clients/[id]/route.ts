import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { deleteClient, serializeId, updateClient } from "@/lib/admin-data";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;
    const body = (await request.json()) as { name?: string };
    if (!body.name?.trim()) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }
    const client = await updateClient(id, body.name);
    if (!client) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(serializeId(client));
  } catch (err) {
    console.error("[PATCH /api/admin/clients/[id]]", err);
    return NextResponse.json(
      { error: "Failed to update client" },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;
    const ok = await deleteClient(id);
    if (!ok) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/admin/clients/[id]]", err);
    return NextResponse.json(
      { error: "Failed to delete client" },
      { status: 500 },
    );
  }
}
