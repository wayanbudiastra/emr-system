import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { userService } from "@/services/user.service";
import { createUserSchema } from "@/features/user/schemas/user.schema";

function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "SUPER_ADMIN") return forbidden();

  const { searchParams } = req.nextUrl;
  const result = await userService.getAll({
    role:     searchParams.get("role") ?? undefined,
    isActive: searchParams.get("isActive") === "true" ? true
            : searchParams.get("isActive") === "false" ? false
            : undefined,
    search:   searchParams.get("search") ?? undefined,
    page:     Number(searchParams.get("page") ?? 1),
    limit:    Number(searchParams.get("limit") ?? 20),
  });

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "SUPER_ADMIN") return forbidden();

  const body = await req.json();
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const user = await userService.create(parsed.data);
    return NextResponse.json(user, { status: 201 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Terjadi kesalahan";
    return NextResponse.json({ error: msg }, { status: 422 });
  }
}
