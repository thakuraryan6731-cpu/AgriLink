import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
  Package,
  Layers,
  CheckCircle2,
  MapPin,
  Truck,
  ArrowRight,
  Users,
  ServerCrash,
  RefreshCw,
  Play,
  Sprout,
  Clock,
  AlertCircle,
  Info,
  Loader2,
  HelpCircle,
  X
} from 'lucide-react';
import { BuyerRequirement, CropListing } from '../../types';
import {
  getAggregationPreview,
  AggregationPreviewResult,
  AggregatedFarmerContribution
} from '../../services/aggregationService';
import { createAggregatedOrder } from '../../services/dbService';
import { isSupabaseConfigured } from '../../lib/supabase';
import { useLanguage } from '../../i18n/LanguageContext';

interface MatchedSupplyBuilderProps {
  requirements: BuyerRequirement[];
  listings: CropListing[];
  onConfirmLot: (lot: any) => void;
  onNavigate: (screen: number) => void;
}

export const MatchedSupplyBuilder: React.FC<MatchedSupplyBuilderProps> = ({
  requirements,
  listings,
  onConfirmLot,
  onNavigate
}) => {
  const { t } = useLanguage();
  const [selectedReqId, setSelectedReqId] = useState<string>(requirements[0]?.id || '');
  const [preview, setPreview] = useState<AggregationPreviewResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<boolean>(false);
  const [isPersisting, setIsPersisting] = useState<boolean>(false);
  const [persistError, setPersistError] = useState<string | null>(null);
  const [showPriceOverrideModal, setShowPriceOverrideModal] = useState<boolean>(false);
  const [overMaxPriceInfo, setOverMaxPriceInfo] = useState<{ maxPrice: number; highestAsk: number } | null>(null);

  const selectedReq = requirements.find((r) => r.id === selectedReqId) || requirements[0];

  const fetchPreview = useCallback(async (req: BuyerRequirement) => {
    setIsLoading(true);
    setError(null);
    setPreview(null);
    setConfirmed(false);
    setPersistError(null);
    try {
      // Filter listings relevant to this requirement's crop (case-insensitive)
      const relevantListings = listings.filter(
        (l) => l.cropName.toLowerCase() === req.cropName.toLowerCase()
      );
      const result = await getAggregationPreview(req, relevantListings);
      setPreview(result);
    } catch (err: any) {
      console.warn('[MatchedSupplyBuilder] Aggregation service unreachable:', err);
      setError(t('buyer.supplyUnavailable'));
    } finally {
      setIsLoading(false);
    }
  }, [listings]);

  useEffect(() => {
    if (selectedReq) {
      fetchPreview(selectedReq);
    }
  }, [selectedReq?.id]);

  const executeOrderCreation = async (approvePriceOverride: boolean = false) => {
    if (!preview || !selectedReq) return;
    setIsPersisting(true);
    setPersistError(null);

    const items = preview.selected_farmers.map(f => ({
      crop_inventory_id: f.listing_id,
      farmer_id: f.farmer_id,
      allocated_quantity_kg: f.contribution_kg,
      price_per_kg: f.asking_price_per_kg,
      distance_from_hub_km: f.distance_from_seed_km,
      is_seed_farmer: (f as any).is_seed_farmer ?? (preview.selected_farmers.indexOf(f) === 0)
    }));

    const hubName = preview.selected_farmers[0]?.location_name || 'Central District Agritech Hub';
    const hubLat = preview.selected_farmers[0]?.latitude || 20.08;
    const hubLng = preview.selected_farmers[0]?.longitude || 73.83;

    try {
      if (isSupabaseConfigured) {
        const result = await createAggregatedOrder({
          requirementId: selectedReq.id,
          cropName: selectedReq.cropName,
          qualityGrade: selectedReq.preferredQualityGrade || 'Grade A',
          hubLocation: { name: hubName, lat: hubLat, lng: hubLng },
          items,
          priceOverrideApproved: approvePriceOverride
        });

        setConfirmed(true);
        setShowPriceOverrideModal(false);

        onConfirmLot({
          id: result.orderId,
          requirementId: selectedReq.id,
          cropName: selectedReq.cropName,
          qualityGrade: selectedReq.preferredQualityGrade || 'Grade A',
          aggregatedQuantityKg: preview.total_selected_kg,
          targetQuantityKg: preview.required_quantity_kg,
          avgPricePerKg: preview.avg_price_per_kg,
          status: 'BUYER_CONFIRMED',
          participatingFarmers: preview.selected_farmers.map((f) => ({
            listingId: f.listing_id,
            farmerId: f.farmer_id,
            farmerName: f.farmer_name,
            quantityKg: f.contribution_kg,
            distanceToHubKm: f.distance_from_seed_km,
            lat: f.latitude,
            lng: f.longitude,
          })),
          hubLocation: { name: hubName, lat: hubLat, lng: hubLng },
          clusterRadiusKm: preview.cluster_radius_km,
          createdAt: new Date().toISOString(),
          isPersisted: true
        });

        setTimeout(() => onNavigate(11), 600);
      } else {
        // Local fallback
        const mockOrderId = `ORD-${Date.now().toString(36).toUpperCase()}`;
        setConfirmed(true);
        setShowPriceOverrideModal(false);

        onConfirmLot({
          id: mockOrderId,
          requirementId: selectedReq.id,
          cropName: selectedReq.cropName,
          qualityGrade: selectedReq.preferredQualityGrade || 'Grade A',
          aggregatedQuantityKg: preview.total_selected_kg,
          targetQuantityKg: preview.required_quantity_kg,
          avgPricePerKg: preview.avg_price_per_kg,
          status: 'BUYER_CONFIRMED',
          participatingFarmers: preview.selected_farmers.map((f) => ({
            listingId: f.listing_id,
            farmerId: f.farmer_id,
            farmerName: f.farmer_name,
            quantityKg: f.contribution_kg,
            distanceToHubKm: f.distance_from_seed_km,
            lat: f.latitude,
            lng: f.longitude,
          })),
          hubLocation: { name: hubName, lat: hubLat, lng: hubLng },
          clusterRadiusKm: preview.cluster_radius_km,
          createdAt: new Date().toISOString(),
          isPersisted: false
        });

        setTimeout(() => onNavigate(11), 600);
      }
    } catch (err: any) {
      console.error('[MatchedSupplyBuilder] Order creation error:', err);
      const errMsg = err?.message || String(err);
      if (errMsg.includes('PRICE_EXCEEDS_MAX') || errMsg.includes('price')) {
        const highest = Math.max(...preview.selected_farmers.map(f => f.asking_price_per_kg));
        setOverMaxPriceInfo({
          maxPrice: selectedReq.maxPricePerKg,
          highestAsk: highest
        });
        setShowPriceOverrideModal(true);
      } else {
        setPersistError(errMsg || 'Failed to create aggregated order.');
      }
    } finally {
      setIsPersisting(false);
    }
  };

  const handleConfirm = () => {
    if (!preview || !selectedReq) return;

    // Check if any farmer asking price exceeds max price
    const maxP = selectedReq.maxPricePerKg;
    const highestAsk = Math.max(...preview.selected_farmers.map(f => f.asking_price_per_kg));

    if (highestAsk > maxP) {
      setOverMaxPriceInfo({ maxPrice: maxP, highestAsk });
      setShowPriceOverrideModal(true);
      return;
    }

    executeOrderCreation(false);
  };

  // ── Empty states ────────────────────────────────────────────────────────────
  if (!requirements || requirements.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm space-y-4 max-w-2xl mx-auto my-8">
        <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto border border-blue-200">
          <Package className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 font-heading">{t('buyer.noRequirements')}</h2>
        <p className="text-sm text-slate-600 max-w-md mx-auto">
          {t('buyer.createRequirementMatchingHint')}
        </p>
        <button
          onClick={() => onNavigate(8)}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition shadow-md inline-flex items-center gap-2"
        >
          <span>{t('buyer.createRequirement')}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl p-6 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-blue-200 text-xs font-mono mb-1">
            <Sparkles className="w-3.5 h-3.5 text-cyan-300 animate-pulse" />
            <span className="font-semibold uppercase tracking-wider">Build a Supply Lot</span>
            <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-bold text-[10px]">
              AI Aggregation
            </span>
          </div>
          <h1 className="text-2xl font-bold font-heading text-white">{t('buyer.supplyAggregation')}</h1>
          <p className="text-xs text-blue-100 mt-1 max-w-xl leading-relaxed">
            Consolidates fragmented smallholder harvests within a{' '}
            <strong className="text-cyan-300 font-bold">15 km geographic radius</strong> and{' '}
            <strong className="text-cyan-300 font-bold">24-hour harvest window</strong> using deterministic bounded aggregation.
          </p>
        </div>
        {/* Requirement Selector */}
        <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md p-2 rounded-xl border border-white/20 shrink-0">
          <span className="text-xs text-white font-bold pl-1">{t('buyer.requirement')}:</span>
          <select
            value={selectedReqId}
            onChange={(e) => setSelectedReqId(e.target.value)}
            className="bg-white text-slate-900 border border-slate-300 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400 font-bold max-w-[220px] truncate"
          >
            {requirements.map((r) => (
              <option key={r.id} value={r.id} className="text-slate-900">
                {r.cropName} ({r.requiredQuantityKg} kg) — {r.buyerName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Algorithm Banner */}
      <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm font-mono text-xs text-slate-700 flex flex-wrap gap-4">
        <span className="flex items-center gap-1.5">
          <MapPin className="w-4 h-4 text-blue-600" />
          <strong className="text-slate-900">{t('buyer.radius')}:</strong> ≤15 km Haversine (geographic)
        </span>
        <span className="flex items-center gap-1.5">
          <Clock className="w-4 h-4 text-indigo-600" />
          <strong className="text-slate-900">{t('buyer.harvestWindow')}:</strong> ≤24 hours across cluster
        </span>
        <span className="flex items-center gap-1.5">
          <Layers className="w-4 h-4 text-emerald-600" />
          <strong className="text-slate-900">{t('buyer.selection')}:</strong> Bounded greedy, proximity-first
        </span>
      </div>

      {/* Requirement Summary Card */}
      {selectedReq && (
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center text-xl font-bold">
              {selectedReq.cropName === 'Tomato' ? '🍅' : selectedReq.cropName === 'Onion' ? '🧅' : selectedReq.cropName === 'Potato' ? '🥔' : '🌱'}
            </div>
            <div>
              <span className="text-slate-500 block text-[11px] font-semibold">{t('buyer.buyerRequirement')}</span>
              <span className="font-bold text-slate-900 text-sm">{selectedReq.buyerName}</span>
            </div>
          </div>
          <div className="font-mono">
            <span className="text-slate-500 block text-[10px] uppercase font-semibold">Crop</span>
            <span className="font-bold text-slate-900 text-sm">{selectedReq.cropName}</span>
          </div>
          <div className="font-mono">
            <span className="text-slate-500 block text-[10px] uppercase font-semibold">Required</span>
            <span className="font-bold text-blue-700 text-sm">{selectedReq.requiredQuantityKg.toLocaleString()} kg</span>
          </div>
          <div className="font-mono">
            <span className="text-slate-500 block text-[10px] uppercase font-semibold">Max Price</span>
            <span className="font-bold text-emerald-700 text-sm">₹{selectedReq.maxPricePerKg}/kg</span>
          </div>
          <div className="font-mono">
            <span className="text-slate-500 block text-[10px] uppercase font-semibold">Deadline</span>
            <span className="font-bold text-slate-800 text-sm">{selectedReq.deliveryDeadline?.slice(0, 10)}</span>
          </div>
        </div>
      )}

      {/* Service Unavailable */}
      {error && (
        <div className="bg-white rounded-2xl p-8 border border-red-200 shadow-sm space-y-4">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-2xl bg-red-50 text-red-600 shrink-0 border border-red-200">
              <ServerCrash className="w-8 h-8" />
            </div>
            <div className="flex-1 space-y-1">
              <h3 className="text-lg font-bold text-slate-900 font-heading">Supply information is temporarily unavailable</h3>
              <p className="text-xs text-slate-600">{error}</p>
              <p className="text-xs text-slate-500 pt-1">
                Please try again to refresh available supply.
              </p>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-200">
            <button
              onClick={() => selectedReq && fetchPreview(selectedReq)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition flex items-center gap-2 shadow"
            >
              <RefreshCw className="w-3.5 h-3.5 text-white" />
              <span>Try again</span>
            </button>
          </div>
        </div>
      )}

      {/* Loading skeleton */}
      {isLoading && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm animate-pulse space-y-4">
          <div className="h-5 bg-slate-200 rounded w-48" />
          <div className="h-3 bg-slate-200 rounded w-64" />
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-slate-100 rounded-xl" />)}
          </div>
        </div>
      )}

      {/* Aggregation Preview Results */}
      {!isLoading && !error && preview && (
        <div className="space-y-4">
          {/* Fulfillment Status Bar */}
          <div className={`rounded-2xl p-5 border shadow-sm flex flex-wrap items-center justify-between gap-4 ${
            preview.is_fully_satisfied
              ? 'bg-emerald-50/80 border-emerald-300 text-emerald-950'
              : 'bg-amber-50/80 border-amber-300 text-amber-950'
          }`}>
            <div className="flex items-center gap-3">
              {preview.is_fully_satisfied ? (
                <CheckCircle2 className="w-7 h-7 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-7 h-7 text-amber-600 shrink-0" />
              )}
              <div>
                <p className="text-sm font-bold text-slate-900 font-heading">
                  {preview.is_fully_satisfied
                    ? 'Full Fulfillment Available'
                    : `Partial Aggregation Available (${preview.fulfillment_percentage}%)`}
                </p>
                <p className="text-xs text-slate-600 font-medium">
                  {preview.is_fully_satisfied
                    ? `${preview.total_selected_kg} kg across ${preview.farmer_count} farmer(s) fully satisfies the requirement.`
                    : `Only ${preview.total_selected_kg} kg of ${preview.required_quantity_kg} kg can be sourced. Remaining: ${preview.remaining_kg} kg.`}
                </p>
              </div>
            </div>
            {/* Quantity summary chips */}
            <div className="flex gap-6 font-mono text-center text-xs">
              <div className="bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm">
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Buyer Needs</span>
                <span className="font-bold text-slate-900 text-base">{preview.required_quantity_kg.toLocaleString()} kg</span>
              </div>
              <div className="bg-white px-3 py-2 rounded-xl border border-emerald-200 shadow-sm">
                <span className="text-emerald-700 block text-[10px] uppercase font-bold">Selected</span>
                <span className="font-bold text-emerald-700 text-base">{preview.total_selected_kg.toLocaleString()} kg</span>
              </div>
              <div className="bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm">
                <span className="text-slate-500 block text-[10px] uppercase font-bold">Remaining</span>
                <span className={`font-bold text-base ${preview.remaining_kg > 0 ? 'text-amber-700' : 'text-slate-500'}`}>
                  {preview.remaining_kg.toLocaleString()} kg
                </span>
              </div>
            </div>
          </div>

          {/* Cluster Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-sm text-center">
              <span className="text-slate-500 block text-[10px] uppercase font-bold mb-1">Cluster Radius</span>
              <span className="font-bold text-blue-700 text-base font-mono">{preview.cluster_radius_km} km</span>
              <span className="text-[10px] text-slate-500 block font-medium">max {preview.max_allowed_radius_km} km</span>
            </div>
            <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-sm text-center">
              <span className="text-slate-500 block text-[10px] uppercase font-bold mb-1">Harvest Window</span>
              <span className="font-bold text-indigo-700 text-base font-mono">{preview.harvest_window_hours}h</span>
              <span className="text-[10px] text-slate-500 block font-medium">max {preview.max_allowed_harvest_window_hours}h</span>
            </div>
            <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-sm text-center">
              <span className="text-slate-500 block text-[10px] uppercase font-bold mb-1">Farmers</span>
              <span className="font-bold text-slate-900 text-base font-mono">{preview.farmer_count}</span>
              <span className="text-[10px] text-slate-500 block font-medium">Producers</span>
            </div>
            <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-sm text-center">
              <span className="text-slate-500 block text-[10px] uppercase font-bold mb-1">Avg Price</span>
              <span className="font-bold text-emerald-700 text-base font-mono">₹{preview.avg_price_per_kg.toFixed(2)}/kg</span>
              <span className="text-[10px] text-slate-500 block font-medium">Consolidated rate</span>
            </div>
          </div>

          {/* Farmer Contributions */}
          {preview.selected_farmers.length > 0 && (
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-600" />
                Selected Farmer Contributions ({preview.farmer_count})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {preview.selected_farmers.map((farmer, idx) => (
                  <div key={farmer.listing_id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-sm">{farmer.farmer_name}</span>
                      {idx === 0 ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-300 font-bold">
                          Seed Cluster
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold">
                          Participating
                        </span>
                      )}
                    </div>
                    <div className="font-mono space-y-1.5 text-xs text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Contribution:</span>
                        <span className="font-bold text-emerald-700">{farmer.contribution_kg} kg</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Available Qty:</span>
                        <span className="text-slate-800 font-medium">{farmer.quantity_kg} kg</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Dist from Seed:</span>
                        <span className="text-blue-700 font-medium">{farmer.distance_from_seed_km} km</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Harvest:</span>
                        <span className="text-slate-800 font-medium">{farmer.harvest_date?.slice(0, 10) || '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Ask Price:</span>
                        <span className="text-slate-900 font-bold">₹{farmer.asking_price_per_kg}/kg</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Exclusion diagnostics */}
              {(preview.excluded_no_harvest_date.length > 0 || preview.excluded_too_far.length > 0 || preview.excluded_no_coords.length > 0) && (
                <div className="mt-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 font-mono space-y-1">
                  <div className="flex items-center gap-2 font-bold text-amber-900 mb-1">
                    <Info className="w-4 h-4 text-amber-700" />
                    Exclusion Diagnostics
                  </div>
                  {preview.excluded_no_harvest_date.length > 0 && (
                    <div>• Missing harvest date (excluded): {preview.excluded_no_harvest_date.length} listing(s)</div>
                  )}
                  {preview.excluded_too_far.length > 0 && (
                    <div>• Beyond 15 km radius (excluded): {preview.excluded_too_far.length} listing(s)</div>
                  )}
                  {preview.excluded_no_coords.length > 0 && (
                    <div>• Missing coordinates (excluded): {preview.excluded_no_coords.length} listing(s)</div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* No farmers found state */}
          {preview.selected_farmers.length === 0 && (
            <div className="bg-white rounded-2xl p-10 text-center border border-slate-200 shadow-sm space-y-3">
              <Sprout className="w-12 h-12 text-slate-400 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800">No Compatible Supply Found</h3>
              <p className="text-xs text-slate-600 max-w-md mx-auto">{preview.notice}</p>
            </div>
          )}

          {persistError && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-300 text-xs text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-600" />
              <span>{persistError}</span>
            </div>
          )}

          {/* Confirm Button */}
          {preview.selected_farmers.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="text-xs text-slate-600 space-y-0.5">
                <p className="font-bold text-slate-900">
                  {preview.is_fully_satisfied ? '✅ Full requirement fulfilled' : '⚠️ Partial fulfillment only'}
                </p>
                <p>Cluster radius: {preview.cluster_radius_km} km · Harvest window: {preview.harvest_window_hours}h · {preview.farmer_count} farmer(s)</p>
              </div>
              <button
                onClick={handleConfirm}
                disabled={confirmed || isPersisting}
                className={`px-6 py-3 rounded-xl font-bold text-xs flex items-center gap-2 transition whitespace-nowrap shadow-md ${
                  confirmed
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 cursor-default'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50'
                }`}
              >
                {isPersisting ? (
                  <><Loader2 className="w-4 h-4 animate-spin text-white" /><span>Saving Order to Database...</span></>
                ) : confirmed ? (
                  <><CheckCircle2 className="w-4 h-4 text-emerald-700" /><span>Order Confirmed & Persisted</span></>
                ) : (
                  <><CheckCircle2 className="w-4 h-4 text-white" /><span>Create Aggregated Order → Screen 11</span></>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Two-Step Explicit Price Approval Modal Dialog */}
      {showPriceOverrideModal && overMaxPriceInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 border border-amber-300 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
                <AlertCircle className="w-5 h-5 text-amber-600" />
                <span>Price Exceeds Requirement Max Price</span>
              </div>
              <button
                onClick={() => setShowPriceOverrideModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-slate-700 space-y-2">
              <p>
                Selected produce lot contains asking prices up to{' '}
                <strong className="text-amber-800 font-mono font-bold">₹{overMaxPriceInfo.highestAsk.toFixed(2)}/kg</strong>,
                which is higher than your maximum requirement price of{' '}
                <strong className="text-slate-900 font-mono font-bold">₹{overMaxPriceInfo.maxPrice.toFixed(2)}/kg</strong>.
              </p>
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900">
                Difference:{' '}
                <strong className="font-mono font-bold">
                  +₹{(overMaxPriceInfo.highestAsk - overMaxPriceInfo.maxPrice).toFixed(2)}/kg
                </strong>
                . Do you wish to approve this price difference to secure this high-grade pooled farm supply?
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowPriceOverrideModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => executeOrderCreation(true)}
                disabled={isPersisting}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition shadow"
              >
                {isPersisting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                )}
                <span>Approve Price & Confirm</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

