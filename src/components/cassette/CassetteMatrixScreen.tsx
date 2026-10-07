import React, { useState } from 'react';
import { CassetteSlot, DiagnosticLog } from '../../types/vendmech';
import { PAYLOAD_CATALOG } from '../../data/mockVendMechData';
import {
  IndustrialCard,
  TelemetryBadge,
  ActuatorButton,
  NumericStepper,
} from '../common/IndustrialComponents';
import { Layers, Plus, Trash2, Play, PackageCheck } from 'lucide-react';

interface CassetteMatrixScreenProps {
  slots: CassetteSlot[];
  onUpdateSlot: (updated: CassetteSlot) => void;
  onAddLog: (log: Omit<DiagnosticLog, 'id' | 'timestamp'>) => void;
  isEStopped: boolean;
}

export const CassetteMatrixScreen: React.FC<CassetteMatrixScreenProps> = ({
  slots,
  onUpdateSlot,
  onAddLog,
  isEStopped,
}) => {
  const [selectedSlotId, setSelectedSlotId] = useState<string>('A1');
  const [dispatchQueue, setDispatchQueue] = useState<string[]>(['A1', 'B2', 'C4']);
  const [isExecutingQueue, setIsExecutingQueue] = useState<boolean>(false);
  const [activeQueueIndex, setActiveQueueIndex] = useState<number>(-1);

  const activeSlot = slots.find((s) => s.slotId === selectedSlotId) || slots[0];

  const handleRestock = (amount: number) => {
    const newStock = Math.min(activeSlot.capacity, activeSlot.stockCount + amount);
    onUpdateSlot({
      ...activeSlot,
      stockCount: newStock,
      status: newStock > 0 ? 'READY' : 'EMPTY',
    });
    onAddLog({
      hexCode: '0x1C8A',
      subsystem: `BAY_${activeSlot.slotId}`,
      level: 'INFO',
      message: `Bay ${activeSlot.slotId} replenished with +${amount} units. Current stock: ${newStock}/${activeSlot.capacity}.`,
    });
  };

  const handlePayloadChange = (payloadId: string) => {
    const payload = PAYLOAD_CATALOG.find((p) => p.id === payloadId);
    if (!payload) return;
    onUpdateSlot({
      ...activeSlot,
      payload,
      coilPitchMm: payload.coilPitchMm,
    });
    onAddLog({
      hexCode: '0x22EF',
      subsystem: `BAY_${activeSlot.slotId}`,
      level: 'NOMINAL',
      message: `Bay ${activeSlot.slotId} payload profile reassigned to '${payload.name}'. Coil pitch tuned to ${payload.coilPitchMm}mm.`,
    });
  };

  const handleAddToQueue = (slotId: string) => {
    setDispatchQueue((prev) => [...prev, slotId]);
  };

  const handleRemoveFromQueue = (index: number) => {
    setDispatchQueue((prev) => prev.filter((_, i) => i !== index));
  };

  const handleExecuteQueue = () => {
    if (isEStopped || dispatchQueue.length === 0 || isExecutingQueue) return;

    setIsExecutingQueue(true);
    setActiveQueueIndex(0);

    onAddLog({
      hexCode: '0x7120',
      subsystem: 'QUEUE_ENGINE',
      level: 'INFO',
      message: `Automated batch dispatch sequence initiated: [${dispatchQueue.join(' → ')}]`,
    });

    let currentIdx = 0;
    const interval = setInterval(() => {
      if (currentIdx >= dispatchQueue.length) {
        clearInterval(interval);
        setIsExecutingQueue(false);
        setActiveQueueIndex(-1);
        onAddLog({
          hexCode: '0x712F',
          subsystem: 'QUEUE_ENGINE',
          level: 'NOMINAL',
          message: `Batch sequence execution completed. All items verified.`,
        });
        return;
      }

      const targetSlotId = dispatchQueue[currentIdx];
      setActiveQueueIndex(currentIdx);

      // Decrement slot stock
      const targetSlot = slots.find((s) => s.slotId === targetSlotId);
      if (targetSlot && targetSlot.stockCount > 0) {
        onUpdateSlot({
          ...targetSlot,
          stockCount: targetSlot.stockCount - 1,
          totalDispenses: targetSlot.totalDispenses + 1,
        });
      }

      currentIdx++;
    }, 1800);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* 12-BAY MODULAR CASSETTE MATRIX (3 ROWS x 4 COLS) */}
      <IndustrialCard
        title="Cassette Bay Rack Matrix: 12 Modular Feeder Bays"
        hardwareTag="[SYS.CASSETTE_ARRAY_12X]"
        headerAction={
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-[#849396]">
              TOTAL INVENTORY:{' '}
              <strong className="text-[#00e5ff]">
                {slots.reduce((acc, s) => acc + s.stockCount, 0)}
              </strong>{' '}
              / 120 UNITS
            </span>
          </div>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {slots.map((slot) => {
            const isSelected = slot.slotId === selectedSlotId;
            const isQueueActive =
              isExecutingQueue &&
              activeQueueIndex >= 0 &&
              dispatchQueue[activeQueueIndex] === slot.slotId;

            let statusColor = 'bg-[#00e5ff] shadow-[0_0_8px_#00e5ff]';
            if (slot.status === 'EMPTY' || slot.stockCount === 0) {
              statusColor = 'bg-[#ef4444] shadow-[0_0_8px_#ef4444]';
            } else if (slot.status === 'JAMMED') {
              statusColor = 'bg-[#f59e0b] shadow-[0_0_8px_#f59e0b]';
            }

            return (
              <div
                key={slot.slotId}
                onClick={() => setSelectedSlotId(slot.slotId)}
                className={`relative p-3 rounded-[3px] font-mono cursor-pointer transition-all select-none flex flex-col justify-between ${
                  isQueueActive
                    ? 'bg-[#151e2e] border-2 border-[#00e5ff] shadow-[0_0_18px_rgba(0,229,255,0.4)] animate-pulse'
                    : isSelected
                    ? 'bg-[#151e2e] border border-[#00e5ff] shadow-[0_0_12px_rgba(0,229,255,0.2)]'
                    : 'bg-[#0b1220] border border-[#38bdf8]/15 hover:border-[#38bdf8]/40'
                }`}
              >
                {/* 1px corner tick marks */}
                <span className="absolute top-0 left-0 w-1.5 h-1.5 border-t border-l border-[#00e5ff]/50" />
                <span className="absolute top-0 right-0 w-1.5 h-1.5 border-t border-r border-[#00e5ff]/50" />
                <span className="absolute bottom-0 left-0 w-1.5 h-1.5 border-b border-l border-[#00e5ff]/50" />
                <span className="absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r border-[#00e5ff]/50" />

                <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-[#38bdf8]/10">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${statusColor}`} />
                    <span className="text-sm font-bold text-[#c3f5ff]">BAY {slot.slotId}</span>
                  </div>
                  <span className="text-[10px] text-[#849396]">{slot.coilPitchMm}mm PITCH</span>
                </div>

                <div className="flex flex-col gap-1 mb-2">
                  <span className="text-xs font-semibold text-[#dfe2f0] truncate">
                    {slot.payload.name}
                  </span>
                  <div className="flex items-center justify-between text-[10px] text-[#849396]">
                    <span>MASS: {slot.payload.weightGrams}g</span>
                    <span>TILT: {slot.feederAngleDeg.toFixed(1)}°</span>
                  </div>
                </div>

                {/* Stock bar */}
                <div className="flex flex-col gap-1 pt-1.5 border-t border-[#38bdf8]/10">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-[#849396]">CAPACITY</span>
                    <span
                      className={`font-bold tabular-nums ${
                        slot.stockCount === 0 ? 'text-[#ef4444]' : 'text-[#00e5ff]'
                      }`}
                    >
                      {slot.stockCount} / {slot.capacity}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-[#070b14] rounded-[1px] overflow-hidden flex">
                    <div
                      className={`h-full transition-all duration-300 ${
                        slot.stockCount === 0
                          ? 'bg-[#ef4444]'
                          : slot.stockCount <= 3
                          ? 'bg-[#f59e0b]'
                          : 'bg-[#00e5ff]'
                      }`}
                      style={{ width: `${(slot.stockCount / slot.capacity) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </IndustrialCard>

      {/* LOWER SPLIT: Slot Reconfiguration & Batch Sequence Queue */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* Selected Slot Detailed Reconfiguration (7 cols) */}
        <div className="xl:col-span-7 flex flex-col gap-4">
          <IndustrialCard
            title={`Bay Reconfiguration & Feeder Geometry: BAY ${activeSlot.slotId}`}
            hardwareTag={`[SYS.FEEDER_${activeSlot.slotId}]`}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left: Reconfiguration Form */}
              <div className="flex flex-col gap-3">
                <div>
                  <span className="text-[10px] uppercase font-mono tracking-wider text-[#849396] block mb-1">
                    Assign Stored Payload
                  </span>
                  <select
                    value={activeSlot.payload.id}
                    onChange={(e) => handlePayloadChange(e.target.value)}
                    className="w-full bg-[#070b14] border border-[#38bdf8]/30 text-xs font-mono text-[#c3f5ff] p-2 rounded-[2px] outline-none focus:border-[#00e5ff]"
                  >
                    {PAYLOAD_CATALOG.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.weightGrams}g, {p.coilPitchMm}mm)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <NumericStepper
                    label="Coil Pitch (mm)"
                    value={activeSlot.coilPitchMm}
                    min={25}
                    max={80}
                    step={5}
                    unit="mm"
                    onChange={(val) =>
                      onUpdateSlot({ ...activeSlot, coilPitchMm: val })
                    }
                  />
                  <NumericStepper
                    label="Feeder Tilt Angle"
                    value={activeSlot.feederAngleDeg}
                    min={-2.0}
                    max={12.0}
                    step={0.5}
                    unit="°"
                    onChange={(val) =>
                      onUpdateSlot({ ...activeSlot, feederAngleDeg: val })
                    }
                  />
                </div>

                {/* Restock Buttons */}
                <div className="pt-2 border-t border-[#38bdf8]/15 flex flex-col gap-1.5">
                  <span className="text-[10px] uppercase font-mono text-[#849396]">
                    Inventory Replenishment
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleRestock(1)}
                      className="flex-1 py-1.5 bg-[#070b14] border border-[#38bdf8]/20 hover:border-[#00e5ff] text-[#38bdf8] text-xs font-mono rounded-[2px] cursor-pointer"
                    >
                      +1 UNIT
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRestock(5)}
                      className="flex-1 py-1.5 bg-[#070b14] border border-[#38bdf8]/20 hover:border-[#00e5ff] text-[#38bdf8] text-xs font-mono rounded-[2px] cursor-pointer"
                    >
                      +5 UNITS
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRestock(activeSlot.capacity - activeSlot.stockCount)}
                      className="flex-1 py-1.5 bg-[#151e2e] border border-[#00e5ff]/40 hover:bg-[#1e293b] text-[#00e5ff] text-xs font-mono font-semibold rounded-[2px] cursor-pointer"
                    >
                      FILL (10)
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <ActuatorButton
                    variant="secondary"
                    onClick={() => handleAddToQueue(activeSlot.slotId)}
                    className="w-full flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>ENQUEUE FOR BATCH DISPATCH</span>
                  </ActuatorButton>
                </div>
              </div>

              {/* Right: Mechanism Cross-Section Visual */}
              <div className="flex flex-col gap-2">
                <span className="text-[10px] uppercase font-mono text-[#849396]">
                  Cassette Spindle Mechanical Specimen
                </span>
                <div className="relative w-full h-[180px] rounded-[2px] overflow-hidden border border-[#38bdf8]/20 bg-[#070b14]">
                  <img
                    src="/src/assets/images/cassette_tray_mechanism_1791393595178.jpg"
                    alt="Cassette Tray Mechanism"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#070b14] via-transparent to-transparent opacity-80" />
                  <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-[#070b14]/85 border border-[#38bdf8]/40 text-[9px] font-mono text-[#c3f5ff] rounded-[2px]">
                    BRACKET: ANODIZED 6061-T6
                  </div>
                  <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-[#070b14]/85 border border-[#00e5ff]/40 text-[9px] font-mono text-[#00e5ff] rounded-[2px]">
                    OPTICAL ALIGNMENT VERIFIED
                  </div>
                </div>

                <div className="panel-recessed p-2 rounded-[2px] text-[10px] font-mono text-[#849396] flex flex-col gap-1">
                  <div className="flex justify-between">
                    <span>LIFETIME CYCLES:</span>
                    <span className="text-[#dfe2f0] tabular-nums">
                      {activeSlot.totalDispenses} DISPENSES
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>CHAMBER TEMP:</span>
                    <span className="text-[#00e5ff] tabular-nums">
                      {activeSlot.temperatureC.toFixed(1)} °C
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </IndustrialCard>
        </div>

        {/* Batch Dispatch Sequence Queue (5 cols) */}
        <div className="xl:col-span-5 flex flex-col gap-4">
          <IndustrialCard
            title="Batch Dispatch Sequence Engine"
            hardwareTag="[SEQ.QUEUE_ENGINE]"
            headerAction={
              <button
                type="button"
                onClick={() => setDispatchQueue([])}
                className="text-[10px] font-mono text-[#ef4444] hover:underline cursor-pointer flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                <span>CLEAR</span>
              </button>
            }
          >
            <div className="flex flex-col gap-3 font-mono">
              <span className="text-[10px] uppercase text-[#849396]">
                Sequential Dispense Sequence ({dispatchQueue.length} ITEMS)
              </span>

              {dispatchQueue.length === 0 ? (
                <div className="panel-recessed p-6 rounded-[2px] text-center text-xs text-[#849396]">
                  Queue empty. Select cassette bays and click "ENQUEUE FOR BATCH DISPATCH".
                </div>
              ) : (
                <div className="flex flex-col gap-1.5 max-h-[220px] overflow-y-auto pr-1">
                  {dispatchQueue.map((slotId, idx) => {
                    const slot = slots.find((s) => s.slotId === slotId);
                    const isActive = isExecutingQueue && activeQueueIndex === idx;

                    return (
                      <div
                        key={`${slotId}-${idx}`}
                        className={`flex items-center justify-between p-2 rounded-[2px] text-xs transition-all ${
                          isActive
                            ? 'bg-[#151e2e] border border-[#00e5ff] text-[#00e5ff] shadow-[0_0_8px_rgba(0,229,255,0.3)]'
                            : 'bg-[#070b14] border border-[#38bdf8]/15 text-[#dfe2f0]'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-[#849396] text-[10px] w-4">
                            {idx + 1}.
                          </span>
                          <span className="font-bold text-[#c3f5ff]">{slotId}</span>
                          <span className="text-[11px] text-[#849396] truncate max-w-[140px]">
                            {slot?.payload.name || 'Payload'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {isActive && (
                            <span className="text-[9px] text-[#00e5ff] animate-pulse">
                              DISPENSING...
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveFromQueue(idx)}
                            disabled={isExecutingQueue}
                            className="text-[#849396] hover:text-[#ef4444] cursor-pointer disabled:opacity-30"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Action execute button */}
              <div className="pt-2 border-t border-[#38bdf8]/15">
                <ActuatorButton
                  variant="primary"
                  onClick={handleExecuteQueue}
                  disabled={isExecutingQueue || dispatchQueue.length === 0 || isEStopped}
                  className="w-full flex items-center justify-center gap-2"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>
                    {isExecutingQueue ? 'EXECUTING BATCH SEQUENCE...' : 'EXECUTE BATCH SEQUENCE'}
                  </span>
                </ActuatorButton>
              </div>
            </div>
          </IndustrialCard>
        </div>
      </div>
    </div>
  );
};
