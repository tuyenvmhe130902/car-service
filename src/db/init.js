import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { Pool } from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let db = null;
let pgPool = null;

// Normalize parameters passed to queries so existing code keeps working
function normalizeParams(params) {
  if (params === undefined || params === null) return [];
  if (Array.isArray(params)) return params;
  return [params];
}

function usingSupabase() {
  return !!process.env.SUPABASE_DB_URL;
}

function getPgPool() {
  if (!pgPool) {
    const connectionString = process.env.SUPABASE_DB_URL;
    if (!connectionString) {
      throw new Error('SUPABASE_DB_URL is not set but Supabase mode was requested');
    }
    pgPool = new Pool({ connectionString });
  }
  return pgPool;
}

function toPgQuery(sql, params) {
  let index = 0;
  const text = sql.replace(/\?/g, () => {
    index += 1;
    return `$${index}`;
  });
  return { text, values: normalizeParams(params) };
}

async function createSupabaseDb() {
  const pool = getPgPool();

  const supabaseDb = {
    async all(sql, params) {
      const client = await pool.connect();
      try {
        const { text, values } = toPgQuery(sql, params);
        const result = await client.query(text, values);
        return result.rows;
      } finally {
        client.release();
      }
    },
    async get(sql, params) {
      const rows = await this.all(sql, params);
      return rows[0] || null;
    },
    async run(sql, params) {
      const client = await pool.connect();
      try {
        const isInsert = /^\s*INSERT/i.test(sql);
        let text = sql.trim();
        if (isInsert && !/RETURNING\s+/i.test(text)) {
          if (text.endsWith(';')) {
            text = text.slice(0, -1);
          }
          text = `${text} RETURNING id`;
        }
        const { text: pgText, values } = toPgQuery(text, params);
        const result = await client.query(pgText, values);
        const lastID = isInsert && result.rows[0] ? result.rows[0].id : null;
        return {
          changes: result.rowCount,
          lastID
        };
      } finally {
        client.release();
      }
    },
    async exec(sql) {
      const client = await pool.connect();
      try {
        const statements = sql
          .split(';')
          .map(s => s.trim())
          .filter(Boolean);
        for (const statement of statements) {
          await client.query(statement);
        }
      } finally {
        client.release();
      }
    }
  };

  return supabaseDb;
}

async function createSqliteDb() {
  const dbPath = path.join(__dirname, '../../data/database.sqlite');
  const dbDir = path.dirname(dbPath);

  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const rawDb = new Database(dbPath);

  return {
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
      return {
        ...info,
        lastID: info.lastInsertRowid
      };
    },
    async exec(sql) {
      rawDb.exec(sql);
    }
  };
}

export async function getDb() {
  if (db) {
    return db;
  }

  if (usingSupabase()) {
    db = await createSupabaseDb();
  } else {
    db = await createSqliteDb();
  }

  return db;
}

export async function initializeDatabase() {
  if (usingSupabase()) {
    console.log('Supabase mode: skipping local SQLite initialization');
    return;
  }

  const db = await getDb();

  await db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      migration_name TEXT NOT NULL UNIQUE,
      executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log('SQLite database initialized');
}