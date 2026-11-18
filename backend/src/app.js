import express from 'express';
import cors from 'cors';
import systemRoutes from './routes/system.routes.js';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/v1', systemRoutes);

app.use((err, _req, res, _next) => {
  console.error('[Backend Error]:', err);
  res.status(err.status || 500).json({
    status: 'error',
    code: err.code || 'INTERNAL_SERVER_ERROR',
    message: err.message || 'Unexpected server error',
  });
});

export default app;
