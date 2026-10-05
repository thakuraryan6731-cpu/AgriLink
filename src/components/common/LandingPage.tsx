import React from 'react';
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Leaf,
  MapPin,
  Package,
  Sprout,
  Truck,
  Users,
} from 'lucide-react';
import { LANGUAGE_OPTIONS } from '../../i18n/translations';
import { useLanguage } from '../../i18n/LanguageContext';

interface LandingPageProps {
  onSignIn: () => void;
}

const portals = [
  {
    titleKey: 'landing.farmer',
    descriptionKey: 'landing.farmerDescription',
    icon: Sprout,
    accent: 'bg-[#e4f3e5] text-brand-700',
  },
  {
    titleKey: 'landing.buyer',
    descriptionKey: 'landing.buyerDescription',
    icon: Users,
    accent: 'bg-[#edf0ff] text-[#4b52a4]',
  },
  {
    titleKey: 'landing.logistics',
    descriptionKey: 'landing.logisticsDescription',
    icon: Truck,
    accent: 'bg-[#fff2df] text-[#b36b17]',
  },
  {
    titleKey: 'landing.doca',
    descriptionKey: 'landing.docaDescription',
    icon: BarChart3,
    accent: 'bg-[#f1eaff] text-[#7049a6]',
  },
];

const workflow = ['landing.farmer', 'landing.aiAnalysis', 'landing.buyerMatching', 'landing.aggregation', 'landing.routePlanning', 'landing.directDelivery'];

