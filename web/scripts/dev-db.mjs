// Local Postgres for development and tests (real Postgres binaries from npm, no Docker).
//   node scripts/dev-db.mjs start   -> starts on port 54329, creates database + roles, runs migrations
//   node scripts/dev-db.mjs stop
// Prints the DATABASE_URL / DATABASE_URL_WRITE to use.
import EmbeddedPostgres from "embedded-postgres";
import { existsSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";
import { migrate } from "./migrate.mjs";

const dir = resolve(process.env.DEV_DB_DIR ?? ".dev-db");
const port = Number(process.env.DEV_DB_PORT ?? 54329);
const cmd = process.argv[2] ?? "start";
// When run as root, Postgres runs as a separate "postgres" user, which needs write access to DEV_DB_DIR's parent.
const ep = new EmbeddedPostgres({ databaseDir: dir, user: "owner", password: "owner", port, persistent: true, createPostgresUser: true, onLog: () => {} });

if (cmd === "stop") { await ep.stop(); process.exit(0); }

if (!existsSync(`${dir}/PG_VERSION`)) await ep.initialise();
await ep.start();
const admin = new pg.Client({ host: "localhost", port, user: "owner", password: "owner", database: "postgres" });
await admin.connect();
const exists = await admin.query("select 1 from pg_database where datname = 'adams'");
if (!exists.rowCount) await admin.query("create database adams");
await admin.end();

const url = (u, p) => `postgres://${u}:${p}@localhost:${port}/adams`;
await migrate(url("owner", "owner"), { roles: true, readPassword: "read", writePassword: "write" });
const env = `DATABASE_URL=${url("site_read", "read")}\nDATABASE_URL_WRITE=${url("site_write", "write")}\n`;
writeFileSync(".env.development.local", env);
console.log(`Postgres running on ${port}. Wrote .env.development.local:\n${env}\nLeave this running; press Ctrl+C to stop.`);
