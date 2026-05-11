import type { Role } from "@prisma/client";

// ── API response wrapper ───────────────────────────────────
export type ApiResponse<T> =
  | { success: true;  data: T }
  | { success: false; error: string; code?: string };

// ── Pagination ─────────────────────────────────────────────
export interface PaginatedResult<T> {
  data:       T[];
  total:      number;
  page:       number;
  limit:      number;
  totalPages: number;
}

export interface PaginationParams {
  page?:   number;
  limit?:  number;
  search?: string;
}

// ── Session user ───────────────────────────────────────────
export interface SessionUser {
  id:    string;
  name:  string;
  email: string;
  role:  Role;
  image?: string | null;
}

// ── Form state ─────────────────────────────────────────────
export type FormState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; message: string }
  | { status: "error";   message: string };
