"use client";

import { useSession } from "next-auth/react";
import { hasPermission } from "@/lib/permissions";
import type { Action, Resource } from "@/config/rbac.config";

export function usePermission(resource: Resource, action: Action): boolean {
  const { data: session } = useSession();
  if (!session?.user?.role) return false;
  return hasPermission(session.user.role, resource, action);
}
