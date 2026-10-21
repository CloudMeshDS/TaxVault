import { ExpenseRecord, SupportedCountry, TaxCalculationResult } from '../types';
import {
  FiscalQuarter,
  getQuarterBounds,
  getAllQuartersForFY,
  getCurrentFiscalQuarter,
  calculateTaxPosition,
  QuarterInfo,
} from './taxRules';

export type PeriodFilterMode = 'all' | 'month' | 'quarter' | 'fy' | 'cy' | 'range';

export interface PeriodFilterState {
  mode: PeriodFilterMode;
  selectedMonth: number;
  selectedYear: number;
  selectedQuarter: FiscalQuarter;
  selectedQuarterFY: string;
  selectedFY: string;
  selectedCY: number;
  customStartDate: string;
  customEndDate: string;
  isExpanded?: boolean;
}

export const MONTHS_LIST = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

export const AVAILABLE_YEARS = [2027, 2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019];
export const AVAILABLE_FYS = ['FY 2026-27', 'FY 2025-26', 'FY 2024-25', 'FY 2023-24'];

export function createDefaultPeriodFilterState(country?: SupportedCountry, financialYear?: string): PeriodFilterState {
  const now = new Date();
  return {
    mode: 'all',
    selectedMonth: now.getMonth() + 1,
    selectedYear: now.getFullYear(),
    selectedQuarter: getCurrentFiscalQuarter(country || 'NZ'),
    selectedQuarterFY: financialYear || 'FY 2026-27',
    selectedFY: financialYear || 'FY 2026-27',
    selectedCY: now.getFullYear(),
    customStartDate: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`,
    customEndDate: now.toISOString().split('T')[0],
    isExpanded: false,
  };
}

export function parseDateToISO(dateStr?: string): string {
  if (!dateStr) return '';
  const trimmed = dateStr.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  // DD/MM/YYYY or DD-MM-YYYY
  const dmy = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmy) {
    return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
  }

  // YYYY/MM/DD
  const ymd = trimmed.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (ymd) {
    return `${ymd[1]}-${ymd[2].padStart(2, '0')}-${ymd[3].padStart(2, '0')}`;
  }

  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }
  return trimmed;
}

export function getFYBounds(fy: string, country: SupportedCountry): { start: string; end: string } {
  const startYear = parseInt(fy.replace(/[^0-9]/g, '').slice(0, 4), 10) || 2026;
  const endYear = startYear + 1;

  if (country === 'AU') {
    return {
      start: `${startYear}-07-01`,
      end: `${endYear}-06-30`,
    };
  }

  // NZ, IN, CA default: 1 April to 31 March
  return {
    start: `${startYear}-04-01`,
    end: `${endYear}-03-31`,
  };
}

export function getCYBounds(year: number): { start: string; end: string } {
  return {
    start: `${year}-01-01`,
    end: `${year}-12-31`,
  };
}

export function getMonthBounds(year: number, month: number): { start: string; end: string } {
  const mStr = String(month).padStart(2, '0');
  const daysInMonth = new Date(year, month, 0).getDate();
  return {
    start: `${year}-${mStr}-01`,
    end: `${year}-${mStr}-${String(daysInMonth).padStart(2, '0')}`,
  };
}

export function getPeriodFilterBadgeLabel(
  filter: PeriodFilterState,
  country: SupportedCountry = 'NZ'
): string {
  if (filter.mode === 'month') {
    const m = MONTHS_LIST.find((item) => item.value === filter.selectedMonth)?.label || 'Month';
    return `${m} ${filter.selectedYear}`;
  }
  if (filter.mode === 'quarter') {
    const bounds = getQuarterBounds(filter.selectedQuarter, filter.selectedQuarterFY, country);
    return `${bounds.shortLabel} ${filter.selectedQuarterFY} (${bounds.monthsLabel})`;
  }
  if (filter.mode === 'fy') {
    return filter.selectedFY;
  }
  if (filter.mode === 'cy') {
    return `CY ${filter.selectedCY}`;
  }
  if (filter.mode === 'range') {
    if (filter.customStartDate && filter.customEndDate) {
      return `${filter.customStartDate} → ${filter.customEndDate}`;
    }
    return 'Custom Range';
  }
  return 'All Time';
}

export function filterExpensesByPeriod(
  expenses: ExpenseRecord[],
  filter: PeriodFilterState,
  country: SupportedCountry = 'NZ'
): ExpenseRecord[] {
  return expenses.filter((exp) => {
    if (exp.status === 'deleted' || exp.isDeleted) return false;
    if (filter.mode === 'all') return true;
    if (!exp.date) return true;

    const expIso = parseDateToISO(exp.date);
    if (!expIso) return true;

    if (filter.mode === 'month') {
      const bounds = getMonthBounds(filter.selectedYear, filter.selectedMonth);
      return expIso >= bounds.start && expIso <= bounds.end;
    }

    if (filter.mode === 'quarter') {
      const bounds = getQuarterBounds(filter.selectedQuarter, filter.selectedQuarterFY, country);
      return expIso >= bounds.start && expIso <= bounds.end;
    }

    if (filter.mode === 'fy') {
      const bounds = getFYBounds(filter.selectedFY, country);
      return expIso >= bounds.start && expIso <= bounds.end;
    }

    if (filter.mode === 'cy') {
      const bounds = getCYBounds(filter.selectedCY);
      return expIso >= bounds.start && expIso <= bounds.end;
    }

    if (filter.mode === 'range') {
      if (filter.customStartDate && expIso < filter.customStartDate) return false;
      if (filter.customEndDate && expIso > filter.customEndDate) return false;
      return true;
    }

    return true;
  });
}
