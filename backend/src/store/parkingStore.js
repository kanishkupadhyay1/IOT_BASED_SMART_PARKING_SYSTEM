import { getDb, initDatabase } from '../db/database.js';

export function formatDuration(seconds) {
  if (seconds == null || seconds < 0) return '0s';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

function mapSlotRow(row) {
  return {
    slotId: row.slot_id,
    sensorId: row.sensor_id,
    status: row.status,
    sensorState: row.sensor_state,
    vehicleId: row.vehicle_id,
    rfidTag: row.rfid_card_id,
    occupiedSince: row.entry_time,
    lastUpdated: row.last_updated,
  };
}

function mapRecordRow(row) {
  return {
    _id: `rec-${row.record_id}`,
    recordId: row.record_id,
    vehicleId: row.vehicle_id,
    rfidTag: row.rfid_card_id,
    slotId: row.slot_id,
    entryTime: row.entry_time,
    exitTime: row.exit_time,
    durationMinutes: row.duration_minutes,
    durationFormatted: row.duration_formatted,
    status: row.status,
  };
}

class ParkingStore {
  init() {
    initDatabase();
  }

  getStateValue(db, key, fallback = null) {
    const row = db.prepare('SELECT value FROM SystemState WHERE key = ?').get(key);
    return row ? row.value : fallback;
  }

  setStateValue(db, key, value) {
    db.prepare(`
      INSERT INTO SystemState (key, value) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `).run(key, value ?? '');
  }

  insertEvent(db, { eventType, vehicleId = null, slotId = null, description, timestamp }) {
    db.prepare(`
      INSERT INTO ParkingEvents (event_type, vehicle_id, slot_id, description, timestamp)
      VALUES (?, ?, ?, ?, ?)
    `).run(eventType, vehicleId, slotId, description, timestamp || new Date().toISOString());
  }

  getSlots() {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM ParkingSlots ORDER BY slot_id ASC').all();
    return rows.map(mapSlotRow);
  }

  getHistory(limit = 50) {
    const db = getDb();
    const rows = db
      .prepare('SELECT * FROM ParkingRecords ORDER BY entry_time DESC, record_id DESC LIMIT ?')
      .all(limit);
    return rows.map(mapRecordRow);
  }

  getDashboardState() {
    const db = getDb();
    const slots = this.getSlots();
    const history = this.getHistory(50);

    const totalCapacity = slots.length;
    const occupiedSlots = slots.filter((s) => s.status === 'occupied').length;
    const availableSlots = totalCapacity - occupiedSlots;
    const occupancyRate = totalCapacity > 0 ? Math.round((occupiedSlots / totalCapacity) * 100) : 0;

    const gateRow = db.prepare("SELECT status FROM Gates WHERE gate_id = 'GATE-ENTRY'").get();
    const gateStatus = gateRow ? gateRow.status : 'CLOSED';
    const rfidStatus = this.getStateValue(db, 'rfid_status', 'IDLE') || 'IDLE';
    const lastRfidRaw = this.getStateValue(db, 'last_rfid_tag', '');
    const lastRfidTag = lastRfidRaw || null;

    const eventRow = db
      .prepare('SELECT event_type, description, timestamp FROM ParkingEvents ORDER BY event_id DESC LIMIT 1')
      .get();

    const lastEvent = eventRow
      ? {
          type: eventRow.event_type,
          message: eventRow.description,
          timestamp: eventRow.timestamp,
        }
      : null;

    return {
      totalCapacity,
      occupiedSlots,
      availableSlots,
      occupancyRate,
      gateStatus,
      rfidStatus,
      lastRfidTag,
      lastEvent,
      dbMode: 'sqlite',
      slots,
      history,
    };
  }

  isAuthorizedRfid(rfidTag) {
    if (!rfidTag) return false;
    const db = getDb();
    const normalized = String(rfidTag).trim().toUpperCase();
    const row = db
      .prepare('SELECT authorized FROM RegisteredVehicles WHERE rfid_card_id = ?')
      .get(normalized);
    return Boolean(row && row.authorized === 1);
  }

  scanRfid({ rfidTag, vehicleId }) {
    const tag = String(rfidTag || '').trim().toUpperCase();
    if (!tag) {
      throw new Error('RFID tag is required');
    }

    const db = getDb();
    const cleanVehicle = vehicleId ? String(vehicleId).trim().toUpperCase() : null;

    const txResult = db.transaction(() => {
      const now = new Date().toISOString();
      this.setStateValue(db, 'last_rfid_tag', tag);

      const registered = db
        .prepare('SELECT authorized FROM RegisteredVehicles WHERE rfid_card_id = ?')
        .get(tag);
      const authorized = Boolean(registered && registered.authorized === 1);

      if (!authorized) {
        this.setStateValue(db, 'rfid_status', 'UNAUTHORIZED');
        db.prepare("UPDATE Gates SET status = 'CLOSED', last_updated = ? WHERE gate_id = 'GATE-ENTRY'").run(now);
        this.insertEvent(db, {
          eventType: 'RFID_UNAUTHORIZED',
          vehicleId: cleanVehicle,
          description: `Unauthorized RFID card (${tag}) detected. Entry gate remains CLOSED.`,
          timestamp: now,
        });
        return { authorized: false };
      }

      const available = db
        .prepare("SELECT slot_id FROM ParkingSlots WHERE status = 'vacant' ORDER BY slot_id ASC LIMIT 1")
        .get();

      if (!available) {
        this.setStateValue(db, 'rfid_status', 'AUTHORIZED');
        db.prepare("UPDATE Gates SET status = 'CLOSED', last_updated = ? WHERE gate_id = 'GATE-ENTRY'").run(now);
        this.insertEvent(db, {
          eventType: 'PARKING_FULL',
          vehicleId: cleanVehicle,
          description: `Authorized RFID (${tag}) scanned, but all 5 slots are occupied (100% full).`,
          timestamp: now,
        });
        return { authorized: true, parkingFull: true };
      }

      this.setStateValue(db, 'rfid_status', 'AUTHORIZED');
      db.prepare("UPDATE Gates SET status = 'OPEN', last_updated = ? WHERE gate_id = 'GATE-ENTRY'").run(now);
      const vehLabel = cleanVehicle ? ` for vehicle ${cleanVehicle}` : '';
      this.insertEvent(db, {
        eventType: 'RFID_AUTHORIZED',
        vehicleId: cleanVehicle,
        description: `RFID (${tag}) authorized${vehLabel}. Entry gate OPENED.`,
        timestamp: now,
      });

      return {
        authorized: true,
        parkingFull: false,
        suggestedSlot: available.slot_id,
      };
    })();

    return {
      ...txResult,
      state: this.getDashboardState(),
    };
  }

  setGateStatus(status) {
    const normalized = String(status || '').toUpperCase();
    if (normalized !== 'OPEN' && normalized !== 'CLOSED') {
      throw new Error('Gate status must be OPEN or CLOSED');
    }

    const db = getDb();
    db.transaction(() => {
      const now = new Date().toISOString();
      db.prepare("UPDATE Gates SET status = ?, last_updated = ? WHERE gate_id = 'GATE-ENTRY'").run(
        normalized,
        now
      );
      this.insertEvent(db, {
        eventType: `GATE_${normalized}`,
        description: `Entry gate manually set to ${normalized}.`,
        timestamp: now,
      });
    })();

    return this.getDashboardState();
  }

  processEntry({ slotId, vehicleId, rfidTag }) {
    const db = getDb();
    const lastRfid = this.getStateValue(db, 'last_rfid_tag', '') || 'RFID-101';
    const cleanVehicleId =
      String(vehicleId || '').trim().toUpperCase() ||
      `VEH-${Math.floor(1000 + Math.random() * 9000)}`;
    const cleanRfid = String(rfidTag || lastRfid).trim().toUpperCase();

    db.transaction(() => {
      const now = new Date().toISOString();

      // Prevent parking the same vehicle twice
      const activeVehicle = db
        .prepare("SELECT slot_id FROM ParkingRecords WHERE vehicle_id = ? AND status = 'PARKED' LIMIT 1")
        .get(cleanVehicleId);
      if (activeVehicle) {
        throw new Error(`Vehicle ${cleanVehicleId} is already parked in ${activeVehicle.slot_id}`);
      }

      let targetSlot;
      if (slotId) {
        const normalizedSlot = String(slotId).trim().toUpperCase();
        targetSlot = db
          .prepare('SELECT * FROM ParkingSlots WHERE slot_id = ?')
          .get(normalizedSlot);
        if (!targetSlot) {
          throw new Error(`Invalid slotId: ${slotId}`);
        }
        if (targetSlot.status === 'occupied') {
          throw new Error(`Slot ${targetSlot.slot_id} is already occupied`);
        }
      } else {
        targetSlot = db
          .prepare("SELECT * FROM ParkingSlots WHERE status = 'vacant' ORDER BY slot_id ASC LIMIT 1")
          .get();
        if (!targetSlot) {
          throw new Error('All 5 parking slots are occupied');
        }
      }

      // Guard against duplicate active slot records
      const activeSlotRecord = db
        .prepare("SELECT record_id FROM ParkingRecords WHERE slot_id = ? AND status = 'PARKED' LIMIT 1")
        .get(targetSlot.slot_id);
      if (activeSlotRecord) {
        throw new Error(`Slot ${targetSlot.slot_id} already has an active parking record`);
      }

      db.prepare(`
        UPDATE ParkingSlots
        SET status = 'occupied',
            sensor_state = 'HIGH',
            vehicle_id = ?,
            rfid_card_id = ?,
            entry_time = ?,
            last_updated = ?
        WHERE slot_id = ?
      `).run(cleanVehicleId, cleanRfid, now, now, targetSlot.slot_id);

      db.prepare(`
        INSERT INTO ParkingRecords (
          vehicle_id, rfid_card_id, slot_id, entry_time, duration_formatted, status
        ) VALUES (?, ?, ?, ?, 'Active', 'PARKED')
      `).run(cleanVehicleId, cleanRfid, targetSlot.slot_id, now);

      this.setStateValue(db, 'rfid_status', 'AUTHORIZED');
      this.setStateValue(db, 'last_rfid_tag', cleanRfid);
      db.prepare("UPDATE Gates SET status = 'CLOSED', last_updated = ? WHERE gate_id = 'GATE-ENTRY'").run(now);

      this.insertEvent(db, {
        eventType: 'VEHICLE_ENTRY',
        vehicleId: cleanVehicleId,
        slotId: targetSlot.slot_id,
        description: `Vehicle ${cleanVehicleId} parked in ${targetSlot.slot_id} (${targetSlot.sensor_id}: HIGH). Gate closed.`,
        timestamp: now,
      });
    })();

    return this.getDashboardState();
  }

  processExit({ slotId }) {
    const normalizedSlot = String(slotId || '').trim().toUpperCase();
    const db = getDb();

    db.transaction(() => {
      const targetSlot = db
        .prepare('SELECT * FROM ParkingSlots WHERE slot_id = ?')
        .get(normalizedSlot);

      if (!targetSlot) {
        throw new Error(`Invalid slotId: ${slotId}`);
      }
      if (targetSlot.status === 'vacant') {
        throw new Error(`Slot ${normalizedSlot} is already vacant`);
      }

      const nowDate = new Date();
      const now = nowDate.toISOString();
      const exitingVehicleId = targetSlot.vehicle_id;

      const activeRecord = db
        .prepare(
          "SELECT * FROM ParkingRecords WHERE slot_id = ? AND status = 'PARKED' ORDER BY record_id DESC LIMIT 1"
        )
        .get(normalizedSlot);

      if (activeRecord) {
        const durationSeconds = Math.max(
          1,
          Math.floor((nowDate.getTime() - new Date(activeRecord.entry_time).getTime()) / 1000)
        );
        const durationMinutes = Math.round((durationSeconds / 60) * 100) / 100;
        const durationFormatted = formatDuration(durationSeconds);

        db.prepare(`
          UPDATE ParkingRecords
          SET exit_time = ?,
              duration_minutes = ?,
              duration_formatted = ?,
              status = 'EXITED'
          WHERE record_id = ?
        `).run(now, durationMinutes, durationFormatted, activeRecord.record_id);
      }

      db.prepare(`
        UPDATE ParkingSlots
        SET status = 'vacant',
            sensor_state = 'LOW',
            vehicle_id = NULL,
            rfid_card_id = NULL,
            entry_time = NULL,
            last_updated = ?
        WHERE slot_id = ?
      `).run(now, normalizedSlot);

      this.insertEvent(db, {
        eventType: 'VEHICLE_EXIT',
        vehicleId: exitingVehicleId,
        slotId: normalizedSlot,
        description: `Vehicle ${exitingVehicleId} exited ${normalizedSlot} (${targetSlot.sensor_id}: LOW).`,
        timestamp: now,
      });
    })();

    return this.getDashboardState();
  }

  resetAll() {
    const db = getDb();

    db.transaction(() => {
      const now = new Date().toISOString();
      db.prepare(`
        UPDATE ParkingSlots
        SET status = 'vacant',
            sensor_state = 'LOW',
            vehicle_id = NULL,
            rfid_card_id = NULL,
            entry_time = NULL,
            last_updated = ?
      `).run(now);

      db.prepare('DELETE FROM ParkingRecords').run();
      db.prepare("UPDATE Gates SET status = 'CLOSED', last_updated = ? WHERE gate_id = 'GATE-ENTRY'").run(now);
      this.setStateValue(db, 'rfid_status', 'IDLE');
      this.setStateValue(db, 'last_rfid_tag', '');

      this.insertEvent(db, {
        eventType: 'SYSTEM_RESET',
        description: 'All 5 parking slots reset to vacant and history cleared.',
        timestamp: now,
      });
    })();

    return this.getDashboardState();
  }

  fillAllDemo() {
    const db = getDb();
    const demoVehicles = [
      { slotId: 'P1', vehicleId: 'KA-01-AB-1024', rfidTag: 'RFID-101' },
      { slotId: 'P2', vehicleId: 'KA-02-CD-2048', rfidTag: 'RFID-102' },
      { slotId: 'P3', vehicleId: 'KA-03-EF-3072', rfidTag: 'RFID-103' },
      { slotId: 'P4', vehicleId: 'KA-04-GH-4096', rfidTag: 'RFID-104' },
      { slotId: 'P5', vehicleId: 'KA-05-IJ-5120', rfidTag: 'RFID-105' },
    ];

    db.transaction(() => {
      const now = new Date().toISOString();

      for (const item of demoVehicles) {
        const slot = db
          .prepare('SELECT * FROM ParkingSlots WHERE slot_id = ?')
          .get(item.slotId);
        if (slot && slot.status === 'vacant') {
          let vehId = item.vehicleId;
          const alreadyParked = db
            .prepare("SELECT 1 FROM ParkingRecords WHERE vehicle_id = ? AND status = 'PARKED'")
            .get(vehId);
          if (alreadyParked) {
            vehId = `DEMO-${item.slotId}-${Math.floor(100 + Math.random() * 900)}`;
          }

          db.prepare(`
            UPDATE ParkingSlots
            SET status = 'occupied',
                sensor_state = 'HIGH',
                vehicle_id = ?,
                rfid_card_id = ?,
                entry_time = ?,
                last_updated = ?
            WHERE slot_id = ?
          `).run(vehId, item.rfidTag, now, now, item.slotId);

          db.prepare(`
            INSERT INTO ParkingRecords (
              vehicle_id, rfid_card_id, slot_id, entry_time, duration_formatted, status
            ) VALUES (?, ?, ?, ?, 'Active', 'PARKED')
          `).run(vehId, item.rfidTag, item.slotId, now);
        }
      }

      this.setStateValue(db, 'rfid_status', 'AUTHORIZED');
      this.setStateValue(db, 'last_rfid_tag', 'RFID-105');
      db.prepare("UPDATE Gates SET status = 'CLOSED', last_updated = ? WHERE gate_id = 'GATE-ENTRY'").run(now);

      this.insertEvent(db, {
        eventType: 'PARKING_FULL',
        description: 'Demo preset applied: All 5 slots occupied (100% capacity).',
        timestamp: now,
      });
    })();

    return this.getDashboardState();
  }
}

export const parkingStore = new ParkingStore();
