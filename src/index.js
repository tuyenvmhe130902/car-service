import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import vehicleRoutes from './routes/vehicles.js';
import serviceRoutes from './routes/services.js';
import exportRoutes from './routes/exports.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const HAS_SUPABASE_URL = !!process.env.SUPABASE_DB_URL;

if (!HAS_SUPABASE_URL) {
  console.error('SUPABASE_DB_URL is NOT SET. This backend is configured to use Supabase only.');
  process.exit(1);
}

console.log('SUPABASE_DB_URL is SET - using Supabase as the database');

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
  console.log('✅ Using Supabase database (SQLite support removed)');
});