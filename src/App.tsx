import React, { useState } from 'react';
import {
  INITIAL_SLOTS,
  INITIAL_ACTUATORS,
  INITIAL_LOGS,
} from './data/mockVendMechData';
import {
  CassetteSlot,
  ActuatorChannel,
  DiagnosticLog,
  FaultStates,
} from './types/vendmech';
import { TopNavigation, NavTabId } from './components/common/TopNavigation';
import { KinematicSimulatorScreen } from './components/simulator/KinematicSimulatorScreen';
import { ActuatorTelemetryScreen } from './components/telemetry/ActuatorTelemetryScreen';
import { CassetteMatrixScreen } from './components/cassette/CassetteMatrixScreen';
import { StressDiagnosticsScreen } from './components/stress/StressDiagnosticsScreen';
import { BlueprintInspectorScreen } from './components/blueprint/BlueprintInspectorScreen';

export default function App() {
  const [currentTab, setCurrentTab] = useState<NavTabId>('simulator');
  const [slots, setSlots] = useState<CassetteSlot[]>(INITIAL_SLOTS);
  const [selectedSlotId, setSelectedSlotId] = useState<string>('A1');
  const [actuators, setActuators] = useState<ActuatorChannel[]>(INITIAL_ACTUATORS);
  const [logs, setLogs] = useState<DiagnosticLog[]>(INITIAL_LOGS);
  const [isEStopped, setIsEStopped] = useState<boolean>(false);
  const [faults, setFaults] = useState<FaultStates>({
    coilJam: false,
    motorStall: false,
    pressureDrop: false,
    opticalMisalignment: false,
    doorInterlockBreach: false,
  });

  const addLog = (logData: Omit<DiagnosticLog, 'id' | 'timestamp'>) => {
    const now = new Date();
    const timeStr = `${now.toTimeString().split(' ')[0]}.${String(now.getMilliseconds()).padStart(3, '0')}`;
    const newLog: DiagnosticLog = {
      ...logData,
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: timeStr,
    };
    setLogs((prev) => [newLog, ...prev.slice(0, 99)]);
  };

  const handleToggleEStop = () => {
    const nextState = !isEStopped;
    setIsEStopped(nextState);
    if (nextState) {
      addLog({
        hexCode: '0xFFFF',
        subsystem: 'SYS.EMERGENCY',
        level: 'CRIT',
        message: 'EMERGENCY STOP ENGAGED: All actuator drive coils depowered, safety brakes locked.',
      });
    } else {
      addLog({
        hexCode: '0x0001',
        subsystem: 'SYS.EMERGENCY',
        level: 'NOMINAL',
        message: 'EMERGENCY STOP CLEARED: Actuator drivers re-energized in low-current standby mode.',
      });
    }
  };

  const handleTriggerDispense = (slotId: string) => {
    setSlots((prev) =>
      prev.map((s) => {
        if (s.slotId === slotId && s.stockCount > 0) {
          const newCount = s.stockCount - 1;
          return {
            ...s,
            stockCount: newCount,
            status: newCount === 0 ? 'EMPTY' : 'READY',
            totalDispenses: s.totalDispenses + 1,
          };
        }
        return s;
      })
    );
  };

  const handleUpdateSlot = (updated: CassetteSlot) => {
    setSlots((prev) => prev.map((s) => (s.slotId === updated.slotId ? updated : s)));
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-[#dfe2f0] flex flex-col bg-tech-grid">
      {/* 3-ZONE TOP NAVIGATION BAR */}
      <TopNavigation
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        isEStopped={isEStopped}
        onToggleEStop={handleToggleEStop}
        onTriggerQuickDispense={() => {
          setCurrentTab('simulator');
        }}
      />

      {/* MOBILE TAB BAR (Only on < md screens) */}
      <div className="md:hidden flex items-center overflow-x-auto bg-[#0b1220] border-b border-[#38bdf8]/15 px-3 py-2 gap-2 text-xs font-mono">
        {[
          { id: 'simulator', label: 'Simulator' },
          { id: 'telemetry', label: 'Telemetry' },
          { id: 'cassette', label: 'Cassettes' },
          { id: 'stress', label: 'Stress' },
          { id: 'blueprint', label: 'CAD Blueprint' },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setCurrentTab(item.id as NavTabId)}
            className={`px-2.5 py-1 rounded-[2px] whitespace-nowrap cursor-pointer ${
              currentTab === item.id
                ? 'bg-[#00e5ff] text-[#070b14] font-bold'
                : 'text-[#849396] hover:text-[#dfe2f0]'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* MAIN COCKPIT VIEWPORT */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto p-3 sm:p-4 lg:p-6 flex flex-col gap-6">
        {currentTab === 'simulator' && (
          <KinematicSimulatorScreen
            slots={slots}
            selectedSlotId={selectedSlotId}
            onSelectSlot={setSelectedSlotId}
            isEStopped={isEStopped}
            onTriggerDispense={handleTriggerDispense}
            onAddLog={addLog}
          />
        )}

        {currentTab === 'telemetry' && (
          <ActuatorTelemetryScreen
            actuators={actuators}
            onAddLog={addLog}
            isEStopped={isEStopped}
          />
        )}

        {currentTab === 'cassette' && (
          <CassetteMatrixScreen
            slots={slots}
            onUpdateSlot={handleUpdateSlot}
            onAddLog={addLog}
            isEStopped={isEStopped}
          />
        )}

        {currentTab === 'stress' && (
          <StressDiagnosticsScreen
            logs={logs}
            onAddLog={addLog}
            faults={faults}
            onUpdateFaults={setFaults}
            isEStopped={isEStopped}
          />
        )}

        {currentTab === 'blueprint' && <BlueprintInspectorScreen />}
      </main>

      {/* QUIET FOOTER */}
      <footer className="mt-auto border-t border-[#38bdf8]/10 bg-[#070b14] px-6 py-4 text-xs font-mono text-[#849396] flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span>Vend-Mech Systems Architecture</span>
          <span aria-hidden="true">·</span>
          <span>Kinematic Instrumentation Cockpit</span>
          <span aria-hidden="true">·</span>
          <span>ISO 22153 Mechatronic Compliance</span>
        </div>
        <div className="flex items-center gap-4 text-[11px]">
          <span>48V DC BUS: NOMINAL</span>
          <span aria-hidden="true">·</span>
          <span>OPTICAL GATE: CALIBRATED</span>
        </div>
      </footer>
    </div>
  );
}