export const LandingPage: React.FC<LandingPageProps> = ({ onSignIn }) => {
  const { language, setLanguage, t } = useLanguage();
  const scrollToPortals = () => {
    document.getElementById('portals')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
  <div className="min-h-screen overflow-x-hidden bg-[#f7faf6] text-[#183126]">
    <header className="max-w-7xl mx-auto px-4 sm:px-6 py-5 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center">
          <Sprout className="w-5 h-5 text-white" />
        </div>
        <span className="font-heading font-extrabold text-xl">
          AgriLink <span className="text-brand-600">AI</span>
        </span>
      </div>
      <div className="flex items-center gap-2">
        <select value={language} onChange={(e) => setLanguage(e.target.value as 'en' | 'hi' | 'mr')} aria-label={t('common.chooseLanguage')} className="max-w-[7rem] rounded-lg border border-[#cfe0d0] bg-white px-2 py-2 text-xs font-semibold text-[#376343]">
          {LANGUAGE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <button onClick={onSignIn} className="cursor-pointer rounded-lg border border-[#cfe0d0] px-4 py-2 text-sm font-semibold text-[#376343] hover:bg-white active:bg-[#e4f3e5] focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2">
          {t('common.signIn')}
        </button>
      </div>
    </header>

    <main>
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-10 sm:pt-12 pb-14 sm:pb-16 lg:pt-20 grid lg:grid-cols-[1.05fr_.95fr] gap-10 lg:gap-12 items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-[#e4f3e5] px-3 py-1.5 text-xs font-semibold text-brand-700 mb-6">
            <Leaf className="w-3.5 h-3.5" /> {t('landing.badge')}
          </div>
          <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.05] text-[#183126]">
            {t('landing.title')}
          </h1>
          <p className="mt-6 max-w-xl text-base sm:text-lg leading-relaxed text-[#5a7160]">
            {t('landing.description')}
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <button onClick={scrollToPortals} className="cursor-pointer inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-brand-600/20 hover:bg-brand-700 active:bg-brand-800 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2">
              {t('landing.explore')} <ArrowRight className="w-4 h-4" />
            </button>
            <button onClick={scrollToPortals} className="cursor-pointer rounded-lg border border-[#cfe0d0] bg-white px-5 py-3 text-sm font-semibold text-[#376343] hover:bg-[#f7faf6] active:bg-[#e4f3e5] focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2">
              {t('landing.choosePortal')}
            </button>
          </div>
        </div>
        <div className="relative min-w-0 rounded-3xl bg-[#dceedd] p-4 sm:p-8">
          <div className="min-w-0 rounded-2xl bg-white p-4 sm:p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#edf2ed] pb-5">
              <div className="min-w-0">
                <p className="text-xs text-[#769078]">{t('landing.todayNetwork')}</p>
                <p className="mt-1 text-xl sm:text-2xl font-bold text-[#183126]">{t('landing.connectedHarvest')}</p>
              </div>
              <div className="rounded-xl bg-[#e4f3e5] p-3 text-brand-600"><BarChart3 className="w-6 h-6" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-5">
              <div className="rounded-xl bg-[#f7faf6] p-4"><Sprout className="w-5 h-5 text-brand-600" /><p className="mt-4 text-2xl font-bold">2,480</p><p className="text-xs text-[#769078]">{t('landing.farmsConnected')}</p></div>
              <div className="rounded-xl bg-[#f7faf6] p-4"><Truck className="w-5 h-5 text-[#d88d31]" /><p className="mt-4 text-2xl font-bold">96%</p><p className="text-xs text-[#769078]">{t('landing.onTimeDeliveries')}</p></div>
            </div>
            <div className="mt-3 flex items-start gap-3 rounded-xl border border-[#e1ebe1] p-3 sm:p-4">
              <MapPin className="w-5 h-5 text-brand-600" />
              <div className="min-w-0"><p className="text-sm font-semibold">{t('landing.freshProduce')}</p><p className="text-xs text-[#769078]">{t('landing.transparentConnections')}</p></div>
              <CheckCircle2 className="ml-auto w-5 h-5 text-brand-600" />
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-[#e5eee5] bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-14">
          <p className="text-center text-sm font-semibold text-brand-600">{t('landing.workflow')}</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {workflow.map((step, index) => (
              <React.Fragment key={step}>
                <div className="rounded-full border border-[#dce8dd] bg-[#f7faf6] px-4 py-2 text-sm font-semibold text-[#376343]">{t(step)}</div>
                {index < workflow.length - 1 && <ArrowRight className="hidden sm:block w-4 h-4 text-[#a2b8a5]" />}
              </React.Fragment>
            ))}
          </div>
        </div>
      </section>

      <section id="portals" className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16 scroll-mt-6">
        <p className="text-center text-sm font-semibold text-brand-600">{t('landing.stakeholders')}</p>
        <h2 className="mt-2 text-center font-heading text-3xl font-bold">{t('landing.workspaceForRole')}</h2>
        <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {portals.map(({ titleKey, descriptionKey, icon: Icon, accent }) => {
            const title = t(titleKey);
            return (
            <div key={titleKey} className="rounded-2xl border border-[#e1ebe1] bg-white p-5 sm:p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${accent}`}><Icon className="w-5 h-5" /></div>
              <h3 className="mt-5 font-heading text-lg font-bold">{title}</h3>
              <p className="mt-2 min-h-[72px] text-sm leading-relaxed text-[#647a68]">{t(descriptionKey)}</p>
              <button onClick={onSignIn} className="cursor-pointer mt-5 inline-flex items-center gap-1 rounded text-sm font-bold text-brand-700 hover:text-brand-900 active:text-brand-950 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2">
                {t('landing.enterPortal', { role: title })} <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            );
          })}
        </div>
      </section>

      <section className="border-y border-[#e5eee5] bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-14">
          <h2 className="text-center font-heading text-3xl font-bold">{t('landing.intelligence')}</h2>
          <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-5 gap-5">
            {[
              ['landing.directConnection', 'landing.directConnectionDescription', Users],
              ['landing.aiMatching', 'landing.aiMatchingDescription', BarChart3],
              ['landing.supplyAggregation', 'landing.supplyAggregationDescription', Package],
              ['landing.routePlanning', 'landing.routePlanningDescription', Truck],
              ['landing.transparentRealization', 'landing.transparentRealizationDescription', CheckCircle2],
            ].map(([title, description, Icon]) => {
              const BenefitIcon = Icon as React.ElementType;
              return <div key={title as string} className="rounded-2xl bg-[#f7faf6] p-5"><BenefitIcon className="w-6 h-6 text-brand-600" /><h3 className="mt-4 font-bold">{t(title as string)}</h3><p className="mt-2 text-sm leading-relaxed text-[#647a68]">{t(description as string)}</p></div>;
            })}
          </div>
        </div>
      </section>
    </main>

    <footer className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row justify-between gap-3 text-xs text-[#769078]">
      <span className="font-semibold text-[#376343]">AgriLink AI</span>
      <span>Farm-to-Market Intelligence Platform</span>
    </footer>
  </div>
  );
};
