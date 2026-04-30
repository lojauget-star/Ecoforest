

import React, { useState } from 'react';
import type { PlanRequest } from '../types';
import { useI18n } from '../i18n';
import { Loader2, HelpCircle, ExternalLink, Apple, Leaf, Trees, Carrot, Info, X } from 'lucide-react';

interface PlanningFormProps {
  requestData: Partial<PlanRequest>;
  updateRequestData: (data: Partial<PlanRequest>) => void;
  onPlanRequest: () => void;
  isLoading: boolean;
  isEnriching: boolean;
}

const FieldSpinner: React.FC = () => (
    <svg className="animate-spin h-4 w-4 text-emerald-500 ml-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

// FIX: Add children to props type to allow component to have child elements.
const Label: React.FC<{ htmlFor?: string, className?: string, showSpinner?: boolean, children: React.ReactNode }> = ({ htmlFor, children, className, showSpinner }) => {
    return (
        <label htmlFor={htmlFor} className={`flex items-center text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 ${className}`}>
            {children}
            {showSpinner && <FieldSpinner />}
        </label>
    );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
    return <input {...props} className="w-full px-5 py-4 bg-gray-50/50 text-gray-900 border border-transparent focus:bg-white rounded-[1.25rem] focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none font-medium shadow-inner disabled:opacity-50 disabled:cursor-not-allowed" />
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
    return <select {...props} className="w-full px-5 py-4 bg-gray-50/50 text-gray-900 border border-transparent focus:bg-white rounded-[1.25rem] focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none font-medium shadow-inner appearance-none disabled:opacity-50 disabled:cursor-not-allowed" style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2310b981' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 1.25rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.25em'}} />
}


