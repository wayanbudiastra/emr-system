import { Role } from "@prisma/client";

export type Action = "create" | "read" | "update" | "delete" | "read:own";

export type Resource =
  | "user"
  | "pasien"
  | "kunjungan"
  | "antrean"
  | "asesmen"
  | "soap"
  | "diagnosa"
  | "resep"
  | "obat"
  | "tindakan"
  | "rawatInap"
  | "billing"
  | "pembayaran"
  | "laporan:keuangan"
  | "laporan:medis"
  | "laporan:farmasi"
  | "masterdata"
  | "pengaturan"
  | "auditLog"
  | "dokter:profil"
  | "dokter:mapping"
  | "dokter:fee"
  | "dokter:jadwal";

export type Permissions = Partial<Record<Resource, Action[]>>;

export const rolePermissions: Record<string, Permissions> = {
  SUPER_ADMIN: {
    user:               ["create", "read", "update", "delete"],
    pasien:             ["create", "read", "update", "delete"],
    kunjungan:          ["create", "read", "update", "delete"],
    antrean:            ["create", "read", "update", "delete"],
    asesmen:            ["create", "read", "update", "delete"],
    soap:               ["create", "read", "update", "delete"],
    diagnosa:           ["create", "read", "update", "delete"],
    resep:              ["create", "read", "update", "delete"],
    obat:               ["create", "read", "update", "delete"],
    tindakan:           ["create", "read", "update", "delete"],
    rawatInap:          ["create", "read", "update", "delete"],
    billing:            ["create", "read", "update", "delete"],
    pembayaran:         ["create", "read", "update", "delete"],
    "laporan:keuangan": ["create", "read"],
    "laporan:medis":    ["create", "read"],
    "laporan:farmasi":  ["create", "read"],
    masterdata:         ["create", "read", "update", "delete"],
    pengaturan:         ["create", "read", "update", "delete"],
    auditLog:           ["read"],
    "dokter:profil":    ["create", "read", "update", "delete"],
    "dokter:mapping":   ["create", "read", "update", "delete"],
    "dokter:fee":       ["create", "read", "update", "delete"],
    "dokter:jadwal":    ["create", "read", "update", "delete"],
  },

  ADMISSION: {
    pasien:          ["create", "read", "update"],
    kunjungan:       ["create", "read", "update"],
    antrean:         ["create", "read", "update"],
    "dokter:profil": ["read"],
    "dokter:jadwal": ["read"],
  },

  KASIR: {
    pasien:             ["read"],
    kunjungan:          ["read"],
    billing:            ["create", "read", "update"],
    pembayaran:         ["create", "read"],
    "laporan:keuangan": ["read"],
    "dokter:profil":    ["read"],
    "dokter:fee":       ["read"],
  },

  DOKTER: {
    pasien:          ["read"],
    kunjungan:       ["read", "update"],
    asesmen:         ["read"],
    soap:            ["create", "read", "update"],
    diagnosa:        ["create", "read", "update"],
    resep:           ["create", "read", "update"],
    tindakan:        ["create", "read"],
    rawatInap:       ["create", "read", "update"],
    obat:            ["read"],
    "laporan:medis": ["read:own"],
  },

  PERAWAT: {
    pasien:    ["create", "read", "update"],
    kunjungan: ["create", "read", "update"],
    antrean:   ["read"],
    asesmen:   ["create", "read", "update"],
    soap:      ["read"],
    resep:     ["read"],
    tindakan:  ["create", "read"],
    rawatInap: ["create", "read", "update"],
  },

  APOTEKER: {
    pasien:             ["read"],
    resep:              ["read", "update"],
    obat:               ["create", "read", "update", "delete"],
    soap:               ["read"],
    "laporan:farmasi":  ["read"],
  },
};

export const routePermissions: Record<string, Role[]> = {
  "/dashboard":               [Role.SUPER_ADMIN, Role.ADMISSION, Role.KASIR, Role.DOKTER, Role.PERAWAT, Role.APOTEKER],
  "/pengaturan/pengguna":     [Role.SUPER_ADMIN],
  "/pengaturan/sistem":       [Role.SUPER_ADMIN],
  "/pengaturan/masterdata":   [Role.SUPER_ADMIN],
  "/pengaturan/klinik":       [Role.SUPER_ADMIN],
  "/audit-log":               [Role.SUPER_ADMIN],
  "/pendaftaran":             [Role.SUPER_ADMIN, Role.ADMISSION, Role.PERAWAT],
  "/antrean":                 [Role.SUPER_ADMIN, Role.ADMISSION, Role.PERAWAT, Role.DOKTER, Role.KASIR],
  "/pasien":                  [Role.SUPER_ADMIN, Role.ADMISSION, Role.DOKTER, Role.PERAWAT],
  "/pemeriksaan":             [Role.SUPER_ADMIN, Role.DOKTER, Role.PERAWAT],
  "/rawat-inap":              [Role.SUPER_ADMIN, Role.DOKTER, Role.PERAWAT, Role.ADMISSION],
  "/farmasi":                 [Role.SUPER_ADMIN, Role.APOTEKER, Role.DOKTER],
  "/farmasi/stok-obat":       [Role.SUPER_ADMIN, Role.APOTEKER],
  "/billing":                 [Role.SUPER_ADMIN, Role.KASIR],
  "/laporan/keuangan":        [Role.SUPER_ADMIN, Role.KASIR],
  "/laporan/medis":           [Role.SUPER_ADMIN, Role.DOKTER],
  "/laporan/farmasi":         [Role.SUPER_ADMIN, Role.APOTEKER],
};

export function hasRouteAccess(role: Role, path: string): boolean {
  if (role === Role.SUPER_ADMIN) return true;
  if (routePermissions[path]) return routePermissions[path].includes(role);

  const segments = path.split("/").filter(Boolean);
  for (let i = segments.length; i > 0; i--) {
    const parentPath = "/" + segments.slice(0, i).join("/");
    if (routePermissions[parentPath]) return routePermissions[parentPath].includes(role);
  }
  return false;
}

export function hasPermission(role: string, resource: Resource, action: Action): boolean {
  if (role === "SUPER_ADMIN") return true;
  const perms = rolePermissions[role];
  if (!perms) return false;
  return perms[resource]?.includes(action) ?? false;
}
