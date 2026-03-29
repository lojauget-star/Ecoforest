import React, { useState, useEffect } from 'react';
import { useI18n } from '../i18n';
import { AlertCircle, CheckCircle2, Info, Loader2, MapPin, CloudLightning, ThermometerSun, Droplets, Wind, Search, Edit2, Activity, Thermometer, Sun, CloudRain, Calendar, AlertTriangle, Sprout, Plus, X, Trash2 } from 'lucide-react';
import { getClimateData, ClimateData, getClimateRiskSummary } from '../services/climateService';
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
  }, [cultivationData]);

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
      const data = await getClimateData(result.latitude, result.longitude);
      setClimateData(data);
    } catch (err) {
      console.error("Error fetching climate data", err);
    } finally {
      setIsLoadingClimate(false);
    }
  };

  const handleRegisterBEA = () => {
    if (!selectedLocation || !climateData) return;
    
    const newObs: BEAObservation = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      location: selectedLocation,
      climate_snapshot: {
        temperature_c: climateData.current.temperature_c,
        humidity: climateData.current.humidity_percent,
        precipitation_mm: climateData.current.precipitation_mm,
        uv_index: climateData.current.uv_index,
        alerts_active: climateData.alerts.length
      },
      animal: { ...beaForm }
    };
    
    const updated = [newObs, ...beaObservations];
    setBeaObservations(updated);
    localStorage.setItem('brota_bea_observations', JSON.stringify(updated));
    
    // Reset form notes
    setBeaForm(prev => ({ ...prev, notes: '' }));
  };

  const handleAnalyzeVulnerability = async () => {
    if (!climateData) return;
    setIsAnalyzing(true);
    try {
      const summary = getClimateRiskSummary(climateData);
      const alertsText = climateData.alerts.map(a => `[${a.severity}] ${a.type}: ${a.message}`).join('\n');
      const lastObs = beaObservations.length > 0 ? beaObservations[0] : null;
      
      const response = await analyzeVulnerability({
        climateSummary: summary,
        alerts: alertsText,
        lastObservation: lastObs,
        cultivationData: cultivationData
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
    switch (type) {
      case 'heavy_rain': return <CloudLightning className="w-6 h-6" />;
      case 'heat_stress': return <ThermometerSun className="w-6 h-6" />;
      case 'drought': return <Droplets className="w-6 h-6" />;
      case 'strong_wind': return <Wind className="w-6 h-6" />;
      case 'frost': return <Thermometer className="w-6 h-6" />;
      default: return <AlertTriangle className="w-6 h-6" />;
    }
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
          {/* Active Alerts */}
          {climateData.alerts.length > 0 && (
            <div className="space-y-3">
              {climateData.alerts.map((alert, idx) => (
                <div key={idx} className={`p-5 rounded-2xl border ${getAlertColor(alert.severity)} flex flex-col md:flex-row gap-4`}>
                  <div className={`flex-shrink-0 ${getAlertIconColor(alert.severity)}`}>
                    {getAlertIcon(alert.type)}
                  </div>
                  <div className="flex-grow">
                    <h3 className="text-lg font-bold capitalize mb-1">{alert.type.replace('_', ' ')}</h3>
                    <p className="mb-3 font-medium">{alert.message}</p>
                    
                    <div className="mb-3">
                      <span className="text-sm font-semibold opacity-80 uppercase tracking-wider block mb-1">Sistemas Afetados:</span>
                      <div className="flex flex-wrap gap-2">
                        {alert.affected_systems.map((sys, i) => (
                          <span key={i} className="px-2.5 py-1 bg-white bg-opacity-50 rounded-full text-xs font-medium border border-current border-opacity-20">
                            {sys}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <span className="text-sm font-semibold opacity-80 uppercase tracking-wider block mb-1">Ações Recomendadas:</span>
                      <ul className="list-disc list-inside text-sm space-y-1">
                        {alert.recommended_actions.map((action, i) => (
                          <li key={i}>{action}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 4 Current Condition Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
          </div>

          {/* 7-day Forecast */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 overflow-x-auto">
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

          {/* Two Columns */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Left Column: BEA */}
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
                      <div key={obs.id} className="p-3 bg-gray-50 rounded-lg border border-gray-100 text-sm">
                        <div className="flex justify-between items-start mb-1">
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

            {/* Right Column */}
            <div className="space-y-6">
              
              {/* Cultivation and Observation Section */}
              <div className="bg-gray-50 rounded-2xl border border-gray-200 p-6">
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
                  <div className="space-y-3">
                    {Object.entries(SPECIES_CATEGORIES).map(([category, speciesList]) => (
                      <div key={category}>
                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider block mb-1">{category}</span>
                        <div className="flex flex-wrap gap-2">
                          {speciesList.map(species => (
                            <button
                              key={species}
                              onClick={() => toggleSpecies(species)}
                              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                                cultivationData.species.includes(species)
                                  ? 'bg-emerald-100 border-emerald-300 text-emerald-800'
                                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-100'
                              }`}
                            >
                              {species}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-3 flex gap-2">
                    <input
                      type="text"
                      value={customSpecies}
                      onChange={e => setCustomSpecies(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addCustomSpecies()}
                      placeholder="Adicionar espécie não listada..."
                      className="flex-grow px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                    <button 
                      onClick={addCustomSpecies}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center justify-center transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  
                  {/* Custom species chips */}
                  {cultivationData.species.filter(s => !Object.values(SPECIES_CATEGORIES).flat().includes(s)).length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {cultivationData.species.filter(s => !Object.values(SPECIES_CATEGORIES).flat().includes(s)).map(species => (
                        <span key={species} className="px-3 py-1.5 bg-emerald-100 border border-emerald-300 text-emerald-800 rounded-full text-sm font-medium flex items-center">
                          {species}
                          <button onClick={() => toggleSpecies(species)} className="ml-1.5 text-emerald-600 hover:text-emerald-900">
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Block 1.5 - Animais na produção */}
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Animais na produção</h4>
                  <div className="flex flex-wrap gap-2">
                    {ANIMAL_CATEGORIES['Animais na produção'].map(animal => (
                      <button
                        key={animal}
                        onClick={() => toggleAnimal(animal)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                          cultivationData.animals.includes(animal)
                            ? 'bg-emerald-100 border-emerald-300 text-emerald-800'
                            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {animal}
                      </button>
                    ))}
                  </div>
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
                  <div className="space-y-3 mb-3">
                    {Object.entries(PROBLEM_CATEGORIES).map(([category, problemsList]) => (
                      <div key={category}>
                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider block mb-1">{category}</span>
                        <div className="flex flex-wrap gap-2">
                          {problemsList.map(problem => (
                            <button
                              key={problem}
                              onClick={() => toggleProblem(problem)}
                              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                                cultivationData.problems.includes(problem)
                                  ? 'bg-red-100 border-red-300 text-red-800'
                                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-100'
                              }`}
                            >
                              {problem}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                    <div className="pt-1">
                      <button
                        onClick={() => toggleProblem('Sem problemas observados')}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                          cultivationData.problems.includes('Sem problemas observados')
                            ? 'bg-blue-100 border-blue-300 text-blue-800'
                            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        Sem problemas observados
                      </button>
                    </div>
                  </div>
                  
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

              {/* INMET History */}
              <div className="bg-gray-50 rounded-2xl border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-1">Dados históricos oficiais INMET</h3>
                
                {climateData.historical ? (
                  <>
                    <p className="text-sm text-gray-500 mb-4">Estação {climateData.historical.station_name} ({climateData.historical.distance_km}km) • {climateData.historical.period}</p>
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
                  <>
                    <p className="text-sm text-gray-500 mb-4">Conectando à estação automática mais próxima...</p>
                    <div className="grid grid-cols-2 gap-3">
                      {[1,2,3,4].map(i => <div key={i} className="h-16 bg-gray-200 rounded-xl animate-pulse"></div>)}
                    </div>
                  </>
                )}
              </div>

              {/* AI Analysis */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                  <AlertCircle className="w-5 h-5 mr-2 text-emerald-600" />
                  Análise integrada com IA
                </h3>
                
                {!aiAnalysis && !isAnalyzing ? (
                  <button 
                    onClick={handleAnalyzeVulnerability}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center"
                  >
                    Analisar vulnerabilidade ↗
                  </button>
                ) : isAnalyzing ? (
                  <div className="flex flex-col items-center justify-center py-8 text-gray-500">
                    <Loader2 className="w-8 h-8 animate-spin mb-4 text-emerald-500" />
                    <p>Analisando dados climáticos e registros...</p>
                  </div>
                ) : (
                  <div className="prose prose-sm max-w-none prose-emerald">
                    <ReactMarkdown>{aiAnalysis}</ReactMarkdown>
                    <button 
                      onClick={handleAnalyzeVulnerability}
                      className="mt-4 text-sm text-emerald-600 font-medium hover:underline"
                    >
                      Atualizar análise
                    </button>
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
