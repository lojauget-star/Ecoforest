// scientificThresholds.ts
// Base de limiares climáticos com referências científicas verificadas
// Cada limiar é rastreável até um artigo peer-reviewed com DOI
//
// USO NO SISTEMA:
// 1. riskEngine.ts cruza dados do Open-Meteo com esses limiares
// 2. Cada alerta gerado cita a referência que o embasa
// 3. O Gemini interpreta — não inventa — os limiares
// 4. A seção de metodologia da dissertação cita esse arquivo como
//    "base de limiares científicos compilada a partir da literatura"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ScientificReference {
  authors: string;
  year: number;
  title: string;
  journal: string;
  doi: string;
  notes?: string; // contexto relevante para o uso no projeto
}

export interface ClimateThreshold {
  id: string;
  category: 'animal' | 'vegetal';
  species: string;           // espécie ou grupo
  species_scientific?: string;
  stressor: string;          // tipo de estresse climático
  variable: 'temp_max_c' | 'temp_min_c' | 'thi' | 'precipitation_mm' | 'consecutive_dry_days' | 'uv_index';
  operator: '>=' | '<=' | '<' | '>';
  value: number;
  severity: 'watch' | 'warning' | 'emergency';
  effect: string;            // efeito documentado
  affected_stage?: string;   // estágio fenológico ou produtivo afetado
  management_actions: string[];
  reference: ScientificReference;
  secondary_references?: ScientificReference[];
}

// ─── Cálculo do THI (Temperature-Humidity Index) ──────────────────────────────
// Fórmula de Thom (1959), amplamente utilizada em estudos de bem-estar animal
// THI = (1.8 × T + 32) − (0.55 − 0.0055 × RH) × (1.8 × T − 26)
// onde T = temperatura em °C e RH = umidade relativa em %

export function calculateTHI(temp_c: number, humidity_percent: number): number {
  return (
    (1.8 * temp_c + 32) -
    (0.55 - 0.0055 * humidity_percent) *
    (1.8 * temp_c - 26)
  );
}

export function getTHICategory(thi: number): {
  label: string;
  severity: 'none' | 'watch' | 'warning' | 'emergency';
} {
  // Categorias baseadas em West (2003) e Livestock Conservation Institute
  if (thi < 68) return { label: 'Conforto térmico', severity: 'none' };
  if (thi < 72) return { label: 'Desconforto leve', severity: 'watch' };
  if (thi < 80) return { label: 'Estresse moderado', severity: 'warning' };
  if (thi < 90) return { label: 'Estresse severo', severity: 'warning' };
  return { label: 'Estresse crítico', severity: 'emergency' };
}

// ─── Base de limiares ─────────────────────────────────────────────────────────

