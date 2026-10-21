export type SupportedCountry = 'NZ' | 'AU' | 'CA' | 'US' | 'IN';

export type IndianBusinessType =
  | 'Proprietorship'
  | 'Private Limited'
  | 'LLP'
  | 'Partnership'
  | 'Freelancer / Individual';

export type BusinessEntityType =
  | IndianBusinessType
  | 'Sole Trader'
  | 'Company / Pty Ltd'
  | 'Partnership'
  | 'Trust'
  | 'LLC'
  | 'Corporation'
  | 'Contractor / Freelancer'
  | 'Individual';

export type ExpenseType = 'Business' | 'Personal' | 'Mixed';

export type CAReviewStatus =
  | 'Not Reviewed'
  | 'Reviewed'
  | 'Needs Clarification'
  | 'Needs CA Review'
  | 'Not Claimable';

export type GSTTreatment = 'Likely eligible' | 'Needs review' | 'Not identified';

export type PaymentMethod =
  | 'UPI'
  | 'Credit Card'
  | 'Debit Card'
  | 'Net Banking'
  | 'Cash'
  | 'EFTPOS'
  | 'Bank Transfer'
  | 'Direct Debit'
  | 'Cheque'
  | 'Other';

export type ExpenseCategory =
  | 'Office Expenses'
  | 'Travel'
  | 'Hotel & Accommodation'
  | 'Food & Meals'
  | 'Fuel'
  | 'Vehicle'
  | 'Internet & Mobile'
  | 'Software & Subscriptions'
  | 'Advertising & Marketing'
  | 'Professional Services'
  | 'Rent'
  | 'Electricity'
  | 'Equipment'
  | 'Office Supplies'
  | 'Medical'
  | 'Education & Training'
  | 'Bank Charges'
  | 'Business Entertainment'
  | 'Personal'
  | 'Other'
  // Jurisdiction cost head aliases
  | 'Office & Admin'
  | 'Tools & Equipment'
  | 'Vehicle & Mileage'
  | 'Travel & Accommodation'
  | 'Client Entertainment'
  | 'Software & Tech'
  | 'Utilities & Phone'
  | 'Cost of Goods'
  | 'Home Office / WFH'
  | 'Insurance'
  | 'ACC / Superannuation'
  | 'Other Business';

export interface ReceiptItem {
  id?: string;
  name: string;
  quantity: number;
  unitPrice: number;
  discount?: number;
  tax?: number;
  total: number;
  description?: string;
}

export interface FieldConfidence {
  merchant: number;
  date: number;
  total: number;
  gstin?: number;
  taxId?: number;
  category?: number;
  tax?: number;
  taxAmount?: number;
  items?: number;
}

export interface ExpenseRecord {
  id: string;
  merchant: string;
  invoiceNumber?: string;
  receiptNumber?: string;
  date: string; // YYYY-MM-DD
  time?: string;
  vendorAddress?: string;
  vendorPhone?: string;
  
  // Multi-country Tax IDs
  country?: SupportedCountry; // 'NZ' | 'AU' | 'CA' | 'US' | 'IN'
  currency?: string; // 'NZD' | 'AUD' | 'CAD' | 'USD' | 'INR'
  currencySymbol?: string;
  vendorTaxId?: string; // Universal: IRD / ABN / CRA BN / EIN / GSTIN
  customerTaxId?: string;
  vendorGSTIN?: string; // Alias for backward compatibility
  customerGSTIN?: string; // Alias for backward compatibility
  state?: string; // State / Province / Territory
  paymentMethod: PaymentMethod;

  // Universal Financial breakdown
  subtotal: number;
  discount: number;
  taxableAmount: number;
  taxType?: string; // 'GST' | 'HST' | 'PST' | 'Sales Tax' | 'CGST+SGST' | 'IGST'
  taxRate?: number; // % e.g. 15, 10, 13, 18
  taxAmount?: number; // Total tax amount
  
  // Specific jurisdiction tax breakdown
  gstAmount?: number; // NZ 15% / AU 10% / CA 5%
  pstAmount?: number; // CA Provincial Sales Tax / QST
  hstAmount?: number; // CA Harmonized Sales Tax
  salesTaxAmount?: number; // US State/Local Sales Tax
  cgst: number; // India CGST
  sgst: number; // India SGST
  igst: number; // India IGST
  cess: number; // India Cess
  roundOff: number;
  amount: number; // Total voucher amount in local currency

  // Categorization & Business Usage
  category: ExpenseCategory;
  expenseType: ExpenseType;
  businessPercentage: number; // 0 to 100
  claimableBusinessAmount: number; // Calculated claimable deduction

  // Line items
  items: ReceiptItem[];

  // Attachments & Storage
  receiptUrl?: string;
  receiptFileName?: string;
  receiptThumbnail?: string;

  // Compliance & Review
  gstTreatment: GSTTreatment;
  caReviewStatus: CAReviewStatus;
  caNotes?: string;
  userNotes?: string;

