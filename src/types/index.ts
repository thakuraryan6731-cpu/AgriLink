export type UserRole = 'farmer' | 'fpo_admin' | 'bulk_buyer' | 'consumer_group' | 'transporter' | 'doca_admin';

export type QualityGrade = 'Grade A' | 'Grade B' | 'Grade C';

export type CropStatus = 'available' | 'aggregating' | 'matched' | 'sold';

export type RequirementStatus = 'open' | 'matched' | 'fulfilled' | 'cancelled';

export type BatchStatus = 'aggregating' | 'confirmed' | 'in_transit' | 'delivered';

export type RouteStatus = 'scheduled' | 'picking_up' | 'in_transit' | 'completed';

export interface UserProfile {
  id: string;
  fullName: string;
  phone: string;
  role: UserRole;
  district: string;
  state: string;
  latitude: number;
  longitude: number;
  fpoName?: string;
  rating?: number;
  verified?: boolean;
  email?: string;
  companyName?: string;
  businessType?: string;
  businessAddress?: string;
}

export interface FarmerConversation {
  id: string;
  participant1Id: string;
  participant2Id: string;
  otherParticipant?: {
    id: string;
    fullName: string;
    phone?: string;
    district?: string;
    fpoName?: string;
  };
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount?: number;
  createdAt: string;
}

export interface FarmerMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName?: string;
  messageText: string;
  isRead: boolean;
  createdAt: string;
}

export interface CropListing {
  id: string;
  farmerId: string;
  farmerName: string;
  phone: string;
  cropName: string;
  variety: string;
  quantityKg: number;
  askingPricePerKg: number;
  mandiBenchmarkPrice: number;
  qualityGrade: QualityGrade;
  harvestDate: string;
  locationName: string;
  district: string;
  state: string;
  latitude: number;
  longitude: number;
  status: CropStatus;
  createdAt: string;
  decayPenaltyFactor?: number;
  photoUrls?: string[];
}

export interface BuyerRequirement {
  id: string;
  buyerId: string;
  buyerName: string;
  buyerType: 'Hotel/Restaurant' | 'Food Processor' | 'Modern Retailer' | 'Consumer Group Hub';
  cropName: string;
  variety?: string;
  requiredQuantityKg: number;
  maxPricePerKg: number;
  preferredQualityGrade: QualityGrade;
  deliveryDeadline: string;
  destinationName: string;
  destinationLat: number;
  destinationLng: number;
  status: RequirementStatus;
  createdAt: string;
}

export interface MatchingFactorScores {
  crop: number;
  quantity: number;
  price: number;
  distance: number | null;
  quality: number;
  feasibility: number;
}

export interface MatchingRecommendation {
  buyer_requirement_id: string;
  buyer_name: string;
  buyer_type: string;
  destination_name: string;
  crop: string;
  required_quantity_kg: number;
  offer_price_per_kg: number;
  match_score: number;
  match_percentage: number;
  factor_scores: MatchingFactorScores;
  distance_km: number | null;
  estimated_net_realization_per_kg: number;
  total_net_realization_inr: number;
  profit_gain_percentage: number;
  extra_income_inr: number;
  transport_cost_per_kg?: number;
  fuel_cost_per_kg: number;
  handling_cost_per_kg: number;
  perishability_decay_per_kg: number;
  traditional_mandi_net_per_kg: number;
}

export interface MatchingResponse {
  source: string;
  is_estimated: boolean;
  listing_id?: string;
  crop: string;
  quantity_kg: number;
  asking_price_per_kg: number;
  total_matches_evaluated: number;
  total_matches_found: number;
  results: MatchingRecommendation[];
}

export interface NetRealizationResult {
  buyerId: string;
  buyerName: string;
  destinationName: string;
  buyerOfferPrice: number;
  distanceKm: number;
  fuelCostPerKg: number;
  handlingCostPerKg: number;
  perishabilityDecayCost: number;
  netRealizationPerKg: number;
  totalNetRealization: number;
  traditionalMandiNetPerKg: number;
  profitGainPercentage: number;
  extraIncomeInr: number;
  scoreMatch: number;
}

export interface AggregationLot {
  id: string;
  requirementId: string;
  targetQuantityKg: number;
  aggregatedQuantityKg: number;
  cropName: string;
  qualityGrade: QualityGrade;
  hubLocation: {
    name: string;
    lat: number;
    lng: number;
  };
  participatingFarmers: {
    listingId: string;
    farmerName: string;
    farmerId: string;
    quantityKg: number;
    distanceToHubKm: number;
    lat: number;
    lng: number;
  }[];
  avgPricePerKg: number;
  status: BatchStatus;
  clusterRadiusKm: number;
  createdAt: string;
}