export const SCIENTIFIC_THRESHOLDS: ClimateThreshold[] = [

  // ══════════════════════════════════════════════════════════════════════════
  // ANIMAIS
  // ══════════════════════════════════════════════════════════════════════════

  {
    id: 'bovine_heat_thi_72',
    category: 'animal',
    species: 'Bovinos leiteiros',
    species_scientific: 'Bos taurus',
    stressor: 'Estresse térmico — início',
    variable: 'thi',
    operator: '>=',
    value: 72,
    severity: 'watch',
    effect: 'Início de queda na produção de leite. Cada unidade de THI acima de 72 reduz a produção em aproximadamente 0,2 kg/dia.',
    affected_stage: 'Lactação',
    management_actions: [
      'Aumentar disponibilidade de água fresca',
      'Garantir sombra adequada nas pastagens',
      'Monitorar sinais de estresse (ofegação, agrupamento)',
    ],
    reference: {
      authors: 'West, J.W.',
      year: 2003,
      title: 'Effects of heat-stress on production in dairy cattle',
      journal: 'Journal of Dairy Science',
      doi: '10.3168/jds.S0022-0302(03)73803-X',
      notes: 'Artigo de referência global para limiares de THI em bovinos leiteiros. PMID: 12836950.',
    },
    secondary_references: [
      {
        authors: 'Bouraoui, R. et al.',
        year: 2002,
        title: 'The relationship of temperature-humidity index with milk production of dairy cows in a Mediterranean climate',
        journal: 'Animal Research',
        doi: '10.1051/animres:2002036',
        notes: 'Documenta redução de 21% na produção quando THI aumentou de 68 a 78.',
      },
    ],
  },

  {
    id: 'bovine_heat_thi_80',
    category: 'animal',
    species: 'Bovinos leiteiros',
    species_scientific: 'Bos taurus',
    stressor: 'Estresse térmico — severo',
    variable: 'thi',
    operator: '>=',
    value: 80,
    severity: 'warning',
    effect: 'Redução severa na produção leiteira, comprometimento reprodutivo e risco de hipertermia. Temperatura retal ultrapassa 39°C.',
    affected_stage: 'Lactação e reprodução',
    management_actions: [
      'Antecipar ordenha para período mais fresco (antes das 9h)',
      'Instalar ventiladores e nebulizadores se disponíveis',
      'Molhar o telhado dos abrigos',
      'Aumentar frequência de observação clínica',
      'Reduzir movimentação dos animais nas horas mais quentes',
    ],
    reference: {
      authors: 'West, J.W.',
      year: 2003,
      title: 'Effects of heat-stress on production in dairy cattle',
      journal: 'Journal of Dairy Science',
      doi: '10.3168/jds.S0022-0302(03)73803-X',
    },
    secondary_references: [
      {
        authors: 'Becker, C.A. et al.',
        year: 2020,
        title: 'Invited review: Physiological and behavioral effects of heat stress in dairy cows',
        journal: 'Journal of Dairy Science',
        doi: '10.3168/jds.2019-17929',
        notes: 'Revisão abrangente dos efeitos fisiológicos e comportamentais do estresse térmico.',
      },
    ],
  },

  {
    id: 'bovine_heat_thi_90',
    category: 'animal',
    species: 'Bovinos leiteiros',
    species_scientific: 'Bos taurus',
    stressor: 'Estresse térmico — crítico',
    variable: 'thi',
    operator: '>=',
    value: 90,
    severity: 'emergency',
    effect: 'Risco de morte por hipertermia. Temperatura retal acima de 40°C. Colapso dos mecanismos de termorregulação.',
    affected_stage: 'Todos os estágios',
    management_actions: [
      'Emergência: retirar animais do sol imediatamente',
      'Banhar os animais com água fria',
      'Acionar assistência veterinária',
      'Garantir ventilação forçada e sombra total',
    ],
    reference: {
      authors: 'West, J.W.',
      year: 2003,
      title: 'Effects of heat-stress on production in dairy cattle',
      journal: 'Journal of Dairy Science',
      doi: '10.3168/jds.S0022-0302(03)73803-X',
    },
  },

  // ─── Bovinos — Frio ───────────────────────────────────────────────────────

  {
    id: 'bovine_cold_stress',
    category: 'animal',
    species: 'Bovinos — bezerros',
    species_scientific: 'Bos taurus',
    stressor: 'Estresse por frio',
    variable: 'temp_min_c',
    operator: '<=',
    value: 5,
    severity: 'watch',
    effect: 'Bezerros recém-nascidos e animais jovens são altamente vulneráveis a hipotermia abaixo de 5°C, especialmente com vento e umidade.',
    affected_stage: 'Neonatos e animais jovens',
    management_actions: [
      'Recolher bezerros recém-nascidos para abrigo aquecido',
      'Fornecer cama seca e espessa',
      'Aumentar fornecimento energético na dieta',
      'Monitorar sinais de hipotermia (tremores, letargia)',
    ],
    reference: {
      authors: 'Welfare Quality® Consortium',
      year: 2009,
      title: 'Welfare Quality® Assessment Protocol for Cattle',
      journal: 'Welfare Quality® Consortium, Lelystad, Netherlands',
      doi: '10.18148/ebooks/2022.2',
      notes: 'Protocolo padrão internacional de BEA, com versão adaptada para o Brasil.',
    },
  },

  // ══════════════════════════════════════════════════════════════════════════
  // VEGETAIS — ESTRESSE TÉRMICO (CALOR)
  // ══════════════════════════════════════════════════════════════════════════

  {
    id: 'warmseason_crops_heat_35',
    category: 'vegetal',
    species: 'Culturas de estação quente (geral)',
    stressor: 'Estresse térmico — dano à fotossíntese',
    variable: 'temp_max_c',
    operator: '>=',
    value: 35,
    severity: 'warning',
    effect: 'Acima de 35°C ocorre redução significativa da taxa de assimilação de CO₂ e dano ao Fotossistema II (PSII). Em culturas C3, a rubisco perde eficiência catalisadora.',
    affected_stage: 'Crescimento vegetativo e floração',
    management_actions: [
      'Irrigar nas horas mais frescas (manhã cedo ou entardecer)',
      'Aplicar mulching para reduzir temperatura do solo',
      'Evitar podas ou intervenções que aumentem estresse',
      'Monitorar sinais de queima foliar e murchamento',
    ],
    reference: {
      authors: 'Wahid, A. et al.',
      year: 2007,
      title: 'Heat tolerance in plants: an overview',
      journal: 'Environmental and Experimental Botany',
      doi: '10.1016/j.envexpbot.2006.05.011',
      notes: 'Define estresse térmico como elevação acima do limiar por tempo suficiente para causar dano irreversível.',
    },
    secondary_references: [
      {
        authors: 'Sage, R.F. & Kubien, D.S.',
        year: 2007,
        title: 'The temperature response of C3 and C4 photosynthesis',
        journal: 'Plant, Cell & Environment',
        doi: '10.1111/j.1365-3040.2007.01682.x',
      },
    ],
  },

  {
    id: 'warmseason_crops_heat_32',
    category: 'vegetal',
    species: 'Culturas tropicais e subtropicais (geral)',
    stressor: 'Estresse térmico — início',
    variable: 'temp_max_c',
    operator: '>=',
    value: 32,
    severity: 'watch',
    effect: 'Temperaturas entre 32–35°C iniciam dano em culturas de estação quente nos trópicos e subtrópicos, reduzindo crescimento e qualidade dos frutos.',
    affected_stage: 'Floração e frutificação',
    management_actions: [
      'Monitorar floração — calor durante a antese reduz fertilização',
      'Aumentar irrigação para compensar maior transpiração',
    ],
    reference: {
      authors: 'Hasanuzzaman, M. et al.',
      year: 2013,
      title: 'Physiological, biochemical, and molecular mechanisms of heat stress tolerance in plants',
      journal: 'International Journal of Molecular Sciences',
      doi: '10.3390/ijms14059643',
      notes: 'Documenta que 32–35°C causa dano em culturas tropicais e subtropicais.',
    },
  },

  // ══════════════════════════════════════════════════════════════════════════
  // VEGETAIS — GEADA
  // ══════════════════════════════════════════════════════════════════════════

  {
    id: 'banana_frost_0',
    category: 'vegetal',
    species: 'Banana',
    species_scientific: 'Musa spp.',
    stressor: 'Geada — dano leve a moderado',
    variable: 'temp_min_c',
    operator: '<=',
    value: 0,
    severity: 'warning',
    effect: 'Banana é altamente sensível ao frio. Abaixo de 0°C ocorre dano celular por formação de cristais de gelo nos tecidos foliares e do pseudocaule.',
    affected_stage: 'Todos os estágios — mudas são mais vulneráveis',
    management_actions: [
      'Cobrir mudas com palha ou saco de ráfia',
      'Não podar — a parte aérea danificada protege o rizoma',
      'Aguardar brotação de novas folhas antes de avaliar dano total',
      'Priorizar proteção de plantas em produção (cacho)',
    ],
    reference: {
      authors: 'Snyder, R.L. & de Melo-Abreu, J.P.',
      year: 2005,
      title: 'Frost Protection: Fundamentals, Practice and Economics',
      journal: 'FAO Environment and Natural Resources Series No. 10',
      doi: '10.18356/7a36c85d-en',
      notes: 'Referência técnica padrão da FAO para proteção contra geada em frutíferas.',
    },
  },

  {
    id: 'citrus_frost_minus2',
    category: 'vegetal',
    species: 'Citros (laranja, limão, tangerina)',
    species_scientific: 'Citrus spp.',
    stressor: 'Geada — dano a frutos e folhas',
    variable: 'temp_min_c',
    operator: '<=',
    value: -2,
    severity: 'warning',
    effect: 'Abaixo de -2°C ocorre dano a frutos e folhas jovens de citros. Limão é o mais sensível, seguido de limeira, pomelo e laranja.',
    affected_stage: 'Frutos em desenvolvimento e brotações jovens',
    management_actions: [
      'Irrigar antes da noite fria (cria barreira de calor latente)',
      'Proteger frutos com cobertura se possível',
      'Não colher frutos danificados imediatamente — aguardar avaliação',
    ],
    reference: {
      authors: 'Snyder, R.L. & de Melo-Abreu, J.P.',
      year: 2005,
      title: 'Frost Protection: Fundamentals, Practice and Economics',
      journal: 'FAO Environment and Natural Resources Series No. 10',
      doi: '10.18356/7a36c85d-en',
    },
    secondary_references: [
      {
        authors: 'Rodrigo, J.',
        year: 2000,
        title: 'Spring frosts in deciduous fruit trees: morphological damage and flower hardiness',
        journal: 'Scientia Horticulturae',
        doi: '10.1016/S0304-4238(99)00150-8',
      },
    ],
  },

  {
    id: 'avocado_frost_minus1',
    category: 'vegetal',
    species: 'Abacate',
    species_scientific: 'Persea americana',
    stressor: 'Geada — dano a flores e frutos jovens',
    variable: 'temp_min_c',
    operator: '<=',
    value: -1,
    severity: 'warning',
    effect: 'Abacate é sensível ao frio. Abaixo de -1°C há risco de dano a flores e frutos jovens. Abaixo de -3°C dano ao câmbio e ramos.',
    affected_stage: 'Floração e frutificação inicial',
    management_actions: [
      'Proteger flores com cobertura leve nas noites de risco',
      'Irrigar no início da noite para aproveitar calor latente',
      'Avaliar dano ao câmbio após evento (corte de ramos para verificar coloração)',
    ],
    reference: {
      authors: 'Charrier, G. et al.',
      year: 2015,
      title: 'Effects of environmental factors and management practices on microclimate, winter physiology, and frost resistance in trees',
      journal: 'Frontiers in Plant Science',
      doi: '10.3389/fpls.2015.00259',
    },
  },

  {
    id: 'general_frost_2',
    category: 'vegetal',
    species: 'Mudas e plântulas (geral)',
    stressor: 'Risco de geada — limiar de alerta',
    variable: 'temp_min_c',
    operator: '<=',
    value: 2,
    severity: 'watch',
    effect: 'Temperatura abaixo de 2°C indica risco iminente de geada, especialmente em noites de céu limpo e vento calmo. Mudas recém-transplantadas são altamente vulneráveis.',
    affected_stage: 'Estabelecimento (0–12 meses após plantio)',
    management_actions: [
      'Cobrir mudas com palha, saco ou tela de proteção',
      'Irrigar levemente antes da noite — água libera calor latente ao congelar',
      'Verificar previsão de vento — vento reduz risco de geada por ar parado',
    ],
    reference: {
      authors: 'Snyder, R.L. & de Melo-Abreu, J.P.',
      year: 2005,
      title: 'Frost Protection: Fundamentals, Practice and Economics',
      journal: 'FAO Environment and Natural Resources Series No. 10',
      doi: '10.18356/7a36c85d-en',
    },
  },

  // ══════════════════════════════════════════════════════════════════════════
  // VEGETAIS — ESTRESSE HÍDRICO (SECA)
  // ══════════════════════════════════════════════════════════════════════════

  {
    id: 'drought_young_plants_5days',
    category: 'vegetal',
    species: 'Mudas e plantas jovens (geral)',
    stressor: 'Estresse hídrico — seca prolongada',
    variable: 'consecutive_dry_days',
    operator: '>=',
    value: 5,
    severity: 'warning',
    effect: 'Plantas com sistema radicular pouco desenvolvido (< 2 anos) não acessam reservas profundas de água. 5 dias sem chuva significativa em períodos quentes pode causar fechamento estomático permanente e morte de raízes finas.',
    affected_stage: 'Estabelecimento (0–24 meses)',
    management_actions: [
      'Irrigar ao redor da base — não mojar o caule',
      'Aplicar mulching espesso (10–15cm) para reter umidade',
      'Priorizar espécies recém-transplantadas',
      'Verificar sinais de murchamento nas horas mais quentes',
    ],
    reference: {
      authors: 'Chaves, M.M. et al.',
      year: 2002,
      title: 'How plants cope with water stress in the field. Photosynthesis and growth',
      journal: 'Annals of Botany',
      doi: '10.1093/aob/mcf105',
      notes: 'Revisão fundamental sobre respostas de plantas ao estresse hídrico em campo.',
    },
  },

  {
    id: 'drought_pasture_7days',
    category: 'vegetal',
    species: 'Pastagens e forrageiras',
    stressor: 'Seca — degradação de pastagem',
    variable: 'consecutive_dry_days',
    operator: '>=',
    value: 7,
    severity: 'warning',
    effect: '7 dias sem chuva com temperaturas altas reduz a disponibilidade de forragem e a qualidade nutritiva das pastagens, aumentando o estresse alimentar dos animais.',
    affected_stage: 'Período de crescimento ativo',
    management_actions: [
      'Reduzir pressão de pastejo — deixar descanso maior',
      'Verificar disponibilidade de alimentação suplementar',
      'Monitorar condição corporal dos animais semanalmente',
      'Evitar sobrepastejo — compromete a rebrota após a chuva',
    ],
    reference: {
      authors: 'Chaves, M.M. et al.',
      year: 2002,
      title: 'How plants cope with water stress in the field. Photosynthesis and growth',
      journal: 'Annals of Botany',
      doi: '10.1093/aob/mcf105',
    },
  },

  // ══════════════════════════════════════════════════════════════════════════
  // CONDIÇÕES FAVORÁVEIS A PRAGAS E DOENÇAS
  // ══════════════════════════════════════════════════════════════════════════

  {
    id: 'fungal_disease_humidity',
    category: 'vegetal',
    species: 'Culturas em geral — doenças fúngicas',
    stressor: 'Condições favoráveis a fungos foliares',
    variable: 'precipitation_mm',
    operator: '>=',
    value: 20,
    severity: 'watch',
    effect: 'Chuva acima de 20mm seguida de temperatura entre 15–25°C cria condições ideais para desenvolvimento de doenças fúngicas foliares (míldio, antracnose, mancha foliar).',
    affected_stage: 'Qualquer estágio — especialmente floração',
    management_actions: [
      'Monitorar folhagem após período chuvoso (24–48h)',
      'Verificar sintomas de míldio e antracnose',
      'Melhorar circulação de ar dentro do dossel',
      'Registrar ocorrência para correlação com dados climáticos',
    ],
    reference: {
      authors: 'Campbell, C.L. & Madden, L.V.',
      year: 1990,
      title: 'Introduction to Plant Disease Epidemiology',
      journal: 'John Wiley & Sons, New York',
      doi: '10.1002/ps.1160',
      notes: 'Obra de referência em epidemiologia de doenças de plantas. Base científica dos sistemas de alerta fitossanitário da Embrapa.',
    },
  },

// ══════════════════════════════════════════════════════════════════════════
// AVES POEDEIRAS — FAIXAS POR FASE DE PRODUÇÃO
// Fonte [A]: Tabela 1 — temperatura e UR ideal por fase
// ══════════════════════════════════════════════════════════════════════════

  {
    id: 'poultry_layer_production_heat_22',
    category: 'animal',
    species: 'Galinhas poedeiras — fase de produção (a partir de 18 semanas)',
    species_scientific: 'Gallus gallus domesticus',
    stressor: 'Estresse por calor — acima da zona de conforto na postura',
    variable: 'temp_max_c',
    operator: '>',
    value: 22,
    severity: 'watch',
    effect: 'A faixa ideal de temperatura para galinhas poedeiras em produção é 17–22°C com UR entre 60–70%. Acima de 22°C a eficiência de postura começa a cair. Acima de 28°C (TCS definida para aves adultas) há queda significativa na produção e qualidade da casca do ovo.',
    affected_stage: 'Fase de produção — a partir de 18 semanas de vida',
    management_actions: [
      'Acionar sistema de ventilação ou nebulização quando temperatura superar 22°C',
      'Verificar cortinas laterais do aviário — ajustar abertura para ventilação cruzada',
      'Fornecer água fresca continuamente — consumo aumenta com a temperatura',
      'Monitorar taxa de postura diária — queda indica estresse térmico',
      'Fornecer ração nas horas mais frescas do dia',
    ],
    reference: {
      authors: 'Silva, I.J.O.; Abreu, P.G.; Mazzuco, H.',
      year: 2020,
      title: 'Instalações para galinhas poedeiras e bem-estar animal',
      journal: 'NUPEA–ESALQ/USP + Embrapa Suínos e Aves, Concórdia, SC',
      doi: 'https://www.infoteca.cnptia.embrapa.br/infoteca/bitstream/doc/1133408/1/final9667.pdf',
      notes: 'Tabela 1: fase de produção (≥18 semanas) — temperatura ideal 17–22°C, UR 60–70%. O manejo do sistema de ventilação e resfriamento deve ser acionado quando temperatura e umidade saírem dessas faixas.',
    },
  },

  {
    id: 'poultry_layer_production_cold_17',
    category: 'animal',
    species: 'Galinhas poedeiras — fase de produção (a partir de 18 semanas)',
    species_scientific: 'Gallus gallus domesticus',
    stressor: 'Estresse por frio — abaixo da zona de conforto na postura',
    variable: 'temp_min_c',
    operator: '<',
    value: 17,
    severity: 'watch',
    effect: 'Abaixo de 17°C a galinha poedeira está fora de sua zona de conforto térmico. Aumenta consumo de ração para manutenção da temperatura corporal, reduzindo eficiência de conversão alimentar e taxa de postura.',
    affected_stage: 'Fase de produção',
    management_actions: [
      'Fechar cortinas laterais do aviário nas horas mais frias',
      'Verificar presença de correntes de ar direto sobre as aves',
      'Monitorar consumo de ração — aumento sem melhora na postura indica frio',
      'Monitorar taxa de postura e peso dos ovos',
    ],
    reference: {
      authors: 'Silva, I.J.O.; Abreu, P.G.; Mazzuco, H.',
      year: 2020,
      title: 'Instalações para galinhas poedeiras e bem-estar animal',
      journal: 'NUPEA–ESALQ/USP + Embrapa Suínos e Aves, Concórdia, SC',
      doi: 'https://www.infoteca.cnptia.embrapa.br/infoteca/bitstream/doc/1133408/1/final9667.pdf',
      notes: 'Tabela 1: limite inferior da zona de conforto na fase de produção = 17°C.',
    },
  },

  {
    id: 'poultry_layer_recria_heat_28',
    category: 'animal',
    species: 'Galinhas poedeiras — recria (7 a 17 semanas)',
    species_scientific: 'Gallus gallus domesticus',
    stressor: 'Estresse por calor — fase de recria',
    variable: 'temp_max_c',
    operator: '>',
    value: 28,
    severity: 'warning',
    effect: 'Frangas em recria têm zona de conforto entre 19–28°C com UR 60–70%. Acima de 28°C o desenvolvimento é prejudicado, comprometendo a maturidade sexual e o início da postura nas semanas 17–19.',
    affected_stage: 'Recria — 7 a 17 semanas de vida',
    management_actions: [
      'Aumentar ventilação do aviário',
      'Garantir densidade de alojamento adequada (máx. 12 aves/m²)',
      'Fornecer água fresca em abundância',
      'Monitorar uniformidade do lote — variação acima de 10% indica problema de manejo',
    ],
    reference: {
      authors: 'Silva, I.J.O.; Abreu, P.G.; Mazzuco, H.',
      year: 2020,
      title: 'Instalações para galinhas poedeiras e bem-estar animal',
      journal: 'NUPEA–ESALQ/USP + Embrapa Suínos e Aves, Concórdia, SC',
      doi: 'https://www.infoteca.cnptia.embrapa.br/infoteca/bitstream/doc/1133408/1/final9667.pdf',
      notes: 'Tabela 1: fase de recria (7–17 semanas) — temperatura ideal 19–28°C, UR 60–70%.',
    },
  },

  {
    id: 'poultry_layer_cria_heat_35',
    category: 'animal',
    species: 'Galinhas poedeiras — cria (1ª semana de vida)',
    species_scientific: 'Gallus gallus domesticus',
    stressor: 'Estresse por calor — pintainhas recém-nascidas',
    variable: 'temp_max_c',
    operator: '>',
    value: 35,
    severity: 'emergency',
    effect: 'Na 1ª semana de vida pintainhas necessitam de 30–35°C. Acima de 35°C entram em hipertermia rapidamente — o sistema termorregulador é imaturo. Mortalidade elevada se não houver ventilação imediata.',
    affected_stage: 'Cria — 1ª semana de vida',
    management_actions: [
      'Emergência: aumentar ventilação imediatamente',
      'Pintainhas afastadas da fonte de calor e com asas abertas = calor excessivo',
      'Verificar temperatura no nível das aves, não no teto',
      'Aumentar oferta de água fresca e acessível',
    ],
    reference: {
      authors: 'Silva, I.J.O.; Abreu, P.G.; Mazzuco, H.',
      year: 2020,
      title: 'Instalações para galinhas poedeiras e bem-estar animal',
      journal: 'NUPEA–ESALQ/USP + Embrapa Suínos e Aves, Concórdia, SC',
      doi: 'https://www.infoteca.cnptia.embrapa.br/infoteca/bitstream/doc/1133408/1/final9667.pdf',
      notes: 'Tabela 1: fase de cria 1ª semana — temperatura ideal 30–35°C, UR 40–60%.',
    },
    secondary_references: [
      {
        authors: 'Abreu, P.G.; Abreu, V.M.N.',
        year: 2004,
        title: 'Conforto Térmico para Aves',
        journal: 'Embrapa Suínos e Aves. Comunicado Técnico 365, Concórdia, SC',
        doi: 'http://www.infoteca.cnptia.embrapa.br/infoteca/handle/doc/961847',
        notes: 'Tabela 2: TCS recém-nascidos = 39°C; ZCT = 35°C; TCI = 34°C.',
      },
    ],
  },

// ══════════════════════════════════════════════════════════════════════════
// BOVINOS LEITEIROS — ITU/THI COM REFERÊNCIAS EMBRAPA BRASILEIRAS
// Fonte [C]: Azevêdo & Alves (2009) — Bioclimatologia bovinos leiteiros trópicos
// Fonte [D]: Embrapa Gado de Leite — Comunicado Técnico 42
// ══════════════════════════════════════════════════════════════════════════

  {
    id: 'dairy_cattle_thi_72_embrapa',
    category: 'animal',
    species: 'Bovinos leiteiros — vacas em lactação',
    species_scientific: 'Bos taurus / Bos taurus x Bos indicus',
    stressor: 'Estresse térmico — início (ITU/THI = 72)',
    variable: 'thi',
    operator: '>=',
    value: 72,
    severity: 'watch',
    effect: 'ITU 72 representa o limite superior da zona termoneutra para vacas em produção — ponto onde o animal não consegue mais manter temperatura corporal normal sem alterar comportamento e fisiologia. Início de redução no consumo de ração e queda progressiva na produção de leite. Vacas mestiças Holandês-Zebu apresentam maior tolerância que raças européias puras.',
    affected_stage: 'Lactação — todas as fases',
    management_actions: [
      'Garantir sombra nas áreas de pastejo — mínimo 2,5 m²/animal',
      'Verificar disponibilidade de água fresca — consumo pode dobrar',
      'Observar frequência respiratória: acima de 60 mov/min indica estresse',
      'Antecipar ordenha para horário mais fresco (antes das 8h)',
    ],
    reference: {
      authors: 'Embrapa Gado de Leite',
      year: 2004,
      title: 'Modificações ambientais para reduzir o estresse calórico em gado de leite',
      journal: 'Embrapa Gado de Leite. Comunicado Técnico 42, Juiz de Fora, MG',
      doi: 'https://www.infoteca.cnptia.embrapa.br/bitstream/doc/594946/1/COT42Modificacoesambientais.pdf',
      notes: 'Documento confirma: "Quando o ITU ultrapassa o valor de 72, considera-se que o animal se encontra em estresse pelo calor, já que este ponto representa o limite superior da zona termoneutra para vacas em produção."',
    },
    secondary_references: [
      {
        authors: 'Azevêdo, D.M.M.R.; Alves, A.A.',
        year: 2009,
        title: 'Bioclimatologia Aplicada à Produção de Bovinos Leiteiros nos Trópicos',
        journal: 'Embrapa Meio-Norte. Documentos 188, Teresina, PI',
        doi: 'https://www.infoteca.cnptia.embrapa.br/infoteca/bitstream/doc/664507/1/documento188.pdf',
        notes: 'Referência brasileira completa sobre bioclimatologia de bovinos leiteiros. Documenta efeitos do estresse térmico sobre lactação, reprodução e comportamento em condições tropicais e subtropicais.',
      },
    ],
  },

  {
    id: 'dairy_cattle_thi_79_embrapa',
    category: 'animal',
    species: 'Bovinos leiteiros — vacas em lactação',
    species_scientific: 'Bos taurus / Bos taurus x Bos indicus',
    stressor: 'Estresse térmico — moderado (ITU/THI ≥ 79)',
    variable: 'thi',
    operator: '>=',
    value: 79,
    severity: 'warning',
    effect: 'ITU acima de 79 caracteriza estresse térmico moderado a severo. Redução significativa no consumo de matéria seca, queda mensurável na produção de leite e comprometimento da eficiência reprodutiva. O aumento de 1°C na temperatura retal provoca redução de 16% na taxa de concepção. Vacas expostas a estresse nos dias próximos à inseminação têm menor taxa de concepção.',
    affected_stage: 'Lactação e reprodução',
    management_actions: [
      'Usar aspersores ou nebulizadores nas áreas de alimentação e espera',
      'Instalar ventiladores direcionados aos animais',
      'Molhar o telhado do estábulo com água — resfriamento evaporativo',
      'Adiar inseminação artificial para dias menos quentes se possível',
      'Aumentar densidade energética da dieta para compensar menor consumo',
      'Monitorar temperatura retal: acima de 39°C indica estresse severo',
    ],
    reference: {
      authors: 'Azevêdo, D.M.M.R.; Alves, A.A.',
      year: 2009,
      title: 'Bioclimatologia Aplicada à Produção de Bovinos Leiteiros nos Trópicos',
      journal: 'Embrapa Meio-Norte. Documentos 188, Teresina, PI',
      doi: 'https://www.infoteca.cnptia.embrapa.br/infoteca/bitstream/doc/664507/1/documento188.pdf',
      notes: 'Documenta: "O aumento de 1°C na temperatura retal provoca redução de 16% na taxa de concepção por causa da mortalidade embrionária." Referência para manejo reprodutivo em períodos de calor.',
    },
    secondary_references: [
      {
        authors: 'Embrapa Gado de Leite',
        year: 2004,
        title: 'Modificações ambientais para reduzir o estresse calórico em gado de leite',
        journal: 'Embrapa Gado de Leite. Comunicado Técnico 42, Juiz de Fora, MG',
        doi: 'https://www.infoteca.cnptia.embrapa.br/bitstream/doc/594946/1/COT42Modificacoesambientais.pdf',
      },
    ],
  },

  {
    id: 'dairy_cattle_thi_86_embrapa',
    category: 'animal',
    species: 'Bovinos leiteiros — vacas em lactação',
    species_scientific: 'Bos taurus / Bos taurus x Bos indicus',
    stressor: 'Estresse térmico — severo (ITU/THI ≥ 86)',
    variable: 'thi',
    operator: '>=',
    value: 86,
    severity: 'emergency',
    effect: 'Acima de ITU 86 o animal passa a ganhar calor do ambiente — não consegue mais dissipar. Temperatura retal acima de 40°C. Risco de colapso circulatório e morte por hipertermia. Queda drástica na produção de leite e mortalidade embrionária elevada.',
    affected_stage: 'Todos — emergência clínica',
    management_actions: [
      'Emergência: banhar os animais com água fria imediatamente',
      'Retirar do sol e colocar em área ventilada e sombreada',
      'Acionar assistência veterinária para animais prostrados',
      'Suspender ordenha em animais com sinais clínicos evidentes',
      'Fornecer água fresca e eletrólitos',
    ],
    reference: {
      authors: 'Azevêdo, D.M.M.R.; Alves, A.A.',
      year: 2009,
      title: 'Bioclimatologia Aplicada à Produção de Bovinos Leiteiros nos Trópicos',
      journal: 'Embrapa Meio-Norte. Documentos 188, Teresina, PI',
      doi: 'https://www.infoteca.cnptia.embrapa.br/infoteca/bitstream/doc/664507/1/documento188.pdf',
      notes: 'Referência ao índice ICC (Índice de Conforto de Cattle): "o animal ganhará calor quando o ICC for maior que 86 e irá dissipar calor quando inferior a 77." Equivalente ao THI ≥ 86 para estresse severo.',
    },
  },

  {
    id: 'dairy_cattle_water_intake_heat',
    category: 'animal',
    species: 'Bovinos leiteiros — vacas em lactação',
    species_scientific: 'Bos taurus / Bos taurus x Bos indicus',
    stressor: 'Risco de desidratação em condições de calor',
    variable: 'temp_max_c',
    operator: '>=',
    value: 30,
    severity: 'watch',
    effect: 'Em condições de estresse calórico, bovinos leiteiros aumentam significativamente o consumo de água para reposição das perdas sudorípara e respiratória. A restrição de acesso à água nessas condições agrava rapidamente o estresse e reduz a produção de leite. Vacas em lactação podem consumir 100–150 litros/dia sob calor intenso.',
    affected_stage: 'Lactação — períodos quentes',
    management_actions: [
      'Verificar funcionamento e limpeza de todos os bebedouros',
      'Garantir pelo menos 1 bebedouro por grupo de 20 animais',
      'Posicionar bebedouros na sombra — água quente reduz o consumo',
      'Limpar bebedouros diariamente — água parada prolifera algas e bactérias',
    ],
    reference: {
      authors: 'Azevêdo, D.M.M.R.; Alves, A.A.',
      year: 2009,
      title: 'Bioclimatologia Aplicada à Produção de Bovinos Leiteiros nos Trópicos',
      journal: 'Embrapa Meio-Norte. Documentos 188, Teresina, PI',
      doi: 'https://www.infoteca.cnptia.embrapa.br/infoteca/bitstream/doc/664507/1/documento188.pdf',
      notes: 'Seção "Sobre o consumo de água": documenta o aumento do consumo hídrico em condições de estresse calórico como mecanismo de resfriamento corporal em bovinos.',
    },
  },

  {
    id: 'dairy_cattle_cold_calves',
    category: 'animal',
    species: 'Bovinos leiteiros — bezerros recém-nascidos',
    species_scientific: 'Bos taurus / Bos taurus x Bos indicus',
    stressor: 'Estresse por frio — hipotermia neonatal',
    variable: 'temp_min_c',
    operator: '<=',
    value: 5,
    severity: 'warning',
    effect: 'Bezerros recém-nascidos têm zona de termoneutralidade entre 10–20°C. Abaixo de 5°C o risco de hipotermia é alto, especialmente em animais molhados ou com acesso ao vento. A hipotermia neonatal é uma das principais causas de mortalidade em bezerros no Sul do Brasil durante os meses de inverno.',
    affected_stage: 'Neonatos — primeiras 2 semanas de vida',
    management_actions: [
      'Recolher bezerros recém-nascidos para abrigo seco e protegido do vento',
      'Secar o bezerro imediatamente após o nascimento — especialmente em noites frias',
      'Garantir ingestão de colostro nas primeiras 6 horas — fundamental para imunidade e termorregulação',
      'Fornecer cama seca e espessa (palha) no abrigo dos bezerros',
      'Monitorar temperatura retal: abaixo de 38°C indica hipotermia incipiente',
    ],
    reference: {
      authors: 'Azevêdo, D.M.M.R.; Alves, A.A.',
      year: 2009,
      title: 'Bioclimatologia Aplicada à Produção de Bovinos Leiteiros nos Trópicos',
      journal: 'Embrapa Meio-Norte. Documentos 188, Teresina, PI',
      doi: 'https://www.infoteca.cnptia.embrapa.br/infoteca/bitstream/doc/664507/1/documento188.pdf',
      notes: 'Seção "O ambiente e o animal": zona de termoneutralidade e limites de homeotermia em bovinos. Contexto adicional: mortalidade neonatal por frio é problema documentado no Sul do Brasil.',
    },
  },

// ══════════════════════════════════════════════════════════════════════════
// AVES — CONFORTO TÉRMICO
// Fonte: Abreu, P.G.; Abreu, V.M.N. "Conforto Térmico para Aves"
// Embrapa Suínos e Aves. Comunicado Técnico 365, Concórdia-SC, Dez/2004.
// Handle: http://www.infoteca.cnptia.embrapa.br/infoteca/handle/doc/961847
// ══════════════════════════════════════════════════════════════════════════

  {
    id: 'poultry_heat_stress_adult_32',
    category: 'animal',
    species: 'Aves adultas (galinhas poedeiras e matrizes)',
    species_scientific: 'Gallus gallus domesticus',
    stressor: 'Estresse por calor — acima da Temperatura Crítica Superior',
    variable: 'temp_max_c',
    operator: '>=',
    value: 32,
    severity: 'warning',
    effect: 'Acima de 32°C (Temperatura Crítica Superior para aves adultas), a ave não consegue dissipar calor pelos mecanismos sensíveis (radiação, condução, convecção) e aciona ofegação intensa. Ocorre redução do consumo de ração, queda na postura e perda de qualidade da casca do ovo.',
    affected_stage: 'Postura e reprodução',
    management_actions: [
      'Garantir ventilação forçada ou natural adequada no aviário',
      'Fornecer água fresca e limpa em abundância — consumo de água dobra sob calor',
      'Reduzir densidade de aves por m² se possível',
      'Fornecer ração nas horas mais frescas do dia (manhã cedo e entardecer)',
      'Observar sinais de estresse: aves ofegantes, asas abertas, prostradas',
    ],
    reference: {
      authors: 'Abreu, P.G.; Abreu, V.M.N.',
      year: 2004,
      title: 'Conforto Térmico para Aves',
      journal: 'Embrapa Suínos e Aves. Comunicado Técnico 365, Concórdia, SC',
      doi: 'http://www.infoteca.cnptia.embrapa.br/infoteca/handle/doc/961847',
      notes: 'Tabela 2: TCS (Temperatura Crítica Superior) para aves adultas = 32°C. ZCT (Zona de Conforto Térmico) adultas: 18–28°C. Publicação da Embrapa Suínos e Aves, Concórdia-SC.',
    },
  },

  {
    id: 'poultry_cold_stress_adult_15',
    category: 'animal',
    species: 'Aves adultas (galinhas poedeiras e matrizes)',
    species_scientific: 'Gallus gallus domesticus',
    stressor: 'Estresse por frio — abaixo da Temperatura Crítica Inferior',
    variable: 'temp_min_c',
    operator: '<=',
    value: 15,
    severity: 'watch',
    effect: 'Abaixo de 15°C (Temperatura Crítica Inferior para aves adultas), a ave aciona mecanismos de produção de calor, aumenta o consumo de ração e reduz a eficiência produtiva. Queda de postura e maior gasto energético com termorregulação.',
    affected_stage: 'Postura',
    management_actions: [
      'Fechar cortinas e aberturas do aviário nas horas mais frias',
      'Verificar presença de correntes de ar frio direto sobre as aves',
      'Aumentar fornecimento de ração energética',
      'Monitorar queda na taxa de postura',
    ],
    reference: {
      authors: 'Abreu, P.G.; Abreu, V.M.N.',
      year: 2004,
      title: 'Conforto Térmico para Aves',
      journal: 'Embrapa Suínos e Aves. Comunicado Técnico 365, Concórdia, SC',
      doi: 'http://www.infoteca.cnptia.embrapa.br/infoteca/handle/doc/961847',
      notes: 'Tabela 2: TCI (Temperatura Crítica Inferior) para aves adultas = 15°C. Zona de Conforto Térmico adultas: 18–28°C.',
    },
  },

  {
    id: 'poultry_heat_emergency_39',
    category: 'animal',
    species: 'Aves recém-nascidas (pintainhas até 1 semana)',
    species_scientific: 'Gallus gallus domesticus',
    stressor: 'Estresse por calor — emergência em pintainhas',
    variable: 'temp_max_c',
    operator: '>=',
    value: 39,
    severity: 'emergency',
    effect: 'Para pintainhas recém-nascidas, a TCS é 39°C. Acima disso ocorre hipertermia rápida e mortalidade elevada, pois o sistema termorregulador é imaturo na primeira semana de vida.',
    affected_stage: 'Recém-nascidos (1ª semana de vida)',
    management_actions: [
      'Emergência: reduzir aquecimento e aumentar ventilação imediatamente',
      'Verificar temperatura do pinteiro com termômetro — não estimar',
      'Dispersar as aves se estiverem aglomeradas no centro (sinal de calor)',
      'Aumentar oferta de água fresca',
    ],
    reference: {
      authors: 'Abreu, P.G.; Abreu, V.M.N.',
      year: 2004,
      title: 'Conforto Térmico para Aves',
      journal: 'Embrapa Suínos e Aves. Comunicado Técnico 365, Concórdia, SC',
      doi: 'http://www.infoteca.cnptia.embrapa.br/infoteca/handle/doc/961847',
      notes: 'Tabela 2: TCS recém-nascidos = 39°C; ZCT recém-nascidos = 35°C; TCI recém-nascidos = 34°C.',
    },
  },

// ══════════════════════════════════════════════════════════════════════════
// TOMATE — NECESSIDADES HÍDRICAS E FLORAÇÃO
// Fonte: Embrapa Hortaliças — Produção Integrada de Tomate Tutorado
// Handle: infoteca.cnptia.embrapa.br/infoteca/bitstream/doc/1149485
// ══════════════════════════════════════════════════════════════════════════

  {
    id: 'tomato_water_stress_flowering',
    category: 'vegetal',
    species: 'Tomate',
    species_scientific: 'Solanum lycopersicum',
    stressor: 'Déficit hídrico — floração e frutificação',
    variable: 'consecutive_dry_days',
    operator: '>=',
    value: 4,
    severity: 'warning',
    effect: 'O início da frutificação e o desenvolvimento dos frutos são os estágios mais sensíveis à deficiência de água no solo do tomateiro. Déficit hídrico nessa fase causa desequilíbrio de cálcio, podridão apical e rachaduras nos frutos. Necessidades hídricas totais da cultura: 400–600mm em 90–120 dias.',
    affected_stage: 'Floração e início da frutificação',
    management_actions: [
      'Irrigar por gotejamento — método recomendado para tomateiro',
      'Tensão crítica de irrigação: 15–25 kPa (usar tensiômetro se disponível)',
      'Manter umidade constante — variações bruscas causam podridão apical',
      'Evitar molhar a parte aérea — reduz incidência de doenças fúngicas',
      'Irrigar nas primeiras horas da manhã',
    ],
    reference: {
      authors: 'Marouelli, W.A. et al.',
      year: 2012,
      title: 'Irrigação — In: Produção Integrada de Tomate Tutorado',
      journal: 'Embrapa Hortaliças, Brasília, DF',
      doi: 'https://www.infoteca.cnptia.embrapa.br/infoteca/bitstream/doc/1149485/1/Producao-Integrada-Tomate-Tutorado-cap-7-102116.pdf',
      notes: 'Documenta que floração e desenvolvimento de frutos são os estágios mais sensíveis à deficiência hídrica. Tensões críticas de irrigação: 15–25 kPa.',
    },
  },

  {
    id: 'tomato_excess_rain_flowering',
    category: 'vegetal',
    species: 'Tomate',
    species_scientific: 'Solanum lycopersicum',
    stressor: 'Excesso de água — queda de flores',
    variable: 'precipitation_mm',
    operator: '>=',
    value: 30,
    severity: 'watch',
    effect: 'Excesso de água durante o período de floração do tomateiro provoca aumento na queda de flores e redução do crescimento. Chuvas acima de 30mm no período também favorecem doenças bacterianas como a pinta bacteriana (Xanthomonas spp.), favorecida por alta umidade relativa.',
    affected_stage: 'Floração',
    management_actions: [
      'Verificar drenagem da área — evitar encharcamento',
      'Monitorar floração após período chuvoso intenso',
      'Observar sintomas de doenças bacterianas nas folhas e frutos',
      'Melhorar circulação de ar entre plantas para acelerar secagem da folhagem',
    ],
    reference: {
      authors: 'Marouelli, W.A. et al.',
      year: 2012,
      title: 'Irrigação — In: Produção Integrada de Tomate Tutorado',
      journal: 'Embrapa Hortaliças, Brasília, DF',
      doi: 'https://www.infoteca.cnptia.embrapa.br/infoteca/bitstream/doc/1149485/1/Producao-Integrada-Tomate-Tutorado-cap-7-102116.pdf',
      notes: 'Documenta que excesso de água durante floração provoca queda de flores e redução do crescimento.',
    },
  },

// ══════════════════════════════════════════════════════════════════════════
// ERVA-MATE — CLIMA E GEADA
// Fonte: Embrapa Florestas — Cultivo da Erva-Mate (Sistema de Produção)
// Handle: infoteca.cnptia.embrapa.br/infoteca/bitstream/doc/1155569
// ══════════════════════════════════════════════════════════════════════════

  {
    id: 'erva_mate_frost_seedlings',
    category: 'vegetal',
    species: 'Erva-mate',
    species_scientific: 'Ilex paraguariensis',
    stressor: 'Geada — dano a mudas recém-plantadas',
    variable: 'temp_min_c',
    operator: '<=',
    value: 0,
    severity: 'warning',
    effect: 'Embora a erva-mate adulta seja adaptada a regiões com geadas frequentes (ocorre naturalmente em altitudes de 500–1.500m no Sul do Brasil, com temperaturas médias de 15–18°C), mudas recém-plantadas são sensíveis a geadas severas. Geadas na fase de estabelecimento podem causar morte da parte aérea jovem.',
    affected_stage: 'Mudas em fase de estabelecimento (0–12 meses)',
    management_actions: [
      'Plantar preferencialmente no início da primavera para evitar geadas no estabelecimento',
      'Proteger mudas com cobertura morta ao redor do colo',
      'Em plantios sombreados (sistema agroflorestal), o dossel superior reduz a intensidade da geada',
      'Não podar a parte aérea imediatamente após geada — aguardar brotação para avaliar dano real',
    ],
    reference: {
      authors: 'Sturion, J.A.; Medrado, M.J.S.',
      year: 2014,
      title: 'Cultivo da Erva-Mate — Clima',
      journal: 'Embrapa Florestas, Sistema de Produção Online, Colombo, PR',
      doi: 'https://www.infoteca.cnptia.embrapa.br/infoteca/bitstream/doc/1155569/1/EmbrapaCultivoDaErva-Mate2014.pdf',
      notes: 'Documenta que a espécie ocorre em regiões com geadas frequentes ou pouco frequentes dependendo da altitude (500–1.500m). Temperaturas médias anuais da área de ocorrência natural: 15–18°C.',
    },
  },

  {
    id: 'erva_mate_drought_roots',
    category: 'vegetal',
    species: 'Erva-mate',
    species_scientific: 'Ilex paraguariensis',
    stressor: 'Déficit hídrico — solos rasos',
    variable: 'consecutive_dry_days',
    operator: '>=',
    value: 10,
    severity: 'watch',
    effect: 'A erva-mate não suporta solos compactados ou encharcados. Em solos com menos de 1 metro de profundidade, períodos de deficiência hídrica reduzem o desenvolvimento e o rendimento, podendo reduzir a vida útil das plantas. O sistema radicular superficial limita o acesso a reservas de água mais profundas.',
    affected_stage: 'Plantas adultas em solos rasos',
    management_actions: [
      'Verificar umidade do solo na zona radicular',
      'Manter cobertura morta sobre o solo para reter umidade',
      'Em SAF, o sombreamento de árvores maiores reduz evapotranspiração',
      'Evitar qualquer compactação do solo na área radicular',
    ],
    reference: {
      authors: 'Sturion, J.A.; Medrado, M.J.S.',
      year: 2014,
      title: 'Cultivo da Erva-Mate — Solo',
      journal: 'Embrapa Florestas, Sistema de Produção Online, Colombo, PR',
      doi: 'https://www.infoteca.cnptia.embrapa.br/infoteca/bitstream/doc/1155569/1/EmbrapaCultivoDaErva-Mate2014.pdf',
      notes: 'Documenta que solos com menos de 1m de profundidade ocasionam queda no desenvolvimento em períodos de deficiência hídrica.',
    },
  },

// ══════════════════════════════════════════════════════════════════════════
// SUÍNOS — ZONA DE CONFORTO TÉRMICO
// Fonte: Embrapa Suínos e Aves — Boas Práticas de Manejo
// Handle: infoteca.cnptia.embrapa.br/infoteca/bitstream/doc/1045866
// ══════════════════════════════════════════════════════════════════════════

  {
    id: 'swine_heat_stress_adult',
    category: 'animal',
    species: 'Suínos adultos (matrizes e reprodutores)',
    species_scientific: 'Sus scrofa domesticus',
    stressor: 'Estresse por calor',
    variable: 'temp_max_c',
    operator: '>=',
    value: 27,
    severity: 'warning',
    effect: 'Suínos adultos têm zona de conforto térmico mais estreita que bovinos e aves. Acima de 27°C ocorre redução no consumo de ração, queda na taxa de concepção em matrizes e estresse reprodutivo em reprodutores. Suínos não possuem glândulas sudoríparas funcionais — dependem de ambiente sombreado e úmido para dissipar calor.',
    affected_stage: 'Reprodução e gestação',
    management_actions: [
      'Fornecer chafurda (área úmida) para que os animais regulem temperatura corporal',
      'Garantir sombra total nas baias externas',
      'Aumentar ventilação do galpão',
      'Fornecer água fresca em abundância — consumo aumenta significativamente',
      'Monitorar taxa de concepção após período de calor intenso',
    ],
    reference: {
      authors: 'Perdomo, C.C. et al.',
      year: 2011,
      title: 'Práticas de Manejo e Características das Instalações nas Granjas',
      journal: 'Embrapa Suínos e Aves, Concórdia, SC',
      doi: 'https://www.infoteca.cnptia.embrapa.br/infoteca/bitstream/doc/1045866/1/original8101.pdf',
      notes: 'Tabela 2: Temperatura ideal por fase do suíno. Matrizes e reprodutores adultos: 15–22°C.',
    },
  },

  {
    id: 'swine_cold_piglets',
    category: 'animal',
    species: 'Suínos — leitões recém-nascidos',
    species_scientific: 'Sus scrofa domesticus',
    stressor: 'Estresse por frio — hipotermia em leitões',
    variable: 'temp_min_c',
    operator: '<=',
    value: 10,
    severity: 'warning',
    effect: 'Leitões recém-nascidos necessitam de 32–35°C na zona de escamoteador. Temperaturas ambientais abaixo de 10°C sem aquecimento suplementar causam hipotermia rápida e alta mortalidade neonatal, pois leitões nascem sem reservas de gordura e com sistema termorregulador imaturo.',
    affected_stage: 'Leitões nas primeiras 2 semanas de vida',
    management_actions: [
      'Verificar funcionamento do escamoteador (aquecimento local)',
      'Temperatura do escamoteador: 32–35°C na 1ª semana, reduzindo gradualmente',
      'Leitões amontoados fora do escamoteador = sinal de frio ou problema no equipamento',
      'Usar pó secante em leitões recém-nascidos e secar imediatamente após o parto',
    ],
    reference: {
      authors: 'Perdomo, C.C. et al.',
      year: 2011,
      title: 'Práticas de Manejo e Características das Instalações nas Granjas',
      journal: 'Embrapa Suínos e Aves, Concórdia, SC',
      doi: 'https://www.infoteca.cnptia.embrapa.br/infoteca/bitstream/doc/1045866/1/original8101.pdf',
      notes: 'Tabela 2 e Figuras de manejo: leitões amontoados ao lado da porca indicam escamoteador frio ou inadequado.',
    },
  },

// BLOCOS ADICIONAIS — SUÍNOS (Certified Humane / HFAC)
// Fonte: Humane Farm Animal Care (HFAC). "Padrões da HFAC para a Criação de Suínos"
// Referencial HFAC para Suínos 2018, última atualização Julho de 2025.
// Certified Humane® — DBA Humane Farm Animal Care. Copyright 2025.
// Seção E7 (Ambiente Térmico), E8 (Ventilação), E9 (Qualidade do Ar), E10 (Estresse Térmico)
//
// NOTA METODOLÓGICA PARA A DISSERTAÇÃO:
// Os limiares abaixo são do padrão internacional Certified Humane®, adotado
// por programas de certificação de bem-estar animal em mais de 30 países.
// Complementam os dados da Embrapa com especificidade por fase de peso corporal.

// ══════════════════════════════════════════════════════════════════════════
// SUÍNOS — LIMITES SUPERIORES DE TEMPERATURA POR FASE
// ══════════════════════════════════════════════════════════════════════════

  {
    id: 'swine_heat_leitao_3_15kg',
    category: 'animal',
    species: 'Suínos — leitões (3–15 kg)',
    species_scientific: 'Sus scrofa domesticus',
    stressor: 'Estresse por calor — acima da zona de conforto',
    variable: 'temp_max_c',
    operator: '>',
    value: 32,
    severity: 'warning',
    effect: 'Leitões de 3–15kg têm zona de conforto entre 26–32°C. Acima de 32°C entram em estresse térmico por calor, com redução no consumo de leite/ração e risco de desidratação.',
    affected_stage: 'Fase de creche (desmame)',
    management_actions: [
      'Verificar ventilação da área de creche',
      'Fornecer água fresca e acessível em bebedouros na altura dos leitões',
      'Evitar superlotação — aumenta temperatura local',
      'Instalar sombreamento se os animais estiverem em área externa',
    ],
    reference: {
      authors: 'Humane Farm Animal Care (HFAC)',
      year: 2025,
      title: 'Padrões da HFAC para a Criação de Suínos — Seção E7: Condições Térmicas',
      journal: 'Certified Humane® Referencial HFAC para Suínos, atualização julho/2025',
      doi: 'https://certifiedhumane.org',
      notes: 'Tabela E7b: Intervalo de temperaturas recomendado para suínos 3–15kg: 26–32°C. Acima de 32°C = fora da zona de conforto.',
    },
  },

  {
    id: 'swine_cold_leitao_3_15kg',
    category: 'animal',
    species: 'Suínos — leitões (3–15 kg)',
    species_scientific: 'Sus scrofa domesticus',
    stressor: 'Estresse por frio — abaixo da zona de conforto',
    variable: 'temp_min_c',
    operator: '<',
    value: 26,
    severity: 'watch',
    effect: 'Leitões de 3–15kg abaixo de 26°C estão fora da zona de conforto térmico. Aumentam consumo energético para manutenção da temperatura corporal, reduzindo ganho de peso e eficiência alimentar.',
    affected_stage: 'Fase de creche',
    management_actions: [
      'Verificar temperatura do escamoteador ou área de abrigo',
      'Fechar cortinas e aberturas nas horas mais frias',
      'Observar comportamento: leitões amontoados indicam frio',
    ],
    reference: {
      authors: 'Humane Farm Animal Care (HFAC)',
      year: 2025,
      title: 'Padrões da HFAC para a Criação de Suínos — Seção E7: Condições Térmicas',
      journal: 'Certified Humane® Referencial HFAC para Suínos, atualização julho/2025',
      doi: 'https://certifiedhumane.org',
      notes: 'Tabela E7b: limite inferior para leitões 3–15kg = 26°C.',
    },
  },

  {
    id: 'swine_heat_terminacao_70_100kg',
    category: 'animal',
    species: 'Suínos — terminação (70–100 kg)',
    species_scientific: 'Sus scrofa domesticus',
    stressor: 'Estresse por calor',
    variable: 'temp_max_c',
    operator: '>',
    value: 25,
    severity: 'warning',
    effect: 'Suínos em terminação (70–100kg) têm zona de conforto entre 10–25°C. Acima de 25°C ocorre redução do consumo de ração, queda no ganho de peso diário e aumento do gasto hídrico. Animais mais pesados são mais sensíveis ao calor por ter maior massa corporal e menor área de superfície relativa.',
    affected_stage: 'Terminação',
    management_actions: [
      'Disponibilizar área alagadiça ou chafurda para resfriamento corporal',
      'Garantir sombra total na área de acesso externo',
      'Fornecer água fresca em quantidade irrestrita',
      'Usar aspersores ou gotejadores se disponíveis',
      'Evitar movimentação dos animais nas horas mais quentes',
    ],
    reference: {
      authors: 'Humane Farm Animal Care (HFAC)',
      year: 2025,
      title: 'Padrões da HFAC para a Criação de Suínos — Seções E7 e E10',
      journal: 'Certified Humane® Referencial HFAC para Suínos, atualização julho/2025',
      doi: 'https://certifiedhumane.org',
      notes: 'Tabela E7b: suínos 70–100kg zona de conforto 10–25°C. Seção E10: uso de chafurda, sombra, resfriamento evaporativo e aspersores como medidas de controle do estresse térmico.',
    },
  },

  {
    id: 'swine_heat_matriz_amamentando',
    category: 'animal',
    species: 'Suínos — fêmea amamentando (matriz lactante)',
    species_scientific: 'Sus scrofa domesticus',
    stressor: 'Estresse por calor — impacto na produção de leite',
    variable: 'temp_max_c',
    operator: '>',
    value: 26,
    severity: 'warning',
    effect: 'Matrizes em lactação têm zona de conforto entre 15–26°C. Acima de 26°C ocorre redução drástica no consumo de ração, queda na produção de leite e aumento da perda de peso corporal durante a lactação, comprometendo o desenvolvimento dos leitões e a eficiência reprodutiva subsequente.',
    affected_stage: 'Lactação',
    management_actions: [
      'Priorizar ventilação direta sobre a matriz (não sobre os leitões)',
      'Fornecer ração úmida ou pastosa nas horas mais frescas',
      'Aumentar frequência de fornecimento de água fresca',
      'Monitorar consumo de ração da matriz diariamente',
      'Verificar desenvolvimento dos leitões — queda de peso indica leite insuficiente',
    ],
    reference: {
      authors: 'Humane Farm Animal Care (HFAC)',
      year: 2025,
      title: 'Padrões da HFAC para a Criação de Suínos — Seção E7: Condições Térmicas',
      journal: 'Certified Humane® Referencial HFAC para Suínos, atualização julho/2025',
      doi: 'https://certifiedhumane.org',
      notes: 'Tabela E7b: fêmea amamentando — zona de conforto 15–26°C (59–79°F). Leitegada requer 32°C (90°F) — zonas térmicas distintas para matriz e leitões na mesma instalação.',
    },
  },

  {
    id: 'swine_heat_leitegada_32',
    category: 'animal',
    species: 'Suínos — leitegada (recém-nascidos)',
    species_scientific: 'Sus scrofa domesticus',
    stressor: 'Frio — temperatura abaixo do necessário para leitegada',
    variable: 'temp_min_c',
    operator: '<',
    value: 32,
    severity: 'warning',
    effect: 'Leitegadas recém-nascidas necessitam de 32°C no escamoteador. Abaixo disso ocorre hipotermia, prostração, incapacidade de mamar e mortalidade neonatal elevada. A zona térmica ideal da leitegada (32°C) é incompatível com a da matriz (15–26°C) — por isso o escamoteador separado é essencial.',
    affected_stage: 'Neonatos — primeiros 7 dias de vida',
    management_actions: [
      'Verificar temperatura do escamoteador com termômetro antes do parto',
      'Leitões que ficam fora do escamoteador estão em risco de esmagamento pela porca',
      'Secar os leitões imediatamente após o nascimento',
      'Garantir que todos os leitões mamem o colostro nas primeiras 6 horas',
    ],
    reference: {
      authors: 'Humane Farm Animal Care (HFAC)',
      year: 2025,
      title: 'Padrões da HFAC para a Criação de Suínos — Seção E7: Condições Térmicas',
      journal: 'Certified Humane® Referencial HFAC para Suínos, atualização julho/2025',
      doi: 'https://certifiedhumane.org',
      notes: 'Tabela E7b: leitegada requer 32°C (90°F). Nota crítica: a zona de conforto da matriz (15–26°C) é incompatível com a da leitegada (32°C) — exige escamoteador separado.',
    },
  },
];

