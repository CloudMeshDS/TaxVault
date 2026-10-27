import React from 'react';
import {
  Calendar,
  Layers,
  Clock,
  ChevronDown,
  Filter,
} from 'lucide-react';
import { SupportedCountry } from '../../types';
import {
  AVAILABLE_FYS,
  AVAILABLE_YEARS,
  MONTHS_LIST,
  PeriodFilterMode,
  PeriodFilterState,
  getPeriodFilterBadgeLabel,
} from '../../services/periodFilterService';
import { FiscalQuarter, getAllQuartersForFY } from '../../services/taxRules';

interface PeriodFilterControlsProps {
  filter: PeriodFilterState;
  onChange: (next: PeriodFilterState) => void;
  country?: SupportedCountry;
  title?: string;
  recordCount?: number;
  showBadge?: boolean;
  className?: string;
}

export const PeriodFilterControls: React.FC<PeriodFilterControlsProps> = ({
  filter,
  onChange,
  country = 'NZ',
  title = 'Date Filter',
  recordCount,
  showBadge = true,
  className = '',
}) => {
  const badgeLabel = getPeriodFilterBadgeLabel(filter, country);
  const quarters = getAllQuartersForFY(filter.selectedQuarterFY, country);

  const handleModeChange = (mode: PeriodFilterMode) => {
    onChange({
      ...filter,
      mode,
      isExpanded: mode !== 'all',
    });
  };

  const toggleExpanded = () => {
    onChange({
      ...filter,
      isExpanded: !filter.isExpanded,
    });
  };

  return (
    <div className={`space-y-2.5 ${className}`}>
      {/* Title & Badge */}
      {(title || recordCount !== undefined || showBadge) && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {title && (
              <span className="text-sm font-medium text-slate-500">
                {title}
              </span>
            )}
            {showBadge && (
              <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full">
                <span>{badgeLabel}</span>
              </span>
            )}
          </div>
          {recordCount !== undefined && (
            <span className="text-sm text-slate-500 font-mono">
              {recordCount} {recordCount === 1 ? 'receipt' : 'receipts'}
            </span>
          )}
        </div>
      )}

      {/* Main Filter Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3 space-y-3">
        {/* Always visible top header bar for Options / Customization toggle */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-slate-900">
            Period
          </span>
          {filter.mode !== 'all' && (
            <button
              type="button"
              onClick={toggleExpanded}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-lg flex items-center gap-1 cursor-pointer transition-colors shadow-2xs shrink-0"
              title="Show or hide detailed date picker options"
            >
              <span>{filter.isExpanded ? 'Hide Options' : 'Options'}</span>
              <ChevronDown
                className={`w-3 h-3 transition-transform ${filter.isExpanded ? 'rotate-180' : ''}`}
              />
            </button>
          )}
        </div>

        {/* Quick One-Tap Filter Mode Pills */}
        <div
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5"
        >
          <button
            type="button"
            onClick={() => handleModeChange('all')}
            className={`h-9 px-3.5 rounded-full text-sm font-medium shrink-0 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              filter.mode === 'all'
                ? 'bg-slate-900 text-slate-50'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <span className="whitespace-nowrap">All Time</span>
          </button>

          <button
            type="button"
            onClick={() => handleModeChange('month')}
            className={`h-9 px-3.5 rounded-full text-sm font-medium shrink-0 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              filter.mode === 'month'
                ? 'bg-slate-900 text-slate-50'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 shrink-0" />
            <span className="whitespace-nowrap">Month</span>
          </button>

          <button
            type="button"
            onClick={() => handleModeChange('quarter')}
            className={`h-9 px-3.5 rounded-full text-sm font-medium shrink-0 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              filter.mode === 'quarter'
                ? 'bg-slate-900 text-slate-50'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5 shrink-0" />
            <span className="whitespace-nowrap">Quarter</span>
          </button>

          <button
            type="button"
            onClick={() => handleModeChange('fy')}
            className={`h-9 px-3.5 rounded-full text-sm font-medium shrink-0 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              filter.mode === 'fy'
                ? 'bg-slate-900 text-slate-50'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <span className="whitespace-nowrap">Financial Year</span>
          </button>

          <button
            type="button"
            onClick={() => handleModeChange('cy')}
            className={`h-9 px-3.5 rounded-full text-sm font-medium shrink-0 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              filter.mode === 'cy'
                ? 'bg-slate-900 text-slate-50'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <span className="whitespace-nowrap">Calendar Year</span>
          </button>

          <button
            type="button"
            onClick={() => handleModeChange('range')}
            className={`h-9 px-3.5 rounded-full text-sm font-medium shrink-0 transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              filter.mode === 'range'
                ? 'bg-slate-900 text-slate-50'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5 shrink-0" />
            <span className="whitespace-nowrap">Date Range</span>
          </button>
        </div>

        {/* Interactive Parameters Drawer */}
        {filter.isExpanded && filter.mode !== 'all' && (
          <div className="pt-2 border-t border-slate-200 animate-in fade-in duration-150 space-y-2">
            {/* Option 1: Month & Year Picker */}
            {filter.mode === 'month' && (
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="space-y-1">
                  <label className="text-xs text-slate-500 uppercase font-bold">Month</label>
                  <select
                    value={filter.selectedMonth}
                    onChange={(e) =>
                      onChange({ ...filter, selectedMonth: parseInt(e.target.value, 10) })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    {MONTHS_LIST.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-500 uppercase font-bold">Year</label>
                  <select
                    value={filter.selectedYear}
                    onChange={(e) =>
                      onChange({ ...filter, selectedYear: parseInt(e.target.value, 10) })
                    }
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    {AVAILABLE_YEARS.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Option 2: Fiscal Quarter Picker */}
            {filter.mode === 'quarter' && (
              <div className="space-y-2 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-500 uppercase font-bold">Quarter</label>
                    <select
                      value={filter.selectedQuarter}
                      onChange={(e) =>
                        onChange({ ...filter, selectedQuarter: e.target.value as FiscalQuarter })
                      }
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 cursor-pointer font-bold"
                    >
                      {quarters.map((q) => (
                        <option key={q.quarter} value={q.quarter}>
                          {q.quarter} · {q.monthsLabel}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-slate-500 uppercase font-bold">Financial Year</label>
                    <select
                      value={filter.selectedQuarterFY}
                      onChange={(e) => onChange({ ...filter, selectedQuarterFY: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-500 cursor-pointer"
                    >
                      {AVAILABLE_FYS.map((fy) => (
                        <option key={fy} value={fy}>
                          {fy}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Quick Quarter pills */}
                <div className="flex items-center gap-1.5 pt-1">
                  {(['Q1', 'Q2', 'Q3', 'Q4'] as FiscalQuarter[]).map((q) => {
                    const qInfo = quarters.find((item) => item.quarter === q);
                    const isSelected = filter.selectedQuarter === q;
                    return (
                      <button
                        key={q}
                        type="button"
                        onClick={() => onChange({ ...filter, selectedQuarter: q })}
                        className={`flex-1 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer text-center ${
                          isSelected
                            ? 'bg-brand text-slate-900 shadow-xs'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        <div>{q}</div>
                        <div
                          className={`text-xs font-normal ${
                            isSelected ? 'text-slate-900 opacity-80' : 'text-slate-500'
                          }`}
                        >
                          {qInfo?.monthsLabel || ''}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Option 3: Financial Year Picker */}
            {filter.mode === 'fy' && (
              <div className="space-y-1 text-xs">
                <label className="text-xs text-slate-500 uppercase font-bold">Select Financial Year</label>
                <select
                  value={filter.selectedFY}
                  onChange={(e) => onChange({ ...filter, selectedFY: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  {AVAILABLE_FYS.map((fy) => (
                    <option key={fy} value={fy}>
                      {fy} {fy === 'FY 2026-27' ? '(Current Financial Year)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Option 4: Calendar Year Picker */}
            {filter.mode === 'cy' && (
              <div className="space-y-1 text-xs">
                <label className="text-xs text-slate-500 uppercase font-bold">Select Calendar Year</label>
                <select
                  value={filter.selectedCY}
                  onChange={(e) => onChange({ ...filter, selectedCY: parseInt(e.target.value, 10) })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  {AVAILABLE_YEARS.map((y) => (
                    <option key={y} value={y}>
                      {y} Calendar Year (1 Jan – 31 Dec {y})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Option 5: Custom Date Range Picker */}
            {filter.mode === 'range' && (
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="space-y-1">
                  <label className="text-xs text-slate-500 uppercase font-bold">Start Date</label>
                  <input
                    type="date"
                    value={filter.customStartDate}
                    onChange={(e) => onChange({ ...filter, customStartDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-500 uppercase font-bold">End Date</label>
                  <input
                    type="date"
                    value={filter.customEndDate}
                    onChange={(e) => onChange({ ...filter, customEndDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
