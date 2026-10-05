import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  AlertTriangle,
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
  Calendar,
  Layers,
  MapPin,
  Info,
  RefreshCw,
  TrendingDown,
  BarChart3,
  CheckCircle2,
  AlertCircle,
  ServerCrash,
  Play
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Legend
} from 'recharts';
import { DemandForecast, CropListing, UserProfile } from '../../types';
import {
  getMarketDemandForecast,
  getDevOfflineFallbackForecast,
  SUPPORTED_MARKET_CROPS,
  SUPPORTED_MARKET_LOCATIONS,
  SupportedCrop,
  SupportedLocation
} from '../../services/marketIntelligenceService';
import { useLanguage } from '../../i18n/LanguageContext';

interface MarketIntelligenceProps {
  listings?: CropListing[];
  farmer?: UserProfile;
}

export const MarketIntelligence: React.FC<MarketIntelligenceProps> = ({
  listings = [],
  farmer
}) => {
  const { t } = useLanguage();
  // Determine smart defaults from farmer context if available
  const defaultCrop = (
    listings[0]?.cropName && SUPPORTED_MARKET_CROPS.includes(listings[0].cropName as any)
      ? (listings[0].cropName as SupportedCrop)
      : 'Tomato'
  );

  const defaultLocation = (
    farmer?.district && SUPPORTED_MARKET_LOCATIONS.includes(farmer.district as any)
      ? (farmer.district as SupportedLocation)
      : 'Nashik'
  );

  const [selectedCrop, setSelectedCrop] = useState<SupportedCrop>(defaultCrop);
  const [selectedLocation, setSelectedLocation] = useState<SupportedLocation>(defaultLocation);
  const [forecast, setForecast] = useState<DemandForecast | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isDevFallbackActive, setIsDevFallbackActive] = useState<boolean>(false);

  const fetchForecast = async (crop: SupportedCrop, location: SupportedLocation) => {
    setIsLoading(true);
    setError(null);
    setIsDevFallbackActive(false);
    try {
      const data = await getMarketDemandForecast(crop, location, 7);
      setForecast(data);
    } catch (err: any) {
      console.warn('[MarketIntelligence] FastAPI forecast endpoint unreachable:', err);
      setForecast(null);
      setError('Market intelligence is temporarily unavailable. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleActivateDevFallback = () => {
    const fallbackData = getDevOfflineFallbackForecast(selectedCrop, selectedLocation, 7);
    setForecast(fallbackData);
    setIsDevFallbackActive(true);
    setError(null);
  };

  useEffect(() => {
    fetchForecast(selectedCrop, selectedLocation);
  }, [selectedCrop, selectedLocation]);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl p-6 bg-gradient-to-r from-emerald-950/70 via-slate-900 to-slate-950 border border-emerald-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono mb-1">
            <span className="text-emerald-400 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
              <span>{t('nav.marketInsights')}</span>
            </span>
            {isDevFallbackActive ? (
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-semibold">
                Market forecast temporarily unavailable
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 text-[10px] font-semibold">
                Live market signals
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold font-heading text-white">
            {t('market.title')}
          </h1>
          <p className="text-xs text-slate-300 max-w-2xl">
            Regional market signals calibrated for mandi arrivals, short-term demand and supply trends.
          </p>
        </div>

        {/* Location Selector */}
        <div className="flex items-center gap-2 bg-slate-900/90 p-2 rounded-xl border border-slate-800 self-stretch md:self-auto justify-between md:justify-start">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
            <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="hidden sm:inline">{t('market.market')}</span>
          </div>
          <select
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value as SupportedLocation)}
            className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white text-xs font-semibold focus:outline-none focus:border-emerald-500"
          >
            {SUPPORTED_MARKET_LOCATIONS.map((loc) => (
              <option key={loc} value={loc}>
                {loc} Mandi Hub
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Commodity Selector Bar */}
      <div className="glass-panel rounded-2xl p-3 border border-slate-800 flex items-center gap-2 overflow-x-auto scrollbar-none">
        <span className="text-xs text-slate-400 font-semibold px-2 shrink-0">{t('market.commodity')}</span>
        <div className="flex items-center gap-1.5 flex-1 min-w-max">
          {SUPPORTED_MARKET_CROPS.map((crop) => (
            <button
              key={crop}
              onClick={() => setSelectedCrop(crop)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${selectedCrop === crop
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/80 bg-slate-900/60 border border-slate-800'
                }`}
            >
              <span>
                {crop === 'Tomato' ? '🍅' : crop === 'Onion' ? '🧅' : crop === 'Potato' ? '🥔' : crop === 'Pulses' ? '🌱' : crop === 'Wheat' ? '🌾' : '🌽'}
              </span>
              <span>{crop}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Methodology Disclaimer Note */}
      <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-slate-200">Market note: </span>
          Forecasts combine recent regional demand and price signals. Source: <strong className="text-cyan-300">{forecast?.source || 'AgriLink market data'}</strong>.
        </div>
      </div>

      {/* Error / Service Unavailable State */}
      {error && (
        <div className="glass-panel rounded-2xl p-8 border border-rose-500/30 bg-gradient-to-br from-rose-950/40 via-slate-900 to-slate-950 space-y-4">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-2xl bg-rose-500/20 text-rose-400 shrink-0">
              <ServerCrash className="w-8 h-8" />
            </div>
            <div className="space-y-1 flex-1">
              <h3 className="text-lg font-bold text-white font-heading">
                Market intelligence is temporarily unavailable
              </h3>
              <p className="text-xs text-slate-300">
                {error}
              </p>
              <p className="text-xs text-slate-400 pt-1">
                Please try again to refresh the latest market signals.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-800">
            <button
              onClick={() => fetchForecast(selectedCrop, selectedLocation)}
              className="px-4 py-2 bg-emerald-500 text-slate-950 font-bold rounded-xl text-xs hover:bg-emerald-400 transition flex items-center gap-2 shadow"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{t('market.retry')}</span>
            </button>

            <button
              onClick={handleActivateDevFallback}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs border border-slate-700 transition flex items-center gap-2"
            >
              <Play className="w-3.5 h-3.5 text-amber-400" />
              <span>{t('market.offline')}</span>
            </button>
          </div>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="glass-card rounded-2xl p-5 border border-slate-800 space-y-3">
              <div className="h-3 bg-slate-800 rounded w-24"></div>
              <div className="h-7 bg-slate-800 rounded w-32"></div>
              <div className="h-3 bg-slate-800/60 rounded w-40"></div>
            </div>
          ))}
        </div>
      )}

      {/* Main Forecast Visuals (Only rendered when forecast is valid) */}
      {!isLoading && forecast && (
        <>
          {/* 4 Metric KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Benchmark Price */}
            <div className="glass-card rounded-2xl p-5 border border-slate-800 hover:border-emerald-500/30 transition">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-xs uppercase tracking-wider font-medium">Current Mandi Price</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  {selectedLocation}
                </span>
              </div>
              <div className="text-3xl font-bold text-white font-heading">
                ₹{forecast.current_price_per_kg.toFixed(2)} <span className="text-xs text-slate-400 font-normal font-sans">/kg</span>
              </div>
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                <span>Prev: ₹{forecast.previous_price_per_kg.toFixed(2)}/kg</span>
                <span className={`font-semibold ${forecast.price_change_percent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  ({forecast.price_change_percent >= 0 ? '+' : ''}{forecast.price_change_percent}%)
                </span>
              </p>
            </div>

            {/* Card 2: Projected 7-Day Change */}
            <div className="glass-card rounded-2xl p-5 border border-slate-800 hover:border-emerald-500/30 transition">
              <div className="text-xs text-slate-400 uppercase tracking-wider mb-1 font-medium">Projected 7-Day Price Trend</div>
              <div className={`text-3xl font-bold font-heading ${forecast.projected7DayChangePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {forecast.projected7DayChangePercent >= 0 ? '+' : ''}{forecast.projected7DayChangePercent}%
              </div>
              <p className="text-xs text-emerald-300 mt-1 flex items-center gap-1">
                <ArrowUpRight className="w-3.5 h-3.5" /> 14-Day Horizon: +{forecast.projected14DayChangePercent}%
              </p>
            </div>

            {/* Card 3: Supply-Demand Gap */}
            <div className="glass-card rounded-2xl p-5 border border-slate-800 hover:border-emerald-500/30 transition">
              <div className="text-xs text-slate-400 uppercase tracking-wider mb-1 font-medium">7-Day Supply-Demand Gap</div>
              <div className={`text-2xl font-bold font-heading ${forecast.supply_demand_gap_kg < 0 ? 'text-amber-400' : 'text-cyan-400'}`}>
                {forecast.supply_demand_gap_tonnes > 0 ? '+' : ''}{forecast.supply_demand_gap_tonnes} <span className="text-xs font-normal font-sans text-slate-300">Tonnes</span>
              </div>
              <p className="text-xs mt-1 text-slate-300">
                {forecast.supply_demand_gap_kg < 0 ? (
                  <span className="text-amber-400 font-semibold">⚡ Deficit (Demand &gt; Supply)</span>
                ) : (
                  <span className="text-cyan-400 font-semibold">📦 Surplus (Supply &gt; Demand)</span>
                )}
              </p>
            </div>

            {/* Card 4: Threat Level & Confidence */}
            <div className="glass-card rounded-2xl p-5 border border-slate-800 hover:border-emerald-500/30 transition">
              <div className="text-xs text-slate-400 uppercase tracking-wider mb-1 font-medium">Market Deficit Risk</div>
              <div className="flex items-center gap-2 mt-0.5">
                <span
                  className={`px-2.5 py-1 rounded-lg text-xs font-extrabold ${forecast.threat_level === 'HIGH'
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse'
                    : forecast.threat_level === 'MEDIUM'
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    }`}
                >
                  {forecast.threat_level} DEFICIT RISK
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Model Confidence: <strong>{Math.round(forecast.confidence * 100)}%</strong></span>
              </p>
            </div>
          </div>

          {/* AI Recommendation Alert Box */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/30 flex items-start gap-3 shadow-lg">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 flex-shrink-0 mt-0.5">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="text-xs space-y-1">
              <span className="font-bold text-white text-sm">Actionable Selling Opportunity:</span>
              <p className="text-slate-300">{forecast.recommendation}</p>
              <div className="text-emerald-400 font-mono text-[11px] pt-1">
                Optimal Consumption Corridor: <strong className="text-white">{forecast.suggested_destination}</strong>
              </div>
            </div>
          </div>

          {/* Recharts 7-Day Price Forecast & Upper/Lower Bands */}
          <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2 font-heading">
                  <TrendingUp className="w-4 h-4 text-emerald-400" /> 7-Day Mandi Price Trajectory & Confidence Bands (₹/kg)
                </h2>
                <p className="text-xs text-slate-400">
                  Forecast with volatility bands.
                </p>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                {selectedCrop} • {selectedLocation} Mandi
              </span>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={forecast.predictions} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="bandGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="date" stroke="#64748b" textAnchor="end" fontSize={11} />
                  <YAxis stroke="#64748b" domain={['dataMin - 3', 'dataMax + 3']} fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '0.75rem',
                      color: '#f8fafc',
                      fontSize: '12px'
                    }}
                    formatter={(value: any, name: string) => [`₹${Number(value).toFixed(2)}/kg`, name]}
                  />
                  <Legend verticalAlign="top" height={36} />
                  <Area
                    type="monotone"
                    dataKey="price_upper_band"
                    name="Upper Band (₹/kg)"
                    stroke="#06b6d4"
                    fillOpacity={1}
                    fill="url(#bandGrad)"
                    strokeDasharray="3 3"
                  />
                  <Area
                    type="monotone"
                    dataKey="predicted_price_per_kg"
                    name="Predicted Price (₹/kg)"
                    stroke="#22c55e"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#priceGrad)"
                  />
                  <Area
                    type="monotone"
                    dataKey="price_lower_band"
                    name="Lower Band (₹/kg)"
                    stroke="#64748b"
                    fill="transparent"
                    strokeDasharray="3 3"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Demand vs Arrival Volume Chart */}
          <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2 font-heading">
                  <Layers className="w-4 h-4 text-cyan-400" /> Regional APMC Inflow vs Urban Consumer Demand (Tonnes/Day)
                </h2>
                <p className="text-xs text-slate-400">
                  When projected demand exceeds arrivals, smallholder micro-cluster pooling captures higher direct realization.
                </p>
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={forecast.predictions} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderColor: '#334155',
                      borderRadius: '0.75rem',
                      color: '#f8fafc',
                      fontSize: '12px'
                    }}
                    formatter={(value: any, name: string) => [`${value} Tonnes`, name]}
                  />
                  <Legend verticalAlign="top" height={36} />
                  <Bar
                    dataKey="historicalArrivalTonnes"
                    name="APMC Arrivals (Tonnes)"
                    fill="#475569"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="projectedDemandTonnes"
                    name="Projected Demand (Tonnes)"
                    fill="#06b6d4"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
