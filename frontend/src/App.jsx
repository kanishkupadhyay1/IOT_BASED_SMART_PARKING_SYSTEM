import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { Activity, Database, Wifi, WifiOff } from 'lucide-react';
import { parkingApi } from './api';
import KpiCards from './components/KpiCards';
import SlotGrid from './components/SlotGrid';
import AdminSimulationPanel from './components/AdminSimulationPanel';
import HistoryTable from './components/HistoryTable';
import PacketTracerGuide from './components/PacketTracerGuide';

const DEFAULT_STATE = {
  totalCapacity: 5,
  occupiedSlots: 0,
  availableSlots: 5,
  occupancyRate: 0,
  gateStatus: 'CLOSED',
  rfidStatus: 'IDLE',
  lastRfidTag: null,
  lastEvent: null,
  dbMode: 'memory',
  slots: [],
  history: [],
};

export default function App() {
  const [state, setState] = useState(DEFAULT_STATE);
  const [connected, setConnected] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    parkingApi
      .getStatus()
      .then((data) => {
        if (mounted) setState(data);
      })
      .catch((err) => {
        if (mounted) setError(err.message);
      });

    const socket = io('/', { transports: ['websocket', 'polling'] });

    socket.on('connect', () => {
      if (mounted) setConnected(true);
    });
    socket.on('disconnect', () => {
      if (mounted) setConnected(false);
    });
    socket.on('parking:update', (nextState) => {
      if (mounted) {
        setState(nextState);
        setError('');
      }
    });

    return () => {
      mounted = false;
      socket.disconnect();
    };
  }, []);

  const runAction = async (fn) => {
    setBusy(true);
    setError('');
    try {
      const res = await fn();
      if (res?.state) {
        setState(res.state);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleQuickPark = (slotId) => {
    const randomVeh = `KA-0${Math.floor(1 + Math.random() * 9)}-SP-${Math.floor(1000 + Math.random() * 9000)}`;
    const slotNum = slotId.replace('P', '10');
    runAction(() =>
      parkingApi.processEntry({
        slotId,
        vehicleId: randomVeh,
        rfidTag: `RFID-${slotNum}`,
      })
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/70 backdrop-blur sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">
              Smart Parking Management System
            </h1>
            <p className="text-xs text-slate-400">
              Hybrid IoT Architecture: Cisco Packet Tracer + Node.js/Express + Socket.IO + MongoDB
            </p>
          </div>

          <div className="flex items-center gap-2.5 text-xs">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium border ${
                connected
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                  : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
              }`}
            >
              {connected ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
              {connected ? 'Socket.IO Live' : 'Disconnected'}
            </span>

            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium bg-slate-800 text-slate-300 border border-slate-700">
              <Database className="w-3.5 h-3.5 text-sky-400" />
              {state.dbMode === 'mongodb' ? 'MongoDB Connected' : 'In-Memory Demo Mode'}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {state.lastEvent && (
          <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
            <div className="flex items-center gap-2 text-slate-200">
              <Activity className="w-4 h-4 text-sky-400 shrink-0" />
              <span className="font-semibold text-sky-300">[{state.lastEvent.type}]</span>
              <span>{state.lastEvent.message}</span>
            </div>
            <span className="text-slate-500 font-mono shrink-0">
              {new Date(state.lastEvent.timestamp).toLocaleTimeString()}
            </span>
          </div>
        )}

        {error && (
          <div className="px-4 py-2.5 rounded-xl bg-rose-950/50 border border-rose-500/50 text-xs text-rose-200">
            {error}
          </div>
        )}

        <KpiCards state={state} />

        <SlotGrid
          slots={state.slots}
          busy={busy}
          onQuickPark={handleQuickPark}
          onExitSlot={(slotId) => runAction(() => parkingApi.processExit(slotId))}
        />

        <AdminSimulationPanel
          state={state}
          busy={busy}
          onScanRfid={(rfidTag, vehicleId) =>
            runAction(() => parkingApi.scanRfid(rfidTag, vehicleId))
          }
          onSetGate={(status) => runAction(() => parkingApi.setGate(status))}
          onProcessEntry={(payload) => runAction(() => parkingApi.processEntry(payload))}
          onReset={() => runAction(() => parkingApi.resetAll())}
          onFillDemo={() => runAction(() => parkingApi.fillDemo())}
        />

        <HistoryTable history={state.history} />

        <PacketTracerGuide />
      </main>
    </div>
  );
}
