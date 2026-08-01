import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "Databaes url must be set in order for the application to work correctly.",
  );
}
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

export const prisma = new PrismaClient({ adapter });
