import express from 'express';
import cors from 'cors';
import dns from 'node:dns';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { exec } from 'child_process';

// Import Routes
import itemsRoutes from './routes/items.js';
import uploadRoutes from './routes/upload.js';
import salesRoutes from './routes/sales.js';
import cashSessionsRoutes from './routes/cashSessions.js';
import usersRoutes from './routes/users.js';
import authRoutes from './routes/auth.js';
import settingsRoutes from './routes/settings.js';
import shopsRoutes from './routes/shops.js';
import updatesRoutes from './routes/updates.js';
import catalogRoutes from './routes/catalog.js';
import customersRoutes from './routes/customers.js';
import checkoutRoutes from './routes/checkout.js';
import expensesRoutes from './routes/expenses.js';
import damagedProductsRoutes from './routes/damagedProducts.js';
import easypaisaOrdersRoutes from './routes/easypaisaOrders.js';
import purchasesRoutes from './routes/purchases.js';
import customerCreditsRoutes from './routes/customerCredits.js';
import purchaseCreditsRoutes from './routes/purchaseCredits.js';

dotenv.config();

// Fix for MongoDB Atlas DNS resolution issues
dns.setServers(['8.8.8.8', '8.8.4.4']);
dns.setDefaultResultOrder('ipv4first');

// Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);



const app = express();

// Trust proxy for Railway (crucial for secure cookies behind reverse proxies)
app.set('trust proxy', 1);

// Middleware
const corsOptions = {
  origin: '*',
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'x-owner-password', 'x-user-role'],
  exposedHeaders: ['x-owner-password', 'x-user-role']
};

app.use(cors(corsOptions));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());

// Request logger for debugging Railway traffic
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - Origin: ${req.get('origin')}`);
  next();
});

// Static Folders
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/invoices', express.static(path.join(__dirname, 'invoices')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// API Routes
app.use('/api/items', itemsRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/cash-sessions', cashSessionsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/shops', shopsRoutes);
app.use('/api/updates', updatesRoutes);
app.use('/api/catalog', catalogRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/checkout', checkoutRoutes);
app.use('/api/expenses', expensesRoutes);
app.use('/api/damaged-products', damagedProductsRoutes);
app.use('/api/easypaisa-orders', easypaisaOrdersRoutes);
app.use('/api/purchases', purchasesRoutes);
app.use('/api/customer-credits', customerCreditsRoutes);
app.use('/api/purchase-credits', purchaseCreditsRoutes);

// Root route
app.get('/', (req, res) => {
  res.send('Nexflow Inventory API is running...');
});

// Custom 404 Handler (This catches any route not defined above)
app.use((req, res) => {
  console.log(`[404] Route Not Found: ${req.method} ${req.url}`);
  res.status(404).json({
    success: false,
    message: `Route not found on Nexflow API: ${req.method} ${req.url}`
  });
});

// Global Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('SERVER ERROR:', err);
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    success: false,
    message,
    errors: err.errors || [],
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

const PORT = process.env.PORT || 5004;

// Connect to Database
await connectDB();


const server = createServer(app);

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.warn(`⚠️  Port ${PORT} is in use. Killing old process and retrying...`);
    // On Windows: find and kill process on PORT, then retry
    exec(`for /f "tokens=5" %a in ('netstat -ano ^| findstr :${PORT}') do taskkill /PID %a /F`, () => {
      setTimeout(() => {
        server.close();
        server.listen(PORT);
      }, 1000);
    });
  } else {
    console.error('Server error:', err);
    process.exit(1);
  }
});

server.listen(PORT, () => {
  console.log(`🚀 Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
