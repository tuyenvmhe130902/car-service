export async function up(db) {
    await db.exec(`
      CREATE TABLE IF NOT EXISTS vehicles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        make TEXT NOT NULL,
        model TEXT NOT NULL,
        year INTEGER,
        vin TEXT,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
  
      CREATE TABLE IF NOT EXISTS service_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        vehicle_id INTEGER NOT NULL,
        service_date DATE NOT NULL,
        mileage INTEGER NOT NULL CHECK (mileage > 0 AND mileage <= 1000000),
        service_type_id INTEGER,
        summary TEXT NOT NULL,
        description TEXT,
        cost DECIMAL(10,2) CHECK (cost >= 0),
        location TEXT,
        next_service_mileage INTEGER CHECK (next_service_mileage > 0),
        next_service_notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)
      );
    `);
  }
  
  export async function down(db) {
    await db.exec(`
      DROP TABLE IF EXISTS service_records;
      DROP TABLE IF EXISTS vehicles;
    `);
  }