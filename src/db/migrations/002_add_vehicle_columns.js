export async function up(db) {
    await db.exec(`
      ALTER TABLE vehicles ADD COLUMN first_registration DATE;
      ALTER TABLE vehicles ADD COLUMN engine TEXT;
      ALTER TABLE vehicles ADD COLUMN engine_type TEXT;
    `);
  }
  
  export async function down(db) {
    // SQLite doesn't support dropping columns, so we'd need to recreate the table
    // This is a placeholder for documentation
    console.log('Down migration not supported for SQLite column removal');
  }