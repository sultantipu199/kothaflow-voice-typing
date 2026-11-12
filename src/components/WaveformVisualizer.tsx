import React, { useEffect, useRef } from 'react';
import { OverlayStatus } from '../types/voice';

interface WaveformVisualizerProps {
  status: OverlayStatus;
  analyserNode: AnalyserNode | null;
}

export const WaveformVisualizer: React.FC<WaveformVisualizerProps> = ({
  status,
  analyserNode,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number | null = null;
    const barCount = 28;
    const dataArray = analyserNode
      ? new Uint8Array(analyserNode.frequencyBinCount)
      : new Uint8Array(barCount);

    let tick = 0;

    const drawFrame = () => {
      tick += 1;
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      if (analyserNode && status === 'recording') {
        analyserNode.getByteFrequencyData(dataArray);
      }

      const gap = 4;
      const totalGap = gap * (barCount - 1);
      const barWidth = Math.max(2, Math.floor((width - totalGap) / barCount));

      for (let i = 0; i < barCount; i++) {
        let normalized = 0.14;

        if (status === 'recording') {
          if (analyserNode) {
            const val = dataArray[i % dataArray.length] || 0;
            normalized = Math.max(0.18, val / 255);
          } else {
            // Smooth acoustic wave when recording simulated sample clip
            const wave1 = Math.sin(tick * 0.18 + i * 0.45) * 0.35;
            const wave2 = Math.cos(tick * 0.11 - i * 0.25) * 0.25;
            normalized = Math.min(0.95, Math.max(0.18, 0.45 + wave1 + wave2));
          }
        } else if (status === 'processing') {
          normalized = 0.22 + Math.sin(tick * 0.2 + i * 0.3) * 0.12;
        }

        const barHeight = Math.max(4, Math.round(normalized * (height - 6)));
        const x = i * (barWidth + gap);
        const y = Math.round((height - barHeight) / 2);

        if (status === 'recording') {
          ctx.fillStyle = '#DC2626';
        } else if (status === 'processing') {
          ctx.fillStyle = '#D97706';
        } else if (status === 'done') {
          ctx.fillStyle = '#16A34A';
        } else {
          ctx.fillStyle = '#94A3B8';
        }

        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, 2);
        ctx.fill();
      }

      if (status === 'recording' || status === 'processing') {
        animId = window.requestAnimationFrame(drawFrame);
      }
    };

    drawFrame();

    return () => {
      if (animId !== null) {
        window.cancelAnimationFrame(animId);
      }
    };
  }, [status, analyserNode]);

  return (
    <canvas
      ref={canvasRef}
      width={240}
      height={36}
      className="w-[220px] h-9 block"
      aria-label={`Audio waveform visualizer (${status})`}
    />
  );
};
