import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { UserRole, UserProfile, CropListing, BuyerRequirement, AggregationLot, CVRPRoute, FarmerActiveOrder } from './types';
import {
  MOCK_BUYER_REQUIREMENTS
} from './lib/mockData';
import { aggregateSupplyLots, solveCVRPRoute } from './lib/algorithms';
import { AuthProvider, useAuth } from './context/AuthContext';
import {
  getCropListings,
  getOpenBuyerRequirements,
  createCropListing,
  createBuyerRequirement,
  getMyFarmerAggregatedOrders,
  subscribeToChanges,
} from './services/dbService';
import { isSupabaseConfigured } from './lib/supabase';
import { Navbar } from './components/common/Navbar';
import { AuthModal } from './components/auth/AuthModal';
import { VoiceListingModal } from './components/common/VoiceListingModal';
import { AIAssistantModal } from './components/common/AIAssistantModal';
import { LandingPage } from './components/common/LandingPage';
import { FarmerChatModal } from './components/farmer/FarmerChatModal';

// Farmer Screens (1 to 6)
import { FarmerDashboard } from './components/farmer/FarmerDashboard';
import { VoiceCropListing } from './components/farmer/VoiceCropListing';
import { MarketIntelligence } from './components/farmer/MarketIntelligence';
import { RecommendedBuyers } from './components/farmer/RecommendedBuyers';
import { ActiveOrders } from './components/farmer/ActiveOrders';
import { EarningsRealization } from './components/farmer/EarningsRealization';

// Buyer Screens (7 to 11)
import { BuyerDashboard } from './components/buyer/BuyerDashboard';
import { CreateRequirement } from './components/buyer/CreateRequirement';
import { AvailableProduce } from './components/buyer/AvailableProduce';
import { MatchedSupplyBuilder } from './components/buyer/MatchedSupplyBuilder';
import { BulkOrdersContracts } from './components/buyer/BulkOrdersContracts';

// Logistics Screens (12 to 14)
import { TransporterHub } from './components/logistics/TransporterHub';
import { CVRPRouteMapView } from './components/logistics/CVRPRouteMapView';
import { DeliveryStatusTracker } from './components/logistics/DeliveryStatusTracker';

// DoCA Admin Screen (15)
import { DoCAAdminImpactBoard } from './components/doca/DoCAAdminImpactBoard';

// Static mock data used only for algorithmic screens (10–15) that are Phase 3+
import { MOCK_CROP_LISTINGS } from './lib/mockData';

// Strict Role-Based Access Control (RBAC) Portal & Screen Mapping
export { ROLE_ALLOWED_SCREENS, ROLE_DEFAULT_SCREEN } from './lib/rbac';
import { ROLE_ALLOWED_SCREENS, ROLE_DEFAULT_SCREEN } from './lib/rbac';
import { useLanguage } from './i18n/LanguageContext';


