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
  'Frutíferas': ['Banana', 'Abacate', 'Maracujá', 'Goiaba', 'Citros', 'Amora', 'Jabuticaba', 'Uvaia', 'Açaí'],
  'Madeireiras': ['Eucalipto', 'Bracatinga', 'Araucária', 'Cedro', 'Canafístula', 'Timbaúva'],
  'Anuais': ['Milho', 'Feijão', 'Mandioca', 'Batata-doce', 'Abóbora', 'Hortaliças'],
  'Forrageiras': ['Capim-elefante', 'Tifton', 'Brachiaria', 'Aveia', 'Azevém'],
  'Medicinais/Aromáticas': ['Erva-cidreira', 'Hortelã', 'Guaco', 'Erva-mate']
};

const ANIMAL_CATEGORIES = {
  'Animais na produção': ['Bovinos de leite', 'Bovinos de corte', 'Suínos', 'Aves caipiras', 'Ovinos', 'Caprinos', 'Abelhas']
};

const PROBLEM_CATEGORIES = {
  'Pragas': ['Lagartas', 'Pulgões', 'Ácaros', 'Formigas cortadeiras', 'Broca', 'Mosca-das-frutas'],
  'Doenças': ['Mancha foliar', 'Ferrugem', 'Podridão de raiz', 'Míldio', 'Antracnose'],
  'Sintomas gerais': ['Amarelecimento', 'Queda de folhas', 'Frutos caindo precocemente', 'Crescimento lento', 'Galhos secos']
};

