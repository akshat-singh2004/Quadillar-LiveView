import React, { useState } from 'react';
import { Info } from 'lucide-react';

interface StatutoryInfoProps {
  standardRef: string; // e.g., "IS 456:2000 Cl. 26.4"
  title: string;
  idealRange: string;
  description: string;
}

export const StatutoryInfo: React.FC<StatutoryInfoProps> = ({ standardRef, title, idealRange, description }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative inline-flex items-center ml-1.5" onMouseEnter={() => setIsOpen(true)} onMouseLeave={() => setIsOpen(false)}>
      <Info className="w-3.5 h-3.5 text-cyan-500 hover:text-cyan-300 cursor-help transition-colors" />
      
      {isOpen && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-neutral-900 border border-neutral-700 rounded shadow-xl z-50 text-left">
          <div className="text-[9px] text-cyan-400 font-bold uppercase tracking-wider mb-1">{standardRef}</div>
          <div className="text-xs font-bold text-white mb-1">{title}</div>
          <div className="text-[10px] text-emerald-400 font-mono bg-black px-1.5 py-0.5 rounded inline-block mb-1.5">
            Target: {idealRange}
          </div>
          <p className="text-[10px] text-neutral-400 font-sans leading-relaxed">
            {description}
          </p>
        </div>
      )}
    </div>
  );
};
