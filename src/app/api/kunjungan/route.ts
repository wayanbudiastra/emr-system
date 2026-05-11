import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getKunjunganList, createKunjungan } from "@/services/visit.service";
import type { ApiResponse } from "@/types";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" } satisfies ApiResponse<never>, { status: 401 });

  const { searchParams } = req.nextUrl;
  const result = await getKunjunganList({
    page:   Number(searchParams.get("page")  ?? 1),
    limit:  Number(searchParams.get("limit") ?? 20),
    search: searchParams.get("search") ?? undefined,
  });

  return NextResponse.json({ success: true, data: result } satisfies ApiResponse<typeof result>);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ success: false, error: "Unauthorized" } satisfies ApiResponse<never>, { status: 401 });

  try {
    const body = await req.json();
    const kunjungan = await createKunjungan(body);
    return NextResponse.json({ success: true, data: kunjungan } satisfies ApiResponse<typeof kunjungan>, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Terjadi kesalahan";
    return NextResponse.json({ success: false, error: message } satisfies ApiResponse<never>, { status: 400 });
  }
}
