export type PayloadType = 'avionics_unit' | 'optics_lens' | 'cryo_sample' | 'titanium_cylinder' | 'polymer_battery' | 'fluid_capsule';

export interface PayloadItem {
  id: string;
  name: string;
  category: PayloadType;
  weightGrams: number;
  lengthMm: number;
  diameterMm: number;
  fragilityRating: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  maxGForce: number;
  coilPitchMm: number;
  optimalRpm: number;
}

export interface CassetteSlot {
  slotId: string; // e.g. A1, A2, etc.
  row: 'A' | 'B' | 'C';
  col: number;
  payload: PayloadItem;
  stockCount: number;
  capacity: number;
  feederAngleDeg: number;
  coilPitchMm: number;
  status: 'READY' | 'DISPENSING' | 'EMPTY' | 'JAMMED' | 'CALIBRATING';
  temperatureC: number;
  totalDispenses: number;
}

export interface ActuatorChannel {
  channelId: string;
  name: string;
  type: 'STEPPER' | 'SERVO' | 'PNEUMATIC' | 'OPTICAL';
  hardwareRef: string;
  nominalVoltageV: number;
  currentAmps: number;
  peakCurrentAmps: number;
  torqueNm: number;
  maxTorqueNm: number;
  velocityMmS: number;
  temperatureC: number;
  status: 'NOMINAL' | 'WARNING' | 'STALL' | 'FAULT';
  dutyCyclePct: number;
  encoderTicks: number;
}

export interface KinematicVectorState {
  posX: number;
  posY: number;
  posZ: number;
  velX: number;
  velY: number;
  accelY: number;
  angularThetaDeg: number;
  springTensionN: number;
  normalForceN: number;
  dropVelocityMs: number;
  impactImpulseNs: number;
  opticalTransitTimeMs: number;
  gantryX: number;
  gantryZ: number;
}

export interface DiagnosticLog {
  id: string;
  timestamp: string;
  hexCode: string;
  subsystem: string;
  level: 'INFO' | 'NOMINAL' | 'WARN' | 'CRIT';
  message: string;
}

export interface FaultStates {
  coilJam: boolean;
  motorStall: boolean;
  pressureDrop: boolean;
  opticalMisalignment: boolean;
  doorInterlockBreach: boolean;
}
