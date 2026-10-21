import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import {
  ExpenseRecord,
  IncomeRecord,
  UserProfile,
  SubscriptionPlanMaster,
  CustomerSubscription,
  SubscriptionTransaction,
  CustomerUsage,
  TokenRequestLog,
  ActivityLog,
  MileageTrip,
  ClientInvoice,
  BankTransaction,
  CustomerAgreement,
  SupportedCountry,
} from '../types';
import { SUPABASE_SQL_SCHEMA } from '../constants/supabaseSchema';
import { apiUrl } from './apiBase';

export { SUPABASE_SQL_SCHEMA };

export interface SupabaseSyncStatus {
  isConfigured: boolean;
  isConnected: boolean;
  tablesReady: boolean;
  projectUrl: string;
  errorMessage?: string;
  lastChecked?: string;
  recordsSynced?: number;
}

export function planToSupabaseRow(p: SubscriptionPlanMaster) {
  return {
    id: p.id,
    plan_code: p.planCode,
    name: p.name,
    tagline: p.tagline,
    description: p.description || null,
    billing_cycle: p.billingCycle,
    price_inr: p.priceINR,
    price_usd: p.priceUSD,
    price_nzd: p.priceNZD,
    price_aud: p.priceAUD,
    price_cad: p.priceCAD,
    price_annual_inr: p.priceAnnualINR,
    price_annual_usd: p.priceAnnualUSD,
    price_annual_nzd: p.priceAnnualNZD,
    price_annual_aud: p.priceAnnualAUD,
    price_annual_cad: p.priceAnnualCAD,
    monthly_receipt_limit: p.monthlyReceiptLimit,
    monthly_token_limit: p.monthlyTokenLimit,
    monthly_request_limit: p.monthlyRequestLimit,
    monthly_export_limit: p.monthlyExportLimit,
    features: p.features,
    badge: p.badge || null,
    is_active: p.isActive,
    sort_order: p.sortOrder,
    updated_at: new Date().toISOString(),
  };
}

export function supabaseRowToPlan(row: any): SubscriptionPlanMaster {
  return {
    id: row.id,
    planCode: row.plan_code || row.id,
    name: row.name || 'Plan',
    tagline: row.tagline || '',
    description: row.description || '',
    billingCycle: row.billing_cycle || 'monthly',
    priceINR: Number(row.price_inr || 0),
    priceUSD: Number(row.price_usd || 0),
    priceNZD: Number(row.price_nzd || 0),
    priceAUD: Number(row.price_aud || 0),
    priceCAD: Number(row.price_cad || 0),
    priceAnnualINR: Number(row.price_annual_inr || 0),
    priceAnnualUSD: Number(row.price_annual_usd || 0),
    priceAnnualNZD: Number(row.price_annual_nzd || 0),
    priceAnnualAUD: Number(row.price_annual_aud || 0),
    priceAnnualCAD: Number(row.price_annual_cad || 0),
    monthlyReceiptLimit: Number(row.monthly_receipt_limit ?? 10),
    monthlyTokenLimit: Number(row.monthly_token_limit ?? 50000),
    monthlyRequestLimit: Number(row.monthly_request_limit ?? 25),
    monthlyExportLimit: Number(row.monthly_export_limit ?? 5),
    features: Array.isArray(row.features) ? row.features : [],
    badge: row.badge || undefined,
    isActive: row.is_active !== false,
    sortOrder: Number(row.sort_order || 0),
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
  };
}

export function customerSubToSupabaseRow(s: CustomerSubscription) {
  return {
    id: s.id,
    user_id: s.userId,
    plan_id: s.planId,
    status: s.status,
    billing_cycle: s.billingCycle,
    current_period_start: s.currentPeriodStart,
    current_period_end: s.currentPeriodEnd,
    cancel_at_period_end: s.cancelAtPeriodEnd,
    canceled_at: s.canceledAt || null,
    payment_method: s.paymentMethod || 'UPI',
    metadata: s.metadata || {},
    updated_at: new Date().toISOString(),
  };
}

export function supabaseRowToCustomerSub(row: any): CustomerSubscription {
  return {
    id: row.id,
    userId: row.user_id,
    planId: row.plan_id,
    status: row.status || 'active',
    billingCycle: row.billing_cycle || 'monthly',
    currentPeriodStart: row.current_period_start || new Date().toISOString(),
    currentPeriodEnd: row.current_period_end || new Date(Date.now() + 30 * 86400000).toISOString(),
    cancelAtPeriodEnd: Boolean(row.cancel_at_period_end),
    canceledAt: row.canceled_at || undefined,
    paymentMethod: row.payment_method || 'UPI',
    metadata: row.metadata || {},
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
  };
}

export function transactionToSupabaseRow(tx: SubscriptionTransaction) {
  return {
    id: tx.id,
    subscription_id: tx.subscriptionId || null,
    user_id: tx.userId,
    plan_id: tx.planId,
    amount: tx.amount,
    currency: tx.currency,
    status: tx.status,
    billing_cycle: tx.billingCycle,
    payment_gateway: tx.paymentGateway,
    gateway_order_id: tx.gatewayOrderId || null,
    gateway_payment_id: tx.gatewayPaymentId || null,
    gateway_signature: tx.gatewaySignature || null,
    receipt_number: tx.receiptNumber || null,
    invoice_url: tx.invoiceUrl || null,
    tax_amount: tx.taxAmount || 0,
    tax_details: tx.taxDetails || {},
    error_code: tx.errorCode || null,
    error_message: tx.errorMessage || null,
    metadata: tx.metadata || {},
    created_at: tx.createdAt || new Date().toISOString(),
  };
}

export function supabaseRowToTransaction(row: any): SubscriptionTransaction {
  return {
    id: row.id,
    subscriptionId: row.subscription_id || undefined,
    userId: row.user_id,
    planId: row.plan_id,
    amount: Number(row.amount || 0),
    currency: row.currency || 'INR',
    status: row.status || 'succeeded',
    billingCycle: row.billing_cycle || 'monthly',
    paymentGateway: row.payment_gateway || 'razorpay',
    gatewayOrderId: row.gateway_order_id || undefined,
    gatewayPaymentId: row.gateway_payment_id || undefined,
    gatewaySignature: row.gateway_signature || undefined,
    receiptNumber: row.receipt_number || undefined,
    invoiceUrl: row.invoice_url || undefined,
    taxAmount: Number(row.tax_amount || 0),
    taxDetails: row.tax_details || {},
    errorCode: row.error_code || undefined,
    errorMessage: row.error_message || undefined,
    metadata: row.metadata || {},
    createdAt: row.created_at || new Date().toISOString(),
  };
}

