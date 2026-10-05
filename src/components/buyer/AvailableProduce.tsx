import React, { useState } from 'react';
import {
  Sprout,
  Filter,
  Search,
  MapPin,
  Calendar,
  CheckCircle2,
  ShieldCheck,
  TrendingUp,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { CropListing } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';

interface AvailableProduceProps {
  listings: CropListing[];
  isLoading?: boolean;
  onNavigate: (screen: number) => void;
}

export const AvailableProduce: React.FC<AvailableProduceProps> = ({
  listings,
  isLoading = false,
  onNavigate
}) => {
  const { t } = useLanguage();
  const [selectedCropFilter, setSelectedCropFilter] = useState<string>('all');
  const [selectedGradeFilter, setSelectedGradeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredListings = listings.filter((l) => {
    if (selectedCropFilter !== 'all' && l.cropName !== selectedCropFilter) return false;
    if (selectedGradeFilter !== 'all' && l.qualityGrade !== selectedGradeFilter) return false;
    if (searchQuery && !l.cropName.toLowerCase().includes(searchQuery.toLowerCase()) && !l.farmerName.toLowerCase().includes(searchQuery.toLowerCase()) && !l.locationName.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl p-6 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white shadow-lg flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-blue-200 text-xs font-mono mb-1">
            <Sparkles className="w-3.5 h-3.5 text-cyan-300 animate-pulse" />
            <span className="font-semibold uppercase tracking-wider">{t('buyer.freshProduceNearYou')}</span>
          </div>
          <h1 className="text-2xl font-bold font-heading text-white">
            {t('buyer.availableCropListings')}
          </h1>
          <p className="text-xs text-blue-100 mt-1 max-w-xl leading-relaxed">
            {t('buyer.availableProduceDescription')}
          </p>
        </div>

        <button
          onClick={() => onNavigate(10)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition shadow-md"
        >
          <span>{t('buyer.buildSupplyLot')}</span>
          <ArrowRight className="w-4 h-4 text-white" />
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder={t('buyer.searchProducePlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs font-medium"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-600 font-bold">{t('buyer.crop')}:</span>
            <select
              value={selectedCropFilter}
              onChange={(e) => setSelectedCropFilter(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 text-xs font-medium"
            >
              <option value="all">{t('buyer.allCrops')}</option>
              <option value="Tomato">Tomato</option>
              <option value="Onion">Onion</option>
              <option value="Potato">Potato</option>
              <option value="Desi Chana (Bengal Gram)">Desi Chana</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-600 font-bold">{t('buyer.grade')}:</span>
            <select
              value={selectedGradeFilter}
              onChange={(e) => setSelectedGradeFilter(e.target.value)}
              className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900 text-xs font-medium"
            >
              <option value="all">{t('buyer.allGrades')}</option>
              <option value="Grade A">Grade A</option>
              <option value="Grade B">Grade B</option>
              <option value="Grade C">Grade C</option>
            </select>
          </div>
        </div>
      </div>

      {/* Listings Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4 animate-pulse">
              <div className="flex items-start justify-between">
                <div>
                  <div className="h-4 bg-slate-200 rounded w-16 mb-2"></div>
                  <div className="h-5 bg-slate-200 rounded w-28 mb-1"></div>
                  <div className="h-3 bg-slate-100 rounded w-20"></div>
                </div>
                <div className="h-6 bg-slate-200 rounded w-16"></div>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="h-3 bg-slate-200 rounded w-full"></div>
                <div className="h-3 bg-slate-200 rounded w-3/4"></div>
                <div className="h-3 bg-slate-200 rounded w-1/2"></div>
              </div>
              <div className="flex justify-between pt-1">
                <div className="h-4 bg-slate-200 rounded w-24"></div>
                <div className="h-6 bg-slate-200 rounded w-20"></div>
              </div>
            </div>
          ))
        ) : filteredListings.length === 0 ? (
          <div className="col-span-full py-16 text-center bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
            <Sprout className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <p className="text-base font-bold text-slate-800">{t('buyer.noProduceListings')}</p>
            <p className="text-xs text-slate-600 mt-1 max-w-md mx-auto">
              {listings.length === 0
                ? t('buyer.noFarmersListed')
                : t('buyer.noProduceMatches')}
            </p>
            {(selectedCropFilter !== 'all' || selectedGradeFilter !== 'all' || searchQuery) && (
              <button
                onClick={() => {
                  setSelectedCropFilter('all');
                  setSelectedGradeFilter('all');
                  setSearchQuery('');
                }}
                className="mt-4 px-4 py-2 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 text-xs font-bold transition"
              >
                {t('buyer.resetFilters')}
              </button>
            )}
          </div>
        ) : (
          filteredListings.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4 hover:border-blue-400 hover:shadow-md transition overflow-hidden flex flex-col justify-between"
            >
              <div>
                {/* Produce Photo Header if available, or clean fallback */}
                {item.photoUrls && item.photoUrls.length > 0 ? (
                  <div className="mb-3 -mx-5 -mt-5 h-40 overflow-hidden relative bg-slate-100 border-b border-slate-200">
                    <img
                      src={item.photoUrls[0]}
                      alt={item.cropName}
                      className="w-full h-full object-cover hover:scale-105 transition duration-300"
                    />
                    <div className="absolute bottom-2 left-2 bg-slate-900/80 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] text-white font-medium">
                      Fresh Produce Photo
                    </div>
                  </div>
                ) : (
                  <div className="mb-3 -mx-5 -mt-5 h-24 bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-slate-100 flex items-center justify-center gap-2 text-slate-400 text-xs font-medium">
                    <Sprout className="w-5 h-5 text-emerald-600" />
                    <span>No produce photo uploaded</span>
                  </div>
                )}

                <div className="flex items-start justify-between">
                  <div>
                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200 uppercase mb-1">
                      {item.qualityGrade}
                    </span>
                    <h3 className="font-heading font-bold text-slate-900 text-base">{item.cropName}</h3>
                    <span className="text-xs text-emerald-700 font-semibold">{item.variety}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-slate-900 font-mono">{item.quantityKg} kg</span>
                    <span className="text-[10px] text-slate-500 block font-mono font-medium">{(item.quantityKg / 100).toFixed(1)} Qtl</span>
                  </div>
                </div>

                <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>{t('buyer.askingFarmgatePrice')}:</span>
                    <span className="font-bold text-emerald-700 font-mono">₹{item.askingPricePerKg.toFixed(2)}/kg</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>{t('buyer.mandiBenchmark')}:</span>
                    <span className="font-mono text-slate-700 font-medium">₹{item.mandiBenchmarkPrice.toFixed(2)}/kg</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>{t('buyer.farmer')}:</span>
                    <span className="text-slate-900 font-bold">{item.farmerName}</span>
                  </div>
                  {item.phone && (
                    <div className="flex justify-between text-slate-600">
                      <span>Contact:</span>
                      <span className="text-slate-900 font-mono font-semibold">{item.phone}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-600">
                    <span>{t('buyer.location')}:</span>
                    <span className="text-slate-800 font-medium truncate max-w-[150px]">{item.locationName}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-600" /> {t('buyer.ready')} {item.harvestDate}
                </span>
                <button
                  onClick={() => onNavigate(10)}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition shadow-sm"
                >
                  {t('buyer.includeInLot')}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

