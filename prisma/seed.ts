import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const sqliteUrl = (process.env.DATABASE_URL ?? "file:./dev.db").replace(/^file:/, "");
const db = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: sqliteUrl }) });

// Cascade Analytics (fictional B2B SaaS vendor) is the AE's employer for
// every deal seeded here — rep names live on Call.repName rather than a
// separate table since this prototype doesn't need rep-level CRM records,
// only enough to group the coaching dashboard by rep.
const DEALS = [
  {
    accountName: "Brightline Retail",
    contactName: "Morgan Ellis",
    contactEmail: "morgan.ellis@brightlineretail.example",
    stage: "technical_evaluation",
  },
  {
    accountName: "Foundry Logistics",
    contactName: "Priya Anand",
    contactEmail: "priya.anand@foundrylogistics.example",
    stage: "discovery",
  },
  {
    accountName: "Harborview Health",
    contactName: "Sam Ostrowski",
    contactEmail: "sam.ostrowski@harborviewhealth.example",
    stage: "proposal",
  },
];

async function main() {
  for (const deal of DEALS) {
    const existing = await db.deal.findFirst({ where: { accountName: deal.accountName } });
    if (existing) {
      console.log(`skipping ${deal.accountName} — already seeded`);
      continue;
    }
    const created = await db.deal.create({ data: deal });
    console.log(`seeded deal ${created.accountName} (${created.stage}) — id ${created.id}`);
  }
}

main()
  .then(() => db.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await db.$disconnect();
    process.exit(1);
  });
