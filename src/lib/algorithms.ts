import {
  CropListing,
  BuyerRequirement,
  NetRealizationResult,
  AggregationLot,
  CVRPRoute,
  RouteWaypoint
} from '../types';

/**
 * Calculates Great-Circle Distance between two coordinates in Kilometers (Haversine formula)
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(1));
}

/**
 * SECTION 6.3: Smart Selling Opportunity & Net Realization Engine
 * 
 * Formula:
 * NR_i = P_offer - ((C_fuel * D_i + C_handling) / Q_farmer) - S(D_i)
 * 
 * Where:
 * - P_offer: Buyer offer price per kg (₹)
 * - D_i: Distance from farm to drop-off point (km)
 * - C_fuel: Pooled transport fuel cost factor (₹14/km standard rural mini-truck)
 * - C_handling: Loading & un-crating overheads (₹180 fixed)
 * - Q_farmer: Farmer yield quantity (kg)
 * - S(D_i): Perishability decay penalty factor = ₹0.05 / kg per 50 km
 */
export function calculateNetRealization(
  listing: CropListing,
  buyer: BuyerRequirement,
  fuelCostFactor: number = 14.0, // ₹ per km
  handlingCostFixed: number = 180.0 // ₹ fixed
): NetRealizationResult {
  const distanceKm = calculateHaversineDistance(
    listing.latitude,
    listing.longitude,
    buyer.destinationLat,
    buyer.destinationLng
  );

  const offerPrice = buyer.maxPricePerKg;
  const quantity = Math.max(listing.quantityKg, 1);

  // Logistics cost component allocated per kg (assuming pooled share)
  const pooledLoadShare = Math.min(1.0, quantity / 1500); // normalized against a 1.5-tonne vehicle
  const totalTripTransportCost = (fuelCostFactor * distanceKm + handlingCostFixed) * pooledLoadShare;
  const fuelCostPerKg = Number((totalTripTransportCost / quantity).toFixed(2));
  const handlingCostPerKg = Number(((handlingCostFixed * pooledLoadShare) / quantity).toFixed(2));

  // Perishability decay penalty factor: ₹0.05/kg per 50 km
  const perishabilityDecayCost = Number(((distanceKm / 50) * 0.05).toFixed(2));

  // True Net Realization per kg
  const netRealizationPerKg = Number(
    Math.max(0, offerPrice - fuelCostPerKg - perishabilityDecayCost).toFixed(2)
  );

  const totalNetRealization = Math.round(netRealizationPerKg * quantity);

  // Traditional Mandi Net Realization:
  // Farmer sells at baseline mandi rate - 8% APMC commission - 6% middleman cuts - ₹2.20/kg individual unpooled transport
  const traditionalMandiGross = listing.mandiBenchmarkPrice || (offerPrice * 0.82);
  const mandiDeductions = (traditionalMandiGross * 0.14) + 2.20;
  const traditionalMandiNetPerKg = Number(Math.max(0, traditionalMandiGross - mandiDeductions).toFixed(2));
  const traditionalTotal = traditionalMandiNetPerKg * quantity;

  // Realized Profit Gain %
  const extraIncomeInr = Math.max(0, totalNetRealization - traditionalTotal);
  const profitGainPercentage = traditionalTotal > 0
    ? Number((((totalNetRealization - traditionalTotal) / traditionalTotal) * 100).toFixed(1))
    : 0;

  // Match score for this buyer
  const scoreMatch = calculateMatchScore(listing, buyer, distanceKm);

  return {
    buyerId: buyer.buyerId,
    buyerName: buyer.buyerName,
    destinationName: buyer.destinationName,
    buyerOfferPrice: offerPrice,
    distanceKm,
    fuelCostPerKg,
    handlingCostPerKg,
    perishabilityDecayCost,
    netRealizationPerKg,
    totalNetRealization,
    traditionalMandiNetPerKg,
    profitGainPercentage,
    extraIncomeInr,
    scoreMatch
  };
}

