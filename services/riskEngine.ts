// services/riskEngine.ts
// Motor de risco que conecta dados climáticos medidos com limiares científicos
// e prepara o contexto estruturado para o Gemini interpretar
//
// FLUXO:
// ClimateData (Open-Meteo + INMET)
//   → evaluateThresholds() (scientificThresholds.ts)
//     → RiskReport (alertas com referências)
//       → buildGeminiContext() (prompt científico estruturado)
//         → Gemini (interpreta — não inventa)
//           → RiskAnalysis (resposta rastreável)

import {
  ClimateData,
  DailyForecast,
} from './climateService';

import {
  evaluateThresholds,
  calculateTHI,
  getTHICategory,
  EvidenceBasedAlert,
  SCIENTIFIC_THRESHOLDS,
} from './scientificThresholds';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AnimalObservation {
  species: string;
  behavior: string;
  occurrences: string;
  body_condition: string;
  notes: string;
  recorded_at: string;
}

export interface VegetalObservation {
  selected_species: string[];
  system_stage: 'implantacao' | 'desenvolvimento' | 'producao';
  observed_problems: string[];
  notes: string;
}

export interface RiskReport {
  generated_at: string;
  location: { lat: number; lng: number; name?: string };
  thi: {
    value: number;
    category: string;
    severity: string;
  };
  consecutive_dry_days: number;
  evidence_based_alerts: EvidenceBasedAlert[];
  alert_summary: {
    emergency: number;
    warning: number;
    watch: number;
    total: number;
  };
  climate_snapshot: {
    temp_max_c: number;
    temp_min_c: number;
    temp_current_c: number;
    humidity_percent: number;
    precipitation_mm: number;
    uv_index: number;
  };
  forecast_risks: ForecastRisk[];
  data_sources: string[];
}

export interface ForecastRisk {
  date: string;
  day_label: string;
  risks: {
    type: string;
    severity: 'watch' | 'warning' | 'emergency';
    description: string;
    citation: string;
  }[];
}

export interface GeminiContext {
  prompt: string;
  structured_data: RiskReport;
}

export interface RiskAnalysis {
  report: RiskReport;
  gemini_interpretation: string;
  citations_used: string[];
  limitations: string[];
}

// ─── Utilitários ──────────────────────────────────────────────────────────────

function getDayLabel(dateStr: string): string {
  const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const date = new Date(dateStr + 'T12:00:00');
  return days[date.getDay()];
}

function countConsecutiveDryDays(forecast: DailyForecast[]): number {
  let count = 0;
  for (const day of forecast) {
    if (day.precipitation_mm < 1) {
      count++;
    } else {
      break;
    }
  }
  return count;
}

// ─── Motor principal ──────────────────────────────────────────────────────────

/**
 * generateRiskReport()
 * Cruza dados climáticos com limiares científicos e gera
 * relatório de risco totalmente rastreável — sem IA envolvida nessa etapa.
 */
export function generateRiskReport(
  climateData: ClimateData,
  selectedSpecies: string[],
  animalSpecies: string[]
): RiskReport {
  const current = climateData.current;
  const forecast = climateData.forecast_7days;

  // THI calculado a partir de dados medidos
  const thi = calculateTHI(current.temperature_c, current.humidity_percent);
  const thiCategory = getTHICategory(thi);

  // Dias secos consecutivos a partir da previsão
  const consecutiveDryDays = countConsecutiveDryDays(forecast);

  // Temperatura máxima e mínima da previsão imediata (próximas 24h)
  const nextDay = forecast[0];
  const temp_max = nextDay?.temp_max_c ?? current.temperature_c;
  const temp_min = nextDay?.temp_min_c ?? current.temperature_c;

  // Todas as espécies selecionadas (vegetais + animais)
  const allSpecies = [...selectedSpecies, ...animalSpecies];

  // Avalia limiares com base nos dados medidos
  const evidenceAlerts = evaluateThresholds(
    temp_max,
    temp_min,
    current.humidity_percent,
    current.precipitation_mm,
    consecutiveDryDays,
    allSpecies
  );

  // Resumo de severidade
  const alertSummary = {
    emergency: evidenceAlerts.filter(a => a.severity === 'emergency').length,
    warning: evidenceAlerts.filter(a => a.severity === 'warning').length,
    watch: evidenceAlerts.filter(a => a.severity === 'watch').length,
    total: evidenceAlerts.length,
  };

  // Riscos por dia da previsão
  const forecastRisks: ForecastRisk[] = forecast.map(day => {
    const dayAlerts = evaluateThresholds(
      day.temp_max_c,
      day.temp_min_c,
      current.humidity_percent, // umidade atual como proxy
      day.precipitation_mm,
      consecutiveDryDays,
      allSpecies
    );

    return {
      date: day.date,
      day_label: getDayLabel(day.date),
      risks: dayAlerts.map(a => ({
        type: a.threshold.stressor,
        severity: a.severity,
        description: a.threshold.effect,
        citation: a.citation,
      })),
    };
  });

  return {
    generated_at: new Date().toISOString(),
    location: climateData.location,
    thi: {
      value: Math.round(thi * 10) / 10,
      category: thiCategory.label,
      severity: thiCategory.severity,
    },
    consecutive_dry_days: consecutiveDryDays,
    evidence_based_alerts: evidenceAlerts,
    alert_summary: alertSummary,
    climate_snapshot: {
      temp_max_c: temp_max,
      temp_min_c: temp_min,
      temp_current_c: current.temperature_c,
      humidity_percent: current.humidity_percent,
      precipitation_mm: current.precipitation_mm,
      uv_index: current.uv_index,
    },
    forecast_risks: forecastRisks,
    data_sources: climateData.data_sources,
  };
}

