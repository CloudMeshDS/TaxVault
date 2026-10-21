import {
  CountryTaxConfig,
  ExpenseCategory,
  ExpenseRecord,
  IncomeRecord,
  SupportedCountry,
  TaxCalculationResult,
} from '../types';

export const NZ_TAX_CONFIG: CountryTaxConfig = {
  countryCode: 'NZ',
  countryName: 'New Zealand',
  flag: '🇳🇿',
  currencyCode: 'NZD',
  currencySymbol: '$',
  taxAuthority: 'Inland Revenue Department (IRD)',
  taxAuthorityWebsite: 'https://www.ird.govt.nz',
  standardGSTRate: 0.15, // 15% GST
  taxYearLabel: '1 April – 31 March (NZ Tax Year)',
  financialYearStart: '04-01',
  financialYearEnd: '03-31',
  nextTaxDeadline: '7 July (without agent) / 31 March (with CA/Agent)',
  complianceForms: [
    { code: 'GST101', name: 'Goods and Services Tax Return', description: 'Two-monthly, monthly or six-monthly filing of GST collected vs paid.' },
    { code: 'IR3', name: 'Individual Income Tax Return', description: 'Annual income tax return for sole traders, freelancers, and contractors.' },
    { code: 'IR10', name: 'Financial Statements Summary', description: 'Summary of business income, expenses, assets, and liabilities.' },
  ],
  regulatoryNotes: [
    'GST registration is mandatory if business turnover exceeds NZ$60,000 in any 12-month period.',
    'Business entertainment is subject to the 50% deduction limitation rule under IRD guidelines.',
    'Low-value assets costing NZ$1,000 or less can be deducted immediately rather than depreciated.',
    'Vehicle expenses can be claimed via logbook percentage or the IRD tier mileage rate ($0.95/km).',
  ],
  vehicleMileageRate: 0.95,
  lowValueAssetWriteOffLimit: 1000,
  entertainmentDeductionRate: 0.50,
};

export const AU_TAX_CONFIG: CountryTaxConfig = {
  countryCode: 'AU',
  countryName: 'Australia',
  flag: '🇦🇺',
  currencyCode: 'AUD',
  currencySymbol: '$',
  taxAuthority: 'Australian Taxation Office (ATO)',
  taxAuthorityWebsite: 'https://www.ato.gov.au',
  standardGSTRate: 0.10, // 10% GST
  taxYearLabel: '1 July – 30 June (Australian Financial Year)',
  financialYearStart: '07-01',
  financialYearEnd: '06-30',
  nextTaxDeadline: '31 October (individual/sole trader) / 15 May (via registered tax agent)',
  complianceForms: [
    { code: 'BAS', name: 'Business Activity Statement', description: 'Quarterly or monthly reporting of GST, PAYG withholding, and PAYG installments.' },
    { code: 'IAS', name: 'Installment Activity Statement', description: 'Monthly reporting for PAYG installments.' },
    { code: 'ITR-B', name: 'Company / Business Tax Return', description: 'Annual tax return for Pty Ltd companies, sole traders, and partnerships.' },
  ],
  regulatoryNotes: [
    'GST registration is compulsory when annual GST turnover reaches or exceeds AU$75,000.',
    'Motor vehicle expenses can be claimed using the cents-per-kilometre method (AU$0.88/km) or logbook method.',
    'Working from home deductions can use the ATO fixed rate method (67c per hour) or actual expense method.',
    'Superannuation guarantee contributions must be made on time to be tax deductible.',
  ],
  vehicleMileageRate: 0.88,
  lowValueAssetWriteOffLimit: 20000,
  entertainmentDeductionRate: 0.0,
};

