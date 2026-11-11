import Database from "better-sqlite3";
import path from "path";

const databasePath = path.join(process.cwd(), "assetflow.db");
const db = new Database(databasePath);

db.exec(`
  CREATE TABLE IF NOT EXISTS assets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    tag TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL,
    owner TEXT NOT NULL DEFAULT 'Unassigned',
    status TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )
`);

export function getAssets() {
  return db.prepare("SELECT name, tag, category, owner, status, updated_at FROM assets ORDER BY id DESC").all();
}

export function getStats() {
  const total = db.prepare("SELECT COUNT(*) AS count FROM assets").get().count;
  const assigned = db.prepare("SELECT COUNT(*) AS count FROM assets WHERE status = 'Assigned'").get().count;
  const stock = db.prepare("SELECT COUNT(*) AS count FROM assets WHERE status = 'In stock'").get().count;
  const repair = db.prepare("SELECT COUNT(*) AS count FROM assets WHERE status = 'In repair'").get().count;
  const categories = Object.fromEntries(db.prepare("SELECT category, COUNT(*) AS count FROM assets GROUP BY category").all().map(row => [row.category, row.count]));
  return { total, assigned, stock, repair, unassigned: stock, categories };
}

export function addAsset({ name, tag, category, owner }) {
  if (!name?.trim() || !tag?.trim() || !category?.trim()) throw new Error("Name, tag, and category are required.");
  const assignedOwner = owner?.trim() || "Unassigned";
  const status = assignedOwner === "Unassigned" ? "In stock" : "Assigned";
  db.prepare("INSERT INTO assets (name, tag, category, owner, status, updated_at) VALUES (?, ?, ?, ?, ?, ?)")
    .run(name.trim(), tag.trim().toUpperCase(), category.trim(), assignedOwner, status, new Date().toISOString());
}
