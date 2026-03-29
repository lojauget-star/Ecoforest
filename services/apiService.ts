import { GoogleGenAI, Type } from "@google/genai";
import type { PlanRequest, PlanResponse, Feedback, QuizAnswers, WFOEnrichedResponse, WFOSpecies, RiskPredictionRequest, RiskPredictionResponse } from '../types';
import { prompts } from '../locales/prompts';

// Schema para a resposta do plano agroflorestal
const planResponseSchema = {
  type: Type.OBJECT,
  properties: {
    plan_id: { type: Type.STRING },
    map_layers: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          species: { type: Type.STRING },
          strata: { type: Type.STRING },
          coordinates: { type: Type.ARRAY, items: { type: Type.NUMBER } },
          info: { type: Type.STRING },
          spacing_meters: { type: Type.NUMBER }
        },
        required: ["species", "strata", "coordinates", "info", "spacing_meters"]
      }
    },
    succession_schedule: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          species: { type: Type.STRING },
          plant_year: { type: Type.INTEGER },
          strata: { type: Type.STRING },
          notes: { type: Type.STRING }
        },
        required: ["species", "plant_year", "strata", "notes"]
      }
    },
    explanations: { type: Type.STRING },
    animal_welfare_impact: { type: Type.STRING },
    confidence_score: { type: Type.NUMBER },
    wfo_suggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
    references: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: { title: { type: Type.STRING }, id: { type: Type.STRING } },
        required: ["title", "id"]
      }
    }
  },
  required: ["plan_id", "map_layers", "succession_schedule", "explanations", "confidence_score", "references"]
};