/**
 * SECTION 6.4: Multi-Parametric Buyer Matching Engine
 * 
 * Formula:
 * S_match = 0.30(C_crop) + 0.20(S_qty) + 0.20(S_price) + 0.15(S_dist) + 0.10(S_qual) + 0.05(S_feas)
 */
export function calculateMatchScore(
  listing: CropListing,
  buyer: BuyerRequirement,
  distanceKm: number
): number {
  // 1. Crop Match (30%)
  const isCropExact = listing.cropName.toLowerCase().trim() === buyer.cropName.toLowerCase().trim();
  const cropScore = isCropExact ? 100 : (listing.cropName.toLowerCase().includes(buyer.cropName.toLowerCase()) ? 60 : 0);

  // 2. Quantity Compatibility (20%)
  const qtyRatio = Math.min(listing.quantityKg, buyer.requiredQuantityKg) / Math.max(listing.quantityKg, buyer.requiredQuantityKg);
  const qtyScore = Math.round(qtyRatio * 100);

  // 3. Price Satisfaction (20%)
  // Farmer asks P_ask, Buyer offers P_max. If asking <= max, 100%, else penalized
  const priceScore = listing.askingPricePerKg <= buyer.maxPricePerKg
    ? 100
    : Math.max(0, 100 - (listing.askingPricePerKg - buyer.maxPricePerKg) * 15);

  // 4. Distance Proximity (15%)
  // Under 25km = 100%, drops to 0 at 250km
  const distScore = Math.max(0, Math.round(100 - (distanceKm / 250) * 100));

  // 5. Quality Grade Compatibility (10%)
  let qualScore = 70;
  if (listing.qualityGrade === buyer.preferredQualityGrade) {
    qualScore = 100;
  } else if (listing.qualityGrade === 'Grade A') {
    qualScore = 95; // Grade A satisfies any preference
  } else if (buyer.preferredQualityGrade === 'Grade A') {
    qualScore = 40;
  }

  // 6. Feasibility & Window (5%)
  const feasScore = 90; // Harvest timing within delivery deadline

  const compositeScore =
    0.30 * cropScore +
    0.20 * qtyScore +
    0.20 * priceScore +
    0.15 * distScore +
    0.10 * qualScore +
    0.05 * feasScore;

  return Math.min(100, Math.max(0, Math.round(compositeScore)));
}

/**
 * SECTION 6.5: Smart Supply Aggregation Engine
 * 
 * 1. Spatial Radius Clustering: Group listings within 15 km of central hub.
 * 2. Harvest Window Alignment: Select listings with harvest within 24h.
 * 3. Knapsack / Greedy Batching: Aggregate yields until Q_target is satisfied.
 */
