import React from 'react';

// 1. Data Chips & Telemetry Badges
// Compact rectangular modules featuring 1px corner tick marks, label-sm with tabular numerals, 4px pulsating LED indicator dot
interface TelemetryBadgeProps {
  label: string;
  value: string | number;
  unit?: string;
  status?: 'nominal' | 'warning' | 'stall' | 'calibrating';
  className?: string;
}

export const TelemetryBadge: React.FC<TelemetryBadgeProps> = ({
  label,
  value,
  unit,
  status = 'nominal',
  className = '',
}) => {
  const dotColor =
    status === 'nominal'
      ? 'bg-[#00e5ff] shadow-[0_0_8px_#00e5ff]'
      : status === 'warning'
      ? 'bg-[#f59e0b] shadow-[0_0_8px_#f59e0b]'
      : status === 'stall'
      ? 'bg-[#ef4444] shadow-[0_0_8px_#ef4444]'
      : 'bg-[#38bdf8] shadow-[0_0_8px_#38bdf8]';

  return (
    <div
      className={`relative inline-flex items-center gap-2 px-2.5 py-1 bg-[#0b1220] border border-[#38bdf8]/20 rounded-[2px] font-mono select-none ${className}`}
    >
      {/* 1px corner tick marks */}
      <span className="absolute -top-[1px] -left-[1px] w-1 h-1 border-t border-l border-[#00e5ff]/60 pointer-events-none" />
      <span className="absolute -top-[1px] -right-[1px] w-1 h-1 border-t border-r border-[#00e5ff]/60 pointer-events-none" />
      <span className="absolute -bottom-[1px] -left-[1px] w-1 h-1 border-b border-l border-[#00e5ff]/60 pointer-events-none" />
      <span className="absolute -bottom-[1px] -right-[1px] w-1 h-1 border-b border-r border-[#00e5ff]/60 pointer-events-none" />

      {/* 4px pulsating LED indicator dot */}
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor} animate-pulse shrink-0`} />

      <span className="text-[10px] uppercase font-mono tracking-wider text-[#849396]">
        {label}
      </span>
      <span className="text-xs font-mono font-semibold tabular-nums text-[#dfe2f0]">
        {value}
        {unit && <span className="text-[10px] text-[#849396] ml-0.5">{unit}</span>}
      </span>
    </div>
  );
};

// 2. Telemetry Gauges & Kinematic Meters
// Dual-scale segmented line bars for motor torque, spring tension, drop velocity, and pneumatic pressure
interface SegmentedMeterProps {
  label: string;
  value: number;
  min?: number;
  max: number;
  unit: string;
  segments?: number;
  warningThreshold?: number;
  criticalThreshold?: number;
  nominalRange?: string;
  secondaryValue?: number;
  secondaryUnit?: string;
  className?: string;
}

export const SegmentedMeter: React.FC<SegmentedMeterProps> = ({
  label,
  value,
  min = 0,
  max,
  unit,
  segments = 24,
  warningThreshold = 0.75,
  criticalThreshold = 0.9,
  nominalRange,
  secondaryValue,
  secondaryUnit,
  className = '',
}) => {
  const normalized = Math.max(0, Math.min(1, (value - min) / (max - min)));
  const filledCount = Math.round(normalized * segments);

  return (
    <div className={`flex flex-col gap-1.5 font-mono ${className}`}>
      <div className="flex items-center justify-between text-xs">
        <span className="text-[11px] uppercase tracking-wider text-[#849396] font-medium">
          {label}
        </span>
        <div className="flex items-baseline gap-2">
          {secondaryValue !== undefined && (
            <span className="text-[10px] text-[#849396] tabular-nums">
              ({secondaryValue.toFixed(1)} {secondaryUnit})
            </span>
          )}
          <span className="text-xs font-semibold tabular-nums text-[#c3f5ff]">
            {value.toFixed(2)}{' '}
            <span className="text-[10px] text-[#849396] font-normal">{unit}</span>
          </span>
        </div>
      </div>

      {/* Segmented bar track */}
      <div className="flex items-center gap-[3px] p-1 bg-[#070b14] border border-[#38bdf8]/15 rounded-[2px]">
        {Array.from({ length: segments }).map((_, i) => {
          const ratio = (i + 1) / segments;
          const isFilled = i < filledCount;
          let segmentColor = 'bg-[#1e293b]';

          if (isFilled) {
            if (ratio >= criticalThreshold) {
              segmentColor = 'bg-[#ef4444] shadow-[0_0_6px_#ef4444]';
            } else if (ratio >= warningThreshold) {
              segmentColor = 'bg-[#f59e0b] shadow-[0_0_6px_#f59e0b]';
            } else {
              segmentColor = 'bg-[#00e5ff] shadow-[0_0_4px_#00e5ff]';
            }
          }

          return (
            <div
              key={i}
              className={`h-3 flex-1 transition-all duration-150 rounded-[1px] ${segmentColor}`}
            />
          );
        })}
      </div>

      {/* Baseline tick marks and numeric scale */}
      <div className="flex justify-between items-center text-[9px] text-[#849396] px-0.5">
        <span>{min} {unit}</span>
        {nominalRange && <span className="text-[#38bdf8]/80">NOM: {nominalRange}</span>}
        <span>{max} {unit}</span>
      </div>
    </div>
  );
};

// 3. Structural Cards & Enclosures
// Layer 2 aerospace glass panels displaying diagnostic hardware metadata in top-right corner ([SYS.ACTUATOR_04])
// Modular structural separators with technical crosshairs (+) at panel intersections
interface IndustrialCardProps {
  title?: string;
  hardwareTag?: string;
  children: React.ReactNode;
  className?: string;
  headerAction?: React.ReactNode;
}

export const IndustrialCard: React.FC<IndustrialCardProps> = ({
  title,
  hardwareTag,
  children,
  className = '',
  headerAction,
}) => {
  return (
    <div
      className={`relative panel-aerospace rounded-[4px] p-4 text-[#dfe2f0] flex flex-col ${className}`}
    >
      {/* Corner crosshair markers (+) */}
      <span className="absolute -top-1.5 -left-1.5 text-[10px] text-[#38bdf8]/40 font-mono select-none pointer-events-none">
        +
      </span>
      <span className="absolute -top-1.5 -right-1.5 text-[10px] text-[#38bdf8]/40 font-mono select-none pointer-events-none">
        +
      </span>
      <span className="absolute -bottom-1.5 -left-1.5 text-[10px] text-[#38bdf8]/40 font-mono select-none pointer-events-none">
        +
      </span>
      <span className="absolute -bottom-1.5 -right-1.5 text-[10px] text-[#38bdf8]/40 font-mono select-none pointer-events-none">
        +
      </span>

      {(title || hardwareTag || headerAction) && (
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#38bdf8]/15">
          <div className="flex items-center gap-2">
            {title && (
              <h3 className="text-sm font-mono font-semibold tracking-wide text-[#c3f5ff] uppercase">
                {title}
              </h3>
            )}
          </div>
          <div className="flex items-center gap-3">
            {headerAction}
            {hardwareTag && (
              <span className="text-[10px] font-mono tracking-wider text-[#38bdf8]/70 bg-[#070b14] px-1.5 py-0.5 border border-[#38bdf8]/20 rounded-[2px]">
                {hardwareTag}
              </span>
            )}
          </div>
        </div>
      )}

      {children}
    </div>
  );
};

