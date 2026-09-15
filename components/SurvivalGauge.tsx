'use client';
import { getSurvivalColor } from '@/lib/utils';

interface SurvivalGaugeProps {
  score: number;
  size?: number;
  showLabel?: boolean;
}

export default function SurvivalGauge({ score, size = 120, showLabel = true }: SurvivalGaugeProps) {
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const safeScore = Math.max(0, Math.min(100, score));
  const offset = circumference - (safeScore / 100) * circumference;
  const color = getSurvivalColor(safeScore);

  return (
    <div className="survival-gauge" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={10}
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.8s ease, stroke 0.5s ease', filter: `drop-shadow(0 0 6px ${color}80)` }}
        />
      </svg>
      <div className="survival-gauge-center">
        <div className="survival-score-value" style={{ color }}>
          {safeScore}%
        </div>
        {showLabel && <div className="survival-score-label">Survival</div>}
      </div>
    </div>
  );
}
