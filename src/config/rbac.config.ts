import { Role } from "@prisma/client";

export type Permission = "create" | "read" | "update" | "delete" | "read:own" | "read:keuangan" | "read:farmasi";

export type ResourcePermissions = {
  [resource: string]: Permission[];
};

export const permissions: Record<Role, ResourcePermissions> = {
  PASIEN: {
    kunjungan: ["read:own"],
    rekamMedis: ["read:own"],
    billing: ["read:own"],
  },
  KASIR: {
    pasien: ["read"],
    kunjungan: ["read"],
    billing: ["create", "read", "update"],
    pembayaran: ["create", "read"],
    laporan: ["read:keuangan"],
  },
  PERAWAT: {
    pasien: ["create", "read", "update"],
    kunjungan: ["create", "read", "update"],
    asesmen: ["create", "read", "update"],
    tindakan: ["create", "read"],
  },
  APOTEKER: {
    resep: ["read", "update"],
    obat: ["create", "read", "update"],
    laporan: ["read:farmasi"],
  },
  REKAM_MEDIS: {
    pasien: ["create", "read", "update"],
    rekamMedis: ["create", "read", "update"],
    laporan: ["create", "read"],
  },
  DOKTER: {
    pasien: ["read"],
    kunjungan: ["read", "update"],
    soap: ["create", "read", "update"],
    resep: ["create", "read", "update"],
    tindakan: ["create", "read"],
    laporan: ["read:own"],
  },
  ADMIN: {
    pasien: ["create", "read", "update", "delete"],
    kunjungan: ["create", "read", "update", "delete"],
    user: ["create", "read", "update"],
    laporan: ["create", "read"],
    pengaturan: ["read", "update"],
  },
  SUPER_ADMIN: {
    "*": ["create", "read", "update", "delete"],
  },
};

export type RoutePermission = {
  [path: string]: Role[];
};

export const routePermissions: RoutePermission = {
  "/dashboard": [Role.SUPER_ADMIN, Role.ADMIN, Role.DOKTER, Role.PERAWAT, Role.APOTEKER, Role.KASIR, Role.REKAM_MEDIS],
  "/pasien": [Role.SUPER_ADMIN, Role.ADMIN, Role.DOKTER, Role.PERAWAT, Role.REKAM_MEDIS],
  "/pendaftaran": [Role.SUPER_ADMIN, Role.ADMIN, Role.PERAWAT, Role.REKAM_MEDIS],
  "/pemeriksaan": [Role.SUPER_ADMIN, Role.ADMIN, Role.DOKTER, Role.PERAWAT],
  "/rawat-inap": [Role.SUPER_ADMIN, Role.ADMIN, Role.DOKTER, Role.PERAWAT],
  "/farmasi": [Role.SUPER_ADMIN, Role.ADMIN, Role.APOTEKER, Role.DOKTER],
  "/billing": [Role.SUPER_ADMIN, Role.ADMIN, Role.KASIR],
  "/laporan": [Role.SUPER_ADMIN, Role.ADMIN, Role.DOKTER, Role.REKAM_MEDIS, Role.KASIR],
  "/pengaturan": [Role.SUPER_ADMIN, Role.ADMIN],
};

export function hasPermission(role: Role, resource: string, action: Permission): boolean {
  const rolePerms = permissions[role];
  if (!rolePerms) return false;
  
  // Super admin has wildcard access
  if (rolePerms["*"]) return true;
  
  const resourcePerms = rolePerms[resource];
  if (!resourcePerms) return false;
  
  return resourcePerms.includes(action);
}

export function hasRouteAccess(role: Role, path: string): boolean {
  // Super admin can access all routes
  if (role === Role.SUPER_ADMIN) return true;
  
  // Check exact match first
  if (routePermissions[path]) {
    return routePermissions[path].includes(role);
  }
  
  // Check if any parent path matches
  const segments = path.split("/").filter(Boolean);
  for (let i = segments.length; i > 0; i--) {
    const parentPath = "/" + segments.slice(0, i).join("/");
    if (routePermissions[parentPath]) {
      return routePermissions[parentPath].includes(role);
    }
  }
  
  return false;
}