export function PlanningForm({ requestData, updateRequestData, onPlanRequest, isLoading, isEnriching }: PlanningFormProps) {
  const { t } = useI18n();
  const objectivesOptions = ["frutas", "biomassa", "madeira", "hortalicas"];
  const animalTypeOptions = ["none", "cattle_dairy", "cattle_beef", "sheep", "poultry", "swine"];
  const animalWelfareOptions = ["shade", "windbreak", "forage", "predator_protection"];
  const [speciesInput, setSpeciesInput] = useState('');
  const [showDisclaimer, setShowDisclaimer] = useState(true);

  const isObjectiveSelected = (requestData.objectives || []).length > 0;
  const hasArea = !!requestData.area_geojson;
  const canGenerate = hasArea && isObjectiveSelected;

  const handleObjectiveChange = (objective: string) => {
    const currentObjectives = requestData.objectives || [];
    const newObjectives = currentObjectives.includes(objective)
      ? currentObjectives.filter(o => o !== objective)
      : [...currentObjectives, objective];
    updateRequestData({ objectives: newObjectives });
  };

  const handleAnimalWelfareChange = (goal: string) => {
    const currentGoals = requestData.animal_welfare_goals || [];
    const newGoals = currentGoals.includes(goal)
      ? currentGoals.filter(g => g !== goal)
      : [...currentGoals, goal];
    updateRequestData({ animal_welfare_goals: newGoals });
  };

  const handleAddSpecies = () => {
    const trimmedInput = speciesInput.trim();
    if (trimmedInput && !(requestData.preferred_species || []).includes(trimmedInput)) {
      const newSpecies = [...(requestData.preferred_species || []), trimmedInput];
      updateRequestData({ preferred_species: newSpecies });
      setSpeciesInput('');
    }
  };
  
  const handleRemoveSpecies = (speciesToRemove: string) => {
    const newSpecies = (requestData.preferred_species || []).filter(s => s !== speciesToRemove);
    updateRequestData({ preferred_species: newSpecies });
  };

  const handleSpeciesInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddSpecies();
    }
  };
  
  return (
    <div className="space-y-12 animate-fade-in">
      {showDisclaimer && (
          <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex items-start gap-4 relative animate-fade-in shadow-sm">
              <div className="p-2 bg-blue-100 text-blue-600 rounded-xl flex-shrink-0">
                  <Info className="w-5 h-5" />
              </div>
              <div className="pr-8">
                  <p className="text-xs font-bold text-blue-900 mb-1">{t('disclaimer.title')}</p>
                  <p className="text-[10px] text-blue-700/80 leading-relaxed font-medium">
                      {t('disclaimer.p1')} {t('disclaimer.p2')}
                  </p>
              </div>
              <button 
                  onClick={() => setShowDisclaimer(false)}
                  className="absolute top-4 right-4 p-1 text-blue-400 hover:text-blue-600 transition-colors"
              >
                  <X className="w-4 h-4" />
              </button>
          </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-2">
            <h2 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight font-display leading-none uppercase">{t('form.title1')}</h2>
            <div className="bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">{t('form.step').replace('{current}', '1').replace('{total}', '2')}</span>
            </div>
        </div>
        <div className="h-1.5 w-12 bg-emerald-500 rounded-full mb-4"></div>
        <p className="text-gray-500 font-medium">{t('form.subtitle1')}</p>
      </div>
      
      <div className="space-y-6">
        <div>
          <Label>{t('form.area_label')}</Label>
          <div className="w-full px-5 py-4 bg-emerald-50/50 border border-emerald-100 rounded-[1.25rem] shadow-inner flex items-center justify-between">
            <span className="text-emerald-700 font-black text-lg font-mono">{requestData.area_ha?.toFixed(3) || '0.000'}</span>
            <span className="text-emerald-600 font-black text-[10px] uppercase tracking-widest">{t('form.hectares')}</span>
          </div>
          <p className="text-[10px] text-gray-400 font-medium mt-2">{t('form.area_note')}</p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="soil_type" showSpinner={isEnriching}>{t('form.soil_label')}</Label>
            <Select id="soil_type" value={requestData.soil_type} onChange={e => updateRequestData({ soil_type: e.target.value })} disabled={isEnriching}>
              <option value="argiloso">{t('form.soil_options.clay')}</option>
              <option value="arenoso">{t('form.soil_options.sandy')}</option>
              <option value="siltoso">{t('form.soil_options.silty')}</option>
              <option value="humifero">{t('form.soil_options.loamy')}</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="climate" showSpinner={isEnriching}>{t('form.climate_label')}</Label>
            <Select id="climate" value={requestData.climate} onChange={e => updateRequestData({ climate: e.target.value })} disabled={isEnriching}>
              <option value="subtropical_umido">{t('form.climate_options.subtropical')}</option>
              <option value="tropical">{t('form.climate_options.tropical')}</option>
              <option value="semiarido">{t('form.climate_options.semiarid')}</option>
              <option value="equatorial">{t('form.climate_options.equatorial')}</option>
            </Select>
          </div>
        </div>

        <div>
          <Label>{t('form.objectives_label')}</Label>
          <div className="grid grid-cols-2 gap-3 mt-4">
            {[
                { id: 'frutas', icon: <Apple className="w-4 h-4" /> },
                { id: 'biomassa', icon: <Leaf className="w-4 h-4" /> },
                { id: 'madeira', icon: <Trees className="w-4 h-4" /> },
                { id: 'hortalicas', icon: <Carrot className="w-4 h-4" /> }
            ].map(({ id, icon }) => (
              <button 
                key={id}
                onClick={() => handleObjectiveChange(id)}
                className={`flex items-center gap-3 p-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 active:scale-95 border ${
                  requestData.objectives?.includes(id)
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                    : 'bg-white text-gray-400 border-gray-100 hover:border-emerald-200 hover:text-emerald-600'
                }`}
              >
                {icon}
                {t(`form.objectives_options.${id}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Animal Integration Section */}
        <div className="pt-8 border-t border-white/20">
          <Label htmlFor="animal_type">{t('form.animal_type_label')}</Label>
          <Select 
            id="animal_type" 
            value={requestData.animal_type || 'none'} 
            onChange={e => updateRequestData({ animal_type: e.target.value })}
          >
            {animalTypeOptions.map(type => (
              <option key={type} value={type}>{t(`form.animal_type_options.${type}`)}</option>
            ))}
          </Select>
        </div>

        {requestData.animal_type && requestData.animal_type !== 'none' && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-300">
            <Label>{t('form.animal_welfare_label')}</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {animalWelfareOptions.map(goal => (
                <button 
                  key={goal}
                  onClick={() => handleAnimalWelfareChange(goal)}
                  className={`px-4 py-2 text-xs font-black uppercase tracking-widest rounded-full transition-all duration-300 active:scale-95 border ${
                    requestData.animal_welfare_goals?.includes(goal)
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                      : 'bg-white text-gray-400 border-gray-100 hover:border-emerald-200 hover:text-emerald-600'
                  }`}
                >
                  {t(`form.animal_welfare_options.${goal}`)}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="pt-8 border-t border-white/20">
            <Label htmlFor="preferred_species">{t('form.species_label')}</Label>
            <div className="flex gap-3">
                <Input 
                    id="preferred_species" 
                    type="text" 
                    value={speciesInput} 
                    onChange={e => setSpeciesInput(e.target.value)} 
                    onKeyDown={handleSpeciesInputKeyDown}
                    placeholder={t('form.species_placeholder')}
                />
                <button 
                  onClick={handleAddSpecies} 
                  type="button" 
                  className="px-6 py-4 bg-emerald-50 text-emerald-600 rounded-[1.25rem] border border-emerald-100 hover:bg-emerald-100 active:scale-95 font-black text-xs uppercase tracking-widest transition-all"
                >
                  {t('form.species_add')}
                </button>
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
                {(requestData.preferred_species || []).map(species => (
                    <div key={species} className="flex items-center bg-emerald-50 text-emerald-700 text-xs font-black uppercase tracking-widest pl-4 pr-2 py-1.5 rounded-full border border-emerald-100">
                        {species}
                        <button onClick={() => handleRemoveSpecies(species)} className="ml-2 w-5 h-5 flex items-center justify-center bg-white rounded-full text-emerald-400 hover:text-emerald-600 transition-colors">
                            &times;
                        </button>
                    </div>
                ))}
            </div>
        </div>
        
        <div>
            <div className="flex items-center gap-2 mb-2">
                <Label htmlFor="data_source_link" className="mb-0">{t('form.data_source_label')}</Label>
                <div className="group relative">
                    <HelpCircle className="w-3.5 h-3.5 text-gray-300 cursor-help" />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-3 bg-gray-900 text-white text-[9px] font-medium rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-xl">
                        {t('form.formats_accepted')}
                    </div>
                </div>
            </div>
            <div className="flex gap-3">
                <Input 
                    id="data_source_link"
                    type="url"
                    value={requestData.data_source_link || ''}
                    onChange={e => updateRequestData({ data_source_link: e.target.value })}
                    placeholder={t('form.data_source_placeholder')}
                />
                <button 
                    type="button"
                    onClick={() => updateRequestData({ data_source_link: 'https://www.infoteca.cnptia.embrapa.br/' })}
                    className="px-4 py-4 bg-gray-50 text-gray-400 rounded-[1.25rem] border border-gray-100 hover:bg-emerald-50 hover:text-emerald-600 active:scale-95 transition-all outline-none"
                    title="Ver exemplo"
                >
                    <ExternalLink className="w-5 h-5" />
                </button>
            </div>
             <p className="text-[10px] text-gray-400 font-medium mt-2 leading-relaxed">{t('form.data_source_note')}</p>
        </div>
      </div>

      <div className="pt-4">
        <div className="flex items-center justify-between mb-2">
            <h2 className="text-3xl font-black text-gray-900 tracking-tight font-display leading-none uppercase">{t('form.title2')}</h2>
            <div className="bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">{t('form.step').replace('{current}', '2').replace('{total}', '2')}</span>
            </div>
        </div>
        <p className="text-sm text-gray-500 font-medium mt-1">{t('form.subtitle2')}</p>
      </div>

      <div className="space-y-4">
        <button
            onClick={onPlanRequest}
            disabled={isLoading || !canGenerate}
            className={`w-full py-5 px-6 rounded-[1.5rem] font-black text-sm uppercase tracking-[0.2em] transition-all duration-300 ease-in-out flex items-center justify-center space-x-3 active:scale-[0.98] ${
                isLoading || !canGenerate
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                : 'bg-emerald-600 text-white shadow-[0_10px_30px_rgba(16,185,129,0.3)] hover:shadow-[0_15px_40px_rgba(16,185,129,0.4)]'
            }`}
        >
            {isLoading ? (
                <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>{t('form.button_loading')}</span>
                </>
            ) : (
            <span>{t('form.button_generate')}</span>
            )}
        </button>

        {!canGenerate && !isLoading && (
            <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 text-amber-700 rounded-xl border border-amber-100 animate-pulse-slow">
                <Info className="w-4 h-4 flex-shrink-0" />
                <p className="text-[10px] font-black uppercase tracking-wider">
                    {!hasArea ? t('form.draw_area_first') : !isObjectiveSelected ? t('form.select_objective_first') : ''}
                </p>
            </div>
        )}
      </div>
    </div>
  );
}
