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
  Activity,
  UserRoundCheck,
  type LucideIcon,
} from "lucide-react";


export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  roles: Role[];
  children?: NavItem[];
}

const ALL_ROLES: Role[] = [Role.SUPER_ADMIN, Role.ADMISSION, Role.KASIR, Role.DOKTER, Role.PERAWAT, Role.APOTEKER];

export const navConfig: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ALL_ROLES,
  },
  {
    title: "Pasien",
    href: "/pasien",
    icon: Users,
    roles: [Role.SUPER_ADMIN, Role.ADMISSION, Role.DOKTER, Role.PERAWAT],
  },
  {
    title: "Pendaftaran",
    href: "/pendaftaran",
    icon: ClipboardList,
    roles: [Role.SUPER_ADMIN, Role.ADMISSION, Role.PERAWAT],
  },
  {
    title: "Pemeriksaan",
    href: "/pemeriksaan",
    icon: Stethoscope,
    roles: [Role.SUPER_ADMIN, Role.DOKTER, Role.PERAWAT],
  },
  {
    title: "Rawat Inap",
    href: "/rawat-inap",
    icon: BedDouble,
    roles: [Role.SUPER_ADMIN, Role.DOKTER, Role.PERAWAT, Role.ADMISSION],
  },
  {
    title: "Farmasi",
    href: "/farmasi",
    icon: Pill,
    roles: [Role.SUPER_ADMIN, Role.APOTEKER, Role.DOKTER],
    children: [
      {
        title: "Resep",
        href: "/farmasi/resep",
        icon: Pill,
        roles: [Role.SUPER_ADMIN, Role.APOTEKER, Role.DOKTER],
      },
      {
        title: "Stok Obat",
        href: "/farmasi/stok-obat",
        icon: FlaskConical,
        roles: [Role.SUPER_ADMIN, Role.APOTEKER],
      },
    ],
  },
  {
    title: "Billing",
    href: "/billing",
    icon: Receipt,
    roles: [Role.SUPER_ADMIN, Role.KASIR],
  },
  {
    title: "Laporan",
    href: "/laporan",
    icon: BarChart3,
    roles: [Role.SUPER_ADMIN, Role.DOKTER, Role.KASIR, Role.APOTEKER],
  },
  {
    title: "Pengaturan",
    href: "/pengaturan",
    icon: Settings,
    roles: [Role.SUPER_ADMIN],
    children: [
      {
        title: "Pengguna",
        href: "/pengaturan/pengguna",
        icon: Users,
        roles: [Role.SUPER_ADMIN],
      },
      {
        title: "Klinik",
        href: "/pengaturan/klinik",
        icon: Settings,
        roles: [Role.SUPER_ADMIN],
      },
      {
        title: "Data Klinis",
        href: "/pengaturan/masterdata",
        icon: Activity,
        roles: [Role.SUPER_ADMIN],
      },
      {
        title: "Data Dokter",
        href: "/pengaturan/data-dokter",
        icon: UserRoundCheck,
        roles: [Role.SUPER_ADMIN],
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
