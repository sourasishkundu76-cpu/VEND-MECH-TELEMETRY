import React, { useState } from 'react';
import { DiagnosticLog, FaultStates } from '../../types/vendmech';
import {
  IndustrialCard,
  TelemetryBadge,
  ActuatorButton,
  IndustrialCheckbox,
  SegmentedMeter,
} from '../common/IndustrialComponents';
import { AlertTriangle, Wrench, Download, Filter, ShieldCheck, Flame } from 'lucide-react';

interface StressDiagnosticsScreenProps {
  logs: DiagnosticLog[];
  onAddLog: (log: Omit<DiagnosticLog, 'id' | 'timestamp'>) => void;
  faults: FaultStates;
  onUpdateFaults: (faults: FaultStates) => void;
  isEStopped: boolean;
}

export const StressDiagnosticsScreen: React.FC<StressDiagnosticsScreenProps> = ({
  logs,
  onAddLog,
  faults,
  onUpdateFaults,
  isEStopped,
}) => {
  const [logFilter, setLogFilter] = useState<'ALL' | 'NOMINAL' | 'WARN' | 'CRIT'>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Fault handlers
  const handleToggleFault = (faultKey: keyof FaultStates, enabled: boolean) => {
    const updated = { ...faults, [faultKey]: enabled };
    onUpdateFaults(updated);

    if (enabled) {
      const descriptions: Record<keyof FaultStates, { hex: string; sub: string; msg: string }> = {
        coilJam: {
          hex: '0x8A12',
          sub: 'COIL_MECHANICS',
          msg: 'Mechanical jam injected: Helical coil spindle torque spiked > 2.8 N·m at 72% rotation.',
        },
        motorStall: {
          hex: '0x9B44',
          sub: 'STEPPER_DRIVER',
          msg: 'Thermal overload simulated: Bridge MOSFET temperature escalated to 86.4°C.',
        },
        pressureDrop: {
          hex: '0x6C30',
          sub: 'PNEUMATICS',
          msg: 'Pneumatic line pressure collapsed from 6.2 bar to 2.1 bar. Ejector force compromised.',
        },
        opticalMisalignment: {
          hex: '0x4E77',
          sub: 'OPTICAL_GATE',
          msg: 'Beam attenuation detected: Break-beam signal-to-noise ratio degraded below 15dB.',
        },
        doorInterlockBreach: {
          hex: '0x00FF',
          sub: 'INTERLOCK_DOOR',
          msg: 'Safety interlock switch opened: Access door microswitch triggered during cycle.',
        },
      };

      const faultInfo = descriptions[faultKey];
      onAddLog({
        hexCode: faultInfo.hex,
        subsystem: faultInfo.sub,
        level: 'CRIT',
        message: faultInfo.msg,
      });
    } else {
      onAddLog({
        hexCode: '0x0010',
        subsystem: 'DIAGNOSTIC_BENCH',
        level: 'NOMINAL',
        message: `Fault condition '${String(faultKey)}' cleared manually by operator.`,
      });
    }
  };

  // Automated Recovery Routine handlers
  const handleRunRecoveryRoutine = (routineName: string) => {
    if (isEStopped) return;

    onAddLog({
      hexCode: '0x22C1',
      subsystem: 'RECOVERY_ENGINE',
      level: 'WARN',
      message: `Executing automated failover routine: [${routineName}].`,
    });

    setTimeout(() => {
      onUpdateFaults({
        coilJam: false,
        motorStall: false,
        pressureDrop: false,
        opticalMisalignment: false,
        doorInterlockBreach: false,
      });

      onAddLog({
        hexCode: '0x00B0',
        subsystem: 'RECOVERY_ENGINE',
        level: 'NOMINAL',
        message: `Routine '${routineName}' concluded successfully. Normal telemetry restored.`,
      });
    }, 1200);
  };

  // Filter logs
  const filteredLogs = logs.filter((log) => {
    if (logFilter !== 'ALL' && log.level !== logFilter) return false;
    if (
      searchTerm &&
      !log.message.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !log.subsystem.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !log.hexCode.toLowerCase().includes(searchTerm.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const handleExportLogs = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(logs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `vendmech_diagnostics_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="flex flex-col gap-4">
      {/* TOP HEALTH & FATIGUE METRICS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <IndustrialCard title="Life Cycle Index" hardwareTag="[MTBF.ANALYZER]">
          <div className="flex flex-col gap-1 font-mono">
            <span className="text-2xl font-bold text-[#c3f5ff] tabular-nums">2,842</span>
            <span className="text-[10px] text-[#849396]">
              COMPLETED DISPENSE CYCLES (MTBF RATING: 20,000)
            </span>
            <div className="h-1.5 w-full bg-[#070b14] rounded-[1px] mt-2 overflow-hidden">
              <div className="h-full bg-[#00e5ff]" style={{ width: '14.2%' }} />
            </div>
          </div>
        </IndustrialCard>

        <IndustrialCard title="Structural Fatigue" hardwareTag="[FEA.FATIGUE_NODE]">
          <div className="flex flex-col gap-1 font-mono">
            <span className="text-2xl font-bold text-[#00e5ff] tabular-nums">94.8 %</span>
            <span className="text-[10px] text-[#849396]">
              ALUMINUM 6061-T6 CHASSIS INTEGRITY (NOMINAL)
            </span>
            <div className="h-1.5 w-full bg-[#070b14] rounded-[1px] mt-2 overflow-hidden">
              <div className="h-full bg-[#00e5ff]" style={{ width: '94.8%' }} />
            </div>
          </div>
        </IndustrialCard>

        <IndustrialCard title="Thermal Delta" hardwareTag="[SENS.THERM_GRAD]">
          <div className="flex flex-col gap-1 font-mono">
            <span className="text-2xl font-bold text-[#f59e0b] tabular-nums">+14.2 °C</span>
            <span className="text-[10px] text-[#849396]">
              CHASSIS CORE ABOVE AMBIENT ROOM (T_MAX: +35°C)
            </span>
            <div className="h-1.5 w-full bg-[#070b14] rounded-[1px] mt-2 overflow-hidden">
              <div className="h-full bg-[#f59e0b]" style={{ width: '40.5%' }} />
            </div>
          </div>
        </IndustrialCard>

        <IndustrialCard title="Active Faults" hardwareTag="[SAFETY.SUPERVISOR]">
          <div className="flex flex-col gap-1 font-mono">
            <span
              className={`text-2xl font-bold tabular-nums ${
                Object.values(faults).some(Boolean) ? 'text-[#ef4444]' : 'text-[#00e5ff]'
              }`}
            >
              {Object.values(faults).filter(Boolean).length} FAULTS
            </span>
            <span className="text-[10px] text-[#849396]">
              {Object.values(faults).some(Boolean)
                ? 'CRITICAL EXCEPTION(S) FLAGGED IN BUS'
                : 'ALL SUBSYSTEM INVARIANTS CALIBRATED'}
            </span>
            <div className="h-1.5 w-full bg-[#070b14] rounded-[1px] mt-2 overflow-hidden">
              <div
                className={`h-full ${
                  Object.values(faults).some(Boolean) ? 'bg-[#ef4444]' : 'bg-[#00e5ff]'
                }`}
                style={{ width: Object.values(faults).some(Boolean) ? '100%' : '0%' }}
              />
            </div>
          </div>
        </IndustrialCard>
      </div>

      {/* LOWER SPLIT: FAULT INJECTION & RECOVERY VS AVIONICS EVENT LOG */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* Left: Fault Injection Test Bench & Automated Clearance (5 cols) */}
        <div className="xl:col-span-5 flex flex-col gap-4">
          <IndustrialCard
            title="Fault Injection Test Engine"
            hardwareTag="[SIM.FAULT_INJECTOR]"
            headerAction={
              <span className="text-[9px] font-mono text-[#f59e0b] bg-[#f59e0b]/10 px-1.5 py-0.5 border border-[#f59e0b]/30 rounded-[2px]">
                STRESS TEST MODE
              </span>
            }
          >
            <div className="flex flex-col gap-3 font-mono">
              <span className="text-[10px] text-[#849396] uppercase">
                Simulate Mechanical & Electrical Stress Anomaly
              </span>

              <div className="flex flex-col gap-2.5 p-2.5 panel-recessed rounded-[2px]">
                <IndustrialCheckbox
                  label="Inject Helical Coil Jam"
                  checked={faults.coilJam}
                  onChange={(val) => handleToggleFault('coilJam', val)}
                  description="Spikes motor torque to 2.85 N·m and halts rotation at 72%"
                />
                <IndustrialCheckbox
                  label="Simulate Stepper Driver Overheat"
                  checked={faults.motorStall}
                  onChange={(val) => handleToggleFault('motorStall', val)}
                  description="Simulates MOSFET bridge thermal runaway (>85°C)"
                />
                <IndustrialCheckbox
                  label="Pneumatic Line Pressure Drop"
                  checked={faults.pressureDrop}
                  onChange={(val) => handleToggleFault('pressureDrop', val)}
                  description="Simulates compressor fault: Drops air supply to 2.1 bar"
                />
                <IndustrialCheckbox
                  label="Laser Break-Beam Optical Obscuration"
                  checked={faults.opticalMisalignment}
                  onChange={(val) => handleToggleFault('opticalMisalignment', val)}
                  description="Simulates dust or misalignment on optical receiver"
                />
                <IndustrialCheckbox
                  label="Access Door Interlock Breach"
                  checked={faults.doorInterlockBreach}
                  onChange={(val) => handleToggleFault('doorInterlockBreach', val)}
                  description="Simulates door opened during active dispensing kinematic"
                />
              </div>

              {/* Automated Recovery Routines */}
              <div className="pt-2 border-t border-[#38bdf8]/15 flex flex-col gap-2">
                <span className="text-[10px] uppercase text-[#849396]">
                  Automated Clearance & Failover Routines
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <ActuatorButton
                    variant="secondary"
                    onClick={() => handleRunRecoveryRoutine('Reverse Jog Unwind')}
                    disabled={isEStopped}
                  >
                    REVERSE UNWIND JOG
                  </ActuatorButton>
                  <ActuatorButton
                    variant="secondary"
                    onClick={() => handleRunRecoveryRoutine('Torque Ramp Clear')}
                    disabled={isEStopped}
                  >
                    TORQUE RAMP CLEAR
                  </ActuatorButton>
                  <ActuatorButton
                    variant="secondary"
                    onClick={() => handleRunRecoveryRoutine('Pneumatic Purge Blast')}
                    disabled={isEStopped}
                  >
                    PNEU PURGE BLAST
                  </ActuatorButton>
                  <ActuatorButton
                    variant="secondary"
                    onClick={() => handleRunRecoveryRoutine('Optical Re-Zero')}
                    disabled={isEStopped}
                  >
                    OPTICAL RE-ZERO
                  </ActuatorButton>
                </div>
              </div>
            </div>
          </IndustrialCard>
        </div>

        {/* Right: Avionics Diagnostic Event Log (7 cols) */}
        <div className="xl:col-span-7 flex flex-col gap-4">
          <IndustrialCard
            title="Avionics Telemetry & Exception Log"
            hardwareTag="[SYS.EVENT_STREAM]"
            headerAction={
              <button
                type="button"
                onClick={handleExportLogs}
                className="text-[10px] font-mono text-[#38bdf8] hover:text-[#00e5ff] cursor-pointer flex items-center gap-1 bg-[#070b14] px-2 py-1 rounded-[2px] border border-[#38bdf8]/20"
              >
                <Download className="w-3 h-3" />
                <span>EXPORT JSON</span>
              </button>
            }
          >
            <div className="flex flex-col gap-3 font-mono">
              {/* Filter and Search Bar */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#38bdf8]/15">
                <div className="flex items-center gap-1">
                  {(['ALL', 'NOMINAL', 'WARN', 'CRIT'] as const).map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setLogFilter(level)}
                      className={`px-2 py-0.5 text-[10px] rounded-[2px] transition-all cursor-pointer ${
                        logFilter === level
                          ? 'bg-[#00e5ff] text-[#070b14] font-bold'
                          : 'bg-[#070b14] text-[#849396] border border-[#38bdf8]/15 hover:text-[#dfe2f0]'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1 panel-recessed px-2 py-1 rounded-[2px] w-48">
                  <Filter className="w-3 h-3 text-[#849396]" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search logs..."
                    className="w-full bg-transparent text-[11px] text-[#c3f5ff] placeholder-[#849396] outline-none"
                  />
                </div>
              </div>

              {/* Log Feed */}
              <div className="flex flex-col gap-1.5 max-h-[380px] overflow-y-auto pr-1">
                {filteredLogs.length === 0 ? (
                  <div className="panel-recessed p-6 text-center text-xs text-[#849396]">
                    No diagnostic messages match current filter criteria.
                  </div>
                ) : (
                  filteredLogs.map((log) => {
                    let badgeClass = 'text-[#00e5ff] border-[#00e5ff]/30';
                    if (log.level === 'WARN') {
                      badgeClass = 'text-[#f59e0b] border-[#f59e0b]/30';
                    } else if (log.level === 'CRIT') {
                      badgeClass = 'text-[#ef4444] border-[#ef4444]/30 bg-[#ef4444]/10';
                    } else if (log.level === 'INFO') {
                      badgeClass = 'text-[#849396] border-[#849396]/30';
                    }

                    return (
                      <div
                        key={log.id}
                        className="p-2 panel-recessed rounded-[2px] text-xs flex flex-col gap-1 border-l-2 border-l-[#38bdf8]/40 hover:border-l-[#00e5ff]"
                      >
                        <div className="flex items-center justify-between text-[10px]">
                          <div className="flex items-center gap-2">
                            <span className="text-[#849396] tabular-nums">
                              {log.timestamp}
                            </span>
                            <span className="text-[#c3f5ff] font-bold">
                              {log.subsystem}
                            </span>
                            <span className="text-[#849396]">{log.hexCode}</span>
                          </div>
                          <span
                            className={`px-1.5 py-0.2 rounded-[1px] border text-[9px] uppercase font-bold ${badgeClass}`}
                          >
                            {log.level}
                          </span>
                        </div>
                        <p className="text-[#dfe2f0] text-[11px] font-sans leading-relaxed">
                          {log.message}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </IndustrialCard>
        </div>
      </div>
    </div>
  );
};
