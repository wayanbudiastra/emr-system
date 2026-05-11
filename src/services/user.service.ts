import bcrypt from "bcryptjs";
import { userRepository } from "@/repositories/user.repository";
import type { CreateUserInput, UpdateUserInput } from "@/features/user/schemas/user.schema";

export const userService = {
  async getAll(params?: Parameters<typeof userRepository.findAll>[0]) {
    return userRepository.findAll(params);
  },

  async getById(id: string) {
    const user = await userRepository.findById(id);
    if (!user) throw new Error("User tidak ditemukan");
    return user;
  },

  async create(dto: CreateUserInput) {
    const existing = await userRepository.findByEmail(dto.email);
    if (existing) throw new Error("Email sudah digunakan");
    const hashedPassword = await bcrypt.hash(dto.password, 12);
    return userRepository.create({ ...dto, hashedPassword });
  },

  async update(id: string, dto: UpdateUserInput) {
    const user = await userRepository.findById(id);
    if (!user) throw new Error("User tidak ditemukan");
    return userRepository.update(id, dto);
  },

  async toggleActive(id: string, isActive: boolean) {
    const user = await userRepository.findById(id);
    if (!user) throw new Error("User tidak ditemukan");
    if (user.role === "SUPER_ADMIN" && !isActive) throw new Error("Super Admin tidak dapat dinonaktifkan");
    return userRepository.toggleActive(id, isActive);
  },

  async resetPassword(id: string, newPassword: string, adminId: string) {
    const user = await userRepository.findById(id);
    if (!user) throw new Error("User tidak ditemukan");
    if (user.role === "SUPER_ADMIN") throw new Error("Password Super Admin tidak dapat direset melalui panel ini");
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await userRepository.resetPassword(id, hashedPassword);
    await userRepository.logActivity({
      userId: adminId,
      action: "RESET_PASSWORD_BY_ADMIN",
      resource: "user",
      resourceId: id,
      detail: { targetEmail: user.email },
    });
    return { success: true };
  },

  async delete(id: string) {
    const user = await userRepository.findById(id);
    if (!user) throw new Error("User tidak ditemukan");
    if (user.role === "SUPER_ADMIN") throw new Error("Super Admin tidak dapat dihapus");
    return userRepository.delete(id);
  },

  async getRoleSummary() {
    return userRepository.getRoleSummary();
  },
};