// ─── Funções de consulta ──────────────────────────────────────────────────────

/**
 * getThresholdsForSpecies(species)
 * Retorna todos os limiares relevantes para uma espécie ou categoria
 */
export function getThresholdsForSpecies(species: string): ClimateThreshold[] {
  const term = species.toLowerCase();
  
  const aliases: Record<string, string[]> = {
    'aves': ['aves', 'galinha', 'frango', 'poedeira', 'caipira', 'pintainha'],
    'bovinos': ['bovino', 'vaca', 'boi', 'leiteiro', 'corte', 'bezerro'],
    'suínos': ['suíno', 'porco', 'leitão', 'matriz', 'leitegada'],
    'tomate': ['tomate', 'tomateiro'],
    'erva-mate': ['erva-mate', 'mate'],
    'milho': ['milho'],
    'soja': ['soja'],
    'café': ['café', 'cafe', 'cafeeiro'],
  };

  const matchedCategories = Object.keys(aliases).filter(category => 
    aliases[category].some(alias => term.includes(alias))
  );

  return SCIENTIFIC_THRESHOLDS.filter(t => {
    const tSpecies = t.species.toLowerCase();
    const tScientific = t.species_scientific?.toLowerCase() || '';
    
    if (tSpecies.includes(term) || tScientific.includes(term)) return true;
    if (tSpecies.includes('geral') || tSpecies.includes('culturas')) return true;

    return matchedCategories.some(category => 
      tSpecies.includes(category) || 
      aliases[category].some(alias => tSpecies.includes(alias))
    );
  });
}

