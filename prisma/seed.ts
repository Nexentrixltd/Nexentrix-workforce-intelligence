import { PrismaClient } from "@prisma/client";
import pg from "pg";
import dotenv from "dotenv";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcrypt";

dotenv.config();
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

async function seedAdmin() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const plainPassword = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !plainPassword) {
    throw new Error(
      "Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD in .env before seeding.",
    );
  }
  const EXEC_DEPARTMENT_SLUG = slugify("Executive / Board Office");
  const passwordHash = await bcrypt.hash(plainPassword, 10);

  const execDept = await prisma.department.findUnique({
    where: { slug: EXEC_DEPARTMENT_SLUG },
    select: { id: true },
  });
  if (!execDept)
    throw new Error(
      "Executive / Board Office department not found. Org seed failed.",
    );

  const user = await prisma.user.upsert({
    where: { email: "darkerman001@nexius.com" },
    update: {},
    create: {
      email: "darkerman001@nexius.com",
      name: "Darker Man",
      passwordHash,
      role: "ADMIN",
      departmentId: execDept.id,
      emailVerified: new Date(),
      isFirstLogin: true,
      remember: false,
    },
  });

  console.log("✅ Default user created:");
  console.log("Email:", user.email);
}

seedAdmin()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

// const org = [
//   {
//     name: "Group Shared Services",
//     slug: "shared",
//     isShared: true,
//     departments: [
//       ["Executive / Board Office", "Strategy, governance, group reporting"],
//       ["HR & Admin", "Recruitment, onboarding, payroll, staff welfare"],
//       ["Finance & Accounting", "Budgets, invoicing, payroll funding, tax"],
//       ["Legal & Compliance", "Contracts, registrations, licences"],
//       ["Marketing & Brand", "Unified brand, social media, PR"],
//       ["IT & Systems", "Tools, email, data, cybersecurity"],
//       ["Procurement", "Purchasing and vendor management"],
//       ["Customer Support", "Shared helpdesk for all arms"],
//     ],
//   },
//   {
//     name: "Nexentrix Technologies",
//     slug: "technologies",
//     departments: [
//       ["Software Development", "Building and maintaining products"],
//       ["Product / Project Management", "Roadmaps, timelines, delivery"],
//       ["UI/UX Design", "Interfaces and user experience"],
//       ["QA & Testing", "Quality assurance, bug tracking"],
//       ["Sales & Business Dev.", "Clients, partnerships, revenue"],
//     ],
//   },
//   {
//     name: "Nexlearn Academy",
//     slug: "nexlearn",
//     departments: [
//       ["Curriculum & Content", "Course design and content quality"],
//       ["Instructors / Facilitators", "Delivery of lessons and sessions"],
//       ["Learner Success", "Onboarding, support, retention", 2],
//       ["Community & Cohorts", "Cohort management, groups, engagement"],
//       ["Admissions & Enrollment", "Applications, enrollment, payments"],
//       ["Platform Operations", "Platform uptime and day-to-day ops"],
//     ],
//   },
//   {
//     name: "Nexora Construction & Logistics",
//     slug: "nexora",
//     departments: [
//       ["Projects & Site Ops", "Running construction sites and projects"],
//       ["Engineering & QS", "Technical design, measurement, costing"],
//       ["Logistics & Fleet", "Transport, dispatch, fleet upkeep"],
//       ["Health, Safety & Environment", "Site safety, compliance, incidents"],
//       ["Warehouse & Inventory", "Stock, storage, materials tracking"],
//       ["Estimating & Tendering", "Bids, quotes, tender submissions"],
//     ],
//   },
// ] as const;

// async function main() {
//   for (const arm of org) {
//     const a = await prisma.arm.upsert({
//       where: { slug: arm.slug },
//       update: { name: arm.name },
//       create: { name: arm.name, slug: arm.slug, isShared: "isShared" in arm },
//     });
//     for (const [name, focus] of arm.departments) {
//       await prisma.department.upsert({
//         where: { slug: slugify(name) },
//         update: { name, focus, armId: a.id },
//         create: { name, slug: slugify(name), focus, armId: a.id },
//       });
//     }
//   }
// }
// main().finally(() => prisma.$disconnect());
