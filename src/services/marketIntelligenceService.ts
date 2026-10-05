/**
 * AgriLink AI - Market Intelligence & Demand Forecasting Service (Phase 3A)
 * 
 * Strict architectural boundary:
 * React Screen 3 -> marketIntelligenceService -> FastAPI POST /api/market/forecast -> backend demand_forecast.py
 * 
 * Authoritative forecasting logic lives strictly on the backend.
 * If FastAPI is unavailable, this service throws an informative error.
 */

import { DemandForecast } from '../types';

const BACKEND_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_BACKEND_URL) || 'http://localhost:8000';


export const SUPPORTED_MARKET_CROPS = [
  'Tomato',
  'Onion',
  'Potato',
  'Pulses',
  'Wheat',
  'Maize'
] as const;

export const SUPPORTED_MARKET_LOCATIONS = [
  'Nashik',
  'Pune',
  'Kolar',
  'Azadpur',
  'Indore',
  'Guntur'
] as const;

export type SupportedCrop = typeof SUPPORTED_MARKET_CROPS[number];
export type SupportedLocation = typeof SUPPORTED_MARKET_LOCATIONS[number];

/**
 * Fetches 7-day demand forecast from authoritative FastAPI backend.
 * Throws an error if FastAPI is offline or returns an error.
 */
export async function getMarketDemandForecast(
  crop: string,
  location: string = 'Nashik',
  horizonDays: number = 7
): Promise<DemandForecast> {
  const response = await fetch(`${BACKEND_URL}/api/market/forecast`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      crop,
      location,
      horizon_days: horizonDays,
    }),
  });

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(
      errBody.detail || `Backend forecast engine returned HTTP ${response.status}: ${response.statusText}`
    );
  }

  const data = await response.json();
  return data as DemandForecast;
}

/**
 * Development-only offline baseline fallback.
 * ONLY called if explicitly opted-in by user/dev action.
 * Clearly labeled as: "Offline prototype forecast — backend unavailable"
 */
