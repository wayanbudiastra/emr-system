import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { masterdataService } from "@/services/masterdata.service";
import { createTindakanSchema } from "@/features/masterdata/schemas/masterdata.schema";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = req.nextUrl;
  const result = await masterdataService.getAllTindakan({
    search: searchParams.get("search") ?? undefined,
    poliId: searchParams.get("poliId") ?? undefined,
    page:   Number(searchParams.get("page") ?? 1),
    limit:  Number(searchParams.get("limit") ?? 20),
  });
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json();
  const parsed = createTindakanSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  try {
    const t = await masterdataService.createTindakan(parsed.data);
    return NextResponse.json(t, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 422 });
  }
}