export const CA_TAX_CONFIG: CountryTaxConfig = {
  countryCode: 'CA',
  countryName: 'Canada',
  flag: '🇨🇦',
  currencyCode: 'CAD',
  currencySymbol: '$',
  taxAuthority: 'Canada Revenue Agency (CRA) / Revenu Québec',
  taxAuthorityWebsite: 'https://www.canada.ca/en/revenue-agency.html',
  standardGSTRate: 0.05, // 5% Federal GST + provincial HST/PST
  taxYearLabel: '1 January – 31 December (Calendar Year)',
  financialYearStart: '01-01',
  financialYearEnd: '12-31',
  nextTaxDeadline: '30 April (general) / 15 June (self-employed business deadline)',
  complianceForms: [
    { code: 'T2125', name: 'Statement of Business or Professional Activities', description: 'Required schedule on Form T1 to report self-employment income & business expenses.' },
    { code: 'GST34', name: 'GST/HST Return for Registrants', description: 'Quarterly or annual reporting of GST/HST collected and Input Tax Credits (ITCs).' },
    { code: 'T2', name: 'Corporation Income Tax Return', description: 'Annual income tax return for Canadian incorporated businesses.' },
  ],
  regulatoryNotes: [
    'Mandatory GST/HST registration if worldwide taxable supplies exceed CA$30,000 in any single quarter.',
    'Food, beverages, and entertainment are 50% deductible under subsection 67.1(1) of the Income Tax Act.',
    'Home office deductions require the workspace to be either your principal place of business or used exclusively on a regular basis.',
    'CRA automobile allowance limit: $0.70/km for the first 5,000 km driven.',
  ],
  vehicleMileageRate: 0.70,
  lowValueAssetWriteOffLimit: 500,
  entertainmentDeductionRate: 0.50,
};

export const US_TAX_CONFIG: CountryTaxConfig = {
  countryCode: 'US',
  countryName: 'United States',
  flag: '🇺🇸',
  currencyCode: 'USD',
  currencySymbol: '$',
  taxAuthority: 'Internal Revenue Service (IRS) & State Dept of Revenue',
  taxAuthorityWebsite: 'https://www.irs.gov',
  standardGSTRate: 0.0, // US has no federal VAT; state/local sales tax 0% - 10.25%
  taxYearLabel: '1 January – 31 December (US Tax Year)',
  financialYearStart: '01-01',
  financialYearEnd: '12-31',
  nextTaxDeadline: '15 April (general tax day) / 15 October (with extension)',
  complianceForms: [
    { code: 'Schedule C', name: 'Profit or Loss From Business (Form 1040)', description: 'Annual reporting of sole proprietorship or single-member LLC income and deductions.' },
    { code: 'Form 8829', name: 'Expenses for Business Use of Your Home', description: 'Calculation of allowable home office deductions (simplified $5/sq ft or regular actual cost).' },
    { code: 'Form 4562', name: 'Depreciation and Amortization (Including Section 179)', description: 'Reporting depreciation and immediate Section 179 expense deductions.' },
  ],
  regulatoryNotes: [
    'Business meals are generally 50% deductible; entertainment expenses are non-deductible under the TCJA.',
    'Standard IRS mileage rate: 67 cents per mile for business use of a vehicle.',
    'Section 179 allows immediate full write-off for qualifying equipment, software, and furniture up to $1,220,000.',
    'Estimated quarterly taxes (Form 1040-ES) are due in April, June, September, and January.',
  ],
  vehicleMileageRate: 0.67,
  lowValueAssetWriteOffLimit: 2500,
  entertainmentDeductionRate: 0.50,
};

export const INDIA_TAX_CONFIG: CountryTaxConfig = {
  countryCode: 'IN',
  countryName: 'India',
  flag: '🇮🇳',
  currencyCode: 'INR',
  currencySymbol: '₹',
  taxAuthority: 'Goods and Services Tax Network (GSTN) / Income Tax Dept',
  taxAuthorityWebsite: 'https://www.gst.gov.in',
  standardGSTRate: 0.18, // 18% standard GST rate in India
  taxYearLabel: '1 April – 31 March (Indian Financial Year)',
  financialYearStart: '04-01',
  financialYearEnd: '03-31',
  nextTaxDeadline: '31 July (Non-audit) / 31 October (Tax audit)',
  complianceForms: [
    { code: 'GSTR-1', name: 'Details of Outward Supplies', description: 'Monthly/quarterly statement of all sales and invoices issued.' },
    { code: 'GSTR-3B', name: 'Self-Declared Summary Return', description: 'Summary of outward supplies, input tax credit claimed, and tax paid.' },
    { code: 'GSTR-2B', name: 'Auto-Drafted ITC Statement', description: 'Static statement showing eligible input tax credit based on vendor filings.' },
    { code: 'ITR-3 / ITR-4', name: 'Income Tax Return (Business & Profession)', description: 'Annual income tax return for proprietors, firms, and professionals.' },
  ],
  regulatoryNotes: [
    'GST registration is mandatory for service providers above ₹20 Lakhs and goods suppliers above ₹40 Lakhs turnover.',
    'ITC on personal meals and employee entertainment is restricted under Section 17(5)(b).',
    'Mixed vehicle and phone expenses can be claimed based on business proportion.',
  ],
  vehicleMileageRate: 14.0,
  lowValueAssetWriteOffLimit: 5000,
  entertainmentDeductionRate: 0.0,
};

