export type SupportedCountry = 'NZ' | 'AU' | 'UK' | 'US' | 'CA' | 'EU';

export type BusinessEntityType = 'sole_trader' | 'individual' | 'contractor' | 'small_business' | 'company';

export interface TaxBracket {
  min: number;
  max: number | null;
  rate: number; // e.g. 0.105 for 10.5%
}

export interface CountryTaxConfig {
  countryCode: SupportedCountry;
  countryName: string;
  flag: string;
  currencyCode: string;
  currencySymbol: string;
  taxAuthority: string;
  taxAuthorityWebsite: string;
  standardGSTRate: number; // e.g. 0.15 for NZ 15% GST
  taxYearLabel: string;
  financialYearStart: string; // e.g. "04-01" (April 1st)
  financialYearEnd: string; // e.g. "03-31" (March 31st)
  nextTaxDeadline: string; // e.g. "2027-03-31" (or "2027-07-07")
  taxBrackets: TaxBracket[];
  complianceForms: { code: string; name: string; description: string }[];
  regulatoryNotes: string[];
  vehicleMileageRate: number; // per km in local currency
  lowValueAssetWriteOffLimit: number; // e.g. $1000 in NZD
  entertainmentDeductionRate: number; // e.g. 0.50 in NZ (50% rule)
}

export type ExpenseCategory =
  | 'Office & Admin'
  | 'Tools & Equipment'
  | 'Vehicle & Mileage'
  | 'Travel & Accommodation'
  | 'Client Entertainment'
  | 'Software & Tech'
  | 'Utilities & Phone'
  | 'Professional Services'
  | 'Cost of Goods'
  | 'Advertising & Marketing'
  | 'Other Business';

export interface ReceiptItem {
  description: string;
  quantity?: number;
  unitPrice?: number;
  total: number;
}

export interface ExpenseRecord {
  id: string;
  date: string; // YYYY-MM-DD
  merchant: string;
  category: ExpenseCategory;
  description: string;
  amount: number; // In base currency
  originalAmount?: number; // If entered in foreign currency
  originalCurrency?: string;
  exchangeRate?: number;
  gstAmount: number; // GST/VAT included or paid
  isDeductible: boolean;
  deductiblePercentage: number; // 0 to 100 (e.g. 50% for entertainment)
  receiptUrl?: string; // Data URL or storage path
  receiptFileName?: string;
  receiptNumber?: string;
  paymentMethod: 'Credit Card' | 'Debit Card' | 'Bank Transfer' | 'Cash' | 'EFTPOS';
  notes?: string;
  syncStatus: 'synced' | 'pending' | 'offline';
  createdAt: string;
  updatedAt: string;
}

export interface IncomeRecord {
  id: string;
  date: string;
  client: string;
  description: string;
  amount: number;
  gstAmount: number;
  currency: string;
  invoiceNumber?: string;
  createdAt: string;
}

export type SubscriptionTier = 'free' | 'pro' | 'enterprise';

export interface UserSubscription {
  tier: SubscriptionTier;
  billingCycle: 'monthly' | 'annual';
  status: 'active' | 'trial' | 'expired';
  receiptsScannedThisMonth: number;
  monthlyReceiptLimit: number; // 10 for free, Infinity for pro
  renewsOn?: string;
}

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  country: SupportedCountry;
  entityType: BusinessEntityType;
  taxNumber: string; // IRD number in NZ, ABN/TFN in AU, etc.
  gstRegistered: boolean;
  gstNumber?: string;
  baseCurrency: string;
  financialYearEnding: string;
  accountantEmail?: string;
  accountantName?: string;
  mfaEnabled: boolean;
  biometricEnabled: boolean;
  lastBackupDate?: string;
  devicePlatform: 'ios' | 'android' | 'desktop';
  authProvider?: 'google' | 'apple' | 'facebook' | 'email';
  avatarUrl?: string;
  subscription: UserSubscription;
}

export interface ExchangeRates {
  base: string;
  date: string;
  rates: Record<string, number>;
}

export interface TaxCalculationResult {
  totalGrossIncome: number;
  totalExpenses: number;
  totalDeductibleExpenses: number;
  netTaxableIncome: number;
  estimatedIncomeTax: number;
  effectiveTaxRate: number;
  totalGstCollected: number;
  totalGstPaid: number;
  netGstPayableOrRefund: number; // positive = pay IRD, negative = refund
  bracketBreakdown: { bracket: string; taxableAmount: number; tax: number }[];
}

export interface AccountantShareToken {
  token: string;
  pin: string;
  expiryDate: string;
  createdAt: string;
  readOnly: boolean;
  includeReceiptImages: boolean;
}
