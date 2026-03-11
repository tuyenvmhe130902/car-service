import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let db = null;

// Normalize parameters passed to queries so existing code keeps working
function normalizeParams(params) {
  if (params === undefined || params === null) return [];
  // If it's already an array, keep as-is
  if (Array.isArray(params)) return params;
  // For single value (string/number/etc.), wrap into array
  return [params];
}

export async function getDb() {
  if (db) {
    return db;
  }

  const dbPath = path.join(__dirname, '../../data/database.sqlite');
  const dbDir = path.dirname(dbPath);

  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const rawDb = new Database(dbPath);

  db = {
    raw: rawDb,
    async all(sql, params) {
      const stmt = rawDb.prepare(sql);
      const rows = stmt.all(...normalizeParams(params));
      return rows;
    },
    async get(sql, params) {
      const stmt = rawDb.prepare(sql);
      const row = stmt.get(...normalizeParams(params));
      return row;
    },
    async run(sql, params) {
      const stmt = rawDb.prepare(sql);
      const info = stmt.run(...normalizeParams(params));
      // Normalize return shape to be compatible with `sqlite`'s run result
      // (`lastID` is used in routes/migrations, while better-sqlite3 exposes `lastInsertRowid`)
      return {
        ...info,
        lastID: info.lastInsertRowid
      };
    },
    async exec(sql) {
      rawDb.exec(sql);
    }
  };

  return db;
}

export async function initializeDatabase() {
  const db = await getDb();

  await db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      migration_name TEXT NOT NULL UNIQUE,
      executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log('Database initialized');
}