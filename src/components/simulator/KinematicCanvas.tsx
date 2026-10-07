import React, { useRef, useEffect, useState } from 'react';
import { CassetteSlot } from '../../types/vendmech';

interface KinematicCanvasProps {
  selectedSlot: CassetteSlot;
  isDispensing: boolean;
  isEStopped: boolean;
  simulationPhase: string;
  progress: number; // 0 to 1
  gravity: number; // m/s^2
  coilFriction: number;
  showVectors: boolean;
  showGrid: boolean;
  onOpticalTrigger?: (transitTimeMs: number) => void;
  gantryManualOffset: { x: number; y: number };
}

export const KinematicCanvas: React.FC<KinematicCanvasProps> = ({
  selectedSlot,
  isDispensing,
  isEStopped,
  simulationPhase,
  progress,
  gravity,
  coilFriction,
  showVectors,
  showGrid,
  gantryManualOffset,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [crosshairPos, setCrosshairPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high-DPI
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Clear background
    ctx.fillStyle = '#070b14';
    ctx.fillRect(0, 0, width, height);

    // 1. Draw Technical Grid
    if (showGrid) {
      const gridSize = 30;
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.07)';
      ctx.lineWidth = 1;

      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Metric tick annotations
      ctx.fillStyle = 'rgba(132, 147, 150, 0.4)';
      ctx.font = '9px "JetBrains Mono", monospace';
      for (let x = 60; x < width; x += 120) {
        ctx.fillText(`${x}mm`, x + 3, 12);
      }
      for (let y = 60; y < height; y += 120) {
        ctx.fillText(`${y}mm`, 4, y - 3);
      }
    }

    // Geometry parameters
    const originX = 50;
    const originY = 60;
    const trayWidth = 260;
    const trayHeight = 80;
    const chuteX = originX + trayWidth + 40;
    const chuteY = originY + 20;
    const chuteWidth = 90;
    const chuteHeight = height - 140;
    const cradleY = height - 70;

    // 2. Draw Structural Chassis & Cassette Bay Frame
    ctx.save();
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.25)';
    ctx.lineWidth = 2;
    ctx.strokeRect(originX - 10, originY - 15, trayWidth + 20, trayHeight + 30);

    // Bay backplate
    ctx.fillStyle = '#0b1220';
    ctx.fillRect(originX - 8, originY - 13, trayWidth + 16, trayHeight + 26);

    // Slot label plate
    ctx.fillStyle = '#151e2e';
    ctx.fillRect(originX, originY - 12, 60, 16);
    ctx.fillStyle = '#00e5ff';
    ctx.font = 'bold 10px "JetBrains Mono", monospace';
    ctx.fillText(`BAY ${selectedSlot.slotId}`, originX + 6, originY);

    // Helical Coil Support Spindle & Guides
    ctx.strokeStyle = '#3b494c';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(originX + 10, originY + trayHeight / 2);
    ctx.lineTo(originX + trayWidth - 15, originY + trayHeight / 2);
    ctx.stroke();

    // 3. Draw Animated Helical Spiral Coil
    const coilTurns = 7;
    const coilLength = trayWidth - 30;
    const coilRadius = 24;
    const coilCenterY = originY + trayHeight / 2;
    const coilRotation = isDispensing ? (progress * Math.PI * 4) : 0;

    ctx.lineWidth = 3;
    for (let i = 0; i < coilTurns; i++) {
      const turnStartX = originX + 15 + (i * coilLength) / coilTurns;
      const turnEndX = originX + 15 + ((i + 1) * coilLength) / coilTurns;
      const wavePhase = coilRotation + i * 0.8;

      // Draw 3D-depth coil segment
      ctx.beginPath();
      ctx.strokeStyle = isDispensing ? '#00e5ff' : '#38bdf8';
      ctx.arc(
        (turnStartX + turnEndX) / 2,
        coilCenterY + Math.sin(wavePhase) * 6,
        coilRadius,
        0,
        Math.PI * 2
      );
      ctx.stroke();
    }

    // 4. Draw Drop Chute / Kinematic Tube
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
    ctx.lineWidth = 2;
    // Chute left wall
    ctx.beginPath();
    ctx.moveTo(chuteX, chuteY);
    ctx.lineTo(chuteX, chuteY + chuteHeight);
    ctx.lineTo(chuteX - 30, chuteY + chuteHeight + 25);
    ctx.stroke();
    // Chute right wall
    ctx.beginPath();
    ctx.moveTo(chuteX + chuteWidth, chuteY);
    ctx.lineTo(chuteX + chuteWidth, chuteY + chuteHeight);
    ctx.lineTo(chuteX + chuteWidth - 20, chuteY + chuteHeight + 25);
    ctx.stroke();

    // Damping deflectors inside chute
    ctx.strokeStyle = 'rgba(245, 158, 11, 0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(chuteX, chuteY + 120);
    ctx.lineTo(chuteX + 25, chuteY + 135);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(chuteX + chuteWidth, chuteY + 200);
    ctx.lineTo(chuteX + chuteWidth - 25, chuteY + 215);
    ctx.stroke();

    // 5. Optical Break-Beam Laser Sensor (Array at mid-chute)
    const laserY = chuteY + 160;
    const isBeamInterrupted = isDispensing && progress > 0.65 && progress < 0.85;

    // Sensor emitter & receiver blocks
    ctx.fillStyle = '#151e2e';
    ctx.fillRect(chuteX - 12, laserY - 6, 10, 12);
    ctx.fillRect(chuteX + chuteWidth + 2, laserY - 6, 10, 12);

    // Laser beam line
    ctx.beginPath();
    ctx.moveTo(chuteX, laserY);
    ctx.lineTo(chuteX + chuteWidth, laserY);
    if (isBeamInterrupted) {
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 10;
    } else {
      ctx.strokeStyle = '#00e5ff';
      ctx.lineWidth = 1.5;
      ctx.shadowColor = '#00e5ff';
      ctx.shadowBlur = 6;
    }
    ctx.stroke();
    ctx.shadowBlur = 0; // reset shadow

    // Laser annotation
    ctx.fillStyle = isBeamInterrupted ? '#ffb4ab' : '#849396';
    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.fillText(
      isBeamInterrupted ? '[LASER BEAM TRIPPED]' : 'OPTICAL GATE 12X',
      chuteX + 4,
      laserY - 8
    );

    // 6. Delivery Cradle & Deceleration Buffer
    ctx.fillStyle = '#0b1220';
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
    ctx.lineWidth = 2;
    ctx.fillRect(chuteX - 45, cradleY, chuteWidth + 40, 36);
    ctx.strokeRect(chuteX - 45, cradleY, chuteWidth + 40, 36);

    // Cradle damping springs
    ctx.strokeStyle = '#849396';
    ctx.lineWidth = 1.5;
    for (let s = 0; s < 3; s++) {
      const sx = chuteX - 25 + s * 35;
      ctx.beginPath();
      ctx.moveTo(sx, cradleY + 20);
      ctx.lineTo(sx + 5, cradleY + 25);
      ctx.lineTo(sx - 5, cradleY + 30);
      ctx.lineTo(sx, cradleY + 35);
      ctx.stroke();
    }

    ctx.fillStyle = progress >= 0.95 && isDispensing ? '#00e5ff' : '#849396';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillText(
      progress >= 0.95 && isDispensing ? '● PAYLOAD DELIVERED' : 'DELIVERY BAY [IDLE]',
      chuteX - 35,
      cradleY + 16
    );

    // 7. Calculate Dynamic Payload Position & Kinematics
    let payloadX = originX + 70;
    let payloadY = coilCenterY;
    let velX = 0;
    let velY = 0;

    if (isDispensing) {
      if (progress < 0.4) {
        // Phase 1: Helical translation along spindle
        const p1 = progress / 0.4;
        payloadX = originX + 70 + p1 * (trayWidth - 60);
        payloadY = coilCenterY;
        velX = 85; // mm/s
        velY = 0;
      } else if (progress < 0.9) {
        // Phase 2: Free fall through drop chute
        const p2 = (progress - 0.4) / 0.5;
        payloadX = chuteX + chuteWidth / 2 - 12 + Math.sin(p2 * Math.PI * 3) * 6;
        // Kinematic drop y = 0.5 * g * t^2
        const fallDist = cradleY - chuteY - 15;
        payloadY = chuteY + Math.pow(p2, 1.8) * fallDist;
        velX = Math.cos(p2 * Math.PI * 3) * 15;
        velY = Math.sqrt(2 * gravity * (payloadY - chuteY));
      } else {
        // Phase 3: Settled in cradle
        payloadX = chuteX + chuteWidth / 2 - 12;
        payloadY = cradleY + 8;
        velX = 0;
        velY = 0;
      }
    }

    // 8. Draw Payload Object with Category Specific Style
    ctx.save();
    ctx.translate(payloadX, payloadY);

    const category = selectedSlot.payload.category;
    let itemColor = '#00e5ff';
    if (category === 'optics_lens') itemColor = '#7bd0ff';
    if (category === 'cryo_sample') itemColor = '#38bdf8';
    if (category === 'titanium_cylinder') itemColor = '#dfe2f0';
    if (category === 'polymer_battery') itemColor = '#f59e0b';
    if (category === 'fluid_capsule') itemColor = '#c3f5ff';

    // Body
    ctx.fillStyle = itemColor;
    ctx.strokeStyle = '#070b14';
    ctx.lineWidth = 1.5;
    ctx.fillRect(-12, -12, 24, 24);
    ctx.strokeRect(-12, -12, 24, 24);

    // Inner mechanical crosshair or core
    ctx.fillStyle = '#070b14';
    ctx.beginPath();
    ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fill();

    // Mass label
    ctx.fillStyle = '#070b14';
    ctx.font = 'bold 8px "JetBrains Mono", monospace';
    ctx.fillText(`${selectedSlot.payload.weightGrams}g`, -10, 3);
    ctx.restore();

    // 9. Kinetic Vectors Overlay
    if (showVectors && isDispensing && progress < 0.95) {
      ctx.save();
      // Velocity vector (Electric Cyan)
      ctx.strokeStyle = '#00e5ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(payloadX, payloadY);
      ctx.lineTo(payloadX + velX * 0.4, payloadY + Math.min(60, velY * 3));
      ctx.stroke();

      // Vector arrowhead
      const arrowTipX = payloadX + velX * 0.4;
      const arrowTipY = payloadY + Math.min(60, velY * 3);
      ctx.fillStyle = '#00e5ff';
      ctx.beginPath();
      ctx.arc(arrowTipX, arrowTipY, 3, 0, Math.PI * 2);
      ctx.fill();

      // Vector label
      ctx.fillStyle = '#00e5ff';
      ctx.font = 'bold 9px "JetBrains Mono", monospace';
      ctx.fillText(
        `v: ${(velY / 10).toFixed(1)} m/s`,
        arrowTipX + 8,
        arrowTipY
      );

      // Normal / Gravity Vector (Amber)
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(payloadX, payloadY);
      ctx.lineTo(payloadX, payloadY + (gravity / 9.81) * 25);
      ctx.stroke();
      ctx.fillStyle = '#f59e0b';
      ctx.fillText(`g: ${gravity.toFixed(1)}`, payloadX - 42, payloadY + 20);

      ctx.restore();
    }

    // 10. Gantry Linear Elevator & Carriage
    const gantryBaseX = width - 110 + gantryManualOffset.x;
    const gantryCarriageY = isDispensing
      ? (progress < 0.5 ? originY + 40 : cradleY - 10)
      : (originY + 40 + gantryManualOffset.y);

    // Gantry vertical rail
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(gantryBaseX, 30);
    ctx.lineTo(gantryBaseX, height - 30);
    ctx.stroke();

    // Linear encoder strip
    ctx.strokeStyle = '#00daf3';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(gantryBaseX - 3, 30);
    ctx.lineTo(gantryBaseX - 3, height - 30);
    ctx.stroke();

    // Gantry movable carriage head
    ctx.fillStyle = '#151e2e';
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5;
    ctx.fillRect(gantryBaseX - 22, gantryCarriageY - 18, 44, 36);
    ctx.strokeRect(gantryBaseX - 22, gantryCarriageY - 18, 44, 36);

    // Gantry gripper arm
    ctx.fillStyle = '#00e5ff';
    ctx.fillRect(gantryBaseX - 48, gantryCarriageY - 4, 26, 8);

    ctx.fillStyle = '#38bdf8';
    ctx.font = '8px "JetBrains Mono", monospace';
    ctx.fillText('GANTRY Z', gantryBaseX - 20, gantryCarriageY + 28);

    // 11. Crosshair inspection when hovering
    if (crosshairPos) {
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.4)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);

      // horizontal
      ctx.beginPath();
      ctx.moveTo(0, crosshairPos.y);
      ctx.lineTo(width, crosshairPos.y);
      ctx.stroke();

      // vertical
      ctx.beginPath();
      ctx.moveTo(crosshairPos.x, 0);
      ctx.lineTo(crosshairPos.x, height);
      ctx.stroke();

      ctx.setLineDash([]); // reset dash

      // Coordinate chip
      ctx.fillStyle = '#070b14';
      ctx.fillRect(crosshairPos.x + 8, crosshairPos.y - 18, 90, 16);
      ctx.strokeStyle = '#00e5ff';
      ctx.strokeRect(crosshairPos.x + 8, crosshairPos.y - 18, 90, 16);

      ctx.fillStyle = '#00e5ff';
      ctx.font = '9px "JetBrains Mono", monospace';
      ctx.fillText(
        `X:${Math.round(crosshairPos.x)} Y:${Math.round(crosshairPos.y)}`,
        crosshairPos.x + 12,
        crosshairPos.y - 6
      );
    }

    // 12. E-Stop Alert Banner if halted
    if (isEStopped) {
      ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
      ctx.fillRect(0, height / 2 - 25, width, 50);
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.strokeRect(0, height / 2 - 25, width, 50);

      ctx.fillStyle = '#ffdad6';
      ctx.font = 'bold 14px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('CRITICAL: EMERGENCY STOP ACTIVE — KINEMATICS LOCKED', width / 2, height / 2 + 5);
      ctx.textAlign = 'left';
    }

    ctx.restore();
  }, [
    selectedSlot,
    isDispensing,
    isEStopped,
    simulationPhase,
    progress,
    gravity,
    coilFriction,
    showVectors,
    showGrid,
    crosshairPos,
    gantryManualOffset,
  ]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setCrosshairPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const handleMouseLeave = () => {
    setCrosshairPos(null);
  };

  return (
    <div className="relative w-full h-full min-h-[380px] bg-[#070b14] overflow-hidden rounded-[4px] border border-[#38bdf8]/20">
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="w-full h-full cursor-crosshair block"
      />

      {/* Floating HUD reticle indicators in top-left */}
      <div className="absolute top-2 left-2 flex items-center gap-2 pointer-events-none">
        <span className="text-[10px] font-mono tracking-wider text-[#38bdf8]/80 bg-[#070b14]/80 px-2 py-0.5 border border-[#38bdf8]/20 rounded-[2px]">
          STAGE: {simulationPhase.toUpperCase()}
        </span>
        <span className="text-[10px] font-mono tracking-wider text-[#849396] bg-[#070b14]/80 px-2 py-0.5 border border-[#38bdf8]/15 rounded-[2px]">
          g = {gravity.toFixed(2)} m/s²
        </span>
      </div>
    </div>
  );
};
