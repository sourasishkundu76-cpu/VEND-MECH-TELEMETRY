import React from 'react';
import { EStopButton, ActuatorButton } from './IndustrialComponents';
import { Play } from 'lucide-react';

export type NavTabId = 'simulator' | 'telemetry' | 'cassette' | 'stress' | 'blueprint';

interface TopNavigationProps {
  currentTab: NavTabId;
  onSelectTab: (tab: NavTabId) => void;
  isEStopped: boolean;
  onToggleEStop: () => void;
  onTriggerQuickDispense: () => void;
}

export const TopNavigation: React.FC<TopNavigationProps> = ({
  currentTab,
  onSelectTab,
  isEStopped,
  onToggleEStop,
  onTriggerQuickDispense,
}) => {
  const navItems: { id: NavTabId; label: string }[] = [
    { id: 'simulator', label: 'Kinematic Simulator' },
    { id: 'telemetry', label: 'Actuator Telemetry' },
    { id: 'cassette', label: 'Cassette Matrix' },
    { id: 'stress', label: 'Stress Diagnostics' },
    { id: 'blueprint', label: 'Blueprint Inspector' },
  ];

  return (
    <header className="sticky top-0 z-50 w-full bg-[#0b1220]/90 backdrop-blur-md border-b border-[#38bdf8]/15 px-4 lg:px-6 py-3 flex items-center justify-between">
      {/* Zone 1: Single text element wordmark */}
      <div
        onClick={() => onSelectTab('simulator')}
        className="font-mono text-base lg:text-lg font-bold tracking-tight text-[#c3f5ff] uppercase select-none cursor-pointer hover:text-[#00e5ff] transition-colors whitespace-nowrap shrink-0"
      >
        VEND-MECH SYSTEMS
      </div>

      {/* Zone 2: 4-6 clean text navigation links */}
      <nav className="hidden md:flex items-center gap-6 text-xs lg:text-sm font-mono tracking-wider text-[#849396]">
        {navItems.map((item) => {
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`transition-colors whitespace-nowrap cursor-pointer py-1 ${
                isActive
                  ? 'text-[#00e5ff] border-b-2 border-[#00e5ff] font-semibold'
                  : 'hover:text-[#dfe2f0]'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Zone 3: 1-2 primary actions */}
      <div className="flex items-center gap-3 shrink-0">
        <ActuatorButton
          variant="primary"
          onClick={onTriggerQuickDispense}
          disabled={isEStopped}
          className="hidden sm:inline-flex"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>DISPENSE CYCLE</span>
        </ActuatorButton>

        <EStopButton
          active={isEStopped}
          onEmergencyStop={onToggleEStop}
        />
      </div>
    </header>
  );
};
