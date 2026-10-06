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

  console.log('\nSeeding completed successfully!');
}

seed();
