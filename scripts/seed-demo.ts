import { randomUUID } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import {
  type Prisma,
  PrismaClient,
  type ProjectRole,
} from "../src/generated/prisma";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const DEMO_EMAIL = "demo@otasifiy.local";
const PROJECT_SLUG = "orbit-demo";

const TEAM: {
  email: string;
  firstName: string;
  lastName: string;
  role: ProjectRole;
}[] = [
  {
    email: "maya@otasifiy.local",
    firstName: "Maya",
    lastName: "Chen",
    role: "ADMIN",
  },
  {
    email: "liam@otasifiy.local",
    firstName: "Liam",
    lastName: "Park",
    role: "MEMBER",
  },
  {
    email: "nora@otasifiy.local",
    firstName: "Nora",
    lastName: "Silva",
    role: "MEMBER",
  },
];

const UPDATES = [
  {
    version: "1.0.0",
    environment: "production",
    daysAgo: 62,
    deployPercent: 100,
    runtimeVersion: "1.0.0",
    disabled: false,
  },
  {
    version: "1.0.1",
    environment: "production",
    daysAgo: 47,
    deployPercent: 100,
    runtimeVersion: "1.0.0",
    disabled: false,
  },
  {
    version: "1.1.0",
    environment: "production",
    daysAgo: 33,
    deployPercent: 100,
    runtimeVersion: "1.1.0",
    disabled: false,
  },
  {
    version: "1.1.1",
    environment: "staging",
    daysAgo: 21,
    deployPercent: 75,
    runtimeVersion: "1.1.0",
    disabled: false,
  },
  {
    version: "1.2.0",
    environment: "preview",
    daysAgo: 9,
    deployPercent: 50,
    runtimeVersion: "1.2.0",
    disabled: false,
  },
  {
    version: "1.2.1",
    environment: "production",
    daysAgo: 2,
    deployPercent: 100,
    runtimeVersion: "1.2.0",
    disabled: false,
  },
  {
    version: "1.0.2",
    environment: "staging",
    daysAgo: 4,
    deployPercent: 0,
    runtimeVersion: "1.0.0",
    disabled: true,
  },
] as const;

function asset(updateId: string, name: string, contentType: string) {
  const id = randomUUID();
  const hash = `${randomUUID().replaceAll("-", "")}${randomUUID().replaceAll("-", "")}`;
  return {
    id,
    hash,
    key: hash,
    contentType,
    fileExtension: `.${name.split(".").pop()}`,
    url: `/api/asset?assetId=${id}`,
    s3Path: `updates/${updateId}/demo/${name}`,
  };
}

async function clearDemoData() {
  const demo = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } });
  if (!demo) return;

  await prisma.asset.deleteMany({
    where: { s3Path: { contains: "/demo/" } },
  });

  const projects = await prisma.project.findMany({
    where: { userId: demo.id },
    select: { id: true },
  });
  const projectIds = projects.map((project) => project.id);

  if (projectIds.length > 0) {
    const updates = await prisma.update.findMany({
      where: { projectId: { in: projectIds } },
      select: { id: true },
    });
    const updateIds = updates.map((update) => update.id);

    if (updateIds.length > 0) {
      await prisma.manifest.deleteMany({
        where: { updateId: { in: updateIds } },
      });
      await prisma.download.deleteMany({
        where: { updateId: { in: updateIds } },
      });
      await prisma.update.deleteMany({ where: { id: { in: updateIds } } });
    }

    await prisma.environment.deleteMany({
      where: { projectId: { in: projectIds } },
    });
    await prisma.projectInvite.deleteMany({
      where: { projectId: { in: projectIds } },
    });
    await prisma.projectMembership.deleteMany({
      where: { projectId: { in: projectIds } },
    });
    await prisma.project.deleteMany({ where: { id: { in: projectIds } } });
  }

  await prisma.session.deleteMany({ where: { userId: demo.id } });
  await prisma.user.delete({ where: { id: demo.id } });
  await prisma.user.deleteMany({
    where: { email: { in: TEAM.map((member) => member.email) } },
  });
}

