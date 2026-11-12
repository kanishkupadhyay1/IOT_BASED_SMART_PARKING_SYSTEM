import { useState } from 'react';
import { ChevronDown, ChevronUp, Network } from 'lucide-react';

const DEMO_STEPS = [
  { action: 'RFID card scanned', pt: 'Show RFID identification', web: 'Show vehicle entry & RFID status' },
  { action: 'Entry gate opens', pt: 'Show IoT gate automation', web: 'Entry Gate badge turns OPEN' },
  { action: 'Vehicle parks in Slot 1', pt: 'Trigger Motion Detector 1', web: 'Slot P1 turns red (HIGH)' },
  { action: 'Vehicle parks in Slot 2', pt: 'Trigger Motion Detector 2', web: 'Slot P2 turns red (HIGH)' },
  { action: 'Vehicle exits', pt: 'Sensor returns to vacant', web: 'Slot becomes green & logs duration' },
  { action: 'All 5 slots occupied', pt: 'Demonstrate parking full', web: 'Display 100% occupancy rate' },
];

export default function PacketTracerGuide() {
  const [open, setOpen] = useState(false);

  return (
    <section className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="w-full px-5 py-3.5 flex items-center justify-between text-left hover:bg-slate-800/40 transition"
      >
        <div className="flex items-center gap-2.5">
          <Network className="w-4 h-4 text-sky-400" />
          <span className="text-sm font-semibold text-white">
            Hybrid Demonstration Guide (Cisco Packet Tracer + Web Dashboard)
          </span>
        </div>
        {open ? (
          <ChevronUp className="w-4 h-4 text-slate-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        )}
      </button>

      {open && (
        <div className="px-5 pb-4 border-t border-slate-800">
          <div className="overflow-x-auto mt-3">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase text-[11px]">
                  <th className="py-2 pr-4">Action</th>
                  <th className="py-2 pr-4">Cisco Packet Tracer (Layer 1)</th>
                  <th className="py-2">Web Dashboard (Layer 2 &amp; 3)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {DEMO_STEPS.map((row) => (
                  <tr key={row.action}>
                    <td className="py-2 pr-4 font-semibold text-white">{row.action}</td>
                    <td className="py-2 pr-4 text-slate-300">{row.pt}</td>
                    <td className="py-2 text-emerald-300">{row.web}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}
