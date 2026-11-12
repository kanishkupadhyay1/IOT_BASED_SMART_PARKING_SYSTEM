import 'dotenv/config';
import http from 'http';
import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import { Server } from 'socket.io';
import { parkingStore } from './store/parkingStore.js';
import { createParkingRouter } from './routes/parkingRoutes.js';

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/smart_parking';
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: [CLIENT_ORIGIN, 'http://127.0.0.1:5173'],
    methods: ['GET', 'POST'],
  },
});

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    dbMode: parkingStore.useMongo ? 'mongodb' : 'memory',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/parking', createParkingRouter(io));

io.on('connection', async (socket) => {
  try {
    const state = await parkingStore.getDashboardState();
    socket.emit('parking:update', state);
  } catch (err) {
    console.error('Failed to send initial state over Socket.IO:', err.message);
  }
});

async function connectDatabase() {
  try {
    await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 2500 });
    console.log(`Connected to MongoDB at ${MONGO_URI}`);
    return true;
  } catch (err) {
    console.warn(
      `MongoDB unavailable (${err.message}). Starting in In-Memory Demo Mode.`
    );
    return false;
  }
}

async function start() {
  const mongoConnected = await connectDatabase();
  await parkingStore.init(mongoConnected);

  server.listen(PORT, () => {
    console.log(`Smart Parking Backend running on http://localhost:${PORT}`);
  });
}

start();
