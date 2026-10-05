/**
 * AgriLink AI - Buyer Matching & Net Realization Service (Phase 3B)
 * 
 * Strict architectural boundary:
 * React Screen 4 -> matchingService.ts -> FastAPI POST /api/matching/recommendations -> backend buyer_matching.py
 * 
 * The authoritative 6-factor matching calculation and master net realization
 * equation run strictly on the Python FastAPI backend.
 */

import { CropListing, BuyerRequirement, MatchingRecommendation, MatchingResponse } from '../types';

const BACKEND_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_BACKEND_URL) || 'http://localhost:8000';


/**
 * Evaluates farmer produce listing against open buyer requirements using authoritative FastAPI backend.
 * Throws an informative error if FastAPI is offline or unreachable.
 */
export async function getBuyerRecommendations(
  listing: CropListing,
  buyerRequirements: BuyerRequirement[] = []
): Promise<MatchingResponse> {
  const payload = {
    listing: {
      id: listing.id,
      crop_name: listing.cropName,
      variety: listing.variety,
      quantity_kg: listing.quantityKg,
      asking_price_per_kg: listing.askingPricePerKg,
      mandi_benchmark_price: listing.mandiBenchmarkPrice || 19.0,
      quality_grade: listing.qualityGrade || 'Grade A',
      harvest_date: listing.harvestDate,
      location_name: listing.locationName,
      latitude: listing.latitude,
      longitude: listing.longitude,
    },
    buyer_requirements: buyerRequirements.map((req) => ({
      id: req.id,
      buyer_id: req.buyerId,
      buyer_name: req.buyerName,
      buyer_type: req.buyerType,
      crop_name: req.cropName,
      variety: req.variety,
      required_quantity_kg: req.requiredQuantityKg,
      max_price_per_kg: req.maxPricePerKg,
      preferred_quality_grade: req.preferredQualityGrade || 'Grade A',
      delivery_deadline: req.deliveryDeadline,
      destination_name: req.destinationName,
      destination_lat: req.destinationLat,
      destination_lng: req.destinationLng,
    })),
  };

  const response = await fetch(`${BACKEND_URL}/api/matching/recommendations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(
      errBody.detail || `FastAPI matching engine returned HTTP ${response.status}: ${response.statusText}`
    );
  }

  const data = await response.json();
  return data as MatchingResponse;
}

/**
 * Optional development offline fallback for standalone local demos.
 * ONLY triggered if explicitly requested by user action when backend is unavailable.
 */
export function getDevOfflineFallbackRecommendations(
  listing: CropListing,
  buyerRequirements: BuyerRequirement[]
): MatchingResponse {
  const results: MatchingRecommendation[] = buyerRequirements.map((req) => {
    const cropMatch = req.cropName.toLowerCase() === listing.cropName.toLowerCase() ? 1.0 : 0.0;
    const qtyFit = Math.min(1.0, Math.max(0.0, listing.quantityKg / Math.max(req.requiredQuantityKg, 1)));
    const priceFit = req.maxPricePerKg >= listing.askingPricePerKg ? 0.95 : 0.70;
    const distFit = 0.85;
    const qualFit = 1.0;
    const feasFit = 0.90;

    const score = Number(
      (0.30 * cropMatch + 0.20 * qtyFit + 0.20 * priceFit + 0.15 * distFit + 0.10 * qualFit + 0.05 * feasFit).toFixed(4)
    );

    const distance = 42.5;
    const fuelCostPerKg = 0.85;
    const handlingCostPerKg = 0.24;
    const decay = Number(((distance / 50) * 0.05).toFixed(2));
    const netPerKg = Number(Math.max(0, req.maxPricePerKg - fuelCostPerKg - handlingCostPerKg - decay).toFixed(2));
    const totalNet = Math.round(netPerKg * listing.quantityKg);

    const mandiNet = Number(Math.max(0, (listing.mandiBenchmarkPrice || 19.0) * 0.86 - 2.2).toFixed(2));
    const profitGain = Number((((netPerKg - mandiNet) / Math.max(mandiNet, 0.01)) * 100).toFixed(1));

    return {
      buyer_requirement_id: req.id,
      buyer_name: req.buyerName,
      buyer_type: req.buyerType,
      destination_name: req.destinationName,
      crop: req.cropName,
      required_quantity_kg: req.requiredQuantityKg,
      offer_price_per_kg: req.maxPricePerKg,
      match_score: score,
      match_percentage: Math.round(score * 100),
      factor_scores: {
        crop: cropMatch,
        quantity: qtyFit,
        price: priceFit,
        distance: distFit,
        quality: qualFit,
        feasibility: feasFit,
      },
      distance_km: distance,
      estimated_net_realization_per_kg: netPerKg,
      total_net_realization_inr: totalNet,
      profit_gain_percentage: profitGain,
      extra_income_inr: Math.max(0, totalNet - Math.round(mandiNet * listing.quantityKg)),
      transport_cost_per_kg: fuelCostPerKg,
      fuel_cost_per_kg: fuelCostPerKg,
      handling_cost_per_kg: handlingCostPerKg,
      perishability_decay_per_kg: decay,
      traditional_mandi_net_per_kg: mandiNet,
    };
  });

  results.sort((a, b) => b.match_score - a.match_score);

  return {
    source: 'Offline prototype forecast — backend unavailable',
    is_estimated: true,
    listing_id: listing.id,
    crop: listing.cropName,
    quantity_kg: listing.quantityKg,
    asking_price_per_kg: listing.askingPricePerKg,
    total_matches_evaluated: buyerRequirements.length,
    total_matches_found: results.length,
    results,
  };
}
