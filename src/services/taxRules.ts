import { CountryTaxConfig, SupportedCountry, TaxCalculationResult } from '../types';

export const TAX_CONFIGS: Record<SupportedCountry, CountryTaxConfig> = {
  NZ: {
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
    nextTaxDeadline: '2027-03-31',
    // Current NZ individual tax brackets (post-2024 tax threshold adjustments)
    taxBrackets: [
      { min: 0, max: 15600, rate: 0.105 },
      { min: 15600, max: 53500, rate: 0.175 },
      { min: 53500, max: 78100, rate: 0.30 },
      { min: 78100, max: 180000, rate: 0.33 },
      { min: 180000, max: null, rate: 0.39 },
    ],
    complianceForms: [
      { code: 'IR3', name: 'Individual Income Tax Return', description: 'Annual return for sole traders, freelancers, contractors, and individuals with untaxed income.' },
      { code: 'IR10', name: 'Financial Accounts Summary', description: 'Summarises profit/loss statement and balance sheet items for IRD audit.' },
      { code: 'GST101A', name: 'Goods and Services Tax Return', description: 'Calculates GST collected on sales minus GST paid on business expenses.' },
      { code: 'IR348 / IR345', name: 'Employer Monthly Schedule / PAYE', description: 'For small business employers reporting wages and PAYE deductions.' },
    ],
    regulatoryNotes: [
      'GST registration is mandatory if gross annual turnover exceeds NZ$60,000.',
      'Entertainment expenses (food, client drinks) are subject to the 50% deductibility rule.',
      'Low-value asset threshold: assets under NZ$1,000 can be fully expensed immediately rather than depreciated.',
      'Motor vehicle claims: IRD allows Tier 1 mileage rate ($1.04/km) up to 14,000 km, or a documented logbook ratio.',
      'Home office deduction: proportional calculation based on square metre area used exclusively for business.',
    ],
    vehicleMileageRate: 1.04, // IRD Tier 1 km rate
    lowValueAssetWriteOffLimit: 1000,
    entertainmentDeductionRate: 0.50,
  },

  AU: {
    countryCode: 'AU',
    countryName: 'Australia',
    flag: '🇦🇺',
    currencyCode: 'AUD',
    currencySymbol: '$',
    taxAuthority: 'Australian Taxation Office (ATO)',
    taxAuthorityWebsite: 'https://www.ato.gov.au',
    standardGSTRate: 0.10, // 10% GST
    taxYearLabel: '1 July – 30 June (AU Financial Year)',
    financialYearStart: '07-01',
    financialYearEnd: '06-30',
    nextTaxDeadline: '2027-10-31',
    taxBrackets: [
      { min: 0, max: 18200, rate: 0.0 },
      { min: 18200, max: 45000, rate: 0.16 },
      { min: 45000, max: 135000, rate: 0.30 },
      { min: 135000, max: 190000, rate: 0.37 },
      { min: 190000, max: null, rate: 0.45 },
    ],
    complianceForms: [
      { code: 'BAS', name: 'Business Activity Statement', description: 'Periodic reporting of GST, PAYG withholding, and PAYG instalments.' },
      { code: 'Individual Tax Return', name: 'Form I', description: 'Annual personal income tax return including business schedules.' },
    ],
    regulatoryNotes: [
      'GST registration required if turnover is AU$75,000 or more.',
      'Instant asset write-off applies for eligible small business purchases.',
      'Superannuation guarantee rate applies to eligible contractor labor.',
    ],
    vehicleMileageRate: 0.88,
    lowValueAssetWriteOffLimit: 20000,
    entertainmentDeductionRate: 0.0,
  },

  UK: {
    countryCode: 'UK',
    countryName: 'United Kingdom',
    flag: '🇬🇧',
    currencyCode: 'GBP',
    currencySymbol: '£',
    taxAuthority: 'HM Revenue & Customs (HMRC)',
    taxAuthorityWebsite: 'https://www.gov.uk/government/organisations/hm-revenue-customs',
    standardGSTRate: 0.20, // 20% VAT
    taxYearLabel: '6 April – 5 April (UK Tax Year)',
    financialYearStart: '04-06',
    financialYearEnd: '04-05',
    nextTaxDeadline: '2027-01-31',
    taxBrackets: [
      { min: 0, max: 12570, rate: 0.0 },
      { min: 12570, max: 50270, rate: 0.20 },
      { min: 50270, max: 125140, rate: 0.40 },
      { min: 125140, max: null, rate: 0.45 },
    ],
    complianceForms: [
      { code: 'SA100', name: 'Self Assessment Tax Return', description: 'Annual tax return for self-employed, sole traders, and partners.' },
      { code: 'VAT100', name: 'VAT Return', description: 'Quarterly digital VAT return submitted through MTD-compatible software.' },
    ],
    regulatoryNotes: [
      'VAT registration threshold is £90,000 taxable turnover.',
      'Making Tax Digital (MTD) requires digital recordkeeping and API submission.',
    ],
    vehicleMileageRate: 0.45,
    lowValueAssetWriteOffLimit: 1000,
    entertainmentDeductionRate: 0.0,
  },

  US: {
    countryCode: 'US',
    countryName: 'United States',
    flag: '🇺🇸',
    currencyCode: 'USD',
    currencySymbol: '$',
    taxAuthority: 'Internal Revenue Service (IRS)',
    taxAuthorityWebsite: 'https://www.irs.gov',
    standardGSTRate: 0.07, // Weighted average sales tax
    taxYearLabel: '1 January – 31 December (Calendar Year)',
    financialYearStart: '01-01',
    financialYearEnd: '12-31',
    nextTaxDeadline: '2027-04-15',
    taxBrackets: [
      { min: 0, max: 11600, rate: 0.10 },
      { min: 11600, max: 47150, rate: 0.12 },
      { min: 47150, max: 100525, rate: 0.22 },
      { min: 100525, max: 191950, rate: 0.24 },
      { min: 191950, max: 243725, rate: 0.32 },
      { min: 243725, max: 609350, rate: 0.35 },
      { min: 609350, max: null, rate: 0.37 },
    ],
    complianceForms: [
      { code: '1040 Schedule C', name: 'Profit or Loss From Business', description: 'Reports sole proprietorship income and categorized deductions.' },
      { code: '1040-ES', name: 'Estimated Tax for Individuals', description: 'Quarterly estimated federal tax and self-employment tax payments.' },
      { code: '1099-NEC', name: 'Nonemployee Compensation', description: 'Reporting independent contractor payments over $600.' },
    ],
    regulatoryNotes: [
      'Self-employment tax (15.3% Social Security + Medicare) applies in addition to income tax.',
      'Business meals deductible at 50% if ordinary and necessary.',
      'Section 179 expensing allows immediate deduction of qualifying business equipment.',
    ],
    vehicleMileageRate: 0.67, // IRS standard mileage rate
    lowValueAssetWriteOffLimit: 2500,
    entertainmentDeductionRate: 0.50,
  },

  CA: {
    countryCode: 'CA',
    countryName: 'Canada',
    flag: '🇨🇦',
    currencyCode: 'CAD',
    currencySymbol: '$',
    taxAuthority: 'Canada Revenue Agency (CRA)',
    taxAuthorityWebsite: 'https://www.canada.ca/en/revenue-agency.html',
    standardGSTRate: 0.05, // 5% Federal GST
    taxYearLabel: '1 January – 31 December (Calendar Year)',
    financialYearStart: '01-01',
    financialYearEnd: '12-31',
    nextTaxDeadline: '2027-06-15',
    taxBrackets: [
      { min: 0, max: 55867, rate: 0.15 },
      { min: 55867, max: 111733, rate: 0.205 },
      { min: 111733, max: 173205, rate: 0.26 },
      { min: 173205, max: 246752, rate: 0.29 },
      { min: 246752, max: null, rate: 0.33 },
    ],
    complianceForms: [
      { code: 'T2125', name: 'Statement of Business Activities', description: 'Form used to calculate business or professional income and expenses.' },
      { code: 'GST/HST Return', name: 'GST34', description: 'Calculates net GST/HST remitted to CRA.' },
    ],
    regulatoryNotes: [
      'Mandatory GST/HST registration if revenue exceeds CAD $30,000 in a single calendar quarter or four consecutive quarters.',
      '50% limit applies to meals and entertainment expenses.',
    ],
    vehicleMileageRate: 0.70,
    lowValueAssetWriteOffLimit: 500,
    entertainmentDeductionRate: 0.50,
  },

  EU: {
    countryCode: 'EU',
    countryName: 'European Union (General)',
    flag: '🇪🇺',
    currencyCode: 'EUR',
    currencySymbol: '€',
    taxAuthority: 'National Tax Administration (EU Member State)',
    taxAuthorityWebsite: 'https://ec.europa.eu/taxation_customs',
    standardGSTRate: 0.21, // 21% avg VAT
    taxYearLabel: '1 January – 31 December',
    financialYearStart: '01-01',
    financialYearEnd: '12-31',
    nextTaxDeadline: '2027-05-31',
    taxBrackets: [
      { min: 0, max: 20000, rate: 0.15 },
      { min: 20000, max: 50000, rate: 0.25 },
      { min: 50000, max: 100000, rate: 0.38 },
      { min: 100000, max: null, rate: 0.45 },
    ],
    complianceForms: [
      { code: 'VAT Periodic', name: 'Value Added Tax Return', description: 'Periodic filing of input and output VAT under EU directive.' },
      { code: 'Annual CIT/PIT', name: 'Personal/Corporate Income Tax Declaration', description: 'Comprehensive annual financial statement & tax audit.' },
    ],
    regulatoryNotes: [
      'Cross-border EU transactions subject to reverse-charge mechanism (OSS/IOSS).',
      'Electronic invoicing (e-invoicing) standards apply across many EU jurisdictions.',
    ],
    vehicleMileageRate: 0.40,
    lowValueAssetWriteOffLimit: 800,
    entertainmentDeductionRate: 0.50,
  },
};

