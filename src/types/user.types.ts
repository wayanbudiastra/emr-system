import type { Role } from "@prisma/client";

export type { Role };

export interface UserRow {
  id: string;
  nama: string;
  email: string;
  role: Role;
  nip: string | null;
  telepon: string | null;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  dokter: { sip: string | null; spesialisasi: string | null; poliId: string | null } | null;
}

export interface CreateUserDTO {
  nama: string;
  email: string;
  password: string;
  role: Role;
  nip?: string;
  telepon?: string;
  sip?: string;
  spesialisasi?: string;
  poliId?: string;
}

export interface UpdateUserDTO {
  nama?: string;
  email?: string;
  role?: Role;
  nip?: string;
  telepon?: string;
  isActive?: boolean;
  sip?: string;
  spesialisasi?: string;
  poliId?: string;
}
