import React, { useState, useEffect, useMemo } from 'react';
import {
  ShoppingBag,
  TrendingUp,
  Sparkles,
  Truck,
  Clock,
  MapPin,
  CheckCircle2,
  ArrowRight,
  Calculator,
  ShieldCheck,
  Building2,
  Award,
  RefreshCw,
  ServerCrash,
  Play,
  Sprout,
  AlertCircle,
  Percent,
  Check
} from 'lucide-react';
import { CropListing, BuyerRequirement, MatchingRecommendation } from '../../types';
import {
  getBuyerRecommendations,
  getDevOfflineFallbackRecommendations
} from '../../services/matchingService';
import confetti from 'canvas-confetti';
import { useLanguage } from '../../i18n/LanguageContext';

interface RecommendedBuyersProps {
  listings: CropListing[];
  buyerRequirements: BuyerRequirement[];
  onNavigate: (screen: number) => void;
  onJoinPool: (buyerId: string, listingId: string) => void;
}

export const RecommendedBuyers: React.FC<RecommendedBuyersProps> = ({
  listings,
  buyerRequirements,
  onNavigate,
  onJoinPool
}) => {
  const { t } = useLanguage();
  const [selectedListingId, setSelectedListingId] = useState<string>(listings[0]?.id || '');
  const [joinedBuyerId, setJoinedBuyerId] = useState<string | null>(null);

  const [matches, setMatches] = useState<MatchingRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isDevFallbackActive, setIsDevFallbackActive] = useState<boolean>(false);

  // Sync selected listing if listings update
  useEffect(() => {
    if (!selectedListingId && listings.length > 0) {
      setSelectedListingId(listings[0].id);
    }
  }, [listings, selectedListingId]);

  const selectedListing = useMemo(() => {
    return listings.find((l) => l.id === selectedListingId) || listings[0];
  }, [listings, selectedListingId]);

  const fetchRecommendations = async (listing: CropListing) => {
    if (!listing) {
      setMatches([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    setIsDevFallbackActive(false);

    try {
      const resp = await getBuyerRecommendations(listing, buyerRequirements);
      setMatches(resp.results || []);
    } catch (err: any) {
      console.warn('[RecommendedBuyers] FastAPI matching engine unreachable:', err);
      setMatches([]);
      setError('Buyer recommendations are temporarily unavailable. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleActivateDevFallback = () => {
    if (!selectedListing) return;
    const fallbackResp = getDevOfflineFallbackRecommendations(selectedListing, buyerRequirements);
    setMatches(fallbackResp.results || []);
    setIsDevFallbackActive(true);
    setError(null);
  };

  useEffect(() => {
    if (selectedListing) {
      fetchRecommendations(selectedListing);
    } else {
      setIsLoading(false);
      setMatches([]);
    }
  }, [selectedListing, buyerRequirements]);

  const handleJoin = (buyerId: string) => {
    if (!selectedListing) return;
    setJoinedBuyerId(buyerId);
    onJoinPool(buyerId, selectedListing.id);
    confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
    setTimeout(() => {
      onNavigate(5); // Go to Active Orders / Pooled Batches
    }, 1200);
  };

  // ---------------------------------------------------------------------------
  // Empty State 1: No Farmer Listings Exist
  // ---------------------------------------------------------------------------
  if (!listings || listings.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm space-y-4 max-w-2xl mx-auto my-8">
        <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto border border-emerald-200">
          <Sprout className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-extrabold text-slate-900 font-heading">No Produce Listings Available</h2>
        <p className="text-xs text-slate-600 max-w-md mx-auto">
          Create your first crop listing to run algorithmic multi-factor buyer matching and calculate True Net Realization.
        </p>
        <button
          onClick={() => onNavigate(2)}
          className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-bold rounded-xl text-xs hover:from-emerald-500 hover:to-teal-600 transition shadow-lg shadow-emerald-950/20 inline-flex items-center gap-2"
        >
          <span>+ Create crop listing</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  const topMatch = matches[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl p-6 bg-gradient-to-r from-emerald-800 via-teal-900 to-slate-900 border border-emerald-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono mb-1">
            <span className="text-emerald-300 flex items-center gap-1 font-bold">
              <Sparkles className="w-3.5 h-3.5 animate-pulse text-emerald-300" />
              <span>Buyer connections and earnings</span>
            </span>
            {isDevFallbackActive ? (
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-200 border border-amber-400/40 text-[10px] font-semibold">
                Buyer recommendations temporarily unavailable
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 text-[10px] font-semibold">
                AI Matching Engine Active
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold font-heading text-white">
            Ranked Buyer Opportunities
          </h1>
          <p className="text-xs text-emerald-100/90 max-w-xl">
            Ranked by <strong className="text-emerald-300 font-bold">Weighted Match Score (S_match)</strong> and <strong className="text-emerald-300 font-bold">True Net Realization (NR_i)</strong> — factoring out pooled fuel costs, handling overheads, and perishability decay.
          </p>
        </div>

        {/* Listing Selector Dropdown */}
        <div className="flex items-center gap-2 bg-black/30 p-2 rounded-xl border border-emerald-500/30 self-stretch md:self-auto justify-between md:justify-start">
          <span className="text-xs text-emerald-200 pl-1 font-bold">Your Listing:</span>
          <select
            value={selectedListingId}
            onChange={(e) => setSelectedListingId(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-xs rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-emerald-500 font-bold max-w-[220px] truncate"
          >
            {listings.map((l) => (
              <option key={l.id} value={l.id}>
                {l.cropName} ({l.quantityKg} kg) - Asking ₹{l.askingPricePerKg}/kg
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Selected Produce Realization Baseline */}
      {selectedListing && (
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center font-bold text-lg">
              {selectedListing.cropName === 'Tomato' ? '🍅' : selectedListing.cropName === 'Onion' ? '🧅' : selectedListing.cropName === 'Potato' ? '🥔' : '🌱'}
            </div>
            <div>
              <span className="text-slate-500 block text-[11px] font-semibold">Selected Farmer Harvest Lot</span>
              <span className="font-extrabold text-slate-900 text-sm">
                {selectedListing.cropName} ({selectedListing.variety || 'Standard'}) — {selectedListing.quantityKg.toLocaleString()} kg
              </span>
            </div>
          </div>

          <div className="flex items-center gap-6 font-mono">
            <div>
              <span className="text-slate-500 block text-[10px] font-bold">Mandi APMC Net</span>
              <span className="text-slate-800 font-bold">
                ₹{((selectedListing.mandiBenchmarkPrice || 19.0) * 0.86 - 2.2).toFixed(2)}/kg
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] font-bold">AgriLink Highest NR</span>
              <span className="text-emerald-700 font-extrabold text-sm">
                ₹{topMatch ? topMatch.estimated_net_realization_per_kg.toFixed(2) : '—'}/kg
              </span>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px] font-bold">Net Realized Gain</span>
              <span className="text-emerald-700 font-extrabold text-sm">
                {topMatch ? `+${topMatch.profit_gain_percentage}%` : '—'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Mathematical Breakdown Formula Banner */}
      <div className="p-4 rounded-xl bg-slate-900 text-white font-mono text-[11px] flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Calculator className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            <strong className="text-emerald-400 font-sans">Formula:</strong> S_match = 0.30·C_crop + 0.20·S_qty + 0.20·S_price + 0.15·S_dist + 0.10·S_qual + 0.05·S_feas
          </span>
        </div>
        <span className="text-slate-300 whitespace-nowrap text-[10px]">
          Perishability Factor S(D_i): ₹0.05/kg per 50 km
        </span>
      </div>

      {/* Service Unavailable Error Card */}
      {error && (
        <div className="bg-white rounded-2xl p-8 border border-rose-300 shadow-sm space-y-4">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-2xl bg-rose-50 text-rose-700 border border-rose-200 shrink-0">
              <ServerCrash className="w-8 h-8" />
            </div>
            <div className="space-y-1 flex-1">
              <h3 className="text-lg font-bold text-slate-900 font-heading">
                Buyer Matching Service Unavailable
              </h3>
              <p className="text-xs text-slate-700">
                {error}
              </p>
              <p className="text-xs text-slate-500 pt-1">
                Please try again to refresh buyer recommendations.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-200">
            <button
              onClick={() => selectedListing && fetchRecommendations(selectedListing)}
              className="px-4 py-2 bg-emerald-600 text-white font-bold rounded-xl text-xs hover:bg-emerald-500 transition flex items-center gap-2 shadow"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Try again</span>
            </button>

            <button
              onClick={handleActivateDevFallback}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs border border-slate-300 transition flex items-center gap-2"
            >
              <Play className="w-3.5 h-3.5 text-amber-600" />
              <span>Load Offline Demo Dataset (Dev Only)</span>
            </button>
          </div>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-pulse">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-6 border border-slate-200 space-y-4 shadow-sm">
              <div className="flex justify-between">
                <div className="space-y-2">
                  <div className="h-5 bg-slate-200 rounded w-40"></div>
                  <div className="h-3 bg-slate-100 rounded w-28"></div>
                </div>
                <div className="h-7 bg-slate-200 rounded w-16"></div>
              </div>
              <div className="h-16 bg-slate-50 rounded-xl"></div>
              <div className="space-y-2">
                <div className="h-3 bg-slate-200 rounded w-full"></div>
                <div className="h-3 bg-slate-100 rounded w-3/4"></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State 2: No Matching Buyer Requirements */}
      {!isLoading && !error && matches.length === 0 && (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm space-y-3">
          <ShoppingBag className="w-12 h-12 text-slate-400 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">No Open Buyer Requirements Found</h3>
          <p className="text-xs text-slate-600 max-w-md mx-auto">
            No active buyer procurement orders currently match {selectedListing?.cropName}. As corporate buyers and retailers submit requirements, matches will appear here automatically.
          </p>
        </div>
      )}

      {/* Buyer Cards Grid */}
      {!isLoading && matches.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {matches.map((item, index) => {
            const isTopMatch = index === 0;
            const isJoined = joinedBuyerId === item.buyer_requirement_id;

            return (
              <div
                key={item.buyer_requirement_id || index}
                className={`rounded-2xl p-6 border transition-all relative overflow-hidden flex flex-col justify-between bg-white shadow-sm ${isTopMatch
                    ? 'border-emerald-400 ring-2 ring-emerald-500/20 shadow-md'
                    : 'border-slate-200 hover:border-slate-300'
                  }`}
              >
                {isTopMatch && (
                  <div className="absolute top-0 right-0 bg-gradient-to-l from-emerald-600 to-green-600 text-white font-extrabold text-[10px] px-3 py-1 rounded-bl-xl uppercase tracking-wider flex items-center gap-1 shadow">
                    <Award className="w-3 h-3 text-amber-300" /> #1 Best Match & Highest Realization
                  </div>
                )}

                <div>
                  {/* Buyer Title & Type */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-emerald-700 shrink-0" />
                        <h3 className="font-heading font-extrabold text-slate-900 text-base">{item.buyer_name}</h3>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-600">
                        <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-300 font-mono text-[10px] text-slate-700 font-bold">
                          {item.buyer_type}
                        </span>
                        <span className="flex items-center gap-1 text-slate-600">
                          <MapPin className="w-3 h-3 text-slate-500" /> {item.destination_name}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs font-mono text-slate-500 font-bold">Match Score</div>
                      <div className="text-xl font-extrabold text-emerald-700 font-heading">
                        {item.match_percentage}%
                      </div>
                    </div>
                  </div>

                  {/* Net Realization Highlight */}
                  <div className="grid grid-cols-3 gap-2 p-3.5 rounded-xl bg-slate-50 border border-slate-200 mb-4 text-center">
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase font-bold">Gross Offer</span>
                      <span className="text-sm font-bold text-slate-900">₹{item.offer_price_per_kg.toFixed(2)}/kg</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-emerald-800 block uppercase font-extrabold">True Net Realization</span>
                      <span className="text-base font-extrabold text-emerald-700 font-heading">
                        ₹{item.estimated_net_realization_per_kg.toFixed(2)}/kg
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block uppercase font-bold">Profit Gain</span>
                      <span className="text-sm font-extrabold text-emerald-700">+{item.profit_gain_percentage}%</span>
                    </div>
                  </div>

                  {/* Match Factor Breakdown Chips */}
                  <div className="mb-4 p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <span className="text-[10px] uppercase font-bold text-slate-700 tracking-wider block">
                      Factor Breakdown (6-Factor Normalized Engine)
                    </span>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-[10px] font-mono">
                      <div className="p-1.5 rounded bg-white border border-slate-200 shadow-sm">
                        <span className="text-slate-500 block text-[9px] font-bold">Crop (30%)</span>
                        <span className={`font-bold ${item.factor_scores.crop === 1 ? 'text-emerald-700' : 'text-rose-600'}`}>
                          {Math.round(item.factor_scores.crop * 100)}%
                        </span>
                      </div>
                      <div className="p-1.5 rounded bg-white border border-slate-200 shadow-sm">
                        <span className="text-slate-500 block text-[9px] font-bold">Qty (20%)</span>
                        <span className="font-bold text-emerald-700">
                          {Math.round(item.factor_scores.quantity * 100)}%
                        </span>
                      </div>
                      <div className="p-1.5 rounded bg-white border border-slate-200 shadow-sm">
                        <span className="text-slate-500 block text-[9px] font-bold">Price (20%)</span>
                        <span className="font-bold text-emerald-700">
                          {Math.round(item.factor_scores.price * 100)}%
                        </span>
                      </div>
                      <div className="p-1.5 rounded bg-white border border-slate-200 shadow-sm">
                        <span className="text-slate-500 block text-[9px] font-bold">Dist (15%)</span>
                        <span className="font-bold text-blue-700">
                          {item.factor_scores.distance !== null && item.factor_scores.distance !== undefined
                            ? `${Math.round(item.factor_scores.distance * 100)}%`
                            : 'N/A*'}
                        </span>
                      </div>
                      <div className="p-1.5 rounded bg-white border border-slate-200 shadow-sm">
                        <span className="text-slate-500 block text-[9px] font-bold">Qual (10%)</span>
                        <span className="font-bold text-emerald-700">
                          {Math.round(item.factor_scores.quality * 100)}%
                        </span>
                      </div>
                      <div className="p-1.5 rounded bg-white border border-slate-200 shadow-sm">
                        <span className="text-slate-500 block text-[9px] font-bold">Feas (5%)</span>
                        <span className="font-bold text-emerald-700">
                          {Math.round(item.factor_scores.feasibility * 100)}%
                        </span>
                      </div>
                    </div>
                    {item.factor_scores.distance === null && (
                      <div className="text-[10px] text-amber-800 font-mono text-center pt-1 font-medium">
                        * Distance coordinates unverified — weights dynamically renormalized across 5 available factors.
                      </div>
                    )}
                  </div>

                  {/* Formula Parameter Breakdown */}
                  <div className="space-y-1.5 text-[11px] text-slate-700 mb-5 p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Geographic Distance (D_i):</span>
                      <span className="font-mono font-bold text-slate-900">{item.distance_km !== null && item.distance_km !== undefined ? `${item.distance_km} km` : 'Direct Regional'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Pooled Logistics & Handling:</span>
                      <span className="font-mono text-amber-800 font-bold">-₹{((item.transport_cost_per_kg ?? item.fuel_cost_per_kg) + item.handling_cost_per_kg).toFixed(2)}/kg</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Perishability Decay S(D_i):</span>
                      <span className="font-mono text-rose-700 font-bold">-₹{item.perishability_decay_per_kg.toFixed(2)}/kg</span>
                    </div>
                    <div className="pt-1.5 border-t border-slate-200 flex justify-between font-bold">
                      <span className="text-slate-900">Total Net Payout for {selectedListing.quantityKg.toLocaleString()} kg:</span>
                      <span className="font-extrabold text-emerald-700 font-mono text-sm">₹{item.total_net_realization_inr.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-[10px] text-emerald-800 font-bold">
                      <span>Extra Net vs Traditional Mandi:</span>
                      <span className="font-bold font-mono">+₹{item.extra_income_inr.toLocaleString()} extra</span>
                    </div>
                  </div>
                </div>

                {/* Action CTA */}
                <div className="pt-2 border-t border-slate-200">
                  <button
                    disabled={isJoined}
                    onClick={() => handleJoin(item.buyer_requirement_id)}
                    className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition ${isJoined
                        ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 cursor-default'
                        : isTopMatch
                          ? 'bg-gradient-to-r from-emerald-600 to-green-600 text-white hover:from-emerald-500 hover:to-green-500 shadow-md shadow-emerald-950/20'
                          : 'bg-slate-900 hover:bg-slate-800 text-white border border-slate-800'
                      }`}
                  >
                    {isJoined ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-700" />
                        <span>Joined Pool Lot</span>
                      </>
                    ) : (
                      <>
                        <span>Accept & Join Aggregation Pool</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

