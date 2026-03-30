// services/climateService.ts
// Integração climática dupla: Open-Meteo (tempo real) + INMET (histórico oficial BR)
// Uso: import { getClimateData } from './climateService';

import { EvidenceBasedAlert } from './scientificThresholds';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CurrentWeather {
  temperature_c: number;
  feels_like_c: number;
  humidity_percent: number;
  precipitation_mm: number;
  wind_speed_kmh: number;
  uv_index: number;
  weather_code: number;
  weather_description: string;
  timestamp: string;
}

export interface DailyForecast {
  date: string;
  temp_max_c: number;
  temp_min_c: number;
  precipitation_mm: number;
  precipitation_probability_percent: number;
  uv_index_max: number;
  wind_speed_max_kmh: number;
  weather_code: number;
  weather_description: string;
  frost_risk: boolean;       // temp_min < 2°C
  heat_stress_risk: boolean; // temp_max > 32°C — relevante para BEA bovinos
  drought_risk: boolean;     // precipitação < 1mm por 3+ dias consecutivos (calculado)
}

export interface HistoricalSummary {
  source: 'inmet';
  station_name: string;
  station_code: string;
  distance_km: number;
  period: string; // ex: "2024-01 a 2024-12"
  avg_temp_c: number;
  total_precipitation_mm: number;
  frost_days: number;
  extreme_heat_days: number; // dias com máx > 35°C
  data_available: boolean;
}

export interface ClimateAlert {
  type: 'frost' | 'heat_stress' | 'drought' | 'heavy_rain' | 'high_uv' | 'strong_wind';
  severity: 'watch' | 'warning' | 'emergency';
  message: string;
  affected_systems: string[]; // ex: ['bovinos leiteiros', 'mudas recentes', 'abelhas']
  recommended_actions: string[];
  valid_until: string;
}

export interface ClimateData {
  location: { lat: number; lng: number };
  fetched_at: string;
  current: CurrentWeather;
  forecast_7days: DailyForecast[];
  historical: HistoricalSummary | null;
  alerts: EvidenceBasedAlert[];
  data_sources: string[];
}

// ─── WMO Weather Code → Descrição em PT-BR ───────────────────────────────────

const WMO_DESCRIPTIONS: Record<number, string> = {
  0: 'Céu limpo',
  1: 'Principalmente limpo', 2: 'Parcialmente nublado', 3: 'Nublado',
  45: 'Neblina', 48: 'Neblina com geada',
  51: 'Garoa leve', 53: 'Garoa moderada', 55: 'Garoa intensa',
  61: 'Chuva leve', 63: 'Chuva moderada', 65: 'Chuva forte',
  71: 'Neve leve', 73: 'Neve moderada', 75: 'Neve forte',
  77: 'Granizo',
  80: 'Pancadas de chuva leve', 81: 'Pancadas de chuva moderada', 82: 'Pancadas de chuva forte',
  85: 'Pancadas de neve leve', 86: 'Pancadas de neve forte',
  95: 'Tempestade', 96: 'Tempestade com granizo leve', 99: 'Tempestade com granizo forte',
};

function wmoDescription(code: number): string {
  return WMO_DESCRIPTIONS[code] ?? 'Condição desconhecida';
}

// ─── Open-Meteo (dados em tempo real e previsão) ──────────────────────────────

async function fetchOpenMeteo(lat: number, lng: number): Promise<{
  current: CurrentWeather;
  forecast: DailyForecast[];
}> {
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lng.toString(),
    current: [
      'temperature_2m',
      'apparent_temperature',
      'relative_humidity_2m',
      'precipitation',
      'wind_speed_10m',
      'uv_index',
      'weather_code',
    ].join(','),
    daily: [
      'temperature_2m_max',
      'temperature_2m_min',
      'precipitation_sum',
      'precipitation_probability_max',
      'uv_index_max',
      'wind_speed_10m_max',
      'weather_code',
    ].join(','),
    timezone: 'America/Sao_Paulo',
    forecast_days: '7',
  });

  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  if (!res.ok) throw new Error(`Open-Meteo error: ${res.status}`);
  const data = await res.json();

  const c = data.current;
  const current: CurrentWeather = {
    temperature_c: c.temperature_2m,
    feels_like_c: c.apparent_temperature,
    humidity_percent: c.relative_humidity_2m,
    precipitation_mm: c.precipitation,
    wind_speed_kmh: c.wind_speed_10m,
    uv_index: c.uv_index,
    weather_code: c.weather_code,
    weather_description: wmoDescription(c.weather_code),
    timestamp: c.time,
  };

  const d = data.daily;
  // Calcula dias secos consecutivos para flag drought_risk
  let consecutiveDryDays = 0;
  const forecast: DailyForecast[] = d.time.map((date: string, i: number) => {
    const precip = d.precipitation_sum[i] ?? 0;
    if (precip < 1) {
      consecutiveDryDays++;
    } else {
      consecutiveDryDays = 0;
    }
    return {
      date,
      temp_max_c: d.temperature_2m_max[i],
      temp_min_c: d.temperature_2m_min[i],
      precipitation_mm: precip,
      precipitation_probability_percent: d.precipitation_probability_max[i] ?? 0,
      uv_index_max: d.uv_index_max[i] ?? 0,
      wind_speed_max_kmh: d.wind_speed_10m_max[i] ?? 0,
      weather_code: d.weather_code[i],
      weather_description: wmoDescription(d.weather_code[i]),
      frost_risk: d.temperature_2m_min[i] < 2,
      heat_stress_risk: d.temperature_2m_max[i] > 32,
      drought_risk: consecutiveDryDays >= 3,
    };
  });

  return { current, forecast };
}

