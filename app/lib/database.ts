import "server-only";
import path from "node:path";
import { openDatabase } from "./sqlite.mjs";

let connection: ReturnType<typeof openDatabase> | undefined;
export function db() {
  connection ??= openDatabase(path.join(process.cwd(), ".data", "propora.sqlite"));
  return connection;
}
export function dataRevision() {
  return String(db().prepare("SELECT value FROM app_meta WHERE key='data_revision'").get()!.value);
}
export function transaction<T>(operation: () => T): T {
  const database = db();
  database.exec("BEGIN IMMEDIATE");
  try { const value = operation(); database.exec("COMMIT"); return value; }
  catch (error) { database.exec("ROLLBACK"); throw error; }
}
