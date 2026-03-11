export async function up(db) {
    await db.exec(`
      CREATE TABLE IF NOT EXISTS service_types (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        description TEXT,
        is_custom BOOLEAN DEFAULT FALSE
      );
    `);
  }
  
  export async function down(db) {
    await db.exec(`
      DROP TABLE IF EXISTS service_types;
    `);
  }