export interface RouteWaypoint {
  id: string;
  type: 'pickup' | 'hub' | 'dropoff';
  title: string;
  subtitle: string;
  quantityKg: number;
  lat: number;
  lng: number;
  sequenceIndex: number;
  estimatedArrival: string;
  status: 'pending' | 'reached' | 'completed';
}

export interface CVRPRoute {
  id: string;
  routeCode: string;
  transporterId: string;
  transporterName: string;
  vehicleNumber: string;
  vehicleType: string;
  vehicleCapacityKg: number;
  currentLoadKg: number;
  utilizationPercentage: number;
  waypoints: RouteWaypoint[];
  totalDistanceKm: number;
  estimatedTimeMinutes: number;
  estimatedCostInr: number;
  unoptimizedCostInr: number;
  fuelSavedInr: number;
  co2SavedKg: number;
  status: RouteStatus;
  geojsonCoordinates: [number, number][]; // [lat, lng] array
}

// ─── Phase 4A: OSRM Road Routing Types ──────────────────────────────────────

export interface RoutingCoordinate {
  lat: number;
  lng: number;
}

export interface RoadRouteGeometry {
  type: 'LineString';
  coordinates: [number, number][]; // [longitude, latitude] standard GeoJSON coordinates
}

export interface RoadRouteResponse {
  distance_km: number;
  duration_minutes: number;
  geometry: RoadRouteGeometry;
  source: string;
  is_estimated: boolean;
}

export interface DistanceMatrixResponse {
  distances_km: (number | null)[][];
  durations_minutes: (number | null)[][];
  source: string;
  is_estimated: boolean;
}

// ─── Phase 4B & 4C: CVRP & Route Persistence Types ──────────────────────────

export interface CVRPOptimizedWaypoint {
  type: 'hub' | 'farmer' | 'buyer';
  index: number;
  lat: number;
  lng: number;
  listing_id?: string;
  quantity_kg?: number;
  load_after_stop_kg?: number;
  load_after_pickup_kg?: number;
}

export interface CVRPSolvePayload {
  hub: RoutingCoordinate;
  pickup_stops: {
    listing_id: string;
    lat: number;
    lng: number;
    quantity_kg: number;
  }[];
  buyer: RoutingCoordinate;
  vehicle_capacity_kg?: number;
}

export interface CVRPSolveResponse {
  optimized_route: CVRPOptimizedWaypoint[];
  total_load_kg: number;
  vehicle_capacity_kg: number;
  capacity_utilization_pct: number;
  road_distance_km: number;
  road_duration_minutes: number;
  baseline_distance_km: number;
  distance_savings_km: number;
  distance_savings_pct: number;
  geometry: RoadRouteGeometry;
  solver: {
    name: string;
    first_solution_strategy: string;
    local_search_metaheuristic: string;
    status: string;
    time_limit_seconds: number;
    notice: string;
  };
  source: string;
  is_estimated: boolean;
}

export interface CreateConfirmedRouteInput {
  aggregated_order_id?: string;
  transporter_id?: string;
  vehicle_number?: string;
  vehicle_type?: string;
  vehicle_capacity_kg: number;
  current_load_kg: number;
  route_waypoints: CVRPOptimizedWaypoint[] | RouteWaypoint[];
  road_distance_km: number;
  road_duration_minutes: number;
  baseline_distance_km?: number;
  distance_savings_km?: number;
  geometry: RoadRouteGeometry;
}

export interface PersistedRouteResponse {
  id: string;
  route_code: string;
  aggregated_order_id?: string;
  transporter_id?: string;
  vehicle_number: string;
  vehicle_type: string;
  vehicle_capacity_kg: number;
  current_load_kg: number;
  route_waypoints: any[];
  total_distance_km: number;
  estimated_time_minutes: number;
  baseline_distance_km?: number;
  distance_savings_km?: number;
  route_geojson: RoadRouteGeometry;
  status: string;
  created_at: string;
  source: string;
  is_persisted: boolean;
}

export interface OrderStateTransitionResponse {
  order_id: string;
  previous_state: string;
  current_state: string;
  allowed_next_states: string[];
  timestamp: string;
  is_persisted?: boolean;
  persistence_error?: string | null;
}

export interface MarketObservation {
  crop: string;
  market: string;
  location: string;
  date: string;
  price_per_kg: number;
  demand_kg: number;
  supply_kg: number;
  source: string;
  is_simulated: boolean;
}

export interface DemandForecastPoint {
  date: string;
  dayLabel: string;
  predicted_demand_kg?: number;
  projectedDemandTonnes: number;
  historical_arrival_kg?: number;
  historicalArrivalTonnes: number;
  predicted_price_per_kg?: number;
  predictedMandiPriceInr: number;
  price_upper_band?: number;
  priceUpperBand: number;
  price_lower_band?: number;
  priceLowerBand: number;
  confidence?: number;
  demandIndex?: number; // 0 - 100
}

