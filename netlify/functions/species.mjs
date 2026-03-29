import fs from 'fs/promises';
import path from 'path';
import process from 'process';

// No Netlify Lambda, os arquivos incluídos via included_files ficam acessíveis
// em relação ao diretório base da função.
const dbPath = path.resolve('backend/data/processed_flat_species.json');
let allSpecies = null;

async function getUserElevation(lat, lng) {
    try {
        const url = `https://api.open-meteo.com/v1/elevation?latitude=${lat}&longitude=${lng}`;
        const response = await fetch(url);
        const data = await response.json();
        if (data && data.elevation && data.elevation.length > 0) {
            return data.elevation[0];
        }
        return null;
    } catch (error) {
        console.error("[Netlify-Function] Erro ao buscar elevação:", error.message);
        return null;
    }
}

function getContextForLocation(lat, lng) {
    if (!lat || !lng) return { biome: 'Desconhecido', climate_zone: 'Desconhecido' };
    if (lat < -23 && lng > -55) return { biome: 'Mata Atlântica', climate_zone: 'Subtropical Úmido' };
    if (lat < -15 && lng > -50) return { biome: 'Cerrado', climate_zone: 'Tropical' };
    if (lat > -15 && lat < -3 && lng > -45) return { biome: 'Caatinga', climate_zone: 'Semiárido' };
    if (lat < -16 && lng < -54) return { biome: 'Pantanal', climate_zone: 'Tropical' };
    if (lat < 5 && lng < -45) return { biome: 'Amazônia', climate_zone: 'Equatorial' };
    return { biome: 'Mata Atlântica', climate_zone: 'Tropical' };
}

export const handler = async (event) => {
  try {
    if (!allSpecies) {
      const dbFile = await fs.readFile(dbPath, 'utf-8');
      allSpecies = JSON.parse(dbFile);
    }

    const { lat, lng } = event.queryStringParameters || {};
    const userLat = parseFloat(lat);
    const userLng = parseFloat(lng);

    if (isNaN(userLat) || isNaN(userLng)) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Coordenadas inválidas.' }),
      };
    }
    
    const userContext = getContextForLocation(userLat, userLng);
    const userElevation = await getUserElevation(userLat, userLng);
    
    const suitableSpecies = allSpecies.filter(s => {
        // Correção: Aceita biomes como string ou array para robustez
        const biomes = Array.isArray(s.biomes) ? s.biomes : (s.biome ? [s.biome] : []);
        const biomeMatch = biomes.includes(userContext.biome);
        if (!biomeMatch) return false;

        if (userElevation !== null && s.altitude_range_m) {
            const buffer = 300;
            if (userElevation < s.altitude_range_m.min - buffer || userElevation > s.altitude_range_m.max + buffer) {
                return false;
            }
        }
        return true;
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
          context: { ...userContext, elevation_m: userElevation },
          species: suitableSpecies.map(s => ({
              name: s.name,
              is_native: s.is_native,
              family: s.family,
              ecological_traits: s.ecological_traits
          }))
      }),
    };
  } catch (error) {
    console.error('[Netlify-Function] Erro Crítico:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Erro ao processar dados de espécies.' }),
    };
  }
};