/**
 * Calculates progressive income tax and GST position given income, expenses, and country configuration
 */
export function calculateTaxPosition(
  grossIncome: number,
  expenses: { amount: number; gstAmount: number; isDeductible: boolean; deductiblePercentage: number }[],
  countryCode: SupportedCountry,
  gstRegistered: boolean
): TaxCalculationResult {
  const config = TAX_CONFIGS[countryCode] || TAX_CONFIGS.NZ;

  let totalExpenses = 0;
  let totalDeductibleExpenses = 0;
  let totalGstPaid = 0;

  for (const exp of expenses) {
    totalExpenses += exp.amount;
    if (exp.isDeductible) {
      const deductionFactor = (exp.deductiblePercentage ?? 100) / 100;
      // If GST registered, expenses are deductible net of GST
      const baseAmount = gstRegistered ? (exp.amount - (exp.gstAmount || 0)) : exp.amount;
      totalDeductibleExpenses += baseAmount * deductionFactor;
    }
    totalGstPaid += exp.gstAmount || 0;
  }

  // If GST registered, gross income excludes GST
  const taxableGrossIncome = gstRegistered
    ? grossIncome / (1 + config.standardGSTRate)
    : grossIncome;

  const totalGstCollected = gstRegistered
    ? grossIncome - taxableGrossIncome
    : 0;

  const netTaxableIncome = Math.max(0, taxableGrossIncome - totalDeductibleExpenses);

  // Progressive tax bracket calculation
  let estimatedIncomeTax = 0;
  const bracketBreakdown: { bracket: string; taxableAmount: number; tax: number }[] = [];

  for (const bracket of config.taxBrackets) {
    if (netTaxableIncome > bracket.min) {
      const upper = bracket.max !== null ? bracket.max : Infinity;
      const taxableInThisBracket = Math.min(netTaxableIncome, upper) - bracket.min;
      if (taxableInThisBracket > 0) {
        const bracketTax = taxableInThisBracket * bracket.rate;
        estimatedIncomeTax += bracketTax;
        bracketBreakdown.push({
          bracket: `${config.currencySymbol}${bracket.min.toLocaleString()} - ${bracket.max ? `${config.currencySymbol}${bracket.max.toLocaleString()}` : '+'} (${(bracket.rate * 100).toFixed(1)}%)`,
          taxableAmount: taxableInThisBracket,
          tax: bracketTax,
        });
      }
    }
  }

  const effectiveTaxRate = netTaxableIncome > 0 ? (estimatedIncomeTax / netTaxableIncome) : 0;
  const netGstPayableOrRefund = gstRegistered ? (totalGstCollected - totalGstPaid) : 0;

  return {
    totalGrossIncome: taxableGrossIncome,
    totalExpenses,
    totalDeductibleExpenses,
    netTaxableIncome,
    estimatedIncomeTax,
    effectiveTaxRate,
    totalGstCollected,
    totalGstPaid,
    netGstPayableOrRefund,
    bracketBreakdown,
  };
}

