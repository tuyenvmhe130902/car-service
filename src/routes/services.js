import express from 'express';
import { getDb } from '../db/init.js';

const router = express.Router();

router.get('/vehicle/:vehicleId', async (req, res) => {
  try {
    const db = await getDb();
    const { vehicleId } = req.params;

    if (vehicleId === 'all') {
      const services = await db.all(
        `
          SELECT 
            s.*,
            v.name AS vehicle_name,
            v.vin AS vehicle_vin
          FROM service_records s
          JOIN vehicles v ON v.id = s.vehicle_id
          ORDER BY s.service_date DESC
        `
      );
      return res.json(services);
    }

    // Lịch sử của 1 xe, kèm theo tên xe
    const services = await db.all(
      `
        SELECT 
          s.*,
          v.name AS vehicle_name,
          v.vin AS vehicle_vin
        FROM service_records s
        JOIN vehicles v ON v.id = s.vehicle_id
        WHERE s.vehicle_id = ?
        ORDER BY s.service_date DESC
      `,
      vehicleId
    );

    res.json(services);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new service record
router.post('/', async (req, res) => {
  try {
    const {
      vehicle_id,
      service_date,
      mileage,
      service_type,
      description,
      cost,
      location,
      next_service_mileage,
      next_service_notes
    } = req.body;

    // Convert empty strings to null for number fields
    const sanitizedMileage = mileage === '' ? null : mileage;
    const sanitizedCost = cost === '' ? null : cost;
    const sanitizedNextServiceMileage = next_service_mileage === '' ? null : next_service_mileage;

    const db = await getDb();
    const result = await db.run(
      `INSERT INTO service_records (
        vehicle_id, service_date, mileage, service_type, description,
        cost, location, next_service_mileage, next_service_notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        vehicle_id,
        service_date,
        sanitizedMileage,
        service_type,
        description,
        sanitizedCost,
        location,
        sanitizedNextServiceMileage,
        next_service_notes
      ]
    );
    
    const newService = await db.get('SELECT * FROM service_records WHERE id = ?', result.lastID);
    res.status(201).json(newService);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update existing service record
router.put('/:id', async (req, res) => {
  try {
    const {
      service_date,
      mileage,
      service_type,
      description,
      cost,
      location,
      next_service_mileage,
      next_service_notes
    } = req.body;

    // Convert empty strings to null for number fields
    const sanitizedMileage = mileage === '' ? null : mileage;
    const sanitizedCost = cost === '' ? null : cost;
    const sanitizedNextServiceMileage = next_service_mileage === '' ? null : next_service_mileage;

    const db = await getDb();
    const result = await db.run(
      `UPDATE service_records 
       SET service_date = ?, 
           mileage = ?, 
           service_type = ?, 
           description = ?, 
           cost = ?, 
           location = ?, 
           next_service_mileage = ?, 
           next_service_notes = ? 
       WHERE id = ?`,
      [
        service_date,
        sanitizedMileage,
        service_type,
        description,
        sanitizedCost,
        location,
        sanitizedNextServiceMileage,
        next_service_notes,
        req.params.id
      ]
    );

    if (result.changes === 0) {
      return res.status(404).json({ message: 'Service record not found' });
    }

    const updatedService = await db.get('SELECT * FROM service_records WHERE id = ?', req.params.id);
    res.json(updatedService);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a service record by ID
router.delete('/:id', async (req, res) => {
  try {
    const db = await getDb();
    const result = await db.run(
      'DELETE FROM service_records WHERE id = ?',
      req.params.id
    );

    if (result.changes === 0) {
      return res.status(404).json({ message: 'Service record not found' });
    }

    res.json({ message: 'Service record deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get services within a date range
router.get('/range', async (req, res) => {
  try {
    const { start_date, end_date, vehicle_id } = req.query;
    const db = await getDb();
    
    let query = `
      SELECT * FROM service_records 
      WHERE service_date BETWEEN ? AND ?
    `;
    let params = [start_date, end_date];

    // Add vehicle filter if vehicle_id is provided
    if (vehicle_id) {
      query += ' AND vehicle_id = ?';
      params.push(vehicle_id);
    }

    query += ' ORDER BY service_date DESC';

    const services = await db.all(query, params);
    res.json(services);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get services by type 
router.get('/type/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const { vehicle_id } = req.query;
    const db = await getDb();
    
    let query = `
      SELECT * FROM service_records 
      WHERE (
        LOWER(service_type) LIKE LOWER(?)
        OR LOWER(description) LIKE LOWER(?)
      )
    `;
    let params = [`%${type}%`, `%${type}%`];

    if (vehicle_id) {
      query += ' AND vehicle_id = ?';
      params.push(vehicle_id);
    }

    query += ' ORDER BY service_date DESC';

    const services = await db.all(query, params);
    res.json(services);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;