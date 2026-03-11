export async function up(db) {
    // Create a new table with the desired structure
    await db.exec(`
      CREATE TABLE service_records_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        vehicle_id INTEGER NOT NULL,
        service_date DATE NOT NULL,
        mileage INTEGER NOT NULL CHECK (mileage > 0 AND mileage <= 1000000),
        service_type TEXT NOT NULL,
        description TEXT,
        cost DECIMAL(10,2) CHECK (cost >= 0),
        location TEXT,
        next_service_mileage INTEGER CHECK (next_service_mileage > 0),
        next_service_notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)
      );
  
      -- Copy data from the old table to the new one
      INSERT INTO service_records_new (
        id, vehicle_id, service_date, mileage, service_type,
        description, cost, location, next_service_mileage,
        next_service_notes, created_at
      )
      SELECT 
        id, vehicle_id, service_date, mileage, summary,
        description, cost, location, next_service_mileage,
        next_service_notes, created_at
      FROM service_records;
  
      -- Drop the old table
      DROP TABLE service_records;
  
      -- Rename the new table to the original name
      ALTER TABLE service_records_new RENAME TO service_records;
    `);
  }
  
  export async function down(db) {
    await db.exec(`
      CREATE TABLE service_records_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        vehicle_id INTEGER NOT NULL,
        service_date DATE NOT NULL,
        mileage INTEGER NOT NULL CHECK (mileage > 0 AND mileage <= 1000000),
        summary TEXT NOT NULL,
        description TEXT,
        cost DECIMAL(10,2) CHECK (cost >= 0),
        location TEXT,
        next_service_mileage INTEGER CHECK (next_service_mileage > 0),
        next_service_notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)
      );
  
      -- Copy data back
      INSERT INTO service_records_new (
        id, vehicle_id, service_date, mileage, summary,
        description, cost, location, next_service_mileage,
        next_service_notes, created_at
      )
      SELECT 
        id, vehicle_id, service_date, mileage, service_type,
        description, cost, location, next_service_mileage,
        next_service_notes, created_at
      FROM service_records;
  
      -- Drop the current table
      DROP TABLE service_records;
  
      -- Rename the new table to the original name
      ALTER TABLE service_records_new RENAME TO service_records;
    `);
  }