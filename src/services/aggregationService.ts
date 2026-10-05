/**
 * AgriLink AI - Supply Aggregation Service (Phase 3C)
 *
 * Trust Boundary:
 *   React Screen 10 → aggregationService → FastAPI POST /api/aggregation/preview → backend supply_aggregation.py
 *
 * All aggregation calculations are authoritative on the Python FastAPI backend.
 * The frontend does NOT compute the cluster, radius, or quantity selection.
 * Client-supplied data is for calculation input only; no authorization is derived from it.
 */

import { BuyerRequirement, CropListing } from '../types';

const BACKEND_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_BACKEND_URL) || 'http://localhost:8000';


export interface AggregatedFarmerContribution {
  listing_id: string;
  farmer_id: string;
  farmer_name: string;
  crop_name: string;
  quantity_kg: number;
  contribution_kg: number;
  asking_price_per_kg: number;
  quality_grade: string;
  latitude: number;
  longitude: number;
  harvest_date: string | null;
  distance_from_seed_km: number;
  location_name: string;
}

export interface AggregationPreviewResult {
  requirement_id: string;
  crop: string;
  required_quantity_kg: number;
  total_selected_kg: number;
  remaining_kg: number;
  is_fully_satisfied: boolean;
  fulfillment_percentage: number;
  selected_farmers: AggregatedFarmerContribution[];
  farmer_count: number;
  cluster_seed_listing_id: string | null;
  cluster_radius_km: number;
  max_allowed_radius_km: number;
  harvest_window_hours: number;
  max_allowed_harvest_window_hours: number;
  avg_price_per_kg: number;
  excluded_no_harvest_date: string[];
  excluded_too_far: { id: string; dist_km: number }[];
  excluded_no_coords: string[];
  excluded_bad_qty: string[];
  status: string;
  notice: string;
  is_estimated: boolean;
}

/**
 * Calls the authoritative FastAPI supply aggregation preview endpoint.
 * Throws a descriptive error if the backend is unavailable.
 */
export async function getAggregationPreview(
  requirement: BuyerRequirement,
  listings: CropListing[]
): Promise<AggregationPreviewResult> {
  const payload = {
    requirement: {
      id: requirement.id,
      crop_name: requirement.cropName,
      required_quantity_kg: requirement.requiredQuantityKg,
      max_price_per_kg: requirement.maxPricePerKg,
      delivery_deadline: requirement.deliveryDeadline,
      destination_lat: requirement.destinationLat,
      destination_lng: requirement.destinationLng,
      destination_name: requirement.destinationName,
    },
    listings: listings.map((l) => ({
      id: l.id,
      farmer_id: l.farmerId,
      farmer_name: l.farmerName || 'Farmer',
      crop_name: l.cropName,
      quantity_kg: l.quantityKg,
      asking_price_per_kg: l.askingPricePerKg,
      quality_grade: l.qualityGrade || 'Grade A',
      harvest_date: l.harvestDate || null,
      latitude: l.latitude ?? null,
      longitude: l.longitude ?? null,
      location_name: l.locationName || '',
    })),
  };

  const response = await fetch(`${BACKEND_URL}/api/aggregation/preview`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(
      typeof errBody.detail === 'string'
        ? errBody.detail
        : `Aggregation engine returned HTTP ${response.status}: ${response.statusText}`
    );
  }

  const data = await response.json();
  return data as AggregationPreviewResult;
}
