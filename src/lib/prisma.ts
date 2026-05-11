import { PrismaClient } from "@prisma/client";
import { createPrismaClient } from "@/lib/db";

declare global {
  // eslint-disable-next-line no-var
  var prismaClient: PrismaClient | undefined;
  // eslint-disable-next-line no-var
  var prismaInit: Promise<PrismaClient> | undefined;
}

if (!globalThis.prismaInit) {
  globalThis.prismaInit = createPrismaClient(process.env.DATABASE_URL!).then(
    (client) => {
      globalThis.prismaClient = client;
      return client;
    }
  );
}

export async function getPrisma(): Promise<PrismaClient> {
  return globalThis.prismaInit!;
}