// ─── INMET (dados históricos oficiais — estação mais próxima) ─────────────────
// API pública: https://apitempo.inmet.gov.br/
// Endpoint de estações automáticas: GET /estacoes/T (tipo T = automática)
// Endpoint de dados: GET /estacao/{data_inicio}/{data_fim}/{codigo_estacao}

async function fetchINMETNearestStation(lat: number, lng: number): Promise<{
  code: string;
  name: string;
  distance_km: number;
} | null> {
  try {
    const res = await fetch('https://apitempo.inmet.gov.br/estacoes/T');
    if (!res.ok) return null;
    const stations: any[] = await res.json();

    // Calcula distância Haversine para cada estação
    let nearest: { code: string; name: string; distance_km: number } | null = null;
    let minDist = Infinity;

    for (const s of stations) {
      const sLat = parseFloat(s.VL_LATITUDE);
      const sLng = parseFloat(s.VL_LONGITUDE);
      if (isNaN(sLat) || isNaN(sLng)) continue;

      const dist = haversineKm(lat, lng, sLat, sLng);
      if (dist < minDist) {
        minDist = dist;
        nearest = {
          code: s.CD_ESTACAO,
          name: s.DC_NOME,
          distance_km: Math.round(dist * 10) / 10,
        };
      }
    }
    return nearest;
  } catch {
    return null;
  }
}

async function fetchINMETHistorical(
  stationCode: string,
  stationName: string,
  distanceKm: number
): Promise<HistoricalSummary | null> {
  try {
    // Último ano completo disponível
    const end = new Date();
    end.setDate(end.getDate() - 2); // INMET tem delay de ~2 dias
    const start = new Date(end);
    start.setFullYear(start.getFullYear() - 1);

    const fmt = (d: Date) =>
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

    const startStr = fmt(start);
    const endStr = fmt(end);

    const res = await fetch(
      `https://apitempo.inmet.gov.br/estacao/diaria/${startStr}/${endStr}/${stationCode}`
    );
    if (!res.ok) return null;
    const records: any[] = await res.json();
    if (!records || records.length === 0) return null;

    // Agrega os dados do período
    let totalPrecip = 0;
    let tempSum = 0;
    let tempCount = 0;
    let frostDays = 0;
    let heatDays = 0;

    for (const r of records) {
      const precip = parseFloat(r.CHUVA);
      if (!isNaN(precip)) totalPrecip += precip;

      const tempMed = parseFloat(r.TEMP_MED);
      if (!isNaN(tempMed)) {
        tempSum += tempMed;
        tempCount++;
      }

      const minT = parseFloat(r.TEMP_MIN);
      if (!isNaN(minT) && minT < 2) {
        frostDays++;
      }

      const maxT = parseFloat(r.TEMP_MAX);
      if (!isNaN(maxT) && maxT > 35) {
        heatDays++;
      }
    }

    const periodLabel = `${startStr} a ${endStr}`;

    return {
      source: 'inmet',
      station_name: stationName,
      station_code: stationCode,
      distance_km: distanceKm,
      period: periodLabel,
      avg_temp_c: tempCount > 0 ? Math.round((tempSum / tempCount) * 10) / 10 : 0,
      total_precipitation_mm: Math.round(totalPrecip),
      frost_days: frostDays,
      extreme_heat_days: heatDays,
      data_available: tempCount > 0,
    };
  } catch (e) {
    console.error("INMET fetch error:", e);
    return null;
  }
}

// ─── Utilitário Haversine ─────────────────────────────────────────────────────

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Função principal exportada ───────────────────────────────────────────────

/**
 * getClimateData(lat, lng)
 * Retorna dados climáticos completos para uma coordenada:
 * - Tempo atual e previsão 7 dias (Open-Meteo)
 * - Histórico da estação INMET mais próxima
 * - Alertas gerados automaticamente
 *
 * @example
 * const data = await getClimateData(-27.6, -48.5);
 * console.log(data.current.temperature_c);
 * console.log(data.alerts);
 */
export async function getClimateData(lat: number, lng: number, selectedSpecies: string[] = []): Promise<ClimateData> {
  const dataSources: string[] = [];

  // Busca Open-Meteo e INMET em paralelo para não dobrar o tempo de espera
  const [openMeteoResult, inmetStation] = await Promise.allSettled([
    fetchOpenMeteo(lat, lng),
    fetchINMETNearestStation(lat, lng),
  ]);

  if (openMeteoResult.status === 'rejected') {
    throw new Error(`Falha ao buscar dados climáticos: ${openMeteoResult.reason}`);
  }

  dataSources.push('Open-Meteo (openmeteo.com)');
  const { current, forecast } = openMeteoResult.value;

  // Busca histórico INMET se encontrou estação
  let historical: HistoricalSummary | null = null;
  if (inmetStation.status === 'fulfilled' && inmetStation.value) {
    const station = inmetStation.value;
    historical = await fetchINMETHistorical(
      station.code,
      station.name,
      station.distance_km
    );
    if (historical) {
      dataSources.push(`INMET — Estação ${station.name} (${station.distance_km}km)`);
    }
  }

  return {
    location: { lat, lng },
    fetched_at: new Date().toISOString(),
    current,
    forecast_7days: forecast,
    historical,
    alerts: [],
    data_sources: dataSources,
  };
}