export function RiskPrediction() {
  const { t } = useI18n();
  
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
    species: 'Bovinos leiteiros',
    behavior: 'Normal',
    occurrences: 'Nenhuma',
    body_condition: 'Boa',
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
    stage: 'Implantação (0 a 2 anos)',
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
        fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(searchQuery)}&count=5&language=pt&format=json`)
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
    if (uv <= 2) return { text: 'Baixo', color: 'text-emerald-600' };
    if (uv <= 5) return { text: 'Moderado', color: 'text-amber-600' };
    if (uv <= 7) return { text: 'Alto', color: 'text-orange-600' };
    if (uv <= 10) return { text: 'Muito Alto', color: 'text-red-600' };
    return { text: 'Extremo', color: 'text-purple-600' };
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
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
          <MapPin className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Onde fica sua propriedade?</h2>
          <p className="text-gray-600 mb-8">Precisamos da sua localização para buscar dados climáticos precisos e gerar alertas de risco.</p>
          
          <div className="space-y-4">
            <button
              onClick={handleUseMyLocation}
              disabled={isLocating}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center disabled:opacity-50"
            >
              {isLocating ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <MapPin className="w-5 h-5 mr-2" />}
              Usar minha localização atual
            </button>
            
            {locationError && <p className="text-sm text-red-600">{locationError}</p>}
            
            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-gray-200"></div>
              <span className="flex-shrink-0 mx-4 text-gray-400 text-sm">ou busque manualmente</span>
              <div className="flex-grow border-t border-gray-200"></div>
            </div>
            
            <div className="relative text-left">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Digite o nome da cidade ou coordenadas..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
                {isSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 animate-spin" />}
              </div>
              
              {searchResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                  {searchResults.map((result) => (
                    <button
                      key={result.id}
                      onClick={() => handleSelectLocation(result)}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-0"
                    >
                      <div className="font-medium text-gray-900">{result.name}</div>
                      <div className="text-sm text-gray-500">
                        {result.admin1 ? `${result.admin1}, ` : ''}{result.country || ''} ({result.latitude.toFixed(4)}, {result.longitude.toFixed(4)})
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Painel de riscos da propriedade</h1>
          <div className="flex items-center text-gray-500 mt-1">
            <MapPin className="w-4 h-4 mr-1" />
            <span>{selectedLocation?.name} ({selectedLocation?.lat.toFixed(4)}, {selectedLocation?.lng.toFixed(4)})</span>
            <button 
              onClick={() => setLocationMode('select')}
              className="ml-3 text-emerald-600 hover:text-emerald-700 text-sm font-medium flex items-center"
            >
              <Edit2 className="w-3 h-3 mr-1" /> Alterar localização
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
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900 flex items-center">
              <CloudLightning className="w-6 h-6 mr-2 text-emerald-600" />
              Clima e Previsão
            </h2>
            
            {/* Current Condition Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
              <div className="p-3 bg-orange-50 text-orange-600 rounded-full">
                <Thermometer className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Temperatura</p>
                <p className="text-2xl font-bold text-gray-900">{climateData.current.temperature_c}°C</p>
                <p className="text-xs text-gray-400">Sensação: {climateData.current.feels_like_c}°C</p>
              </div>
            </div>
            
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
              <div className="p-3 bg-blue-50 text-blue-600 rounded-full">
                <Droplets className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Umidade</p>
                <p className="text-2xl font-bold text-gray-900">{climateData.current.humidity_percent}%</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
              <div className="p-3 bg-cyan-50 text-cyan-600 rounded-full">
                <CloudRain className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Precipitação</p>
                <p className="text-2xl font-bold text-gray-900">{climateData.current.precipitation_mm}mm</p>
                {(() => {
                  const dryDays = climateData.forecast_7days.filter(d => d.drought_risk).length;
                  return dryDays >= 3 ? <p className="text-xs text-amber-600 font-medium">{dryDays} dias sem chuva previstos</p> : null;
                })()}
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
              <div className="p-3 bg-purple-50 text-purple-600 rounded-full">
                <Sun className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Índice UV</p>
                <p className="text-2xl font-bold text-gray-900">{climateData.current.uv_index}</p>
                <p className={`text-xs font-medium ${getUVClassification(climateData.current.uv_index).color}`}>
                  {getUVClassification(climateData.current.uv_index).text}
                </p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
              <div className="p-3 bg-amber-50 text-amber-700 rounded-full">
                <Thermometer className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Temp. do Solo (6cm)</p>
                <p className="text-2xl font-bold text-gray-900">{climateData.current.soil_temperature_c ?? '--'}°C</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
              <div className="p-3 bg-emerald-50 text-emerald-700 rounded-full">
                <Droplets className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Umidade do Solo</p>
                <p className="text-2xl font-bold text-gray-900">{climateData.current.soil_moisture_percent ?? '--'}%</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* 7-day Forecast */}
              <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6 overflow-x-auto">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                  <Calendar className="w-5 h-5 mr-2 text-emerald-600" />
                  Previsão 7 dias
                </h3>
                <div className="flex gap-4 min-w-max">
                  {climateData.forecast_7days.map((day, i) => {
                    const dateObj = new Date(day.date + 'T12:00:00');
                    const dayName = dateObj.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
                    
                    let barColor = 'bg-gray-200';
                    if (day.frost_risk) barColor = 'bg-purple-500';
                    else if (day.heat_stress_risk) barColor = 'bg-amber-500';
                    else if (day.precipitation_mm > 5) barColor = 'bg-blue-400';

                    return (
                      <div key={i} className="flex flex-col items-center p-3 rounded-xl border border-gray-100 bg-gray-50 w-24 flex-shrink-0">
                        <span className="text-sm font-medium text-gray-500 capitalize mb-2">{dayName}</span>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg font-bold text-gray-900">{Math.round(day.temp_max_c)}°</span>
                          <span className="text-sm font-medium text-gray-400">{Math.round(day.temp_min_c)}°</span>
                        </div>
                        <div className="flex items-center text-xs text-blue-600 font-medium mb-3">
                          <Droplets className="w-3 h-3 mr-1" />
                          {day.precipitation_mm}mm
                        </div>
                        <div className={`w-full h-1.5 rounded-full ${barColor}`}></div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* INMET History */}
              <div className="bg-gray-50 rounded-2xl border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-1">
                  {climateData.historical?.source === 'open-meteo' 
                    ? 'Dados históricos (Satélite/Reanálise)' 
                    : 'Dados históricos oficiais INMET'}
                </h3>
                
                {climateData.historical ? (
                  <>
                    <p className="text-sm text-gray-500 mb-4">
                      {climateData.historical.source === 'open-meteo' 
                        ? 'Baseado em dados de satélite e modelos climáticos' 
                        : `Estação ${climateData.historical.station_name} (${climateData.historical.distance_km}km)`} • {climateData.historical.period}
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white p-3 rounded-xl border border-gray-100">
                        <p className="text-xs text-gray-500 font-medium">Temp. média</p>
                        <p className="text-lg font-bold text-gray-900">{climateData.historical.avg_temp_c}°C</p>
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-gray-100">
                        <p className="text-xs text-gray-500 font-medium">Precipitação anual</p>
                        <p className="text-lg font-bold text-gray-900">{climateData.historical.total_precipitation_mm}mm</p>
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-gray-100">
                        <p className="text-xs text-gray-500 font-medium">Dias de geada</p>
                        <p className="text-lg font-bold text-gray-900">{climateData.historical.frost_days}</p>
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-gray-100">
                        <p className="text-xs text-gray-500 font-medium">Calor extremo</p>
                        <p className="text-lg font-bold text-gray-900">{climateData.historical.extreme_heat_days} dias</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full py-6 text-center">
                    <Info className="w-8 h-8 text-gray-400 mb-2" />
                    <p className="text-sm text-gray-500">Dados históricos indisponíveis para esta região no momento.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Contexto da Propriedade */}
          <div className="space-y-4 pt-4 border-t border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 flex items-center">
              <MapPin className="w-6 h-6 mr-2 text-emerald-600" />
              Contexto da Propriedade
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Cultivation and Observation Section */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-gray-900 flex items-center">
                    <Sprout className="w-5 h-5 mr-2 text-emerald-600" />
                    O que você está cultivando e observando
                  </h3>
                  <button 
                    onClick={clearCultivationData}
                    className="text-xs text-gray-500 hover:text-red-600 flex items-center transition-colors"
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    Limpar seleção
                  </button>
                </div>

                {/* Block 1 - Cultivos e espécies vegetais */}
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">1. Cultivos e espécies vegetais</h4>
                  
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
                      <option value="">Selecione uma espécie...</option>
                      {Object.entries(SPECIES_CATEGORIES).map(([category, speciesList]) => (
                        <optgroup key={category} label={category}>
                          {speciesList.map(species => (
                            <option key={species} value={species}>{species}</option>
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
                      placeholder="Ou digite uma espécie não listada..."
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
                          {species}
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
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Animais na produção</h4>
                  
                  <select
                    onChange={(e) => {
                      if (e.target.value && !cultivationData.animals.includes(e.target.value)) {
                        toggleAnimal(e.target.value);
                      }
                      e.target.value = '';
                    }}
                    className="w-full px-3 py-2 mb-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                  >
                    <option value="">Selecione um animal...</option>
                    {ANIMAL_CATEGORIES['Animais na produção'].map(animal => (
                      <option key={animal} value={animal}>{animal}</option>
                    ))}
                  </select>

                  {cultivationData.animals.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2 p-3 bg-gray-50 rounded-lg border border-gray-100">
                      {cultivationData.animals.map(animal => (
                        <span key={animal} className="px-3 py-1 bg-white border border-emerald-200 text-emerald-800 rounded-full text-sm font-medium flex items-center shadow-sm">
                          {animal}
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
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">2. Estágio do sistema</h4>
                  <div className="flex flex-wrap gap-4">
                    {['Implantação (0 a 2 anos)', 'Desenvolvimento (2 a 5 anos)', 'Produção (5+ anos)'].map(stage => (
                      <label key={stage} className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="radio"
                          name="systemStage"
                          value={stage}
                          checked={cultivationData.stage === stage}
                          onChange={() => setCultivationData(prev => ({ ...prev, stage }))}
                          className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 border-gray-300"
                        />
                        <span className="text-sm text-gray-700 font-medium">{stage}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Block 3 - O que você está observando */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">3. O que você está observando</h4>
                  
                  <select
                    onChange={(e) => {
                      if (e.target.value && !cultivationData.problems.includes(e.target.value)) {
                        toggleProblem(e.target.value);
                      }
                      e.target.value = '';
                    }}
                    className="w-full px-3 py-2 mb-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-sm"
                  >
                    <option value="">Selecione um problema...</option>
                    <option value="Sem problemas observados">Sem problemas observados</option>
                    {Object.entries(PROBLEM_CATEGORIES).map(([category, problemsList]) => (
                      <optgroup key={category} label={category}>
                        {problemsList.map(problem => (
                          <option key={problem} value={problem}>{problem}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>

                  {cultivationData.problems.length > 0 && (
                    <div className="mt-2 mb-4 flex flex-wrap gap-2 p-3 bg-gray-50 rounded-lg border border-gray-100">
                      {cultivationData.problems.map(problem => (
                        <span key={problem} className={`px-3 py-1 bg-white border rounded-full text-sm font-medium flex items-center shadow-sm ${
                          problem === 'Sem problemas observados' 
                            ? 'border-blue-200 text-blue-800' 
                            : 'border-red-200 text-red-800'
                        }`}>
                          {problem}
                          <button onClick={() => toggleProblem(problem)} className={`ml-2 transition-colors ${
                            problem === 'Sem problemas observados' ? 'text-blue-400 hover:text-blue-600' : 'text-red-400 hover:text-red-600'
                          }`}>
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Descreva o que está vendo</label>
                    <textarea 
                      value={cultivationData.description}
                      onChange={e => setCultivationData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Ex: as folhas do abacate estão amarelando nas bordas desde a última semana de calor"
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none h-20 resize-none text-sm"
                    ></textarea>
                  </div>
                </div>
              </div>

              {/* BEA */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                  <Activity className="w-5 h-5 mr-2 text-emerald-600" />
                  Registro de Bem-Estar Animal
                </h3>
                
                <div className="space-y-4 mb-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Espécie</label>
                      <select 
                        value={beaForm.species}
                        onChange={e => setBeaForm({...beaForm, species: e.target.value})}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                      >
                        <option>Bovinos leiteiros</option>
                        <option>Bovinos de corte</option>
                        <option>Suínos</option>
                        <option>Aves</option>
                        <option>Ovinos</option>
                        <option>Outros</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Comportamento</label>
                      <select 
                        value={beaForm.behavior}
                        onChange={e => setBeaForm({...beaForm, behavior: e.target.value})}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                      >
                        <option>Normal</option>
                        <option>Agitado</option>
                        <option>Letárgico</option>
                        <option>Ofegante</option>
                        <option>Isolamento do grupo</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Ocorrências</label>
                      <select 
                        value={beaForm.occurrences}
                        onChange={e => setBeaForm({...beaForm, occurrences: e.target.value})}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                      >
                        <option>Nenhuma</option>
                        <option>Queda de produção</option>
                        <option>Diarreia</option>
                        <option>Lesão</option>
                        <option>Prostração</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Condição Corporal</label>
                      <select 
                        value={beaForm.body_condition}
                        onChange={e => setBeaForm({...beaForm, body_condition: e.target.value})}
                        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                      >
                        <option>Boa</option>
                        <option>Regular</option>
                        <option>Ruim</option>
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Observação livre</label>
                    <textarea 
                      value={beaForm.notes}
                      onChange={e => setBeaForm({...beaForm, notes: e.target.value})}
                      placeholder="O que você observou hoje?"
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none h-24 resize-none"
                    ></textarea>
                  </div>
                  
                  <button 
                    onClick={handleRegisterBEA}
                    className="w-full py-2.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-semibold rounded-lg transition-colors"
                  >
                    Registrar observação
                  </button>
                </div>

                {beaObservations.length > 0 && (
                  <div>
                    <h4 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wider">Últimos Registros</h4>
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
                            <span className="font-semibold text-gray-900">{obs.animal.species}</span>
                            <span className="text-gray-500 text-xs">{new Date(obs.date).toLocaleDateString('pt-BR')}</span>
                          </div>
                          <div className="text-gray-600">
                            {obs.animal.behavior} • {obs.animal.occurrences} • {obs.climate_snapshot.temperature_c}°C
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
                  Análise Integrada da IA
                </h3>
                
                <div className="relative z-10">
                  {!aiAnalysis && !isAnalyzing ? (
                    <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 text-center border border-emerald-100/50">
                      <p className="text-emerald-800 mb-4 text-sm">
                        Nossa inteligência artificial cruza os dados climáticos, os alertas científicos e as informações do seu cultivo para gerar recomendações personalizadas.
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
                          Modo Científico
                        </button>
                        <button
                          onClick={() => setAiMode('expanded')}
                          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                            aiMode === 'expanded' 
                              ? 'bg-emerald-600 text-white shadow-sm' 
                              : 'text-emerald-700 hover:bg-emerald-100/50'
                          }`}
                        >
                          Modo IA Integrado
                        </button>
                      </div>

                      <button 
                        onClick={handleAnalyzeVulnerability}
                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2"
                      >
                        <Activity className="w-5 h-5" />
                        Gerar Análise Completa
                      </button>
                    </div>
                  ) : isAnalyzing ? (
                    <div className="flex flex-col items-center justify-center py-12 bg-white/60 backdrop-blur-sm rounded-xl border border-emerald-100/50">
                      <div className="relative">
                        <div className="absolute inset-0 bg-emerald-200 rounded-full animate-ping opacity-20"></div>
                        <Loader2 className="w-10 h-10 animate-spin text-emerald-600 relative z-10" />
                      </div>
                      <p className="mt-4 text-emerald-800 font-medium animate-pulse">Processando dados climáticos e referências científicas...</p>
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
                            Alertas Científicos Baseados na Sua Seleção
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
                                    <span className="text-xs font-bold opacity-80 uppercase tracking-wider block mb-2">Ações Recomendadas:</span>
                                    <ul className="list-disc list-inside text-sm space-y-1.5">
                                      {formatted.actions.map((action, i) => (
                                        <li key={i} className="leading-snug">{action}</li>
                                      ))}
                                    </ul>
                                  </div>

                                  <div className="mt-auto pt-3 border-t border-current border-opacity-10">
                                    <p className="text-xs opacity-80 flex items-start">
                                      <Info className="w-3.5 h-3.5 mr-1.5 mt-0.5 flex-shrink-0" />
                                      <span>Referência: {formatted.citation_badge}</span>
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
                          Atualizar Análise
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
