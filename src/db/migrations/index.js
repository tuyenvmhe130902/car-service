import { getDb } from '../init.js';
import * as migration001 from './001_initial_schema.js';
import * as migration002 from './002_add_vehicle_columns.js';
import * as migration003 from './003_add_service_types.js';
import * as migration004 from './004_rename_summary_column.js';
import * as migration005 from './005_add_braking_fluid_service_type.js';

const migrations = [
  migration001,
  migration002,
  migration003,
  migration004,
  migration005
];

async function createMigrationsTable(db) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      migration_name TEXT NOT NULL,
      executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

export async function runMigrations(direction = 'up') {
  const db = await getDb();
  await createMigrationsTable(db);

  try {
    await db.exec('BEGIN TRANSACTION');

    const executedMigrations = await db.all('SELECT migration_name FROM migrations');
    const executedMigrationNames = new Set(executedMigrations.map(m => m.migration_name));

    console.log('Currently executed migrations:', executedMigrationNames);
    console.log('Total migrations to run:', migrations.length);

    for (let i = 0; i < migrations.length; i++) {
      const migrationName = `migration_${(i + 1).toString().padStart(3, '0')}`;
      
      if (direction === 'up' && !executedMigrationNames.has(migrationName)) {
        console.log(`Starting migration: ${migrationName}`);
        await migrations[i].up(db);
        await db.run('INSERT INTO migrations (migration_name) VALUES (?)', migrationName);
        console.log(`Completed migration: ${migrationName}`);
      } else if (direction === 'down' && executedMigrationNames.has(migrationName)) {
        console.log(`Starting rollback: ${migrationName}`);
        await migrations[i].down(db);
        await db.run('DELETE FROM migrations WHERE migration_name = ?', migrationName);
        console.log(`Completed rollback: ${migrationName}`);
      }
    }

    await db.exec('COMMIT');
    console.log('Migrations completed successfully');
  } catch (error) {
    console.error('Migration failed at step:', error);
    await db.exec('ROLLBACK');
    throw error;
  }
}