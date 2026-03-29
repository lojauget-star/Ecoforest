import React, { useState, useCallback, useEffect } from 'react';
import L from 'leaflet';

import { Navbar } from './components/Navbar';
import { PlanningForm } from './components/PlanningForm';
import { MapEditor } from './components/MapEditor';
import { ResultsDisplay } from './components/ResultsDisplay';
import { LoadingSpinner } from './components/LoadingSpinner';
import { Disclaimer } from './components/Disclaimer';
import { ProducersView } from './components/ProducersView';
import { RiskPrediction } from './components/RiskPrediction';
import { Toast } from './components/Toast';
import type { PlanRequest, PlanResponse, Feedback, WFOSpecies } from './types';
import { getAgroforestryPlan, submitFeedback as apiSubmitFeedback, getWfoSpeciesForRegion } from './services/apiService';
import { calculatePolygonAreaHectares } from './utils/geometry';
import { useI18n } from './i18n/index';

// Fix Leaflet icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export type AppView = 'planner' | 'producers' | 'risk';

export default function App() {
  const { language, t } = useI18n();
  const [view, setView] = useState<AppView>('planner');
  const [planRequest, setPlanRequest] = useState<Partial<PlanRequest>>({
    location: { lat: -27.6, lng: -48.5 },
    soil_type: "argiloso",
    climate: "subtropical_umido",
    area_ha: 0,
    objectives: ["frutas"],
    preferred_species: [],
    data_source_link: '',
  });
  const [planResponse, setPlanResponse] = useState<PlanResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isEnrichingData, setIsEnrichingData] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [wfoSpecies, setWfoSpecies] = useState<WFOSpecies[]>([]);
  const [producerFilter, setProducerFilter] = useState<string | null>(null);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const handlePlanRequest = useCallback(async () => {
    if (!planRequest.area_geojson) {
      setError(t('error.noArea'));
      return;
    }
    setIsLoading(true);
    setError(null);
    setPlanResponse(null);
    try {
      const response = await getAgroforestryPlan({ ...planRequest, wfo_species: wfoSpecies } as PlanRequest, language);
      setPlanResponse(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error.unknown'));
    } finally {
      setIsLoading(false);
    }
  }, [planRequest, language, t, wfoSpecies]);

  const updateRequestData = useCallback((data: Partial<PlanRequest>) => {
    setPlanRequest(prev => ({ ...prev, ...data }));
    setError(null); 
  }, []);

  const handleAreaDrawn = useCallback(async (geojson: any) => {
    if (geojson) {
        const hectares = calculatePolygonAreaHectares(geojson);
        updateRequestData({ area_geojson: geojson, area_ha: hectares });
        
        try {
            setIsEnrichingData(true);
            setToastMessage(t('toast.enriching'));
            const bounds = L.geoJSON(geojson).getBounds();
            const center = bounds.getCenter();
            const enrichedData = await getWfoSpeciesForRegion({ lat: center.lat, lng: center.lng });
            updateRequestData({ climate: enrichedData.context.climate_zone });
            setWfoSpecies(enrichedData.species);
            setToastMessage(t('toast.enriched'));
        } catch (err) {
            console.error("Enrichment error:", err);
        } finally {
            setIsEnrichingData(false);
        }
    } else {
        updateRequestData({ area_geojson: undefined, area_ha: 0 });
        setWfoSpecies([]);
    }
  }, [updateRequestData, t]);
  
  const submitFeedback = useCallback(async (feedback: any) => {
    if (!planResponse?.plan_id) return;
    await apiSubmitFeedback({ ...feedback, plan_id: planResponse.plan_id });
    setFeedbackSubmitted(true);
    setTimeout(() => setFeedbackSubmitted(false), 3000);
  }, [planResponse]);

  return (
    <div className="min-h-screen bg-gray-50 font-sans flex flex-col">
      <Navbar currentView={view} onViewChange={setView} />
      <main className="flex-grow p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full pt-24">
        {view === 'planner' ? (
           <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
             <div className="lg:col-span-4 xl:col-span-3 lg:sticky lg:top-24">
               <div className="bg-white p-6 rounded-2xl shadow-soft border border-gray-100">
                   <PlanningForm
                     requestData={planRequest}
                     updateRequestData={updateRequestData}
                     onPlanRequest={handlePlanRequest}
                     isLoading={isLoading}
                     isEnriching={isEnrichingData}
                   />
               </div>
             </div>
             <div className="lg:col-span-8 xl:col-span-9 flex flex-col gap-6">
               <div className="bg-white p-1 rounded-2xl shadow-soft border border-gray-100 overflow-hidden">
                   <MapEditor 
                     center={planRequest.location || { lat: -27.6, lng: -48.5 }}
                     onAreaDrawn={handleAreaDrawn}
                     mapLayers={planResponse?.map_layers}
                     planId={planResponse?.plan_id}
                   />
               </div>
               {isLoading && <LoadingSpinner />}
               {error && <div className="text-red-700 bg-red-50 border border-red-100 p-4 rounded-xl font-medium">{error}</div>}
               {planResponse ? (
                 <ResultsDisplay 
                   plan={planResponse} 
                   onSubmitFeedback={submitFeedback}
                   feedbackSubmitted={feedbackSubmitted}
                   onFindProducersForSpecies={(s) => { setProducerFilter(s); setView('producers'); }}
                 />
               ) : (!isLoading && <Disclaimer />)}
             </div>
           </div>
        ) : view === 'producers' ? (
          <ProducersView filter={producerFilter} onClearFilter={() => setProducerFilter(null)} />
        ) : (
          <RiskPrediction />
        )}
      </main>
      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage(null)} />}
    </div>
  );
}