import { getPrisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";
import type { CreateUserInput, UpdateUserInput } from "@/features/user/schemas/user.schema";

const userSelect = {
  id: true, nama: true, email: true, role: true,
  nip: true, telepon: true, isActive: true,
  lastLoginAt: true, createdAt: true,
  dokterProfile: { select: { noSIP: true, spesialisasi: true } },
} as const;

export const userRepository = {
  async findAll(params?: {
    role?: string;
    isActive?: boolean;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const prisma = await getPrisma();
    const { role, isActive, search, page = 1, limit = 20 } = params ?? {};
    const where = {
      ...(role ? { role: role as Role } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
      ...(search ? {
        OR: [
          { nama:  { contains: search, mode: "insensitive" as const } },
          { email: { contains: search, mode: "insensitive" as const } },
          { nip:   { contains: search, mode: "insensitive" as const } },
        ],
      } : {}),
    };

    const [data, total] = await Promise.all([
      prisma.user.findMany({
        where, select: userSelect,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit, take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  },

  async findById(id: string) {
    const prisma = await getPrisma();
    return prisma.user.findUnique({
      where: { id },
      select: { ...userSelect, updatedAt: true },
    });
  },

  async findByEmail(email: string) {
    const prisma = await getPrisma();
    return prisma.user.findUnique({ where: { email } });
  },

  async create(data: CreateUserInput & { hashedPassword: string }) {
    const prisma = await getPrisma();
    return prisma.user.create({
      data: {
        nama: data.nama, email: data.email,
        password: data.hashedPassword,
        role: data.role as Role,
        nip: data.nip, telepon: data.telepon,
        ...(data.role === "DOKTER" ? {
          dokter: { create: { sip: data.sip, spesialisasi: data.spesialisasi, poliId: data.poliId } },
        } : {}),
      },
    });
  },

  async update(id: string, data: UpdateUserInput) {
    const prisma = await getPrisma();
    const { sip, spesialisasi, poliId, ...userFields } = data;
    return prisma.user.update({
      where: { id },
      data: {
        ...userFields,
        role: userFields.role as Role | undefined,
        ...(sip !== undefined || spesialisasi !== undefined || poliId !== undefined ? {
          dokter: { upsert: { create: { sip, spesialisasi, poliId }, update: { sip, spesialisasi, poliId } } },
        } : {}),
      },
    });
  },

  async toggleActive(id: string, isActive: boolean) {
    const prisma = await getPrisma();
    return prisma.user.update({ where: { id }, data: { isActive } });
  },

  async resetPassword(id: string, hashedPassword: string) {
    const prisma = await getPrisma();
    return prisma.user.update({
      where: { id },
      data: { password: hashedPassword, passwordChangedAt: new Date() },
    });
  },

  async delete(id: string) {
    const prisma = await getPrisma();
    return prisma.user.delete({ where: { id } });
  },

  async getRoleSummary() {
    const prisma = await getPrisma();
    return prisma.user.groupBy({
      by: ["role"],
      _count: { _all: true },
    });
  },

  async logActivity(data: {
    userId: string;
    action: string;
    resource: string;
    resourceId?: string;
    detail?: object;
    ipAddress?: string;
  }) {
    const prisma = await getPrisma();
    return prisma.activityLog.create({ data });
  },
};
