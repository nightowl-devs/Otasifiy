import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL ?? "",
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const user = await prisma.user.upsert({
    where: { email: "me@nightowl.dev" },
    update: {},
    create: {
      email: "me@nightowl.dev",
      avatarUrl: "https://avatars.githubusercontent.com/u/151651325?v=4",
      firstName: "Stanisław",
      lastName: "Botwina",
    },
  });

  console.log("Seed complete:");
  console.log(`  User: ${user.email}`);
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