export const TAX_CONFIGS: Record<SupportedCountry, CountryTaxConfig> = {
  NZ: NZ_TAX_CONFIG,
  AU: AU_TAX_CONFIG,
  CA: CA_TAX_CONFIG,
  US: US_TAX_CONFIG,
  IN: INDIA_TAX_CONFIG,
};

export interface CategoryInfo {
  category: ExpenseCategory;
  icon: string;
  defaultType: 'Business' | 'Personal' | 'Mixed';
  gstEligibilityHint: 'Likely eligible' | 'Needs review' | 'Not identified';
  description: string;
}

export const ALL_CATEGORIES: CategoryInfo[] = [
  {
    category: 'Office Expenses',
    icon: '🏢',
    defaultType: 'Business',
    gstEligibilityHint: 'Likely eligible',
    description: 'Workstation, office maintenance, consumables',
  },
  {
    category: 'Travel',
    icon: '✈️',
    defaultType: 'Business',
    gstEligibilityHint: 'Likely eligible',
    description: 'Flights, trains, inter-city transport',
  },
  {
    category: 'Hotel & Accommodation',
    icon: '🏨',
    defaultType: 'Business',
    gstEligibilityHint: 'Likely eligible',
    description: 'Lodging during business visits',
  },
  {
    category: 'Food & Meals',
    icon: '🍽️',
    defaultType: 'Mixed',
    gstEligibilityHint: 'Needs review',
    description: 'Working lunches, food delivery, team snacks',
  },
  {
    category: 'Fuel',
    icon: '⛽',
    defaultType: 'Mixed',
    gstEligibilityHint: 'Needs review',
    description: 'Petrol, diesel, CNG for vehicle usage',
  },
  {
    category: 'Vehicle',
    icon: '🚗',
    defaultType: 'Mixed',
    gstEligibilityHint: 'Needs review',
    description: 'Servicing, repairs, toll charges, parking',
  },
  {
    category: 'Internet & Mobile',
    icon: '📶',
    defaultType: 'Business',
    gstEligibilityHint: 'Likely eligible',
    description: 'Broadband, cellular data plans, telecom bills',
  },
  {
    category: 'Software & Subscriptions',
    icon: '💻',
    defaultType: 'Business',
    gstEligibilityHint: 'Likely eligible',
    description: 'SaaS tools, cloud hosting, software licenses',
  },
  {
    category: 'Advertising & Marketing',
    icon: '📢',
    defaultType: 'Business',
    gstEligibilityHint: 'Likely eligible',
    description: 'Google/Meta ads, print flyers, marketing collateral',
  },
  {
    category: 'Professional Services',
    icon: '⚖️',
    defaultType: 'Business',
    gstEligibilityHint: 'Likely eligible',
    description: 'Legal counsel, CA audit fee, consultancy',
  },
  {
    category: 'Rent',
    icon: '🏠',
    defaultType: 'Business',
    gstEligibilityHint: 'Likely eligible',
    description: 'Office, co-working space, or warehouse lease',
  },
  {
    category: 'Electricity',
    icon: '⚡',
    defaultType: 'Business',
    gstEligibilityHint: 'Not identified',
    description: 'Office utility and electricity charges',
  },
  {
    category: 'Equipment',
    icon: '🖥️',
    defaultType: 'Business',
    gstEligibilityHint: 'Likely eligible',
    description: 'Laptops, monitors, machinery, furniture',
  },
  {
    category: 'Office Supplies',
    icon: '📎',
    defaultType: 'Business',
    gstEligibilityHint: 'Likely eligible',
    description: 'Stationery, paper, printer cartridges',
  },
  {
    category: 'Medical',
    icon: '💊',
    defaultType: 'Personal',
    gstEligibilityHint: 'Needs review',
    description: 'Health checkups, pharmacy, emergency medical care',
  },
  {
    category: 'Education & Training',
    icon: '🎓',
    defaultType: 'Business',
    gstEligibilityHint: 'Likely eligible',
    description: 'Workshops, certifications, team skill building',
  },
  {
    category: 'Bank Charges',
    icon: '🏦',
    defaultType: 'Business',
    gstEligibilityHint: 'Likely eligible',
    description: 'Processing fees, merchant gateway fees, interest',
  },
  {
    category: 'Business Entertainment',
    icon: '🤝',
    defaultType: 'Business',
    gstEligibilityHint: 'Needs review',
    description: 'Client dinners, executive events, team offsites',
  },
  {
    category: 'Personal',
    icon: '👤',
    defaultType: 'Personal',
    gstEligibilityHint: 'Not identified',
    description: 'Personal living, groceries, recreation',
  },
  {
    category: 'Other',
    icon: '📦',
    defaultType: 'Business',
    gstEligibilityHint: 'Needs review',
    description: 'Miscellaneous expenses not listed above',
  },
];