  // AI & Validation
  confidenceScores: FieldConfidence;
  calculationMismatch?: boolean;
  mismatchReason?: string;

  // Recurring detection
  isRecurring?: boolean;
  recurringFrequency?: 'monthly' | 'quarterly' | 'annual';

  // Legacy compat fields
  description?: string;
  originalAmount?: number;
  originalCurrency?: string;
  exchangeRate?: number;
  isDeductible?: boolean;
  deductiblePercentage?: number;
  notes?: string;

  // Status & Soft-Delete
  status?: ExpenseStatus;
  isDeleted?: boolean;
  deletedAt?: string;

  // Sync & Timestamps
  syncStatus: 'synced' | 'pending' | 'offline' | 'deleted';
  createdAt: string;
  updatedAt: string;
}

export type ExpenseStatus = 'active' | 'deleted' | 'archived';

export interface IncomeRecord {
  id: string;
  date: string;
  client: string;
  description: string;
  amount: number;
  gstAmount: number;
  currency?: string;
  invoiceNumber?: string;
  createdAt: string;
}

export type SubscriptionTier = 'free' | 'pro' | 'enterprise';

export interface UserSubscription {
  tier: SubscriptionTier;
  billingCycle: 'monthly' | 'annual';
  status: 'active' | 'trial' | 'expired';
  receiptsScannedThisMonth: number;
  monthlyReceiptLimit: number;
  renewsOn?: string;
  /** Calendar month (YYYY-MM) that receiptsScannedThisMonth counts towards */
  usagePeriod?: string;
}

