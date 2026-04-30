import React, { useState, useEffect } from 'react';
import { useI18n } from '../i18n';
import { AlertCircle, CheckCircle2, Info, Loader2, MapPin, CloudLightning, ThermometerSun, Droplets, Wind, Search, Edit2, Activity, Thermometer, Sun, CloudRain, Calendar, AlertTriangle, Sprout, Plus, X, Trash2 } from 'lucide-react';
import { getClimateData, ClimateData } from '../services/climateService';
import { generateRiskReport, buildGeminiContext, buildObservationRecord, formatAlertForDisplay, RiskReport } from '../services/riskEngine';
import { analyzeVulnerability } from '../services/apiService';
import ReactMarkdown from 'react-markdown';

// Types
interface GeocodingResult {
  id: number;
  name: string;
  admin1?: string;
  country?: string;
  latitude: number;
  longitude: number;
}

interface BEAObservation {
  id: string;
  date: string;
  location: { lat: number; lng: number; name: string };
  climate_snapshot: { temperature_c: number; humidity: number; precipitation_mm: number; uv_index: number; alerts_active: number };
  animal: { species: string; behavior: string; occurrences: string; body_condition: string; notes: string };
}

const SPECIES_CATEGORIES = {
  'fruit': ['banana', 'avocado', 'passionfruit', 'guava', 'citrus', 'blackberry', 'jabuticaba', 'uvaia', 'acai'],
  'timber': ['eucalyptus', 'bracatinga', 'araucaria', 'cedar', 'canafistula', 'timbauva'],
  'annuals': ['corn', 'beans', 'cassava', 'sweet_potato', 'pumpkin', 'vegetables'],
  'forage': ['elephant_grass', 'tifton', 'brachiaria', 'oats', 'ryegrass'],
  'medicinal': ['lemon_balm', 'mint', 'guaco', 'yerba_mate']
};

const ANIMAL_CATEGORIES = {
  'animals': ['dairy_cattle', 'beef_cattle', 'swine', 'free_range_poultry', 'sheep', 'goats', 'bees']
};

const PROBLEM_CATEGORIES = {
  'pests': ['caterpillars', 'aphids', 'mites', 'ants', 'borer', 'fruit_fly'],
  'diseases': ['leaf_spot', 'rust', 'root_rot', 'mildew', 'anthracnose'],
  'symptoms': ['yellowing', 'leaf_drop', 'fruit_drop', 'slow_growth', 'dry_branches']
};