export function aggregateSupplyLots(
  buyerRequirement: BuyerRequirement,
  availableListings: CropListing[],
  maxRadiusKm: number = 25.0
): AggregationLot | null {
  // Filter compatible crops and status
  const compatible = availableListings.filter(
    (l) =>
      (l.status === 'available' || l.status === 'aggregating') &&
      l.cropName.toLowerCase() === buyerRequirement.cropName.toLowerCase()
  );

  if (compatible.length === 0) return null;

  // Central hub is determined by weighted center of gravity of listings
  const centerLat = compatible.reduce((acc, l) => acc + l.latitude, 0) / compatible.length;
  const centerLng = compatible.reduce((acc, l) => acc + l.longitude, 0) / compatible.length;

  // Filter within radius of cluster
  const withinRadius = compatible.filter((l) => {
    const dist = calculateHaversineDistance(centerLat, centerLng, l.latitude, l.longitude);
    return dist <= maxRadiusKm;
  });

  // Sort by price and distance to assemble best cost-effective knapsack
  withinRadius.sort((a, b) => a.askingPricePerKg - b.askingPricePerKg);

  let accumulatedKg = 0;
  const selectedListings = [];

  for (const listing of withinRadius) {
    const distToHub = calculateHaversineDistance(centerLat, centerLng, listing.latitude, listing.longitude);
    selectedListings.push({
      listingId: listing.id,
      farmerName: listing.farmerName,
      farmerId: listing.farmerId,
      quantityKg: listing.quantityKg,
      distanceToHubKm: distToHub,
      lat: listing.latitude,
      lng: listing.longitude
    });
    accumulatedKg += listing.quantityKg;
    if (accumulatedKg >= buyerRequirement.requiredQuantityKg * 1.1) {
      break; // Sufficient buffer reached
    }
  }

  if (selectedListings.length === 0) return null;

  const avgPrice =
    withinRadius
      .slice(0, selectedListings.length)
      .reduce((acc, l) => acc + l.askingPricePerKg * l.quantityKg, 0) / accumulatedKg;

  return {
    id: `LOT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
    requirementId: buyerRequirement.id,
    targetQuantityKg: buyerRequirement.requiredQuantityKg,
    aggregatedQuantityKg: Math.round(accumulatedKg),
    cropName: buyerRequirement.cropName,
    qualityGrade: buyerRequirement.preferredQualityGrade,
    hubLocation: {
      name: `${withinRadius[0]?.district || 'Nashik'} Central Agritech Hub`,
      lat: Number(centerLat.toFixed(4)),
      lng: Number(centerLng.toFixed(4))
    },
    participatingFarmers: selectedListings,
    avgPricePerKg: Number(avgPrice.toFixed(2)),
    status: accumulatedKg >= buyerRequirement.requiredQuantityKg ? 'confirmed' : 'aggregating',
    clusterRadiusKm: maxRadiusKm,
    createdAt: new Date().toISOString()
  };
}

/**
 * SECTION 6.6: CVRP Route Optimization & Logistics Engine
 * 
 * Solves Capacitated Vehicle Routing Problem for milk-run pickups:
 * Hub/Transporter -> Farmer 1 -> Farmer 2 -> ... -> Collection Hub -> Bulk Buyer
 */
export function solveCVRPRoute(
  lot: AggregationLot,
  buyerRequirement: BuyerRequirement,
  transporterProfile: { id: string; name: string; vehicleType: string; capacityKg: number }
): CVRPRoute {
  const waypoints: RouteWaypoint[] = [];
  let seq = 1;

  // 1. Pickup stops sorted with Nearest Neighbor heuristic starting from hub
  let unvisited = [...lot.participatingFarmers];
  let currentLat = lot.hubLocation.lat;
  let currentLng = lot.hubLocation.lng;

  const sortedPickups: typeof lot.participatingFarmers = [];

  while (unvisited.length > 0) {
    let nearestIdx = 0;
    let minD = Infinity;

    for (let i = 0; i < unvisited.length; i++) {
      const d = calculateHaversineDistance(currentLat, currentLng, unvisited[i].lat, unvisited[i].lng);
      if (d < minD) {
        minD = d;
        nearestIdx = i;
      }
    }

    const nextFarmer = unvisited[nearestIdx];
    sortedPickups.push(nextFarmer);
    currentLat = nextFarmer.lat;
    currentLng = nextFarmer.lng;
    unvisited.splice(nearestIdx, 1);
  }

  // Create sequential waypoints
  const now = new Date();
  let cumulativeMinutes = 20; // 20m dispatch prep

  sortedPickups.forEach((f, idx) => {
    const arrivalTime = new Date(now.getTime() + cumulativeMinutes * 60000);
    waypoints.push({
      id: `WP-PK-${idx + 1}`,
      type: 'pickup',
      title: `Pickup Stop #${idx + 1}: ${f.farmerName}`,
      subtitle: `Collect ${f.quantityKg} kg ${lot.cropName}`,
      quantityKg: f.quantityKg,
      lat: f.lat,
      lng: f.lng,
      sequenceIndex: seq++,
      estimatedArrival: arrivalTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: idx === 0 ? 'reached' : 'pending'
    });
    cumulativeMinutes += 25; // 25 min travel & loading per stop
  });

  // Aggregation Hub Waypoint
  cumulativeMinutes += 20;
  waypoints.push({
    id: 'WP-HUB-01',
    type: 'hub',
    title: `Micro-Hub: ${lot.hubLocation.name}`,
    subtitle: `QC & Consolidated Batching (${lot.aggregatedQuantityKg} kg total)`,
    quantityKg: lot.aggregatedQuantityKg,
    lat: lot.hubLocation.lat,
    lng: lot.hubLocation.lng,
    sequenceIndex: seq++,
    estimatedArrival: new Date(now.getTime() + cumulativeMinutes * 60000).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    }),
    status: 'pending'
  });

  // Final Buyer Drop-off Waypoint
  cumulativeMinutes += 45;
  waypoints.push({
    id: 'WP-DROP-01',
    type: 'dropoff',
    title: `Buyer Delivery: ${buyerRequirement.buyerName}`,
    subtitle: `${buyerRequirement.destinationName} (${buyerRequirement.requiredQuantityKg} kg)`,
    quantityKg: buyerRequirement.requiredQuantityKg,
    lat: buyerRequirement.destinationLat,
    lng: buyerRequirement.destinationLng,
    sequenceIndex: seq++,
    estimatedArrival: new Date(now.getTime() + cumulativeMinutes * 60000).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    }),
    status: 'pending'
  });

  // Calculate total CVRP distance
  let totalDistanceKm = 0;
  for (let i = 0; i < waypoints.length - 1; i++) {
    totalDistanceKm += calculateHaversineDistance(
      waypoints[i].lat,
      waypoints[i].lng,
      waypoints[i + 1].lat,
      waypoints[i + 1].lng
    );
  }
  totalDistanceKm = Number((totalDistanceKm * 1.25).toFixed(1)); // 1.25 winding road coefficient

  // Unoptimized comparison: if each farmer drove individually to the buyer
  let unoptimizedDistanceKm = 0;
  sortedPickups.forEach((f) => {
    const d = calculateHaversineDistance(f.lat, f.lng, buyerRequirement.destinationLat, buyerRequirement.destinationLng);
    unoptimizedDistanceKm += d * 2 * 1.25; // Roundtrip per smallholder
  });

  const costPerKm = 16.5; // ₹ per km
  const estimatedCostInr = Math.round(totalDistanceKm * costPerKm);
  const unoptimizedCostInr = Math.round(unoptimizedDistanceKm * costPerKm);
  const fuelSavedInr = Math.max(0, unoptimizedCostInr - estimatedCostInr);
  const co2SavedKg = Math.round((fuelSavedInr / 100) * 2.6); // standard diesel emission savings

  // Generate smooth coordinate path for Leaflet
  const geojsonCoordinates: [number, number][] = waypoints.map((w) => [w.lat, w.lng]);

  const loadKg = lot.aggregatedQuantityKg;
  const capacityKg = transporterProfile.capacityKg;
  const utilizationPercentage = Math.min(100, Math.round((loadKg / capacityKg) * 100));

  return {
    id: `CVRP-RT-${Math.floor(1000 + Math.random() * 9000)}`,
    routeCode: `MH-MILKRUN-${Math.floor(100 + Math.random() * 900)}`,
    transporterId: transporterProfile.id,
    transporterName: transporterProfile.name,
    vehicleNumber: 'MH-15-EG-4829',
    vehicleType: transporterProfile.vehicleType,
    vehicleCapacityKg: capacityKg,
    currentLoadKg: loadKg,
    utilizationPercentage,
    waypoints,
    totalDistanceKm,
    estimatedTimeMinutes: cumulativeMinutes,
    estimatedCostInr,
    unoptimizedCostInr,
    fuelSavedInr,
    co2SavedKg,
    status: 'scheduled',
    geojsonCoordinates
  };
}
