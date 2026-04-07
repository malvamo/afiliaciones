import "dotenv/config";
import { InsuranceCategory, PrismaClient } from "@prisma/client";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is missing");
}

const prisma = new PrismaClient();

type ClinicSeed = { code: string; name: string };
type InsuranceSeed = { name: string; category: InsuranceCategory; sortOrder: number };

const clinics: ClinicSeed[] = [
  { code: "NL", name: "North Lauderdale" },
  { code: "MG", name: "Miami Gardens" },
  { code: "BC", name: "Biscayne (Miami Shores)" },
  { code: "RL", name: "River Landing" },
  { code: "WK", name: "West Kendall" },
  { code: "PB", name: "Palmetto Bay" },
  { code: "H1", name: "Homestead" },
  { code: "H2", name: "Homestead 2" },
  { code: "JDM", name: "Joe DiMaggio Childrens Hospital" },
  { code: "NCH", name: "Nicklaus Childrens Hospital" },
  { code: "HOLTZ", name: "Holtz Childrens Hospital" },
];

const insurances: InsuranceSeed[] = [
  { name: "Liberty", category: InsuranceCategory.MEDICAID, sortOrder: 1 },
  { name: "DentaQuest", category: InsuranceCategory.MEDICAID, sortOrder: 2 },
  { name: "MCNA", category: InsuranceCategory.MEDICAID, sortOrder: 3 },

  { name: "AETNA", category: InsuranceCategory.PPO, sortOrder: 1 },
  { name: "METLIFE", category: InsuranceCategory.PPO, sortOrder: 2 },
  { name: "CIGNA", category: InsuranceCategory.PPO, sortOrder: 3 },
  { name: "DELTA DENTAL", category: InsuranceCategory.PPO, sortOrder: 4 },
  { name: "UNITED HEALTH CARE", category: InsuranceCategory.PPO, sortOrder: 5 },
  { name: "UNITED CONCORDIA / TRICARE", category: InsuranceCategory.PPO, sortOrder: 6 },
  { name: "DENTAL GUARDIAN", category: InsuranceCategory.PPO, sortOrder: 7 },
  { name: "AMERITAS", category: InsuranceCategory.PPO, sortOrder: 8 },
  { name: "ASSURANT PPO/Sunlife", category: InsuranceCategory.PPO, sortOrder: 9 },
  { name: "CAREINGTON", category: InsuranceCategory.PPO, sortOrder: 10 },
  { name: "DENTAL NETWORK OF AMERICA", category: InsuranceCategory.PPO, sortOrder: 11 },
  { name: "DENTEMAX", category: InsuranceCategory.PPO, sortOrder: 12 },
  { name: "HUMANA", category: InsuranceCategory.PPO, sortOrder: 13 },
  { name: "PRINCIPAL FINANCIAL GROUP", category: InsuranceCategory.PPO, sortOrder: 14 },
  { name: "SOLSTICE", category: InsuranceCategory.PPO, sortOrder: 15 },
  { name: "LINCOLN FINANCIAL GROUP", category: InsuranceCategory.PPO, sortOrder: 16 },
  { name: "GEHA", category: InsuranceCategory.PPO, sortOrder: 17 },
  { name: "Florida Blue/Combined BCBS", category: InsuranceCategory.PPO, sortOrder: 18 },
];

async function main() {
  for (const clinic of clinics) {
    await prisma.clinic.upsert({
      where: { code: clinic.code },
      create: clinic,
      update: { name: clinic.name, active: true },
    });
  }

  for (const insurance of insurances) {
    await prisma.insurance.upsert({
      where: { name: insurance.name },
      create: {
        ...insurance,
        termMonths: 12,
        renewalLeadMonths: 3,
        activationLeadMonths: 3,
        active: true,
      },
      update: {
        category: insurance.category,
        sortOrder: insurance.sortOrder,
        active: true,
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    await prisma.$disconnect();
    throw e;
  });
