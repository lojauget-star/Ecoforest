
import express from 'express';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs/promises';
import process from 'process';
import { createServer as createViteServer } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

const app = express();
const PORT = process.env.PORT || 3000;

const dbPath = path.join(__dirname, 'data', 'processed_flat_species.json');
let allSpecies;

// Carrega a base de dados "plana" em memória.
(async () => {
    try {
        const dbFile = await fs.readFile(dbPath, 'utf-8');
        allSpecies = JSON.parse(dbFile);
        console.log(`[Brota-Backend] DB carregado: ${allSpecies.length} espécies com dados ecológicos.`);
    } catch (error) {
        console.error('Erro crítico: Execute `npm run etl` para gerar o banco de dados.', error);
        process['exit'](1);
    }
})();

// Lógica de Bioma
function getContextForLocation(lat, lng) {
    if (!lat || !lng) return { biome: 'Desconhecido', climate_zone: 'Desconhecido' };
    if (lat < -23 && lng > -55) return { biome: 'Mata Atlântica', climate_zone: 'Subtropical Úmido' };
    if (lat < -15 && lng > -50) return { biome: 'Cerrado', climate_zone: 'Tropical' };
    if (lat > -15 && lat < -3 && lng > -45) return { biome: 'Caatinga', climate_zone: 'Semiárido' };
    if (lat < -16 && lng < -54) return { biome: 'Pantanal', climate_zone: 'Tropical' };
    if (lat < 5 && lng < -45) return { biome: 'Amazônia', climate_zone: 'Equatorial' };
    return { biome: 'Mata Atlântica', climate_zone: 'Tropical' };
}

// Função auxiliar para buscar elevação (altitude) usando API Open-Meteo (Gratuita)
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
        console.error("[Brota-Backend] Falha ao buscar elevação externa:", error.message);
        return null;
    }
}

app.get('/api/species', async (req, res) => {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);

    if (isNaN(lat) || isNaN(lng)) return res.status(400).json({ error: 'Coords invalidas' });

    // 1. Contexto de Bioma
    const userContext = getContextForLocation(lat, lng);
    
    // 2. Contexto de Altitude (Real)
    const userElevation = await getUserElevation(lat, lng);
    console.log(`[API] Req: Lat ${lat}, Lng ${lng} | Bioma: ${userContext.biome} | Altitude Estimada: ${userElevation ? userElevation + 'm' : 'N/A'}`);

    // 3. Filtragem Inteligente
    const suitableSpecies = allSpecies.filter(s => {
        // A. Filtro de Bioma (Obrigatório)
        const biomeMatch = (s.biomes && s.biomes.includes(userContext.biome)) || (s.biome && s.biome === userContext.biome);
        if (!biomeMatch) return false;

        // B. Filtro de Altitude (Opcional, mas preferencial)
        if (userElevation !== null && s.altitude_range_m) {
            // Margem de tolerância de 300m para cima ou para baixo
            const buffer = 300; 
            const minValid = s.altitude_range_m.min - buffer;
            const maxValid = s.altitude_range_m.max + buffer;
            
            // Se a altitude do usuário estiver MUITO fora da faixa da espécie, descartamos
            if (userElevation < minValid || userElevation > maxValid) {
                return false;
            }
        }
        // Se a espécie não tem dados de altitude (null), aceitamos ela pelo critério do bioma (benefício da dúvida)
        return true;
    });

    if (!suitableSpecies.length) {
        return res.json({ 
            context: {
                ...userContext,
                elevation_m: userElevation
            }, 
            species: [] 
        });
    }

    console.log(`[API] Encontradas ${suitableSpecies.length} espécies compatíveis com Bioma + Altitude.`);

    res.json({
        context: {
            ...userContext,
            elevation_m: userElevation
        },
        species: suitableSpecies
    });
});

app.get('/api/weather', async (req, res) => {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);

    if (isNaN(lat) || isNaN(lng)) return res.status(400).json({ error: 'Coords invalidas' });

    try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,precipitation&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,relative_humidity_2m_mean&timezone=auto&forecast_days=7`;
        const response = await fetch(url);
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error("[Brota-Backend] Falha ao buscar dados climáticos:", error.message);
        res.status(500).json({ error: 'Falha ao buscar dados climáticos' });
    }
});

async function startServer() {
    // Define rota explicitamente para evitar conflito de sobrecarga de tipos
    if (process.env.NODE_ENV !== "production") {
        const vite = await createViteServer({
            server: { middlewareMode: true },
            appType: "spa",
        });
        app.use(vite.middlewares);
    } else {
        app.use(express.static(path.join(projectRoot, 'dist')));
        app.get('*', (req, res) => {
            res.sendFile(path.join(projectRoot, 'dist', 'index.html'));
        });
    }

    app.listen(PORT, "0.0.0.0", () => console.log(`Server running on port ${PORT}`));
}

startServer();