export async function getAgroforestryPlan(request: PlanRequest, language: 'pt' | 'en'): Promise<PlanResponse> {
  const { systemInstruction, userPromptTemplate, preferredSpeciesTextTemplate, dataSourceTextTemplate, wfoSpeciesTextTemplate } = prompts[language].planner;
  
  let wfoSpeciesText = '';
  if (request.wfo_species && request.wfo_species.length > 0) {
      const speciesList = request.wfo_species
        .map(s => `- **${s.name}** ${s.family ? `(${s.family})` : ''} - ${s.is_native ? 'Nativa' : 'Exótica'}`)
        .join('\n');
      wfoSpeciesText = wfoSpeciesTextTemplate.replace('{wfoSpeciesList}', speciesList);
  }

  let animalContextText = '';
  if (request.animal_type && request.animal_type !== 'none') {
      const goalsText = request.animal_welfare_goals?.length ? ` Objetivos de bem-estar: ${request.animal_welfare_goals.join(', ')}.` : '';
      animalContextText = `\n- Integração Animal: O sistema incluirá a criação de **${request.animal_type}**. ${goalsText} O plano DEVE considerar o conforto térmico, nutrição e ambiência para estes animais.`;
  }

  const userPrompt = userPromptTemplate
    .replace('{area_ha}', request.area_ha.toFixed(3))
    .replace('{soil_type}', request.soil_type)
    .replace('{climate}', request.climate)
    .replace('{objectivesText}', request.objectives.join(', '))
    .replace('{preferredSpeciesText}', (request.preferred_species?.length ? preferredSpeciesTextTemplate.replace('{speciesList}', request.preferred_species.join(', ')) : ''))
    .replace('{dataSourceText}', (request.data_source_link ? dataSourceTextTemplate.replace('{dataSourceLink}', request.data_source_link) : ''))
    .replace('{wfoSpeciesText}', wfoSpeciesText)
    .replace('{animalContextText}', animalContextText);

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview",
        contents: userPrompt,
        config: {
            systemInstruction: systemInstruction,
            responseMimeType: "application/json",
            responseSchema: planResponseSchema,
            temperature: 0.7,
        },
    });

    const plan = JSON.parse(response.text || '{}') as PlanResponse;
    plan.consortium_pattern = [...plan.map_layers];
    
    // Generate grid points inside the polygon
    if (request.area_geojson && request.area_geojson.geometry && request.area_geojson.geometry.coordinates) {
        const polygonCoords = request.area_geojson.geometry.coordinates[0];
        const generatedLayers: any[] = [];
        
        const getBounds = (coords: number[][]) => {
            let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
            coords.forEach(([lng, lat]) => {
                if (lat < minLat) minLat = lat;
                if (lat > maxLat) maxLat = lat;
                if (lng < minLng) minLng = lng;
                if (lng > maxLng) maxLng = lng;
            });
            return { minLat, maxLat, minLng, maxLng };
        };

        const isPointInPolygon = (point: number[], vs: number[][]) => {
            const x = point[0], y = point[1];
            let isInside = false;
            for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
                const xi = vs[i][0], yi = vs[i][1];
                const xj = vs[j][0], yj = vs[j][1];
                const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
                if (intersect) isInside = !isInside;
            }
            return isInside;
        };

        const { minLat, maxLat, minLng, maxLng } = getBounds(polygonCoords);
        const hasValidBounds = minLat !== Infinity && maxLat !== -Infinity && (minLat !== 0 || maxLat !== 0);
        let centerLat = !hasValidBounds ? request.location.lat : minLat + (maxLat - minLat) / 2;
        let centerLng = !hasValidBounds ? request.location.lng : minLng + (maxLng - minLng) / 2;
        
        if (Math.abs(centerLat) < 0.0001 && Math.abs(centerLng) < 0.0001 && (Math.abs(request.location.lat) > 0.0001 || Math.abs(request.location.lng) > 0.0001)) {
            centerLat = request.location.lat;
            centerLng = request.location.lng;
        }
        
        const avgSpacing = plan.consortium_pattern.reduce((acc, curr) => acc + (curr.spacing_meters || 2), 0) / Math.max(1, plan.consortium_pattern.length);
        
        let latStep = Math.max(avgSpacing / 111132, 0.00001); 
        let lngStep = Math.max((avgSpacing * 2) / (111320 * Math.cos(centerLat * Math.PI / 180)), 0.00001); 
        
        const width = maxLng - minLng;
        const height = maxLat - minLat;
        const MAX_SPOTS = 800;

        if (width > 0 && height > 0) {
            const cols = Math.ceil(width / lngStep);
            const rows = Math.ceil(height / latStep);
            const totalEstimatedSpots = cols * rows;

            if (totalEstimatedSpots > MAX_SPOTS) {
                const scaleFactor = Math.sqrt(totalEstimatedSpots / MAX_SPOTS);
                latStep *= scaleFactor;
                lngStep *= scaleFactor;
                
                if (width / lngStep > MAX_SPOTS) lngStep = width / MAX_SPOTS;
                if (height / latStep > MAX_SPOTS) latStep = height / MAX_SPOTS;
            }
        }

        const spots: [number, number][] = [];
        let rowIndex = 0;

        for (let lat = minLat; lat <= maxLat && spots.length < MAX_SPOTS; lat += latStep) {
            const offset = (rowIndex % 2 === 1) ? lngStep / 2 : 0;
            for (let lng = minLng + offset; lng <= maxLng && spots.length < MAX_SPOTS; lng += lngStep) {
                if (isPointInPolygon([lng, lat], polygonCoords)) {
                    spots.push([lat, lng]);
                }
            }
            rowIndex++;
        }
        
        if (spots.length === 0) {
            if (isPointInPolygon([centerLng, centerLat], polygonCoords)) {
                spots.push([centerLat, centerLng]);
            } else if (polygonCoords.length > 0) {
                spots.push([polygonCoords[0][1], polygonCoords[0][0]]);
            }
        }

        if (plan.consortium_pattern.length > 0) {
            spots.forEach((spot, index) => {
                const patternItem = plan.consortium_pattern[index % plan.consortium_pattern.length];
                generatedLayers.push({
                    ...patternItem,
                    coordinates: spot
                });
            });
        }

        plan.map_layers = generatedLayers;
    }

    return plan;
  } catch (error) {
      console.error("Gemini API Error:", error);
      throw new Error("Erro ao gerar plano. Por favor, tente novamente mais tarde.");
  }
}

