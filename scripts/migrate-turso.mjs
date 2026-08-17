// prisma migrate deploy's native engine only understands "file:" SQLite URLs,
// not libsql://, so it can't be pointed at Turso directly. This applies the
// same migration.sql files by hand over @libsql/client and tracks them in a
// _prisma_migrations table with the same shape Prisma itself uses, so the
// migration history stays legible if anyone inspects it later.
import { createClient } from "@libsql/client";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(__dirname, "..", "prisma", "migrations");

const url = process.env.DATABASE_URL;
const authToken = process.env.DATABASE_AUTH_TOKEN;
if (!url) throw new Error("DATABASE_URL is required");

const client = createClient({ url, authToken });

async function main() {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS _prisma_migrations (
      id                      TEXT PRIMARY KEY NOT NULL,
      checksum                TEXT NOT NULL,
      finished_at             DATETIME,
      migration_name          TEXT NOT NULL,
      logs                    TEXT,
      rolled_back_at          DATETIME,
      started_at              DATETIME NOT NULL DEFAULT current_timestamp,
      applied_steps_count     INTEGER UNSIGNED NOT NULL DEFAULT 0
    )
  `);

  const applied = await client.execute("SELECT migration_name FROM _prisma_migrations");
  const appliedNames = new Set(applied.rows.map((r) => r.migration_name));

  const dirs = readdirSync(migrationsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();

  for (const name of dirs) {
    if (appliedNames.has(name)) {
      console.log(`skip (already applied): ${name}`);
      continue;
    }
    const sql = readFileSync(join(migrationsDir, name, "migration.sql"), "utf8");
    const checksum = createHash("sha256").update(sql).digest("hex");
    console.log(`applying: ${name}`);
    await client.executeMultiple(sql);
    await client.execute({
      sql: `INSERT INTO _prisma_migrations (id, checksum, finished_at, migration_name, applied_steps_count)
            VALUES (?, ?, current_timestamp, ?, 1)`,
      args: [crypto.randomUUID(), checksum, name],
    });
  }

  console.log("done");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => client.close());
