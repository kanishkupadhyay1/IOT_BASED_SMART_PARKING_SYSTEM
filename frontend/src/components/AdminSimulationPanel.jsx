import { useState } from 'react';
import { DoorClosed, DoorOpen, Layers, RotateCcw, ScanLine, ShieldAlert, Sparkles } from 'lucide-react';

export default function AdminSimulationPanel({
  state,
  busy,
  onScanRfid,
  onSetGate,
  onProcessEntry,
  onReset,
  onFillDemo,
}) {
  const [vehicleId, setVehicleId] = useState('KA-01-AB-1234');
  const [rfidTag, setRfidTag] = useState('RFID-101');
  const [selectedSlot, setSelectedSlot] = useState('AUTO');

  const vacantSlots = (state.slots || []).filter((s) => s.status === 'vacant');

  const handleEntry = (e) => {
    e.preventDefault();
    onProcessEntry({
      slotId: selectedSlot === 'AUTO' ? undefined : selectedSlot,
      vehicleId,
      rfidTag,
    });
  };

  return (
    <section className="bg-slate-900 border border-slate-800 rounded-xl p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Admin Simulation Bridge</h2>
          <p className="text-xs text-slate-400">
            Coordinate dashboard events alongside your Cisco Packet Tracer demonstration
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onFillDemo}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-600/20 text-amber-300 border border-amber-500/40 hover:bg-amber-600/30 disabled:opacity-50 transition"
          >
            <Layers className="w-3.5 h-3.5" />
            Fill All 5 (100%)
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onReset}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700 disabled:opacity-50 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset System
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Step 1: RFID Reader Simulation */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-4 space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-sky-400">
            1. RFID Reader Simulation
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">RFID Tag</label>
              <input
                type="text"
                value={rfidTag}
                onChange={(e) => setRfidTag(e.target.value)}
                placeholder="RFID-101"
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-sky-500"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Vehicle ID</label>
              <input
                type="text"
                value={vehicleId}
                onChange={(e) => setVehicleId(e.target.value)}
                placeholder="KA-01-AB-1234"
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => onScanRfid(rfidTag || 'RFID-101', vehicleId)}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white transition"
            >
              <ScanLine className="w-3.5 h-3.5" />
              Scan RFID
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => onScanRfid('RFID-999', vehicleId)}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-rose-600/20 text-rose-300 border border-rose-500/40 hover:bg-rose-600/30 disabled:opacity-50 transition"
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              Unauthorized
            </button>
          </div>
          <p className="text-[11px] text-slate-500">
            Authorized tags: RFID-101 to RFID-105, RFID-ADMIN
          </p>
        </div>

        {/* Step 2: Entry Gate Control */}
        <div className="bg-slate-950/60 border border-slate-800 rounded-lg p-4 space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
            2. Entry / Garage Gate Control
          </div>
          <p className="text-xs text-slate-400">
            Current Gate State:{' '}
            <span className="font-bold text-white">{state.gateStatus}</span>
          </p>
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              disabled={busy || state.gateStatus === 'OPEN'}
              onClick={() => onSetGate('OPEN')}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white transition"
            >
              <DoorOpen className="w-3.5 h-3.5" />
              Open Gate
            </button>
            <button
              type="button"
              disabled={busy || state.gateStatus === 'CLOSED'}
              onClick={() => onSetGate('CLOSED')}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-white transition"
            >
              <DoorClosed className="w-3.5 h-3.5" />
              Close Gate
            </button>
          </div>
          <p className="text-[11px] text-slate-500">
            Matches Packet Tracer Garage Door / Entry Gate actuator
          </p>
        </div>

        {/* Step 3: Motion Detector / Park Vehicle */}
        <form
          onSubmit={handleEntry}
          className="bg-slate-950/60 border border-slate-800 rounded-lg p-4 space-y-3"
        >
          <div className="text-xs font-semibold uppercase tracking-wider text-amber-400">
            3. Trigger Motion Detector (Park)
          </div>
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Target Slot</label>
            <select
              value={selectedSlot}
              onChange={(e) => setSelectedSlot(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white focus:outline-none focus:border-amber-500"
            >
              <option value="AUTO">Auto-Assign Next Vacant Slot</option>
              {vacantSlots.map((s) => (
                <option key={s.slotId} value={s.slotId}>
                  {s.slotId} ({s.sensorId})
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={busy || vacantSlots.length === 0}
            className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white transition"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {vacantSlots.length === 0 ? 'Parking Full (5/5)' : 'Park Vehicle & Trigger Sensor'}
          </button>
          <p className="text-[11px] text-slate-500">
            Sets slot to Occupied (Red), logs entry in DB, and closes gate
          </p>
        </form>
      </div>
    </section>
  );
}
