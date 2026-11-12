import { History } from 'lucide-react';

function formatTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export default function HistoryTable({ history = [] }) {
  return (
    <section className="bg-slate-900 border border-slate-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-sky-400" />
          <div>
            <h2 className="text-lg font-semibold text-white">Vehicle Entry &amp; Exit History</h2>
            <p className="text-xs text-slate-400">
              Live database log of all vehicle arrivals, departures, and durations
            </p>
          </div>
        </div>
        <span className="text-xs text-slate-400">{history.length} records</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 text-[11px] uppercase tracking-wider text-slate-400">
              <th className="py-2.5 px-3">Vehicle ID</th>
              <th className="py-2.5 px-3">RFID Tag</th>
              <th className="py-2.5 px-3">Slot ID</th>
              <th className="py-2.5 px-3">Entry Time</th>
              <th className="py-2.5 px-3">Exit Time</th>
              <th className="py-2.5 px-3">Duration</th>
              <th className="py-2.5 px-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/70 text-xs">
            {history.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-500">
                  No parking records yet. Scan an RFID card or park a vehicle to record an entry.
                </td>
              </tr>
            ) : (
              history.map((rec) => (
                <tr key={rec._id} className="hover:bg-slate-800/30 transition">
                  <td className="py-2.5 px-3 font-mono font-semibold text-white">
                    {rec.vehicleId}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-300">{rec.rfidTag}</td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-sky-300 font-semibold">
                      {rec.slotId}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-300">
                    {formatTime(rec.entryTime)}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-300">
                    {formatTime(rec.exitTime)}
                  </td>
                  <td className="py-2.5 px-3 font-mono text-amber-300">
                    {rec.durationFormatted || 'Active'}
                  </td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                        rec.status === 'PARKED'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      }`}
                    >
                      {rec.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
