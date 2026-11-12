import 'dotenv/config';
import http from 'http';
import express from 'express';
import cors from 'cors';
import { Server } from 'socket.io';
import { resolveDbPath } from './db/database.js';
import { parkingStore } from './store/parkingStore.js';
import { createParkingRouter } from './routes/parkingRoutes.js';

const PORT = process.env.PORT || 5000;
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
    dbMode: 'sqlite',
    dbPath: resolveDbPath(),
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/parking', createParkingRouter(io));

io.on('connection', (socket) => {
  try {
    const state = parkingStore.getDashboardState();
    socket.emit('parking:update', state);
  } catch (err) {
    console.error('Failed to send initial state over Socket.IO:', err.message);
  }
});

function start() {
  parkingStore.init();
  console.log(`SQLite database ready at ${resolveDbPath()}`);

  server.listen(PORT, () => {
    console.log(`Smart Parking Backend running on http://localhost:${PORT}`);
  });
}

start();