export interface DemandForecast {
  crop: string;
  cropName: string;
  location: string;
  horizon_days: number;
  forecast_date: string;
  current_price_per_kg: number;
  currentAvgMandiPrice: number;
  previous_price_per_kg: number;
  price_change_percent: number;
  projected7DayChangePercent: number;
  projected14DayChangePercent: number;
  predicted_7d_demand_kg: number;
  demand_change_percent: number;
  supply_demand_gap_kg: number;
  supply_demand_gap_tonnes: number;
  confidence: number;
  threat_level: 'HIGH' | 'MEDIUM' | 'LOW';
  threatLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  recommendation: string;
  recommendedAction: string;
  suggested_destination: string;
  suggestedMandiDestination: string;
  predictions: DemandForecastPoint[];
  forecastPoints: DemandForecastPoint[];
  source: string;
  is_simulated: boolean;
}

export type MarketIntelligence = DemandForecast;

export interface CropForecastSummary {
  cropName: string;
  currentAvgMandiPrice: number;
  projected7DayChangePercent: number;
  projected14DayChangePercent: number;
  threatLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  recommendedAction: string;
  suggestedMandiDestination: string;
  forecastPoints: DemandForecastPoint[];
}

export interface DoCAMacroMetrics {
  totalFarmersEmpowered: number;
  totalProduceTradedTonnes: number;
  totalFarmerIncomeGainedInr: number;
  avgFarmerGainPercentage: number;
  totalLogisticsFuelSavedInr: number;
  totalIntermediariesBypassed: number;
  avgPostHarvestLossReductionPercent: number;
  essentialCommodityRiskAlerts: {
    id: string;
    commodity: string;
    district: string;
    riskType: 'Deficit Risk' | 'Price Spike Risk' | 'Glut Warning';
    severity: 'critical' | 'moderate' | 'low';
    summary: string;
    recommendation: string;
  }[];
}

export interface VoiceListingExtract {
  cropName: string;
  variety: string;
  quantityKg: number;
  askingPricePerKg: number;
  qualityGrade: QualityGrade;
  harvestDate: string;
  locationName: string;
  confidence: number;
  detectedLanguage: string;
  originalTranscript: string;
}

export interface FarmerActiveOrder {
  id: string;
  requirementId?: string;
  cropName: string;
  targetQuantityKg: number;
  aggregatedQuantityKg: number;
  avgPricePerKg: number;
  status: string;
  buyerName: string;
  buyerContact?: string;
  buyerType?: string;
  buyerLocation: string;
  destinationLat?: number;
  destinationLng?: number;
  hubLocation: {
    name: string;
    lat: number;
    lng: number;
  };
  myAllocatedQuantityKg: number;
  myListingId?: string;
  participatingFarmers: {
    listingId: string;
    farmerName: string;
    farmerId: string;
    quantityKg: number;
    distanceToHubKm: number;
    lat: number;
    lng: number;
  }[];
  transporter: {
    name: string;
    vehicleNumber?: string;
    vehicleType?: string;
    capacityKg?: number;
    phone?: string;
  } | null;
  logisticsRoute: {
    id: string;
    routeCode: string;
    status: string;
    roadDistanceKm: number;
    roadDurationMinutes: number;
    baselineDistanceKm?: number;
    distanceSavingsKm?: number;
    geometry?: RoadRouteGeometry;
    waypoints?: any[];
    transporterName?: string;
    vehicleNumber?: string;
    vehicleType?: string;
    vehicleCapacityKg?: number;
  } | null;
  createdAt: string;
}

export interface FarmerConversation {
  id: string;
  participant1Id: string;
  participant2Id: string;
  otherParticipant?: {
    id: string;
    fullName: string;
    phone?: string;
    district?: string;
    fpoName?: string;
  };
  lastMessageAt?: string;
  createdAt: string;
}

export interface FarmerMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName?: string;
  messageText: string;
  isRead: boolean;
  createdAt: string;
}

export interface FarmerCommunityMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderDistrict?: string;
  senderRole?: string;
  senderFpoName?: string;
  message: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminFarmerUser {
  id: string;
  fullName: string;
  email?: string;
  phone?: string;
  address?: string;
  district: string;
  state: string;
  fpoName?: string;
  verified: boolean;
  totalListings: number;
  totalQuantityKg: number;
  createdAt: string;
}

export interface AdminBuyerUser {
  id: string;
  contactPerson: string;
  companyName: string;
  email?: string;
  phone?: string;
  businessAddress?: string;
  businessType: string;
  district: string;
  state: string;
  role: UserRole;
  verified: boolean;
  totalRequirements: number;
  totalDemandedKg: number;
  createdAt: string;
}

