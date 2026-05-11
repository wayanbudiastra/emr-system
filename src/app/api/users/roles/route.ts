import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { userService } from "@/services/user.service";

export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const summary = await userService.getRoleSummary();
  return NextResponse.json(summary);
}