// Lógica de filtragem de espécies movida para o cliente para garantir funcionamento offline/estático
export async function getWfoSpeciesForRegion(location: { lat: number, lng: number }): Promise<WFOEnrichedResponse> {
    try {
        // Busca o JSON processado que deve estar na pasta public ou assets durante o build
        const response = await fetch('/backend/data/processed_flat_species.json');
        if (!response.ok) throw new Error("Base de dados não encontrada.");
        
        const allSpecies: any[] = await response.json();
        
        const getContext = (lat: number, lng: number) => {
            if (lat < -23 && lng > -55) return { biome: 'Mata Atlântica', climate_zone: 'Subtropical Úmido' };
            if (lat < -15 && lng > -50) return { biome: 'Cerrado', climate_zone: 'Tropical' };
            if (lat > -15 && lat < -3 && lng > -45) return { biome: 'Caatinga', climate_zone: 'Semiárido' };
            return { biome: 'Mata Atlântica', climate_zone: 'Tropical' };
        };

        const context = getContext(location.lat, location.lng);
        const suitable = allSpecies.filter(s => {
            const biomes = Array.isArray(s.biomes) ? s.biomes : (s.biome ? [s.biome] : []);
            return biomes.includes(context.biome);
        }).slice(0, 15);

        return {
            context: { ...context, elevation_m: null },
            species: suitable.map(s => ({
                name: s.name,
                is_native: s.is_native,
                family: s.family || 'Desconhecida',
                biomes: Array.isArray(s.biomes) ? s.biomes : [s.biome]
            }))
        };
    } catch (error) {
        console.error("WFO Client-side Error:", error);
        return { context: { biome: 'Mata Atlântica', climate_zone: 'Tropical' }, species: [] };
    }
}

export async function submitFeedback(feedback: Feedback): Promise<{ status: string }> {
  return { status: "success" };
}

export async function getSustainabilityTips(answers: QuizAnswers, language: 'pt' | 'en'): Promise<string> {
    const { systemInstruction, userPromptTemplate } = prompts[language].quiz;
    const answersText = Object.entries(answers).map(([k, v]) => `${k}: ${v}`).join('\n');
    
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview", 
        contents: userPromptTemplate.replace('{answersText}', answersText),
        config: { systemInstruction, temperature: 0.8 },
    });
    return response.text || '';
}

export async function getRiskPrediction(request: RiskPredictionRequest, language: 'pt' | 'en'): Promise<RiskPredictionResponse> {
    const { systemInstruction, userPromptTemplate } = prompts[language].risk;
    
    // Fetch weather data
    let weatherData = null;
    try {
        const weatherRes = await fetch(`/api/weather?lat=${request.location.lat}&lng=${request.location.lng}`);
        if (weatherRes.ok) {
            weatherData = await weatherRes.json();
        }
    } catch (e) {
        console.error("Failed to fetch weather data:", e);
    }
    
    // Format weather data for the prompt
    let weatherSummary = "Dados climáticos não disponíveis.";
    if (weatherData && weatherData.daily) {
        const days = weatherData.daily.time.slice(0, 7);
        const maxTemps = weatherData.daily.temperature_2m_max.slice(0, 7);
        const minTemps = weatherData.daily.temperature_2m_min.slice(0, 7);
        const precip = weatherData.daily.precipitation_sum.slice(0, 7);
        const humidity = weatherData.daily.relative_humidity_2m_mean?.slice(0, 7) || [];
        
        weatherSummary = days.map((day: string, i: number) => 
            `- ${day}: Temp ${minTemps[i]}°C a ${maxTemps[i]}°C, Chuva: ${precip[i]}mm, Umidade: ${humidity[i] || 'N/A'}%`
        ).join('\n');
    }

    const userPrompt = userPromptTemplate
        .replace('{soilManagement}', request.soilManagement)
        .replace('{recentPests}', request.recentPests)
        .replace('{weatherSummary}', weatherSummary);

    const riskResponseSchema = {
        type: Type.OBJECT,
        properties: {
            riskLevel: { type: Type.STRING, description: "low, medium, or high" },
            vulnerabilityWindows: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        date: { type: Type.STRING },
                        pest: { type: Type.STRING },
                        reason: { type: Type.STRING }
                    }
                }
            },
            recommendations: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
            }
        }
    };

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const response = await ai.models.generateContent({
            model: "gemini-3.1-pro-preview",
            contents: userPrompt,
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: "application/json",
                responseSchema: riskResponseSchema,
                temperature: 0.7,
            },
        });

        return JSON.parse(response.text || '{}') as RiskPredictionResponse;
    } catch (error) {
        console.error("Gemini API Error (Risk Predictor):", error);
        throw new Error("Erro ao prever riscos. Por favor, tente novamente mais tarde.");
    }
}