import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { masterdataService } from "@/services/masterdata.service";
import { createPeralatanSchema } from "@/features/masterdata/schemas/masterdata.schema";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = req.nextUrl;
  const result = await masterdataService.getAllPeralatan({
    status: searchParams.get("status") ?? undefined,
    search: searchParams.get("search") ?? undefined,
    page:   Number(searchParams.get("page") ?? 1),
    limit:  Number(searchParams.get("limit") ?? 20),
  });
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await req.json();
  const parsed = createPeralatanSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  try {
    return NextResponse.json(await masterdataService.createPeralatan(parsed.data), { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 422 });
  }
}
