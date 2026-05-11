import { Role } from "@prisma/client";
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  Stethoscope,
  BedDouble,
  Pill,
  FlaskConical,
  Receipt,
  BarChart3,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  roles: Role[];
  children?: NavItem[];
}

export const navConfig: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.DOKTER, Role.PERAWAT, Role.APOTEKER, Role.KASIR, Role.REKAM_MEDIS],
  },
  {
    title: "Pasien",
    href: "/pasien",
    icon: Users,
    roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.DOKTER, Role.PERAWAT, Role.REKAM_MEDIS],
  },
  {
    title: "Pendaftaran",
    href: "/pendaftaran",
    icon: ClipboardList,
    roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.PERAWAT, Role.REKAM_MEDIS],
  },
  {
    title: "Pemeriksaan",
    href: "/pemeriksaan",
    icon: Stethoscope,
    roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.DOKTER, Role.PERAWAT],
  },
  {
    title: "Rawat Inap",
    href: "/rawat-inap",
    icon: BedDouble,
    roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.DOKTER, Role.PERAWAT],
  },
  {
    title: "Farmasi",
    href: "/farmasi",
    icon: Pill,
    roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.APOTEKER, Role.DOKTER],
    children: [
      {
        title: "Resep",
        href: "/farmasi/resep",
        icon: Pill,
        roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.APOTEKER, Role.DOKTER],
      },
      {
        title: "Stok Obat",
        href: "/farmasi/stok-obat",
        icon: FlaskConical,
        roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.APOTEKER],
      },
    ],
  },
  {
    title: "Billing",
    href: "/billing",
    icon: Receipt,
    roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.KASIR],
  },
  {
    title: "Laporan",
    href: "/laporan",
    icon: BarChart3,
    roles: [Role.SUPER_ADMIN, Role.ADMIN, Role.DOKTER, Role.REKAM_MEDIS, Role.KASIR],
  },
  {
    title: "Pengaturan",
    href: "/pengaturan",
    icon: Settings,
    roles: [Role.SUPER_ADMIN, Role.ADMIN],
    children: [
      {
        title: "Pengguna",
        href: "/pengaturan/pengguna",
        icon: Users,
        roles: [Role.SUPER_ADMIN, Role.ADMIN],
      },
      {
        title: "Klinik",
        href: "/pengaturan/klinik",
        icon: Settings,
        roles: [Role.SUPER_ADMIN, Role.ADMIN],
      },
    ],
  },
];

export function getNavItemsForRole(role: Role): NavItem[] {
  return navConfig
    .filter((item) => item.roles.includes(role))
    .map((item) => ({
      ...item,
      children: item.children?.filter((child) => child.roles.includes(role)),
    }));
}
