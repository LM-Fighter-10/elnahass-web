import { NextResponse } from "next/server";
import type { FetchCustomerResponse } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * Legacy duplicate-check endpoint kept for client/e2e compatibility.
 * Contact leads may be submitted repeatedly with the same email — always
 * report not duplicated so the UI proceeds to send.
 */
export async function GET() {
  const body: FetchCustomerResponse = {
    customers: [{ duplicated: false }],
  };
  return NextResponse.json(body);
}
