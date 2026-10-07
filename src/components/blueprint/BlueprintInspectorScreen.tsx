import React, { useState } from 'react';
import {
  IndustrialCard,
  IndustrialCheckbox,
  ActuatorButton,
  TelemetryBadge,
} from '../common/IndustrialComponents';
import { Ruler, Layers, Eye, Info } from 'lucide-react';

interface BlueprintHotspot {
  id: string;
  name: string;
  xPct: number;
  yPct: number;
  subsystem: string;
  spec: string;
  tolerance: string;
  material: string;
}

const BLUEPRINT_HOTSPOTS: BlueprintHotspot[] = [
  {
    id: 'hs-1',
    name: '3-Axis Cartesian Gantry Linear Guide',
    xPct: 76,
    yPct: 32,
    subsystem: 'SYS.GANTRY_Z',
    spec: 'THK SSR15 precision linear ball rail, dynamic load rating 14.2 kN',
    tolerance: '± 0.005 mm straightness over 900mm stroke',
    material: 'Case-hardened steel S55C, chrome treated',
  },
  {
    id: 'hs-2',
    name: 'Helical Feeder Spindle Assembly',
    xPct: 35,
    yPct: 42,
    subsystem: 'SYS.COIL_SPINDLE',
    spec: 'NEMA 23 2-phase hybrid stepper with zero-backlash Oldham coupler',
    tolerance: 'Angular backlash < 0.08° under 1.8 N·m holding torque',
    material: 'Anodized 6061-T6 aluminum spindle shaft',
  },
  {
    id: 'hs-3',
    name: '12-Beam Optical Gate Bracket',
    xPct: 56,
    yPct: 72,
    subsystem: 'SYS.OPTICAL_GATE',
    spec: 'Keyence infrared break-beam array with 850nm collimated laser diodes',
    tolerance: 'Response latency < 0.8ms, beam divergence < 1.2 mrad',
    material: 'Milled Delrin housing with sapphire protective windows',
  },
  {
    id: 'hs-4',
    name: 'Dynamic Chute Deceleration Cradle',
    xPct: 45,
    yPct: 88,
    subsystem: 'SYS.CHUTE_DAMPING',
    spec: 'Festo dual pneumatic deceleration dampers with silicone elastomer bed',
    tolerance: 'Absorbs up to 4.8 J kinetic energy with < 2.5G peak deceleration',
    material: 'Polyurethane memory foam over titanium baseplate',
  },
  {
    id: 'hs-5',
    name: 'Avionics Power & Controller Bay',
    xPct: 22,
    yPct: 18,
    subsystem: 'SYS.MCU_CORE',
    spec: 'STM32H7 480MHz dual-core ARM Cortex-M7 with dual CAN-FD transceivers',
    tolerance: 'Isolation 2.5 kV RMS, jitter < 50ns on PWM timer channels',
    material: 'EMI-shielded cast magnesium chassis',
  },
];

