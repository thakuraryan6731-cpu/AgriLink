import React from 'react';
import {
  Sprout,
  Mic,
  TrendingUp,
  ShoppingBag,
  Truck,
  ShieldCheck,
  ArrowUpRight,
  Sparkles,
  MapPin,
  Clock,
  CheckCircle2,
  Calendar
} from 'lucide-react';
import { CropListing, UserProfile } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';

interface FarmerDashboardProps {
  farmer: UserProfile;
  listings: CropListing[];
  isLoading?: boolean;
  onNavigate: (screen: number) => void;
  onOpenVoiceModal: () => void;
}

export const FarmerDashboard: React.FC<FarmerDashboardProps> = ({
  farmer,
  listings,
  isLoading = false,
  onNavigate,
  onOpenVoiceModal
}) => {
  const { t } = useLanguage();
  const totalQuantityListed = listings.reduce((acc, l) => acc + l.quantityKg, 0);

  return (
    <div className="space-y-6">
      {/* Welcome Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-800 via-teal-900 to-slate-900 border border-emerald-500/30 p-6 md:p-8 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> {t('farmer.verified')}
              </span>
              <span className="text-xs text-emerald-100 font-mono">
                {farmer.fpoName ? `${farmer.fpoName} • ` : ''}{farmer.district}, {farmer.state}
              </span>
            </div>

            <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {t('farmer.welcome')}{' '}
              <span className="text-emerald-300">{farmer.fullName}</span>
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100/90 mt-1 max-w-2xl">
              {t('farmer.summary')} <strong className="text-emerald-300 font-bold">+41.3% {t('farmer.higherRealization')}</strong>
            </p>
          </div>

          {/* Quick Action CTA Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={onOpenVoiceModal}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-400 to-green-500 text-slate-950 font-bold text-xs sm:text-sm hover:from-emerald-300 hover:to-green-400 transition shadow-lg shadow-emerald-950/20"
            >
              <Mic className="w-4 h-4 animate-pulse" />
              <span>{t('farmer.voiceListing')}</span>
            </button>

            <button
              onClick={() => onNavigate(4)}
              className="flex items-center gap-2 px-4 py-3 rounded-xl bg-slate-800 text-white font-bold text-xs sm:text-sm hover:bg-slate-700 border border-slate-700 transition"
            >
              <ShoppingBag className="w-4 h-4 text-emerald-400" />
              <span>{t('farmer.rankOffers')}</span>
            </button>
          </div>
        </div>

        {/* Live Mandi Benchmark Ticker */}
        <div className="mt-6 pt-4 border-t border-emerald-700/50 flex flex-wrap items-center gap-3 text-xs font-mono text-emerald-100">
          <span className="text-emerald-300 uppercase tracking-wider flex items-center gap-1.5 font-sans font-bold">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-300" /> {t('farmer.marketBenchmarks')}
          </span>
          <span className="px-2.5 py-1 rounded bg-black/30 border border-emerald-500/30 text-white">
            🍅 Tomato (Nashik APMC): <strong className="text-emerald-300 font-bold">₹19.00/kg</strong> (+18.4% 7d forecast)
          </span>
          <span className="px-2.5 py-1 rounded bg-black/30 border border-emerald-500/30 text-white">
            🧅 Onion (Lasalgaon): <strong className="text-emerald-300 font-bold">₹22.50/kg</strong> (+9.2% 7d forecast)
          </span>
          <span className="px-2.5 py-1 rounded bg-black/30 border border-emerald-500/30 text-white">
            🥔 Potato (Pune APMC): <strong className="text-amber-300 font-bold">₹16.80/kg</strong> ({t('farmer.stable')})
          </span>
        </div>
      </div>

      {/* 4 Macro KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:border-emerald-500 transition">
          <div className="flex items-center justify-between text-slate-600 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">{t('farmer.activeYield')}</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Sprout className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 font-heading">
            {isLoading ? (
              <span className="text-slate-400 animate-pulse">—</span>
            ) : (
              <>
                {totalQuantityListed.toLocaleString()} <span className="text-xs text-slate-600 font-sans font-normal">kg</span>
              </>
            )}
          </div>
          <p className="text-xs text-emerald-700 mt-1 flex items-center gap-1 font-bold">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> {listings.length} {t('farmer.verifiedLots')}
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:border-blue-500 transition cursor-pointer" onClick={() => onNavigate(4)}>
          <div className="flex items-center justify-between text-slate-600 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">{t('farmer.highestOffer')}</span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-700 border border-blue-200">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 font-heading">
            ₹29.50 <span className="text-xs text-slate-600 font-sans font-normal">/kg</span>
          </div>
          <p className="text-xs text-blue-700 mt-1 flex items-center gap-1 font-bold">
            <ArrowUpRight className="w-3.5 h-3.5 text-blue-600" /> Reliance Fresh (Bhiwandi Hub)
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:border-emerald-500 transition cursor-pointer" onClick={() => onNavigate(6)}>
          <div className="flex items-center justify-between text-slate-600 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">{t('farmer.netGain')}</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-emerald-700 font-heading">
            +38.6% <span className="text-xs text-slate-600 font-sans font-normal">{t('farmer.vsMarket')}</span>
          </div>
          <p className="text-xs text-emerald-800 mt-1 flex items-center gap-1 font-bold">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" /> ₹7.85/kg {t('farmer.extraRealization')}
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:border-amber-500 transition cursor-pointer" onClick={() => onNavigate(13)}>
          <div className="flex items-center justify-between text-slate-600 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">{t('farmer.transportSavings')}</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-700 border border-amber-200">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-amber-800 font-heading">
            ₹4,348 <span className="text-xs text-slate-600 font-sans font-normal">{t('farmer.saved')}</span>
          </div>
          <p className="text-xs text-amber-800 mt-1 flex items-center gap-1 font-bold">
            <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" /> {t('farmer.pooledWithFarms')}
          </p>
        </div>
      </div>

      {/* Active Crop Listings Table */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="font-heading text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <Sprout className="w-5 h-5 text-emerald-600" />
              {t('farmer.activeListings')}
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              {t('farmer.listingsDescription')}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate(2)}
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-800 border border-slate-300 transition flex items-center gap-1.5"
            >
              <span>{t('farmer.addManual')}</span>
            </button>
            <button
              onClick={onOpenVoiceModal}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold transition flex items-center gap-1.5"
            >
              <Mic className="w-3.5 h-3.5 text-emerald-700 animate-pulse" />
              <span>{t('farmer.voiceList')}</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-600 font-mono uppercase tracking-wider text-[11px] bg-slate-50">
                <th className="py-3 pl-3 font-bold">{t('farmer.cropVariety')}</th>
                <th className="py-3 font-bold">{t('farmer.quantity')}</th>
                <th className="py-3 font-bold">{t('farmer.askingPrice')}</th>
                <th className="py-3 font-bold">{t('farmer.marketBenchmark')}</th>
                <th className="py-3 font-bold">{t('farmer.qualityGrade')}</th>
                <th className="py-3 font-bold">{t('farmer.harvestDate')}</th>
                <th className="py-3 font-bold">{t('farmer.location')}</th>
                <th className="py-3 font-bold">{t('farmer.status')}</th>
                <th className="py-3 text-right pr-3 font-bold">{t('farmer.action')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-4 pl-3"><div className="h-4 bg-slate-200 rounded w-28 mb-1"></div><div className="h-3 bg-slate-100 rounded w-16"></div></td>
                    <td className="py-4"><div className="h-4 bg-slate-200 rounded w-16"></div></td>
                    <td className="py-4"><div className="h-4 bg-slate-200 rounded w-14"></div></td>
                    <td className="py-4"><div className="h-4 bg-slate-200 rounded w-16"></div></td>
                    <td className="py-4"><div className="h-4 bg-slate-200 rounded w-12"></div></td>
                    <td className="py-4"><div className="h-4 bg-slate-200 rounded w-20"></div></td>
                    <td className="py-4"><div className="h-4 bg-slate-200 rounded w-24"></div></td>
                    <td className="py-4"><div className="h-4 bg-slate-200 rounded w-16"></div></td>
                    <td className="py-4 text-right pr-3"><div className="h-6 bg-slate-200 rounded w-14 ml-auto"></div></td>
                  </tr>
                ))
              ) : listings.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    <Sprout className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                    <p className="text-sm font-bold text-slate-800">{t('farmer.noListings')}</p>
                    <p className="text-xs text-slate-600 mt-1">{t('farmer.noListingsHint')}</p>
                    <button
                      onClick={onOpenVoiceModal}
                      className="mt-4 px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-500 text-xs font-bold inline-flex items-center gap-1.5 transition shadow"
                    >
                      <Mic className="w-3.5 h-3.5" />
                      <span>{t('farmer.listFirst')}</span>
                    </button>
                  </td>
                </tr>
              ) : (
                listings.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition">
                    <td className="py-3.5 pl-3">
                      <div className="font-extrabold text-slate-900 text-sm">{item.cropName}</div>
                      <div className="text-[11px] text-emerald-700 font-semibold">{item.variety}</div>
                    </td>
                    <td className="py-3.5">
                      <span className="font-bold text-slate-900">{item.quantityKg.toLocaleString()} kg</span>
                      <span className="block text-[10px] text-slate-500 font-medium">{(item.quantityKg / 100).toFixed(1)} Qtl</span>
                    </td>
                    <td className="py-3.5">
                      <span className="font-extrabold text-emerald-700 text-sm">₹{item.askingPricePerKg.toFixed(2)}</span>
                      <span className="text-[10px] text-slate-500 font-medium">/kg</span>
                    </td>
                    <td className="py-3.5 font-mono text-slate-700 font-medium">
                      ₹{item.mandiBenchmarkPrice.toFixed(2)}/kg
                    </td>
                    <td className="py-3.5">
                      <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
                        {item.qualityGrade}
                      </span>
                    </td>
                    <td className="py-3.5 text-slate-700 flex items-center gap-1 mt-3">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      <span>{item.harvestDate}</span>
                    </td>
                    <td className="py-3.5 text-slate-700">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-500" />
                        <span>{item.locationName}</span>
                      </div>
                    </td>
                    <td className="py-3.5">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                        {item.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3.5 text-right pr-3">
                      <button
                        onClick={() => onNavigate(4)}
                        className="px-3 py-1 rounded-lg bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-300 text-xs font-bold transition inline-flex items-center gap-1"
                      >
                        <span>Match</span>
                        <ArrowUpRight className="w-3 h-3 text-emerald-700" />
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

