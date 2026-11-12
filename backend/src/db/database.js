import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKEND_ROOT = path.resolve(__dirname, '../..');

const INITIAL_SLOTS = [
  { slot_id: 'P1', sensor_id: 'Motion Detector 1' },
  { slot_id: 'P2', sensor_id: 'Motion Detector 2' },
  { slot_id: 'P3', sensor_id: 'Motion Detector 3' },
  { slot_id: 'P4', sensor_id: 'Motion Detector 4' },
  { slot_id: 'P5', sensor_id: 'Motion Detector 5' },
];

const SEED_VEHICLES = [
  { vehicle_id: 'KA-01-AB-1024', rfid_card_id: 'RFID-101', vehicle_type: 'Sedan', authorized: 1 },
  { vehicle_id: 'KA-02-CD-2048', rfid_card_id: 'RFID-102', vehicle_type: 'SUV', authorized: 1 },
  { vehicle_id: 'KA-03-EF-3072', rfid_card_id: 'RFID-103', vehicle_type: 'Hatchback', authorized: 1 },
  { vehicle_id: 'KA-04-GH-4096', rfid_card_id: 'RFID-104', vehicle_type: 'EV', authorized: 1 },
  { vehicle_id: 'KA-05-IJ-5120', rfid_card_id: 'RFID-105', vehicle_type: 'Sedan', authorized: 1 },
  { vehicle_id: 'ADMIN-001', rfid_card_id: 'RFID-ADMIN', vehicle_type: 'Admin', authorized: 1 },
];

let dbInstance = null;

export function resolveDbPath() {
  const configured = process.env.DB_PATH || './database/smartparking.db';
  return path.isAbsolute(configured)
    ? configured
    : path.resolve(BACKEND_ROOT, configured);
}

export function initDatabase() {
  if (dbInstance) return dbInstance;

  const dbPath = resolveDbPath();
  const dbDir = path.dirname(dbPath);
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  const schemaPath = path.resolve(BACKEND_ROOT, 'database/schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  db.exec(schemaSql);

  const seedTx = db.transaction(() => {
    const now = new Date().toISOString();

    const insertSlot = db.prepare(`
      INSERT OR IGNORE INTO ParkingSlots (
        slot_id, sensor_id, status, sensor_state, vehicle_id, rfid_card_id, entry_time, last_updated
      ) VALUES (?, ?, 'vacant', 'LOW', NULL, NULL, NULL, ?)
    `);
    for (const slot of INITIAL_SLOTS) {
      insertSlot.run(slot.slot_id, slot.sensor_id, now);
    }

    const insertGate = db.prepare(`
      INSERT OR IGNORE INTO Gates (gate_id, gate_type, status, last_updated)
      VALUES (?, ?, ?, ?)
    `);
    insertGate.run('GATE-ENTRY', 'entry', 'CLOSED', now);

    const insertVehicle = db.prepare(`
      INSERT OR IGNORE INTO RegisteredVehicles (vehicle_id, rfid_card_id, vehicle_type, authorized)
      VALUES (?, ?, ?, ?)
    `);
    for (const veh of SEED_VEHICLES) {
      insertVehicle.run(veh.vehicle_id, veh.rfid_card_id, veh.vehicle_type, veh.authorized);
    }

    const insertState = db.prepare(`
      INSERT OR IGNORE INTO SystemState (key, value) VALUES (?, ?)
    `);
    insertState.run('rfid_status', 'IDLE');
    insertState.run('last_rfid_tag', '');

    const eventCount = db.prepare('SELECT COUNT(*) AS count FROM ParkingEvents').get().count;
    if (eventCount === 0) {
      db.prepare(`
        INSERT INTO ParkingEvents (event_type, vehicle_id, slot_id, description, timestamp)
        VALUES ('SYSTEM_READY', NULL, NULL, 'Smart Parking Management System initialized with SQLite', ?)
      `).run(now);
    }
  });

  seedTx();
  dbInstance = db;
  return db;
}

export function getDb() {
  return initDatabase();
}
