# Smart Parking Management System (Hybrid IoT Dashboard)

A full-stack **MERN + Socket.IO** web application designed to pair with a **Cisco Packet Tracer** IoT network topology (Approach A — Hybrid Demonstration).

## Architecture

1. **Layer 1 — Cisco Packet Tracer (IoT Network Simulation)**
   - `Router0`, `Switch0`, `Server0`, `Access Point`, `RFID Reader & Card`, `5 Motion Detectors`, and `Entry / Garage Gate`.
2. **Layer 2 — Application Backend (`backend/`)**
   - Node.js + Express REST API + Socket.IO real-time updates + Mongoose (with automatic In-Memory Demo Mode fallback if MongoDB is not running).
3. **Layer 3 — Web Dashboard + Database (`frontend/` + MongoDB)**
   - React + Vite + Tailwind CSS dashboard displaying live KPIs, individual slot cards (`P1`–`P5`), vehicle entry/exit history, and Admin Simulation Controls.

## Quick Start

### 1. Start the Backend
```bash
cd backend
npm install
npm run dev
```
By default, it connects to `MONGO_URI=mongodb://127.0.0.1:27017/smart_parking` (configured in `backend/.env`). If MongoDB is not running locally, it automatically starts in **In-Memory Demo Mode** so you can still run and demonstrate the full application. To use MongoDB Atlas or a local MongoDB instance, update `MONGO_URI` in `backend/.env`.

### 2. Start the Frontend
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

## API Endpoints

- `GET /api/health` — Backend and database mode (`mongodb` or `memory`)
- `GET /api/parking/status` — Full dashboard state (KPIs, slots `P1`–`P5`, history)
- `GET /api/parking/history` — Vehicle entry/exit records
- `POST /api/parking/rfid-scan` — `{ rfidTag, vehicleId }` (Authorized: `RFID-101`..`RFID-105`, `RFID-ADMIN`)
- `POST /api/parking/gate` — `{ status: "OPEN" | "CLOSED" }`
- `POST /api/parking/entry` — `{ slotId?, vehicleId?, rfidTag? }`
- `POST /api/parking/exit` — `{ slotId }`
- `POST /api/parking/fill-demo` — Fill all 5 slots (100% occupancy demo)
- `POST /api/parking/reset` — Reset all slots to vacant and clear history
