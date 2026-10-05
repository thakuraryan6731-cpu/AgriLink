import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  Sparkles,
  Users,
  DollarSign,
  Truck,
  Layers,
  ArrowUpRight,
  TrendingDown,
  Building2,
  FileSpreadsheet,
  CheckCircle2,
  Package,
  Activity,
  MapPin,
  ExternalLink,
  Navigation,
  RefreshCw,
  Phone,
  Mail,
  UserCheck,
  Calendar,
  XCircle,
  Search,
  Eye,
  X,
  Clock,
  ChevronRight,
  Scale
} from 'lucide-react';
import {
  getAdminFarmers,
  getAdminFpoAdmins,
  getAdminBulkBuyers,
  getAdminConsumerGroups,
  getAdminTransporters,
  getAdminUserCounts,
  getAdminTransactions,
  getAdminTransactionDetail,
  getAdminLogisticsRoutes,
  getAdminMacroStats
} from '../../services/adminService';
import {
  AdminFarmerUser,
  AdminFpoUser,
  AdminBuyerUser,
  AdminTransporterUser,
  AdminUserCounts,
  AdminTransactionRecord,
  AdminTransactionDetail,
  AdminLogisticsRouteRecord,
  AdminMacroStats
} from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';

export const DoCAAdminImpactBoard: React.FC = () => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<
    'overview' | 'farmers' | 'fpos' | 'buyers' | 'consumer_groups' | 'transporters' | 'transactions' | 'logistics'
  >('overview');

  const [searchQuery, setSearchQuery] = useState<string>('');

  const [farmers, setFarmers] = useState<AdminFarmerUser[]>([]);
  const [fpos, setFpos] = useState<AdminFpoUser[]>([]);
  const [bulkBuyers, setBulkBuyers] = useState<AdminBuyerUser[]>([]);
  const [consumerGroups, setConsumerGroups] = useState<AdminBuyerUser[]>([]);
  const [transporters, setTransporters] = useState<AdminTransporterUser[]>([]);
  const [userCounts, setUserCounts] = useState<AdminUserCounts>({
    farmers: 0,
    fpoAdmins: 0,
    bulkBuyers: 0,
    consumerGroups: 0,
    transporters: 0,
    totalUsers: 0,
  });
  const [transactions, setTransactions] = useState<AdminTransactionRecord[]>([]);
  const [routes, setRoutes] = useState<AdminLogisticsRouteRecord[]>([]);
  const [macroStats, setMacroStats] = useState<AdminMacroStats>({
    totalFarmers: 0,
    totalFpoAdmins: 0,
    totalBulkBuyers: 0,
    totalConsumerGroups: 0,
    totalTransporters: 0,
    totalListingsKg: 0,
    totalActiveRequirements: 0,
    totalAggregatedOrders: 0,
    totalCompletedOrders: 0,
    totalQuantityTradedKg: 0,
    totalTransactionsValue: 0,
  });

  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null);
  const [selectedTxDetail, setSelectedTxDetail] = useState<AdminTransactionDetail | null>(null);
  const [isLoadingTxDetail, setIsLoadingTxDetail] = useState<boolean>(false);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadAllAdminData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [
        farmersData,
        fposData,
        buyersData,
        consumerData,
        transportersData,
        countsData,
        txsData,
        routesData,
        statsData
      ] = await Promise.all([
        getAdminFarmers(),
        getAdminFpoAdmins(),
        getAdminBulkBuyers(),
        getAdminConsumerGroups(),
        getAdminTransporters(),
        getAdminUserCounts(),
        getAdminTransactions(),
        getAdminLogisticsRoutes(),
        getAdminMacroStats(),
      ]);

      setFarmers(farmersData);
      setFpos(fposData);
      setBulkBuyers(buyersData);
      setConsumerGroups(consumerData);
      setTransporters(transportersData);
      setUserCounts(countsData);
      setTransactions(txsData);
      setRoutes(routesData);
      setMacroStats(statsData);
    } catch (err: any) {
      console.error('[DoCA Admin] Error loading platform oversight data:', err);
      setError('Unable to load administrative data from database. Please check connection and retry.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllAdminData();
  }, [loadAllAdminData]);

  const handleSelectTransaction = async (orderId: string) => {
    setSelectedTransactionId(orderId);
    setIsLoadingTxDetail(true);
    try {
      const detail = await getAdminTransactionDetail(orderId);
      setSelectedTxDetail(detail);
    } catch (err) {
      console.warn('[DoCA Admin] Error fetching transaction detail:', err);
    } finally {
      setIsLoadingTxDetail(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Filtered Datasets for Search
  // ---------------------------------------------------------------------------
  const q = searchQuery.toLowerCase().trim();

  const filteredFarmers = useMemo(() => {
    if (!q) return farmers;
    return farmers.filter((f) =>
      f.fullName.toLowerCase().includes(q) ||
      (f.email && f.email.toLowerCase().includes(q)) ||
      (f.phone && f.phone.includes(q)) ||
      (f.fpoName && f.fpoName.toLowerCase().includes(q)) ||
      f.district.toLowerCase().includes(q) ||
      f.state.toLowerCase().includes(q)
    );
  }, [farmers, q]);

  const filteredFpos = useMemo(() => {
    if (!q) return fpos;
    return fpos.filter((f) =>
      f.fullName.toLowerCase().includes(q) ||
      f.fpoName.toLowerCase().includes(q) ||
      (f.email && f.email.toLowerCase().includes(q)) ||
      (f.phone && f.phone.includes(q)) ||
      f.district.toLowerCase().includes(q) ||
      f.state.toLowerCase().includes(q)
    );
  }, [fpos, q]);

  const filteredBulkBuyers = useMemo(() => {
    if (!q) return bulkBuyers;
    return bulkBuyers.filter((b) =>
      b.companyName.toLowerCase().includes(q) ||
      b.contactPerson.toLowerCase().includes(q) ||
      (b.email && b.email.toLowerCase().includes(q)) ||
      (b.phone && b.phone.includes(q)) ||
      b.district.toLowerCase().includes(q) ||
      b.state.toLowerCase().includes(q)
    );
  }, [bulkBuyers, q]);

  const filteredConsumerGroups = useMemo(() => {
    if (!q) return consumerGroups;
    return consumerGroups.filter((c) =>
      c.companyName.toLowerCase().includes(q) ||
      c.contactPerson.toLowerCase().includes(q) ||
      (c.email && c.email.toLowerCase().includes(q)) ||
      (c.phone && c.phone.includes(q)) ||
      c.district.toLowerCase().includes(q) ||
      c.state.toLowerCase().includes(q)
    );
  }, [consumerGroups, q]);

  const filteredTransporters = useMemo(() => {
    if (!q) return transporters;
    return transporters.filter((t) =>
      t.fullName.toLowerCase().includes(q) ||
      (t.vehicleNumber && t.vehicleNumber.toLowerCase().includes(q)) ||
      (t.email && t.email.toLowerCase().includes(q)) ||
      (t.phone && t.phone.includes(q)) ||
      t.district.toLowerCase().includes(q) ||
      t.state.toLowerCase().includes(q)
    );
  }, [transporters, q]);

  const filteredTransactions = useMemo(() => {
    if (!q) return transactions;
    return transactions.filter((t) =>
      t.orderCode.toLowerCase().includes(q) ||
      t.cropName.toLowerCase().includes(q) ||
      (t.variety && t.variety.toLowerCase().includes(q)) ||
      (t.buyer && t.buyer.companyName.toLowerCase().includes(q)) ||
      (t.logistics && t.logistics.routeCode && t.logistics.routeCode.toLowerCase().includes(q)) ||
      t.farmers.some((f) => f.fullName.toLowerCase().includes(q))
    );
  }, [transactions, q]);

  const filteredRoutes = useMemo(() => {
    if (!q) return routes;
    return routes.filter((r) =>
      r.routeCode.toLowerCase().includes(q) ||
      r.transporterName.toLowerCase().includes(q) ||
      r.vehicleNumber.toLowerCase().includes(q) ||
      r.destinationName.toLowerCase().includes(q)
    );
  }, [routes, q]);

  return (
    <div className="space-y-6">
      {/* Policy Governance Banner */}
      <div className="rounded-2xl p-6 md:p-8 bg-gradient-to-r from-emerald-800 via-teal-900 to-slate-900 border border-emerald-500/30 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Department of Consumer Affairs (DoCA) Oversight
              </span>
              <span className="text-xs text-emerald-100 font-mono">Real Supabase Telemetry</span>
            </div>

            <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              National Agricultural Market Oversight & Impact Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100/90 mt-1 max-w-2xl">
              Auditing agricultural supply chains, verified producers, enterprise buyers, logistics fleet, and transaction contracts.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-4 rounded-xl bg-black/30 border border-emerald-500/30 text-right">
              <span className="text-[10px] text-emerald-200 font-mono uppercase tracking-wider block font-bold">
                Direct Producer Trade Executed
              </span>
              <span className="text-2xl sm:text-3xl font-extrabold text-emerald-300 font-heading">
                ₹{macroStats.totalTransactionsValue.toLocaleString()}
              </span>
              <span className="text-[11px] text-emerald-100 block mt-0.5">
                Across {macroStats.totalAggregatedOrders} verified contracts
              </span>
            </div>
            <button
              onClick={loadAllAdminData}
              title="Refresh Live Data"
              className="p-3 rounded-xl bg-emerald-700/50 hover:bg-emerald-600 text-white border border-emerald-400/40 transition shadow-md"
            >
              <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <span>{error}</span>
          </div>
          <button onClick={loadAllAdminData} className="px-3 py-1 bg-red-600 text-white rounded-lg font-bold text-xs">
            Retry
          </button>
        </div>
      )}

      {/* Navigation Tabs & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
              activeTab === 'overview'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Executive Summary
          </button>
          <button
            onClick={() => setActiveTab('farmers')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'farmers'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Farmers</span>
            <span className="px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
              {userCounts.farmers}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('fpos')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'fpos'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>FPO Admins</span>
            <span className="px-1.5 py-0.2 rounded-full bg-teal-100 text-teal-800 text-[10px] font-bold">
              {userCounts.fpoAdmins}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('buyers')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'buyers'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Bulk Buyers</span>
            <span className="px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold">
              {userCounts.bulkBuyers}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('consumer_groups')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'consumer_groups'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Consumer Hubs</span>
            <span className="px-1.5 py-0.2 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-bold">
              {userCounts.consumerGroups}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('transporters')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'transporters'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Transporters</span>
            <span className="px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold">
              {userCounts.transporters}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'transactions'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Transactions</span>
            <span className="px-1.5 py-0.2 rounded-full bg-purple-100 text-purple-800 text-[10px] font-bold">
              {transactions.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('logistics')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              activeTab === 'logistics'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>Fleet Routes</span>
            <span className="px-1.5 py-0.2 rounded-full bg-cyan-100 text-cyan-800 text-[10px] font-bold">
              {routes.length}
            </span>
          </button>
        </div>

        {/* Global Tab Search Input */}
        {activeTab !== 'overview' && (
          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder={`Search ${activeTab}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 shadow-sm"
            />
          </div>
        )}
      </div>

      {isLoading && (
        <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-700 font-mono uppercase tracking-wider">
            Loading administrative data from Supabase...
          </p>
        </div>
      )}

      {/* TAB 1: EXECUTIVE SUMMARY */}
      {!isLoading && activeTab === 'overview' && (
        <div className="space-y-6">
          {/* User Distribution KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-sm text-center">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">Farmers</span>
              <span className="text-xl font-extrabold text-slate-900 font-mono">{userCounts.farmers}</span>
              <span className="text-[10px] text-emerald-700 font-bold block mt-0.5">Real Accounts</span>
            </div>
            <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-sm text-center">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">FPO Admins</span>
              <span className="text-xl font-extrabold text-slate-900 font-mono">{userCounts.fpoAdmins}</span>
              <span className="text-[10px] text-teal-700 font-bold block mt-0.5">Producer Orgs</span>
            </div>
            <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-sm text-center">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">Bulk Buyers</span>
              <span className="text-xl font-extrabold text-slate-900 font-mono">{userCounts.bulkBuyers}</span>
              <span className="text-[10px] text-blue-700 font-bold block mt-0.5">Enterprise Retail</span>
            </div>
            <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-sm text-center">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">Consumer Hubs</span>
              <span className="text-xl font-extrabold text-slate-900 font-mono">{userCounts.consumerGroups}</span>
              <span className="text-[10px] text-indigo-700 font-bold block mt-0.5">Cooperatives</span>
            </div>
            <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-sm text-center">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">Transporters</span>
              <span className="text-xl font-extrabold text-slate-900 font-mono">{userCounts.transporters}</span>
              <span className="text-[10px] text-amber-700 font-bold block mt-0.5">Fleet Partners</span>
            </div>
            <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-sm text-center">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-bold">Trade Value</span>
              <span className="text-xl font-extrabold text-emerald-700 font-mono">
                ₹{(macroStats.totalTransactionsValue / 100000).toFixed(1)}L
              </span>
              <span className="text-[10px] text-slate-500 font-bold block mt-0.5">Settled Farmgate</span>
            </div>
          </div>

          {/* Core Oversight Info Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-emerald-700">
                <span className="text-xs font-bold uppercase tracking-wider">Producer Base</span>
                <Users className="w-4 h-4" />
              </div>
              <div className="text-2xl font-bold text-slate-900 font-heading">
                {userCounts.farmers + userCounts.fpoAdmins} Producer Entities
              </div>
              <p className="text-xs text-slate-600">
                {userCounts.farmers} direct growers and {userCounts.fpoAdmins} registered FPOs aggregating produce in local hubs.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-blue-700">
                <span className="text-xs font-bold uppercase tracking-wider">Commercial Procurement</span>
                <Building2 className="w-4 h-4" />
              </div>
              <div className="text-2xl font-bold text-slate-900 font-heading">
                {userCounts.bulkBuyers + userCounts.consumerGroups} Verified Buyers
              </div>
              <p className="text-xs text-slate-600">
                {userCounts.bulkBuyers} enterprise buyers and {userCounts.consumerGroups} residential consumer buying groups.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-amber-700">
                <span className="text-xs font-bold uppercase tracking-wider">Logistics & Supply</span>
                <Truck className="w-4 h-4" />
              </div>
              <div className="text-2xl font-bold text-slate-900 font-heading">
                {userCounts.transporters} Fleet Partners
              </div>
              <p className="text-xs text-slate-600">
                {routes.length} active milk-run routes optimizing multi-farm aggregation.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: FARMERS */}
      {!isLoading && activeTab === 'farmers' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Registered Farmers</h3>
              <p className="text-xs text-slate-600">Real verified producers registered in Supabase public.profiles (role = 'farmer')</p>
            </div>
            <span className="text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1 rounded-full font-mono font-bold">
              {filteredFarmers.length} of {farmers.length} Farmers
            </span>
          </div>

          {filteredFarmers.length === 0 ? (
            <div className="text-center py-12 text-slate-400 space-y-2">
              <Users className="w-10 h-10 mx-auto text-slate-300" />
              <p className="text-sm font-bold text-slate-700">No farmers registered yet.</p>
              <p className="text-xs text-slate-500">Farmers will appear here automatically when they register on AgriLink AI.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-3 font-bold">Farmer Name</th>
                    <th className="p-3 font-bold">Phone Number</th>
                    <th className="p-3 font-bold">Email</th>
                    <th className="p-3 font-bold">Location</th>
                    <th className="p-3 font-bold">FPO Affiliation</th>
                    <th className="p-3 font-bold">Listings</th>
                    <th className="p-3 font-bold">Total Volume (kg)</th>
                    <th className="p-3 font-bold">Verification</th>
                    <th className="p-3 font-bold">Registered</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredFarmers.map((f) => (
                    <tr key={f.id} className="hover:bg-slate-50 transition">
                      <td className="p-3 font-bold text-slate-900">{f.fullName}</td>
                      <td className="p-3 font-mono text-slate-700">{f.phone || '—'}</td>
                      <td className="p-3 font-mono text-slate-500 text-[11px]">{f.email || '—'}</td>
                      <td className="p-3 text-slate-700">
                        {f.district}, {f.state}
                        {f.address && <span className="block text-[10px] text-slate-500">{f.address}</span>}
                      </td>
                      <td className="p-3 text-emerald-800 font-medium">{f.fpoName || 'Independent Smallholder'}</td>
                      <td className="p-3 font-mono font-bold text-slate-900">{f.totalListings}</td>
                      <td className="p-3 font-mono font-bold text-emerald-700">{f.totalQuantityKg.toLocaleString()} kg</td>
                      <td className="p-3">
                        {f.verified ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 w-fit">
                            <CheckCircle2 className="w-3 h-3" /> Verified
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-slate-500 text-[10px] font-mono">
                        {new Date(f.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: FPO ADMINS */}
      {!isLoading && activeTab === 'fpos' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Farmer Producer Organizations (FPOs)</h3>
              <p className="text-xs text-slate-600">Registered FPO administrators in Supabase (role = 'fpo_admin')</p>
            </div>
            <span className="text-xs bg-teal-50 text-teal-800 border border-teal-200 px-3 py-1 rounded-full font-mono font-bold">
              {filteredFpos.length} of {fpos.length} FPOs
            </span>
          </div>

          {filteredFpos.length === 0 ? (
            <div className="text-center py-12 text-slate-400 space-y-2">
              <Layers className="w-10 h-10 mx-auto text-slate-300" />
              <p className="text-sm font-bold text-slate-700">No FPO administrators registered yet.</p>
              <p className="text-xs text-slate-500">FPO administrator accounts will appear here upon registration.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-3 font-bold">FPO Organization Name</th>
                    <th className="p-3 font-bold">Administrator / Contact</th>
                    <th className="p-3 font-bold">Phone Number</th>
                    <th className="p-3 font-bold">Email</th>
                    <th className="p-3 font-bold">Operational Base</th>
                    <th className="p-3 font-bold">Registered Members</th>
                    <th className="p-3 font-bold">Verification</th>
                    <th className="p-3 font-bold">Registered</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredFpos.map((f) => (
                    <tr key={f.id} className="hover:bg-slate-50 transition">
                      <td className="p-3 font-bold text-teal-900">{f.fpoName}</td>
                      <td className="p-3 font-medium text-slate-900">{f.fullName}</td>
                      <td className="p-3 font-mono text-slate-700">{f.phone || '—'}</td>
                      <td className="p-3 font-mono text-slate-500 text-[11px]">{f.email || '—'}</td>
                      <td className="p-3 text-slate-700">
                        {f.district}, {f.state}
                        {f.address && <span className="block text-[10px] text-slate-500">{f.address}</span>}
                      </td>
                      <td className="p-3 font-mono font-bold text-teal-700">{f.memberFarmersCount || 0} Farmers</td>
                      <td className="p-3">
                        {f.verified ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 w-fit">
                            <CheckCircle2 className="w-3 h-3" /> Certified
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            Pending
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-slate-500 text-[10px] font-mono">
                        {new Date(f.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: BULK BUYERS */}
      {!isLoading && activeTab === 'buyers' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Bulk Enterprise Buyers</h3>
              <p className="text-xs text-slate-600">Enterprise food processors, retail chains, and hotels (role = 'bulk_buyer')</p>
            </div>
            <span className="text-xs bg-blue-50 text-blue-800 border border-blue-200 px-3 py-1 rounded-full font-mono font-bold">
              {filteredBulkBuyers.length} of {bulkBuyers.length} Buyers
            </span>
          </div>

          {filteredBulkBuyers.length === 0 ? (
            <div className="text-center py-12 text-slate-400 space-y-2">
              <Building2 className="w-10 h-10 mx-auto text-slate-300" />
              <p className="text-sm font-bold text-slate-700">No bulk buyers registered yet.</p>
              <p className="text-xs text-slate-500">Bulk enterprise buyers will appear here upon registration.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-3 font-bold">Company Name</th>
                    <th className="p-3 font-bold">Contact Person</th>
                    <th className="p-3 font-bold">Phone Number</th>
                    <th className="p-3 font-bold">Email</th>
                    <th className="p-3 font-bold">Business Type</th>
                    <th className="p-3 font-bold">Drop-off Location</th>
                    <th className="p-3 font-bold">Open Requirements</th>
                    <th className="p-3 font-bold">Total Demand (kg)</th>
                    <th className="p-3 font-bold">Registered</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredBulkBuyers.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50 transition">
                      <td className="p-3 font-bold text-slate-900">{b.companyName}</td>
                      <td className="p-3 text-slate-800 font-medium">{b.contactPerson}</td>
                      <td className="p-3 font-mono text-slate-700">{b.phone || '—'}</td>
                      <td className="p-3 font-mono text-slate-500 text-[11px]">{b.email || '—'}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                          {b.businessType}
                        </span>
                      </td>
                      <td className="p-3 text-slate-700">
                        {b.district}, {b.state}
                        {b.businessAddress && <span className="block text-[10px] text-slate-500">{b.businessAddress}</span>}
                      </td>
                      <td className="p-3 font-mono font-bold text-slate-900">{b.totalRequirements}</td>
                      <td className="p-3 font-mono font-bold text-blue-700">{b.totalDemandedKg.toLocaleString()} kg</td>
                      <td className="p-3 text-slate-500 text-[10px] font-mono">
                        {new Date(b.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: CONSUMER GROUPS */}
      {!isLoading && activeTab === 'consumer_groups' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Consumer Groups & Residential Hubs</h3>
              <p className="text-xs text-slate-600">Residential societies and cooperative buying hubs (role = 'consumer_group')</p>
            </div>
            <span className="text-xs bg-indigo-50 text-indigo-800 border border-indigo-200 px-3 py-1 rounded-full font-mono font-bold">
              {filteredConsumerGroups.length} of {consumerGroups.length} Hubs
            </span>
          </div>

          {filteredConsumerGroups.length === 0 ? (
            <div className="text-center py-12 text-slate-400 space-y-2">
              <Users className="w-10 h-10 mx-auto text-slate-300" />
              <p className="text-sm font-bold text-slate-700">No consumer groups registered yet.</p>
              <p className="text-xs text-slate-500">Cooperative residential buying hubs will appear here upon registration.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-3 font-bold">Hub / Cooperative Name</th>
                    <th className="p-3 font-bold">Hub Lead</th>
                    <th className="p-3 font-bold">Phone Number</th>
                    <th className="p-3 font-bold">Email</th>
                    <th className="p-3 font-bold">Delivery Hub Location</th>
                    <th className="p-3 font-bold">Open Requirements</th>
                    <th className="p-3 font-bold">Demand (kg)</th>
                    <th className="p-3 font-bold">Registered</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredConsumerGroups.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50 transition">
                      <td className="p-3 font-bold text-slate-900">{c.companyName}</td>
                      <td className="p-3 text-slate-800 font-medium">{c.contactPerson}</td>
                      <td className="p-3 font-mono text-slate-700">{c.phone || '—'}</td>
                      <td className="p-3 font-mono text-slate-500 text-[11px]">{c.email || '—'}</td>
                      <td className="p-3 text-slate-700">
                        {c.district}, {c.state}
                        {c.businessAddress && <span className="block text-[10px] text-slate-500">{c.businessAddress}</span>}
                      </td>
                      <td className="p-3 font-mono font-bold text-slate-900">{c.totalRequirements}</td>
                      <td className="p-3 font-mono font-bold text-indigo-700">{c.totalDemandedKg.toLocaleString()} kg</td>
                      <td className="p-3 text-slate-500 text-[10px] font-mono">
                        {new Date(c.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 6: TRANSPORTERS */}
      {!isLoading && activeTab === 'transporters' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Commercial Transporters & Fleet Operators</h3>
              <p className="text-xs text-slate-600">Registered logistics providers managing multi-farm pickup milk-runs (role = 'transporter')</p>
            </div>
            <span className="text-xs bg-amber-50 text-amber-800 border border-amber-200 px-3 py-1 rounded-full font-mono font-bold">
              {filteredTransporters.length} of {transporters.length} Transporters
            </span>
          </div>

          {filteredTransporters.length === 0 ? (
            <div className="text-center py-12 text-slate-400 space-y-2">
              <Truck className="w-10 h-10 mx-auto text-slate-300" />
              <p className="text-sm font-bold text-slate-700">No transporters registered yet.</p>
              <p className="text-xs text-slate-500">Transporter fleet partners will appear here upon registration.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-3 font-bold">Fleet Operator</th>
                    <th className="p-3 font-bold">Phone Number</th>
                    <th className="p-3 font-bold">Email</th>
                    <th className="p-3 font-bold">Operating Base</th>
                    <th className="p-3 font-bold">Vehicle Spec</th>
                    <th className="p-3 font-bold">Capacity (kg)</th>
                    <th className="p-3 font-bold">Completed Trips</th>
                    <th className="p-3 font-bold">Status</th>
                    <th className="p-3 font-bold">Registered</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTransporters.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50 transition">
                      <td className="p-3 font-bold text-slate-900">{t.fullName}</td>
                      <td className="p-3 font-mono text-slate-700">{t.phone || '—'}</td>
                      <td className="p-3 font-mono text-slate-500 text-[11px]">{t.email || '—'}</td>
                      <td className="p-3 text-slate-700">{t.district}, {t.state}</td>
                      <td className="p-3 font-mono text-slate-800 font-medium">
                        {t.vehicleNumber ? `${t.vehicleNumber} (${t.vehicleType || 'Commercial'})` : 'Standard Commercial Fleet'}
                      </td>
                      <td className="p-3 font-mono font-bold text-amber-700">
                        {t.vehicleCapacityKg ? `${t.vehicleCapacityKg.toLocaleString()} kg` : '2,500 kg'}
                      </td>
                      <td className="p-3 font-mono font-bold text-slate-900">{t.totalRoutesCompleted}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Active Fleet
                        </span>
                      </td>
                      <td className="p-3 text-slate-500 text-[10px] font-mono">
                        {new Date(t.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 7: TRANSACTIONS PROVENANCE */}
      {!isLoading && activeTab === 'transactions' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Producer → Buyer Transaction Provenance</h3>
              <p className="text-xs text-slate-600">
                Complete relational audit trail: farmer lot → aggregated order → buyer delivery → logistics route
              </p>
            </div>
            <span className="text-xs bg-purple-50 text-purple-800 border border-purple-200 px-3 py-1 rounded-full font-mono font-bold">
              {filteredTransactions.length} of {transactions.length} Verified Contracts
            </span>
          </div>

          {filteredTransactions.length === 0 ? (
            <div className="text-center py-12 text-slate-400 space-y-2">
              <FileSpreadsheet className="w-10 h-10 mx-auto text-slate-300" />
              <p className="text-sm font-bold text-slate-700">No transactions recorded in database yet.</p>
              <p className="text-xs text-slate-500">Live transaction records will appear automatically when buyers create aggregated orders.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="p-3 font-bold">Order Code</th>
                    <th className="p-3 font-bold">Participating Producers</th>
                    <th className="p-3 font-bold">Produce & Grade</th>
                    <th className="p-3 font-bold">Total Volume</th>
                    <th className="p-3 font-bold">Bulk Buyer Entity</th>
                    <th className="p-3 font-bold">Rate / kg</th>
                    <th className="p-3 font-bold">Total Value</th>
                    <th className="p-3 font-bold">Order Status</th>
                    <th className="p-3 font-bold">Transporter</th>
                    <th className="p-3 font-bold text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50 transition">
                      <td className="p-3 font-mono font-bold text-slate-900">{tx.orderCode}</td>
                      <td className="p-3">
                        {tx.farmers.length > 0 ? (
                          <div className="space-y-1">
                            {tx.farmers.map((f, i) => (
                              <div key={i} className="text-slate-800">
                                <span className="font-bold">{f.fullName}</span>
                                <span className="text-[10px] text-slate-500 block">
                                  {f.allocatedKg} kg • {f.district} {f.phone ? `(${f.phone})` : ''}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-500 font-medium">Regional Smallholders</span>
                        )}
                      </td>
                      <td className="p-3">
                        <span className="font-bold text-emerald-800 block">{tx.cropName}</span>
                        <span className="text-[10px] text-slate-500">{tx.qualityGrade} {tx.variety ? `• ${tx.variety}` : ''}</span>
                      </td>
                      <td className="p-3 font-mono font-bold text-slate-900">{tx.totalQuantityKg.toLocaleString()} kg</td>
                      <td className="p-3">
                        {tx.buyer ? (
                          <div>
                            <span className="font-bold text-slate-900 block">{tx.buyer.companyName}</span>
                            <span className="text-[10px] text-slate-500 block">{tx.buyer.destinationName}</span>
                            {tx.buyer.phone && <span className="text-[10px] text-slate-600 font-mono">Contact: {tx.buyer.phone}</span>}
                          </div>
                        ) : (
                          <span className="text-slate-500">Enterprise Buyer</span>
                        )}
                      </td>
                      <td className="p-3 font-mono font-bold text-emerald-800">₹{tx.avgPricePerKg.toFixed(2)}</td>
                      <td className="p-3 font-mono font-extrabold text-slate-900">₹{tx.totalValueInr.toLocaleString()}</td>
                      <td className="p-3">
                        <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                          tx.orderStatus === 'DELIVERED' || tx.orderStatus === 'delivered'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                            : tx.orderStatus === 'IN_TRANSIT' || tx.orderStatus === 'in_transit'
                              ? 'bg-blue-50 text-blue-800 border border-blue-300'
                              : 'bg-amber-50 text-amber-800 border border-amber-300'
                        }`}>
                          {tx.orderStatus.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="p-3">
                        {tx.logistics ? (
                          <div>
                            <span className="font-bold text-slate-800 block text-[11px]">{tx.logistics.transporterName}</span>
                            {tx.logistics.vehicleNumber && (
                              <span className="text-[10px] font-mono text-slate-500 block">{tx.logistics.vehicleNumber}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Pending assignment</span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => handleSelectTransaction(tx.orderId)}
                          className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 rounded-lg text-xs font-bold transition flex items-center gap-1 mx-auto"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Audit</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 8: LOGISTICS FLEET ROUTES */}
      {!isLoading && activeTab === 'logistics' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div>
              <h3 className="text-base font-extrabold text-slate-900">Consolidated Fleet Route Tracking</h3>
              <p className="text-xs text-slate-600">CVRP multi-farm pickup routes and road optimization telemetry</p>
            </div>
            <span className="text-xs bg-cyan-50 text-cyan-800 border border-cyan-200 px-3 py-1 rounded-full font-mono font-bold">
              {filteredRoutes.length} of {routes.length} Routes
            </span>
          </div>

          {filteredRoutes.length === 0 ? (
            <div className="text-center py-12 text-slate-400 space-y-2">
              <Truck className="w-10 h-10 mx-auto text-slate-300" />
              <p className="text-sm font-bold text-slate-700">No active logistics routes in database.</p>
              <p className="text-xs text-slate-500">Routes will appear automatically when CVRP dispatch plans are generated for aggregated orders.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredRoutes.map((r) => (
                <div key={r.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Truck className="w-4 h-4 text-cyan-700" />
                      <span className="font-bold text-slate-900 font-mono">{r.routeCode}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                      {r.status.replace(/_/g, ' ')}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] bg-white border border-slate-200 p-3 rounded-lg font-mono">
                    <div>
                      <span className="text-slate-500 block text-[9px] uppercase font-bold">Transporter</span>
                      <span className="text-slate-900 font-bold">{r.transporterName}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[9px] uppercase font-bold">Vehicle</span>
                      <span className="text-slate-900 font-bold">{r.vehicleNumber}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[9px] uppercase font-bold">Current Load</span>
                      <span className="text-emerald-700 font-bold">{r.currentLoadKg} / {r.vehicleCapacityKg} kg</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[9px] uppercase font-bold">Distance</span>
                      <span className="text-slate-900 font-bold">{r.totalDistanceKm} km</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 text-[11px] text-slate-600 font-medium">
                    <span>Destination: <strong className="text-slate-900">{r.destinationName}</strong></span>
                    <span className="text-cyan-800 font-bold">{r.waypointsCount} Waypoints</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TRANSACTION DETAIL AUDIT MODAL */}
      {selectedTransactionId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base">
                    Transaction Audit Provenance: {selectedTxDetail ? selectedTxDetail.orderCode : selectedTransactionId}
                  </h3>
                  <p className="text-[11px] text-slate-400">Complete multi-party contract relationship</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedTransactionId(null);
                  setSelectedTxDetail(null);
                }}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Body */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-700">
              {isLoadingTxDetail ? (
                <div className="py-12 text-center space-y-2">
                  <RefreshCw className="w-6 h-6 text-purple-600 animate-spin mx-auto" />
                  <p className="text-xs text-slate-500 font-mono">Fetching complete contract provenance...</p>
                </div>
              ) : selectedTxDetail ? (
                <div className="space-y-5">
                  {/* Order Overview Card */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">Produce</span>
                      <span className="text-slate-900 font-bold text-sm">{selectedTxDetail.cropName}</span>
                      <span className="text-[10px] text-slate-600 block">{selectedTxDetail.qualityGrade}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">Total Quantity</span>
                      <span className="text-slate-900 font-bold text-sm">{selectedTxDetail.totalQuantityKg.toLocaleString()} kg</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">Avg Rate / kg</span>
                      <span className="text-emerald-700 font-bold text-sm">₹{selectedTxDetail.avgPricePerKg.toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-bold block">Total Value</span>
                      <span className="text-slate-900 font-extrabold text-sm">₹{selectedTxDetail.totalValueInr.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Section 1: Farmers */}
                  <div className="space-y-2">
                    <h4 className="font-extrabold text-xs uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                      <Users className="w-4 h-4" /> 1. Participating Farmer Producers ({selectedTxDetail.farmers.length})
                    </h4>
                    <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                      {selectedTxDetail.farmers.map((f, i) => (
                        <div key={i} className="p-3 bg-white hover:bg-slate-50 transition grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <div>
                            <span className="font-bold text-slate-900 block">{f.fullName}</span>
                            <span className="text-slate-500 text-[11px]">{f.district}, {f.state}</span>
                            {f.address && <span className="text-[10px] text-slate-400 block">{f.address}</span>}
                          </div>
                          <div className="font-mono">
                            <span className="text-slate-500 text-[10px] uppercase block">Contact</span>
                            <span className="text-slate-800">{f.phone || '—'}</span>
                            <span className="text-slate-500 text-[10px] block">{f.email || ''}</span>
                          </div>
                          <div className="font-mono sm:text-right">
                            <span className="text-slate-500 text-[10px] uppercase block">Allocation & Rate</span>
                            <span className="text-emerald-700 font-bold">{f.allocatedKg} kg</span> @ ₹{f.pricePerKg}/kg
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Section 2: Buyer */}
                  <div className="space-y-2">
                    <h4 className="font-extrabold text-xs uppercase tracking-wider text-blue-800 flex items-center gap-1.5">
                      <Building2 className="w-4 h-4" /> 2. Contracted Enterprise Buyer
                    </h4>
                    {selectedTxDetail.buyer ? (
                      <div className="p-4 rounded-xl bg-white border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <span className="text-slate-500 text-[10px] uppercase font-bold block">Company / Entity</span>
                          <span className="font-bold text-slate-900 text-sm block">{selectedTxDetail.buyer.companyName}</span>
                          <span className="text-blue-700 text-[10px] font-bold">{selectedTxDetail.buyer.businessType}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 text-[10px] uppercase font-bold block">Procurement Officer</span>
                          <span className="font-bold text-slate-800 block">{selectedTxDetail.buyer.contactPerson}</span>
                          <span className="font-mono text-slate-600 text-[11px] block">{selectedTxDetail.buyer.phone || '—'}</span>
                          <span className="font-mono text-slate-500 text-[10px] block">{selectedTxDetail.buyer.email || ''}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 text-[10px] uppercase font-bold block">Drop-off Destination</span>
                          <span className="font-bold text-slate-800 block">{selectedTxDetail.buyer.destinationName}</span>
                          <span className="text-slate-600 text-[11px] block">{selectedTxDetail.buyer.district}, {selectedTxDetail.buyer.state}</span>
                        </div>
                      </div>
                    ) : (
                      <p className="p-3 bg-slate-50 rounded-lg text-slate-500 italic">No buyer profile linked to this order requirement.</p>
                    )}
                  </div>

                  {/* Section 3: Logistics */}
                  <div className="space-y-2">
                    <h4 className="font-extrabold text-xs uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
                      <Truck className="w-4 h-4" /> 3. Assigned Logistics & Fleet Route
                    </h4>
                    {selectedTxDetail.logistics ? (
                      <div className="p-4 rounded-xl bg-white border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
                        <div>
                          <span className="text-slate-500 text-[10px] uppercase font-bold block">Route Code</span>
                          <span className="font-bold text-slate-900 block">{selectedTxDetail.logistics.routeCode}</span>
                          <span className="text-[10px] text-blue-700 font-bold">{selectedTxDetail.logistics.routeStatus}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 text-[10px] uppercase font-bold block">Fleet Operator</span>
                          <span className="font-bold text-slate-800 block">{selectedTxDetail.logistics.transporterName}</span>
                          <span className="text-[10px] text-slate-600">{selectedTxDetail.logistics.transporterPhone || '—'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 text-[10px] uppercase font-bold block">Vehicle</span>
                          <span className="font-bold text-slate-800 block">{selectedTxDetail.logistics.vehicleNumber || 'Standard Fleet'}</span>
                          <span className="text-[10px] text-slate-500">{selectedTxDetail.logistics.vehicleType || ''}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 text-[10px] uppercase font-bold block">Road Distance</span>
                          <span className="font-bold text-slate-900 block">{selectedTxDetail.logistics.totalDistanceKm || 0} km</span>
                          {selectedTxDetail.logistics.distanceSavingsKm ? (
                            <span className="text-[10px] text-emerald-700 font-bold block">
                              Saved {selectedTxDetail.logistics.distanceSavingsKm} km
                            </span>
                          ) : null}
                        </div>
                      </div>
                    ) : (
                      <p className="p-3 bg-slate-50 rounded-lg text-slate-500 italic">Logistics route has not been scheduled yet.</p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="py-8 text-center text-slate-500">Transaction details could not be retrieved.</p>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
              <button
                onClick={() => {
                  setSelectedTransactionId(null);
                  setSelectedTxDetail(null);
                }}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition"
              >
                Close Audit View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
