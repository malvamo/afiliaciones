import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@prisma/client";

import { optionalEnv, requireEnv } from "@/lib/env";

const url = requireEnv("DATABASE_URL");
const authToken = optionalEnv("LIBSQL_AUTH_TOKEN") ?? undefined;
const adapter = new PrismaLibSql({ url, authToken });

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
