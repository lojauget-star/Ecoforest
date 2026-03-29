
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';
import process from 'process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- CONFIGURAÇÃO DO ETL ---
const INPUT_FILENAME = 'try_raw_data.txt';
const OUTPUT_FILENAME = 'processed_flat_species.json';

// IDs do TRY Database
const TRAIT_IDS = {
    '4': 'wood_density_g_cm3',
    '14': 'leaf_nitrogen_mg_g',
    '3115': 'sla_m2_kg',
    '3106': 'plant_height_m'
};

// Dados auxiliares
const DATA_NAMES = {
    LATITUDE: 'Latitude',
    LONGITUDE: 'Longitude'
};

// --- CONFIGURAÇÃO DA API EXTERNA (REFLORA via GBIF) ---
const API_BATCH_SIZE = 5; // Quantas requisições simultâneas fazer
const MAX_SPECIES_TO_ENRICH = 150; // Limite para teste/dev. Em produção real, remova ou aumente.

// --- UTILITÁRIOS ---

const inferBiome = (lat, lng) => {
    if (!lat || !lng) return 'Mata Atlântica'; 
    if (lat < -29) return 'Pampa';
    if (lat < -23 && lng > -55) return 'Mata Atlântica';
    if (lat < -15 && lng > -50) return 'Cerrado';
    if (lat > -15 && lat < -3 && lng > -45) return 'Caatinga';
    if (lat < -16 && lng > -54) return 'Pantanal';
    if (lat < 5 && lng < -45) return 'Amazônia';
    return 'Mata Atlântica';
};

const inferClimate = (lat) => {
    if (!lat) return 'Tropical';
    if (lat < -23) return 'Subtropical Úmido';
    if (lat > -18 && lat < -3) return 'Semiárido';
    if (lat > 0) return 'Equatorial';
    return 'Tropical';
};

// Função para consultar API do GBIF
async function checkRefloraStatus(scientificName) {
    try {
        // Busca por ocorrência no Brasil
        const url = `https://api.gbif.org/v1/species/match?name=${encodeURIComponent(scientificName)}&kingdom=Plantae&country=BR`;
        const res = await fetch(url);
        
        if (!res.ok) return { is_native: false, family: 'Unknown', name: scientificName };
        
        const data = await res.json();
        
        const isMatch = data.matchType === 'EXACT' || (data.matchType === 'FUZZY' && data.confidence > 90);
        const occursInBrazil = data.country === 'Brazil' || data.countryCode === 'BR';

        return {
            is_native: isMatch && occursInBrazil, 
            family: data.family || 'Unknown',
            scientific_name_accepted: data.species || scientificName
        };
    } catch (err) {
        return { is_native: true, family: 'Unknown', name: scientificName }; 
    }
}

// Processador de Fila
async function processEnrichmentQueue(speciesList) {
    console.log(`\n[API] Iniciando enriquecimento de ${speciesList.length} espécies via GBIF...`);
    
    const enrichedList = [];
    let processedCount = 0;

    for (let i = 0; i < speciesList.length; i += API_BATCH_SIZE) {
        const batch = speciesList.slice(i, i + API_BATCH_SIZE);
        
        const promises = batch.map(async (item) => {
            const refloraData = await checkRefloraStatus(item.name);
            return {
                ...item,
                name: refloraData.scientific_name_accepted,
                is_native: refloraData.is_native,
                family: refloraData.family
            };
        });

        const results = await Promise.all(promises);
        enrichedList.push(...results);
        
        processedCount += results.length;
        process['stdout'].write(`\r[API] Progresso: ${processedCount}/${speciesList.length}`);
    }
    console.log('\n[API] Enriquecimento concluído.');
    return enrichedList;
}

