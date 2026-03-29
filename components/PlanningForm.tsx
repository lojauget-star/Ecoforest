

import React, { useState } from 'react';
import type { PlanRequest } from '../types';
import { useI18n } from '../i18n';

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
        <label htmlFor={htmlFor} className={`flex items-center text-sm font-medium text-gray-600 mb-2 ${className}`}>
            {children}
            {showSpinner && <FieldSpinner />}
        </label>
    );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
    return <input {...props} className="w-full px-4 py-3 bg-gray-100 text-gray-900 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none transition duration-200 disabled:bg-gray-200 disabled:cursor-not-allowed" />
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
    return <select {...props} className="w-full px-4 py-3 bg-gray-100 text-gray-900 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none transition duration-200 appearance-none disabled:bg-gray-200 disabled:cursor-not-allowed" style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236B7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 1rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.25em'}} />
}


export function PlanningForm({ requestData, updateRequestData, onPlanRequest, isLoading, isEnriching }: PlanningFormProps) {
  const { t } = useI18n();
  const objectivesOptions = ["frutas", "biomassa", "madeira", "hortalicas"];
  const animalTypeOptions = ["none", "cattle_dairy", "cattle_beef", "sheep", "poultry", "swine"];
  const animalWelfareOptions = ["shade", "windbreak", "forage", "predator_protection"];
  const [speciesInput, setSpeciesInput] = useState('');

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
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">{t('form.title1')}</h2>
        <p className="text-sm text-gray-500 mt-1">{t('form.subtitle1')}</p>
      </div>
      
      <div className="space-y-4">
        <div>
          <Label>{t('form.area_label')}</Label>
          <div className="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-lg">
            <span className="text-gray-900 font-mono">{requestData.area_ha?.toFixed(3) || '0.000'}</span>
          </div>
          <p className="text-xs text-gray-500 mt-2">{t('form.area_note')}</p>
        </div>
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
        <div>
          <Label>{t('form.objectives_label')}</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {objectivesOptions.map(obj => (
              <button 
                key={obj}
                onClick={() => handleObjectiveChange(obj)}
                className={`px-3 py-1.5 text-sm font-semibold rounded-lg transition-all duration-200 border ${
                  requestData.objectives?.includes(obj)
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                }`}
              >
                {t(`form.objectives_options.${obj}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Animal Integration Section */}
        <div className="pt-4 border-t border-gray-200">
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
                  className={`px-3 py-1.5 text-sm font-semibold rounded-lg transition-all duration-200 border ${
                    requestData.animal_welfare_goals?.includes(goal)
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                  }`}
                >
                  {t(`form.animal_welfare_options.${goal}`)}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="pt-4 border-t border-gray-200">
            <Label htmlFor="preferred_species">{t('form.species_label')}</Label>
            <div className="flex gap-2">
                <Input 
                    id="preferred_species" 
                    type="text" 
                    value={speciesInput} 
                    onChange={e => setSpeciesInput(e.target.value)} 
                    onKeyDown={handleSpeciesInputKeyDown}
                    placeholder={t('form.species_placeholder')}
                />
                <button onClick={handleAddSpecies} type="button" className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg border border-gray-300 hover:bg-gray-300 active:bg-gray-400 font-semibold transition-colors">{t('form.species_add')}</button>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
                {(requestData.preferred_species || []).map(species => (
                    <div key={species} className="flex items-center bg-emerald-100 text-emerald-800 text-sm font-medium pl-3 pr-2 py-1 rounded-full">
                        {species}
                        <button onClick={() => handleRemoveSpecies(species)} className="ml-2 text-emerald-700 hover:text-emerald-900 font-bold">
                            &times;
                        </button>
                    </div>
                ))}
            </div>
        </div>
        <div>
            <Label htmlFor="data_source_link">{t('form.data_source_label')}</Label>
            <Input 
                id="data_source_link"
                type="url"
                value={requestData.data_source_link || ''}
                onChange={e => updateRequestData({ data_source_link: e.target.value })}
                placeholder={t('form.data_source_placeholder')}
            />
             <p className="text-xs text-gray-500 mt-2">{t('form.data_source_note')}</p>
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-gray-900 mt-8">{t('form.title2')}</h2>
        <p className="text-sm text-gray-500 mt-1">{t('form.subtitle2')}</p>
      </div>

      <button
        onClick={onPlanRequest}
        disabled={isLoading || !requestData.area_geojson}
        className="w-full bg-emerald-600 text-white font-bold py-3 px-4 rounded-lg transition-all duration-200 ease-in-out disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-soft hover:bg-emerald-700 active:bg-emerald-800"
      >
        {isLoading ? (
            <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>{t('form.button_loading')}</span>
            </>
        ) : (
          <span>{t('form.button_generate')}</span>
        )}
      </button>
    </div>
  );
}