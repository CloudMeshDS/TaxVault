import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase credentials missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  console.log('Seeding sample data to Supabase database...');

  // 1. Seed Profile
  const sampleProfile = {
    id: 'usr_taxvault_admin',
    full_name: 'Alex Morgan',
    email: 'admin@taxvault.app',
    country: 'NZ',
    entity_type: 'small_business',
    tax_number: '139-882-741',
    gst_registered: true,
    gst_number: '139-882-741',
    base_currency: 'NZD',
    financial_year_ending: '2027-03-31',
    accountant_email: 'audit@premier-tax.co.nz',
    accountant_name: 'Elena Rostova, CA (Chartered Accountants ANZ)',
    mfa_enabled: true,
    biometric_enabled: true,
    device_platform: 'ios',
    last_backup_date: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { error: pErr } = await supabase.from('profiles').upsert(sampleProfile);
  if (pErr) console.error('Profile seed error:', pErr.message);
  else console.log('✓ Profile seeded in database');

  // 2. Seed Expenses
  const sampleExpenses = [
    {
      id: 'exp_01',
      date: '2026-09-14',
      merchant: 'Bunnings Trade Auckland',
      category: 'Tools & Equipment',
      description: 'DeWalt 18V Cordless Drill & Safety Protection Kit',
      amount: 450.00,
      original_amount: null,
      original_currency: null,
      exchange_rate: null,
      gst_amount: 58.70,
      is_deductible: true,
      deductible_percentage: 100,
      receipt_url: null,
      receipt_file_name: 'bunnings_trade_receipt_0914.jpg',
      receipt_number: 'BUN-992110',
      payment_method: 'EFTPOS',
      notes: 'Required for client site inspections and diagnostics',
      sync_status: 'synced',
      created_at: '2026-09-14T14:30:00Z',
      updated_at: '2026-09-14T14:30:00Z',
    },
    {
      id: 'exp_02',
      date: '2026-09-28',
      merchant: 'Spark Business New Zealand',
      category: 'Utilities & Phone',
      description: 'Business Fibre 500 & Unlimited Mobile 5G Roaming Plan',
      amount: 240.00,
      original_amount: null,
      original_currency: null,
      exchange_rate: null,
      gst_amount: 31.30,
      is_deductible: true,
      deductible_percentage: 100,
      receipt_url: null,
      receipt_file_name: 'spark_business_bill_sep26.pdf',
      receipt_number: 'SPK-881240',
      payment_method: 'Bank Transfer',
      notes: 'Monthly telecommunications deduction',
      sync_status: 'synced',
      created_at: '2026-09-28T09:15:00Z',
      updated_at: '2026-09-28T09:15:00Z',
    },
    {
      id: 'exp_03',
      date: '2026-10-02',
      merchant: 'Harbourside Seafood Grill',
      category: 'Client Entertainment',
      description: 'Strategic Client Dinner - Viaduct Harbour (3 attendees)',
      amount: 350.00,
      original_amount: null,
      original_currency: null,
      exchange_rate: null,
      gst_amount: 45.65,
      is_deductible: true,
      deductible_percentage: 50,
      receipt_url: null,
      receipt_file_name: 'harbourside_dinner_receipt.jpg',
      receipt_number: 'HSG-4819',
      payment_method: 'Credit Card',
      notes: 'Inland Revenue 50% entertainment rule applies ($175 deductible)',
      sync_status: 'synced',
      created_at: '2026-10-02T22:00:00Z',
      updated_at: '2026-10-02T22:00:00Z',
    },
    {
      id: 'exp_04',
      date: '2026-10-04',
      merchant: 'BP Connect Auckland Airport',
      category: 'Vehicle & Mileage',
      description: 'Premium Diesel - Client Onsite Visit Transport',
      amount: 160.00,
      original_amount: null,
      original_currency: null,
      exchange_rate: null,
      gst_amount: 20.87,
      is_deductible: true,
      deductible_percentage: 85,
      receipt_url: null,
      receipt_file_name: 'bp_connect_fuel_1004.jpg',
      receipt_number: 'BP-109283',
      payment_method: 'EFTPOS',
      notes: 'Work vehicle travel Auckland to Hamilton (85% business use per logbook)',
      sync_status: 'synced',
      created_at: '2026-10-04T08:45:00Z',
      updated_at: '2026-10-04T08:45:00Z',
    },
    {
      id: 'exp_05',
      date: '2026-09-01',
      merchant: 'AWS Cloud & Supabase Hosting',
      category: 'Software & Tech',
      description: 'Server Infrastructure & Database PostgreSQL Instance',
      amount: 210.00,
      original_amount: 125.00,
      original_currency: 'USD',
      exchange_rate: 1.68,
      gst_amount: 27.39,
      is_deductible: true,
      deductible_percentage: 100,
      receipt_url: null,
      receipt_file_name: 'aws_supabase_invoice.pdf',
      receipt_number: 'INV-CLOUD-991',
      payment_method: 'Credit Card',
      notes: 'Converted from USD at official monthly mid-market exchange rate',
      sync_status: 'synced',
      created_at: '2026-09-01T08:00:00Z',
      updated_at: '2026-09-01T08:00:00Z',
    },
    {
      id: 'exp_06',
      date: '2026-08-15',
      merchant: 'Air New Zealand',
      category: 'Travel & Accommodation',
      description: 'Return Flight AKL to WLG - Annual Tax Accounting Symposium',
      amount: 395.00,
      original_amount: null,
      original_currency: null,
      exchange_rate: null,
      gst_amount: 51.52,
      is_deductible: true,
      deductible_percentage: 100,
      receipt_url: null,
      receipt_file_name: 'air_nz_booking_wlg.pdf',
      receipt_number: 'ANZ-TK-2819',
      payment_method: 'Credit Card',
      notes: 'Professional development seminar in Wellington',
      sync_status: 'synced',
      created_at: '2026-08-15T07:15:00Z',
      updated_at: '2026-08-15T07:15:00Z',
    },
    {
      id: 'exp_07',
      date: '2026-08-22',
      merchant: 'Warehouse Stationery Newmarket',
      category: 'Office & Admin',
      description: 'Ergonomic Monitor Mount & Tax Vault Filing Folders',
      amount: 185.00,
      original_amount: null,
      original_currency: null,
      exchange_rate: null,
      gst_amount: 24.13,
      is_deductible: true,
      deductible_percentage: 100,
      receipt_url: null,
      receipt_file_name: 'warehouse_stationery_rec.jpg',
      receipt_number: 'WS-40291',
      payment_method: 'Debit Card',
      notes: 'Office ergonomics setup',
      sync_status: 'synced',
      created_at: '2026-08-22T11:20:00Z',
      updated_at: '2026-08-22T11:20:00Z',
    },
    {
      id: 'exp_08',
      date: '2026-07-29',
      merchant: 'Kensington Swann Legal Practice',
      category: 'Professional Services',
      description: 'Master Commercial Services Agreement & Tax Compliance Review',
      amount: 750.00,
      original_amount: null,
      original_currency: null,
      exchange_rate: null,
      gst_amount: 97.83,
      is_deductible: true,
      deductible_percentage: 100,
      receipt_url: null,
      receipt_file_name: 'legal_advisory_invoice.pdf',
      receipt_number: 'INV-KS-2026-88',
      payment_method: 'Bank Transfer',
      notes: 'Corporate compliance counsel',
      sync_status: 'synced',
      created_at: '2026-07-29T16:00:00Z',
      updated_at: '2026-07-29T16:00:00Z',
    },
  ];

  const { error: eErr } = await supabase.from('expenses').upsert(sampleExpenses);
  if (eErr) console.error('Expenses seed error:', eErr.message);
  else console.log(`✓ ${sampleExpenses.length} sample expenses seeded in database`);

  // 3. Seed Incomes
  const sampleIncomes = [
    {
      id: 'inc_01',
      date: '2026-09-30',
      client: 'Meridian Energy Consulting',
      description: 'Q3 Enterprise Architecture Retainer & Advisory',
      amount: 9500.00,
      gst_amount: 1239.13,
      currency: 'NZD',
      invoice_number: 'INV-AM-2026-001',
      created_at: '2026-09-30T17:00:00Z',
    },
    {
      id: 'inc_02',
      date: '2026-08-31',
      client: 'Pacific Telecom Networks Ltd',
      description: 'Security & Cloud Compliance Systems Audit',
      amount: 8200.00,
      gst_amount: 1069.57,
      currency: 'NZD',
      invoice_number: 'INV-AM-2026-002',
      created_at: '2026-08-31T17:00:00Z',
    },
    {
      id: 'inc_03',
      date: '2026-07-31',
      client: 'FinTech Pacific Horizon',
      description: 'Payment Gateway Integration & Technical Assessment',
      amount: 6800.00,
      gst_amount: 886.96,
      currency: 'NZD',
      invoice_number: 'INV-AM-2026-003',
      created_at: '2026-07-31T17:00:00Z',
    },
  ];

  const { error: iErr } = await supabase.from('incomes').upsert(sampleIncomes);
  if (iErr) console.error('Incomes seed error:', iErr.message);
  else console.log(`✓ ${sampleIncomes.length} sample incomes seeded in database`);

  // 4. Seed Subscription Master Plans
  const samplePlans = [
    {
      id: 'free',
      plan_code: 'starter_free',
      name: 'Starter Free',
      tagline: 'Basic personal receipt tracking',
      description: 'Entry level personal tracking with 10 free AI receipt scans per month.',
      billing_cycle: 'monthly',
      price_inr: 0,
      price_usd: 0,
      price_nzd: 0,
      price_aud: 0,
      price_cad: 0,
      price_annual_inr: 0,
      price_annual_usd: 0,
      price_annual_nzd: 0,
      price_annual_aud: 0,
      price_annual_cad: 0,
      monthly_receipt_limit: 10,
      monthly_token_limit: 50000,
      monthly_request_limit: 25,
      monthly_export_limit: 5,
      features: ['Up to 10 receipts/month', 'Basic OCR categorization', 'Standard CSV export', 'Local on-device storage'],
      badge: 'FREE FOREVER',
      sort_order: 1,
    },
    {
      id: 'pro',
      plan_code: 'tax_compliance_pro',
      name: 'Tax Compliance Pro',
      tagline: 'Full tax season automation for contractors & small business',
      description: 'Unlimited receipt scanning, Chartered Accountant audit packs, and multi-currency tools.',
      billing_cycle: 'monthly',
      price_inr: 1199,
      price_usd: 14.99,
      price_nzd: 24.99,
      price_aud: 22.99,
      price_cad: 19.99,
      price_annual_inr: 11999,
      price_annual_usd: 149.00,
      price_annual_nzd: 249.00,
      price_annual_aud: 229.00,
      price_annual_cad: 199.00,
      monthly_receipt_limit: -1,
      monthly_token_limit: 2000000,
      monthly_request_limit: 1000,
      monthly_export_limit: -1,
      features: ['Unlimited receipts & neural OCR', 'Official Chartered Accountant Audit PDF', 'Multi-sheet Excel (.xlsx) pack', 'Direct CA Reviewer Token sharing', 'AES-256 encrypted cloud backup'],
      badge: 'RECOMMENDED',
      sort_order: 2,
    },
    {
      id: 'enterprise',
      plan_code: 'firm_multi_entity',
      name: 'CA Firm & Multi-Entity',
      tagline: 'For accountants, advisors & multiple businesses',
      description: 'Multiple entities, direct Xero & MYOB sync, and dedicated CA channel.',
      billing_cycle: 'monthly',
      price_inr: 3199,
      price_usd: 39.99,
      price_nzd: 64.99,
      price_aud: 59.99,
      price_cad: 54.99,
      price_annual_inr: 31999,
      price_annual_usd: 399.00,
      price_annual_nzd: 649.00,
      price_annual_aud: 599.00,
      price_annual_cad: 549.00,
      monthly_receipt_limit: -1,
      monthly_token_limit: 10000000,
      monthly_request_limit: 10000,
      monthly_export_limit: -1,
      features: ['Everything in Pro', 'Multiple trading entities & IRD/GST numbers', 'Direct Xero & MYOB API sync', 'Dedicated CA reviewer channel', 'Audit log export'],
      badge: 'FOR FIRMS',
      sort_order: 3,
    },
  ];

  const { error: spErr } = await supabase.from('subscription_plans').upsert(samplePlans);
  if (spErr) console.log('Subscription plans seed notice:', spErr.message);
  else console.log(`✓ ${samplePlans.length} subscription master plans seeded`);

  // 5. Seed Customer Subscriptions
  const sampleCustSub = {
    id: 'sub_usr_taxvault_admin',
    user_id: 'usr_taxvault_admin',
    plan_id: 'pro',
    status: 'active',
    billing_cycle: 'annual',
    current_period_start: new Date().toISOString(),
    current_period_end: new Date(Date.now() + 365 * 86400000).toISOString(),
    cancel_at_period_end: false,
    payment_method: 'Credit Card',
    metadata: { gateway: 'stripe' },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { error: csErr } = await supabase.from('customer_subscriptions').upsert(sampleCustSub);
  if (csErr) console.log('Customer subscriptions seed notice:', csErr.message);
  else console.log('✓ Customer subscription seeded');

  // 6. Seed Subscription Transactions
  const sampleTransactions = [
    {
      id: 'tx_sub_2026_01',
      subscription_id: 'sub_usr_taxvault_admin',
      user_id: 'usr_taxvault_admin',
      plan_id: 'pro',
      amount: 149.00,
      currency: 'USD',
      status: 'succeeded',
      billing_cycle: 'annual',
      payment_gateway: 'stripe',
      gateway_payment_id: 'ch_3Lq9920199',
      receipt_number: 'RCP-SUB-89102',
      tax_amount: 19.43,
      created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    },
  ];

  const { error: txErr } = await supabase.from('subscription_transactions').upsert(sampleTransactions);
  if (txErr) console.log('Subscription transactions seed notice:', txErr.message);
  else console.log(`✓ ${sampleTransactions.length} subscription transactions seeded`);

  // 7. Seed Customer Token / Request Usage
  const currentMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
  const currentMonthEnd = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0];

  const sampleUsage = {
    id: 'usg_usr_taxvault_admin',
    user_id: 'usr_taxvault_admin',
    period_start: currentMonthStart,
    period_end: currentMonthEnd,
    scans_used: 15,
    scans_limit: 500,
    tokens_used: 28450,
    tokens_limit: 2000000,
    requests_count: 32,
    requests_limit: 1000,
    exports_count: 4,
    exports_limit: 50,
    storage_bytes_used: 18500000,
    storage_bytes_limit: 104857600,
    last_request_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { error: uErr } = await supabase.from('customer_usage').upsert(sampleUsage);
  if (uErr) console.log('Customer usage seed notice:', uErr.message);
  else console.log('✓ Customer token & request usage seeded');

  // 8. Seed Token Request Logs
  const sampleTokenLogs = [
    {
      id: 'tok_log_01',
      user_id: 'usr_taxvault_admin',
      request_type: 'receipt_ocr',
      model_name: 'gemini-2.5-flash',
      prompt_tokens: 420,
      completion_tokens: 180,
      total_tokens: 600,
      latency_ms: 152,
      estimated_cost_usd: 0.000065,
      status: 'success',
      created_at: new Date(Date.now() - 7200000).toISOString(),
    },
    {
      id: 'tok_log_02',
      user_id: 'usr_taxvault_admin',
      request_type: 'receipt_ocr',
      model_name: 'gemini-3.5-flash-lite',
      prompt_tokens: 390,
      completion_tokens: 145,
      total_tokens: 535,
      latency_ms: 118,
      estimated_cost_usd: 0.000048,
      status: 'success',
      created_at: new Date(Date.now() - 3600000).toISOString(),
    },
  ];

  const { error: tlErr } = await supabase.from('token_request_logs').upsert(sampleTokenLogs);
  if (tlErr) console.log('Token request logs seed notice:', tlErr.message);
  else console.log(`✓ ${sampleTokenLogs.length} token request logs seeded`);

  // 9. Seed Activity Logs
  const sampleActivityLogs = [
    {
      id: 'act_01_db_init',
      user_id: 'usr_taxvault_admin',
      entity_type: 'settings',
      action: 'update',
      description: 'Supabase schema migrations verified: Subscription Master, Usage, and Activity Logs initialized',
      status: 'success',
      device_platform: 'android',
      metadata: { initializedAt: new Date().toISOString() },
      created_at: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: 'act_02_plan_active',
      user_id: 'usr_taxvault_admin',
      entity_type: 'subscription',
      action: 'upgrade_plan',
      description: 'Activated Tax Compliance Pro annual subscription plan',
      status: 'success',
      device_platform: 'android',
      metadata: { plan: 'pro', billingCycle: 'annual' },
      created_at: new Date(Date.now() - 43200000).toISOString(),
    },
    {
      id: 'act_03_ocr_scan',
      user_id: 'usr_taxvault_admin',
      entity_type: 'ai_scan',
      action: 'scan_receipt',
      description: 'AI Multimodal Vision OCR scanned invoice Bunnings Trade ($450.00 NZD)',
      status: 'success',
      device_platform: 'android',
      metadata: { merchant: 'Bunnings Trade', amount: 450.00 },
      created_at: new Date(Date.now() - 3600000).toISOString(),
    },
  ];

  const { error: actErr } = await supabase.from('activity_logs').upsert(sampleActivityLogs);
  if (actErr) console.log('Activity logs seed notice:', actErr.message);
  else console.log(`✓ ${sampleActivityLogs.length} activity audit logs seeded`);

  console.log('\nSeeding completed successfully!');
}

seed();
