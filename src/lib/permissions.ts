import { rolePermissions, type Action, type Resource } from "@/config/rbac.config";

export function hasPermission(role: string, resource: Resource, action: Action): boolean {
  if (role === "SUPER_ADMIN") return true;
  const perms = rolePermissions[role];
  if (!perms) return false;
  return perms[resource]?.includes(action) ?? false;
}
