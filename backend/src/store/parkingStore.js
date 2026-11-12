import { ParkingSlot } from '../models/ParkingSlot.js';
import { ParkingRecord } from '../models/ParkingRecord.js';

const INITIAL_SLOTS = [
  { slotId: 'P1', sensorId: 'Motion Detector 1' },
  { slotId: 'P2', sensorId: 'Motion Detector 2' },
  { slotId: 'P3', sensorId: 'Motion Detector 3' },
  { slotId: 'P4', sensorId: 'Motion Detector 4' },
  { slotId: 'P5', sensorId: 'Motion Detector 5' },
];

const AUTHORIZED_RFIDS = new Set([
  'RFID-101',
  'RFID-102',
  'RFID-103',
  'RFID-104',
  'RFID-105',
  'RFID-ADMIN',
]);

export function formatDuration(seconds) {
  if (seconds == null || seconds < 0) return '0s';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

class ParkingStore {
  constructor() {
    this.useMongo = false;
    this.gateStatus = 'CLOSED';
    this.rfidStatus = 'IDLE';
    this.lastRfidTag = null;
    this.lastEvent = {
      type: 'SYSTEM_READY',
      message: 'Smart Parking Management System initialized',
      timestamp: new Date().toISOString(),
    };
    this.memorySlots = INITIAL_SLOTS.map((s) => ({
      ...s,
      status: 'vacant',
      sensorState: 'LOW',
      vehicleId: null,
      rfidTag: null,
      occupiedSince: null,
    }));
    this.memoryRecords = [];
    this.recordCounter = 1;
  }

  async init(useMongo) {
    this.useMongo = Boolean(useMongo);
    if (this.useMongo) {
      for (const slot of INITIAL_SLOTS) {
        await ParkingSlot.updateOne(
          { slotId: slot.slotId },
          { $setOnInsert: { ...slot, status: 'vacant', sensorState: 'LOW' } },
          { upsert: true }
        );
      }
    }
  }

  recordEvent(type, message) {
    this.lastEvent = {
      type,
      message,
      timestamp: new Date().toISOString(),
    };
    return this.lastEvent;
  }

  async getSlots() {
    if (this.useMongo) {
      const docs = await ParkingSlot.find().sort({ slotId: 1 }).lean();
      return docs;
    }
    return this.memorySlots.map((s) => ({ ...s }));
  }

  async getHistory(limit = 50) {
    if (this.useMongo) {
      return ParkingRecord.find().sort({ entryTime: -1 }).limit(limit).lean();
    }
    return [...this.memoryRecords]
      .sort((a, b) => new Date(b.entryTime) - new Date(a.entryTime))
      .slice(0, limit);
  }

  async getDashboardState() {
    const slots = await this.getSlots();
    const history = await this.getHistory(50);
    const totalCapacity = slots.length;
    const occupiedSlots = slots.filter((s) => s.status === 'occupied').length;
    const availableSlots = totalCapacity - occupiedSlots;
    const occupancyRate = totalCapacity > 0 ? Math.round((occupiedSlots / totalCapacity) * 100) : 0;

    return {
      totalCapacity,
      occupiedSlots,
      availableSlots,
      occupancyRate,
      gateStatus: this.gateStatus,
      rfidStatus: this.rfidStatus,
      lastRfidTag: this.lastRfidTag,
      lastEvent: this.lastEvent,
      dbMode: this.useMongo ? 'mongodb' : 'memory',
      slots,
      history,
    };
  }

  isAuthorizedRfid(rfidTag) {
    if (!rfidTag) return false;
    const normalized = String(rfidTag).trim().toUpperCase();
    return AUTHORIZED_RFIDS.has(normalized);
  }

  async scanRfid({ rfidTag, vehicleId }) {
    const tag = String(rfidTag || '').trim().toUpperCase();
    if (!tag) {
      throw new Error('RFID tag is required');
    }

    this.lastRfidTag = tag;
    const authorized = this.isAuthorizedRfid(tag);

    if (!authorized) {
      this.rfidStatus = 'UNAUTHORIZED';
      this.gateStatus = 'CLOSED';
      this.recordEvent(
        'RFID_UNAUTHORIZED',
        `Unauthorized RFID card (${tag}) detected. Entry gate remains CLOSED.`
      );
      return {
        authorized: false,
        state: await this.getDashboardState(),
      };
    }

    const slots = await this.getSlots();
    const available = slots.find((s) => s.status === 'vacant');
    if (!available) {
      this.rfidStatus = 'AUTHORIZED';
      this.gateStatus = 'CLOSED';
      this.recordEvent(
        'PARKING_FULL',
        `Authorized RFID (${tag}) scanned, but all 5 slots are occupied (100% full).`
      );
      return {
        authorized: true,
        parkingFull: true,
        state: await this.getDashboardState(),
      };
    }

    this.rfidStatus = 'AUTHORIZED';
    this.gateStatus = 'OPEN';
    const vehLabel = vehicleId ? ` for vehicle ${vehicleId}` : '';
    this.recordEvent(
      'RFID_AUTHORIZED',
      `RFID (${tag}) authorized${vehLabel}. Entry gate OPENED.`
    );

    return {
      authorized: true,
      parkingFull: false,
      suggestedSlot: available.slotId,
      state: await this.getDashboardState(),
    };
  }

  async setGateStatus(status) {
    const normalized = String(status || '').toUpperCase();
    if (normalized !== 'OPEN' && normalized !== 'CLOSED') {
      throw new Error('Gate status must be OPEN or CLOSED');
    }
    this.gateStatus = normalized;
    this.recordEvent(
      `GATE_${normalized}`,
      `Entry gate manually set to ${normalized}.`
    );
    return this.getDashboardState();
  }

  async processEntry({ slotId, vehicleId, rfidTag }) {
    const cleanVehicleId = String(vehicleId || '').trim().toUpperCase() || `VEH-${Math.floor(1000 + Math.random() * 9000)}`;
    const cleanRfid = String(rfidTag || this.lastRfidTag || 'RFID-101').trim().toUpperCase();

    const slots = await this.getSlots();
    let targetSlot;

    if (slotId) {
      targetSlot = slots.find((s) => s.slotId === String(slotId).toUpperCase());
      if (!targetSlot) {
        throw new Error(`Invalid slotId: ${slotId}`);
      }
      if (targetSlot.status === 'occupied') {
        throw new Error(`Slot ${targetSlot.slotId} is already occupied`);
      }
    } else {
      targetSlot = slots.find((s) => s.status === 'vacant');
      if (!targetSlot) {
        throw new Error('All 5 parking slots are occupied');
      }
    }

    const now = new Date();

    if (this.useMongo) {
      await ParkingSlot.updateOne(
        { slotId: targetSlot.slotId },
        {
          $set: {
            status: 'occupied',
            sensorState: 'HIGH',
            vehicleId: cleanVehicleId,
            rfidTag: cleanRfid,
            occupiedSince: now,
          },
        }
      );
      await ParkingRecord.create({
        vehicleId: cleanVehicleId,
        rfidTag: cleanRfid,
        slotId: targetSlot.slotId,
        entryTime: now,
        status: 'PARKED',
        durationFormatted: 'Active',
      });
    } else {
      const memSlot = this.memorySlots.find((s) => s.slotId === targetSlot.slotId);
      memSlot.status = 'occupied';
      memSlot.sensorState = 'HIGH';
      memSlot.vehicleId = cleanVehicleId;
      memSlot.rfidTag = cleanRfid;
      memSlot.occupiedSince = now.toISOString();

      this.memoryRecords.push({
        _id: `rec-${this.recordCounter++}`,
        vehicleId: cleanVehicleId,
        rfidTag: cleanRfid,
        slotId: targetSlot.slotId,
        entryTime: now.toISOString(),
        exitTime: null,
        durationSeconds: null,
        durationFormatted: 'Active',
        status: 'PARKED',
      });
    }

    this.rfidStatus = 'AUTHORIZED';
    this.lastRfidTag = cleanRfid;
    this.gateStatus = 'CLOSED';
    this.recordEvent(
      'VEHICLE_ENTRY',
      `Vehicle ${cleanVehicleId} parked in ${targetSlot.slotId} (${targetSlot.sensorId}: HIGH). Gate closed.`
    );

    return this.getDashboardState();
  }

  async processExit({ slotId }) {
    const normalizedSlot = String(slotId || '').toUpperCase();
    const slots = await this.getSlots();
    const targetSlot = slots.find((s) => s.slotId === normalizedSlot);

    if (!targetSlot) {
      throw new Error(`Invalid slotId: ${slotId}`);
    }
    if (targetSlot.status === 'vacant') {
      throw new Error(`Slot ${normalizedSlot} is already vacant`);
    }

    const exitingVehicleId = targetSlot.vehicleId;
    const now = new Date();

    if (this.useMongo) {
      const activeRecord = await ParkingRecord.findOne({
        slotId: normalizedSlot,
        status: 'PARKED',
      }).sort({ entryTime: -1 });

      if (activeRecord) {
        const durationSeconds = Math.max(
          1,
          Math.floor((now.getTime() - new Date(activeRecord.entryTime).getTime()) / 1000)
        );
        activeRecord.exitTime = now;
        activeRecord.durationSeconds = durationSeconds;
        activeRecord.durationFormatted = formatDuration(durationSeconds);
        activeRecord.status = 'EXITED';
        await activeRecord.save();
      }

      await ParkingSlot.updateOne(
        { slotId: normalizedSlot },
        {
          $set: {
            status: 'vacant',
            sensorState: 'LOW',
            vehicleId: null,
            rfidTag: null,
            occupiedSince: null,
          },
        }
      );
    } else {
      const activeRecord = [...this.memoryRecords]
        .reverse()
        .find((r) => r.slotId === normalizedSlot && r.status === 'PARKED');

      if (activeRecord) {
        const durationSeconds = Math.max(
          1,
          Math.floor((now.getTime() - new Date(activeRecord.entryTime).getTime()) / 1000)
        );
        activeRecord.exitTime = now.toISOString();
        activeRecord.durationSeconds = durationSeconds;
        activeRecord.durationFormatted = formatDuration(durationSeconds);
        activeRecord.status = 'EXITED';
      }

      const memSlot = this.memorySlots.find((s) => s.slotId === normalizedSlot);
      memSlot.status = 'vacant';
      memSlot.sensorState = 'LOW';
      memSlot.vehicleId = null;
      memSlot.rfidTag = null;
      memSlot.occupiedSince = null;
    }

    this.recordEvent(
      'VEHICLE_EXIT',
      `Vehicle ${exitingVehicleId} exited ${normalizedSlot} (${targetSlot.sensorId}: LOW).`
    );

    return this.getDashboardState();
  }

  async resetAll() {
    if (this.useMongo) {
      await ParkingSlot.updateMany(
        {},
        {
          $set: {
            status: 'vacant',
            sensorState: 'LOW',
            vehicleId: null,
            rfidTag: null,
            occupiedSince: null,
          },
        }
      );
      await ParkingRecord.deleteMany({});
    } else {
      this.memorySlots = INITIAL_SLOTS.map((s) => ({
        ...s,
        status: 'vacant',
        sensorState: 'LOW',
        vehicleId: null,
        rfidTag: null,
        occupiedSince: null,
      }));
      this.memoryRecords = [];
    }

    this.gateStatus = 'CLOSED';
    this.rfidStatus = 'IDLE';
    this.lastRfidTag = null;
    this.recordEvent('SYSTEM_RESET', 'All 5 parking slots reset to vacant and history cleared.');

    return this.getDashboardState();
  }

  async fillAllDemo() {
    const slots = await this.getSlots();
    const demoVehicles = ['KA-01-AB-1024', 'KA-02-CD-2048', 'KA-03-EF-3072', 'KA-04-GH-4096', 'KA-05-IJ-5120'];
    const demoRfids = ['RFID-101', 'RFID-102', 'RFID-103', 'RFID-104', 'RFID-105'];

    for (let i = 0; i < slots.length; i++) {
      if (slots[i].status === 'vacant') {
        await this.processEntry({
          slotId: slots[i].slotId,
          vehicleId: demoVehicles[i],
          rfidTag: demoRfids[i],
        });
      }
    }

    this.recordEvent('PARKING_FULL', 'Demo preset applied: All 5 slots occupied (100% capacity).');
    return this.getDashboardState();
  }
}

export const parkingStore = new ParkingStore();
