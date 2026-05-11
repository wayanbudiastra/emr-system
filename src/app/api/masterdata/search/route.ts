import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { masterdataService } from "@/services/masterdata.service";

export async function GET(req: NextRequest) {
  const session = await auth();
  const role = session?.user?.role;
  if (!role || !["SUPER_ADMIN", "DOKTER", "PERAWAT"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const q      = req.nextUrl.searchParams.get("q") ?? "";
  const poliId = req.nextUrl.searchParams.get("poliId") ?? "";
  if (!poliId) return NextResponse.json({ error: "poliId wajib" }, { status: 400 });
  const result = await masterdataService.searchOrderable(q, poliId);
  return NextResponse.json(result);
}