export const BlueprintInspectorScreen: React.FC = () => {
  const [selectedHotspot, setSelectedHotspot] = useState<BlueprintHotspot>(BLUEPRINT_HOTSPOTS[0]);
  const [showStructuralLayer, setShowStructuralLayer] = useState<boolean>(true);
  const [showWiringLayer, setShowWiringLayer] = useState<boolean>(true);
  const [showPneumaticsLayer, setShowPneumaticsLayer] = useState<boolean>(true);
  const [showKinematicBelts, setShowKinematicBelts] = useState<boolean>(true);

  // Digital Caliper Tool
  const [caliperActive, setCaliperActive] = useState<boolean>(false);
  const [caliperPts, setCaliperPts] = useState<{ x: number; y: number }[]>([]);
  const [caliperDistanceMm, setCaliperDistanceMm] = useState<number | null>(null);

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!caliperActive) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (caliperPts.length === 0 || caliperPts.length >= 2) {
      setCaliperPts([{ x, y }]);
      setCaliperDistanceMm(null);
    } else {
      const p1 = caliperPts[0];
      const p2 = { x, y };
      const pixelDist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      // Scale factor: assume container 800px width corresponds to 840mm
      const scaleMmPerPx = 1.05;
      const distMm = Number((pixelDist * scaleMmPerPx).toFixed(1));
      setCaliperPts([p1, p2]);
      setCaliperDistanceMm(distMm);
    }
  };

  const resetCaliper = () => {
    setCaliperPts([]);
    setCaliperDistanceMm(null);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* UPPER MAIN BLUEPRINT SCHEMATIC STAGE */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* CAD Schematic Canvas & Hotspot Overlay (8 cols) */}
        <div className="xl:col-span-8 flex flex-col gap-4">
          <IndustrialCard
            title="Vend-Mech Internal Chassis Exploded CAD Schematic"
            hardwareTag="[CAD.DWG_REV_E4]"
            headerAction={
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCaliperActive(!caliperActive);
                    resetCaliper();
                  }}
                  className={`px-2 py-1 text-[10px] font-mono rounded-[2px] transition-all cursor-pointer flex items-center gap-1 ${
                    caliperActive
                      ? 'bg-[#00e5ff] text-[#070b14] font-bold'
                      : 'bg-[#070b14] text-[#38bdf8] border border-[#38bdf8]/20 hover:border-[#00e5ff]'
                  }`}
                >
                  <Ruler className="w-3 h-3" />
                  <span>{caliperActive ? 'CALIPER ACTIVE' : 'DIGITAL CALIPER'}</span>
                </button>
              </div>
            }
          >
            <div className="flex flex-col gap-3">
              {/* CAD Rendering Container with Interactive Hotspots */}
              <div
                onClick={handleImageClick}
                className={`relative w-full h-[440px] rounded-[2px] overflow-hidden border border-[#38bdf8]/20 bg-[#070b14] select-none ${
                  caliperActive ? 'cursor-crosshair' : 'cursor-default'
                }`}
              >
                <img
                  src="/src/assets/images/vendmech_chassis_exploded_1791393568729.jpg"
                  alt="Vend-Mech Exploded CAD Schematic"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />

                {/* Subtle technical CAD blue-grid overlay */}
                <div className="absolute inset-0 bg-[#070b14]/20 pointer-events-none" />

                {/* Interactive Hotspot Pins */}
                {BLUEPRINT_HOTSPOTS.map((hs) => {
                  const isSelected = selectedHotspot.id === hs.id;
                  return (
                    <button
                      key={hs.id}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedHotspot(hs);
                      }}
                      style={{ left: `${hs.xPct}%`, top: `${hs.yPct}%` }}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 flex items-center justify-center cursor-pointer transition-transform ${
                        isSelected ? 'scale-125 z-20' : 'hover:scale-110 z-10'
                      }`}
                    >
                      <span className="relative flex h-6 w-6">
                        <span
                          className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                            isSelected ? 'bg-[#00e5ff]' : 'bg-[#38bdf8]'
                          }`}
                        />
                        <span
                          className={`relative inline-flex rounded-full h-6 w-6 items-center justify-center border font-mono text-[9px] font-bold ${
                            isSelected
                              ? 'bg-[#00e5ff] text-[#070b14] border-white shadow-[0_0_12px_#00e5ff]'
                              : 'bg-[#151e2e] text-[#c3f5ff] border-[#38bdf8]/60'
                          }`}
                        >
                          {hs.id.replace('hs-', '')}
                        </span>
                      </span>
                    </button>
                  );
                })}

                {/* Caliper Measurement Points & Line */}
                {caliperPts.map((p, i) => (
                  <div
                    key={i}
                    style={{ left: p.x, top: p.y }}
                    className="absolute -translate-x-1/2 -translate-y-1/2 w-3 h-3 border border-[#00e5ff] bg-[#00e5ff]/50 rounded-full pointer-events-none"
                  />
                ))}

                {caliperPts.length === 2 && (
                  <svg className="absolute inset-0 w-full h-full pointer-events-none">
                    <line
                      x1={caliperPts[0].x}
                      y1={caliperPts[0].y}
                      x2={caliperPts[1].x}
                      y2={caliperPts[1].y}
                      stroke="#00e5ff"
                      strokeWidth="2"
                      strokeDasharray="4 2"
                    />
                  </svg>
                )}

                {/* Caliper measurement badge overlay */}
                {caliperDistanceMm !== null && (
                  <div className="absolute bottom-4 left-4 p-2 bg-[#070b14]/90 border border-[#00e5ff] rounded-[2px] font-mono text-xs text-[#00e5ff] flex items-center gap-2 shadow-lg">
                    <Ruler className="w-4 h-4" />
                    <span>MEASURED CLEARANCE: <strong>{caliperDistanceMm} mm</strong></span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        resetCaliper();
                      }}
                      className="ml-2 text-[10px] text-[#849396] hover:text-[#dfe2f0] underline"
                    >
                      CLEAR
                    </button>
                  </div>
                )}
              </div>

              {/* Layer Filters */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-[#38bdf8]/15 font-mono text-xs">
                <span className="text-[10px] uppercase text-[#849396]">CAD Layer Filters:</span>
                <div className="flex flex-wrap items-center gap-4">
                  <IndustrialCheckbox
                    label="Frame 6061-T6"
                    checked={showStructuralLayer}
                    onChange={setShowStructuralLayer}
                  />
                  <IndustrialCheckbox
                    label="Wiring Harness"
                    checked={showWiringLayer}
                    onChange={setShowWiringLayer}
                  />
                  <IndustrialCheckbox
                    label="Pneumatics (6mm)"
                    checked={showPneumaticsLayer}
                    onChange={setShowPneumaticsLayer}
                  />
                  <IndustrialCheckbox
                    label="Drive Belts"
                    checked={showKinematicBelts}
                    onChange={setShowKinematicBelts}
                  />
                </div>
              </div>
            </div>
          </IndustrialCard>
        </div>

        {/* Selected Component Specification & Hotspot Inspector (4 cols) */}
        <div className="xl:col-span-4 flex flex-col gap-4">
          <IndustrialCard
            title="Component Engineering Dossier"
            hardwareTag={`[${selectedHotspot.subsystem}]`}
          >
            <div className="flex flex-col gap-3 font-mono text-xs">
              <div className="panel-recessed p-2.5 rounded-[2px] flex flex-col gap-1">
                <span className="text-[10px] uppercase text-[#849396]">Designation:</span>
                <span className="text-sm font-bold text-[#c3f5ff]">
                  {selectedHotspot.name}
                </span>
                <span className="text-[10px] text-[#00e5ff]">{selectedHotspot.subsystem}</span>
              </div>

              <div className="flex flex-col gap-2 panel-recessed p-2.5 rounded-[2px]">
                <div>
                  <span className="text-[9px] uppercase text-[#849396] block">
                    Engineering Specification:
                  </span>
                  <p className="text-[#dfe2f0] text-[11px] font-sans leading-relaxed mt-0.5">
                    {selectedHotspot.spec}
                  </p>
                </div>

                <div className="pt-2 border-t border-[#38bdf8]/15">
                  <span className="text-[9px] uppercase text-[#849396] block">
                    CNC Machining Tolerance:
                  </span>
                  <span className="text-[#00e5ff] text-xs font-semibold tabular-nums">
                    {selectedHotspot.tolerance}
                  </span>
                </div>

                <div className="pt-2 border-t border-[#38bdf8]/15">
                  <span className="text-[9px] uppercase text-[#849396] block">
                    Material Substrate:
                  </span>
                  <span className="text-[#dfe2f0] text-xs">
                    {selectedHotspot.material}
                  </span>
                </div>
              </div>

              {/* Quick Select Hotspots */}
              <div className="flex flex-col gap-1 pt-2 border-t border-[#38bdf8]/15">
                <span className="text-[10px] uppercase text-[#849396]">Subsystem Hotspots:</span>
                <div className="flex flex-col gap-1">
                  {BLUEPRINT_HOTSPOTS.map((hs) => (
                    <button
                      key={hs.id}
                      type="button"
                      onClick={() => setSelectedHotspot(hs)}
                      className={`p-1.5 text-left text-[11px] rounded-[2px] transition-all cursor-pointer flex items-center justify-between ${
                        selectedHotspot.id === hs.id
                          ? 'bg-[#151e2e] text-[#00e5ff] border border-[#00e5ff]/50'
                          : 'bg-[#070b14] text-[#849396] border border-[#38bdf8]/15 hover:text-[#dfe2f0]'
                      }`}
                    >
                      <span className="truncate">{hs.name}</span>
                      <span className="text-[9px] opacity-75">{hs.subsystem}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </IndustrialCard>
        </div>
      </div>

      {/* LOWER SPECIFICATION TABLE */}
      <IndustrialCard
        title="Vend-Mech Physical Chassis Architecture Datasheet"
        hardwareTag="[SPEC.HARDWARE_V1]"
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 font-mono text-xs">
          <div className="panel-recessed p-3 rounded-[2px] flex flex-col gap-1">
            <span className="text-[10px] text-[#849396] uppercase">Envelope Dimensions:</span>
            <span className="text-sm font-bold text-[#c3f5ff]">840 × 1280 × 620 mm</span>
            <span className="text-[10px] text-[#849396]">WIDTH × HEIGHT × DEPTH</span>
          </div>

          <div className="panel-recessed p-3 rounded-[2px] flex flex-col gap-1">
            <span className="text-[10px] text-[#849396] uppercase">Payload Mass Limit:</span>
            <span className="text-sm font-bold text-[#00e5ff]">1,500 g / bay</span>
            <span className="text-[10px] text-[#849396]">MAX TOTAL CAPACITY: 18.0 kg</span>
          </div>

          <div className="panel-recessed p-3 rounded-[2px] flex flex-col gap-1">
            <span className="text-[10px] text-[#849396] uppercase">Power Bus Architecture:</span>
            <span className="text-sm font-bold text-[#f59e0b]">48V DC, 15A Peak</span>
            <span className="text-[10px] text-[#849396]">INTERNAL STEP-DOWN 24V / 12V / 5V</span>
          </div>

          <div className="panel-recessed p-3 rounded-[2px] flex flex-col gap-1">
            <span className="text-[10px] text-[#849396] uppercase">Telemetry Interface:</span>
            <span className="text-sm font-bold text-[#38bdf8]">CAN-FD & Ethernet</span>
            <span className="text-[10px] text-[#849396]">1.0 Mbps DETERMINISTIC BUS</span>
          </div>
        </div>
      </IndustrialCard>
    </div>
  );
};
