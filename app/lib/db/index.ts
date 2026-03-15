import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

function createDb() {
  const connectionString = process.env.REGISTRY_POSTGRES_URL;
  if (!connectionString) {
    throw new Error("REGISTRY_POSTGRES_URL is not set");
  }
  const sql = neon(connectionString);
  return drizzle(sql, { schema });
}

let _db: ReturnType<typeof createDb> | undefined;

export const db = new Proxy({} as ReturnType<typeof createDb>, {
  get(_target, prop) {
    if (!_db) _db = createDb();
    return (_db as unknown as Record<string | symbol, unknown>)[prop];
  },
});

export { schema };
