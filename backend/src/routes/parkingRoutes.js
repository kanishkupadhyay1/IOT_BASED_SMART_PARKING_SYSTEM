import express from 'express';
import { parkingStore } from '../store/parkingStore.js';

export function createParkingRouter(io) {
  const router = express.Router();

  const broadcastState = (state) => {
    io.emit('parking:update', state);
  };

  router.get('/status', async (_req, res) => {
    try {
      const state = await parkingStore.getDashboardState();
      res.json(state);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/history', async (_req, res) => {
    try {
      const history = await parkingStore.getHistory(100);
      res.json({ history });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/rfid-scan', async (req, res) => {
    try {
      const { rfidTag, vehicleId } = req.body;
      const result = await parkingStore.scanRfid({ rfidTag, vehicleId });
      broadcastState(result.state);
      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  router.post('/gate', async (req, res) => {
    try {
      const { status } = req.body;
      const state = await parkingStore.setGateStatus(status);
      broadcastState(state);
      res.json({ state });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  router.post('/entry', async (req, res) => {
    try {
      const { slotId, vehicleId, rfidTag } = req.body;
      const state = await parkingStore.processEntry({ slotId, vehicleId, rfidTag });
      broadcastState(state);
      res.status(201).json({ state });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  router.post('/exit', async (req, res) => {
    try {
      const { slotId } = req.body;
      const state = await parkingStore.processExit({ slotId });
      broadcastState(state);
      res.json({ state });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  router.post('/reset', async (_req, res) => {
    try {
      const state = await parkingStore.resetAll();
      broadcastState(state);
      res.json({ state });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/fill-demo', async (_req, res) => {
    try {
      const state = await parkingStore.fillAllDemo();
      broadcastState(state);
      res.json({ state });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
}
