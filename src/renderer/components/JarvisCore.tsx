import React, { useEffect, useRef } from 'react';
import { Radio, Activity, Zap, AlertTriangle, ShieldCheck, Cpu } from 'lucide-react';
import { SystemStatus } from '../../shared/types';

interface VisionCoreProps {
  status: SystemStatus;
  audioLevel?: number; // 0 to 100 real-time volume
  interimTranscript?: string;
  lastTranscript?: string;
  lastResponse?: string;
  onCoreClick?: () => void;
  subtext?: string;
  compact?: boolean;
}

export const JarvisCore: React.FC<VisionCoreProps> = ({
  status,
  audioLevel = 0,
  interimTranscript,
  lastTranscript,
  onCoreClick,
  compact = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef({ status, audioLevel });
  stateRef.current = { status, audioLevel };

  // Holographic Wireframe Globe & Particle Rings Canvas Animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let angle = 0;
    let waveOffset = 0;
    const size = compact ? 280 : 420;
    canvas.width = size;
    canvas.height = size;
    const center = size / 2;
    const radius = compact ? 85 : 125;

    // Electrical particle sparks on the orbital trajectory
    const sparkCount = 14;
    const sparks: { angle: number; speed: number; dist: number; size: number }[] = [];
    for (let s = 0; s < sparkCount; s++) {
      sparks.push({
        angle: Math.random() * Math.PI * 2,
        speed: (Math.random() * 0.02 + 0.01) * (Math.random() > 0.5 ? 1 : -1),
        dist: radius * (1.1 + Math.random() * 0.4),
        size: Math.random() * 2 + 1,
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, size, size);

      const currentStatus = stateRef.current.status;
      const currentAudio = stateRef.current.audioLevel;

      const isListening = currentStatus === 'LISTENING';
      const isThinking = currentStatus === 'PROCESSING';
      const isExecuting = currentStatus === 'EXECUTING';
      const isError = currentStatus === 'ERROR';

      // Primary color definitions
      let primaryColor = 'rgba(0, 217, 255, ';
      let coreGlow = 'rgba(0, 217, 255, 0.4)';
      let speed = 0.008;

      if (isListening) {
        primaryColor = 'rgba(56, 225, 255, ';
        coreGlow = `rgba(0, 217, 255, ${0.45 + (currentAudio / 100) * 0.55})`;
        speed = 0.018 + (currentAudio / 100) * 0.035;
      } else if (isThinking) {
        primaryColor = 'rgba(245, 183, 0, ';
        coreGlow = 'rgba(245, 183, 0, 0.55)';
        speed = 0.024;
      } else if (isExecuting) {
        primaryColor = 'rgba(0, 230, 153, ';
        coreGlow = 'rgba(0, 230, 153, 0.5)';
        speed = 0.02;
      } else if (isError) {
        primaryColor = 'rgba(255, 59, 92, ';
        coreGlow = 'rgba(255, 59, 92, 0.55)';
        speed = 0.006;
      }

      angle += speed;
      waveOffset += 0.05;

      // 1. Horizontal Electric Holographic Sine Wave Across Sphere
      ctx.save();
      ctx.beginPath();
      const waveAmp = isListening ? 14 + (currentAudio / 100) * 35 : isThinking ? 16 : 8;
      const waveFreq = isListening ? 0.04 : 0.025;
      for (let x = 0; x <= size; x += 3) {
        const distFromCenter = Math.abs(x - center);
        const taper = Math.max(0, 1 - distFromCenter / (size * 0.55));
        const y =
          center +
          Math.sin(x * waveFreq + waveOffset) * waveAmp * taper +
          (isListening ? Math.cos(x * 0.08 + waveOffset * 2) * 6 * taper : 0);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = `${primaryColor}${isListening ? 0.8 : 0.25})`;
      ctx.lineWidth = isListening ? 2.2 : 1.2;
      ctx.shadowColor = '#00D9FF';
      ctx.shadowBlur = isListening ? 14 : 4;
      ctx.stroke();
      ctx.restore();

      // 2. Central Plasma Flare Flare & Expanding Ripples
      const grad = ctx.createRadialGradient(center, center, 0, center, center, radius);
      grad.addColorStop(0, coreGlow);
      grad.addColorStop(0.35, `${primaryColor}0.22)`);
      grad.addColorStop(0.7, `${primaryColor}0.06)`);
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(center, center, radius, 0, Math.PI * 2);
      ctx.fill();

      // 3. 3D Wireframe Longitudes (Meridians) with Perspective Distortion
      const meridians = 9;
      for (let i = 0; i < meridians; i++) {
        const offset = (i / meridians) * Math.PI + angle;
        const xRadius = Math.sin(offset) * radius;

        ctx.strokeStyle = `${primaryColor}${Math.abs(Math.sin(offset)) * 0.4 + 0.15})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(center, center, Math.abs(xRadius), radius, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Latitudes
      const parallels = 6;
      for (let j = 1; j < parallels; j++) {
        const yOffset = (j / parallels - 0.5) * 1.65 * radius;
        const curRadius = Math.sqrt(Math.max(0, radius * radius - yOffset * yOffset));

        ctx.strokeStyle = `${primaryColor}0.28)`;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.ellipse(center, center + yOffset, curRadius, curRadius * 0.32, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      // 4. Primary Tilted Planetary Orbital Ring
      ctx.save();
      ctx.translate(center, center);
      ctx.rotate(-0.35); // tilt angle
      ctx.strokeStyle = `${primaryColor}0.75)`;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.ellipse(0, 0, radius * 1.48, radius * 0.46, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Orbital glow nodes on primary ring
      const dotCount = 10;
      for (let d = 0; d < dotCount; d++) {
        const dotAngle = angle * 2.2 + (d * (Math.PI * 2)) / dotCount;
        const dx = Math.cos(dotAngle) * (radius * 1.48);
        const dy = Math.sin(dotAngle) * (radius * 0.46);
        ctx.fillStyle = d % 3 === 0 ? '#FFFFFF' : `${primaryColor}0.9)`;
        ctx.shadowColor = '#00D9FF';
        ctx.shadowBlur = d % 3 === 0 ? 8 : 4;
        ctx.beginPath();
        ctx.arc(dx, dy, d % 3 === 0 ? 2.5 : 1.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      ctx.restore();

      // 5. Secondary Counter-Rotating Orbital Ring
      ctx.save();
      ctx.translate(center, center);
      ctx.rotate(0.42);
      ctx.setLineDash([8, 12]);
      ctx.strokeStyle = `${primaryColor}0.45)`;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.ellipse(0, 0, radius * 1.34, radius * 0.4, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // 6. Flying Electrical Sparks / Data Flashes
      for (let sp of sparks) {
        sp.angle += sp.speed;
        const sx = center + Math.cos(sp.angle) * sp.dist;
        const sy = center + Math.sin(sp.angle) * (sp.dist * 0.6);

        ctx.fillStyle = '#FFFFFF';
        ctx.shadowColor = '#00D9FF';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(sx, sy, sp.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // 7. Dynamic Audio Burst / Sonic Ring when Listening
      if (isListening && currentAudio > 0) {
        ctx.save();
        ctx.strokeStyle = '#38E1FF';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        const wavePoints = 64;
        for (let w = 0; w <= wavePoints; w++) {
          const theta = (w / wavePoints) * Math.PI * 2;
          const noise = Math.sin(theta * 10 + angle * 12) * ((currentAudio / 100) * 20);
          const r = radius * 1.06 + noise;
          const wx = center + Math.cos(theta) * r;
          const wy = center + Math.sin(theta) * r;
          if (w === 0) ctx.moveTo(wx, wy);
          else ctx.lineTo(wx, wy);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, [compact]);

  const getStatusDetails = () => {
    switch (status) {
      case 'LISTENING':
        return {
          title: 'VISION',
          subtitle: 'LISTENING...',
          stateLabel: 'MICROPHONE ACTIVE (VAD)',
          color: 'text-vision-cyan',
          pillBg: 'bg-vision-cyan/20 text-vision-cyan border-vision-cyan/60 shadow-glow-cyan',
          dotColor: 'bg-vision-cyan animate-ping',
        };
      case 'PROCESSING':
        return {
          title: 'VISION',
          subtitle: 'THINKING...',
          stateLabel: 'REASONING & TOOL SELECTION',
          color: 'text-vision-gold',
          pillBg: 'bg-vision-gold/20 text-vision-gold border-vision-gold/60 shadow-glow-gold',
          dotColor: 'bg-vision-gold animate-spin',
        };
      case 'EXECUTING':
        return {
          title: 'VISION',
          subtitle: 'EXECUTING...',
          stateLabel: 'SYSTEM OPERATION IN PROGRESS',
          color: 'text-vision-success',
          pillBg: 'bg-vision-success/20 text-vision-success border-vision-success/60 shadow-glow-cyan',
          dotColor: 'bg-vision-success animate-pulse',
        };
      case 'ERROR':
        return {
          title: 'VISION',
          subtitle: 'ALERT',
          stateLabel: 'SYSTEM ATTENTION REQUIRED',
          color: 'text-vision-error',
          pillBg: 'bg-vision-error/20 text-vision-error border-vision-error/60 shadow-glow-error',
          dotColor: 'bg-vision-error',
        };
      case 'READY':
      case 'ONLINE':
      default:
        return {
          title: 'VISION',
          subtitle: 'SEE  •  UNDERSTAND  •  ACT',
          stateLabel: 'ONLINE  •  READY',
          color: 'text-vision-cyan',
          pillBg: 'bg-vision-panel text-vision-cyan border-vision-cyan/40 shadow-glow-cyan-sm',
          dotColor: 'bg-vision-cyan shadow-[0_0_8px_#00D9FF]',
        };
    }
  };

  const current = getStatusDetails();
  const orbSize = compact ? 280 : 420;

  return (
    <div className="relative flex flex-col items-center justify-center select-none w-full max-w-4xl mx-auto py-2">
      {/* Outer Holographic HUD Radial Track with Multi-Tier Rings */}
      <div 
        onClick={onCoreClick}
        className="relative flex items-center justify-center cursor-pointer group transition-all duration-300"
        style={{ width: `${orbSize + 40}px`, height: `${orbSize + 40}px` }}
        title="VISION Holographic Core — Click to activate voice or toggle state"
      >
        {/* Tier 1: Outer Reticle with Sector Corner Brackets */}
        <div className="absolute inset-0 rounded-full border border-vision-cyan/20 pointer-events-none group-hover:border-vision-cyan/50 transition-colors shadow-glow-cyan-sm"></div>
        
        {/* Tier 2: Clockwise Dashed Sector Ring */}
        <div className="absolute inset-3 rounded-full border border-dashed border-vision-cyan/25 animate-spin-slow pointer-events-none"></div>

        {/* Tier 3: Counter-Clockwise Segmented Arc Ring */}
        <div className="absolute inset-7 rounded-full border border-vision-border/50 border-t-vision-cyan/80 border-b-vision-teal/80 animate-spin-reverse pointer-events-none"></div>

        {/* Tier 4: Precision Degree Markings (000°, 090°, 180°, 270°) */}
        {!compact && (
          <>
            <span className="absolute top-1 text-[9px] font-mono tracking-widest text-vision-cyan/70 font-bold pointer-events-none">000°</span>
            <span className="absolute bottom-1 text-[9px] font-mono tracking-widest text-vision-cyan/70 font-bold pointer-events-none">180°</span>
            <span className="absolute left-1 text-[9px] font-mono tracking-widest text-vision-cyan/70 font-bold pointer-events-none">270°</span>
            <span className="absolute right-1 text-[9px] font-mono tracking-widest text-vision-cyan/70 font-bold pointer-events-none">090°</span>

            {/* Corner Tech Reticle Metadata Tags */}
            <div className="absolute top-4 left-6 text-[8px] font-mono text-vision-cyan/40 pointer-events-none">
              FREQ: 142.8 MHz
            </div>
            <div className="absolute top-4 right-6 text-[8px] font-mono text-vision-cyan/40 pointer-events-none">
              FLUX: 99.4%
            </div>
            <div className="absolute bottom-4 left-6 text-[8px] font-mono text-vision-cyan/40 pointer-events-none">
              SYNC: NOMINAL
            </div>
            <div className="absolute bottom-4 right-6 text-[8px] font-mono text-vision-cyan/40 pointer-events-none">
              CORE: ACTIVE
            </div>
          </>
        )}

        {/* 3D Holographic Canvas Globe with Rotating Longitudes & Waves */}
        <canvas
          ref={canvasRef}
          className="relative z-10 transition-transform duration-300 group-hover:scale-105"
        />

        {/* Center Illuminated Holographic Text Overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center z-20 pointer-events-none text-center">
          <div className="px-5 py-1.5 rounded-full bg-vision-bg/75 backdrop-blur-md border border-vision-cyan/30 shadow-glow-cyan-sm">
            <h1 className={`font-mono text-2xl md:text-3xl font-extrabold tracking-[0.25em] ${current.color} holo-text-shimmer`}>
              {current.title}
            </h1>
            <p className="font-mono text-[9px] md:text-[10px] tracking-[0.3em] uppercase text-vision-text-secondary mt-0.5 font-semibold">
              {current.subtitle}
            </p>
          </div>
        </div>

      </div>

      {/* Sleek, Uncluttered Status & Holographic Feedback Line */}
      <div className="mt-3 flex flex-col items-center justify-center min-h-[36px] z-20 select-none">
        {/* If there's an interim speech / narration feedback */}
        {interimTranscript ? (
          <div className="flex items-center space-x-2 px-4 py-1.5 rounded-full bg-vision-panel/90 backdrop-blur-md border border-vision-cyan/50 shadow-glow-cyan-sm animate-fade-in text-xs font-mono max-w-lg">
            {interimTranscript.startsWith('⚡') ? (
              <>
                <span className="text-vision-gold font-bold animate-pulse">⚡</span>
                <span className="text-vision-cyan font-medium">{interimTranscript.replace(/^⚡\s*/, '')}</span>
              </>
            ) : (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-vision-cyan animate-ping"></span>
                <span className="text-vision-text-muted text-[10px]">VOICE:</span>
                <span className="text-vision-cyan font-medium truncate">"{interimTranscript}"</span>
              </>
            )}
          </div>
        ) : status === 'LISTENING' ? (
          /* Live Audio Level Equalizer Bars when Listening */
          <div className="flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-vision-panel/90 border border-vision-cyan/50 shadow-glow-cyan-sm">
            <Radio className="w-3.5 h-3.5 text-vision-cyan animate-pulse" />
            <div className="flex items-center space-x-0.5 h-3.5">
              {[...Array(20)].map((_, i) => (
                <div
                  key={i}
                  className={`w-1 rounded-full transition-all duration-75 ${
                    i < (audioLevel / 5)
                      ? 'bg-vision-cyan shadow-[0_0_8px_#00D9FF]'
                      : 'bg-vision-border/60'
                  }`}
                  style={{
                    height: `${Math.max(4, Math.min(18, (i + 1) * 1.2 + (audioLevel / 7)))}px`,
                  }}
                />
              ))}
            </div>
            <span className="text-[10px] font-mono text-vision-cyan tracking-wider font-bold">LISTENING</span>
          </div>
        ) : status === 'PROCESSING' || status === 'EXECUTING' ? (
          /* Sleek Single-Line Processing Indicator */
          <div className="flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-vision-panel/90 border border-vision-gold/50 shadow-glow-gold-sm text-xs font-mono">
            <span className="w-2 h-2 rounded-full bg-vision-gold animate-ping"></span>
            <span className="text-vision-gold font-bold tracking-wider uppercase">
              {status === 'PROCESSING' ? 'REASONING & PLANNING' : 'EXECUTING ACTION'}
            </span>
          </div>
        ) : (
          /* Clean Standby State */
          <div className="flex items-center space-x-2 px-3 py-1 rounded-full text-[10px] font-mono tracking-widest text-vision-text-muted uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-vision-cyan/60 animate-pulse"></span>
            <span>CORE READY // STANDBY</span>
          </div>
        )}
      </div>
    </div>
  );
};
