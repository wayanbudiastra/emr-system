import dns from "dns";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

function lookupIPv4(hostname: string): Promise<string> {
  return new Promise((resolve, reject) => {
    dns.lookup(hostname, { family: 4 }, (err, addr) =>
      err ? reject(err) : resolve(addr)
    );
  });
}

export async function createDbPool(connectionString: string): Promise<Pool> {
  const url = new URL(connectionString);
  const hostname = url.hostname;
  // Endpoint ID diperlukan untuk Neon routing saat koneksi via IP (tanpa SNI)
  const endpointId = hostname.split(".")[0].replace(/-pooler$/, "");
  const ipv4 = await lookupIPv4(hostname);

  return new Pool({
    host: ipv4,
    port: Number(url.port || 5432),
    database: url.pathname.slice(1),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    ssl: { rejectUnauthorized: false },
    options: `endpoint=${endpointId}`,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });
}

export async function createPrismaClient(connectionString: string): Promise<PrismaClient> {
  const pool = await createDbPool(connectionString);
  return new PrismaClient({ adapter: new PrismaPg(pool) });
}