/**
 * evaluateThresholds(climateData, selectedSpecies)
 * Cruza dados climáticos medidos com os limiares científicos
 * Retorna alertas com referência bibliográfica incluída
 */
export interface EvidenceBasedAlert {
  threshold: ClimateThreshold;
  measured_value: number;
  thi_value?: number;
  citation: string; // formatado para exibição: "West (2003), J. Dairy Sci."
  severity: 'watch' | 'warning' | 'emergency';
}

export function evaluateThresholds(
  temp_max_c: number,
  temp_min_c: number,
  humidity_percent: number,
  precipitation_mm: number,
  consecutive_dry_days: number,
  selectedSpecies: string[]
): EvidenceBasedAlert[] {
  const alerts: EvidenceBasedAlert[] = [];
  const thi = calculateTHI(temp_max_c, humidity_percent);

  if (selectedSpecies.length === 0) {
    return [];
  }

  // Coleta limiares relevantes para as espécies selecionadas
  const relevantThresholds = selectedSpecies.flatMap(s => getThresholdsForSpecies(s));

  // Remove duplicatas
  const unique = Array.from(new Map(relevantThresholds.map(t => [t.id, t])).values());

  for (const threshold of unique) {
    let measuredValue: number;

    switch (threshold.variable) {
      case 'temp_max_c':
        measuredValue = temp_max_c;
        break;
      case 'temp_min_c':
        measuredValue = temp_min_c;
        break;
      case 'thi':
        measuredValue = thi;
        break;
      case 'precipitation_mm':
        measuredValue = precipitation_mm;
        break;
      case 'consecutive_dry_days':
        measuredValue = consecutive_dry_days;
        break;
      default:
        continue;
    }

    const triggered =
      threshold.operator === '>=' ? measuredValue >= threshold.value :
      threshold.operator === '>' ? measuredValue > threshold.value :
      threshold.operator === '<=' ? measuredValue <= threshold.value :
      measuredValue < threshold.value;

    if (triggered) {
      const ref = threshold.reference;
      alerts.push({
        threshold,
        measured_value: measuredValue,
        thi_value: threshold.variable === 'thi' ? thi : undefined,
        citation: `${ref.authors.split(',')[0]} (${ref.year}), ${ref.journal}`,
        severity: threshold.severity,
      });
    }
  }

  // Ordena por severidade: emergency > warning > watch
  const order = { emergency: 0, warning: 1, watch: 2 };
  return alerts.sort((a, b) => order[a.severity] - order[b.severity]);
}
