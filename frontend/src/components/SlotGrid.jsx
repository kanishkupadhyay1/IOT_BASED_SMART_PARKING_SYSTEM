import { useEffect, useState } from 'react';
import { CarFront, LogIn, LogOut, Radio } from 'lucide-react';

function formatElapsed(isoString, nowMs) {
  if (!isoString) return '—';
  const diffSec = Math.max(0, Math.floor((nowMs - new Date(isoString).getTime()) / 1000));
  const mins = Math.floor(diffSec / 60);
  const secs = diffSec % 60;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

export default function SlotGrid({ slots = [], onQuickPark, onExitSlot, busy }) {
  const [nowMs, setNowMs] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="bg-slate-900 border border-slate-800 rounded-xl p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Live Parking Slots (P1–P5)</h2>
          <p className="text-xs text-slate-400">
            Mirrors Packet Tracer Motion Detectors 1–5 (Green = Vacant / LOW, Red = Occupied / HIGH)
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5 text-emerald-400">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> Vacant
          </span>
          <span className="flex items-center gap-1.5 text-rose-400">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Occupied
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {slots.map((slot) => {
          const isOccupied = slot.status === 'occupied';

          return (
            <div
              key={slot.slotId}
              className={`rounded-xl border p-4 transition-all flex flex-col justify-between ${
                isOccupied
                  ? 'bg-rose-950/35 border-rose-500/50 shadow-lg shadow-rose-950/20'
                  : 'bg-emerald-950/25 border-emerald-500/40 shadow-lg shadow-emerald-950/10'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xl font-bold text-white">{slot.slotId}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide ${
                      isOccupied
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    }`}
                  >
                    {isOccupied ? 'Occupied' : 'Vacant'}
                  </span>
                </div>

                <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-400">
                  <Radio className={`w-3.5 h-3.5 ${isOccupied ? 'text-rose-400' : 'text-emerald-400'}`} />
                  <span>{slot.sensorId}:</span>
                  <span className="font-mono font-semibold text-slate-200">{slot.sensorState}</span>
                </div>

                <div className="my-4 flex items-center justify-center py-3 rounded-lg bg-slate-950/50 border border-slate-800/80">
                  <CarFront
                    className={`w-10 h-10 ${isOccupied ? 'text-rose-400' : 'text-emerald-500/35'}`}
                  />
                </div>

                {isOccupied ? (
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Vehicle:</span>
                      <span className="font-mono font-semibold text-white">{slot.vehicleId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">RFID:</span>
                      <span className="font-mono text-slate-200">{slot.rfidTag}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Elapsed:</span>
                      <span className="font-mono text-amber-300">
                        {formatElapsed(slot.occupiedSince, nowMs)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 text-center py-3">
                    Slot ready for incoming vehicle
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/70">
                {isOccupied ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onExitSlot(slot.slotId)}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white transition"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Exit Vehicle
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onQuickPark(slot.slotId)}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white transition"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    Park in {slot.slotId}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