export const CATEGORY_MAP: Record<ExpenseCategory, CategoryInfo> = ALL_CATEGORIES.reduce(
  (acc, item) => {
    acc[item.category] = item;
    return acc;
  },
  {} as Record<ExpenseCategory, CategoryInfo>
);

/**
 * Formats a numeric amount using the Indian numbering system (Lakhs and Crores)
 * e.g., 124850 -> ₹1,24,850.00
 */
export function formatINR(amount: number, showDecimals: boolean = false): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return '₹0';
  }

  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);

  const parts = absAmount.toFixed(showDecimals ? 2 : 0).split('.');
  let integerPart = parts[0];
  const decimalPart = parts[1];

  // Indian currency grouping: last 3 digits, then pairs of 2 digits
  let lastThree = integerPart.substring(integerPart.length - 3);
  const otherNumbers = integerPart.substring(0, integerPart.length - 3);
  if (otherNumbers !== '') {
    lastThree = ',' + lastThree;
  }
  const formattedInteger = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree;

  const result = showDecimals && decimalPart ? `${formattedInteger}.${decimalPart}` : formattedInteger;
  return `${isNegative ? '-' : ''}₹${result}`;
}

/**
 * Universal Currency Formatter for NZD, AUD, CAD, USD, and INR
 * Automatically formats standard Western thousands for NZ/AU/CA/US and Lakhs/Crores for India
 */
export function formatCurrency(
  amount: number,
  currencyCode: string = 'NZD',
  currencySymbol: string = '$',
  showDecimals: boolean = true
): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return `${currencySymbol}0${showDecimals ? '.00' : ''}`;
  }

  // Use Indian numbering system for INR
  if (currencyCode === 'INR' || currencySymbol === '₹') {
    return formatINR(amount, showDecimals);
  }

  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);

  const formatted = absAmount.toLocaleString('en-US', {
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  });

  return `${isNegative ? '-' : ''}${currencySymbol}${formatted}`;
}

/**
 * Validates the arithmetic calculations of extracted receipt data across all countries.
 * Subtotal - Discount + Taxes + Round-off = Total
 */
export function validateCalculation(data: {
  subtotal: number;
  discount: number;
  cgst?: number;
  sgst?: number;
  igst?: number;
  cess?: number;
  taxAmount?: number;
  gstAmount?: number;
  salesTaxAmount?: number;
  roundOff?: number;
  amount: number;
}): { isValid: boolean; expectedTotal: number; difference: number; message?: string } {
  const indianTaxes = Number(data.cgst || 0) + Number(data.sgst || 0) + Number(data.igst || 0) + Number(data.cess || 0);
  const generalTaxes = Number(data.taxAmount || data.gstAmount || data.salesTaxAmount || 0);
  const taxes = indianTaxes > 0 ? indianTaxes : generalTaxes;

  const expected = Number(data.subtotal || 0) - Number(data.discount || 0) + taxes + Number(data.roundOff || 0);
  const total = Number(data.amount || 0);

  // If subtotal is zero, we might have only captured total and GST directly
  if (data.subtotal === 0 && total > 0) {
    return { isValid: true, expectedTotal: total, difference: 0 };
  }

  const difference = Math.abs(expected - total);
  // Allow small rounding differences within 1.50
  if (difference <= 1.5) {
    return { isValid: true, expectedTotal: Math.round(expected * 100) / 100, difference };
  }

  return {
    isValid: false,
    expectedTotal: Math.round(expected * 100) / 100,
    difference: Math.round(difference * 100) / 100,
    message: 'Please check the amount. We found a possible calculation mismatch.',
  };
}

