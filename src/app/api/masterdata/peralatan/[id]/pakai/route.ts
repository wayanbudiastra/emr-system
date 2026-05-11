import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { masterdataService } from "@/services/masterdata.service";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!["SUPER_ADMIN", "DOKTER", "PERAWAT"].includes(session?.user?.role ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const body = await req.json();
  try {
    const result = await masterdataService.pakaiAlat({ peralatanId: id, ...body });
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 422 });
  }
}