// ─── Construtor do prompt científico para o Gemini ────────────────────────────

/**
 * buildGeminiContext()
 * Constrói o prompt estruturado que vai para o Gemini.
 * O Gemini recebe dados medidos + limiares já avaliados + referências.
 * Sua função é INTERPRETAR e REDIGIR — não inventar limiares ou dados.
 */
export function buildGeminiContext(
  report: RiskReport,
  climateData: ClimateData,
  vegetalObs: VegetalObservation,
  animalObs: AnimalObservation | null
): GeminiContext {
  const alerts = report.evidence_based_alerts;
  const hasAlerts = alerts.length > 0;
  const hasAnimalObs = animalObs !== null;

  // Lista de citações que serão usadas
  const citations = [
    ...new Set(alerts.map(a => a.citation)),
  ];

  const prompt = `
Você é um sistema de suporte a decisões agronômicas baseado em evidências científicas.
Sua função é INTERPRETAR os dados abaixo e redigir uma análise em PT-BR clara e objetiva.

REGRAS OBRIGATÓRIAS:
1. Cite explicitamente os valores medidos que embasam cada afirmação
2. Cada recomendação de manejo deve citar o limiar científico que a justifica
3. NÃO gere informações além do que os dados permitem concluir
4. Se os dados forem insuficientes para uma conclusão, diga isso explicitamente
5. Use linguagem acessível para o agricultor — evite jargão técnico desnecessário
6. Nunca invente limiares, espécies ou condições não presentes nos dados abaixo

════════════════════════════════════════════════════════════
DADOS CLIMÁTICOS MEDIDOS
Fontes: ${report.data_sources.join(' · ')}
Consultado em: ${new Date(report.generated_at).toLocaleString('pt-BR')}
════════════════════════════════════════════════════════════

CONDIÇÃO ATUAL:
• Temperatura: ${report.climate_snapshot.temp_current_c}°C
• Máxima prevista (próx. 24h): ${report.climate_snapshot.temp_max_c}°C
• Mínima prevista (próx. 24h): ${report.climate_snapshot.temp_min_c}°C
• Umidade relativa: ${report.climate_snapshot.humidity_percent}%
• Precipitação hoje: ${report.climate_snapshot.precipitation_mm}mm
• Índice UV: ${report.climate_snapshot.uv_index}
• THI calculado: ${report.thi.value} — ${report.thi.category}
  (THI = Temperature-Humidity Index, fórmula de Thom 1959,
   limiar de estresse bovino: 72 = leve, 80 = severo, 90 = crítico — West 2003)
• Dias consecutivos sem chuva: ${report.consecutive_dry_days}

PREVISÃO 7 DIAS:
${climateData.forecast_7days.map(d =>
  `• ${getDayLabel(d.date)} ${d.date}: ${d.temp_min_c}°C–${d.temp_max_c}°C, ` +
  `${d.precipitation_mm}mm chuva (${d.precipitation_probability_percent}% prob.)` +
  (d.frost_risk ? ' [RISCO DE GEADA]' : '') +
  (d.heat_stress_risk ? ' [RISCO DE CALOR]' : '') +
  (d.drought_risk ? ' [RISCO DE SECA]' : '')
).join('\n')}

${climateData.historical ? `
HISTÓRICO ANUAL — INMET (${climateData.historical.station_name}, ${climateData.historical.distance_km}km):
• Temperatura média: ${climateData.historical.avg_temp_c}°C
• Precipitação total: ${climateData.historical.total_precipitation_mm}mm
• Dias de geada: ${climateData.historical.frost_days}
• Dias de calor extremo (>35°C): ${climateData.historical.extreme_heat_days}
` : ''}

════════════════════════════════════════════════════════════
SISTEMA DA PROPRIEDADE
════════════════════════════════════════════════════════════

Espécies cultivadas: ${vegetalObs.selected_species.join(', ') || 'não informado'}
Estágio do sistema: ${vegetalObs.system_stage}
Problemas observados: ${vegetalObs.observed_problems.join(', ') || 'nenhum relatado'}
${vegetalObs.notes ? `Descrição do agricultor: "${vegetalObs.notes}"` : ''}

${hasAnimalObs ? `
Animais: ${animalObs!.species}
Comportamento: ${animalObs!.behavior}
Ocorrências: ${animalObs!.occurrences}
Condição corporal: ${animalObs!.body_condition}
${animalObs!.notes ? `Observação: "${animalObs!.notes}"` : ''}
Registrado em: ${new Date(animalObs!.recorded_at).toLocaleString('pt-BR')}
` : 'Sem observações de animais registradas.'}

════════════════════════════════════════════════════════════
ALERTAS GERADOS PELO MOTOR DE LIMIARES CIENTÍFICOS
(${alerts.length} alertas — ${report.alert_summary.emergency} emergência, ${report.alert_summary.warning} atenção, ${report.alert_summary.watch} observação)
════════════════════════════════════════════════════════════

${hasAlerts ? alerts.map(a =>
  `[${a.severity.toUpperCase()}] ${a.threshold.stressor} — ${a.threshold.species}
  Valor medido: ${a.threshold.variable === 'thi' ? `THI ${a.thi_value?.toFixed(1)}` : `${a.measured_value} (limiar: ${a.threshold.operator}${a.threshold.value})`}
  Efeito documentado: ${a.threshold.effect}
  Referência: ${a.citation}
  DOI: ${a.threshold.reference.doi}`
).join('\n\n') : 'Nenhum limiar científico foi ultrapassado com os dados atuais.'}

════════════════════════════════════════════════════════════
RESPONDA EXATAMENTE NESSA ESTRUTURA (em PT-BR)
════════════════════════════════════════════════════════════

## 1. DIAGNÓSTICO CLIMÁTICO
Com base nos dados medidos, descreva o padrão climático atual.
Compare com o histórico da região se disponível.
Cite os valores — ex: "temperatura de X°C está Y°C acima da média histórica de Z°C (INMET, estação X)"

## 2. VULNERABILIDADES POR ESPÉCIE
Para cada espécie informada, indique:
- Nível de risco: BAIXO / MÉDIO / ALTO
- Justificativa baseada nos dados medidos e nos limiares científicos ativados
- Cite a referência — ex: "limiar de X°C documentado por Autor (Ano), DOI"
Se uma espécie não tem limiar na base de dados, diga isso claramente.

## 3. RELAÇÃO CLIMA–OBSERVAÇÃO DO AGRICULTOR
Se o agricultor relatou problemas, avalie se há correlação com os dados climáticos.
Seja objetivo: afirme correlação apenas se os dados a suportam.
Se não há dados suficientes, diga: "não é possível estabelecer relação com os dados disponíveis."

## 4. RECOMENDAÇÕES DE MANEJO — PRÓXIMOS 7 DIAS
Liste ações preventivas em ordem de prioridade.
Cada ação deve citar o dado que a justifica.
Formato: "Prioridade [Alta/Média/Baixa]: [Ação] — justificado por [dado medido] (Referência)"

## 5. LIMITAÇÕES DESTA ANÁLISE
O que não pode ser concluído com os dados disponíveis.
O que o agricultor deveria monitorar para melhorar a precisão nas próximas análises.

Referências utilizadas nesta análise: ${citations.join(' · ')}
`;

  return {
    prompt,
    structured_data: report,
  };
}

