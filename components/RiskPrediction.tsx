import React, { useState, useEffect } from 'react';
import { useI18n } from '../i18n';
import { getRiskPrediction } from '../services/apiService';
import type { RiskPredictionRequest, RiskPredictionResponse } from '../types';
import { AlertCircle, CheckCircle2, Info, Loader2, MapPin } from 'lucide-react';

export function RiskPrediction() {
  const { t, language } = useI18n();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RiskPredictionResponse | null>(null);
  
  const [formData, setFormData] = useState<RiskPredictionRequest>({
    location: { lat: '' as any, lng: '' as any },
    soilManagement: '',
    recentPests: ''
  });

  const [locationStatus, setLocationStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleGetLocation = () => {
    setLocationStatus('loading');
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData(prev => ({
            ...prev,
            location: {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            }
          }));
          setLocationStatus('success');
        },
        (error) => {
          console.error('Error getting location:', error);
          setLocationStatus('error');
        }
      );
    } else {
      setLocationStatus('error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.location.lat === '' as any || formData.location.lng === '' as any || isNaN(formData.location.lat) || isNaN(formData.location.lng)) {
      setError("Coordenadas inválidas. Preencha latitude e longitude.");
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const response = await getRiskPrediction(formData, language);
      setResult(response);
    } catch (err) {
      console.error('Error predicting risk:', err);
      setError(t('risk.error'));
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'low':
      case 'baixo':
        return 'text-emerald-600 bg-emerald-50 border-emerald-200';
      case 'medium':
      case 'médio':
        return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'high':
      case 'alto':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">{t('risk.title')}</h2>
        <p className="text-gray-600">{t('risk.description')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Form Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('risk.location_label')}
              </label>
              <div className="flex gap-2">
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    step="any"
                    placeholder="Lat (ex: -23.55)"
                    value={formData.location.lat}
                    onChange={(e) => setFormData(prev => ({ ...prev, location: { ...prev.location, lat: e.target.value === '' ? '' as any : parseFloat(e.target.value) } }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    required
                  />
                  <input
                    type="number"
                    step="any"
                    placeholder="Lng (ex: -46.63)"
                    value={formData.location.lng}
                    onChange={(e) => setFormData(prev => ({ ...prev, location: { ...prev.location, lng: e.target.value === '' ? '' as any : parseFloat(e.target.value) } }))}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    required
                  />
                </div>
                <button
                  type="button"
                  onClick={handleGetLocation}
                  className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center"
                  title="Obter localização atual"
                >
                  {locationStatus === 'loading' ? <Loader2 className="w-5 h-5 animate-spin" /> : <MapPin className="w-5 h-5" />}
                </button>
              </div>
              {locationStatus === 'error' && (
                <p className="text-sm text-red-600 mt-2">
                  Não foi possível obter sua localização. Por favor, insira as coordenadas manualmente (ex: Latitude -23.5505, Longitude -46.6333).
                </p>
              )}
            </div>

            {/* Soil Management */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('risk.soil_management_label')}
              </label>
              <textarea
                value={formData.soilManagement}
                onChange={(e) => setFormData(prev => ({ ...prev, soilManagement: e.target.value }))}
                placeholder={t('risk.soil_management_placeholder')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 min-h-[100px]"
                required
              />
            </div>

            {/* Recent Pests */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('risk.recent_pests_label')}
              </label>
              <textarea
                value={formData.recentPests}
                onChange={(e) => setFormData(prev => ({ ...prev, recentPests: e.target.value }))}
                placeholder={t('risk.recent_pests_placeholder')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 min-h-[100px]"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  {t('risk.analyzing')}
                </>
              ) : (
                t('risk.analyze_button')
              )}
            </button>
            
            {error && (
              <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-start">
                <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
                <p className="text-sm">{error}</p>
              </div>
            )}
          </form>
        </div>

        {/* Results Section */}
        <div className="space-y-6">
          {result ? (
            <div className="animate-fade-in space-y-6">
              {/* Overall Risk */}
              <div className={`p-6 rounded-2xl border ${getRiskColor(result.riskLevel)}`}>
                <h3 className="text-lg font-semibold mb-1">{t('risk.risk_level')}</h3>
                <p className="text-3xl font-bold capitalize">{result.riskLevel}</p>
              </div>

              {/* Vulnerability Windows */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <AlertCircle className="w-5 h-5 mr-2 text-amber-500" />
                  {t('risk.vulnerability_windows')}
                </h3>
                
                {result.vulnerabilityWindows && result.vulnerabilityWindows.length > 0 ? (
                  <div className="space-y-4">
                    {result.vulnerabilityWindows.map((window, index) => (
                      <div key={index} className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-medium text-gray-900">{window.date}</span>
                          <span className="text-sm font-semibold text-red-600 bg-red-50 px-2 py-1 rounded-md">
                            {window.pest}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">{window.reason}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 italic">{t('risk.no_windows')}</p>
                )}
              </div>

              {/* Recommendations */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <CheckCircle2 className="w-5 h-5 mr-2 text-emerald-500" />
                  {t('risk.recommendations')}
                </h3>
                <ul className="space-y-3">
                  {result.recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 mr-2 flex-shrink-0" />
                      <span className="text-gray-700">{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="h-full bg-gray-50 rounded-2xl border border-gray-100 border-dashed flex flex-col items-center justify-center p-8 text-center min-h-[400px]">
              <Info className="w-12 h-12 text-gray-300 mb-4" />
              <p className="text-gray-500 max-w-sm">
                Preencha os dados ao lado para gerar uma previsão de riscos e recomendações de manejo para sua área.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
