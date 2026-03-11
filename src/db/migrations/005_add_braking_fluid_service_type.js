export async function up(db) {
    await db.run(`
      INSERT INTO service_types (name, description, is_custom) 
      VALUES ('Braking fluid replacement', 'Replacement of brake fluid to maintain brake system performance', 0)
    `);
  }
  
  export async function down(db) {
    await db.run(`
      DELETE FROM service_types 
      WHERE name = 'Braking fluid replacement'
    `);
  }