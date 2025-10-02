import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import dotenv from 'dotenv';
import pino from 'pino';
import { MongoClient } from 'mongodb';

dotenv.config();

const logger = pino({ level: process.env.LOG_LEVEL || 'info' });

const app = express();
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || '*', credentials: false }));
app.use(express.json());

const port = process.env.PORT || 3000;
const mongoUri = process.env.MONGODB_URI || 'mongodb://mongo:27017/appdb';
let mongoClient; // eslint-disable-line import/no-mutable-exports

async function connectToMongo() {
  mongoClient = new MongoClient(mongoUri, { serverSelectionTimeoutMS: 5000 });
  await mongoClient.connect();
  logger.info('Connected to MongoDB');
  return mongoClient.db();
}

app.get('/healthz', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.get('/metrics', (_req, res) => {
  const metrics = `
# HELP nodejs_heap_used_bytes Node.js heap used in bytes
# TYPE nodejs_heap_used_bytes gauge
nodejs_heap_used_bytes ${process.memoryUsage().heapUsed}

# HELP nodejs_heap_total_bytes Node.js heap total in bytes
# TYPE nodejs_heap_total_bytes gauge
nodejs_heap_total_bytes ${process.memoryUsage().heapTotal}

# HELP nodejs_external_bytes Node.js external memory in bytes
# TYPE nodejs_external_bytes gauge
nodejs_external_bytes ${process.memoryUsage().external}

# HELP process_uptime_seconds Process uptime in seconds
# TYPE process_uptime_seconds counter
process_uptime_seconds ${process.uptime()}
`;
  res.set('Content-Type', 'text/plain');
  res.send(metrics);
});

app.get('/api/time', (_req, res) => {
  res.json({ now: new Date().toISOString() });
});

app.get('/api/items', async (_req, res) => {
  try {
    const db = mongoClient?.db();
    const items = await db.collection('items').find({}).limit(50).toArray();
    res.json(items);
  } catch (err) {
    logger.error({ err }, 'Failed to fetch items');
    res.status(500).json({ error: 'internal_error' });
  }
});

app.post('/api/items', async (req, res) => {
  try {
    const { name } = req.body || {};
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'invalid_name' });
    }
    const db = mongoClient?.db();
    const result = await db.collection('items').insertOne({ name, createdAt: new Date() });
    return res.status(201).json({ id: result.insertedId });
  } catch (err) {
    logger.error({ err }, 'Failed to create item');
    return res.status(500).json({ error: 'internal_error' });
  }
});

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received');
  try {
    await mongoClient?.close();
  } finally {
    process.exit(0);
  }
});

connectToMongo()
  .then(() => {
    app.listen(port, () => logger.info(`Server listening on ${port}`));
  })
  .catch((err) => {
    logger.error({ err }, 'MongoDB connection failed');
    process.exit(1);
  });