import React from 'react';
import {
  ShoppingBag,
  Package,
  CheckCircle2,
  TrendingDown,
  Building2,
  MapPin,
  Calendar,
  Sparkles,
  ArrowRight,
  Plus
} from 'lucide-react';
import { BuyerRequirement, AggregationLot } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';

interface BuyerDashboardProps {
  requirements: BuyerRequirement[];
  aggregationLots: AggregationLot[];
  isLoading?: boolean;
  onNavigate: (screen: number) => void;
}

export const BuyerDashboard: React.FC<BuyerDashboardProps> = ({
  requirements,
  aggregationLots,
  isLoading = false,
  onNavigate
}) => {
  const { t } = useLanguage();
  const totalDemandKg = requirements.reduce((acc, r) => acc + r.requiredQuantityKg, 0);

  return (
    <div className="space-y-6">
      {/* Welcome Hero */}
      <div className="rounded-2xl p-6 md:p-8 bg-gradient-to-r from-emerald-800 via-teal-900 to-slate-900 border border-emerald-500/30 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5" /> {t('buyer.verifiedBuyer')}
              </span>
              <span className="text-xs text-emerald-100 font-mono">
                {t('buyer.distributionCenters')}
              </span>
            </div>

            <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {t('buyer.commandCenter')}{' '}
              <span className="text-emerald-300">{t('buyer.commandCenterAccent')}</span>
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100/90 mt-1 max-w-2xl">
              {t('buyer.dashboardDescription')} <strong className="text-emerald-300 font-bold">{t('buyer.dashboardSavings')}</strong> {t('buyer.dashboardFreshness')}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate(8)}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-400 to-green-500 text-slate-950 font-bold text-xs sm:text-sm hover:from-emerald-300 hover:to-green-400 transition shadow-lg shadow-emerald-950/20 whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>{t('buyer.createBuyingRequirement')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-600 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">{t('buyer.activeDemandVolume')}</span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-700 border border-blue-200">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 font-heading">
            {isLoading ? (
              <span className="text-slate-400 animate-pulse">—</span>
            ) : (
              <>
                {totalDemandKg.toLocaleString()} <span className="text-xs text-slate-600 font-normal">kg</span>
              </>
            )}
          </div>
          <p className="text-xs text-blue-700 mt-1 font-bold">
            {t('buyer.openContracts', { count: String(requirements.length) })}
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm cursor-pointer hover:border-emerald-500 transition" onClick={() => onNavigate(10)}>
          <div className="flex items-center justify-between text-slate-600 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">{t('buyer.aggregatedBatches')}</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-emerald-700 font-heading">
            {aggregationLots.length} <span className="text-xs text-slate-600 font-normal">{t('buyer.readyLots')}</span>
          </div>
          <p className="text-xs text-emerald-800 mt-1 font-bold">{t('buyer.harvestBatched')}</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-600 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">{t('buyer.costSavings')}</span>
            <div className="p-2 rounded-xl bg-cyan-50 text-cyan-700 border border-cyan-200">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-cyan-700 font-heading">
            -21.4% <span className="text-xs text-slate-600 font-normal">{t('buyer.vsWholesale')}</span>
          </div>
          <p className="text-xs text-cyan-800 mt-1 font-bold">{t('buyer.directFarmgate')}</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm cursor-pointer hover:border-amber-500 transition" onClick={() => onNavigate(13)}>
          <div className="flex items-center justify-between text-slate-600 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">{t('buyer.logisticsStatus')}</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-700 border border-amber-200">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-amber-800 font-heading">
            {t('buyer.routePlanningActive')}
          </div>
          <p className="text-xs text-amber-800 mt-1 font-bold">{t('buyer.milkRunProgress')}</p>
        </div>
      </div>

      {/* Active Buyer Requirements Table */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="font-heading text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-emerald-600" />
              {t('buyer.activeProcurementOrders')}
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              {t('buyer.bulkDemandsMatched')}
            </p>
          </div>

          <button
            onClick={() => onNavigate(8)}
            className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t('buyer.createRequirement')}</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-600 font-mono uppercase tracking-wider text-[11px] bg-slate-50">
                <th className="py-3 pl-3 font-bold">Requirement ID</th>
                <th className="py-3 font-bold">Buyer Name</th>
                <th className="py-3 font-bold">Crop Required</th>
                <th className="py-3 font-bold">Target Quantity</th>
                <th className="py-3 font-bold">Max Price</th>
                <th className="py-3 font-bold">Quality Grade</th>
                <th className="py-3 font-bold">Destination DC</th>
                <th className="py-3 text-right pr-3 font-bold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-4 pl-3"><div className="h-4 bg-slate-200 rounded w-20"></div></td>
                    <td className="py-4"><div className="h-4 bg-slate-200 rounded w-28"></div></td>
                    <td className="py-4"><div className="h-4 bg-slate-200 rounded w-20"></div></td>
                    <td className="py-4"><div className="h-4 bg-slate-200 rounded w-16"></div></td>
                    <td className="py-4"><div className="h-4 bg-slate-200 rounded w-14"></div></td>
                    <td className="py-4"><div className="h-4 bg-slate-200 rounded w-16"></div></td>
                    <td className="py-4"><div className="h-4 bg-slate-200 rounded w-32"></div></td>
                    <td className="py-4 text-right pr-3"><div className="h-6 bg-slate-200 rounded w-16 ml-auto"></div></td>
                  </tr>
                ))
              ) : requirements.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <ShoppingBag className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                    <p className="text-sm font-bold text-slate-800">No procurement requirements yet</p>
                    <p className="text-xs text-slate-600 mt-1">Publish a requirement to initiate AI aggregation matching across smallholders.</p>
                    <button
                      onClick={() => onNavigate(8)}
                      className="mt-4 px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-500 text-xs font-bold inline-flex items-center gap-1.5 transition shadow"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Create First Requirement</span>
                    </button>
                  </td>
                </tr>
              ) : (
                requirements.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50 transition">
                    <td className="py-3.5 pl-3 font-mono text-slate-700 text-[11px] truncate max-w-[100px] font-bold">
                      {req.id}
                    </td>
                    <td className="py-3.5 font-bold text-slate-900">
                      {req.buyerName}
                    </td>
                    <td className="py-3.5">
                      <span className="font-extrabold text-emerald-700">{req.cropName}</span>
                      <span className="block text-[10px] text-slate-500">{req.variety || 'Any Premium'}</span>
                    </td>
                    <td className="py-3.5 font-mono">
                      <span className="font-bold text-slate-900 text-sm">{req.requiredQuantityKg.toLocaleString()} kg</span>
                    </td>
                    <td className="py-3.5 font-mono text-emerald-700 font-extrabold">
                      ₹{req.maxPricePerKg.toFixed(2)}/kg
                    </td>
                    <td className="py-3.5">
                      <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                        {req.preferredQualityGrade}
                      </span>
                    </td>
                    <td className="py-3.5 text-slate-700">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-500" />
                        <span className="truncate max-w-[160px]">{req.destinationName}</span>
                      </div>
                    </td>
                    <td className="py-3.5 text-right pr-3">
                      <button
                        onClick={() => onNavigate(10)}
                        className="px-3 py-1 rounded-lg bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-300 text-xs font-bold transition inline-flex items-center gap-1"
                      >
                        <span>Build Lot</span>
                        <ArrowRight className="w-3 h-3 text-emerald-700" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

