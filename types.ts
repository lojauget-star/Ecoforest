

import type { Feature, Polygon } from 'geojson';

// --- New Types for Enriched Backend Response ---
export interface WFOSpecies {
  name: string;
  is_native: boolean;
  // Add family property to support regional species metadata
  family?: string;
}

export interface WFOEnrichedResponse {
  context: {
    biome: string;
    climate_zone: string;
    // Fix: Added elevation_m to avoid "Object literal may only specify known properties" error in apiService.ts
    elevation_m?: number | null;
  };
  species: WFOSpecies[];
}
// ---------------------------------------------


export interface PlanRequest {
  user_id?: string;
  area_geojson: Feature<Polygon>;
  location: { lat: number; lng: number };
  soil_type: string;
  climate: string;
  area_ha: number;
  objectives: string[];
  preferred_species?: string[];
  wfo_species?: WFOSpecies[];
  data_source_link?: string;
  constraints?: { [key: string]: string };
  animal_type?: string;
  animal_welfare_goals?: string[];
}

export interface SpeciesPlacement {
  species: string;
  strata: 'emergent' | 'high' | 'medium' | 'low';
  coordinates: [number, number];
  info: string;
  spacing_meters: number;
}

export interface SuccessionStep {
  species: string;
  plant_year: number;
  strata?: string;
  notes?: string;
}

export interface DocumentReference {
  title: string;
  id: string;
}

export interface PlanResponse {
  plan_id: string;
  map_layers: SpeciesPlacement[];
  consortium_pattern: SpeciesPlacement[];
  succession_schedule: SuccessionStep[];
  explanations: string;
  confidence_score: number;
  wfo_suggestions?: string[];
  animal_welfare_impact?: string;
  references: DocumentReference[];
}

export interface Feedback {
  plan_id: string;
  rating: number;
  notes: string;
  observations?: { [key: string]: any };
}

export interface RiskPredictionRequest {
  location: { lat: number; lng: number };
  soilManagement: string;
  recentPests: string;
  climateSummary?: string;
}

export interface VulnerabilityWindow {
  date: string;
  pest: string;
  reason: string;
}

export interface RiskPredictionResponse {
  riskLevel: 'low' | 'medium' | 'high';
  vulnerabilityWindows: VulnerabilityWindow[];
  recommendations: string[];
}

// --- New/Updated Types for "Origem" Feature ---

export interface Product {
    name: string;
    description: string;
    price: string; // Using string to accommodate formats like "R$ 10,00 / kg"
    image: string;
}

export type SealId = 'organic' | 'fair_trade' | 'humane_certified';

export interface Seal {
    id: SealId;
    name: string;
    description: string;
}

export interface Producer {
    id: number;
    name: string;
    location: { lat: number; lng: number };
    products: Product[]; // Changed from string[]
    seals: SealId[];
    story: string;
    image: string;
}

export interface QuizAnswers {
    [key: string]: string;
}