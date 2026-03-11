import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { initializeDatabase } from './db/init.js';
import { runMigrations } from './db/migrations/index.js';
import vehicleRoutes from './routes/vehicles.js';
import serviceRoutes from './routes/services.js';
import exportRoutes from './routes/exports.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(
  helmet({
    crossOriginResourcePolicy: false,
  })
);
app.use(morgan('dev'));
app.use(express.json());

// Routes
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/exports', exportRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK' });
});

app.listen(PORT, '0.0.0.0', async () => {
  console.log(`🚀 Server running on port ${PORT}`);

  try {
    await initializeDatabase();
    await runMigrations('up');
    console.log('✅ Database initialized & migrations completed');
  } catch (error) {
    console.error('❌ Database init or migration failed:', error);
  }
});