async function seed() {
  await clearDemoData();

  const demoUser = await prisma.user.create({
    data: {
      email: DEMO_EMAIL,
      firstName: "Demo",
      lastName: "User",
      avatarUrl: null,
    },
  });

  const team = await Promise.all(
    TEAM.map((member) =>
      prisma.user.create({
        data: {
          email: member.email,
          firstName: member.firstName,
          lastName: member.lastName,
          avatarUrl: null,
        },
      }),
    ),
  );

  const project = await prisma.project.create({
    data: {
      name: "Orbit",
      slug: PROJECT_SLUG,
      githubRepo: "nightowl-devs/orbit",
      apiKeyHash: await Bun.password.hash("otasifiy-demo"),
      userId: demoUser.id,
      memberships: {
        create: [
          { userId: demoUser.id, role: "OWNER" },
          ...team.map((user, index) => ({
            userId: user.id,
            role: TEAM[index].role,
          })),
        ],
      },
      invites: {
        create: {
          email: "sam@example.com",
          role: "MEMBER",
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
          invitedById: demoUser.id,
        },
      },
    },
  });

  const environments: Record<string, { id: string }> = {};
  for (const [name, branch] of [
    ["production", "main"],
    ["staging", "staging"],
    ["preview", "preview"],
  ] as const) {
    environments[name] = await prisma.environment.create({
      data: { name, branch, projectId: project.id },
      select: { id: true },
    });
  }

  const seededUpdates: {
    id: string;
    environmentId: string;
    runtimeVersion: string;
  }[] = [];

  for (const spec of UPDATES) {
    const updateId = randomUUID();
    const createdAt = new Date(Date.now() - spec.daysAgo * 24 * 60 * 60 * 1000);
    const environmentId = environments[spec.environment].id;

    await prisma.update.create({
      data: {
        id: updateId,
        version: spec.version,
        commit: randomUUID().replaceAll("-", "").slice(0, 40),
        deployPercent: spec.deployPercent,
        disabled: spec.disabled,
        createdAt,
        projectId: project.id,
        environmentId,
        manifests: {
          create: (["ios", "android"] as const).map((platform) => {
            const launch = asset(
              updateId,
              `bundle-${platform}.hbc`,
              "application/javascript",
            );
            return {
              platform,
              runtimeVersion: spec.runtimeVersion,
              metadata: { platform, channel: spec.environment },
              extra: {
                expoClient: {
                  name: "Orbit",
                  slug: PROJECT_SLUG,
                  version: spec.version,
                  runtimeVersion: spec.runtimeVersion,
                },
              },
              launchAsset: { create: launch },
              assets: {
                create: [
                  asset(updateId, `${platform}-icon.png`, "image/png"),
                  asset(updateId, `${platform}-splash.png`, "image/png"),
                ],
              },
            };
          }),
        },
      },
    });

    seededUpdates.push({
      id: updateId,
      environmentId,
      runtimeVersion: spec.runtimeVersion,
    });
  }

  const downloads: Prisma.DownloadCreateManyInput[] = [];
  const now = Date.now();

  for (let day = 0; day < 90; day++) {
    const base = 22 + Math.floor(Math.random() * 40);
    const recentBoost = day < 7 ? 18 : 0;

    for (let i = 0; i < base + recentBoost; i++) {
      const update =
        seededUpdates[Math.floor(Math.random() * seededUpdates.length)];
      downloads.push({
        projectId: project.id,
        updateId: update.id,
        environmentId: update.environmentId,
        platform: Math.random() < 0.56 ? "ios" : "android",
        runtimeVersion: update.runtimeVersion,
        sdkVersion: "54.0.0",
        deviceIdHash: randomUUID().replaceAll("-", ""),
        createdAt: new Date(
          now -
            day * 24 * 60 * 60 * 1000 -
            Math.floor(Math.random() * 86_400_000),
        ),
      });
    }
  }

  await prisma.download.createMany({ data: downloads });

  console.log(
    `Seeded demo project "${project.name}" (${project.slug}) with ${UPDATES.length} updates and ${downloads.length} downloads.`,
  );
  console.log(`Demo user: ${DEMO_EMAIL}`);
}

seed()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
