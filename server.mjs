
import express from 'express';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs/promises';
import process from 'process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Carrega a base de dados "plana" em memória.
// FIX: Corrigido o caminho para apontar para a pasta 'backend'.
const dbPath = path.join(__dirname, 'backend', 'data', 'processed_flat_species.json');
let allSpecies;

try {
  const dbFile = await fs.readFile(dbPath, 'utf-8');
  allSpecies = JSON.parse(dbFile);
  console.log('[Brota-Backend] Banco de dados (processed