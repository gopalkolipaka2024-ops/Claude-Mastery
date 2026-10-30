/*
  Database connections. Two roles (see roles.sql):
    DATABASE_URL        read-only role, used by every public page and API
    DATABASE_URL_WRITE  read/write role, used only by sync jobs, the webhook and /admin
  Reads from Neon use Neon's HTTP driver (fast, works on Cloudflare Workers). Writes always
  use node-postgres, which supports transactions (also works on Workers with nodejs_compat).
*/
import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

export type Db = ReturnType<typeof drizzlePg<typeof schema>>;
const cache = new Map<string, Db>();

function connect(url: string, role: "read" | "write"): Db {
  if (role === "read" && /\.neon\.tech/.test(url)) return drizzleNeon(neon(url), { schema }) as unknown as Db;
  return drizzlePg(new Pool({ connectionString: url, max: role === "write" ? 3 : 5 }), { schema });
}

export const hasDatabase = () => !!process.env.DATABASE_URL;

export function db(role: "read" | "write" = "read"): Db {
  const url = role === "write" ? process.env.DATABASE_URL_WRITE : process.env.DATABASE_URL;
  if (!url) throw new Error(role === "write" ? "DATABASE_URL_WRITE is not set" : "DATABASE_URL is not set");
  let d = cache.get(url);
  if (!d) { d = connect(url, role); cache.set(url, d); }
  return d;
}
