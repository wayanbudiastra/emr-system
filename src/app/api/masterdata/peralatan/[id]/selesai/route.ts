import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { masterdataService } from "@/services/masterdata.service";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!["SUPER_ADMIN", "DOKTER", "PERAWAT"].includes(session?.user?.role ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { penggunaanId } = await req.json();
  try {
    return NextResponse.json(await masterdataService.selesaiPakaiAlat(penggunaanId));
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 422 });
  }
}
