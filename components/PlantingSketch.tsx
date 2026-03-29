
import React, { useMemo } from 'react';
import type { PlanResponse, SpeciesPlacement } from '../types';
import { PlantIcon } from './PlantIcon';
import { useI18n } from '../i18n';

interface PlantingSketchProps {
  plan: PlanResponse;
}

const strataOrder = { emergent: 4, high: 3, medium: 2, low: 1 };
const strataHeight = { emergent: '85%', high: '70%', medium: '50%', low: '25%' };

// Simple hashing function to get a color from a string
const stringToColor = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  let color = '#';
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xFF;
    color += ('00' + value.toString(16)).substr(-2);
  }
  return color;
};


export function PlantingSketch({ plan }: PlantingSketchProps) {
  const { t } = useI18n();
  const { consortium_pattern: pattern } = plan;

  const uniqueSpecies = useMemo(() => {
    const speciesMap = new Map<string, SpeciesPlacement>();
    pattern.forEach(p => {
      if (!speciesMap.has(p.species)) {
        speciesMap.set(p.species, p);
      }
    });
    return Array.from(speciesMap.values()).sort((a,b) => (strataOrder[b.strata] || 0) - (strataOrder[a.strata] || 0));
  }, [pattern]);

  const speciesColorMap = useMemo(() => {
    const map = new Map<string, string>();
    uniqueSpecies.forEach(s => map.set(s.species, stringToColor(s.species)));
    return map;
  }, [uniqueSpecies]);

  const { positions, totalWidth } = useMemo(() => {
      let currentPos = 0;
      const pos: number[] = [];
      if(!pattern || pattern.length === 0) return { positions: [], totalWidth: 0 };
      
      pattern.forEach(p => {
          pos.push(currentPos);
          // Use a default spacing if not provided to prevent totalWidth from being 0
          currentPos += p.spacing_meters || 2; 
      });

      // The total width should be the position of the last element + its own spacing
      const total = pos[pos.length -1] + (pattern[pattern.length-1].spacing_meters || 2);
      
      return { positions: pos, totalWidth: total };

  }, [pattern]);


  if (!pattern || pattern.length === 0) {
    return <p className="text-gray-500">{t('sketch.no_data')}</p>;
  }

  // For the top-down view, create a small representative grid
  const gridRows = 5;
  const gridCols = 8;
  const grid = Array.from({ length: gridRows * gridCols }, (_, i) => pattern[i % pattern.length]);

  return (
    <div className="space-y-6">
      {/* Side Profile View */}
      <div>
        <h4 className="font-semibold text-gray-700 mb-2">{t('sketch.side_profile')}</h4>
        <div className="relative w-full h-48 rounded-t-lg p-2 overflow-hidden" style={{ background: 'linear-gradient(to top, #A16207 20%, #E0F2FE 20%)' }}>
           <div className="relative w-full h-full">
            {pattern.map((plant, index) => (
              <React.Fragment key={`${plant.species}-${index}`}>
                <div
                    className="absolute bottom-0 transform -translate-x-1/2"
                    style={{ 
                    left: `${(positions[index] / totalWidth) * 100}%`,
                    height: strataHeight[plant.strata],
                    // base width on spacing to avoid overlap
                    width: `${((plant.spacing_meters || 2) / totalWidth) * 100}%`,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'flex-end',
                    }}
                    title={`${plant.species} (${plant.strata})`}
                >
                    <PlantIcon speciesName={plant.species} strata={plant.strata} className="h-full w-auto" />
                </div>
                {/* Spacing Label */}
                {index < pattern.length -1 && plant.spacing_meters > 0 && (
                     <div
                        className="absolute bottom-0 text-xs text-white font-bold"
                        style={{
                            left: `${((positions[index] + (plant.spacing_meters / 2)) / totalWidth) * 100}%`,
                            transform: 'translateX(-50%)',
                            padding: '2px 4px',
                            backgroundColor: 'rgba(0,0,0,0.5)',
                            borderRadius: '4px'
                        }}
                     >
                         {plant.spacing_meters}m
                     </div>
                )}
              </React.Fragment>
            ))}
           </div>
        </div>
      </div>

      {/* Top-Down View */}
      <div>
        <h4 className="font-semibold text-gray-700 mb-2">{t('sketch.top_down')}</h4>
        <div className="grid p-4 bg-lime-50 rounded-lg border border-lime-200" style={{ gridTemplateColumns: `repeat(${gridCols}, 1fr)`}}>
          {grid.map((plant, index) => (
             <div key={index} className="flex items-center justify-center aspect-square" title={plant.species}>
                <div 
                    className="w-3/4 h-3/4 rounded-full"
                    style={{ backgroundColor: speciesColorMap.get(plant.species) }}
                />
             </div>
          ))}
        </div>
      </div>
      
      {/* Legend */}
      <div>
        <h4 className="font-semibold text-gray-700 mb-2">{t('sketch.legend')}</h4>
        <div className="flex flex-wrap gap-4">
            {uniqueSpecies.map(plant => (
                <div key={plant.species} className="flex items-center space-x-2">
                    <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center">
                        <PlantIcon speciesName={plant.species} strata={plant.strata} className="h-full w-auto" />
                    </div>
                    <div>
                        <div className="font-medium text-sm text-gray-800">{plant.species}</div>
                        <div className="text-xs text-gray-500 capitalize">{plant.strata}</div>
                    </div>
                </div>
            ))}
        </div>
      </div>
    </div>
  );
}