import { useEffect, useState } from 'react';
import {
  RadarChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  ResponsiveContainer,
} from 'recharts';

interface StabilityScoreCardProps {
  score: number;
  subScores: {
    rhythmConsistency: number;
    cogStability: number;
    jointCoordination: number;
  };
}

export default function StabilityScoreCard({ score, subScores }: StabilityScoreCardProps) {
  const [displayScore, setDisplayScore] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(true);
    const duration = 1200;
    const steps = 60;
    const increment = score / steps;
    let current = 0;
    const stepTime = duration / steps;
    const timer = setInterval(() => {
      current += increment;
      if (current >= score) {
        setDisplayScore(Math.round(score));
        clearInterval(timer);
      } else {
        setDisplayScore(Math.round(current));
      }
    }, stepTime);
    return () => clearInterval(timer);
  }, [score]);

  const radius = 80;
  const stroke = 8;
  const normalizedRadius = radius - stroke / 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (displayScore / 100) * circumference;

  const radarData = [
    { dimension: 'Rhythm\nConsistency', value: subScores.rhythmConsistency },
    { dimension: 'COG\nStability', value: subScores.cogStability },
    { dimension: 'Joint\nCoordination', value: subScores.jointCoordination },
  ];

  return (
    <div
      className={`flex flex-col items-center rounded-2xl p-6 transition-all duration-700 ${loaded ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
      style={{ backgroundColor: '#1A1F2E' }}
    >
      <div
        className="relative flex items-center justify-center"
        style={{
          width: radius * 2,
          height: radius * 2,
          filter: 'drop-shadow(0 0 12px rgba(0, 240, 181, 0.35)) drop-shadow(0 0 24px rgba(99, 102, 241, 0.25))',
        }}
      >
        <svg
          width={radius * 2}
          height={radius * 2}
          className="rotate-[-90deg]"
        >
          <defs>
            <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00F0B5" />
              <stop offset="100%" stopColor="#6366F1" />
            </linearGradient>
          </defs>
          <circle
            cx={radius}
            cy={radius}
            r={normalizedRadius}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={stroke}
          />
          <circle
            cx={radius}
            cy={radius}
            r={normalizedRadius}
            fill="none"
            stroke="url(#scoreGradient)"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: 'stroke-dashoffset 0.05s linear' }}
          />
        </svg>
        <span
          className="absolute select-none"
          style={{
            fontFamily: "'Orbitron', monospace",
            fontSize: '2rem',
            fontWeight: 700,
            color: '#FFFFFF',
            textShadow: '0 0 20px rgba(0, 240, 181, 0.5)',
          }}
        >
          {displayScore}
        </span>
      </div>

      <p
        className="mt-3 text-sm tracking-widest uppercase"
        style={{ color: 'rgba(255,255,255,0.5)' }}
      >
        Stability Score
      </p>

      <div className="mt-6 w-full" style={{ height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
            <PolarGrid
              stroke="rgba(255,255,255,0.1)"
              strokeDasharray="3 3"
            />
            <PolarAngleAxis
              dataKey="dimension"
              tick={{
                fill: 'rgba(255,255,255,0.6)',
                fontSize: 11,
                fontFamily: "'Orbitron', monospace",
              }}
            />
            <Radar
              dataKey="value"
              stroke="#00F0B5"
              fill="#00F0B5"
              fillOpacity={0.15}
              strokeWidth={2}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      <style>{`
        @keyframes pulseGlow {
          0%, 100% {
            box-shadow: 0 0 20px rgba(0, 240, 181, 0.15), 0 0 40px rgba(99, 102, 241, 0.1);
          }
          50% {
            box-shadow: 0 0 30px rgba(0, 240, 181, 0.3), 0 0 60px rgba(99, 102, 241, 0.2);
          }
        }
      `}</style>
    </div>
  );
}
