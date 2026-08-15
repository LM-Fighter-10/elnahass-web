import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { listCustomers, serializeId } from "@/lib/admin-data";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  try {
    const customers = await listCustomers();
    return NextResponse.json(
      customers.map((c) => ({
        ...serializeId(c),
        createdAt:
          c.createdAt instanceof Date
            ? c.createdAt.toISOString()
            : c.createdAt,
      })),
    );
  } catch (err) {
    console.error("[GET /api/admin/customers]", err);
    return NextResponse.json(
      { error: "Failed to list customers" },
      { status: 500 },
    );
  }
}