/**
 * Compares an incoming receipt against stored expenses to detect duplicates
 */
export function detectDuplicateExpense(
  candidate: {
    merchant: string;
    date: string;
    amount: number;
    invoiceNumber?: string;
  },
  existing: ExpenseRecord[],
  currencySymbol: string = '$'
): { isDuplicate: boolean; matchedExpense?: ExpenseRecord; reason?: string } {
  if (!existing || existing.length === 0) return { isDuplicate: false };

  const normCandidateVendor = candidate.merchant.trim().toLowerCase();
  const normCandidateInvoice = candidate.invoiceNumber?.trim().toLowerCase();

  for (const exp of existing) {
    const normExpVendor = exp.merchant.trim().toLowerCase();
    const normExpInvoice = exp.invoiceNumber?.trim().toLowerCase();

    // 1. Exact invoice number match from same vendor
    if (
      normCandidateInvoice &&
      normExpInvoice &&
      normCandidateInvoice.length > 3 &&
      normCandidateInvoice === normExpInvoice
    ) {
      return {
        isDuplicate: true,
        matchedExpense: exp,
        reason: `An invoice with number "${candidate.invoiceNumber}" already exists.`,
      };
    }

    // 2. Vendor match + Date match + Amount match within 1.00
    const vendorMatches =
      normCandidateVendor === normExpVendor ||
      normCandidateVendor.includes(normExpVendor) ||
      normExpVendor.includes(normCandidateVendor);

    const dateMatches = exp.date === candidate.date;
    const amountMatches = Math.abs(exp.amount - candidate.amount) < 1.0;

    if (vendorMatches && dateMatches && amountMatches) {
      return {
        isDuplicate: true,
        matchedExpense: exp,
        reason: `A receipt from "${exp.merchant}" for ${formatCurrency(exp.amount, exp.currency, currencySymbol)} on ${exp.date} already exists.`,
      };
    }
  }

  return { isDuplicate: false };
}

/**
 * Scans expenses for recurring patterns (e.g. Adobe subscription, Spark/Airtel broadband, rent)
 */
export function detectRecurringExpenses(expenses: ExpenseRecord[]): {
  merchant: string;
  averageAmount: number;
  count: number;
  category: ExpenseCategory;
}[] {
  const grouped: Record<string, ExpenseRecord[]> = {};

  for (const exp of expenses) {
    const key = exp.merchant.trim().toLowerCase();
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(exp);
  }

  const results: {
    merchant: string;
    averageAmount: number;
    count: number;
    category: ExpenseCategory;
  }[] = [];

  for (const key in grouped) {
    const list = grouped[key];
    if (list.length >= 2) {
      const total = list.reduce((sum, item) => sum + item.amount, 0);
      const avg = total / list.length;
      const allClose = list.every(item => Math.abs(item.amount - avg) <= avg * 0.15);

      if (allClose) {
        results.push({
          merchant: list[0].merchant,
          averageAmount: avg,
          count: list.length,
          category: list[0].category,
        });
      }
    }
  }

  return results;
}

/**
 * Computes high-level aggregates for tax dashboard across NZ, AU, CA, US, and India
 */
