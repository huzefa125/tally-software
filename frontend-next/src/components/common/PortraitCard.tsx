import React from 'react';
import { cn } from '@/utils/utils';
import { ArrowRight } from 'lucide-react';

interface PortraitCardProps {
  imageSrc: string;
  eyebrow: string;
  title: string;
  className?: string;
  onClick?: () => void;
}

export const PortraitCard: React.FC<PortraitCardProps> = ({
  imageSrc,
  eyebrow,
  title,
  className,
  onClick,
}) => {
  return (
    <div className={cn("group relative flex flex-col items-center", className)}>
      {/* Absolute Ghost Watermark Text */}
      <div className="absolute -top-12 -left-12 opacity-[0.05] pointer-events-none select-none">
        <span className="text-[120px] font-medium leading-none whitespace-nowrap uppercase tracking-[-0.05em]">
          {title.split(' ')[0]}
        </span>
      </div>

      {/* Circular Portrait with Satellite CTA */}
      <div className="relative w-[280px] h-[280px] sm:w-[320px] sm:h-[320px] mb-8">
        <div className="w-full h-full rounded-full overflow-hidden shadow-2xl border-[1.5px] border-[#141413]/5">
          <img 
            src={imageSrc} 
            alt={title} 
            className="w-full h-full object-cover grayscale-[0.2] transition-transform duration-500 group-hover:scale-110"
          />
        </div>
        
        {/* Satellite Button */}
        <button 
          onClick={onClick}
          className="absolute bottom-[5%] right-[5%] w-[64px] h-[64px] bg-white rounded-full flex items-center justify-center shadow-lg border border-[#141413]/5 transition-transform hover:scale-110 active:scale-95 z-10"
        >
          <ArrowRight className="w-6 h-6 text-[#141413]" />
        </button>
      </div>

      {/* Content */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-1.5 mb-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#CF4500]" />
          <span className="text-[14px] font-bold tracking-[0.04em] uppercase text-[#141413]">
            {eyebrow}
          </span>
        </div>
        <h3 className="text-2xl font-medium text-[#141413] tracking-[-0.02em]">
          {title}
        </h3>
      </div>
    </div>
  );
};
