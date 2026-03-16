import { Pool } from 'pg';

let db = null;
let pgPool = null;

// Normalize parameters passed to queries so existing code keeps working
function normalizeParams(params) {
  if (params === undefined || params === null) return [];
  if (Array.isArray(params)) return params;
  return [params];
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

export async function getDb() {
  if (db) {
    return db;
  }

  db = await createSupabaseDb();

  return db;
}

export async function initializeDatabase() {
  console.log('Using Supabase database - no local SQLite initialization required');
}