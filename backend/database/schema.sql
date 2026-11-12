-- Smart Parking Management System SQLite Schema

CREATE TABLE IF NOT EXISTS ParkingSlots (
  slot_id TEXT PRIMARY KEY CHECK (slot_id IN ('P1', 'P2', 'P3', 'P4', 'P5')),
  sensor_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'vacant' CHECK (status IN ('vacant', 'occupied')),
  sensor_state TEXT NOT NULL DEFAULT 'LOW' CHECK (sensor_state IN ('LOW', 'HIGH')),
  vehicle_id TEXT DEFAULT NULL,
  rfid_card_id TEXT DEFAULT NULL,
  entry_time TEXT DEFAULT NULL,
  last_updated TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ParkingRecords (
  record_id INTEGER PRIMARY KEY AUTOINCREMENT,
  vehicle_id TEXT NOT NULL,
  rfid_card_id TEXT NOT NULL DEFAULT 'MANUAL',
  slot_id TEXT NOT NULL REFERENCES ParkingSlots(slot_id),
  entry_time TEXT NOT NULL,
  exit_time TEXT DEFAULT NULL,
  duration_minutes REAL DEFAULT NULL,
  duration_formatted TEXT NOT NULL DEFAULT 'Active',
  status TEXT NOT NULL DEFAULT 'PARKED' CHECK (status IN ('PARKED', 'EXITED'))
);

CREATE TABLE IF NOT EXISTS ParkingEvents (
  event_id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT NOT NULL,
  vehicle_id TEXT DEFAULT NULL,
  slot_id TEXT DEFAULT NULL,
  description TEXT NOT NULL,
  timestamp TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS Gates (
  gate_id TEXT PRIMARY KEY,
  gate_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'CLOSED' CHECK (status IN ('OPEN', 'CLOSED')),
  last_updated TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS RegisteredVehicles (
  vehicle_id TEXT PRIMARY KEY,
  rfid_card_id TEXT NOT NULL UNIQUE,
  vehicle_type TEXT NOT NULL DEFAULT 'Car',
  authorized INTEGER NOT NULL DEFAULT 1 CHECK (authorized IN (0, 1))
);

CREATE TABLE IF NOT EXISTS SystemState (
  key TEXT PRIMARY KEY,
  value TEXT
);

CREATE INDEX IF NOT EXISTS idx_parking_records_slot_status
  ON ParkingRecords(slot_id, status);

CREATE INDEX IF NOT EXISTS idx_parking_records_vehicle_status
  ON ParkingRecords(vehicle_id, status);

CREATE INDEX IF NOT EXISTS idx_parking_records_entry_time
  ON ParkingRecords(entry_time DESC);

CREATE INDEX IF NOT EXISTS idx_parking_events_timestamp
  ON ParkingEvents(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_registered_vehicles_rfid
  ON RegisteredVehicles(rfid_card_id);