export function getDevOfflineFallbackForecast(
  crop: string,
  location: string = 'Nashik',
  horizonDays: number = 7
): DemandForecast {
  const BASELINES: Record<string, {
    price: number;
    prevPrice: number;
    supplyKg: number;
    demandKg: number;
    trend: number;
    volatility: number;
    obsCount: number;
    dest: string;
    action: string;
  }> = {
    'Tomato': {
      price: 19.0,
      prevPrice: 16.05,
      supplyKg: 360000,
      demandKg: 590000,
      trend: 0.038,
      volatility: 0.08,
      obsCount: 90,
      dest: 'Bhiwandi & Pune Megacity Hubs',
      action: 'High urban demand pull in Mumbai-Pune corridor. Aggregate yields for pooled direct B2B delivery to capture +38% realization.'
    },
    'Onion': {
      price: 22.5,
      prevPrice: 20.6,
      supplyKg: 1140000,
      demandKg: 1360000,
      trend: 0.019,
      volatility: 0.06,
      obsCount: 120,
      dest: 'Azadpur Delhi & Vashi Navi Mumbai',
      action: 'Steady demand across northern corridors. Direct aggregation lots recommended for 10-tonne truck pooling.'
    },
    'Potato': {
      price: 16.8,
      prevPrice: 17.2,
      supplyKg: 1840000,
      demandKg: 1810000,
      trend: -0.005,
      volatility: 0.04,
      obsCount: 100,
      dest: 'Agra-Hathras Processing Cluster',
      action: 'Stable cold-storage arrivals. Contract directly with processing units for fixed buy-back pricing.'
    },
    'Pulses': {
      price: 56.5,
      prevPrice: 54.0,
      supplyKg: 180000,
      demandKg: 240000,
      trend: 0.015,
      volatility: 0.05,
      obsCount: 75,
      dest: 'Dal Mills & Consumer Packagers',
      action: 'Strong protein demand. Sell directly to processing dal mills over APMC traders.'
    },
    'Wheat': {
      price: 28.5,
      prevPrice: 27.2,
      supplyKg: 1200000,
      demandKg: 1450000,
      trend: 0.010,
      volatility: 0.04,
      obsCount: 95,
      dest: 'Flour Mills & Biscuit Manufacturers',
      action: 'Sharbati variety commands premium. Direct supply to premium flour brands.'
    },
    'Maize': {
      price: 21.5,
      prevPrice: 20.0,
      supplyKg: 650000,
      demandKg: 850000,
      trend: 0.018,
      volatility: 0.05,
      obsCount: 80,
      dest: 'Poultry Feed & Starch Manufacturing Units',
      action: 'Strong feed industry demand. Moisture below 14% qualifies for instant premium.'
    }
  };

  const key = Object.keys(BASELINES).find(
    (k) => k.toLowerCase() === crop.toLowerCase()
  ) || 'Tomato';

  const base = BASELINES[key];
  const priceChangePct = Number((((base.price - base.prevPrice) / base.prevPrice) * 100).toFixed(1));
  const confidence = Number(Math.min(0.90, Math.max(0.45, (base.obsCount / 100.0) * 0.90 - base.volatility * 0.5)).toFixed(2));

  const DOW_DEMAND = [1.00, 0.98, 1.02, 1.04, 1.08, 1.12, 0.95];
  const DOW_SUPPLY = [1.08, 1.02, 0.98, 0.96, 0.94, 0.92, 0.85];

  const predictions = [];
  let totalDemand = 0;
  let totalSupply = 0;
  const today = new Date();

  for (let i = 0; i < horizonDays; i++) {
    const dt = new Date(today.getTime() + i * 86400000);
    const dow = dt.getDay();
    const dowIdx = dow === 0 ? 6 : dow - 1;

    const trendMult = 1.0 + base.trend * (i + 1);
    const dailyDemand = Math.max(0, Math.round(base.demandKg * DOW_DEMAND[dowIdx] * trendMult));
    const dailySupply = Math.max(0, Math.round(base.supplyKg * DOW_SUPPLY[dowIdx] * (1.0 - base.trend * 0.2 * i)));

    const predPrice = Number(Math.max(0.5, base.price * (1.0 + base.trend * 0.75 * (i + 1))).toFixed(2));
    const upperBand = Number((predPrice * (1.0 + base.volatility)).toFixed(2));
    const lowerBand = Number(Math.max(0.1, predPrice * (1.0 - base.volatility)).toFixed(2));

    totalDemand += dailyDemand;
    totalSupply += dailySupply;

    const dateStr = dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    const dayLabel = dt.toLocaleDateString('en-GB', { weekday: 'short' });
    const demandIndex = Math.min(100, Math.max(10, Math.round((dailyDemand / base.demandKg) * 70)));

    predictions.push({
      date: dateStr,
      dayLabel,
      predicted_demand_kg: dailyDemand,
      projectedDemandTonnes: Number((dailyDemand / 1000).toFixed(1)),
      historical_arrival_kg: dailySupply,
      historicalArrivalTonnes: Number((dailySupply / 1000).toFixed(1)),
      predicted_price_per_kg: predPrice,
      predictedMandiPriceInr: predPrice,
      price_upper_band: upperBand,
      priceUpperBand: upperBand,
      price_lower_band: lowerBand,
      priceLowerBand: lowerBand,
      confidence,
      demandIndex
    });
  }

  const firstD = predictions[0]?.predicted_demand_kg || base.demandKg;
  const lastD = predictions[predictions.length - 1]?.predicted_demand_kg || base.demandKg;
  const demandChangePct = Number((((lastD - firstD) / firstD) * 100).toFixed(1));
  const supplyDemandGapKg = Number((totalSupply - totalDemand).toFixed(1));

  const gapRatio = supplyDemandGapKg / totalDemand;
  const threatLevel = gapRatio < -0.20 ? 'HIGH' : gapRatio < -0.05 ? 'MEDIUM' : 'LOW';

  return {
    crop: key,
    cropName: key,
    location,
    horizon_days: horizonDays,
    forecast_date: today.toISOString().split('T')[0],
    current_price_per_kg: base.price,
    currentAvgMandiPrice: base.price,
    previous_price_per_kg: base.prevPrice,
    price_change_percent: priceChangePct,
    projected7DayChangePercent: priceChangePct,
    projected14DayChangePercent: Number((priceChangePct * 1.4).toFixed(1)),
    predicted_7d_demand_kg: Math.round(totalDemand),
    demand_change_percent: demandChangePct,
    supply_demand_gap_kg: supplyDemandGapKg,
    supply_demand_gap_tonnes: Number((supplyDemandGapKg / 1000).toFixed(1)),
    confidence,
    threat_level: threatLevel as any,
    threatLevel: threatLevel as any,
    recommendation: base.action,
    recommendedAction: base.action,
    suggested_destination: base.dest,
    suggestedMandiDestination: base.dest,
    predictions,
    forecastPoints: predictions,
    source: 'Offline prototype forecast — backend unavailable',
    is_simulated: true
  };
}
