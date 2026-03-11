import { getDb } from './src/db/init.js';

async function debugDatabase() {
  const db = await getDb();
  
  try {
    // Check all tables
    const tables = await db.all("SELECT name FROM sqlite_master WHERE type='table';");
    console.log("All tables:", tables);

    // For each table, show its structure
    for (const table of tables) {
      const structure = await db.all(`PRAGMA table_info('${table.name}')`);
      console.log(`\nStructure of ${table.name}:`, structure);
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

debugDatabase();