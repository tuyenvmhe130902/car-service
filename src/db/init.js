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

/** Postgres URL: SUPABASE_DB_URL first, then DATABASE_URL (Supabase dashboard often uses the latter). */
export function getPostgresConnectionString() {
  return process.env.SUPABASE_DB_URL || process.env.DATABASE_URL || '';
}

function usingSupabase() {
  return !!getPostgresConnectionString();
}

function isSupabaseHost(url) {
  return typeof url === 'string' && url.includes('supabase.co');
}

function getPgPool() {
  if (!pgPool) {
    const connectionString = getPostgresConnectionString();
    if (!connectionString) {
      throw new Error(
        'SUPABASE_DB_URL or DATABASE_URL is not set but Postgres mode was requested'
      );
    }
    const ssl = isSupabaseHost(connectionString)
      ? { rejectUnauthorized: false }
      : undefined;
    pgPool = new Pool({ connectionString, ssl });
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

function pgTxMethods(client) {
  return {
    async all(sql, params) {
      const { text, values } = toPgQuery(sql, params);
      const result = await client.query(text, values);
      return result.rows;
    },
    async get(sql, params) {
      const rows = await this.all(sql, params);
      return rows[0] || null;
    },
    async run(sql, params) {
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
    },
    async exec(sql) {
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(Boolean);
      for (const statement of statements) {
        await client.query(statement);
      }
    }
  };
}

async function createSupabaseDb() {
  const pool = getPgPool();

  const supabaseDb = {
    async withTransaction(fn) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const tx = pgTxMethods(client);
        const result = await fn(tx);
        await client.query('COMMIT');
        return result;
      } catch (e) {
        try {
          await client.query('ROLLBACK');
        } catch (_) {
          // ignore
        }
        throw e;
      } finally {
        client.release();
      }
    },
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
    async withTransaction(fn) {
      try {
        rawDb.exec('BEGIN');
        const txDb = {
          async all(sql, params) {
            const stmt = rawDb.prepare(sql);
            return stmt.all(...normalizeParams(params));
          },
          async get(sql, params) {
            const stmt = rawDb.prepare(sql);
            return stmt.get(...normalizeParams(params));
          },
          async run(sql, params) {
            const stmt = rawDb.prepare(sql);
            const info = stmt.run(...normalizeParams(params));
            return {
              changes: info.changes,
              lastID: info.lastInsertRowid
            };
          },
          async exec(sql) {
            rawDb.exec(sql);
          }
        };
        const result = await fn(txDb);
        rawDb.exec('COMMIT');
        return result;
      } catch (e) {
        try {
          rawDb.exec('ROLLBACK');
        } catch (_) {
          // ignore
        }
        throw e;
      }
    },
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