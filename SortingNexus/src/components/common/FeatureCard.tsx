import React from 'react';

interface FeatureCardProps {
  icon: string;
  title: string;
  description: string;
  color?: 'blue' | 'cyan' | 'purple';
}

const colorClasses: Record<string, string> = {
  blue: 'border-blue-500/30 hover:border-blue-500/50',
  cyan: 'border-cyan-500/30 hover:border-cyan-500/50',
  purple: 'border-purple-500/30 hover:border-purple-500/50'
};

const titleColorClasses: Record<string, string> = {
  blue: 'text-blue-400',
  cyan: 'text-cyan-400',
  purple: 'text-purple-400'
};

export const FeatureCard: React.FC<FeatureCardProps> = ({
  icon,
  title,
  description,
  color = 'blue'
}) => {
  return (
    <div className={`bg-gray-800 rounded-xl p-5 border transition-all hover:bg-gray-750 ${colorClasses[color]}`}>
      <span className="text-3xl block mb-3">{icon}</span>
      <h3 className={`font-semibold mb-2 ${titleColorClasses[color]}`}>{title}</h3>
      <p className="text-gray-500 text-sm leading-relaxed">{description}</p>
    </div>
  );
};

export default FeatureCard;