export function RiskPrediction() {
  const { t, language } = useI18n();
  
  // State
  const [locationMode, setLocationMode] = useState<'select' | 'dashboard'>('select');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<GeocodingResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState('');
  
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number; name: string } | null>(null);
  const [climateData, setClimateData] = useState<ClimateData | null>(null);
  const [riskReport, setRiskReport] = useState<RiskReport | null>(null);
  const [isLoadingClimate, setIsLoadingClimate] = useState(false);
  
  const [beaForm, setBeaForm] = useState({
    species: 'dairy_cattle',
    behavior: 'normal',
    occurrences: 'none',
    body_condition: 'good',
    notes: ''
  });
  const [beaObservations, setBeaObservations] = useState<BEAObservation[]>([]);
  
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiMode, setAiMode] = useState<'strict' | 'expanded'>('strict');

  const [cultivationData, setCultivationData] = useState<{
    species: string[];
    animals: string[];
    stage: string;
    problems: string[];
    description: string;
  }>({
    species: [],
    animals: [],
    stage: 'implementation_stage',
    problems: [],
    description: ''
  });
  const [customSpecies, setCustomSpecies] = useState('');

  // Load BEA from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('brota_bea_observations');
    if (saved) {
      try {
        setBeaObservations(JSON.parse(saved));
      } catch (e) {}
    }
    const savedCultivation = localStorage.getItem('brota_cultivation_data');
    if (savedCultivation) {
      try {
        setCultivationData(JSON.parse(savedCultivation));
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('brota_cultivation_data', JSON.stringify(cultivationData));
    if (climateData) {
      const report = generateRiskReport(climateData, cultivationData.species, cultivationData.animals);
      setRiskReport(report);
    }
  }, [cultivationData, climateData]);

  // Geocoding Search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.length >= 3) {
        const coordsMatch = searchQuery.match(/^(-?\d+(\.\d+)?)[,\s]+(-?\d+(\.\d+)?)$/);
        if (coordsMatch) {
           setSearchResults([{
             id: Date.now(),
             name: 'Coordenadas inseridas',
             latitude: parseFloat(coordsMatch[1]),
             longitude: parseFloat(coordsMatch[3])
           }]);
           return;
        }

        setIsSearching(true);
        fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchQuery)}&count=5&language=${language === 'pt' ? 'pt' : 'en'}&format=json`)
          .then(res => res.json())
          .then(data => {
            setSearchResults(data.results || []);
          })
          .catch(() => {})
          .finally(() => setIsSearching(false));
      } else {
        setSearchResults([]);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleUseMyLocation = () => {
    setIsLocating(true);
    setLocationError('');
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          handleSelectLocation({
            id: Date.now(),
            name: 'Localização Atual',
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
          setIsLocating(false);
        },
        (error) => {
          console.error('Error getting location:', error);
          setLocationError('Não foi possível obter sua localização. Por favor, digite o nome da cidade ou coordenadas.');
          setIsLocating(false);
        }
      );
    } else {
      setLocationError('Geolocalização não suportada pelo seu navegador.');
      setIsLocating(false);
    }
  };

  const handleSelectLocation = async (result: GeocodingResult) => {
    const locName = result.admin1 ? `${result.name}, ${result.admin1}` : result.name;
    setSelectedLocation({
      lat: result.latitude,
      lng: result.longitude,
      name: locName
    });
    setLocationMode('dashboard');
    setSearchQuery('');
    setSearchResults([]);
    
    // Fetch climate data
    setIsLoadingClimate(true);
    try {
      const data = await getClimateData(result.latitude, result.longitude, [...cultivationData.species, ...cultivationData.animals]);
      setClimateData(data);
    } catch (err) {
      console.error("Error fetching climate data", err);
    } finally {
      setIsLoadingClimate(false);
    }
  };

  const handleRegisterBEA = () => {
    if (!selectedLocation || !climateData || !riskReport) return;
    
    // Create animal observation
    const animalObs = {
      species: beaForm.species,
      behavior: beaForm.behavior,
      occurrences: beaForm.occurrences,
      body_condition: beaForm.body_condition,
      notes: beaForm.notes,
      recorded_at: new Date().toISOString()
    };

    const vegetalObs = {
      selected_species: cultivationData.species,
      animal_species: cultivationData.animals,
      system_stage: cultivationData.stage as any,
      observed_problems: cultivationData.problems,
      notes: cultivationData.description
    };

    const record = buildObservationRecord(riskReport, vegetalObs, animalObs);
    
    const newObs: BEAObservation = {
      id: record.id.toString(),
      date: record.recorded_at,
      location: selectedLocation,
      climate_snapshot: {
        temperature_c: climateData.current.temperature_c,
        humidity: climateData.current.humidity_percent,
        precipitation_mm: climateData.current.precipitation_mm,
        uv_index: climateData.current.uv_index,
        alerts_active: riskReport.evidence_based_alerts.length
      },
      animal: { ...beaForm }
    };
    
    const updated = [newObs, ...beaObservations];
    setBeaObservations(updated);
    localStorage.setItem('brota_bea_observations', JSON.stringify(updated));
    localStorage.setItem('brota_observation_records', JSON.stringify([record, ...JSON.parse(localStorage.getItem('brota_observation_records') || '[]')]));
    
    // Reset form notes
    setBeaForm(prev => ({ ...prev, notes: '' }));
  };

  const handleDeleteObservation = (id: string) => {
    const updatedObs = beaObservations.filter(obs => obs.id !== id);
    setBeaObservations(updatedObs);
    localStorage.setItem('brota_bea_observations', JSON.stringify(updatedObs));
    
    const savedRecords = JSON.parse(localStorage.getItem('brota_observation_records') || '[]');
    const updatedRecords = savedRecords.filter((rec: any) => rec.id.toString() !== id);
    localStorage.setItem('brota_observation_records', JSON.stringify(updatedRecords));
  };

  const handleAnalyzeVulnerability = async () => {
    if (!climateData || !riskReport) return;
    setIsAnalyzing(true);
    try {
      const vegetalObs = {
        selected_species: cultivationData.species,
        animal_species: cultivationData.animals,
        system_stage: cultivationData.stage as any,
        observed_problems: cultivationData.problems,
        notes: cultivationData.description
      };

      const lastObs = beaObservations.length > 0 ? {
        species: beaObservations[0].animal.species,
        behavior: beaObservations[0].animal.behavior,
        occurrences: beaObservations[0].animal.occurrences,
        body_condition: beaObservations[0].animal.body_condition,
        notes: beaObservations[0].animal.notes,
        recorded_at: beaObservations[0].date
      } : null;

      const context = buildGeminiContext(riskReport, climateData, vegetalObs, lastObs, aiMode);
      
      const response = await analyzeVulnerability({
        prompt: context.prompt,
        mode: aiMode
      });
      setAiAnalysis(response);
    } catch (err) {
      console.error(err);
      setAiAnalysis("Erro ao gerar análise. Tente novamente.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const toggleSpecies = (species: string) => {
    setCultivationData(prev => ({
      ...prev,
      species: prev.species.includes(species) 
        ? prev.species.filter(s => s !== species)
        : [...prev.species, species]
    }));
  };

  const toggleAnimal = (animal: string) => {
    setCultivationData(prev => ({
      ...prev,
      animals: prev.animals.includes(animal) 
        ? prev.animals.filter(a => a !== animal)
        : [...prev.animals, animal]
    }));
  };

  const toggleProblem = (problem: string) => {
    if (problem === 'Sem problemas observados') {
      setCultivationData(prev => ({ ...prev, problems: ['Sem problemas observados'] }));
      return;
    }
    setCultivationData(prev => {
      const newProblems = prev.problems.includes(problem)
        ? prev.problems.filter(p => p !== problem)
        : [...prev.problems.filter(p => p !== 'Sem problemas observados'), problem];
      return { ...prev, problems: newProblems };
    });
  };

  const addCustomSpecies = () => {
    if (customSpecies.trim() && !cultivationData.species.includes(customSpecies.trim())) {
      setCultivationData(prev => ({
        ...prev,
        species: [...prev.species, customSpecies.trim()]
      }));
      setCustomSpecies('');
    }
  };

  const clearCultivationData = () => {
    setCultivationData({
      species: [],
      animals: [],
      stage: 'Implantação (0 a 2 anos)',
      problems: [],
      description: ''
    });
  };

  // Render Helpers
  const getUVClassification = (uv: number) => {
    if (uv <= 2) return { text: t('risk.level_low'), color: 'text-emerald-600' };
    if (uv <= 5) return { text: t('risk.level_medium'), color: 'text-amber-600' };
    if (uv <= 7) return { text: t('risk.level_high'), color: 'text-orange-600' };
    if (uv <= 10) return { text: t('risk.level_high'), color: 'text-red-600' };
    return { text: t('risk.level_high'), color: 'text-purple-600' };
  };

  const getAlertIcon = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('chuva') || t.includes('fungo')) return <CloudLightning className="w-6 h-6" />;
    if (t.includes('calor') || t.includes('térmico')) return <ThermometerSun className="w-6 h-6" />;
    if (t.includes('seca') || t.includes('hídrico')) return <Droplets className="w-6 h-6" />;
    if (t.includes('vento')) return <Wind className="w-6 h-6" />;
    if (t.includes('frio') || t.includes('geada')) return <Thermometer className="w-6 h-6" />;
    return <AlertTriangle className="w-6 h-6" />;
  };

  const getAlertColor = (severity: string) => {
    switch (severity) {
      case 'emergency': return 'bg-red-50 border-red-200 text-red-800';
      case 'warning': return 'bg-amber-50 border-amber-200 text-amber-800';
      case 'watch': return 'bg-blue-50 border-blue-200 text-blue-800';
      default: return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getAlertIconColor = (severity: string) => {
    switch (severity) {
      case 'emergency': return 'text-red-600';
      case 'warning': return 'text-amber-600';
      case 'watch': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  if (locationMode === 'select') {
    return (
      <div className="max-w-2xl mx-auto p-4 sm:p-6 lg:p-8 animate-fade-in">
        <div className="glass-card rounded-[2.5rem] p-10 text-center shadow-futuristic border border-white/60">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm">
            <MapPin className="w-8 h-8" />
          </div>
          <h2 className="text-3xl font-black text-gray-900 mb-3 tracking-tight font-display">{t('risk.title')}?</h2>
          <p className="text-gray-500 font-medium mb-8 max-w-sm mx-auto leading-relaxed">{t('risk.description')}</p>
          
          <div className="space-y-6">
            <button
              onClick={handleUseMyLocation}
              disabled={isLocating}
              className="w-full py-4 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl transition-all flex items-center justify-center disabled:opacity-50 shadow-[0_4px_20px_rgba(16,185,129,0.3)] active:scale-[0.98]"
            >
              {isLocating ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <MapPin className="w-5 h-5 mr-3" />}
              {t('risk.use_my_location')}
            </button>
            
            {locationError && <p className="text-sm text-red-500 font-medium animate-shake">{locationError}</p>}
            
            <div className="relative flex items-center py-4">
              <div className="flex-grow border-t border-gray-200/50"></div>
              <span className="flex-shrink-0 mx-4 text-gray-400 text-xs font-bold uppercase tracking-[0.2em]">{t('risk.search_manually')}</span>
              <div className="flex-grow border-t border-gray-200/50"></div>
            </div>
            
            <div className="relative text-left group">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-emerald-600 transition-colors" />
                <input
                  type="text"
                  placeholder={t('risk.location_label')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-gray-50/50 border border-transparent focus:bg-white rounded-2xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all outline-none font-medium text-gray-700 shadow-inner"
                />
                {isSearching && <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-500 animate-spin" />}
              </div>
              
              {searchResults.length > 0 && (
                <div className="absolute z-10 w-full mt-3 bg-white/90 backdrop-blur-2xl border border-white/60 rounded-3xl shadow-2xl overflow-hidden animate-fade-in translate-y-0 border-t-0 p-2">
                  {searchResults.map((result) => (
                    <button
                      key={result.id}
                      onClick={() => handleSelectLocation(result)}
                      className="w-full text-left px-5 py-4 hover:bg-emerald-50 rounded-2xl transition-colors mb-1 last:mb-0 group/item"
                    >
                      <div className="font-bold text-gray-900 group-hover/item:text-emerald-700">{result.name}</div>
                      <div className="text-xs text-gray-400 font-medium mt-0.5">
                        {result.admin1 ? `${result.admin1}, ` : ''}{result.country || ''} • {result.latitude.toFixed(3)}, {result.longitude.toFixed(3)}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2 border-b border-white/20">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tight font-display">{t('risk.title')}</h1>
          <div className="flex items-center text-gray-500 mt-2 text-sm font-medium">
            <div className="bg-emerald-50 text-emerald-600 p-1.5 rounded-lg mr-2">
              <MapPin className="w-4 h-4" />
            </div>
            <span>{selectedLocation?.name} ({selectedLocation?.lat.toFixed(3)}, {selectedLocation?.lng.toFixed(3)})</span>
            <button 
              onClick={() => setLocationMode('select')}
              className="ml-4 px-3 py-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-full text-xs font-bold transition-all active:scale-95 flex items-center"
            >
              <Edit2 className="w-3 h-3 mr-1.5" /> {t('risk.change_location')}
            </button>
          </div>
        </div>
      </div>

      {isLoadingClimate ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-32 bg-gray-100 rounded-2xl animate-pulse"></div>)}
        </div>
      ) : climateData ? (
        <>


          {/* Clima e Previsão */}
          <div className="space-y-6">
            <h2 className="text-3xl font-black text-gray-900 flex items-center tracking-tight font-display">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mr-4 shadow-sm">
                <CloudLightning className="w-7 h-7" />
              </div>
              {t('risk.forecast_7days')}
            </h2>
            
            {/* Current Condition Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="glass-card p-6 rounded-[2.5rem] flex items-center gap-6 group hover:shadow-2xl transition-all">
                <div className="p-4 bg-orange-50 text-orange-600 rounded-[1.5rem] group-hover:scale-110 transition-transform shadow-inner">
                  <Thermometer className="w-8 h-8" />
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] mb-1.5">{t('risk.temperature')}</p>
                  <div className="flex items-baseline gap-1.5">
                    <p className="text-4xl font-black text-gray-900 font-display tracking-tight">{climateData.current.temperature_c}°</p>
                    <span className="text-sm font-black text-gray-400">C</span>
                  </div>
                  <div className="flex items-center mt-1">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{t('risk.feels_like')}</span>
                    <span className="ml-1.5 text-xs font-black text-gray-600">{climateData.current.feels_like_c}°C</span>
                  </div>
                </div>
              </div>
              
              <div className="glass-card p-6 rounded-[2.5rem] flex items-center gap-6 group hover:shadow-2xl transition-all">
                <div className="p-4 bg-blue-50 text-blue-600 rounded-[1.5rem] group-hover:scale-110 transition-transform shadow-inner">
                  <Droplets className="w-8 h-8" />
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] mb-1.5">{t('risk.humidity')}</p>
                  <div className="flex items-baseline gap-1.5">
                    <p className="text-4xl font-black text-gray-900 font-display tracking-tight">{climateData.current.humidity_percent}</p>
                    <span className="text-sm font-black text-gray-400">%</span>
                  </div>
                </div>
              </div>

              <div className="glass-card p-6 rounded-[2.5rem] flex items-center gap-6 group hover:shadow-2xl transition-all">
                <div className="p-4 bg-cyan-50 text-cyan-600 rounded-[1.5rem] group-hover:scale-110 transition-transform shadow-inner">
                  <CloudRain className="w-8 h-8" />
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] mb-1.5">{t('risk.precipitation')}</p>
                  <div className="flex items-baseline gap-1.5">
                    <p className="text-4xl font-black text-gray-900 font-display tracking-tight">{climateData.current.precipitation_mm}</p>
                    <span className="text-sm font-black text-gray-400">mm</span>
                  </div>
                </div>
              </div>

              <div className="glass-card p-6 rounded-[2.5rem] flex items-center gap-6 group hover:shadow-2xl transition-all">
                <div className="p-4 bg-purple-50 text-purple-600 rounded-[1.5rem] group-hover:scale-110 transition-transform shadow-inner">
                  <Sun className="w-8 h-8" />
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] mb-1.5">{t('risk.uv_index')}</p>
                  <p className="text-4xl font-black text-gray-900 font-display tracking-tight">{climateData.current.uv_index}</p>
                  <p className={`text-[10px] font-black uppercase tracking-widest mt-1.5 px-3 py-1 bg-white/50 rounded-full inline-block ${getUVClassification(climateData.current.uv_index).color}`}>
                    {getUVClassification(climateData.current.uv_index).text}
                  </p>
                </div>
              </div>

              <div className="glass-card p-6 rounded-[2.5rem] flex items-center gap-6 group hover:shadow-2xl transition-all">
                <div className="p-4 bg-amber-50 text-amber-700 rounded-[1.5rem] group-hover:scale-110 transition-transform shadow-inner">
                  <Thermometer className="w-8 h-8" />
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] mb-1.5">{t('risk.soil_temp')}</p>
                  <p className="text-4xl font-black text-gray-900 font-display tracking-tight">{climateData.current.soil_temperature_c ?? '--'}°C</p>
                </div>
              </div>

              <div className="glass-card p-6 rounded-[2.5rem] flex items-center gap-6 group hover:shadow-2xl transition-all">
                <div className="p-4 bg-emerald-50 text-emerald-700 rounded-[1.5rem] group-hover:scale-110 transition-transform shadow-inner">
                  <Droplets className="w-8 h-8" />
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] mb-1.5">{t('risk.soil_moisture')}</p>
                  <p className="text-4xl font-black text-gray-900 font-display tracking-tight">{climateData.current.soil_moisture_percent ?? '--'}%</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* 7-day Forecast */}
                <div className="lg:col-span-2 glass-card rounded-[2.5rem] p-8 shadow-futuristic border border-white/60">
                  <h3 className="text-xl font-black text-gray-900 mb-8 flex items-center tracking-tight font-display">
                    <div className="bg-emerald-50 text-emerald-600 p-2 rounded-xl mr-3">
                      <Calendar className="w-5 h-5" />
                    </div>
                    {t('risk.forecast_7days')}
                  </h3>
                  <div className="flex gap-6 overflow-x-auto pb-4 custom-scrollbar">
                    {climateData.forecast_7days.map((day, i) => {
                      const dateObj = new Date(day.date + 'T12:00:00');
                      const dayName = dateObj.toLocaleDateString(language === 'pt' ? 'pt-BR' : 'en-US', { weekday: 'short' }).replace('.', '');
                      
                      let barColor = 'bg-gray-200';
                      if (day.frost_risk) barColor = 'bg-purple-500';
                      else if (day.heat_stress_risk) barColor = 'bg-amber-500';
                      else if (day.precipitation_mm > 5) barColor = 'bg-blue-400';

                      return (
                        <div key={i} className="flex flex-col items-center p-5 rounded-[2rem] border border-gray-100 bg-gray-50/50 w-28 flex-shrink-0 group hover:bg-white hover:shadow-soft transition-all">
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">{dayName}</span>
                          <div className="flex flex-col items-center gap-1 mb-4">
                            <span className="text-2xl font-black text-gray-900 font-display group-hover:text-emerald-600">{Math.round(day.temp_max_c)}°</span>
                            <span className="text-xs font-bold text-gray-400">{Math.round(day.temp_min_c)}°</span>
                          </div>
                          <div className="flex items-center text-[10px] text-blue-600 font-black uppercase tracking-widest mb-4">
                            <Droplets className="w-3.5 h-3.5 mr-1" />
                            {day.precipitation_mm}mm
                          </div>
                          <div className={`w-full h-2 rounded-full ${barColor} shadow-inner`}></div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="glass-card rounded-[2.5rem] p-8 shadow-futuristic border border-white/60 bg-white/45">
                   <h3 className="text-xl font-black text-gray-900 mb-2 tracking-tight font-display">
                    {climateData.historical?.source === 'open-meteo' 
                      ? t('risk.historical_source_satellite') 
                      : t('risk.historical_source_official')}
                  </h3>
                  
                  {climateData.historical ? (
                    <>
                      <p className="text-xs text-gray-400 font-medium mb-8 leading-relaxed">
                        {climateData.historical.source === 'open-meteo' 
                          ? t('risk.historical_satellite_desc') 
                          : t('risk.historical_station_desc')
                             .replace('{name}', climateData.historical.station_name)
                             .replace('{distance}', climateData.historical.distance_km.toString())
                             .replace('{period}', climateData.historical.period)}
                      </p>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white/60 p-4 rounded-2xl border border-white/40 shadow-sm group hover:scale-105 transition-transform">
                          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">{t('risk.avg_temp')}</p>
                          <p className="text-xl font-black text-gray-900 font-display">{climateData.historical.avg_temp_c}°C</p>
                        </div>
                        <div className="bg-white/60 p-4 rounded-2xl border border-white/40 shadow-sm group hover:scale-105 transition-transform">
                          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">{t('risk.annual_precip')}</p>
                          <p className="text-xl font-black text-gray-900 font-display">{climateData.historical.total_precipitation_mm}mm</p>
                        </div>
                        <div className="bg-white/60 p-4 rounded-2xl border border-white/40 shadow-sm group hover:scale-105 transition-transform">
                          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">{t('risk.frost_days')}</p>
                          <p className="text-xl font-black text-gray-900 font-display">{climateData.historical.frost_days}</p>
                        </div>
                        <div className="bg-white/60 p-4 rounded-2xl border border-white/40 shadow-sm group hover:scale-105 transition-transform">
                          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">{t('risk.extreme_heat')}</p>
                          <p className="text-xl font-black text-gray-900 font-display">{climateData.historical.extreme_heat_days}</p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="p-4 bg-gray-50 rounded-full mb-4">
                        <Info className="w-8 h-8 text-gray-300" />
                      </div>
                      <p className="text-xs text-gray-400 font-medium leading-relaxed">{language === 'pt' ? 'Dados históricos indisponíveis para esta região no momento.' : 'Historical data unavailable for this region at the moment.'}</p>
                    </div>
                  )}
                </div>
            </div>
          </div>

          {/* Contexto da Propriedade */}
          <div className="space-y-4 pt-4 border-t border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 flex items-center">
              <MapPin className="w-6 h-6 mr-2 text-emerald-600" />
              {t('risk.section_cultivation')}
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Cultivation and Observation Section */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-gray-900 flex items-center">
                    <Sprout className="w-5 h-5 mr-2 text-emerald-600" />
                    {t('risk.growing_and_observing')}
                  </h3>
                  <button 
                    onClick={clearCultivationData}
                    className="text-xs text-gray-500 hover:text-red-600 flex items-center transition-colors"
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    {t('risk.clear_selection')}
                  </button>
                </div>

                {/* Block 1 - Cultivos e espécies vegetais */}
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">{t('risk.crops_and_plants')}</h4>
                  
                  <div className="flex gap-2 mb-3">
                    <select
                      onChange={(e) => {
                        if (e.target.value && !cultivationData.species.includes(e.target.value)) {
                          toggleSpecies(e.target.value);
                        }
                        e.target.value = '';
                      }}
                      className="flex-grow px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                    >
                      <option value="">{t('risk.select_species')}</option>
                      {Object.entries(SPECIES_CATEGORIES).map(([category, speciesList]) => (
                        <optgroup key={category} label={t(`categories.${category}`)}>
                          {speciesList.map(species => (
                            <option key={species} value={species}>{t(`categories.${species}`)}</option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>

                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      value={customSpecies}
                      onChange={e => setCustomSpecies(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addCustomSpecies()}
                      placeholder={t('risk.type_species')}
                      className="flex-grow px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                    <button 
                      onClick={addCustomSpecies}
                      className="px-4 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg flex items-center justify-center transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  
                  {/* Selected species chips */}
                  {cultivationData.species.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2 p-3 bg-gray-50 rounded-lg border border-gray-100">
                      {cultivationData.species.map(species => (
                        <span key={species} className="px-3 py-1 bg-white border border-emerald-200 text-emerald-800 rounded-full text-sm font-medium flex items-center shadow-sm">
                          {t(`categories.${species}`)}
                          <button onClick={() => toggleSpecies(species)} className="ml-2 text-emerald-400 hover:text-red-500 transition-colors">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Block 1.5 - Animais na produção */}
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">{t('categories.animals')}</h4>
                  
                  <select
                    onChange={(e) => {
                      if (e.target.value && !cultivationData.animals.includes(e.target.value)) {
                        toggleAnimal(e.target.value);
                      }
                      e.target.value = '';
                    }}
                    className="w-full px-3 py-2 mb-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                  >
                    <option value="">{t('risk.select_animal') || (language === 'pt' ? 'Selecione um animal...' : 'Select an animal...')}</option>
                    {ANIMAL_CATEGORIES['animals'].map(animal => (
                      <option key={animal} value={animal}>{t(`categories.${animal}`)}</option>
                    ))}
                  </select>

                  {cultivationData.animals.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2 p-3 bg-gray-50 rounded-lg border border-gray-100">
                      {cultivationData.animals.map(animal => (
                        <span key={animal} className="px-3 py-1 bg-white border border-emerald-200 text-emerald-800 rounded-full text-sm font-medium flex items-center shadow-sm">
                          {t(`categories.${animal}`)}
                          <button onClick={() => toggleAnimal(animal)} className="ml-2 text-emerald-400 hover:text-red-500 transition-colors">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Block 2 - Estágio do sistema */}
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">2. {t('risk.system_stage')}</h4>
                  <div className="flex flex-wrap gap-4">
                    {['implementation_stage', 'development_stage', 'production_stage'].map(stage => (
                      <label key={stage} className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="radio"
                          name="systemStage"
                          value={stage}
                          checked={cultivationData.stage === stage}
                          onChange={() => setCultivationData(prev => ({ ...prev, stage }))}
                          className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 border-gray-300"
                        />
                        <span className="text-sm text-gray-700 font-medium">{t(`common.${stage}`)}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Block 3 - O que você está observando */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">3. {t('risk.what_observing')}</h4>
                  
                  <select
                    onChange={(e) => {
                      if (e.target.value && !cultivationData.problems.includes(e.target.value)) {
                        toggleProblem(e.target.value);
                      }
                      e.target.value = '';
                    }}
                    className="w-full px-3 py-2 mb-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                  >
                    <option value="">{t('risk.select_problem')}</option>
                    <option value="none">{t('common.none')}</option>
                    {Object.entries(PROBLEM_CATEGORIES).map(([category, problemsList]) => (
                      <optgroup key={category} label={t(`categories.${category}`)}>
                        {problemsList.map(problem => (
                          <option key={problem} value={problem}>{t(`categories.${problem}`)}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>

                  {cultivationData.problems.length > 0 && (
                    <div className="mt-2 mb-4 flex flex-wrap gap-2 p-3 bg-gray-50 rounded-lg border border-gray-100">
                      {cultivationData.problems.map(problem => (
                        <span key={problem} className={`px-3 py-1 bg-white border rounded-full text-sm font-medium flex items-center shadow-sm ${
                          problem === 'none' 
                            ? 'border-blue-200 text-blue-800' 
                            : 'border-red-200 text-red-800'
                        }`}>
                          {t(`categories.${problem}`)}
                          <button onClick={() => toggleProblem(problem)} className={`ml-2 transition-colors ${
                            problem === 'none' ? 'text-blue-400 hover:text-blue-600' : 'text-red-400 hover:text-red-600'
                          }`}>
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('risk.describe_what_you_see')}</label>
                    <textarea 
                      value={cultivationData.description}
                      onChange={e => setCultivationData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder={language === 'pt' ? 'Ex: as folhas do abacate estão amarelando nas bordas desde a última semana de calor' : 'Ex: avocado leaves are yellowing at the edges since the last week of heat'}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none h-20 resize-none text-sm"
                    ></textarea>
                  </div>
                </div>
              </div>

              {/* BEA */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                  <Activity className="w-5 h-5 mr-2 text-emerald-600" />
                  {t('risk.section_bea')}
                </h3>
                
                <div className="space-y-4 mb-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('categories.species') || (language === 'pt' ? 'Espécie' : 'Species')}</label>
                      <select 
                        value={beaForm.species}
                        onChange={e => setBeaForm({...beaForm, species: e.target.value})}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                      >
                        {ANIMAL_CATEGORIES.animals.map(key => (
                          <option key={key} value={key}>{t(`categories.${key}`)}</option>
                        ))}
                        <option value="others">{t('common.others')}</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.behavior') || (language === 'pt' ? 'Comportamento' : 'Behavior')}</label>
                      <select 
                        value={beaForm.behavior}
                        onChange={e => setBeaForm({...beaForm, behavior: e.target.value})}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                      >
                        {['normal', 'agitated', 'lethargic', 'panting', 'isolation'].map(key => (
                          <option key={key} value={key}>{t(`common.${key}`)}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.occurrences') || (language === 'pt' ? 'Ocorrências' : 'Occurrences')}</label>
                      <select 
                        value={beaForm.occurrences}
                        onChange={e => setBeaForm({...beaForm, occurrences: e.target.value})}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                      >
                        {['none', 'production_drop', 'diarrhea', 'injury', 'prostration'].map(key => (
                          <option key={key} value={key}>{t(`common.${key}`)}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.body_condition') || (language === 'pt' ? 'Condição Corporal' : 'Body Condition')}</label>
                      <select 
                        value={beaForm.body_condition}
                        onChange={e => setBeaForm({...beaForm, body_condition: e.target.value})}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                      >
                       {['good', 'regular', 'poor'].map(key => (
                          <option key={key} value={key}>{t(`common.${key}`)}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('risk.free_observation') || (language === 'pt' ? 'Observação livre' : 'Free observation')}</label>
                    <textarea 
                      value={beaForm.notes}
                      onChange={e => setBeaForm({...beaForm, notes: e.target.value})}
                      placeholder={t('risk.observe_today_placeholder') || (language === 'pt' ? 'O que você observou hoje?' : 'What did you observe today?')}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none h-24 resize-none"
                    ></textarea>
                  </div>
                  
                  <button 
                    onClick={handleRegisterBEA}
                    className="w-full py-2.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-semibold rounded-lg transition-colors"
                  >
                    {t('risk.register_observation') || (language === 'pt' ? 'Registrar observação' : 'Register observation')}
                  </button>
                </div>

                {beaObservations.length > 0 && (
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wider">{t('risk.last_records') || (language === 'pt' ? 'Últimos Registros' : 'Last Records')}</h4>
                    <div className="space-y-3">
                      {beaObservations.slice(0, 3).map(obs => (
                        <div key={obs.id} className="p-3 bg-gray-50 rounded-lg border border-gray-100 text-sm relative group">
                          <button 
                            onClick={() => handleDeleteObservation(obs.id)}
                            className="absolute top-2 right-2 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md opacity-0 group-hover:opacity-100 transition-all"
                            title="Apagar registro"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <div className="flex justify-between items-start mb-1 pr-8">
                            <span className="font-semibold text-gray-900">{t(`categories.${obs.animal.species}`)}</span>
                            <span className="text-gray-500 text-xs">{new Date(obs.date).toLocaleDateString(language === 'pt' ? 'pt-BR' : 'en-US')}</span>
                          </div>
                          <div className="text-gray-600">
                            {t(`common.${obs.animal.behavior}`)} • {t(`common.${obs.animal.occurrences}`)} • {obs.climate_snapshot.temperature_c}°C
                          </div>
                          {obs.animal.notes && <div className="mt-1 text-gray-500 italic">"{obs.animal.notes}"</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* AI Analysis */}
          <div className="pt-4 border-t border-gray-100">
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl shadow-sm border border-emerald-100 p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
                <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-teal-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
                
                <h3 className="text-xl font-bold text-emerald-900 mb-4 flex items-center relative z-10">
                  <div className="bg-emerald-100 p-2 rounded-lg mr-3">
                    <Sprout className="w-6 h-6 text-emerald-600" />
                  </div>
                  {t('risk.ai_analysis')}
                </h3>
                
                <div className="relative z-10">
                  {!aiAnalysis && !isAnalyzing ? (
                    <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 text-center border border-emerald-100/50">
                      <p className="text-emerald-800 mb-4 text-sm">
                        {t('risk.ai_description')}
                      </p>
                      
                      <div className="flex items-center justify-center gap-4 mb-6 bg-white/50 p-2 rounded-lg border border-emerald-100/50">
                        <button
                          onClick={() => setAiMode('strict')}
                          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                            aiMode === 'strict' 
                              ? 'bg-emerald-600 text-white shadow-sm' 
                              : 'text-emerald-700 hover:bg-emerald-100/50'
                          }`}
                        >
                          {t('risk.ai_mode_scientific')}
                        </button>
                        <button
                          onClick={() => setAiMode('expanded')}
                          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                            aiMode === 'expanded' 
                              ? 'bg-emerald-600 text-white shadow-sm' 
                              : 'text-emerald-700 hover:bg-emerald-100/50'
                          }`}
                        >
                          {t('risk.ai_mode_integrated')}
                        </button>
                      </div>

                      <button 
                        onClick={handleAnalyzeVulnerability}
                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2"
                      >
                        <Activity className="w-5 h-5" />
                        {t('risk.generate_analysis')}
                      </button>
                    </div>
                  ) : isAnalyzing ? (
                    <div className="flex flex-col items-center justify-center py-12 bg-white/60 backdrop-blur-sm rounded-xl border border-emerald-100/50">
                      <div className="relative">
                        <div className="absolute inset-0 bg-emerald-200 rounded-full animate-ping opacity-20"></div>
                        <Loader2 className="w-10 h-10 animate-spin text-emerald-600 relative z-10" />
                      </div>
                      <p className="mt-4 text-emerald-800 font-medium animate-pulse">{t('risk.ai_processing')}</p>
                    </div>
                  ) : (
                    <div className="bg-white/80 backdrop-blur-md rounded-xl p-6 border border-emerald-100 shadow-sm">
                      <div className="markdown-body">
                        <ReactMarkdown
                          components={{
                            h1: ({node, ...props}) => <h1 className="text-2xl font-bold text-emerald-900 mt-6 mb-4 pb-2 border-b border-emerald-100" {...props} />,
                            h2: ({node, ...props}) => <h2 className="text-xl font-bold text-emerald-800 mt-6 mb-3 flex items-center gap-2" {...props} />,
                            h3: ({node, ...props}) => <h3 className="text-lg font-semibold text-emerald-700 mt-4 mb-2" {...props} />,
                            p: ({node, ...props}) => <p className="text-gray-700 leading-relaxed mb-4" {...props} />,
                            ul: ({node, ...props}) => <ul className="list-disc list-outside ml-5 mb-4 space-y-2 text-gray-700" {...props} />,
                            ol: ({node, ...props}) => <ol className="list-decimal list-outside ml-5 mb-4 space-y-2 text-gray-700" {...props} />,
                            li: ({node, ...props}) => <li className="pl-1" {...props} />,
                            strong: ({node, ...props}) => <strong className="font-semibold text-emerald-900 bg-emerald-50 px-1 py-0.5 rounded" {...props} />,
                            blockquote: ({node, ...props}) => (
                              <blockquote className="border-l-4 border-emerald-400 bg-emerald-50/50 py-2 px-4 rounded-r-lg my-4 text-emerald-800 italic" {...props} />
                            ),
                            a: ({node, ...props}) => <a className="text-emerald-600 hover:text-emerald-700 underline underline-offset-2 decoration-emerald-300 hover:decoration-emerald-600 transition-colors" target="_blank" rel="noopener noreferrer" {...props} />,
                          }}
                        >
                          {aiAnalysis}
                        </ReactMarkdown>
                      </div>
                      
                      {/* Active Alerts (Moved inside AI Analysis) */}
                      {riskReport && riskReport.evidence_based_alerts.length > 0 && (
                        <div className="mt-8 pt-6 border-t border-emerald-100">
                          <h3 className="text-lg font-bold text-emerald-900 flex items-center mb-4">
                            <AlertTriangle className="w-5 h-5 mr-2 text-amber-600" />
                            {t('risk.scientific_alerts')}
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {riskReport.evidence_based_alerts.map((alert, idx) => {
                              const formatted = formatAlertForDisplay(alert);
                              return (
                                <div key={idx} className={`p-5 rounded-2xl border ${getAlertColor(formatted.severity)} flex flex-col gap-3 shadow-sm`}>
                                  <div className="flex items-start gap-3">
                                    <div className={`flex-shrink-0 mt-1 ${getAlertIconColor(formatted.severity)}`}>
                                      {getAlertIcon(alert.threshold.stressor)}
                                    </div>
                                    <div>
                                      <h3 className="text-lg font-bold capitalize leading-tight mb-1">{formatted.title}</h3>
                                      <p className="text-sm font-medium opacity-90">{formatted.message}</p>
                                    </div>
                                  </div>
                                  
                                  <div className="mt-2 bg-white/50 rounded-xl p-3">
                                    <span className="text-xs font-bold opacity-80 uppercase tracking-wider block mb-2">{t('risk.recommended_actions')}</span>
                                    <ul className="list-disc list-inside text-sm space-y-1.5">
                                      {formatted.actions.map((action, i) => (
                                        <li key={i} className="leading-snug">{action}</li>
                                      ))}
                                    </ul>
                                  </div>

                                  <div className="mt-auto pt-3 border-t border-current border-opacity-10">
                                    <p className="text-xs opacity-80 flex items-start">
                                      <Info className="w-3.5 h-3.5 mr-1.5 mt-0.5 flex-shrink-0" />
                                      <span>{t('risk.reference')}: {formatted.citation_badge}</span>
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      
                      <div className="mt-6 pt-4 border-t border-emerald-100 flex justify-end">
                        <button 
                          onClick={handleAnalyzeVulnerability}
                          className="text-sm px-4 py-2 bg-emerald-50 text-emerald-700 font-medium rounded-lg hover:bg-emerald-100 transition-colors flex items-center gap-2"
                        >
                          <Activity className="w-4 h-4" />
                          {t('risk.refresh_analysis')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
        </>
      ) : null}
    </div>
  );
}
