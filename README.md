# Smart Parking Management System (Hybrid IoT Dashboard)

A full-stack **React + Express + Socket.IO + SQLite** web application designed to pair with a **Cisco Packet Tracer** IoT network topology (Approach A — Hybrid Demonstration).

## Architecture

1. **Layer 1 — Cisco Packet Tracer (IoT Network Simulation)**
   - `Router0`, `Switch0`, `Server0`, `Access Point`, `RFID Reader & Card`, `5 Motion Detectors`, and `Entry / Garage Gate`.
2. **Layer 2 — Application Backend (`backend/`)**
   - Node.js + Express REST API + Socket.IO real-time updates + **SQLite (`better-sqlite3`)** with ACID transactions.
3. **Layer 3 — Web Dashboard + Database (`frontend/` + `backend/database/smartparking.db`)**
   - React + Vite + Tailwind CSS dashboard displaying live KPIs, individual slot cards (`P1`–`P5`), vehicle entry/exit history, and Admin Simulation Controls.

## SQLite Database

No external database server is required. On startup, the backend automatically:
- Creates `backend/database/smartparking.db` if it does not exist.
- Applies `backend/database/schema.sql` (`ParkingSlots`, `ParkingRecords`, `ParkingEvents`, `Gates`, `RegisteredVehicles`, `SystemState`).
- Seeds the 5 parking slots (`P1`–`P5`), `GATE-ENTRY`, and authorized RFID cards (`RFID-101`–`RFID-105`, `RFID-ADMIN`).

You can also initialize the database manually with:
```bash
cd backend
npm run db:init
```

## Quick Start

### Option A: Run both servers from the root
```bash
npm run install:all
npm run dev
```

### Option B: Run Backend and Frontend separately

#### 1. Start the Backend
```bash
cd backend
npm install
npm run dev
```

#### 2. Start the Frontend
```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

## API Endpoints

- `GET /api/health` — Backend health, SQLite mode, and database file path
- `GET /api/parking/status` — Full dashboard state (KPIs, slots `P1`–`P5`, history)
- `GET /api/parking/history` — Vehicle entry/exit records
- `POST /api/parking/rfid-scan` — `{ rfidTag, vehicleId }` (Authorized: `RFID-101`..`RFID-105`, `RFID-ADMIN`)
- `POST /api/parking/gate` — `{ status: "OPEN" | "CLOSED" }`
- `POST /api/parking/entry` — `{ slotId?, vehicleId?, rfidTag? }` (transactional)
- `POST /api/parking/exit` — `{ slotId }` (transactional)
- `POST /api/parking/fill-demo` — Fill all 5 slots (100% occupancy demo)
- `POST /api/parking/reset` — Reset all slots to vacant and clear history
