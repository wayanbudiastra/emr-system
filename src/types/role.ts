export const Role = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMISSION: "ADMISSION",
  KASIR: "KASIR",
  DOKTER: "DOKTER",
  PERAWAT: "PERAWAT",
  APOTEKER: "APOTEKER",
} as const;

export type Role = (typeof Role)[keyof typeof Role];