export interface SubscriptionPlanMaster {
  id: string; // 'free' | 'pro' | 'enterprise' or custom
  planCode: string;
  name: string;
  tagline: string;
  description?: string;
  billingCycle: 'monthly' | 'annual' | 'lifetime';
  priceINR: number;
  priceUSD: number;
  priceNZD: number;
  priceAUD: number;
  priceCAD: number;
  priceAnnualINR: number;
  priceAnnualUSD: number;
  priceAnnualNZD: number;
  priceAnnualAUD: number;
  priceAnnualCAD: number;
  monthlyReceiptLimit: number; // -1 for unlimited
  monthlyTokenLimit: number;
  monthlyRequestLimit: number;
  monthlyExportLimit: number;
  features: string[];
  badge?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CustomerSubscription {
  id: string;
  userId: string;
  planId: string;
  status: 'active' | 'trial' | 'past_due' | 'canceled' | 'expired';
  billingCycle: 'monthly' | 'annual';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  canceledAt?: string;
  paymentMethod?: string;
  metadata?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}

export interface SubscriptionTransaction {
  id: string;
  subscriptionId?: string;
  userId: string;
  planId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'succeeded' | 'failed' | 'refunded';
  billingCycle: 'monthly' | 'annual';
  paymentGateway: 'razorpay' | 'stripe' | 'apple_iap' | 'google_play' | 'manual';
  gatewayOrderId?: string;
  gatewayPaymentId?: string;
  gatewaySignature?: string;
  receiptNumber?: string;
  invoiceUrl?: string;
  taxAmount?: number;
  taxDetails?: Record<string, any>;
  errorCode?: string;
  errorMessage?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface CustomerUsage {
  id: string;
  userId: string;
  periodStart: string;
  periodEnd: string;
  scansUsed: number;
  scansLimit: number;
  tokensUsed: number;
  tokensLimit: number;
  requestsCount: number;
  requestsLimit: number;
  exportsCount: number;
  exportsLimit: number;
  storageBytesUsed?: number;
  storageBytesLimit?: number;
  lastRequestAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TokenRequestLog {
  id: string;
  userId: string;
  requestType: 'receipt_ocr' | 'tax_categorization' | 'chat_assistant' | 'report_export' | 'bank_match';
  modelName: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  latencyMs: number;
  estimatedCostUsd: number;
  status: 'success' | 'failed' | 'rate_limited';
  errorMessage?: string;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  userId?: string;
  entityType: 'expense' | 'income' | 'subscription' | 'profile' | 'export' | 'auth' | 'ai_scan' | 'tax_report' | 'settings';
  entityId?: string;
  action: 'create' | 'update' | 'delete' | 'scan_receipt' | 'export_pdf' | 'export_excel' | 'share_ca' | 'upgrade_plan' | 'downgrade_plan' | 'login' | 'logout' | 'sync_cloud' | 'api_key_update';
  description: string;
  status: 'success' | 'warning' | 'error';
  changes?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  devicePlatform?: 'android' | 'ios' | 'web';
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  businessName: string;
  businessType: BusinessEntityType;
  country: SupportedCountry; // 'NZ' | 'AU' | 'CA' | 'US' | 'IN'
  defaultCurrency: string; // 'NZD' | 'AUD' | 'CAD' | 'USD' | 'INR'
  currencySymbol: string; // '$' or '₹'
  taxAuthority: string; // e.g. "Inland Revenue Department (IRD)", "Australian Taxation Office (ATO)", etc.
  
  // Jurisdiction Tax IDs
  taxId: string; // Primary: IRD No / ABN / CRA BN / EIN / PAN
  secondaryTaxId?: string; // Secondary: GST No / TFN / State Tax ID / GSTIN
  pan: string; // Indian PAN alias
  gstin: string; // Indian GSTIN alias
  
  financialYear: string; // e.g. "FY 2026-27" or "Tax Year 2026"
  state?: string;
  accountantName?: string;
  accountantEmail?: string;
  accountantPhone?: string;
  biometricLock: boolean;
  appPin?: string;
  lastBackupDate?: string;
  subscription: UserSubscription;

  // Terms & Conditions Acceptance
  termsAccepted?: boolean;
  termsAcceptedDate?: string;
  termsAcceptedCountry?: SupportedCountry;

  // Legacy compat fields
  entityType: BusinessEntityType;
  taxNumber: string;
  gstRegistered: boolean;
  gstNumber: string;
  baseCurrency: string;
  financialYearEnding: string;
  mfaEnabled: boolean;
  biometricEnabled: boolean;
  devicePlatform: 'ios' | 'android' | 'desktop';
  authProvider?: 'google' | 'apple' | 'facebook' | 'email';
  avatarUrl?: string;
  geminiApiKey?: string;
}

export interface TaxCalculationResult {
  totalExpenses: number;
  businessExpenses: number;
  personalExpenses: number;
  mixedExpenses: number;
  claimableBusinessTotal: number;
  totalGstIdentified: number;
  cgstTotal: number;
  sgstTotal: number;
  igstTotal: number;
  cessTotal: number;
  eligibleGstItc: number;
  needsReviewGst: number;
  expenseCount: number;

  // Legacy compat fields
  totalGrossIncome: number;
  totalDeductibleExpenses: number;
  netTaxableIncome: number;
  estimatedIncomeTax: number;
  effectiveTaxRate: number;
  totalGstCollected: number;
  totalGstPaid: number;
  netGstPayableOrRefund: number;
  bracketBreakdown?: { bracket: string; taxableAmount: number; tax: number }[];
}

export interface ExchangeRates {
  base: string;
  date: string;
  rates: Record<string, number>;
}

export interface TaxBracket {
  min: number;
  max: number | null;
  rate: number;
}

export interface CountryTaxConfig {
  countryCode: SupportedCountry;
  countryName: string;
  flag: string;
  currencyCode: string;
  currencySymbol: string;
  taxAuthority: string;
  taxAuthorityWebsite: string;
  standardGSTRate: number;
  taxYearLabel: string;
  financialYearStart: string;
  financialYearEnd: string;
  nextTaxDeadline: string;
  complianceForms: { code: string; name: string; description: string }[];
  regulatoryNotes?: string[];
  taxBrackets?: TaxBracket[];
  vehicleMileageRate?: number;
  lowValueAssetWriteOffLimit?: number;
  entertainmentDeductionRate?: number;
}

export interface MileageTrip {
  id: string;
  date: string;
  purpose: string;
  origin: string;
  destination: string;
  distance: number; // km or miles
  unit: 'km' | 'miles';
  ratePerUnit: number; // Statutory rate
  taxDeduction: number;
  vehicle?: string;
  odometerStart?: number;
  odometerEnd?: number;
  notes?: string;
  loggedAsExpenseId?: string;
  createdAt: string;
}

export interface BankTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'debit' | 'credit';
  matchedExpenseId?: string;
  matchStatus: 'matched' | 'unmatched';
  categoryGuess?: ExpenseCategory;
}

export interface ClientInvoiceItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
  taxRate: number;
  total: number;
}

export interface ClientInvoice {
  id: string;
  invoiceNumber: string;
  date: string;
  dueDate: string;
  clientName: string;
  clientEmail?: string;
  clientAddress?: string;
  items: ClientInvoiceItem[];
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  notes?: string;
  status: 'draft' | 'sent' | 'paid';
  syncedIncomeId?: string;
  createdAt: string;
}

export interface StatutoryTaxDeadline {
  id: string;
  country: SupportedCountry;
  title: string;
  authority: string;
  dueDate: string; // YYYY-MM-DD or standard periodic label
  description: string;
  formCode: string;
  category: 'GST/VAT' | 'Income Tax' | 'Provisional / BAS' | 'Annual Filing';
  status: 'upcoming' | 'urgent' | 'completed';
}

export interface CustomerAgreement {
  id: string;
  userId?: string;
  userEmail: string;
  userName?: string;
  country: SupportedCountry;
  taxAuthority: string;
  termsVersion: string;
  agreedAt: string; // ISO timestamp
  ipAddress?: string;
  userAgent?: string;
  devicePlatform?: string;
  metadata?: Record<string, any>;
  createdAt?: string;
}

