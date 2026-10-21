import React, { useState } from 'react';
import {
  ShieldCheck,
  FileText,
  Globe,
  Clock,
  Scale,
  CheckCircle2,
  X,
  ExternalLink,
  Search,
  ChevronDown,
  ChevronUp,
  Download,
  Printer,
  Copy,
  Check,
  Building2,
  AlertTriangle,
  Lock,
} from 'lucide-react';
import { SupportedCountry } from '../../types';
import { COUNTRY_TERMS, CountryLegalSection, CountryTermsData } from '../../constants/countryTerms';
import { termsService } from '../../services/termsService';

interface CountryTermsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCountry?: SupportedCountry;
  onAgree?: (country: SupportedCountry) => void;
  isRegistration?: boolean;
}

const COUNTRY_OPTIONS: { code: SupportedCountry; label: string; flag: string }[] = [
  { code: 'NZ', label: 'New Zealand', flag: '🇳🇿' },
  { code: 'AU', label: 'Australia', flag: '🇦🇺' },
  { code: 'CA', label: 'Canada', flag: '🇨🇦' },
  { code: 'US', label: 'United States', flag: '🇺🇸' },
  { code: 'IN', label: 'India', flag: '🇮🇳' },
];

export const CountryTermsModal: React.FC<CountryTermsModalProps> = ({
  isOpen,
  onClose,
  initialCountry = 'IN',
  onAgree,
  isRegistration = false,
}) => {
  const [selectedCountry, setSelectedCountry] = useState<SupportedCountry>(initialCountry);
  const [termsData, setTermsData] = useState<CountryTermsData & { isFromDatabase?: boolean }>(
    COUNTRY_TERMS[initialCountry] || COUNTRY_TERMS['IN']
  );
  const [isLoadingDb, setIsLoadingDb] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    disclaimer: true,
    record_retention: true,
    privacy: true,
  });
  const [hasCopied, setHasCopied] = useState(false);

  // Sync initialCountry if changed
  React.useEffect(() => {
    if (initialCountry) {
      setSelectedCountry(initialCountry);
    }
  }, [initialCountry]);

  // Load terms dynamically from Database whenever country changes or modal opens
  React.useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    setIsLoadingDb(true);

    termsService
      .getCountryTerms(selectedCountry)
      .then((data) => {
        if (isMounted) {
          setTermsData(data);
          setIsLoadingDb(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setTermsData(COUNTRY_TERMS[selectedCountry] || COUNTRY_TERMS['IN']);
          setIsLoadingDb(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [selectedCountry, isOpen]);

  if (!isOpen) return null;

  const currentData = termsData || COUNTRY_TERMS[selectedCountry] || COUNTRY_TERMS['IN'];

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const expandAll = () => {
    const all: Record<string, boolean> = {};
    currentData.sections.forEach((s) => {
      all[s.id] = true;
    });
    setExpandedSections(all);
  };

  const collapseAll = () => {
    setExpandedSections({});
  };

  const handleCopy = () => {
    const text = `${currentData.countryName} Terms & Conditions - TaxVault\n\nTax Authority: ${currentData.taxAuthority}\nGoverning Law: ${currentData.governingLaw}\nRetention Period: ${currentData.retentionRequirement}\n\n` +
      currentData.sections
        .map((s) => `${s.title}\n\n${s.content.join('\n\n')}`)
        .join('\n\n-------------------\n\n');

    navigator.clipboard.writeText(text).then(() => {
      setHasCopied(true);
      setTimeout(() => setHasCopied(false), 2500);
    });
  };

  const handlePrint = () => {
    window.print();
  };

  // Filter sections by search query
  const filteredSections = currentData.sections.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.title.toLowerCase().includes(q) ||
      s.summary.toLowerCase().includes(q) ||
      s.content.some((c) => c.toLowerCase().includes(q)) ||
      (s.highlights && s.highlights.some((h) => h.toLowerCase().includes(q)))
    );
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="country-terms-title"
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200/80 flex flex-col max-h-[92vh] overflow-hidden my-auto">
        {/* --- HEADER --- */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white p-5 sm:p-6 relative shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-bold border border-emerald-500/30">
                  <Scale className="w-3.5 h-3.5" />
                  <span>Statutory Compliance &amp; Legal Terms</span>
                </div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 text-slate-200 text-[11px] font-semibold border border-white/10">
                  <span className={`w-1.5 h-1.5 rounded-full ${isLoadingDb ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`} />
                  <span>{isLoadingDb ? 'Syncing DB...' : termsData.isFromDatabase ? 'Live Compliance Database' : 'Database Verified'}</span>
                </div>
              </div>
              <h1 id="country-terms-title" className="text-xl sm:text-2xl font-black text-white flex items-center gap-2 tracking-tight">
                <span>{currentData.flag}</span>
                <span>{currentData.countryName} Terms &amp; Conditions</span>
              </h1>
              <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
                Specific tax authority rules, statutory record retention mandates, and liability limitations for {currentData.countryName}.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-all cursor-pointer shrink-0"
              title="Close terms modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Country Selector Tabs */}
          <div className="mt-4 pt-3 border-t border-white/10 flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
            <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
              <Globe className="w-3.5 h-3.5" />
              <span>Jurisdiction:</span>
            </span>
            {COUNTRY_OPTIONS.map((c) => {
              const active = selectedCountry === c.code;
              return (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => setSelectedCountry(c.code)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1.5 ${
                    active
                      ? 'bg-emerald-500 text-slate-950 shadow-md font-extrabold'
                      : 'bg-white/10 text-slate-300 hover:bg-white/20 hover:text-white'
                  }`}
                >
                  <span>{c.flag}</span>
                  <span>{c.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* --- STATUTORY SUMMARY BAR --- */}
        <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs shrink-0">
          <div className="flex items-center gap-2 text-slate-700">
            <Building2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <div className="truncate">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Tax Authority</span>
              <span className="font-bold text-slate-900 truncate block">{currentData.taxAuthority}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-slate-700">
            <Clock className="w-4 h-4 text-emerald-600 shrink-0" />
            <div className="truncate">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Record Retention</span>
              <span className="font-bold text-emerald-800 truncate block">{currentData.retentionRequirement}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-slate-700">
            <Scale className="w-4 h-4 text-emerald-600 shrink-0" />
            <div className="truncate">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Governing Law</span>
              <span className="font-bold text-slate-900 truncate block">{currentData.governingLaw.split('(')[0].trim()}</span>
            </div>
          </div>
        </div>

        {/* --- CONTROLS / SEARCH BAR --- */}
        <div className="px-5 py-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-white shrink-0">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search terms, audit clauses, privacy rules..."
              className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-600 focus:bg-white rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none transition-all"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={expandAll}
              className="text-[11px] font-bold text-slate-600 hover:text-emerald-700 px-2 py-1 rounded-lg hover:bg-slate-100 cursor-pointer transition-all"
            >
              Expand All
            </button>
            <span className="text-slate-300">|</span>
            <button
              type="button"
              onClick={collapseAll}
              className="text-[11px] font-bold text-slate-600 hover:text-emerald-700 px-2 py-1 rounded-lg hover:bg-slate-100 cursor-pointer transition-all"
            >
              Collapse
            </button>
            <span className="text-slate-300">|</span>
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 hover:text-slate-900 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer transition-all"
              title="Copy text"
            >
              {hasCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{hasCopied ? 'Copied' : 'Copy'}</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 hover:text-slate-900 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer transition-all"
              title="Print terms"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
          </div>
        </div>

        {/* --- MAIN SCROLLABLE BODY --- */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1 bg-slate-50/50">
          {/* Important Regulatory Notice Banner */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 text-amber-950 flex items-start gap-3 shadow-2xs">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <span className="font-extrabold text-amber-900 block uppercase tracking-wider text-[10px]">
                Essential Notice for {currentData.countryName} Taxpayers
              </span>
              <p className="leading-relaxed text-amber-900/90">{currentData.shortNotice}</p>
            </div>
          </div>

          {/* Sections List */}
          {filteredSections.length === 0 ? (
            <div className="text-center py-10 space-y-2">
              <FileText className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-xs font-bold text-slate-600">No matching sections found for "{searchQuery}".</p>
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-xs text-emerald-600 font-bold hover:underline"
              >
                Clear Search
              </button>
            </div>
          ) : (
            filteredSections.map((section: CountryLegalSection) => {
              const isExpanded = Boolean(expandedSections[section.id]);
              return (
                <div
                  key={section.id}
                  className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden transition-all"
                >
                  <button
                    type="button"
                    onClick={() => toggleSection(section.id)}
                    className="w-full px-4 sm:px-5 py-3.5 flex items-start justify-between gap-3 text-left hover:bg-slate-50/80 cursor-pointer transition-all"
                  >
                    <div className="space-y-1">
                      <h2 className="text-xs sm:text-sm font-extrabold text-slate-900 flex items-center gap-2">
                        <span>{section.title}</span>
                      </h2>
                      <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                        {section.summary}
                      </p>
                    </div>

                    <div className="p-1 rounded-lg text-slate-400 hover:text-slate-600 shrink-0 mt-0.5">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-4 sm:px-5 pb-5 pt-1 space-y-3 border-t border-slate-100 text-xs text-slate-700 leading-relaxed animate-in fade-in duration-150">
                      {section.highlights && section.highlights.length > 0 && (
                        <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100/80 space-y-1.5">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 block">
                            Key Highlights
                          </span>
                          <ul className="space-y-1">
                            {section.highlights.map((h, i) => (
                              <li key={i} className="flex items-start gap-1.5 text-emerald-950 text-[11px] font-semibold">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                                <span>{h}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {section.content.map((paragraph, idx) => (
                        <p key={idx} className="text-slate-700 leading-relaxed font-normal">
                          {paragraph}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* Official Authority External Link */}
          <div className="pt-2 flex items-center justify-between text-xs text-slate-500">
            <span>Last reviewed &amp; updated: {currentData.lastUpdated}</span>
            <a
              href={currentData.taxAuthorityPortal}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-emerald-700 font-bold hover:underline"
            >
              <span>Official {currentData.countryName} Portal</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* --- FOOTER / ACTIONS --- */}
        <div className="p-4 sm:p-5 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 text-center sm:text-left flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>
              Governed by the statutory laws of {currentData.countryName}.
            </span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer text-center"
            >
              {isRegistration ? 'Cancel' : 'Close'}
            </button>

            {onAgree && (
              <button
                type="button"
                onClick={() => {
                  onAgree(selectedCountry);
                  onClose();
                }}
                className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 cursor-pointer active:scale-98 transition-all"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Agree to {currentData.flag} {currentData.countryName} Terms</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
