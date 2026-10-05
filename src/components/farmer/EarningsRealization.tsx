import React, { useState } from 'react';
import { TrendingUp, Sparkles, Calculator } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { useLanguage } from '../../i18n/LanguageContext';

export const EarningsRealization: React.FC = () => {
  const { t } = useLanguage();
  const [harvestWeight, setHarvestWeight] = useState<number>(650);
  const traditionalGrossPerKg = 19.0;
  const apmcCommissionPerKg = 1.52;
  const middlemanCutsPerKg = 1.14;
  const unpooledTransportPerKg = 2.20;
  const traditionalNetPerKg = traditionalGrossPerKg - apmcCommissionPerKg - middlemanCutsPerKg - unpooledTransportPerKg;
  const traditionalTotalEarnings = Math.round(traditionalNetPerKg * harvestWeight);
  const agrilinkGrossPerKg = 29.50;
  const agrilinkPooledTransportPerKg = 1.80;
  const agrilinkPerishabilityDecayPerKg = 0.15;
  const agrilinkHandlingPerKg = 0.20;
  const agrilinkNetPerKg = agrilinkGrossPerKg - agrilinkPooledTransportPerKg - agrilinkPerishabilityDecayPerKg - agrilinkHandlingPerKg;
  const agrilinkTotalEarnings = Math.round(agrilinkNetPerKg * harvestWeight);
  const extraNetIncome = agrilinkTotalEarnings - traditionalTotalEarnings;
  const netGainPercentage = Number((((agrilinkNetPerKg - traditionalNetPerKg) / traditionalNetPerKg) * 100).toFixed(1));
  const comparisonData = [
    { category: 'Net Earnings / kg', 'Traditional APMC Mandi': traditionalNetPerKg, 'AgriLink Direct AI': agrilinkNetPerKg },
    { category: 'Transport Cost / kg', 'Traditional APMC Mandi': unpooledTransportPerKg, 'AgriLink Direct AI': agrilinkPooledTransportPerKg },
    { category: 'Intermediary Deductions / kg', 'Traditional APMC Mandi': apmcCommissionPerKg + middlemanCutsPerKg, 'AgriLink Direct AI': 0.0 },
  ];
  return (
    <div className="space-y-6">
      <div className="rounded-2xl p-6 bg-gradient-to-r from-emerald-950/70 via-slate-900 to-slate-950 border border-emerald-500/30 flex flex-col md:flex-row items-center justify-between gap-4"><div><div className="flex items-center gap-2 text-emerald-400 text-xs font-mono mb-1"><Sparkles className="w-3.5 h-3.5" /><span>{t('nav.earnings')}</span></div><h1 className="text-2xl font-bold font-heading text-white">{t('earnings.title')}</h1><p className="text-xs text-slate-300 mt-1 max-w-xl">{t('earnings.description')}</p></div><div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-right"><span className="text-[10px] text-emerald-300 uppercase tracking-wider block font-bold">{t('earnings.realizedGain')}</span><span className="text-2xl font-extrabold text-white font-heading">+{netGainPercentage}%</span></div></div>
      <div className="glass-panel rounded-2xl p-6 border border-slate-800"><div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3"><label className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2"><Calculator className="w-4 h-4 text-emerald-400" />{t('earnings.simulateWeight')}</label><span className="text-emerald-400 font-mono font-bold text-sm bg-slate-900 px-3 py-1 rounded-lg border border-slate-800">{harvestWeight} kg</span></div><input type="range" min="100" max="5000" step="50" value={harvestWeight} onChange={(e) => setHarvestWeight(Number(e.target.value))} className="w-full accent-emerald-500 cursor-pointer" /></div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-card rounded-2xl p-6 border border-rose-500/20 space-y-4"><div className="border-b border-slate-800 pb-3"><span className="p-2 rounded-lg bg-rose-500/10 text-rose-400 font-bold text-xs">{t('earnings.traditional')}</span><h3 className="font-heading font-bold text-white text-base mt-2">{t('earnings.traditional')}</h3></div><div className="space-y-2 text-xs"><div className="flex justify-between"><span>{t('earnings.grossMarket')}</span><span>₹{traditionalGrossPerKg.toFixed(2)}/kg</span></div><div className="flex justify-between text-rose-400"><span>{t('earnings.commission')}</span><span>-₹{apmcCommissionPerKg.toFixed(2)}/kg</span></div><div className="flex justify-between text-rose-400"><span>{t('earnings.middleman')}</span><span>-₹{middlemanCutsPerKg.toFixed(2)}/kg</span></div><div className="flex justify-between text-rose-400"><span>{t('earnings.unpooledTransport')}</span><span>-₹{unpooledTransportPerKg.toFixed(2)}/kg</span></div><div className="pt-3 border-t border-slate-800 flex justify-between font-bold"><span>{t('earnings.trueNet')}</span><span>₹{traditionalNetPerKg.toFixed(2)}/kg</span></div></div><div className="p-4 rounded-xl bg-slate-950/80 text-center"><span className="text-[11px] block uppercase">{t('earnings.totalTakeHome')} {harvestWeight} kg</span><span className="text-2xl font-bold">₹{traditionalTotalEarnings.toLocaleString()}</span></div></div>
        <div className="glass-card rounded-2xl p-6 border border-emerald-500/40 space-y-4"><div className="border-b border-slate-800 pb-3"><span className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 font-bold text-xs">{t('earnings.directNetwork')}</span><h3 className="font-heading font-bold text-white text-base mt-2">{t('earnings.directNetwork')}</h3></div><div className="space-y-2 text-xs"><div className="flex justify-between"><span>{t('earnings.directOffer')}</span><span>₹{agrilinkGrossPerKg.toFixed(2)}/kg</span></div><div className="flex justify-between"><span>{t('earnings.pooledTransport')}</span><span>-₹{agrilinkPooledTransportPerKg.toFixed(2)}/kg</span></div><div className="flex justify-between"><span>{t('earnings.decay')}</span><span>-₹{agrilinkPerishabilityDecayPerKg.toFixed(2)}/kg</span></div><div className="flex justify-between"><span>{t('earnings.handling')}</span><span>-₹{agrilinkHandlingPerKg.toFixed(2)}/kg</span></div><div className="pt-3 border-t border-slate-800 flex justify-between font-bold"><span>{t('earnings.trueNet')}</span><span>₹{agrilinkNetPerKg.toFixed(2)}/kg</span></div></div><div className="p-4 rounded-xl bg-emerald-950/50 text-center"><span className="text-[11px] block uppercase">{t('earnings.totalTakeHome')} {harvestWeight} kg</span><span className="text-2xl font-extrabold">₹{agrilinkTotalEarnings.toLocaleString()}</span><div className="text-xs font-semibold mt-1">{t('earnings.extraIncome')} <strong>+₹{extraNetIncome.toLocaleString()}</strong></div></div></div>
      </div>
      <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4"><h2 className="text-base font-bold text-white flex items-center gap-2 font-heading"><TrendingUp className="w-4 h-4 text-emerald-400" />{t('earnings.comparison')}</h2><div className="h-64 w-full"><ResponsiveContainer width="100%" height="100%"><BarChart data={comparisonData}><CartesianGrid strokeDasharray="3 3" stroke="#1e293b" /><XAxis dataKey="category" stroke="#64748b" fontSize={11} /><YAxis stroke="#64748b" fontSize={11} /><Tooltip /><Legend verticalAlign="top" height={36} /><Bar dataKey="Traditional APMC Mandi" fill="#f43f5e" /><Bar dataKey="AgriLink Direct AI" fill="#22c55e" /></BarChart></ResponsiveContainer></div></div>
    </div>
  );
};
