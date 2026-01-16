import React from 'react';
import { DocStatus, STATUS_LABELS, STATUS_COLORS } from '../types';
import { CheckCircle, AlertCircle, Clock, Ban, ChevronDown } from 'lucide-react';

interface StatusSelectorProps {
  currentStatus: DocStatus;
  onChange: (status: DocStatus) => void;
}

export const StatusSelector: React.FC<StatusSelectorProps> = ({ currentStatus, onChange }) => {
  const getIcon = (status: DocStatus) => {
    switch (status) {
      case DocStatus.RECEIVED: return <CheckCircle className="w-4 h-4 mr-2" />;
      case DocStatus.ISSUE: return <AlertCircle className="w-4 h-4 mr-2" />;
      case DocStatus.NA: return <Ban className="w-4 h-4 mr-2" />;
      default: return <Clock className="w-4 h-4 mr-2" />;
    }
  };

  return (
    <div className="relative inline-block w-full sm:w-auto group">
      <select
        value={currentStatus}
        onChange={(e) => onChange(e.target.value as DocStatus)}
        className={`appearance-none w-full sm:w-44 pl-10 pr-10 py-2.5 text-sm font-semibold rounded-lg border shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-1 transition-all cursor-pointer ${STATUS_COLORS[currentStatus]}`}
      >
        {Object.entries(STATUS_LABELS).map(([key, label]) => (
          <option key={key} value={key} className="bg-white text-slate-700">
            {label}
          </option>
        ))}
      </select>
      
      {/* Left Icon */}
      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-current opacity-80">
        {getIcon(currentStatus)}
      </div>

      {/* Right Custom Arrow */}
      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-current opacity-60">
        <ChevronDown className="w-4 h-4" />
      </div>
    </div>
  );
};