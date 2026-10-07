import React, { useState, useEffect, useRef } from 'react';
import { ActuatorChannel, DiagnosticLog } from '../../types/vendmech';
import {
  IndustrialCard,
  SegmentedMeter,
  TelemetryBadge,
  ActuatorButton,
  NumericStepper,
  RockerSwitch,
} from '../common/IndustrialComponents';
import { Gauge, Cpu, Activity, RefreshCw } from 'lucide-react';

interface ActuatorTelemetryScreenProps {
  actuators: ActuatorChannel[];
  onAddLog: (log: Omit<DiagnosticLog, 'id' | 'timestamp'>) => void;
  isEStopped: boolean;
}

export const ActuatorTelemetryScreen: React.FC<ActuatorTelemetryScreenProps> = ({
  actuators: initialActuators,
  onAddLog,
  isEStopped,
}) => {
  const [actuators, setActuators] = useState<ActuatorChannel[]>(initialActuators);
  const [selectedChannelId, setSelectedChannelId] = useState<string>('ACT-01');
  const [isWaveformRunning, setIsWaveformRunning] = useState<boolean>(true);
  const [timebaseMs, setTimebaseMs] = useState<number>(50);

  // Closed loop PID parameters
  const [kp, setKp] = useState<number>(4.2);
  const [ki, setKi] = useState<number>(0.85);
  const [kd, setKd] = useState<number>(0.18);
  const [microstepping, setMicrostepping] = useState<string>('1/32');
  const [holdCurrentPct, setHoldCurrentPct] = useState<number>(60);
  const [closedLoopEnabled, setClosedLoopEnabled] = useState<boolean>(true);

  // Canvas waveform ref
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const waveformPhaseRef = useRef<number>(0);

  const selectedActuator =
    actuators.find((a) => a.channelId === selectedChannelId) || actuators[0];

  // Periodic telemetry jitter simulation
  useEffect(() => {
    if (isEStopped) return;
    const interval = setInterval(() => {
      setActuators((prev) =>
        prev.map((act) => {
          const jitter = (Math.random() - 0.5) * 0.05;
          const newCurrent = Math.max(0.1, Number((act.currentAmps + jitter).toFixed(2)));
          const newTorque = Math.max(0, Number((act.torqueNm + jitter * 0.4).toFixed(2)));
          const newTemp = Number((act.temperatureC + (Math.random() - 0.48) * 0.1).toFixed(1));
          return {
            ...act,
            currentAmps: newCurrent,
            torqueNm: newTorque,
            temperatureC: newTemp,
            encoderTicks: act.encoderTicks + Math.floor(Math.random() * 8),
          };
        })
      );
    }, 600);

    return () => clearInterval(interval);
  }, [isEStopped]);

  // Real-time oscilloscope canvas animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const renderOscilloscope = () => {
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);

      // Background
      ctx.fillStyle = '#070b14';
      ctx.fillRect(0, 0, width, height);

      // Grid lines
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.1)';
      ctx.lineWidth = 1;
      const gridSpacing = 32;
      for (let x = 0; x < width; x += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSpacing) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Center reference zero-line
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();
      ctx.setLineDash([]);

      if (isWaveformRunning && !isEStopped) {
        waveformPhaseRef.current += 0.08;
      }
      const phase = waveformPhaseRef.current;

      // Channel A: Motor Torque Waveform (Cyan)
      ctx.strokeStyle = '#00e5ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let x = 0; x < width; x++) {
        const t = (x / width) * 12 + phase;
        // Harmonic waveform
        const y =
          height / 2 +
          Math.sin(t * 1.5) * 35 +
          Math.sin(t * 4.5) * 8 +
          Math.sin(t * 9.0) * 3;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Channel B: Current Draw (Amber)
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let x = 0; x < width; x++) {
        const t = (x / width) * 12 + phase * 0.9;
        const y =
          height / 2 +
          Math.cos(t * 1.5) * 25 +
          Math.cos(t * 3.0) * 6;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Channel C: Vibration Jitter (Sky)
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.6)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x < width; x++) {
        const t = (x / width) * 20 + phase * 1.4;
        const y =
          height / 2 +
          Math.sin(t * 8) * 10 +
          (Math.random() - 0.5) * 4;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      if (isWaveformRunning && !isEStopped) {
        animId = requestAnimationFrame(renderOscilloscope);
      }
    };

    renderOscilloscope();

    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [isWaveformRunning, isEStopped, timebaseMs]);

  const handleTestStepPulse = () => {
    if (isEStopped) return;
    onAddLog({
      hexCode: '0x3F1A',
      subsystem: selectedActuator.name,
      level: 'NOMINAL',
      message: `Harmonic single-step excitation pulse injected. Settling overshoot: <1.4%, Rise time: 1.8ms.`,
    });
  };

  const handleRecalibrateEncoder = () => {
    if (isEStopped) return;
    onAddLog({
      hexCode: '0x09E2',
      subsystem: selectedActuator.name,
      level: 'INFO',
      message: `Linear index zero re-referenced. Quadrature encoder reset to absolute zero.`,
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {/* 4 ACTUATOR CHANNEL TILES */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {actuators.map((act) => {
          const isSelected = act.channelId === selectedChannelId;
          return (
            <div
              key={act.channelId}
              onClick={() => setSelectedChannelId(act.channelId)}
              className={`p-3.5 rounded-[4px] cursor-pointer transition-all select-none flex flex-col justify-between ${
                isSelected
                  ? 'bg-[#151e2e] border-2 border-[#00e5ff] shadow-[0_0_16px_rgba(0,229,255,0.25)]'
                  : 'panel-aerospace hover:border-[#38bdf8]/40'
              }`}
            >
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#38bdf8]/15">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#00e5ff] shadow-[0_0_6px_#00e5ff]" />
                  <span className="text-xs font-mono font-bold text-[#c3f5ff] uppercase">
                    {act.channelId}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-[#849396] bg-[#070b14] px-1.5 py-0.5 rounded-[2px] border border-[#38bdf8]/15">
                  {act.type}
                </span>
              </div>

              <div className="flex flex-col gap-1 mb-2 font-mono">
                <span className="text-xs font-semibold text-[#dfe2f0] truncate">{act.name}</span>
                <span className="text-[10px] text-[#849396]">{act.hardwareRef}</span>
              </div>

              {/* Mini gauges */}
              <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-2 border-t border-[#38bdf8]/10">
                <div>
                  <span className="text-[9px] text-[#849396] block">TORQUE</span>
                  <span className="font-bold text-[#00e5ff] tabular-nums">
                    {act.torqueNm.toFixed(2)} N·m
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-[#849396] block">CURRENT</span>
                  <span className="font-bold text-[#f59e0b] tabular-nums">
                    {act.currentAmps.toFixed(2)} A
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-[#849396] block">TEMP</span>
                  <span className="font-bold text-[#dfe2f0] tabular-nums">
                    {act.temperatureC.toFixed(1)} °C
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-[#849396] block">DUTY</span>
                  <span className="font-bold text-[#38bdf8] tabular-nums">
                    {act.dutyCyclePct.toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* DETAILED CHANNEL TELEMETRY & OSCILLOSCOPE */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* Oscilloscope Stream (7 cols) */}
        <div className="xl:col-span-7 flex flex-col gap-4">
          <IndustrialCard
            title={`Real-Time Multi-Channel Oscilloscope: ${selectedActuator.channelId}`}
            hardwareTag="[SCOPE.SIGNAL_BUS]"
            headerAction={
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsWaveformRunning(!isWaveformRunning)}
                  className="px-2 py-1 text-[10px] font-mono bg-[#070b14] border border-[#38bdf8]/20 text-[#38bdf8] hover:text-[#00e5ff] rounded-[2px] cursor-pointer"
                >
                  {isWaveformRunning ? 'PAUSE TRACE' : 'RUN TRACE'}
                </button>
              </div>
            }
          >
            <div className="flex flex-col gap-3">
              {/* Channel legends */}
              <div className="flex items-center gap-4 text-xs font-mono">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-1 bg-[#00e5ff] rounded-[1px]" />
                  <span className="text-[#00e5ff]">CH1: Dynamic Torque (N·m)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-1 bg-[#f59e0b] rounded-[1px]" />
                  <span className="text-[#f59e0b]">CH2: Motor Current (A)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-1 bg-[#38bdf8] rounded-[1px]" />
                  <span className="text-[#38bdf8]">CH3: Harmonic Jitter</span>
                </div>
              </div>

              {/* Canvas Oscilloscope Viewport */}
              <div className="w-full h-[260px] rounded-[2px] overflow-hidden border border-[#38bdf8]/20">
                <canvas ref={canvasRef} className="w-full h-full block" />
              </div>

              {/* Oscilloscope Timebase & Trigger Controls */}
              <div className="flex items-center justify-between text-xs font-mono pt-2 border-t border-[#38bdf8]/15">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-[#849396] uppercase">Timebase:</span>
                  {[20, 50, 100].map((ms) => (
                    <button
                      key={ms}
                      type="button"
                      onClick={() => setTimebaseMs(ms)}
                      className={`px-2 py-0.5 text-[10px] font-mono rounded-[2px] cursor-pointer ${
                        timebaseMs === ms
                          ? 'bg-[#00e5ff] text-[#070b14] font-bold'
                          : 'bg-[#070b14] text-[#849396] border border-[#38bdf8]/20'
                      }`}
                    >
                      {ms} ms/div
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-3 text-[11px] text-[#849396]">
                  <span>TRIGGER: AUTO (EDGE RISING)</span>
                  <span>•</span>
                  <span>SAMPLING: 24.0 kS/s</span>
                </div>
              </div>
            </div>
          </IndustrialCard>

          {/* Dual Segmented Meters for Channel */}
          <IndustrialCard
            title="Actuator Calibration Envelopes"
            hardwareTag={`[SYS.${selectedActuator.hardwareRef}]`}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SegmentedMeter
                label="Shaft Torque Envelope"
                value={selectedActuator.torqueNm}
                min={0}
                max={selectedActuator.maxTorqueNm || 5.0}
                unit="N·m"
                nominalRange={`0.5 - ${(selectedActuator.maxTorqueNm * 0.75).toFixed(1)} N·m`}
                warningThreshold={0.75}
                criticalThreshold={0.9}
              />

              <SegmentedMeter
                label="Current Draw (Phase RMS)"
                value={selectedActuator.currentAmps}
                min={0}
                max={selectedActuator.peakCurrentAmps || 4.0}
                unit="A"
                nominalRange={`0.8 - ${(selectedActuator.peakCurrentAmps * 0.7).toFixed(1)} A`}
                warningThreshold={0.7}
                criticalThreshold={0.88}
              />

              <SegmentedMeter
                label="Thermal Chamber Sensor"
                value={selectedActuator.temperatureC}
                min={15}
                max={85}
                unit="°C"
                nominalRange="20 - 45 °C"
                warningThreshold={0.65}
                criticalThreshold={0.85}
              />

              <SegmentedMeter
                label="Linear Velocity Tracking"
                value={selectedActuator.velocityMmS}
                min={0}
                max={500}
                unit="mm/s"
                nominalRange="50 - 350 mm/s"
              />
            </div>
          </IndustrialCard>
        </div>

        {/* Closed-Loop PID Tuning & Hardware Inspection (5 cols) */}
        <div className="xl:col-span-5 flex flex-col gap-4">
          {/* Actuator Macro Image Asset Display */}
          <IndustrialCard title="Actuator Mechanical Assembly" hardwareTag="[CNC.TITANIUM_HEAD]">
            <div className="flex flex-col gap-3">
              <div className="relative w-full h-[180px] rounded-[2px] overflow-hidden border border-[#38bdf8]/20 bg-[#070b14]">
                <img
                  src="/src/assets/images/actuator_stepper_assembly_1791393583361.jpg"
                  alt="Precision Actuator Stepper Assembly"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#070b14] via-transparent to-transparent opacity-80" />

                {/* Technical HUD callouts over image */}
                <div className="absolute top-2 left-2 px-2 py-0.5 bg-[#070b14]/85 border border-[#00e5ff]/40 text-[9px] font-mono text-[#00e5ff] rounded-[2px]">
                  OPTICAL ENCODER 4096 CPR
                </div>
                <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-[#070b14]/85 border border-[#38bdf8]/40 text-[9px] font-mono text-[#c3f5ff] rounded-[2px]">
                  HARMONIC DRIVE RATIO 50:1
                </div>
              </div>

              <div className="text-[11px] font-mono text-[#849396] flex items-center justify-between">
                <span>ENCODER COUNT: {selectedActuator.encoderTicks.toLocaleString()} TICKS</span>
                <span className="text-[#00e5ff]">BACKLASH &lt; 0.005 mm</span>
              </div>
            </div>
          </IndustrialCard>

          {/* PID Closed-Loop Tuning Controls */}
          <IndustrialCard title="Digital PID Closed-Loop Calibration" hardwareTag="[DSP.PID_LOOP]">
            <div className="flex flex-col gap-3">
              <RockerSwitch
                label="Closed Loop Servoing"
                checked={closedLoopEnabled}
                onChange={setClosedLoopEnabled}
                leftState="OPEN-LOOP"
                rightState="PID-LOCKED"
              />

              <div className="grid grid-cols-3 gap-2">
                <NumericStepper
                  label="Prop Gain (Kp)"
                  value={kp}
                  min={0.5}
                  max={20.0}
                  step={0.1}
                  onChange={setKp}
                />
                <NumericStepper
                  label="Integ Gain (Ki)"
                  value={ki}
                  min={0.0}
                  max={5.0}
                  step={0.05}
                  onChange={setKi}
                />
                <NumericStepper
                  label="Deriv Gain (Kd)"
                  value={kd}
                  min={0.0}
                  max={2.0}
                  step={0.02}
                  onChange={setKd}
                />
              </div>

              {/* Microstepping selector */}
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-[#849396] block mb-1.5">
                  Microstepping Resolution Mode
                </span>
                <div className="grid grid-cols-5 gap-1">
                  {['1/1', '1/4', '1/16', '1/32', '1/64'].map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setMicrostepping(mode)}
                      className={`py-1 text-[10px] font-mono rounded-[2px] transition-all cursor-pointer ${
                        microstepping === mode
                          ? 'bg-[#00e5ff] text-[#070b14] font-bold shadow-[0_0_8px_rgba(0,229,255,0.4)]'
                          : 'bg-[#070b14] text-[#849396] border border-[#38bdf8]/15 hover:text-[#dfe2f0]'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              <NumericStepper
                label="Idle Hold Current (%)"
                value={holdCurrentPct}
                min={10}
                max={100}
                step={5}
                unit="%"
                onChange={setHoldCurrentPct}
              />

              {/* Action buttons */}
              <div className="flex items-center gap-2 pt-2 border-t border-[#38bdf8]/15">
                <ActuatorButton
                  variant="primary"
                  onClick={handleTestStepPulse}
                  disabled={isEStopped}
                  className="flex-1"
                >
                  STEP EXCITATION PULSE
                </ActuatorButton>

                <ActuatorButton
                  variant="secondary"
                  onClick={handleRecalibrateEncoder}
                  disabled={isEStopped}
                  className="flex-1"
                >
                  ZERO ENCODER
                </ActuatorButton>
              </div>
            </div>
          </IndustrialCard>
        </div>
      </div>
    </div>
  );
};
