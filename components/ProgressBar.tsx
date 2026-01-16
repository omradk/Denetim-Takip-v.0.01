import React from 'react';

interface ProgressBarProps {
  percentage: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ percentage }) => {
  let colorClass = 'from-blue-500 to-blue-600';
  if (percentage === 100) colorClass = 'from-emerald-400 to-emerald-600';
  else if (percentage < 30) colorClass = 'from-rose-500 to-rose-600';
  else if (percentage < 70) colorClass = 'from-amber-400 to-amber-600';

  return (
    <div className="w-full bg-slate-100 rounded-full h-3 shadow-inner overflow-hidden">
      <div 
        className={`bg-gradient-to-r ${colorClass} h-full rounded-full transition-all duration-700 ease-out shadow-sm`} 
        style={{ width: `${percentage}%` }}
      ></div>
    </div>
  );
};