export function calculateTaxPosition(
  expenses: ExpenseRecord[],
  countryCode: SupportedCountry = 'NZ',
  incomes: IncomeRecord[] = []
): TaxCalculationResult {
  let totalExpenses = 0;
  let activeCount = 0;
  let businessExpenses = 0;
  let personalExpenses = 0;
  let mixedExpenses = 0;
  let claimableBusinessTotal = 0;

  let totalTaxIdentified = 0;
  let cgstTotal = 0;
  let sgstTotal = 0;
  let igstTotal = 0;
  let cessTotal = 0;
  let eligibleGstItc = 0;
  let needsReviewGst = 0;

  for (const exp of expenses) {
    // Ignore soft-deleted / void expenses in financial & tax calculations
    if (exp.status === 'deleted' || exp.isDeleted) continue;

    activeCount += 1;
    totalExpenses += exp.amount;

    if (exp.expenseType === 'Business') {
      businessExpenses += exp.amount;
      claimableBusinessTotal += exp.amount;
    } else if (exp.expenseType === 'Personal') {
      personalExpenses += exp.amount;
    } else {
      // Mixed proportion
      mixedExpenses += exp.amount;
      const claimable = exp.claimableBusinessAmount ?? exp.amount * ((exp.businessPercentage ?? 50) / 100);
      claimableBusinessTotal += claimable;
    }

    const itemCgst = exp.cgst || 0;
    const itemSgst = exp.sgst || 0;
    const itemIgst = exp.igst || 0;
    const itemCess = exp.cess || 0;
    const itemIndianTax = itemCgst + itemSgst + itemIgst + itemCess;
    const itemGeneralTax = exp.taxAmount || exp.gstAmount || exp.salesTaxAmount || (exp.hstAmount || 0) + (exp.pstAmount || 0);

    const itemTax = itemIndianTax > 0 ? itemIndianTax : itemGeneralTax;
    totalTaxIdentified += itemTax;

    cgstTotal += itemCgst;
    sgstTotal += itemSgst;
    igstTotal += itemIgst;
    cessTotal += itemCess;

    if (exp.gstTreatment === 'Likely eligible') {
      eligibleGstItc += itemTax;
    } else if (exp.gstTreatment === 'Needs review') {
      needsReviewGst += itemTax;
    }
  }

  const taxRate = TAX_CONFIGS[countryCode]?.standardGSTRate || 0.15;

  // Income-side figures come only from recorded invoices; nothing is extrapolated from expenses
  const totalGrossIncome = incomes.reduce((sum, inc) => sum + (Number(inc.amount) || 0), 0);
  const totalGstCollected = incomes.reduce((sum, inc) => sum + (Number(inc.gstAmount) || 0), 0);
  const netTaxableIncome = Math.max(0, totalGrossIncome - claimableBusinessTotal);
  const effectiveTaxRate = taxRate > 0 ? taxRate : 0.20;

  return {
    totalExpenses,
    businessExpenses,
    personalExpenses,
    mixedExpenses,
    claimableBusinessTotal,
    totalGstIdentified: totalTaxIdentified,
    cgstTotal,
    sgstTotal,
    igstTotal,
    cessTotal,
    eligibleGstItc,
    needsReviewGst,
    expenseCount: activeCount,

    // Compat metrics for statutory report views
    totalGrossIncome,
    totalDeductibleExpenses: claimableBusinessTotal,
    netTaxableIncome,
    estimatedIncomeTax: netTaxableIncome * effectiveTaxRate,
    effectiveTaxRate,
    totalGstCollected,
    totalGstPaid: totalTaxIdentified,
    netGstPayableOrRefund: totalGstCollected - eligibleGstItc,
    bracketBreakdown: [],
  };
}

export type FiscalQuarter = 'Q1' | 'Q2' | 'Q3' | 'Q4';

export interface QuarterInfo {
  quarter: FiscalQuarter;
  label: string;
  shortLabel: string;
  monthsLabel: string;
  start: string;
  end: string;
  calendarYearStart: number;
  calendarYearEnd: number;
}

export interface QuarterSummaryData {
  quarter: FiscalQuarter;
  info: QuarterInfo;
  expenses: ExpenseRecord[];
  totalExpenses: number;
  claimableBusinessTotal: number;
  totalTaxIdentified: number;
  eligibleGstItc: number;
  expenseCount: number;
  percentageOfAnnual: number;
}

