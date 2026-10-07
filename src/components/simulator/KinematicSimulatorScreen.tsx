import React, { useState, useEffect, useRef } from 'react';
import { CassetteSlot, DiagnosticLog } from '../../types/vendmech';
import { KinematicCanvas } from './KinematicCanvas';
import {
  IndustrialCard,
  SegmentedMeter,
  TelemetryBadge,
  ActuatorButton,
  IndustrialCheckbox,
  NumericStepper,
} from '../common/IndustrialComponents';
import { Play, RotateCcw, Crosshair, ArrowUpDown, Zap } from 'lucide-react';

interface KinematicSimulatorScreenProps {
  slots: CassetteSlot[];
  selectedSlotId: string;
  onSelectSlot: (slotId: string) => void;
  isEStopped: boolean;
  onTriggerDispense: (slotId: string) => void;
  onAddLog: (log: Omit<DiagnosticLog, 'id' | 'timestamp'>) => void;
}

export const KinematicSimulatorScreen: React.FC<KinematicSimulatorScreenProps> = ({
  slots,
  selectedSlotId,
  onSelectSlot,
  isEStopped,
  onTriggerDispense,
  onAddLog,
}) => {
  const currentSlot = slots.find((s) => s.slotId === selectedSlotId) || slots[0];

  // Simulation physics parameters
  const [gravity, setGravity] = useState<number>(9.81);
  const [coilFriction, setCoilFriction] = useState<number>(0.12);
  const [simSpeed, setSimSpeed] = useState<number>(1.0);
  const [showVectors, setShowVectors] = useState<boolean>(true);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [gantryJog, setGantryJog] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Runtime animation state
  const [isDispensing, setIsDispensing] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [simPhase, setSimPhase] = useState<string>('idle');
  const animFrameRef = useRef<number | null>(null);

  // Derived telemetry metrics
  const massKg = currentSlot.payload.weightGrams / 1000;
  const theoreticalDropHeightM = 0.42;
  const dropVelocity = Math.sqrt(2 * gravity * theoreticalDropHeightM);
  const kineticEnergyJ = 0.5 * massKg * Math.pow(dropVelocity, 2);
  const normalForceN = massKg * gravity * Math.cos((currentSlot.feederAngleDeg * Math.PI) / 180);
  const impactImpulse = massKg * dropVelocity;

  // Run dispense sequence
  const startDispense = () => {
    if (isEStopped || isDispensing) return;

    setIsDispensing(true);
    setProgress(0);
    setSimPhase('gantry_indexing');

    onAddLog({
      hexCode: '0x2A10',
      subsystem: 'KINEMATICS',
      level: 'INFO',
      message: `Dispense cycle initiated for Bay ${currentSlot.slotId} (${currentSlot.payload.name}).`,
    });

    onTriggerDispense(currentSlot.slotId);

    const startTime = performance.now();
    const duration = 2800 / simSpeed;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const rawProgress = Math.min(1, elapsed / duration);
      setProgress(rawProgress);

      if (rawProgress < 0.25) {
        setSimPhase('gantry_indexing');
      } else if (rawProgress < 0.55) {
        setSimPhase('helical_coil_rotation');
      } else if (rawProgress < 0.8) {
        setSimPhase('chute_freefall');
      } else if (rawProgress < 0.95) {
        setSimPhase('optical_gate_verification');
      } else {
        setSimPhase('cradle_damping');
      }

      if (rawProgress < 1) {
        animFrameRef.current = requestAnimationFrame(tick);
      } else {
        setIsDispensing(false);
        setSimPhase('delivery_ready');
        onAddLog({
          hexCode: '0x00F8',
          subsystem: 'OPTICAL_GATE',
          level: 'NOMINAL',
          message: `Break-beam verified: payload transit confirmed (dt=138.4ms, v=${dropVelocity.toFixed(2)}m/s).`,
        });
      }
    };

    animFrameRef.current = requestAnimationFrame(tick);
  };

  const handleResetStage = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    setIsDispensing(false);
    setProgress(0);
    setSimPhase('idle');
    setGantryJog({ x: 0, y: 0 });
  };

  const handleReverseUnwind = () => {
    if (isEStopped || isDispensing) return;
    onAddLog({
      hexCode: '0x1A09',
      subsystem: 'MOTOR_M1',
      level: 'WARN',
      message: `Reverse unwind 90° jog executed on Bay ${currentSlot.slotId} to clear helical coil lash.`,
    });
  };

  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
      {/* LEFT COLUMN: Configuration, Slot Picker & Variable Bounds (4 cols) */}
      <div className="xl:col-span-4 flex flex-col gap-4">
        {/* Slot Selector & Payload Specs */}
        <IndustrialCard
          title="Cassette Bay & Payload Index"
          hardwareTag={`[SYS.SLOT_${currentSlot.slotId}]`}
        >
          <div className="flex flex-col gap-3">
            <div>
              <span className="text-[10px] uppercase font-mono tracking-wider text-[#849396] mb-1.5 block">
                Select Cassette Bay
              </span>
              <div className="grid grid-cols-4 gap-1.5">
                {slots.map((s) => {
                  const isSelected = s.slotId === selectedSlotId;
                  return (
                    <button
                      key={s.slotId}
                      onClick={() => onSelectSlot(s.slotId)}
                      className={`px-2 py-1.5 font-mono text-xs font-semibold rounded-[2px] transition-all select-none cursor-pointer flex flex-col items-center ${
                        isSelected
                          ? 'bg-[#00e5ff] text-[#070b14] shadow-[0_0_10px_rgba(0,229,255,0.4)]'
                          : 'bg-[#070b14] text-[#bac9cc] border border-[#38bdf8]/20 hover:border-[#38bdf8] hover:text-[#c3f5ff]'
                      }`}
                    >
                      <span>{s.slotId}</span>
                      <span className="text-[9px] opacity-75">{s.stockCount}x</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Payload Metadata Detail Card */}
            <div className="panel-recessed p-2.5 rounded-[2px] flex flex-col gap-1.5 text-xs font-mono">
              <div className="flex items-center justify-between">
                <span className="text-[#849396] text-[10px] uppercase">Payload ID:</span>
                <span className="text-[#c3f5ff] font-semibold">{currentSlot.payload.id}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#849396] text-[10px] uppercase">Designation:</span>
                <span className="text-[#dfe2f0] truncate max-w-[190px]">
                  {currentSlot.payload.name}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#38bdf8]/15 text-[11px]">
                <div>
                  <span className="text-[#849396] block text-[9px]">MASS</span>
                  <span className="text-[#00e5ff] font-bold tabular-nums">
                    {currentSlot.payload.weightGrams} g
                  </span>
                </div>
                <div>
                  <span className="text-[#849396] block text-[9px]">COIL PITCH</span>
                  <span className="text-[#00e5ff] font-bold tabular-nums">
                    {currentSlot.coilPitchMm} mm
                  </span>
                </div>
                <div>
                  <span className="text-[#849396] block text-[9px]">FRAGILITY</span>
                  <span
                    className={`font-bold ${
                      currentSlot.payload.fragilityRating === 'CRITICAL'
                        ? 'text-[#ef4444]'
                        : currentSlot.payload.fragilityRating === 'HIGH'
                        ? 'text-[#f59e0b]'
                        : 'text-[#38bdf8]'
                    }`}
                  >
                    {currentSlot.payload.fragilityRating}
                  </span>
                </div>
                <div>
                  <span className="text-[#849396] block text-[9px]">MAX G-FORCE</span>
                  <span className="text-[#dfe2f0] font-bold tabular-nums">
                    {currentSlot.payload.maxGForce.toFixed(1)} G
                  </span>
                </div>
              </div>
            </div>
          </div>
        </IndustrialCard>

        {/* Physics Variables & Environmental Bounds */}
        <IndustrialCard title="Kinematic Calibration Rails" hardwareTag="[PHYS.VAR_01]">
          <div className="flex flex-col gap-3">
            {/* Gravity Preset Chips */}
            <div>
              <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                <span className="text-[10px] uppercase tracking-wider text-[#849396]">
                  Gravitational Constant (g)
                </span>
                <span className="text-[#00e5ff] font-bold tabular-nums">{gravity.toFixed(2)} m/s²</span>
              </div>
              <div className="grid grid-cols-4 gap-1">
                {[
                  { name: 'EARTH', g: 9.81 },
                  { name: 'MARS', g: 3.71 },
                  { name: 'MOON', g: 1.62 },
                  { name: 'LOW-G', g: 0.5 },
                ].map((env) => (
                  <button
                    key={env.name}
                    type="button"
                    onClick={() => setGravity(env.g)}
                    className={`px-1.5 py-1 text-[10px] font-mono rounded-[2px] transition-all cursor-pointer ${
                      gravity === env.g
                        ? 'bg-[#151e2e] text-[#00e5ff] border border-[#00e5ff]'
                        : 'bg-[#070b14] text-[#849396] border border-[#38bdf8]/15 hover:text-[#dfe2f0]'
                    }`}
                  >
                    {env.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Friction & Simulation Speed Steppers */}
            <div className="grid grid-cols-2 gap-3">
              <NumericStepper
                label="Friction Coeff (μ)"
                value={coilFriction}
                min={0.02}
                max={0.5}
                step={0.02}
                onChange={(val) => setCoilFriction(val)}
              />
              <NumericStepper
                label="Sim Speed Mult"
                value={simSpeed}
                min={0.5}
                max={3.0}
                step={0.5}
                unit="x"
                onChange={(val) => setSimSpeed(val)}
              />
            </div>

            {/* Display HUD Overlays */}
            <div className="pt-2 border-t border-[#38bdf8]/15 flex flex-col gap-2">
              <IndustrialCheckbox
                label="Render Kinetic Vector Arrows"
                checked={showVectors}
                onChange={setShowVectors}
                description="Live velocity and normal force overlays"
              />
              <IndustrialCheckbox
                label="Display Metric Cadence Grid"
                checked={showGrid}
                onChange={setShowGrid}
                description="Overlay 30mm precision tick markers"
              />
            </div>
          </div>
        </IndustrialCard>

        {/* Manual Gantry Jogger Panel */}
        <IndustrialCard title="Cartesian Gantry Jogger" hardwareTag="[JOG.AXIS_XZ]">
          <div className="flex flex-col gap-2 font-mono text-xs">
            <span className="text-[10px] text-[#849396] uppercase">Manual Offset Jog</span>
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setGantryJog((prev) => ({ ...prev, x: prev.x - 15 }))}
                className="flex-1 py-1.5 bg-[#070b14] border border-[#38bdf8]/20 hover:border-[#00e5ff] text-[#38bdf8] text-xs font-semibold rounded-[2px] cursor-pointer"
              >
                ◀ JOG -X
              </button>
              <button
                type="button"
                onClick={() => setGantryJog((prev) => ({ ...prev, x: prev.x + 15 }))}
                className="flex-1 py-1.5 bg-[#070b14] border border-[#38bdf8]/20 hover:border-[#00e5ff] text-[#38bdf8] text-xs font-semibold rounded-[2px] cursor-pointer"
              >
                JOG +X ▶
              </button>
            </div>
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setGantryJog((prev) => ({ ...prev, y: prev.y - 15 }))}
                className="flex-1 py-1.5 bg-[#070b14] border border-[#38bdf8]/20 hover:border-[#00e5ff] text-[#38bdf8] text-xs font-semibold rounded-[2px] cursor-pointer"
              >
                ▲ JOG -Z (UP)
              </button>
              <button
                type="button"
                onClick={() => setGantryJog((prev) => ({ ...prev, y: prev.y + 15 }))}
                className="flex-1 py-1.5 bg-[#070b14] border border-[#38bdf8]/20 hover:border-[#00e5ff] text-[#38bdf8] text-xs font-semibold rounded-[2px] cursor-pointer"
              >
                ▼ JOG +Z (DN)
              </button>
            </div>
          </div>
        </IndustrialCard>
      </div>

      {/* CENTER & RIGHT COLUMN: Physics Canvas + Real-Time Telemetry HUD (8 cols) */}
      <div className="xl:col-span-8 flex flex-col gap-4">
        {/* Central Physics Viewport with Execution Controls */}
        <IndustrialCard
          title="Dynamic Dispense Simulation Stage"
          hardwareTag="[CANVAS.PHYSICS_ENGINE]"
          headerAction={
            <div className="flex items-center gap-2">
              <TelemetryBadge
                label="CYCLE PHASE"
                value={simPhase.toUpperCase()}
                status={isDispensing ? 'nominal' : 'calibrating'}
              />
            </div>
          }
        >
          <div className="flex flex-col gap-3">
            {/* The Canvas */}
            <div className="w-full h-[380px]">
              <KinematicCanvas
                selectedSlot={currentSlot}
                isDispensing={isDispensing}
                isEStopped={isEStopped}
                simulationPhase={simPhase}
                progress={progress}
                gravity={gravity}
                coilFriction={coilFriction}
                showVectors={showVectors}
                showGrid={showGrid}
                gantryManualOffset={gantryJog}
              />
            </div>

            {/* Actuator Execution Control Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#38bdf8]/15">
              <div className="flex items-center gap-2">
                <ActuatorButton
                  variant="primary"
                  onClick={startDispense}
                  disabled={isDispensing || isEStopped}
                  className="flex items-center gap-2"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>TRIGGER DISPENSE CYCLE</span>
                </ActuatorButton>

                <ActuatorButton
                  variant="secondary"
                  onClick={handleReverseUnwind}
                  disabled={isDispensing || isEStopped}
                  className="flex items-center gap-2"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>REVERSE UNWIND (90°)</span>
                </ActuatorButton>

                <ActuatorButton
                  variant="secondary"
                  onClick={handleResetStage}
                  className="flex items-center gap-2"
                >
                  <Crosshair className="w-3.5 h-3.5" />
                  <span>RESET STAGE</span>
                </ActuatorButton>
              </div>

              <div className="text-[11px] font-mono text-[#849396] flex items-center gap-3">
                <span>PROGRESS: {Math.round(progress * 100)}%</span>
                <span>•</span>
                <span className="text-[#00e5ff]">
                  v_term = {dropVelocity.toFixed(2)} m/s
                </span>
              </div>
            </div>
          </div>
        </IndustrialCard>

        {/* Real-Time Kinematic Telemetry Meters & Equation HUD */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <IndustrialCard title="Kinematic Vector Gauges" hardwareTag="[HUD.VECTOR_TELEMETRY]">
            <div className="flex flex-col gap-3">
              <SegmentedMeter
                label="Drop Terminal Velocity"
                value={isDispensing ? (progress > 0.4 ? dropVelocity : 0.85) : 0}
                min={0}
                max={4.5}
                unit="m/s"
                nominalRange="1.8 - 3.2 m/s"
                warningThreshold={0.7}
                criticalThreshold={0.88}
                secondaryValue={dropVelocity * 3.6}
                secondaryUnit="km/h"
              />

              <SegmentedMeter
                label="Normal Contact Force (Fn)"
                value={normalForceN}
                min={0}
                max={10.0}
                unit="N"
                nominalRange="2.0 - 7.5 N"
                warningThreshold={0.8}
                criticalThreshold={0.92}
              />

              <SegmentedMeter
                label="Helical Spring Tension"
                value={isDispensing ? 2.45 + Math.sin(progress * 10) * 0.8 : 1.1}
                min={0}
                max={5.0}
                unit="N·m"
                nominalRange="1.2 - 3.0 N·m"
              />
            </div>
          </IndustrialCard>

          <IndustrialCard title="Empirical Analytical Invariants" hardwareTag="[FORMULA.PHYSICS]">
            <div className="flex flex-col gap-2.5 font-mono text-xs">
              <div className="panel-recessed p-2 rounded-[2px] flex flex-col gap-1">
                <span className="text-[10px] text-[#849396] uppercase">
                  Kinetic Energy at Chute Landing:
                </span>
                <div className="flex items-baseline justify-between">
                  <span className="text-[#38bdf8]">Ek = ½ · m · v²</span>
                  <span className="text-base font-bold text-[#c3f5ff] tabular-nums">
                    {(kineticEnergyJ * 1000).toFixed(1)} mJ
                  </span>
                </div>
              </div>

              <div className="panel-recessed p-2 rounded-[2px] flex flex-col gap-1">
                <span className="text-[10px] text-[#849396] uppercase">
                  Impact Momentum Impulse (J):
                </span>
                <div className="flex items-baseline justify-between">
                  <span className="text-[#38bdf8]">J = ∫ F dt = m · Δv</span>
                  <span className="text-base font-bold text-[#00e5ff] tabular-nums">
                    {impactImpulse.toFixed(3)} N·s
                  </span>
                </div>
              </div>

              <div className="panel-recessed p-2 rounded-[2px] flex flex-col gap-1">
                <span className="text-[10px] text-[#849396] uppercase">
                  Calculated Transit Duration:
                </span>
                <div className="flex items-baseline justify-between">
                  <span className="text-[#38bdf8]">Δt = √(2h / g)</span>
                  <span className="text-base font-bold text-[#dfe2f0] tabular-nums">
                    {(Math.sqrt((2 * theoreticalDropHeightM) / gravity) * 1000).toFixed(1)} ms
                  </span>
                </div>
              </div>
            </div>
          </IndustrialCard>
        </div>
      </div>
    </div>
  );
};