/**
 * formatAlertForDisplay()
 * Formata um alerta para exibição na interface — com citação visível
 */
export function formatAlertForDisplay(alert: EvidenceBasedAlert): {
  title: string;
  message: string;
  citation_badge: string;
  severity: string;
  actions: string[];
} {
  const measuredLabel =
    alert.threshold.variable === 'thi'
      ? `THI ${alert.thi_value?.toFixed(1)}`
      : `${alert.measured_value}${
          alert.threshold.variable.includes('temp') ? '°C' :
          alert.threshold.variable.includes('precipitation') ? 'mm' :
          alert.threshold.variable.includes('days') ? ' dias' : ''
        }`;

  return {
    title: `${alert.threshold.stressor} — ${alert.threshold.species}`,
    message: `${measuredLabel} ${alert.threshold.operator}${alert.threshold.value} · ${alert.threshold.effect}`,
    citation_badge: alert.citation,
    severity: alert.severity,
    actions: alert.threshold.management_actions,
  };
}

/**
 * getLocalStorageKey()
 * Chave padronizada para salvar observações no localStorage
 */
export function buildObservationRecord(
  report: RiskReport,
  vegetalObs: VegetalObservation,
  animalObs: AnimalObservation | null
) {
  return {
    id: Date.now(),
    recorded_at: new Date().toISOString(),
    location: report.location,
    climate_snapshot: report.climate_snapshot,
    thi: report.thi,
    consecutive_dry_days: report.consecutive_dry_days,
    active_alerts: report.evidence_based_alerts.map(a => ({
      stressor: a.threshold.stressor,
      species: a.threshold.species,
      severity: a.severity,
      measured_value: a.measured_value,
      citation: a.citation,
    })),
    vegetal: vegetalObs,
    animal: animalObs,
  };
}
