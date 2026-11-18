import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import systemRoutes from './routes/system.routes.js';
import authRoutes from './routes/auth.routes.js';
import assetRoutes from './routes/assets.routes.js';
import adminRoutes from './routes/admin.routes.js';
import marketplaceRoutes from './routes/marketplace.routes.js';
import operationRoutes from './routes/operations.routes.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

app.use('/api/v1', systemRoutes);
app.use('/api/v1', authRoutes);
app.use('/api/v1', assetRoutes);
app.use('/api/v1', adminRoutes);
app.use('/api/v1', marketplaceRoutes);
app.use('/api/v1', operationRoutes);

app.use((err, _req, res, _next) => {
  console.error('[Backend Error]:', err);
  res.status(err.status || 500).json({
    status: 'error',
    code: err.code || 'INTERNAL_SERVER_ERROR',
    message: err.message || 'Unexpected server error',
  });
});

export default app;
