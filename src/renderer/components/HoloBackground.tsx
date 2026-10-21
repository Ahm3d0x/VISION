import React, { useEffect, useRef } from 'react';
import { SystemStatus } from '../../shared/types';

interface HoloBackgroundProps {
  status?: SystemStatus;
  audioLevel?: number;
}

export const HoloBackground: React.FC<HoloBackgroundProps> = ({
  status = 'READY',
  audioLevel = 0,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stateRef = useRef({ status, audioLevel });
  stateRef.current = { status, audioLevel };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Particle pool: drifting quantum dust & data nodes
    const particleCount = 55;
    const particles: {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      alpha: number;
      hue: number;
    }[] = [];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        size: Math.random() * 2.2 + 0.8,
        alpha: Math.random() * 0.5 + 0.2,
        hue: Math.random() > 0.75 ? 45 : 195, // Amber or Cyan
      });
    }

    let radarAngle = 0;
    let pulseRadius = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      const currentStatus = stateRef.current.status;
      const currentAudio = stateRef.current.audioLevel;

      const isListening = currentStatus === 'LISTENING';
      const isThinking = currentStatus === 'PROCESSING';
      const isExecuting = currentStatus === 'EXECUTING';
      const isError = currentStatus === 'ERROR';

      // 1. Dynamic Reactive Ambient Glow controlled by VISION state
      const centerX = width / 2;
      const centerY = height * 0.42;

      let glowInner = 'rgba(0, 180, 255, 0.12)';
      let glowOuter = 'rgba(2, 24, 55, 0.05)';

      if (isListening) {
        const audioBoost = (currentAudio / 100) * 0.15;
        glowInner = `rgba(56, 225, 255, ${0.18 + audioBoost})`;
        glowOuter = 'rgba(0, 120, 220, 0.08)';
      } else if (isThinking) {
        glowInner = 'rgba(245, 183, 0, 0.18)';
        glowOuter = 'rgba(180, 100, 0, 0.08)';
      } else if (isExecuting) {
        glowInner = 'rgba(0, 230, 153, 0.18)';
        glowOuter = 'rgba(0, 120, 90, 0.08)';
      } else if (isError) {
        glowInner = 'rgba(255, 59, 92, 0.2)';
        glowOuter = 'rgba(120, 20, 40, 0.08)';
      }

      const grad = ctx.createRadialGradient(
        centerX,
        centerY,
        30,
        centerX,
        centerY,
        width * 0.7
      );
      grad.addColorStop(0, glowInner);
      grad.addColorStop(0.45, glowOuter);
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // 2. State-Driven Concentric Shockwave Ripples (Listening & Thinking)
      if (isListening || isThinking) {
        pulseRadius += isListening ? 2.5 + (currentAudio / 100) * 4 : 2;
        if (pulseRadius > width * 0.6) pulseRadius = 60;

        ctx.strokeStyle = isListening
          ? `rgba(0, 217, 255, ${Math.max(0, 0.35 - pulseRadius / (width * 0.6))})`
          : `rgba(245, 183, 0, ${Math.max(0, 0.35 - pulseRadius / (width * 0.6))})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(centerX, centerY, pulseRadius, 0, Math.PI * 2);
        ctx.stroke();
      }

      // 3. Quantum Particles: velocity and motion controlled by VISION state
      const speedMultiplier = isListening
        ? 1.8 + (currentAudio / 100) * 2
        : isThinking
        ? 2.2
        : isExecuting
        ? 2.5
        : 1.0;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // In Thinking mode, subtle vortex pull toward the center orb
        if (isThinking) {
          const dx = centerX - p.x;
          const dy = centerY - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > 80) {
            p.vx += (dx / dist) * 0.02;
            p.vy += (dy / dist) * 0.02;
          }
        }

        p.x += p.vx * speedMultiplier;
        p.y += p.vy * speedMultiplier;

        // Boundary wrap
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        // Particle hue follows VISION state
        let fillStyle = `rgba(0, 217, 255, ${p.alpha})`;
        if (isThinking) {
          fillStyle = p.hue === 45 ? `rgba(245, 183, 0, ${p.alpha * 1.2})` : `rgba(255, 215, 0, ${p.alpha})`;
        } else if (isExecuting) {
          fillStyle = `rgba(0, 230, 153, ${p.alpha * 1.2})`;
        } else if (isListening) {
          fillStyle = `rgba(56, 225, 255, ${p.alpha * 1.4})`;
        }

        ctx.fillStyle = fillStyle;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();

        // Connect nearby particles with subtle faint circuit lines
        const maxDist = isListening ? 130 : 95;
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < maxDist) {
            const lineAlpha = (1 - dist / maxDist) * (isListening ? 0.22 : 0.1);
            ctx.strokeStyle = isThinking
              ? `rgba(245, 183, 0, ${lineAlpha})`
              : `rgba(0, 217, 255, ${lineAlpha})`;
            ctx.lineWidth = 0.6;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      }

      // 4. Background Radar Ring in Top-Right
      radarAngle += isExecuting ? 0.03 : 0.008;
      const rx = width - 120;
      const ry = 100;
      ctx.strokeStyle = isThinking ? 'rgba(245, 183, 0, 0.08)' : 'rgba(0, 217, 255, 0.08)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(rx, ry, 70, 0, Math.PI * 2);
      ctx.arc(rx, ry, 40, 0, Math.PI * 2);
      ctx.stroke();

      // Radar sweeping beam
      const beamX = rx + Math.cos(radarAngle) * 70;
      const beamY = ry + Math.sin(radarAngle) * 70;
      ctx.strokeStyle = isThinking ? 'rgba(245, 183, 0, 0.25)' : 'rgba(0, 217, 255, 0.22)';
      ctx.beginPath();
      ctx.moveTo(rx, ry);
      ctx.lineTo(beamX, beamY);
      ctx.stroke();

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0 opacity-80"
    />
  );
};
