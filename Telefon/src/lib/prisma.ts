import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const rawDbUrl = process.env.DATABASE_URL;
let pooledUrl: string | undefined = undefined;

// Supabase session pool limit (15) aşımını ve EMAXCONNSESSION hatasını önlemek için
// Prisma client bağlantı havuzunu güvenli bir değerde (5) sınırla
if (rawDbUrl && !rawDbUrl.includes("connection_limit")) {
  pooledUrl = rawDbUrl + (rawDbUrl.includes("?") ? "&" : "?") + "connection_limit=5";
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    ...(pooledUrl ? { datasources: { db: { url: pooledUrl } } } : {}),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