export interface AdminTransporterUser {
  id: string;
  fullName: string;
  email?: string;
  phone?: string;
  district: string;
  state: string;
  vehicleNumber?: string;
  vehicleType?: string;
  vehicleCapacityKg?: number;
  verified: boolean;
  totalRoutesCompleted: number;
  createdAt: string;
}

export interface AdminTransactionRecord {
  id: string;
  orderCode: string;
  orderId: string;
  requirementId?: string;
  orderStatus: string;
  cropName: string;
  variety?: string;
  qualityGrade: string;
  totalQuantityKg: number;
  avgPricePerKg: number;
  totalValueInr: number;
  hubLocationName: string;
  createdAt: string;
  updatedAt: string;
  farmers: {
    id: string;
    fullName: string;
    phone?: string;
    email?: string;
    district: string;
    state: string;
    allocatedKg: number;
    pricePerKg: number;
  }[];
  buyer: {
    id: string;
    contactPerson: string;
    companyName: string;
    email?: string;
    phone?: string;
    destinationName: string;
    district: string;
    state: string;
    businessType?: string;
  } | null;
  logistics: {
    routeId?: string;
    routeCode?: string;
    routeStatus?: string;
    transporterName?: string;
    transporterPhone?: string;
    vehicleNumber?: string;
    vehicleType?: string;
    totalDistanceKm?: number;
    distanceSavingsKm?: number;
  } | null;
}

export interface AdminLogisticsRouteRecord {
  id: string;
  routeCode: string;
  aggregatedOrderId?: string;
  transporterName: string;
  transporterPhone?: string;
  vehicleNumber: string;
  vehicleType: string;
  vehicleCapacityKg: number;
  currentLoadKg: number;
  status: string;
  totalDistanceKm: number;
  distanceSavingsKm?: number;
  estimatedTimeMinutes: number;
  waypointsCount: number;
  destinationName: string;
  createdAt: string;
}

export interface AdminUser {
  id: string;
  fullName: string;
  email?: string;
  phone?: string;
  role: UserRole;
  companyName?: string;
  businessType?: string;
  businessAddress?: string;
  district: string;
  state: string;
  fpoName?: string;
  verified: boolean;
  createdAt: string;
}

export interface AdminFpoUser {
  id: string;
  fullName: string;
  email?: string;
  phone?: string;
  fpoName: string;
  district: string;
  state: string;
  address?: string;
  verified: boolean;
  memberFarmersCount?: number;
  totalPooledKg?: number;
  createdAt: string;
}

export interface AdminUserCounts {
  farmers: number;
  fpoAdmins: number;
  bulkBuyers: number;
  consumerGroups: number;
  transporters: number;
  totalUsers: number;
}

export type AdminTransaction = AdminTransactionRecord;
export type AdminLogistics = AdminLogisticsRouteRecord;

export interface AdminTransactionDetail {
  orderId: string;
  orderCode: string;
  requirementId?: string;
  orderStatus: string;
  cropName: string;
  variety?: string;
  qualityGrade: string;
  totalQuantityKg: number;
  avgPricePerKg: number;
  approvedPricePerKg?: number;
  priceOverrideApproved?: boolean;
  totalValueInr: number;
  hubLocation: {
    name: string;
    lat?: number;
    lng?: number;
  };
  harvestWindowHours?: number;
  createdAt: string;
  updatedAt: string;
  farmers: {
    id: string;
    fullName: string;
    phone?: string;
    email?: string;
    district: string;
    state: string;
    address?: string;
    allocatedKg: number;
    pricePerKg: number;
    harvestDate?: string;
    distanceFromHubKm?: number;
  }[];
  buyer: {
    id: string;
    contactPerson: string;
    companyName: string;
    phone?: string;
    email?: string;
    destinationName: string;
    district: string;
    state: string;
    address?: string;
    businessType?: string;
    maxPricePerKg?: number;
    deliveryDeadline?: string;
  } | null;
  logistics: {
    routeId?: string;
    routeCode?: string;
    routeStatus?: string;
    transporterId?: string;
    transporterName?: string;
    transporterPhone?: string;
    vehicleNumber?: string;
    vehicleType?: string;
    vehicleCapacityKg?: number;
    currentLoadKg?: number;
    totalDistanceKm?: number;
    distanceSavingsKm?: number;
    estimatedTimeMinutes?: number;
    estimatedCostInr?: number;
    fuelSavedInr?: number;
    waypointsCount?: number;
  } | null;
}

export interface AdminMacroStats {
  totalFarmers: number;
  totalFpoAdmins: number;
  totalBulkBuyers: number;
  totalConsumerGroups: number;
  totalTransporters: number;
  totalListingsKg: number;
  totalActiveRequirements: number;
  totalAggregatedOrders: number;
  totalCompletedOrders: number;
  totalQuantityTradedKg: number;
  totalTransactionsValue: number;
}