async function runStreamingETL() {
    const inputPath = path.join(__dirname, '..', 'data', INPUT_FILENAME);
    const outputPath = path.join(__dirname, '..', 'data', OUTPUT_FILENAME);

    console.log(`[ETL] 1. Processando arquivo RAW: ${INPUT_FILENAME}`);
    
    const speciesMap = new Map();

    try {
        // Cria arquivo vazio se não existir para evitar erro de leitura
        if (!fs.existsSync(inputPath)) {
             console.warn(`[ETL] Aviso: Arquivo ${INPUT_FILENAME} não encontrado. Criando arquivo vazio para evitar crash.`);
             await fs.promises.writeFile(inputPath, "SpeciesName\tTraitID\tDataName\tStdValue\n");
        }

        const fileStream = fs.createReadStream(inputPath);
        const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

        let lineCount = 0;
        let colIdx = {};

        for await (const line of rl) {
            lineCount++;
            const cols = line.split('\t'); 

            if (lineCount === 1) {
                cols.forEach((col, index) => { colIdx[col.trim()] = index; });
                continue;
            }

            const speciesName = cols[colIdx['AccSpeciesName']] || cols[colIdx['SpeciesName']];
            const traitID = cols[colIdx['TraitID']];
            const dataName = cols[colIdx['DataName']];
            const stdValue = parseFloat(cols[colIdx['StdValue']]);

            if (!speciesName) continue;

            if (!speciesMap.has(speciesName)) {
                speciesMap.set(speciesName, {
                    name: speciesName,
                    latSum: 0, latCount: 0,
                    lngSum: 0, lngCount: 0,
                    traits: {
                        wood_density_g_cm3: { sum: 0, count: 0 },
                        leaf_nitrogen_mg_g: { sum: 0, count: 0 },
                        sla_m2_kg: { sum: 0, count: 0 },
                        plant_height_m: { sum: 0, count: 0 }
                    }
                });
            }

            const entry = speciesMap.get(speciesName);

            if (!isNaN(stdValue)) {
                if (dataName === DATA_NAMES.LATITUDE) {
                    entry.latSum += stdValue;
                    entry.latCount++;
                } else if (dataName === DATA_NAMES.LONGITUDE) {
                    entry.lngSum += stdValue;
                    entry.lngCount++;
                }
                if (traitID && TRAIT_IDS[traitID]) {
                    const key = TRAIT_IDS[traitID];
                    entry.traits[key].sum += stdValue;
                    entry.traits[key].count++;
                }
            }
            
            if (lineCount % 100000 === 0) process['stdout'].write(`\r[ETL] Lendo TRY: ${lineCount.toLocaleString()} linhas.`);
        }

        console.log(`\n[ETL] Leitura concluída. ${speciesMap.size} espécies únicas.`);

        // 2. Pré-consolidação
        let preList = [];
        for (const [name, data] of speciesMap) {
            const lat = data.latCount > 0 ? data.latSum / data.latCount : null;
            const lng = data.lngCount > 0 ? data.lngSum / data.lngCount : null;
            
            const ecological_traits = {};
            let hasTraits = false;
            
            // Iteração segura sobre traits
            for (const k in data.traits) {
                const v = data.traits[k];
                if (v.count > 0) {
                    ecological_traits[k] = parseFloat((v.sum / v.count).toFixed(2));
                    hasTraits = true;
                }
            }

            if (hasTraits || (lat && lng)) {
                // IMPORTANTE: Backend espera 'biomes' como Array de strings
                const biome = inferBiome(lat, lng);
                preList.push({
                    name: name,
                    location: { lat: lat || 0, lng: lng || 0 },
                    biomes: [biome], 
                    climate_zone: inferClimate(lat),
                    ecological_traits
                });
            }
        }

        // 3. Enriquecimento com API
        const listToEnrich = preList.slice(0, MAX_SPECIES_TO_ENRICH);
        const finalDataset = await processEnrichmentQueue(listToEnrich);

        // Se houver mais dados processados localmente que não foram para a API, adiciona eles sem enriquecimento
        // para não perder dados (opcional, aqui vamos salvar apenas os enriquecidos para garantir qualidade)
        // const remaining = preList.slice(MAX_SPECIES_TO_ENRICH).map(i => ({...i, is_native: true, family: 'Unknown'}));
        // const fullDataset = [...finalDataset, ...remaining];

        console.log(`[ETL] Salvando ${finalDataset.length} espécies...`);
        
        // Garante que o diretório existe
        await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });
        await fs.promises.writeFile(outputPath, JSON.stringify(finalDataset, null, 2));
        
        console.log(`[ETL] Sucesso! Arquivo salvo em: ${outputPath}`);

    } catch (err) {
        console.error('\n[ETL] Erro fatal:', err);
        process['exit'](1);
    }
}

runStreamingETL();