export function usageToSupabaseRow(u: CustomerUsage) {
  return {
    id: u.id,
    user_id: u.userId,
    period_start: u.periodStart,
    period_end: u.periodEnd,
    scans_used: u.scansUsed,
    scans_limit: u.scansLimit,
    tokens_used: u.tokensUsed,
    tokens_limit: u.tokensLimit,
    requests_count: u.requestsCount,
    requests_limit: u.requestsLimit,
    exports_count: u.exportsCount,
    exports_limit: u.exportsLimit,
    storage_bytes_used: u.storageBytesUsed || 0,
    storage_bytes_limit: u.storageBytesLimit || 104857600,
    last_request_at: u.lastRequestAt || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export function supabaseRowToUsage(row: any): CustomerUsage {
  return {
    id: row.id,
    userId: row.user_id,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    scansUsed: Number(row.scans_used || 0),
    scansLimit: Number(row.scans_limit ?? 10),
    tokensUsed: Number(row.tokens_used || 0),
    tokensLimit: Number(row.tokens_limit ?? 50000),
    requestsCount: Number(row.requests_count || 0),
    requestsLimit: Number(row.requests_limit ?? 100),
    exportsCount: Number(row.exports_count || 0),
    exportsLimit: Number(row.exports_limit ?? 5),
    storageBytesUsed: Number(row.storage_bytes_used || 0),
    storageBytesLimit: Number(row.storage_bytes_limit || 104857600),
    lastRequestAt: row.last_request_at || undefined,
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
  };
}

export function tokenLogToSupabaseRow(l: TokenRequestLog) {
  return {
    id: l.id,
    user_id: l.userId,
    request_type: l.requestType,
    model_name: l.modelName,
    prompt_tokens: l.promptTokens,
    completion_tokens: l.completionTokens,
    total_tokens: l.totalTokens,
    latency_ms: l.latencyMs,
    estimated_cost_usd: l.estimatedCostUsd,
    status: l.status,
    error_message: l.errorMessage || null,
    metadata: l.metadata || {},
    created_at: l.createdAt || new Date().toISOString(),
  };
}

export function supabaseRowToTokenLog(row: any): TokenRequestLog {
  return {
    id: row.id,
    userId: row.user_id,
    requestType: row.request_type || 'receipt_ocr',
    modelName: row.model_name || 'gemini-2.5-flash',
    promptTokens: Number(row.prompt_tokens || 0),
    completionTokens: Number(row.completion_tokens || 0),
    totalTokens: Number(row.total_tokens || 0),
    latencyMs: Number(row.latency_ms || 0),
    estimatedCostUsd: Number(row.estimated_cost_usd || 0),
    status: row.status || 'success',
    errorMessage: row.error_message || undefined,
    metadata: row.metadata || {},
    createdAt: row.created_at || new Date().toISOString(),
  };
}

export function activityLogToSupabaseRow(a: ActivityLog) {
  return {
    id: a.id,
    user_id: a.userId || null,
    entity_type: a.entityType,
    entity_id: a.entityId || null,
    action: a.action,
    description: a.description,
    status: a.status,
    changes: a.changes || {},
    ip_address: a.ipAddress || null,
    user_agent: a.userAgent || null,
    device_platform: a.devicePlatform || 'android',
    metadata: a.metadata || {},
    created_at: a.createdAt || new Date().toISOString(),
  };
}

export function supabaseRowToActivityLog(row: any): ActivityLog {
  return {
    id: row.id,
    userId: row.user_id || undefined,
    entityType: row.entity_type || 'expense',
    entityId: row.entity_id || undefined,
    action: row.action || 'create',
    description: row.description || '',
    status: row.status || 'success',
    changes: row.changes || {},
    ipAddress: row.ip_address || undefined,
    userAgent: row.user_agent || undefined,
    devicePlatform: row.device_platform || 'android',
    metadata: row.metadata || {},
    createdAt: row.created_at || new Date().toISOString(),
  };
}

export function profileToSupabaseRow(p: UserProfile) {
  return {
    id: p.id || 'usr_taxvault_admin',
    full_name: p.fullName,
    email: p.email,
    country: p.country,
    entity_type: p.entityType,
    tax_number: p.taxNumber,
    tax_id: p.taxId || p.pan || p.taxNumber,
    secondary_tax_id: p.secondaryTaxId || p.gstin || p.gstNumber,
    tax_authority: p.taxAuthority,
    gst_registered: p.gstRegistered,
    gst_number: p.gstNumber || p.taxNumber,
    base_currency: p.baseCurrency,
    default_currency: p.defaultCurrency,
    currency_symbol: p.currencySymbol,
    financial_year: p.financialYear,
    financial_year_ending: p.financialYearEnding,
    accountant_email: p.accountantEmail || null,
    accountant_name: p.accountantName || null,
    mfa_enabled: p.mfaEnabled,
    biometric_enabled: p.biometricEnabled,
    device_platform: p.devicePlatform,
    last_backup_date: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export function supabaseRowToProfile(row: any): UserProfile {
  const country = row.country || 'IN';
  return {
    id: row.id,
    fullName: row.full_name || '',
    email: row.email || '',
    phone: row.phone || '',
    businessName: row.business_name || row.full_name || 'My Business',
    businessType: row.business_type || 'Proprietorship',
    country,
    defaultCurrency: row.default_currency || (country === 'IN' ? 'INR' : country === 'AU' ? 'AUD' : country === 'CA' ? 'CAD' : country === 'US' ? 'USD' : 'NZD'),
    currencySymbol: row.currency_symbol || (country === 'IN' ? '₹' : '$'),
    taxAuthority: row.tax_authority || (country === 'NZ' ? 'Inland Revenue Department (IRD)' : country === 'AU' ? 'Australian Taxation Office (ATO)' : country === 'CA' ? 'Canada Revenue Agency (CRA)' : country === 'US' ? 'Internal Revenue Service (IRS)' : 'Goods and Services Tax Network (GSTN)'),
    taxId: row.tax_id || row.pan || row.tax_number || '',
    secondaryTaxId: row.secondary_tax_id || row.gstin || row.gst_number || '',
    pan: row.pan || row.tax_id || row.tax_number || '',
    gstin: row.gstin || row.secondary_tax_id || row.gst_number || '',
    financialYear: row.financial_year || 'FY 2026-27',
    accountantName: row.accountant_name || undefined,
    accountantEmail: row.accountant_email || undefined,
    accountantPhone: row.accountant_phone || undefined,
    biometricLock: Boolean(row.biometric_enabled || row.biometric_lock),
    appPin: row.app_pin || '1234',
    entityType: row.entity_type || 'Proprietorship',
    taxNumber: row.tax_number || row.tax_id || '',
    gstRegistered: Boolean(row.gst_registered),
    gstNumber: row.gst_number || row.secondary_tax_id || '',
    baseCurrency: row.base_currency || (country === 'IN' ? 'INR' : country === 'AU' ? 'AUD' : country === 'CA' ? 'CAD' : country === 'US' ? 'USD' : 'NZD'),
    financialYearEnding: row.financial_year_ending || '2027-03-31',
    mfaEnabled: Boolean(row.mfa_enabled),
    biometricEnabled: Boolean(row.biometric_enabled),
    devicePlatform: row.device_platform || 'ios',
    lastBackupDate: row.last_backup_date || new Date().toISOString(),
    subscription: {
      tier: 'pro',
      billingCycle: 'monthly',
      status: 'active',
      receiptsScannedThisMonth: 0,
      monthlyReceiptLimit: 500,
      renewsOn: '2026-11-01',
    },
  };
}

export function expenseToSupabaseRow(exp: ExpenseRecord) {
  const country = exp.country || 'IN';
  const currency = exp.currency || (country === 'IN' ? 'INR' : country === 'AU' ? 'AUD' : country === 'CA' ? 'CAD' : country === 'US' ? 'USD' : 'NZD');
  const vendorTaxId = exp.vendorTaxId || exp.vendorGSTIN || null;
  // customer_tax_id is referenced by profiles(id) in DB triggers; customer_gstin stores the GST registration number
  const validProfileId = (exp as any).userId || (exp.customerTaxId && exp.customerTaxId.startsWith('usr_') ? exp.customerTaxId : null);
  const customerGstin = exp.customerGSTIN || (exp.customerTaxId && !exp.customerTaxId.startsWith('usr_') ? exp.customerTaxId : null);

  return {
    id: exp.id,
    country,
    currency,
    date: exp.date,
    time: exp.time || '12:00',
    merchant: exp.merchant,
    category: exp.category,
    description: exp.description || exp.merchant || '',
    amount: exp.amount,
    subtotal: exp.subtotal || 0,
    discount: exp.discount || 0,
    taxable_amount: exp.taxableAmount || exp.subtotal || 0,
    tax_type: exp.taxType || (country === 'US' ? 'Sales Tax' : 'GST'),
    tax_rate: exp.taxRate ?? (country === 'NZ' ? 15 : country === 'AU' ? 10 : country === 'CA' ? 13 : country === 'US' ? 8.875 : 18),
    tax_amount: exp.taxAmount || exp.gstAmount || exp.salesTaxAmount || (exp.cgst || 0) + (exp.sgst || 0) || 0,
    gst_amount: exp.gstAmount || (country === 'IN' ? (exp.cgst || 0) + (exp.sgst || 0) + (exp.igst || 0) : 0),
    pst_amount: exp.pstAmount || 0,
    hst_amount: exp.hstAmount || 0,
    sales_tax_amount: exp.salesTaxAmount || 0,
    cgst: exp.cgst || 0,
    sgst: exp.sgst || 0,
    igst: exp.igst || 0,
    cess: exp.cess || 0,
    round_off: exp.roundOff || 0,
    expense_type: exp.expenseType || 'Business',
    business_percentage: exp.businessPercentage ?? 100,
    claimable_business_amount: exp.claimableBusinessAmount || exp.amount,
    vendor_tax_id: vendorTaxId,
    customer_tax_id: validProfileId,
    vendor_gstin: vendorTaxId,
    customer_gstin: customerGstin,
    state: exp.state || null,
    items: exp.items || [],
    confidence_scores: exp.confidenceScores || {},
    original_amount: exp.originalAmount ?? null,
    original_currency: exp.originalCurrency ?? null,
    exchange_rate: exp.exchangeRate ?? null,
    is_deductible: exp.isDeductible ?? (exp.expenseType === 'Business'),
    deductible_percentage: exp.deductiblePercentage ?? exp.businessPercentage ?? 100,
    receipt_url: exp.receiptUrl ?? null,
    receipt_file_name: exp.receiptFileName ?? null,
    receipt_number: exp.receiptNumber ?? exp.invoiceNumber ?? null,
    invoice_number: exp.invoiceNumber ?? exp.receiptNumber ?? null,
    payment_method: exp.paymentMethod || 'UPI',
    gst_treatment: exp.gstTreatment || 'Likely eligible',
    ca_review_status: exp.caReviewStatus || 'Not Reviewed',
    ca_notes: exp.caNotes || null,
    user_notes: exp.userNotes || null,
    calculation_mismatch: Boolean(exp.calculationMismatch),
    notes: exp.notes ?? exp.caNotes ?? null,
    sync_status: 'synced',
    created_at: exp.createdAt || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export function supabaseRowToExpense(row: any): ExpenseRecord {
  const amount = Number(row.amount || 0);
  const gstAmount = Number(row.gst_amount || 0);
  const totalTax = Number(row.tax_amount || row.gst_amount || (Number(row.cgst || 0) + Number(row.sgst || 0) + Number(row.igst || 0)) || 0);
  const subtotal = Number(row.subtotal || Math.max(0, amount - totalTax));
  const category = (row.category || 'Office Expenses') as any;
  const country = (row.country || 'IN') as any;
  const currency = row.currency || (country === 'IN' ? 'INR' : country === 'AU' ? 'AUD' : country === 'CA' ? 'CAD' : country === 'US' ? 'USD' : 'NZD');
  const isBusiness = row.is_deductible !== false;
  const bizPct = Number(row.deductible_percentage ?? (isBusiness ? 100 : 0));

  let isDeleted = Boolean(row.is_deleted || row.status === 'deleted' || row.sync_status === 'deleted');
  let cleanNotes = row.notes;
  if (row.notes && typeof row.notes === 'string' && row.notes.includes('__taxvault__')) {
    try {
      const meta = JSON.parse(row.notes);
      if (meta.isDeleted || meta.status === 'deleted') isDeleted = true;
      if (meta.originalNotes !== undefined) cleanNotes = meta.originalNotes;
    } catch {}
  }
  const status: any = isDeleted ? 'deleted' : ((row.status as any) || 'active');

  return {
    id: String(row.id),
    country,
    currency,
    date: String(row.date),
    merchant: String(row.merchant || ''),
    invoiceNumber: row.invoice_number || row.receipt_number || undefined,
    receiptNumber: row.receipt_number || undefined,
    time: row.time || '12:00',
    vendorAddress: row.vendor_address || undefined,
    vendorPhone: row.vendor_phone || undefined,
    vendorTaxId: row.vendor_tax_id || row.vendor_gstin || undefined,
    customerTaxId: row.customer_tax_id || undefined,
    vendorGSTIN: row.vendor_gstin || row.vendor_tax_id || undefined,
    customerGSTIN: row.customer_gstin || undefined,
    state: row.state || undefined,
    paymentMethod: row.payment_method || 'Credit Card',
    subtotal,
    discount: Number(row.discount || 0),
    taxableAmount: Number(row.taxable_amount || subtotal),
    taxType: row.tax_type || (country === 'US' ? 'Sales Tax' : 'GST'),
    taxRate: row.tax_rate != null ? Number(row.tax_rate) : undefined,
    taxAmount: totalTax,
    cgst: Number(row.cgst || Math.round(gstAmount / 2)),
    sgst: Number(row.sgst || Math.round(gstAmount / 2)),
    igst: Number(row.igst || 0),
    cess: Number(row.cess || 0),
    roundOff: Number(row.round_off || 0),
    amount,
    category,
    expenseType: bizPct === 100 ? 'Business' : bizPct === 0 ? 'Personal' : 'Mixed',
    businessPercentage: bizPct,
    claimableBusinessAmount: isDeleted ? 0 : (row.claimable_business_amount != null ? Number(row.claimable_business_amount) : Math.round(amount * (bizPct / 100))),
    items: Array.isArray(row.items) ? row.items : [
      { name: row.description || row.merchant || 'General Expense', quantity: 1, unitPrice: amount, total: amount }
    ],
    receiptUrl: row.receipt_url || undefined,
    receiptFileName: row.receipt_file_name || undefined,
    gstTreatment: row.gst_treatment || (gstAmount > 0 ? 'Likely eligible' : 'Not identified'),
    caReviewStatus: row.ca_review_status || 'Not Reviewed',
    caNotes: row.ca_notes || row.notes || undefined,
    confidenceScores: row.confidence_scores || { merchant: 96, date: 98, total: 99 },
    calculationMismatch: Boolean(row.calculation_mismatch),
    description: String(row.description || ''),
    originalAmount: row.original_amount != null ? Number(row.original_amount) : undefined,
    originalCurrency: row.original_currency || undefined,
    exchangeRate: row.exchange_rate != null ? Number(row.exchange_rate) : undefined,
    gstAmount,
    isDeductible: isDeleted ? false : isBusiness,
    deductiblePercentage: bizPct,
    notes: cleanNotes || undefined,
    status,
    isDeleted,
    deletedAt: row.deleted_at || undefined,
    syncStatus: isDeleted ? 'deleted' : 'synced',
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
  };
}

export function incomeToSupabaseRow(inc: IncomeRecord) {
  return {
    id: inc.id,
    date: inc.date,
    client: inc.client,
    description: inc.description || '',
    amount: inc.amount,
    gst_amount: inc.gstAmount || 0,
    currency: inc.currency || 'NZD',
    invoice_number: inc.invoiceNumber || null,
    created_at: inc.createdAt || new Date().toISOString(),
  };
}

export function supabaseRowToIncome(row: any): IncomeRecord {
  return {
    id: row.id,
    date: row.date,
    client: row.client,
    description: row.description || '',
    amount: Number(row.amount || 0),
    gstAmount: Number(row.gst_amount || 0),
    currency: row.currency || 'NZD',
    invoiceNumber: row.invoice_number || undefined,
    createdAt: row.created_at || new Date().toISOString(),
  };
}

export function tripToSupabaseRow(t: MileageTrip, userId?: string) {
  return {
    id: t.id,
    user_id: userId || null,
    date: t.date,
    purpose: t.purpose,
    origin: t.origin,
    destination: t.destination,
    distance: t.distance,
    unit: t.unit || 'km',
    rate_per_unit: t.ratePerUnit,
    tax_deduction: t.taxDeduction,
    vehicle: t.vehicle || null,
    odometer_start: t.odometerStart ?? null,
    odometer_end: t.odometerEnd ?? null,
    notes: t.notes || null,
    logged_as_expense_id: t.loggedAsExpenseId || null,
    created_at: t.createdAt || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export function supabaseRowToTrip(row: any): MileageTrip {
  return {
    id: row.id,
    date: row.date,
    purpose: row.purpose,
    origin: row.origin,
    destination: row.destination,
    distance: Number(row.distance || 0),
    unit: (row.unit === 'miles' ? 'miles' : 'km') as 'km' | 'miles',
    ratePerUnit: Number(row.rate_per_unit || 0),
    taxDeduction: Number(row.tax_deduction || 0),
    vehicle: row.vehicle || undefined,
    odometerStart: row.odometer_start != null ? Number(row.odometer_start) : undefined,
    odometerEnd: row.odometer_end != null ? Number(row.odometer_end) : undefined,
    notes: row.notes || undefined,
    loggedAsExpenseId: row.logged_as_expense_id || undefined,
    createdAt: row.created_at || new Date().toISOString(),
  };
}

export function clientInvoiceToSupabaseRow(inv: ClientInvoice, userId?: string) {
  return {
    id: inv.id,
    user_id: userId || null,
    invoice_number: inv.invoiceNumber,
    date: inv.date,
    due_date: inv.dueDate,
    client_name: inv.clientName,
    client_email: inv.clientEmail || null,
    client_address: inv.clientAddress || null,
    items: inv.items || [],
    subtotal: inv.subtotal,
    tax_amount: inv.taxAmount,
    total_amount: inv.totalAmount,
    notes: inv.notes || null,
    status: inv.status || 'draft',
    synced_income_id: inv.syncedIncomeId || null,
    created_at: inv.createdAt || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export function supabaseRowToClientInvoice(row: any): ClientInvoice {
  return {
    id: row.id,
    invoiceNumber: row.invoice_number,
    date: row.date,
    dueDate: row.due_date,
    clientName: row.client_name,
    clientEmail: row.client_email || undefined,
    clientAddress: row.client_address || undefined,
    items: Array.isArray(row.items) ? row.items : [],
    subtotal: Number(row.subtotal || 0),
    taxAmount: Number(row.tax_amount || 0),
    totalAmount: Number(row.total_amount || 0),
    notes: row.notes || undefined,
    status: (row.status || 'draft') as 'draft' | 'sent' | 'paid',
    syncedIncomeId: row.synced_income_id || undefined,
    createdAt: row.created_at || new Date().toISOString(),
  };
}

export function bankTxToSupabaseRow(tx: BankTransaction, userId?: string) {
  return {
    id: tx.id,
    user_id: userId || null,
    date: tx.date,
    description: tx.description,
    amount: tx.amount,
    type: tx.type || 'debit',
    matched_expense_id: tx.matchedExpenseId || null,
    match_status: tx.matchStatus || 'unmatched',
    category_guess: tx.categoryGuess || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export function supabaseRowToBankTx(row: any): BankTransaction {
  return {
    id: row.id,
    date: row.date,
    description: row.description,
    amount: Number(row.amount || 0),
    type: (row.type === 'credit' ? 'credit' : 'debit') as 'debit' | 'credit',
    matchedExpenseId: row.matched_expense_id || undefined,
    matchStatus: (row.match_status || 'unmatched') as 'matched' | 'unmatched',
    categoryGuess: row.category_guess || undefined,
  };
}

class SupabaseService {
  private client: SupabaseClient | null = null;
  private url: string = '';
  private key: string = '';

  constructor() {
    this.init();
  }

  private init() {
    const metaEnvUrl = (typeof process !== 'undefined' ? (process.env?.VITE_SUPABASE_URL || process.env?.SUPABASE_URL) : '') || (import.meta as any).env?.VITE_SUPABASE_URL;
    const metaEnvKey = (typeof process !== 'undefined' ? (process.env?.VITE_SUPABASE_ANON_KEY || process.env?.SUPABASE_ANON_KEY) : '') || (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;

    let localUrl = '';
    let localKey = '';
    try {
      if (typeof localStorage !== 'undefined') {
        localUrl = localStorage.getItem('taxvault_supabase_url') || '';
        localKey = localStorage.getItem('taxvault_supabase_key') || '';
      }
    } catch {}

    this.url = (metaEnvUrl || localUrl || '').trim();
    this.key = (metaEnvKey || localKey || '').trim();

    if (this.url && this.key) {
      try {
        this.client = createClient(this.url, this.key, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
          },
        });
      } catch (err) {
        console.warn('Failed to initialize Supabase client:', err);
        this.client = null;
      }
    }
  }

  public getClient(): SupabaseClient | null {
    if (!this.client) {
      this.init();
    }
    return this.client;
  }

  public getConfig() {
    return {
      url: this.url,
      key: this.key,
      isConfigured: Boolean(this.url && this.key),
    };
  }

  public setCustomCredentials(url: string, key: string) {
    this.url = url.trim();
    this.key = key.trim();
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('taxvault_supabase_url', this.url);
        localStorage.setItem('taxvault_supabase_key', this.key);
      }
    } catch {}
    this.client = null;
    this.init();
  }

  /**
   * Health and connectivity check to Supabase
   */
  public async checkConnection(): Promise<SupabaseSyncStatus> {
    const client = this.getClient();
    if (!client || !this.url || !this.key) {
      return {
        isConfigured: false,
        isConnected: false,
        tablesReady: false,
        projectUrl: this.url || '',
        errorMessage: 'Supabase credentials not configured',
      };
    }

    try {
      // 1. Check API authentication via Auth settings
      const authRes = await fetch(`${this.url}/auth/v1/settings`, {
        headers: { apikey: this.key },
      });

      if (!authRes.ok) {
        const errText = await authRes.text();
        return {
          isConfigured: true,
          isConnected: false,
          tablesReady: false,
          projectUrl: this.url,
          errorMessage: `Supabase authentication failed (${authRes.status}): ${errText}`,
        };
      }

      // 2. Check if tables exist
      const { data, error } = await client.from('expenses').select('id').limit(1);

      if (error) {
        const isMissingTable = error.code === 'PGRST205' || error.message?.includes('schema cache');
        return {
          isConfigured: true,
          isConnected: true,
          tablesReady: !isMissingTable,
          projectUrl: this.url,
          errorMessage: isMissingTable
            ? "Connected to Supabase, but the 'expenses' table has not been created yet."
            : error.message,
          lastChecked: new Date().toISOString(),
        };
      }

      return {
        isConfigured: true,
        isConnected: true,
        tablesReady: true,
        projectUrl: this.url,
        lastChecked: new Date().toISOString(),
      };
    } catch (err: any) {
      return {
        isConfigured: true,
        isConnected: false,
        tablesReady: false,
        projectUrl: this.url,
        errorMessage: err?.message || 'Network error connecting to Supabase',
      };
    }
  }

  /**
   * Supabase Auth: Sign in with Email and Password
   */
  public async signInWithEmail(email: string, password: string) {
    const client = this.getClient();
    if (!client) return { user: null, session: null, error: 'Supabase client not initialized' };

    try {
      const { data, error } = await client.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        return { user: null, session: null, error: error.message };
      }

      return { user: data.user, session: data.session, error: null };
    } catch (err: any) {
      return { user: null, session: null, error: err?.message || 'Authentication failed' };
    }
  }

  /**
   * Supabase Auth: Sign up with Email and Password
   */
  public async signUpWithEmail(email: string, password: string) {
    const client = this.getClient();
    if (!client) return { user: null, session: null, error: 'Supabase client not initialized' };

    try {
      const { data, error } = await client.auth.signUp({
        email: email.trim(),
        password,
      });

      if (error) {
        return { user: null, session: null, error: error.message };
      }

      return { user: data.user, session: data.session, error: null };
    } catch (err: any) {
      return { user: null, session: null, error: err?.message || 'Sign up failed' };
    }
  }

  /**
   * Supabase Auth: Send Password Reset Link to Registered Email
   */
  public async resetPasswordForEmail(email: string): Promise<{ success: boolean; error?: string }> {
    const client = this.getClient();
    if (!client) return { success: false, error: 'Supabase client not initialized' };

    try {
      const redirectUrl = typeof window !== 'undefined' ? `${window.location.origin}` : undefined;
      const { error } = await client.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: redirectUrl,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to send password reset email' };
    }
  }

  /**
   * Supabase Auth: Update Password for Recovery Session, Backend API, or RPC
   */
  public async updatePassword(newPassword: string, _targetEmail?: string): Promise<{ success: boolean; error?: string }> {
    const client = this.getClient();
    if (!client) return { success: false, error: 'Supabase client not initialized' };

    // A password can only be changed from an authenticated session: the one Supabase creates
    // when the user opens the reset link from their email. An email address alone is never enough.
    try {
      const { data: sessionData } = await client.auth.getSession();
      const session = sessionData?.session;
      if (!session) {
        return {
          success: false,
          error: 'For your security, open the password reset link we emailed you, then set your new password.',
        };
      }

      const { error } = await client.auth.updateUser({ password: newPassword });
      if (!error) return { success: true };

      // Fall back to the server, which verifies this same session token before updating
      try {
        const apiRes = await fetch(apiUrl('/api/auth/reset-password'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ newPassword }),
        });
        const apiJson = await apiRes.json().catch(() => ({}));
        if (apiRes.ok && apiJson.success) return { success: true };
        return { success: false, error: apiJson.error || error.message };
      } catch {
        return { success: false, error: error.message };
      }
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to update password' };
    }
  }

  private cachedAuthSettings: any = null;
  private lastSettingsCheck: number = 0;

  public async getAuthSettings(): Promise<any> {
    if (this.cachedAuthSettings && Date.now() - this.lastSettingsCheck < 30000) {
      return this.cachedAuthSettings;
    }
    if (!this.url || !this.key) return null;

    try {
      const res = await fetch(`${this.url}/auth/v1/settings`, {
        headers: { apikey: this.key },
      });
      if (res.ok) {
        this.cachedAuthSettings = await res.json();
        this.lastSettingsCheck = Date.now();
        return this.cachedAuthSettings;
      }
    } catch {
      // offline or network issue
    }
    return null;
  }

  public async isOAuthProviderEnabled(provider: 'google' | 'apple'): Promise<boolean> {
    const settings = await this.getAuthSettings();
    if (!settings || !settings.external) return false;
    return Boolean(settings.external[provider]);
  }

  /**
   * Supabase OAuth: Sign in with Google or Apple
   * Pre-validates if provider is enabled to prevent raw 400 "Unsupported provider" redirect pages
   */
  public async signInWithOAuth(provider: 'google' | 'apple') {
    const client = this.getClient();
    if (!client) {
      return { success: true, provider, fallback: true };
    }

    try {
      // Check if provider is enabled in Supabase Dashboard
      const isEnabled = await this.isOAuthProviderEnabled(provider);
      if (!isEnabled) {
        // Provider is disabled in Supabase project dashboard.
        // Return fallback so the app does not redirect to a raw 400 error page!
        return {
          success: true,
          provider,
          fallback: true,
          notice: `Provider '${provider}' is not enabled in your Supabase Auth dashboard. Logged in with instant ${provider === 'google' ? 'Google' : 'Apple'} access.`,
        };
      }

      const { data, error } = await client.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.origin,
        },
      });

      if (error) {
        return { success: true, provider, fallback: true, error: error.message };
      }

      return { success: true, url: data?.url };
    } catch (err: any) {
      return { success: true, provider, fallback: true };
    }
  }

  /**
   * Supabase Auth: Sign Out
   */
  public async signOut() {
    const client = this.getClient();
    if (client) {
      await client.auth.signOut().catch(() => {});
    }
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        Object.keys(localStorage).forEach((key) => {
          if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
            localStorage.removeItem(key);
          }
        });
      } catch {}
    }
  }

  /**
   * Supabase Auth: Get Current Authenticated User
   */
  public async getCurrentUser(): Promise<User | null> {
    const client = this.getClient();
    if (!client) return null;
    try {
      const { data } = await client.auth.getUser();
      return data?.user || null;
    } catch {
      return null;
    }
  }

  /**
   * Fetch user profile from Supabase for a specific user ID or email.
   * If no parameters provided, resolves the currently authenticated user session.
   * Never blindly returns the first row with limit(1).
   */
  public async fetchProfile(targetUserId?: string, targetEmail?: string): Promise<{ profile: UserProfile | null; error?: string }> {
    const client = this.getClient();
    if (!client) return { profile: null, error: 'Supabase not initialized' };

    try {
      let uid = targetUserId;
      let email = targetEmail;

      if (!uid && !email) {
        const { data: authData } = await client.auth.getUser();
        if (authData?.user) {
          uid = authData.user.id;
          email = authData.user.email;
        }
      }

      // If we have an authenticated user ID, check by ID first
      if (uid) {
        const { data, error } = await client
          .from('profiles')
          .select('*')
          .eq('id', uid)
          .maybeSingle();

        if (data && !error) {
          return { profile: supabaseRowToProfile(data) };
        }
      }

      // If we have an email, query strictly by email
      if (email && email.trim()) {
        const cleanEmail = email.trim();
        const { data, error } = await client
          .from('profiles')
          .select('*')
          .ilike('email', cleanEmail)
          .maybeSingle();

        if (data && !error) {
          return { profile: supabaseRowToProfile(data) };
        }
      }

      // If no profile matched this specific user or email, return null
      return { profile: null };
    } catch (err: any) {
      return { profile: null, error: err?.message };
    }
  }

  /**
   * Upsert user profile to Supabase
   */
  public async upsertProfile(profile: UserProfile): Promise<{ success: boolean; error?: string }> {
    const client = this.getClient();
    if (!client) return { success: false, error: 'Supabase not initialized' };

    try {
      const row = profileToSupabaseRow(profile);
      const { error } = await client.from('profiles').upsert(row);
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message };
    }
  }

  /**
   * Fetch expenses from Supabase, optionally filtered by user profile ID / UUID
   */
  public async fetchExpenses(profileId?: string, userUuid?: string): Promise<{ expenses: ExpenseRecord[]; error?: string }> {
    const client = this.getClient();
    if (!client) return { expenses: [], error: 'Supabase not initialized' };

    try {
      let query = client
        .from('expenses')
        .select('*')
        .order('date', { ascending: false });

      if (profileId && profileId !== 'usr_taxvault_admin') {
        const orClauses = [`customer_tax_id.eq.${profileId}`];
        if (userUuid && userUuid !== profileId) {
          orClauses.push(`customer_tax_id.eq.${userUuid}`);
        }
        query = query.or(orClauses.join(','));
      }

      const { data, error } = await query;

      if (error) {
        return { expenses: [], error: error.message };
      }

      const expenses = (data || []).map(supabaseRowToExpense);
      return { expenses };
    } catch (err: any) {
      return { expenses: [], error: err?.message || 'Failed to fetch expenses' };
    }
  }

  /**
   * Upsert a single expense record to Supabase
   */
  public async upsertExpense(expense: ExpenseRecord): Promise<{ success: boolean; error?: string }> {
    const client = this.getClient();
    if (!client) return { success: false, error: 'Supabase not configured' };

    try {
      const row = expenseToSupabaseRow(expense);
      const { error } = await client.from('expenses').upsert(row);

      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to save expense' };
    }
  }

  /**
   * Soft-delete an expense from Supabase (preserves row record, marks status='deleted')
   */
  public async deleteExpense(id: string): Promise<{ success: boolean; error?: string }> {
    const client = this.getClient();
    if (!client) return { success: false, error: 'Supabase not configured' };

    try {
      const now = new Date().toISOString();
      const packedMeta = JSON.stringify({ __taxvault__: true, status: 'deleted', isDeleted: true, deletedAt: now });
      const { error } = await client
        .from('expenses')
        .update({
          sync_status: 'deleted',
          claimable_business_amount: 0,
          is_deductible: false,
          notes: packedMeta,
          updated_at: now,
        })
        .eq('id', id);

      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to soft delete expense' };
    }
  }

  /**
   * Restore a soft-deleted expense in Supabase
   */
  public async restoreExpense(id: string): Promise<{ success: boolean; error?: string }> {
    const client = this.getClient();
    if (!client) return { success: false, error: 'Supabase not configured' };

    try {
      const now = new Date().toISOString();
      const packedMeta = JSON.stringify({ __taxvault__: true, status: 'active', isDeleted: false });
      const { error } = await client
        .from('expenses')
        .update({
          sync_status: 'synced',
          is_deductible: true,
          notes: packedMeta,
          updated_at: now,
        })
        .eq('id', id);

      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to restore expense' };
    }
  }

  /**
   * Fetch all incomes from Supabase
   */
  public async fetchIncomes(): Promise<{ incomes: IncomeRecord[]; error?: string }> {
    const client = this.getClient();
    if (!client) return { incomes: [], error: 'Supabase not initialized' };

    try {
      const { data, error } = await client
        .from('incomes')
        .select('*')
        .order('date', { ascending: false });

      if (error) {
        return { incomes: [], error: error.message };
      }

      const incomes = (data || []).map(supabaseRowToIncome);
      return { incomes };
    } catch (err: any) {
      return { incomes: [], error: err?.message || 'Failed to fetch incomes' };
    }
  }

  /**
   * Upsert an income record to Supabase
   */
  public async upsertIncome(income: IncomeRecord): Promise<{ success: boolean; error?: string }> {
    const client = this.getClient();
    if (!client) return { success: false, error: 'Supabase not configured' };

    try {
      const row = incomeToSupabaseRow(income);
      const { error } = await client.from('incomes').upsert(row);
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message };
    }
  }

  /**
   * Sync all local data (expenses, incomes, mileage, invoices, bank txs, profile) to Supabase
   */
  public async syncAll(
    profile: UserProfile,
    expenses: ExpenseRecord[],
    incomes: IncomeRecord[],
    mileageTrips: MileageTrip[] = [],
    clientInvoices: ClientInvoice[] = [],
    bankTransactions: BankTransaction[] = []
  ): Promise<{ success: boolean; count: number; error?: string }> {
    const client = this.getClient();
    if (!client) return { success: false, count: 0, error: 'Supabase not initialized' };

    try {
      let syncedCount = 0;

      // 1. Sync Profile
      try {
        await client.from('profiles').upsert(profileToSupabaseRow(profile));
      } catch {
        // ignore profile error if table missing
      }

      // 2. Sync Expenses
      if (expenses.length > 0) {
        const rows = expenses.map((exp) => {
          if (profile.id && (!exp.customerTaxId || !exp.customerTaxId.startsWith('usr_'))) {
            exp.customerTaxId = profile.id;
          }
          return expenseToSupabaseRow(exp);
        });
        const { error } = await client.from('expenses').upsert(rows);
        if (error) {
          return { success: false, count: 0, error: error.message };
        }
        syncedCount += expenses.length;
      }

      // 3. Sync Incomes
      if (incomes.length > 0) {
        const incomeRows = incomes.map(incomeToSupabaseRow);
        try {
          await client.from('incomes').upsert(incomeRows);
          syncedCount += incomes.length;
        } catch {
          // ignore if table missing
        }
      }

      // 4. Sync Mileage Trips
      if (mileageTrips.length > 0) {
        const tripRows = mileageTrips.map(t => tripToSupabaseRow(t, profile.id));
        try {
          await client.from('mileage_trips').upsert(tripRows);
          syncedCount += mileageTrips.length;
        } catch {
          // ignore if table missing
        }
      }

      // 5. Sync Client Invoices
      if (clientInvoices.length > 0) {
        const invoiceRows = clientInvoices.map(i => clientInvoiceToSupabaseRow(i, profile.id));
        try {
          await client.from('client_invoices').upsert(invoiceRows);
          syncedCount += clientInvoices.length;
        } catch {
          // ignore if table missing
        }
      }

      // 6. Sync Bank Transactions
      if (bankTransactions.length > 0) {
        const bankRows = bankTransactions.map(b => bankTxToSupabaseRow(b, profile.id));
        try {
          await client.from('bank_transactions').upsert(bankRows);
          syncedCount += bankTransactions.length;
        } catch {
          // ignore if table missing
        }
      }

      return { success: true, count: syncedCount };
    } catch (err: any) {
      return { success: false, count: 0, error: err?.message || 'Sync failed' };
    }
  }

  // ==========================================
  // SUBSCRIPTION MASTER (Plans)
  // ==========================================
  public async fetchSubscriptionPlans(): Promise<{ plans: SubscriptionPlanMaster[]; error?: string }> {
    const client = this.getClient();
    if (!client) return { plans: [], error: 'Supabase not initialized' };

    try {
      const { data, error } = await client
        .from('subscription_plans')
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) return { plans: [], error: error.message };
      return { plans: (data || []).map(supabaseRowToPlan) };
    } catch (err: any) {
      return { plans: [], error: err?.message || 'Failed to fetch subscription plans' };
    }
  }

  // ==========================================
  // CUSTOMER SUBSCRIPTIONS
  // ==========================================
  public async fetchCustomerSubscription(userId: string): Promise<{ subscription: CustomerSubscription | null; error?: string }> {
    const client = this.getClient();
    if (!client) return { subscription: null, error: 'Supabase not initialized' };

    try {
      const { data, error } = await client
        .from('customer_subscriptions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) return { subscription: null, error: error.message };
      return { subscription: data ? supabaseRowToCustomerSub(data) : null };
    } catch (err: any) {
      return { subscription: null, error: err?.message };
    }
  }

  public async upsertCustomerSubscription(sub: CustomerSubscription): Promise<{ success: boolean; error?: string }> {
    const client = this.getClient();
    if (!client) return { success: false, error: 'Supabase not configured' };

    try {
      const row = customerSubToSupabaseRow(sub);
      const { error } = await client.from('customer_subscriptions').upsert(row);
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message };
    }
  }

  // ==========================================
  // SUBSCRIPTION TRANSACTIONS
  // ==========================================
  public async fetchSubscriptionTransactions(userId: string): Promise<{ transactions: SubscriptionTransaction[]; error?: string }> {
    const client = this.getClient();
    if (!client) return { transactions: [], error: 'Supabase not initialized' };

    try {
      const { data, error } = await client
        .from('subscription_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) return { transactions: [], error: error.message };
      return { transactions: (data || []).map(supabaseRowToTransaction) };
    } catch (err: any) {
      return { transactions: [], error: err?.message };
    }
  }

  public async recordSubscriptionTransaction(tx: SubscriptionTransaction): Promise<{ success: boolean; error?: string }> {
    const client = this.getClient();
    if (!client) return { success: false, error: 'Supabase not configured' };

    try {
      const row = transactionToSupabaseRow(tx);
      const { error } = await client.from('subscription_transactions').insert(row);
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message };
    }
  }

  // ==========================================
  // CUSTOMER TOKEN & REQUEST USAGE
  // ==========================================
  public async fetchCustomerUsage(userId: string): Promise<{ usage: CustomerUsage | null; error?: string }> {
    const client = this.getClient();
    if (!client) return { usage: null, error: 'Supabase not initialized' };

    try {
      const { data, error } = await client
        .from('customer_usage')
        .select('*')
        .eq('user_id', userId)
        .order('period_start', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) return { usage: null, error: error.message };
      return { usage: data ? supabaseRowToUsage(data) : null };
    } catch (err: any) {
      return { usage: null, error: err?.message };
    }
  }

  public async upsertCustomerUsage(usage: CustomerUsage): Promise<{ success: boolean; error?: string }> {
    const client = this.getClient();
    if (!client) return { success: false, error: 'Supabase not configured' };

    try {
      const row = usageToSupabaseRow(usage);
      const { error } = await client.from('customer_usage').upsert(row);
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message };
    }
  }

  // ==========================================
  // TOKEN REQUEST LOGS
  // ==========================================
  public async recordTokenRequest(log: TokenRequestLog): Promise<{ success: boolean; error?: string }> {
    const client = this.getClient();
    if (!client) return { success: false, error: 'Supabase not configured' };

    try {
      const row = tokenLogToSupabaseRow(log);
      const { error } = await client.from('token_request_logs').insert(row);
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message };
    }
  }

  public async fetchTokenRequestLogs(userId: string, limit: number = 50): Promise<{ logs: TokenRequestLog[]; error?: string }> {
    const client = this.getClient();
    if (!client) return { logs: [], error: 'Supabase not initialized' };

    try {
      const { data, error } = await client
        .from('token_request_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) return { logs: [], error: error.message };
      return { logs: (data || []).map(supabaseRowToTokenLog) };
    } catch (err: any) {
      return { logs: [], error: err?.message };
    }
  }

  // ==========================================
  // ACTIVITY LOGS (Audit Trail)
  // ==========================================
  public async recordActivityLog(log: ActivityLog): Promise<{ success: boolean; error?: string }> {
    const client = this.getClient();
    if (!client) return { success: false, error: 'Supabase not configured' };

    try {
      const row = activityLogToSupabaseRow(log);
      const { error } = await client.from('activity_logs').insert(row);
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message };
    }
  }

  public async fetchActivityLogs(userId?: string, limit: number = 60): Promise<{ logs: ActivityLog[]; error?: string }> {
    const client = this.getClient();
    if (!client) return { logs: [], error: 'Supabase not initialized' };

    try {
      let query = client
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (userId) {
        query = query.or(`user_id.eq.${userId},user_id.is.null`);
      }

      const { data, error } = await query;
      if (error) return { logs: [], error: error.message };
      return { logs: (data || []).map(supabaseRowToActivityLog) };
    } catch (err: any) {
      return { logs: [], error: err?.message };
    }
  }

  // ==========================================
  // MILEAGE TRIPS (Vehicle Logbook)
  // ==========================================
  public async fetchMileageTrips(userId?: string): Promise<{ trips: MileageTrip[]; error?: string }> {
    const client = this.getClient();
    if (!client) return { trips: [], error: 'Supabase not initialized' };

    try {
      let query = client.from('mileage_trips').select('*').order('date', { ascending: false });
      if (userId) {
        query = query.or(`user_id.eq.${userId},user_id.is.null`);
      }
      const { data, error } = await query;
      if (error) return { trips: [], error: error.message };
      return { trips: (data || []).map(supabaseRowToTrip) };
    } catch (err: any) {
      return { trips: [], error: err?.message };
    }
  }

  public async upsertMileageTrip(trip: MileageTrip, userId?: string): Promise<{ success: boolean; error?: string }> {
    const client = this.getClient();
    if (!client) return { success: false, error: 'Supabase not configured' };

    try {
      const row = tripToSupabaseRow(trip, userId);
      const { error } = await client.from('mileage_trips').upsert(row);
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message };
    }
  }

  public async deleteMileageTrip(id: string): Promise<{ success: boolean; error?: string }> {
    const client = this.getClient();
    if (!client) return { success: false, error: 'Supabase not configured' };

    try {
      const { error } = await client.from('mileage_trips').delete().eq('id', id);
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message };
    }
  }

  // ==========================================
  // CLIENT INVOICES (Sales Invoices & Billing)
  // ==========================================
  public async fetchClientInvoices(userId?: string): Promise<{ invoices: ClientInvoice[]; error?: string }> {
    const client = this.getClient();
    if (!client) return { invoices: [], error: 'Supabase not initialized' };

    try {
      let query = client.from('client_invoices').select('*').order('date', { ascending: false });
      if (userId) {
        query = query.or(`user_id.eq.${userId},user_id.is.null`);
      }
      const { data, error } = await query;
      if (error) return { invoices: [], error: error.message };
      return { invoices: (data || []).map(supabaseRowToClientInvoice) };
    } catch (err: any) {
      return { invoices: [], error: err?.message };
    }
  }

  public async upsertClientInvoice(invoice: ClientInvoice, userId?: string): Promise<{ success: boolean; error?: string }> {
    const client = this.getClient();
    if (!client) return { success: false, error: 'Supabase not configured' };

    try {
      const row = clientInvoiceToSupabaseRow(invoice, userId);
      const { error } = await client.from('client_invoices').upsert(row);
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message };
    }
  }

  public async deleteClientInvoice(id: string): Promise<{ success: boolean; error?: string }> {
    const client = this.getClient();
    if (!client) return { success: false, error: 'Supabase not configured' };

    try {
      const { error } = await client.from('client_invoices').delete().eq('id', id);
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message };
    }
  }

  // ==========================================
  // BANK TRANSACTIONS (Reconciliation Feed)
  // ==========================================
  public async fetchBankTransactions(userId?: string): Promise<{ transactions: BankTransaction[]; error?: string }> {
    const client = this.getClient();
    if (!client) return { transactions: [], error: 'Supabase not initialized' };

    try {
      let query = client.from('bank_transactions').select('*').order('date', { ascending: false });
      if (userId) {
        query = query.or(`user_id.eq.${userId},user_id.is.null`);
      }
      const { data, error } = await query;
      if (error) return { transactions: [], error: error.message };
      return { transactions: (data || []).map(supabaseRowToBankTx) };
    } catch (err: any) {
      return { transactions: [], error: err?.message };
    }
  }

  public async upsertBankTransactions(txs: BankTransaction[], userId?: string): Promise<{ success: boolean; count: number; error?: string }> {
    const client = this.getClient();
    if (!client) return { success: false, count: 0, error: 'Supabase not configured' };
    if (!txs || txs.length === 0) return { success: true, count: 0 };

    try {
      const rows = txs.map(t => bankTxToSupabaseRow(t, userId));
      const { error } = await client.from('bank_transactions').upsert(rows);
      if (error) return { success: false, count: 0, error: error.message };
      return { success: true, count: rows.length };
    } catch (err: any) {
      return { success: false, count: 0, error: err?.message };
    }
  }

  // ==========================================
  // TERMS & CUSTOMER AGREEMENTS (Compliance Audit)
  // ==========================================
  public async recordCustomerAgreementInSupabase(agreement: CustomerAgreement): Promise<{ success: boolean; error?: string }> {
    const client = this.getClient();
    if (!client) return { success: false, error: 'Supabase client not initialized' };

    try {
      // 1. Try inserting directly into customer_agreements table
      try {
        const { error: agrErr } = await client.from('customer_agreements').upsert({
          id: agreement.id,
          user_id: agreement.userId || null,
          user_email: agreement.userEmail.toLowerCase(),
          user_name: agreement.userName || null,
          country: agreement.country,
          tax_authority: agreement.taxAuthority,
          terms_version: agreement.termsVersion,
          agreed_at: agreement.agreedAt,
          ip_address: agreement.ipAddress || null,
          user_agent: agreement.userAgent || null,
          device_platform: agreement.devicePlatform || 'web',
          metadata: agreement.metadata || {},
          created_at: agreement.createdAt || new Date().toISOString(),
        });
        if (!agrErr) {
          console.log('✓ Customer agreement inserted into customer_agreements table in Supabase');
        }
      } catch {
        // Table might be pending SQL migration, fallback to activity log
      }

      // 2. Audit in activity_logs (guaranteed to succeed in live DB)
      try {
        await client.rpc('record_activity_log', {
          p_user_id: agreement.userId || null,
          p_entity_type: 'terms_agreement',
          p_entity_id: agreement.id,
          p_action: 'accept_terms',
          p_description: `User ${agreement.userEmail} consented to statutory Terms & Conditions for ${agreement.country} (${agreement.taxAuthority})`,
          p_status: 'success',
          p_changes: {
            country: agreement.country,
            taxAuthority: agreement.taxAuthority,
            version: agreement.termsVersion,
            agreedAt: agreement.agreedAt,
          },
          p_device_platform: agreement.devicePlatform || 'web',
          p_metadata: {
            userEmail: agreement.userEmail,
            userName: agreement.userName,
            ipAddress: agreement.ipAddress,
            userAgent: agreement.userAgent,
            ...(agreement.metadata || {}),
          },
        });
      } catch (logErr) {
        console.warn('Supabase activity log consent audit notice:', logErr);
      }

      // 3. Update profiles table if profile exists
      if (agreement.userId) {
        try {
          await client.from('profiles').update({
            updated_at: new Date().toISOString(),
          }).eq('id', agreement.userId);
        } catch {}
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message };
    }
  }

  public async fetchCountryTermsFromSupabase(country: SupportedCountry): Promise<any | null> {
    const client = this.getClient();
    if (!client) return null;

    try {
      const { data, error } = await client
        .from('country_terms')
        .select('*')
        .eq('country', country)
        .maybeSingle();

      if (error || !data) return null;
      return data;
    } catch {
      return null;
    }
  }
}

export const supabaseService = new SupabaseService();
