import { auth } from "@/lib/auth";
import { type Role } from "@/types/role";
import DashboardShell from "./DashboardShell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const userRole = (session?.user?.role as Role) ?? "ADMISSION";
  const userName = session?.user?.name ?? "User";
  const userEmail = session?.user?.email ?? "";

  return (
    <DashboardShell userRole={userRole} userName={userName} userEmail={userEmail}>
      {children}
    </DashboardShell>
  );
}