const AgriLinkMain: React.FC = () => {
  const { user, role, profile, profileError, enableDemoPersonas, isAuthModalOpen, setIsAuthModalOpen, signOut } = useAuth();
  const [activeScreen, setActiveScreen] = useState<number>(() => (role ? ROLE_DEFAULT_SCREEN[role] : 1));
  const { language, setLanguage, hasSavedPreference, t } = useLanguage();

  // Modals state
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState<boolean>(false);
  const [isAICopilotOpen, setIsAICopilotOpen] = useState<boolean>(false);
  const [isFarmerChatOpen, setIsFarmerChatOpen] = useState<boolean>(false);

  // -------------------------------------------------------------------------
  // Real Supabase data state — Phase 2
  // Empty arrays = no data (not mock data fallback)
  // -------------------------------------------------------------------------
  const [listings, setListings] = useState<CropListing[]>([]);
  const [buyerRequirements, setBuyerRequirements] = useState<BuyerRequirement[]>([]);
  const [farmerOrders, setFarmerOrders] = useState<FarmerActiveOrder[]>([]);
  const [isListingsLoading, setIsListingsLoading] = useState<boolean>(true);
  const [isRequirementsLoading, setIsRequirementsLoading] = useState<boolean>(true);
  const [isFarmerOrdersLoading, setIsFarmerOrdersLoading] = useState<boolean>(true);
  const [dataError, setDataError] = useState<string | null>(null);

  // -------------------------------------------------------------------------
  // Fetch from Supabase — no mock fallback
  // -------------------------------------------------------------------------
  const loadListings = useCallback(async () => {
    setIsListingsLoading(true);
    setDataError(null);
    try {
      if (isSupabaseConfigured) {
        const data = await getCropListings();
        setListings(data);
      } else {
        console.info('[AgriLink] Supabase not configured — showing demo listings for UI preview.');
        setListings(MOCK_CROP_LISTINGS);
      }
    } catch (err: any) {
      console.error('[AgriLink] Failed to load crop listings:', err);
      setDataError('Could not load crop listings. Please try again.');
    } finally {
      setIsListingsLoading(false);
    }
  }, []);

  const loadRequirements = useCallback(async () => {
    setIsRequirementsLoading(true);
    try {
      if (isSupabaseConfigured) {
        const data = await getOpenBuyerRequirements();
        setBuyerRequirements(data);
      } else {
        console.info('[AgriLink] Supabase not configured — showing demo requirements for UI preview.');
        setBuyerRequirements(MOCK_BUYER_REQUIREMENTS);
      }
    } catch (err: any) {
      console.error('[AgriLink] Failed to load buyer requirements:', err);
    } finally {
      setIsRequirementsLoading(false);
    }
  }, []);

  const loadFarmerOrders = useCallback(async () => {
    setIsFarmerOrdersLoading(true);
    try {
      if (isSupabaseConfigured && user) {
        const data = await getMyFarmerAggregatedOrders();
        setFarmerOrders(data);
      } else {
        setFarmerOrders([]);
      }
    } catch (err: any) {
      console.error('[AgriLink] Failed to load farmer active orders:', err);
      setFarmerOrders([]);
    } finally {
      setIsFarmerOrdersLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadListings();
    loadRequirements();
    loadFarmerOrders();

    if (!isSupabaseConfigured) return;

    // Supabase Realtime Channel Listeners
    const sub1 = subscribeToChanges('crop_inventory', () => {
      loadListings();
      loadFarmerOrders();
    });
    const sub2 = subscribeToChanges('buyer_requirements', () => {
      loadRequirements();
    });
    const sub3 = subscribeToChanges('aggregated_orders', () => {
      loadFarmerOrders();
    });
    const sub4 = subscribeToChanges('aggregated_order_items', () => {
      loadFarmerOrders();
    });
    const sub5 = subscribeToChanges('logistics_routes', () => {
      loadFarmerOrders();
    });

    return () => {
      sub1.unsubscribe();
      sub2.unsubscribe();
      sub3.unsubscribe();
      sub4.unsubscribe();
      sub5.unsubscribe();
    };
  }, [loadListings, loadRequirements, loadFarmerOrders]);

  // Guarded screen navigation (RBAC Enforcement)
  const handleNavigate = useCallback((targetScreen: number) => {
    if (!role || !ROLE_ALLOWED_SCREENS[role]) {
      console.warn(`[AgriLink RBAC] Navigation blocked: No valid platform role assigned.`);
      return;
    }
    const allowed = ROLE_ALLOWED_SCREENS[role];
    if (allowed.includes(targetScreen)) {
      setActiveScreen(targetScreen);
    } else {
      console.warn(`[AgriLink RBAC] Screen ${targetScreen} is unauthorized for role '${role}'. Redirecting to default portal screen.`);
      setActiveScreen(ROLE_DEFAULT_SCREEN[role] || 1);
    }
  }, [role]);

  // Synchronize and strictly guard activeScreen whenever role or activeScreen changes
  useEffect(() => {
    if (!role || !ROLE_ALLOWED_SCREENS[role]) {
      return;
    }
    const allowed = ROLE_ALLOWED_SCREENS[role];
    if (!allowed.includes(activeScreen)) {
      setActiveScreen(ROLE_DEFAULT_SCREEN[role] || 1);
    }
  }, [role, activeScreen]);

  // -------------------------------------------------------------------------
  // Algorithmic engines (Phase 3+) — still use in-memory data
  // These run on whatever listings/requirements are available (real or empty)
  // -------------------------------------------------------------------------
  const initialLot: AggregationLot = useMemo(() => {
    const req = buyerRequirements[0] ?? MOCK_BUYER_REQUIREMENTS[0];
    const lot = aggregateSupplyLots(req, listings.length > 0 ? listings : MOCK_CROP_LISTINGS, 25);
    return (
      lot || {
        id: 'LOT-MH-TM-01',
        requirementId: req.id,
        targetQuantityKg: req.requiredQuantityKg,
        aggregatedQuantityKg: 1500,
        cropName: 'Tomato',
        qualityGrade: 'Grade A' as const,
        hubLocation: {
          name: 'Nashik Central Agritech Hub',
          lat: 20.08,
          lng: 73.83,
        },
        participatingFarmers: [
          { listingId: 'LIST-TM-01', farmerName: 'Rameshwar Patil', farmerId: 'usr-farmer-01', quantityKg: 650, distanceToHubKm: 12.4, lat: 20.1704, lng: 73.9859 },
          { listingId: 'LIST-TM-02', farmerName: 'Sunita Tukaram Shinde', farmerId: 'usr-farmer-02', quantityKg: 450, distanceToHubKm: 14.8, lat: 20.201, lng: 73.834 },
          { listingId: 'LIST-TM-03', farmerName: 'Dattatray G. Deshmukh', farmerId: 'usr-farmer-03', quantityKg: 400, distanceToHubKm: 18.2, lat: 19.982, lng: 73.684 },
        ],
        avgPricePerKg: 24.1,
        status: 'confirmed' as const,
        clusterRadiusKm: 25,
        createdAt: new Date().toISOString(),
      }
    );
  }, [buyerRequirements, listings]);

  const [activeLots, setActiveLots] = useState<AggregationLot[]>([initialLot]);

  const cvrpRoute = useMemo(() => {
    const lot = activeLots[0] || initialLot;
    const req = buyerRequirements[0] ?? MOCK_BUYER_REQUIREMENTS[0];
    return solveCVRPRoute(lot, req, {
      id: 'usr-transporter-01',
      name: 'MahaKisan Logistics Express',
      vehicleType: 'Eicher Pro 2049 (2.5T)',
      capacityKg: 2500,
    });
  }, [activeLots, initialLot, buyerRequirements]);

  // Current Farmer Profile from AuthContext (null-safe)
  const currentFarmer: UserProfile = profile || {
    id: user?.id || 'usr-unassigned',
    fullName: user?.email || 'Authenticated User',
    phone: '',
    role: (role as UserRole) || 'farmer',
    district: 'Nashik',
    state: 'Maharashtra',
    latitude: 20.0059,
    longitude: 73.7898,
    rating: 5.0,
    verified: false,
  };

  // -------------------------------------------------------------------------
  // Actions — Phase 2: write to Supabase, refresh from Supabase
  // -------------------------------------------------------------------------
  const handleAddListing = async (newListing: CropListing) => {
    setListings((prev) => [newListing, ...prev]);

    if (isSupabaseConfigured && user) {
      try {
        await loadListings();
      } catch (err) {
        console.error('[AgriLink] Failed to refresh listings after insert:', err);
      }
    }
  };

  const handleAddRequirement = async (newReq: BuyerRequirement) => {
    setBuyerRequirements((prev) => [newReq, ...prev]);

    if (isSupabaseConfigured && user) {
      try {
        await loadRequirements();
      } catch (err) {
        console.error('[AgriLink] Failed to refresh requirements after insert:', err);
      }
    }
  };

  const handleConfirmLot = (newLot: AggregationLot) => {
    setActiveLots((prev) => [newLot, ...prev.filter((l) => l.id !== newLot.id)]);
  };

  const handleJoinPool = (buyerId: string, listingId: string) => {
    setListings((prev) =>
      prev.map((l) => (l.id === listingId ? { ...l, status: 'aggregating' } : l))
    );
  };

  const isRoleValid = role && Boolean(ROLE_ALLOWED_SCREENS[role]);

  return (
    <div className="min-h-screen bg-[#f7faf6] text-[#183126] flex flex-col selection:bg-emerald-200 selection:text-[#183126]">
      {!user && !role ? (
        <LandingPage onSignIn={() => setIsAuthModalOpen(true)} />
      ) : (
        <>
          {/* Main Screen Content */}
          <div className="flex-1 lg:flex">
            <Navbar
              currentRole={role}
              setRole={() => { }}
              activeScreen={activeScreen}
              setActiveScreen={handleNavigate}
              onOpenVoiceModal={() => setIsVoiceModalOpen(true)}
              onOpenAICopilot={() => setIsAICopilotOpen(true)}
              onOpenFarmerChat={() => setIsFarmerChatOpen(true)}
              language={language}
              setLanguage={setLanguage}
            />
            <main className="portal-content flex-1 min-w-0 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:pt-24">
              {/* State 1: Authenticated session but missing/invalid profile */}
              {user && (!profile || !isRoleValid) && (
                <div className="glass-card rounded-2xl p-8 border border-amber-200 text-center max-w-lg mx-auto my-12 space-y-4 shadow-xl bg-white">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 mx-auto flex items-center justify-center font-bold text-2xl border border-amber-500/30">
                    ⚠️
                  </div>

                  <h2 className="text-xl font-bold font-heading text-[#193326]">Account Setup Incomplete</h2>
                  <p className="text-xs text-[#647a68] leading-relaxed">
                    We couldn't finish setting up your workspace for <span className="font-semibold text-amber-700">{user.email || user.id}</span>.
                  </p>
                  {profileError && (
                    <p className="text-[11px] text-rose-400 bg-rose-950/30 border border-rose-500/30 p-2.5 rounded-xl font-mono">
                      {profileError}
                    </p>
                  )}
                  <p className="text-[11px] text-[#647a68]">
                    To access AgriLink portals, a verified profile role (Farmer, Buyer, Transporter, or DoCA Admin) must be provisioned in the database.
                  </p>
                  <div className="pt-2 flex gap-3 justify-center">
                    <button
                      onClick={() => signOut()}
                      className="px-5 py-2.5 rounded-xl bg-white hover:bg-[#f1f7f1] text-[#376343] font-semibold text-xs border border-[#cfe0d0] transition"
                    >
                      Sign Out
                    </button>
                    <button
                      onClick={() => window.location.reload()}
                      className="px-5 py-2.5 rounded-xl bg-brand-600 text-white font-bold text-xs hover:bg-brand-700 transition"
                    >
                      Retry Loading Profile
                    </button>
                  </div>
                </div>
              )}

              {/* State 2: Not authenticated and no active role (Demo personas disabled) */}
              {!user && !role && (
                <div className="glass-card rounded-2xl p-8 border border-[#dce8dd] text-center max-w-lg mx-auto my-12 space-y-4 shadow-xl bg-white">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center font-bold text-2xl border border-emerald-500/30">
                    🌾
                  </div>
                  <h2 className="text-2xl font-bold font-heading text-[#193326]">Welcome to AgriLink AI</h2>
                  <p className="text-xs text-[#647a68] leading-relaxed">
                    A simpler way for Indian farmers and buyers to connect, trade, and arrange delivery.
                  </p>
                  <p className="text-[11px] text-[#647a68]">
                    Please sign in with your verified credentials to access your designated Farmgate, Buyer, Transporter, or Policy Portal.
                  </p>
                  <div className="pt-2 flex justify-center">
                    <button
                      onClick={() => setIsAuthModalOpen(true)}
                      className="px-6 py-3 rounded-xl bg-brand-600 text-white font-bold text-xs hover:bg-brand-700 transition shadow-sm"
                    >
                      Sign In / Register Role
                    </button>
                  </div>
                </div>
              )}

              {/* State 3: Valid role assigned - Render authorized portal screens */}
              {role && isRoleValid && (
                <>
                  {/* Guard: If activeScreen is not in role's allowed screens */}
                  {!ROLE_ALLOWED_SCREENS[role].includes(activeScreen) && (
                    <div className="glass-card rounded-2xl p-8 border border-rose-200 text-center max-w-lg mx-auto my-12 space-y-4">
                      <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 mx-auto flex items-center justify-center font-bold text-xl">
                        🚫
                      </div>
                      <h2 className="text-xl font-bold font-heading text-[#193326]">Workspace section unavailable</h2>
                      <p className="text-xs text-[#647a68] leading-relaxed">
                        This workspace section isn't available for your account.
                      </p>
                      <button
                        onClick={() => handleNavigate(ROLE_DEFAULT_SCREEN[role] || 1)}
                        className="px-5 py-2.5 rounded-xl bg-brand-600 text-white font-bold text-xs hover:bg-brand-700 transition shadow-sm"
                      >
                        Return to Authorized Portal
                      </button>
                    </div>
                  )}

                  {/* Screen 1: Farmer Dashboard */}
                  {activeScreen === 1 && (ROLE_ALLOWED_SCREENS[role] || []).includes(1) && (
                    <FarmerDashboard
                      farmer={currentFarmer}
                      listings={listings}
                      isLoading={isListingsLoading}
                      onNavigate={handleNavigate}
                      onOpenVoiceModal={() => setIsVoiceModalOpen(true)}
                    />
                  )}

                  {/* Screen 2: Voice Crop Listing */}
                  {activeScreen === 2 && (ROLE_ALLOWED_SCREENS[role] || []).includes(2) && (
                    <VoiceCropListing
                      onAddListing={handleAddListing}
                      onOpenVoiceModal={() => setIsVoiceModalOpen(true)}
                      onNavigate={handleNavigate}
                    />
                  )}

                  {/* Screen 3: Market Intelligence & 7-Day Forecast */}
                  {activeScreen === 3 && (ROLE_ALLOWED_SCREENS[role] || []).includes(3) && (
                    <MarketIntelligence listings={listings} farmer={currentFarmer} />
                  )}

                  {/* Screen 4: Recommended Buyers & Net Realization */}
                  {activeScreen === 4 && (ROLE_ALLOWED_SCREENS[role] || []).includes(4) && (
                    <RecommendedBuyers
                      listings={listings}
                      buyerRequirements={buyerRequirements}
                      onNavigate={handleNavigate}
                      onJoinPool={handleJoinPool}
                    />
                  )}

                  {/* Screen 5: Active Orders & Micro-Cluster Batch Tracker */}
                  {activeScreen === 5 && (ROLE_ALLOWED_SCREENS[role] || []).includes(5) && (
                    <ActiveOrders
                      farmerOrders={farmerOrders}
                      isLoading={isFarmerOrdersLoading}
                      onNavigate={handleNavigate}
                    />
                  )}

                  {/* Screen 6: Earnings Realization vs Mandi Baseline */}
                  {activeScreen === 6 && (ROLE_ALLOWED_SCREENS[role] || []).includes(6) && <EarningsRealization />}

                  {/* Screen 7: Buyer Dashboard */}
                  {activeScreen === 7 && (ROLE_ALLOWED_SCREENS[role] || []).includes(7) && (
                    <BuyerDashboard
                      requirements={buyerRequirements}
                      aggregationLots={activeLots}
                      isLoading={isRequirementsLoading}
                      onNavigate={handleNavigate}
                    />
                  )}

                  {/* Screen 8: Create Bulk Requirement */}
                  {activeScreen === 8 && (ROLE_ALLOWED_SCREENS[role] || []).includes(8) && (
                    <CreateRequirement
                      onAddRequirement={handleAddRequirement}
                      onNavigate={handleNavigate}
                    />
                  )}

                  {/* Screen 9: Available Farmgate Produce Explorer */}
                  {activeScreen === 9 && (ROLE_ALLOWED_SCREENS[role] || []).includes(9) && (
                    <AvailableProduce
                      listings={listings}
                      isLoading={isListingsLoading}
                      onNavigate={handleNavigate}
                    />
                  )}

                  {/* Screen 10: Matched Supply & Knapsack Lot Builder */}
                  {activeScreen === 10 && (ROLE_ALLOWED_SCREENS[role] || []).includes(10) && (
                    <MatchedSupplyBuilder
                      requirements={buyerRequirements}
                      listings={listings}
                      onConfirmLot={handleConfirmLot}
                      onNavigate={handleNavigate}
                    />
                  )}

                  {/* Screen 11: Bulk Orders & Smart Contracts */}
                  {activeScreen === 11 && (ROLE_ALLOWED_SCREENS[role] || []).includes(11) && (
                    <BulkOrdersContracts
                      lot={activeLots[0] || initialLot}
                      requirement={buyerRequirements[0] ?? MOCK_BUYER_REQUIREMENTS[0]}
                      onNavigate={handleNavigate}
                    />
                  )}

                  {/* Screen 12: Transporter Hub */}
                  {activeScreen === 12 && (ROLE_ALLOWED_SCREENS[role] || []).includes(12) && (
                    <TransporterHub
                      cvrpRoute={cvrpRoute}
                      onNavigate={handleNavigate}
                    />
                  )}

                  {/* Screen 13: CVRP Interactive Route Map */}
                  {activeScreen === 13 && (ROLE_ALLOWED_SCREENS[role] || []).includes(13) && (
                    <CVRPRouteMapView
                      cvrpRoute={cvrpRoute}
                      onNavigate={handleNavigate}
                    />
                  )}

                  {/* Screen 14: Delivery Telemetry & e-PoD Status */}
                  {activeScreen === 14 && (ROLE_ALLOWED_SCREENS[role] || []).includes(14) && (
                    <DeliveryStatusTracker
                      cvrpRoute={cvrpRoute}
                      onNavigate={handleNavigate}
                    />
                  )}

                  {/* Screen 15: DoCA Admin Impact & Price Stabilization Board */}
                  {activeScreen === 15 && (ROLE_ALLOWED_SCREENS[role] || []).includes(15) && <DoCAAdminImpactBoard />}
                </>
              )}
            </main>
          </div>

          {user && !hasSavedPreference && (
            <div className="fixed bottom-4 right-4 z-40 max-w-sm rounded-2xl border border-[#cfe0d0] bg-white p-4 shadow-xl">
              <p className="text-sm font-bold text-[#183126]">{t('common.chooseLanguage')}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {(['en', 'hi', 'mr'] as const).map((option) => (
                  <button key={option} type="button" onClick={() => setLanguage(option)} className="rounded-lg border border-[#cfe0d0] px-3 py-2 text-xs font-semibold text-[#376343] hover:bg-[#f1f7f1]">
                    {option === 'en' ? t('common.english') : option === 'hi' ? t('common.hindi') : t('common.marathi')}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <footer className="border-t border-[#e1ebe1] bg-white py-6 text-xs text-[#769078] text-center">
            <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#376343]">AgriLink AI</span>
                <span>• Better connections for agriculture</span>
              </div>
              <div className="text-slate-400">
                Trusted tools for farmers, buyers and logistics partners
              </div>
              <div className="font-mono text-emerald-400 text-[11px]">
                Your workspace is up to date
              </div>
            </div>
          </footer>

          {/* Voice Listing Modal */}
          <VoiceListingModal
            isOpen={isVoiceModalOpen}
            onClose={() => setIsVoiceModalOpen(false)}
            onAddListing={handleAddListing}
          />

          {/* Grounded Gemini AI Decision Copilot Modal */}
          <AIAssistantModal
            isOpen={isAICopilotOpen}
            onClose={() => setIsAICopilotOpen(false)}
            cropContext={listings[0]?.cropName || 'Tomato'}
            mandiPrice={listings[0]?.mandiBenchmarkPrice || 19.0}
            highestNetRealization={27.35}
          />

          {/* Peer-to-Peer Farmer Community Chat Modal */}
          <FarmerChatModal
            isOpen={isFarmerChatOpen}
            onClose={() => setIsFarmerChatOpen(false)}
          />
        </>
      )}

      {/* Auth & RBAC Modal is shared by the public landing page and app shell. */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AgriLinkMain />
    </AuthProvider>
  );
};

export default App;
