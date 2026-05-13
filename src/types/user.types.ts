import type { Role } from "@/types/role";
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
  dokterProfile: { noSIP: string | null; spesialisasi: string | null } | null;
}

export interface CreateUserDTO {
  nama: string;
  email: string;
  password: string;
  role: Role;
  nip?: string;
  telepon?: string;
  noSIP?: string;
  spesialisasi?: string;
}

export interface UpdateUserDTO {
  nama?: string;
  email?: string;
  role?: Role;
  nip?: string;
  telepon?: string;
  isActive?: boolean;
  noSIP?: string;
  spesialisasi?: string;
}