/**
 * Automatically determine GST and tax deductibility for New Zealand & international standards
 */
export function getTaxClassificationRules(category: string, countryCode: SupportedCountry) {
  const config = TAX_CONFIGS[countryCode] || TAX_CONFIGS.NZ;

  if (category === 'Client Entertainment') {
    return {
      isDeductible: true,
      deductiblePercentage: config.entertainmentDeductionRate * 100, // 50% in NZ
      taxNote: `${config.countryName} IRD Rule: 50% deductible limitation on meals, entertainment & client drinks.`,
    };
  }

  if (category === 'Vehicle & Mileage') {
    return {
      isDeductible: true,
      deductiblePercentage: 80, // Default 80% business use estimate
      taxNote: `${config.countryName} allows claim based on logbook percentage or Tier 1 rate (${config.currencySymbol}${config.vehicleMileageRate}/km).`,
    };
  }

  if (category === 'Tools & Equipment') {
    return {
      isDeductible: true,
      deductiblePercentage: 100,
      taxNote: `Items under ${config.currencySymbol}${config.lowValueAssetWriteOffLimit} qualify for immediate full expense write-off.`,
    };
  }

  return {
    isDeductible: true,
    deductiblePercentage: 100,
    taxNote: '100% allowable business expense deduction.',
  };
}
