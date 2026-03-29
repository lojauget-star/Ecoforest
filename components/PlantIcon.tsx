import React from 'react';

interface PlantIconProps {
  speciesName: string;
  strata: 'emergent' | 'high' | 'medium' | 'low';
  className?: string;
}

const PalmTree = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M50 95V40" stroke="#78350F" strokeWidth="4" strokeLinecap="round"/>
        <path d="M50 40C30 40 30 20 50 20C70 20 70 40 50 40Z" fill="#166534"/>
        <path d="M50 45C25 45 25 25 50 25C75 25 75 45 50 45Z" fill="#15803D"/>
        <path d="M50 50C20 50 20 30 50 30C80 30 80 50 50 50Z" fill="#16A34A"/>
    </svg>
);

const BroadleafTree = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M50 95V30" stroke="#78350F" strokeWidth="5" strokeLinecap="round"/>
        <circle cx="50" cy="25" r="25" fill="#166534"/>
        <circle cx="35" cy="30" r="15" fill="#15803D"/>
        <circle cx="65" cy="30" r="15" fill="#16A34A"/>
    </svg>
);

const Shrub = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M50 95V60" stroke="#78350F" strokeWidth="3" strokeLinecap="round"/>
        <circle cx="50" cy="50" r="20" fill="#65A30D"/>
        <circle cx="40" cy="55" r="15" fill="#84CC16"/>
        <circle cx="60" cy="55" r="15" fill="#A3E635"/>
    </svg>
);

const LowPlant = ({ className }: { className?: string }) => (
     <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M30 95L50 75L70 95" stroke="#BEF264" strokeWidth="4" strokeLinecap="round"/>
        <path d="M40 95L55 80L70 95" stroke="#A3E635" strokeWidth="4" strokeLinecap="round" />
        <path d="M50 95L60 85L70 95" stroke="#84CC16" strokeWidth="4" strokeLinecap="round" />
    </svg>
);


export function PlantIcon({ speciesName, strata, className }: PlantIconProps) {
  const lowerCaseName = speciesName.toLowerCase();
  
  if (lowerCaseName.includes('banana') || lowerCaseName.includes('pupunha') || lowerCaseName.includes('palmeira')) {
    return <PalmTree className={className} />;
  }
  
  switch (strata) {
    case 'emergent':
    case 'high':
      return <BroadleafTree className={className} />;
    case 'medium':
      return <Shrub className={className} />;
    case 'low':
      return <LowPlant className={className} />;
    default:
      return <Shrub className={className} />;
  }
}
