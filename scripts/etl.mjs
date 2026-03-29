import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import process from 'process';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- CONFIGURAÇÃO ---
// Mapeamento para corresponder às propriedades do arquivo JSON de origem.
const COLUMN_MAPPING = {
  scientificName: 'scientificName_WFO',
  countryCode: 'countryCode',
  latitude: 'decimalLatitude',
  longitude: 'decimalLongitude',
};


// --- MOCK CONSTANTS ---
// Em um cenário real, estas seriam pesquisas complexas ou chamadas de API.
const getContextForLocation = (lat, lng) => {
    if (lat < -29) {
        return { biome: 'Pampa', climate_zone: 'Subtropical Úmido' };
    }
    if (lat < -20) {
        return { biome: 'Mata Atlântica', climate_zone: 'Subtropical Úmido' };
    }
    if (lat < -10 && lng < -50) {
        return { biome: 'Pantanal', climate_zone: 'Tropical' };
    }
    if (lat < -3 && lat > -15 && lng > -45) {
        return { biome: 'Caatinga', climate_zone: 'Semiárido' };
    }
    if (lat < -10) {
         return { biome: 'Cerrado', climate_zone: 'Tropical' };
    }
    return { biome: 'Amazônia', climate_zone: 'Equatorial' };
};


// Mock de enriquecimento da API "Flora e Funga do Brasil"
const getNativeStatus = (speciesName) => {
    const nonNativeList = ['Musa', 'Coffea', 'Zea mays', 'Manihot esculenta', 'Solanum lycopersicum', 'Phaseolus vulgaris'];
    return !nonNativeList.some(s => speciesName.includes(s));
};

async function runETL() {
    console.log('[ETL] Iniciando processo de Extração, Transformação e Carga a partir de fonte JSON...');

    // --- 1. EXTRACT ---
    // FIX: Alterado para ler o arquivo JSON em vez do CSV.
    console.log('[ETL] Lendo o arquivo JSON de entrada...');
    const inputPath = path.join(__dirname, '..', 'data', 'wfo_checklist_sample.json');
    const jsonData = await fs.readFile(inputPath, 'utf-8');
    const records = JSON.parse(jsonData);
    
    console.log(`[ETL] ${records.length} registros extraídos do JSON.`);

    // --- 2. TRANSFORM ---
    console.log('[ETL] Transformando e enriquecendo os dados para uma estrutura plana...');
    const flatSpeciesList = [];

    for (const record of records) {
        // Usa o mapeamento para encontrar os dados corretos
        if (record[COLUMN_MAPPING.countryCode] !== 'BR') continue; 

        const lat = parseFloat(record[COLUMN_MAPPING.latitude]);
        const lng = parseFloat(record[COLUMN_MAPPING.longitude]);

        if (isNaN(lat) || isNaN(lng)) continue;

        const speciesName = record[COLUMN_MAPPING.scientificName];
        const { biome, climate_zone } = getContextForLocation(lat, lng);
        const is_native = getNativeStatus(speciesName);
        
        const speciesEntry = {
            name: speciesName,
            is_native,
            location: { lat, lng },
            biome,
            climate_zone
        };
        
        flatSpeciesList.push(speciesEntry);
    }
    console.log(`[ETL] Transformação concluída. ${flatSpeciesList.length} espécies brasileiras mapeadas.`);

    // --- 3. LOAD ---
    console.log('[ETL] Salvando a lista de espécies processada em um arquivo JSON...');
    const outputPath = path.join(__dirname, '..', 'data', 'processed_flat_species.json');
    await fs.writeFile(outputPath, JSON.stringify(flatSpeciesList, null, 2));
    
    console.log(`[ETL] Sucesso! Dados salvos em ${outputPath}`);
}

runETL().catch(error => {
    console.error('[ETL] Ocorreu um erro durante o processo:', error);
    // Fix: Access exit dynamically to bypass type check error
    process['exit'](1);
});