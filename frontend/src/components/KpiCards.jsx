import { Car, CheckCircle2, DoorOpen, Gauge, ParkingSquare, ShieldAlert, ShieldCheck } from 'lucide-react';

export default function KpiCards({ state }) {
  const {
    totalCapacity = 5,
    occupiedSlots = 0,
    availableSlots = 5,
    occupancyRate = 0,
    gateStatus = 'CLOSED',
    rfidStatus = 'IDLE',
    lastRfidTag = null,
  } = state;

  const isGateOpen = gateStatus === 'OPEN';
  const isRfidAuth = rfidStatus === 'AUTHORIZED';
  const isRfidUnauth = rfidStatus === 'UNAUTHORIZED';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <div className="flex items-center justify-between text-slate-400 text-xs font-medium uppercase tracking-wider">
          <span>Total Capacity</span>
          <ParkingSquare className="w-4 h-4 text-sky-400" />
        </div>
        <div className="mt-2 text-3xl font-bold text-white">{totalCapacity}</div>
        <p className="mt-1 text-xs text-slate-400">Slots P1–P5</p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <div className="flex items-center justify-between text-slate-400 text-xs font-medium uppercase tracking-wider">
          <span>Occupied Slots</span>
          <Car className="w-4 h-4 text-rose-400" />
        </div>
        <div className="mt-2 text-3xl font-bold text-rose-400">{occupiedSlots}</div>
        <p className="mt-1 text-xs text-slate-400">Motion sensors HIGH</p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <div className="flex items-center justify-between text-slate-400 text-xs font-medium uppercase tracking-wider">
          <span>Available Slots</span>
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="mt-2 text-3xl font-bold text-emerald-400">{availableSlots}</div>
        <p className="mt-1 text-xs text-slate-400">
          {availableSlots === 0 ? 'Parking Full' : 'Ready for entry'}
        </p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <div className="flex items-center justify-between text-slate-400 text-xs font-medium uppercase tracking-wider">
          <span>Occupancy Rate</span>
          <Gauge className="w-4 h-4 text-amber-400" />
        </div>
        <div className="mt-2 text-3xl font-bold text-white">{occupancyRate}%</div>
        <div className="mt-2 w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              occupancyRate >= 100
                ? 'bg-rose-500'
                : occupancyRate >= 60
                ? 'bg-amber-400'
                : 'bg-emerald-400'
            }`}
            style={{ width: `${occupancyRate}%` }}
          />
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <div className="flex items-center justify-between text-slate-400 text-xs font-medium uppercase tracking-wider">
          <span>Entry Gate</span>
          <DoorOpen className={`w-4 h-4 ${isGateOpen ? 'text-emerald-400' : 'text-slate-400'}`} />
        </div>
        <div className="mt-2 flex items-center gap-2">
          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-md text-sm font-bold ${
              isGateOpen
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : 'bg-slate-800 text-slate-300 border border-slate-700'
            }`}
          >
            {gateStatus}
          </span>
        </div>
        <p className="mt-1.5 text-xs text-slate-400">
          {isGateOpen ? 'Vehicle permitted' : 'Barrier locked'}
        </p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <div className="flex items-center justify-between text-slate-400 text-xs font-medium uppercase tracking-wider">
          <span>RFID Status</span>
          {isRfidUnauth ? (
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          ) : (
            <ShieldCheck className={`w-4 h-4 ${isRfidAuth ? 'text-emerald-400' : 'text-slate-400'}`} />
          )}
        </div>
        <div className="mt-2">
          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-md text-sm font-bold ${
              isRfidAuth
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : isRfidUnauth
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                : 'bg-slate-800 text-slate-300 border border-slate-700'
            }`}
          >
            {rfidStatus}
          </span>
        </div>
        <p className="mt-1.5 text-xs text-slate-400 truncate">
          {lastRfidTag ? `Last tag: ${lastRfidTag}` : 'Awaiting scan'}
        </p>
      </div>
    </div>
  );
}