// 4. Primary Actuator Button
// #00e5ff solid fill with #070b14 bold monospace typography. Outer halo glow on hover. Active state simulates mechanical relay depression via a -1px y-axis translation and an inset stroke.
interface ActuatorButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  glow?: boolean;
}

export const ActuatorButton: React.FC<ActuatorButtonProps> = ({
  children,
  variant = 'primary',
  glow = true,
  className = '',
  disabled,
  ...props
}) => {
  if (variant === 'primary') {
    return (
      <button
        disabled={disabled}
        className={`relative inline-flex items-center justify-center gap-2 px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider text-[#070b14] bg-[#00e5ff] rounded-[2px] transition-all duration-100 select-none cursor-pointer ${
          glow ? 'hover:shadow-[0_0_18px_rgba(0,229,255,0.55)]' : ''
        } hover:bg-[#33ebff] active:translate-y-[1px] active:shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }

  // Secondary Controller: Semi-transparent #151e2e fill with a 1px border of rgba(56, 189, 248, 0.3). Text in #38bdf8.
  return (
    <button
      disabled={disabled}
      className={`relative inline-flex items-center justify-center gap-2 px-3.5 py-1.5 font-mono text-xs font-semibold uppercase tracking-wider text-[#38bdf8] bg-[#151e2e]/80 border border-[#38bdf8]/30 rounded-[2px] hover:border-[#00e5ff] hover:text-[#c3f5ff] hover:bg-[#1b273d] transition-all duration-100 select-none cursor-pointer active:translate-y-[1px] disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

// 5. Safety / Override E-Stop Button
// High-contrast textured warning pattern (diagonal amber hazard border) with amber typography and high-friction tactile states.
interface EStopButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  onEmergencyStop?: () => void;
}

export const EStopButton: React.FC<EStopButtonProps> = ({
  active = false,
  onEmergencyStop,
  className = '',
  ...props
}) => {
  return (
    <button
      onClick={onEmergencyStop}
      className={`relative inline-flex items-center justify-center gap-2 px-4 py-1.5 font-mono text-xs font-bold uppercase tracking-wider border-2 transition-all duration-100 select-none cursor-pointer ${
        active
          ? 'bg-[#ef4444] text-[#070b14] border-[#ffb4ab] shadow-[0_0_20px_rgba(239,68,68,0.7)] animate-pulse'
          : 'bg-[#0f131d] text-[#f59e0b] border-[#f59e0b] hover:bg-[#f59e0b]/15 hover:shadow-[0_0_16px_rgba(245,158,11,0.4)] active:translate-y-[1px]'
      } rounded-[2px] ${className}`}
      {...props}
    >
      <span className="w-2.5 h-2.5 bg-current rounded-full shrink-0" />
      <span>{active ? 'SYSTEM HALTED (E-STOP)' : 'EMERGENCY E-STOP'}</span>
    </button>
  );
};

// 6. Angular Industrial Checkbox
// Angular industrial brackets [ ] that animate into filled cyan targets [■]
interface IndustrialCheckboxProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  description?: string;
  className?: string;
}

export const IndustrialCheckbox: React.FC<IndustrialCheckboxProps> = ({
  label,
  checked,
  onChange,
  disabled = false,
  description,
  className = '',
}) => {
  return (
    <label
      className={`inline-flex items-start gap-2.5 font-mono cursor-pointer select-none ${
        disabled ? 'opacity-40 cursor-not-allowed' : 'hover:text-[#c3f5ff]'
      } ${className}`}
      onClick={(e) => {
        if (!disabled) {
          e.preventDefault();
          onChange(!checked);
        }
      }}
    >
      <div className="flex items-center gap-0.5 text-xs font-mono font-bold pt-0.5 shrink-0">
        <span className="text-[#38bdf8]/70">[</span>
        <span
          className={`w-2.5 h-2.5 inline-flex items-center justify-center text-[10px] leading-none transition-all duration-150 ${
            checked
              ? 'text-[#00e5ff] scale-100'
              : 'text-transparent scale-50'
          }`}
        >
          ■
        </span>
        <span className="text-[#38bdf8]/70">]</span>
      </div>

      <div className="flex flex-col">
        <span className="text-xs uppercase tracking-wider font-medium text-[#dfe2f0]">
          {label}
        </span>
        {description && (
          <span className="text-[11px] font-sans text-[#849396] leading-tight mt-0.5">
            {description}
          </span>
        )}
      </div>
    </label>
  );
};

// 7. Heavy Dual-Throw Rocker Switch
// Heavy dual-throw rocker switch aesthetics, complete with simulated LED state slits
interface RockerSwitchProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  leftState?: string;
  rightState?: string;
  disabled?: boolean;
  className?: string;
}

export const RockerSwitch: React.FC<RockerSwitchProps> = ({
  label,
  checked,
  onChange,
  leftState = 'DISENGAGED',
  rightState = 'ARMED',
  disabled = false,
  className = '',
}) => {
  return (
    <div className={`flex items-center justify-between gap-3 font-mono ${className}`}>
      <span className="text-xs uppercase tracking-wider text-[#849396]">{label}</span>
      <div
        onClick={() => !disabled && onChange(!checked)}
        className={`relative flex items-center p-0.5 w-24 h-7 bg-[#070b14] border border-[#38bdf8]/30 rounded-[2px] cursor-pointer select-none transition-all duration-150 ${
          disabled ? 'opacity-40 cursor-not-allowed' : 'hover:border-[#00e5ff]'
        }`}
      >
        {/* Rocker plate */}
        <div
          className={`w-1/2 h-full flex items-center justify-center rounded-[1px] transition-all duration-200 text-[9px] font-bold tracking-wider uppercase ${
            checked
              ? 'translate-x-full bg-[#151e2e] text-[#00e5ff] border border-[#00e5ff]/50 shadow-[0_0_8px_rgba(0,229,255,0.3)]'
              : 'translate-x-0 bg-[#1b2029] text-[#849396] border border-white/5'
          }`}
        >
          {/* LED slit */}
          <span
            className={`w-1 h-3 rounded-[0.5px] mr-1.5 transition-colors ${
              checked
                ? 'bg-[#00e5ff] shadow-[0_0_6px_#00e5ff]'
                : 'bg-[#3b494c]'
            }`}
          />
          <span>{checked ? rightState : leftState}</span>
        </div>
      </div>
    </div>
  );
};

// 8. Numeric Stepper with Tactile Increment Buttons
// Dark recessed bays (#070b14) framed with subtle titanium inset borders. Tactile +/- increment buttons.
interface NumericStepperProps {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  onChange: (val: number) => void;
  className?: string;
}

export const NumericStepper: React.FC<NumericStepperProps> = ({
  label,
  value,
  min = 0,
  max = 1000,
  step = 1,
  unit = '',
  onChange,
  className = '',
}) => {
  const handleDecrement = () => {
    const next = Math.max(min, Number((value - step).toFixed(2)));
    onChange(next);
  };

  const handleIncrement = () => {
    const next = Math.min(max, Number((value + step).toFixed(2)));
    onChange(next);
  };

  return (
    <div className={`flex flex-col gap-1 font-mono ${className}`}>
      <span className="text-[10px] uppercase tracking-wider text-[#849396]">{label}</span>
      <div className="flex items-center panel-recessed rounded-[2px] p-0.5">
        <button
          type="button"
          onClick={handleDecrement}
          disabled={value <= min}
          className="w-7 h-7 flex items-center justify-center text-xs font-bold text-[#38bdf8] bg-[#151e2e] hover:bg-[#1e293b] hover:text-[#00e5ff] active:translate-y-[1px] disabled:opacity-30 disabled:cursor-not-allowed rounded-[1px] cursor-pointer"
        >
          -
        </button>
        <div className="flex-1 flex items-center justify-center px-2 text-xs font-mono font-semibold tabular-nums text-[#dfe2f0]">
          {value}
          {unit && <span className="text-[10px] text-[#849396] ml-1">{unit}</span>}
        </div>
        <button
          type="button"
          onClick={handleIncrement}
          disabled={value >= max}
          className="w-7 h-7 flex items-center justify-center text-xs font-bold text-[#38bdf8] bg-[#151e2e] hover:bg-[#1e293b] hover:text-[#00e5ff] active:translate-y-[1px] disabled:opacity-30 disabled:cursor-not-allowed rounded-[1px] cursor-pointer"
        >
          +
        </button>
      </div>
    </div>
  );
};