export function getQuarterBounds(
  quarter: FiscalQuarter,
  fyOrYear: string | number,
  country: SupportedCountry
): QuarterInfo {
  let startYear = 2026;
  if (typeof fyOrYear === 'number') {
    startYear = fyOrYear;
  } else {
    startYear = parseInt(fyOrYear.replace(/[^0-9]/g, '').slice(0, 4), 10) || 2026;
  }
  const endYear = startYear + 1;

  if (country === 'AU') {
    // AU Fiscal Year: 1 July – 30 June
    switch (quarter) {
      case 'Q1':
        return {
          quarter: 'Q1',
          label: `Q1 (Jul – Sep ${startYear})`,
          shortLabel: 'Q1',
          monthsLabel: 'Jul – Sep',
          start: `${startYear}-07-01`,
          end: `${startYear}-09-30`,
          calendarYearStart: startYear,
          calendarYearEnd: startYear,
        };
      case 'Q2':
        return {
          quarter: 'Q2',
          label: `Q2 (Oct – Dec ${startYear})`,
          shortLabel: 'Q2',
          monthsLabel: 'Oct – Dec',
          start: `${startYear}-10-01`,
          end: `${startYear}-12-31`,
          calendarYearStart: startYear,
          calendarYearEnd: startYear,
        };
      case 'Q3':
        return {
          quarter: 'Q3',
          label: `Q3 (Jan – Mar ${endYear})`,
          shortLabel: 'Q3',
          monthsLabel: 'Jan – Mar',
          start: `${endYear}-01-01`,
          end: `${endYear}-03-31`,
          calendarYearStart: endYear,
          calendarYearEnd: endYear,
        };
      case 'Q4':
        return {
          quarter: 'Q4',
          label: `Q4 (Apr – Jun ${endYear})`,
          shortLabel: 'Q4',
          monthsLabel: 'Apr – Jun',
          start: `${endYear}-04-01`,
          end: `${endYear}-06-30`,
          calendarYearStart: endYear,
          calendarYearEnd: endYear,
        };
    }
  }

  if (country === 'US' || country === 'CA') {
    // US & CA Tax Year: 1 January – 31 December
    const yr = typeof fyOrYear === 'number' ? fyOrYear : startYear;
    switch (quarter) {
      case 'Q1':
        return {
          quarter: 'Q1',
          label: `Q1 (Jan – Mar ${yr})`,
          shortLabel: 'Q1',
          monthsLabel: 'Jan – Mar',
          start: `${yr}-01-01`,
          end: `${yr}-03-31`,
          calendarYearStart: yr,
          calendarYearEnd: yr,
        };
      case 'Q2':
        return {
          quarter: 'Q2',
          label: `Q2 (Apr – Jun ${yr})`,
          shortLabel: 'Q2',
          monthsLabel: 'Apr – Jun',
          start: `${yr}-04-01`,
          end: `${yr}-06-30`,
          calendarYearStart: yr,
          calendarYearEnd: yr,
        };
      case 'Q3':
        return {
          quarter: 'Q3',
          label: `Q3 (Jul – Sep ${yr})`,
          shortLabel: 'Q3',
          monthsLabel: 'Jul – Sep',
          start: `${yr}-07-01`,
          end: `${yr}-09-30`,
          calendarYearStart: yr,
          calendarYearEnd: yr,
        };
      case 'Q4':
        return {
          quarter: 'Q4',
          label: `Q4 (Oct – Dec ${yr})`,
          shortLabel: 'Q4',
          monthsLabel: 'Oct – Dec',
          start: `${yr}-10-01`,
          end: `${yr}-12-31`,
          calendarYearStart: yr,
          calendarYearEnd: yr,
        };
    }
  }

  // India (IN), New Zealand (NZ), etc.: 1 April – 31 March
  switch (quarter) {
    case 'Q1':
      return {
        quarter: 'Q1',
        label: `Q1 (Apr – Jun ${startYear})`,
        shortLabel: 'Q1',
        monthsLabel: 'Apr – Jun',
        start: `${startYear}-04-01`,
        end: `${startYear}-06-30`,
        calendarYearStart: startYear,
        calendarYearEnd: startYear,
      };
    case 'Q2':
      return {
        quarter: 'Q2',
        label: `Q2 (Jul – Sep ${startYear})`,
        shortLabel: 'Q2',
        monthsLabel: 'Jul – Sep',
        start: `${startYear}-07-01`,
        end: `${startYear}-09-30`,
        calendarYearStart: startYear,
        calendarYearEnd: startYear,
      };
    case 'Q3':
      return {
        quarter: 'Q3',
        label: `Q3 (Oct – Dec ${startYear})`,
        shortLabel: 'Q3',
        monthsLabel: 'Oct – Dec',
        start: `${startYear}-10-01`,
        end: `${startYear}-12-31`,
        calendarYearStart: startYear,
        calendarYearEnd: startYear,
      };
    case 'Q4':
      return {
        quarter: 'Q4',
        label: `Q4 (Jan – Mar ${endYear})`,
        shortLabel: 'Q4',
        monthsLabel: 'Jan – Mar',
        start: `${endYear}-01-01`,
        end: `${endYear}-03-31`,
        calendarYearStart: endYear,
        calendarYearEnd: endYear,
      };
  }
}

export function getAllQuartersForFY(fyOrYear: string | number, country: SupportedCountry): QuarterInfo[] {
  return [
    getQuarterBounds('Q1', fyOrYear, country),
    getQuarterBounds('Q2', fyOrYear, country),
    getQuarterBounds('Q3', fyOrYear, country),
    getQuarterBounds('Q4', fyOrYear, country),
  ];
}

export function getCurrentFiscalQuarter(country: SupportedCountry): FiscalQuarter {
  const now = new Date();
  const month = now.getMonth() + 1; // 1 - 12
  if (country === 'AU') {
    if (month >= 7 && month <= 9) return 'Q1';
    if (month >= 10 && month <= 12) return 'Q2';
    if (month >= 1 && month <= 3) return 'Q3';
    return 'Q4';
  }
  if (country === 'US' || country === 'CA') {
    if (month >= 1 && month <= 3) return 'Q1';
    if (month >= 4 && month <= 6) return 'Q2';
    if (month >= 7 && month <= 9) return 'Q3';
    return 'Q4';
  }
  // IN & NZ: Apr-Jun = Q1, Jul-Sep = Q2, Oct-Dec = Q3, Jan-Mar = Q4
  if (month >= 4 && month <= 6) return 'Q1';
  if (month >= 7 && month <= 9) return 'Q2';
  if (month >= 10 && month <= 12) return 'Q3';
  return 'Q4';
}

export function calculateQuarterlyBreakdown(
  expenses: ExpenseRecord[],
  fyOrYear: string | number,
  country: SupportedCountry
): {
  quarters: QuarterSummaryData[];
  annualTotal: number;
  annualClaimable: number;
  annualTax: number;
  annualCount: number;
} {
  const quarterInfos = getAllQuartersForFY(fyOrYear, country);
  const activeExpenses = expenses.filter(e => e.status !== 'deleted' && !e.isDeleted);

  const quartersData = quarterInfos.map(info => {
    const qExpenses = activeExpenses.filter(e => e.date && e.date >= info.start && e.date <= info.end);
    let totalExpenses = 0;
    let claimableBusinessTotal = 0;
    let totalTaxIdentified = 0;
    let eligibleGstItc = 0;

    for (const exp of qExpenses) {
      totalExpenses += exp.amount;
      if (exp.expenseType === 'Business') {
        claimableBusinessTotal += exp.amount;
      } else if (exp.expenseType === 'Personal') {
        // no claimable
      } else {
        claimableBusinessTotal += exp.claimableBusinessAmount || exp.amount * ((exp.businessPercentage || 50) / 100);
      }

      const itemIndianTax = (exp.cgst || 0) + (exp.sgst || 0) + (exp.igst || 0) + (exp.cess || 0);
      const itemGeneralTax = exp.taxAmount || exp.gstAmount || exp.salesTaxAmount || (exp.hstAmount || 0) + (exp.pstAmount || 0);
      const itemTax = itemIndianTax > 0 ? itemIndianTax : itemGeneralTax;
      totalTaxIdentified += itemTax;

      if (exp.gstTreatment === 'Likely eligible') {
        eligibleGstItc += itemTax;
      }
    }

    return {
      quarter: info.quarter,
      info,
      expenses: qExpenses,
      totalExpenses,
      claimableBusinessTotal,
      totalTaxIdentified,
      eligibleGstItc,
      expenseCount: qExpenses.length,
      percentageOfAnnual: 0,
    };
  });

  const annualTotal = quartersData.reduce((sum, q) => sum + q.totalExpenses, 0);
  const annualClaimable = quartersData.reduce((sum, q) => sum + q.claimableBusinessTotal, 0);
  const annualTax = quartersData.reduce((sum, q) => sum + q.totalTaxIdentified, 0);
  const annualCount = quartersData.reduce((sum, q) => sum + q.expenseCount, 0);

  quartersData.forEach(q => {
    q.percentageOfAnnual = annualTotal > 0 ? (q.totalExpenses / annualTotal) * 100 : 0;
  });

  return {
    quarters: quartersData,
    annualTotal,
    annualClaimable,
    annualTax,
    annualCount,
  };
}
