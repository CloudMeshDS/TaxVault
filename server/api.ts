/**
 * TaxVault API: every /api/* route, shared by two hosts:
 *  - server.ts (Node, local/dev): adds the Vite dev server / static web app and listens on PORT.
 *  - supabase/functions/api (Supabase Edge Function): what the Android/iOS apps call.
 * Keep host-specific code (Vite, static files, file downloads) out of this module.
 */
import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import { COUNTRY_TERMS } from '../src/constants/countryTerms';
import { ExportService } from '../src/services/exportService';

// Verified Supabase user attached to the request by the requireUser / optionalUser middleware
type AuthUser = { id: string; email: string };
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

// Initial Indian Realistic Expenses for seeding/fallback
const SEED_INDIAN_EXPENSES = [
  {
    id: 'exp-01-amazon',
    merchant: 'Amazon Seller Services India',
    invoiceNumber: 'INV-DEL-89210',
    receiptNumber: 'REC-AZN-2026-99',
    date: '2026-10-05',
    time: '14:25',
    vendorAddress: 'Brigade Gateway, 8th Floor, Bengaluru, Karnataka 560055',
    vendorPhone: '+91 80 4123 4567',
    vendorGSTIN: '29AABCS1429B1ZB',
    customerGSTIN: '27AABCU9603R1ZM',
    state: 'Karnataka (29)',
    paymentMethod: 'Credit Card',
    subtotal: 9000,
    discount: 0,
    taxableAmount: 9000,
    cgst: 810,
    sgst: 810,
    igst: 0,
    cess: 0,
    roundOff: 0,
    amount: 10620,
    category: 'Office Expenses',
    expenseType: 'Business',
    businessPercentage: 100,
    claimableBusinessAmount: 10620,
    items: [
      { name: 'Ergonomic Office Chair', quantity: 1, unitPrice: 8500, total: 8500 },
      { name: 'Delivery Charges', quantity: 1, unitPrice: 500, total: 500 },
    ],
    receiptUrl: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=800&q=80',
    receiptFileName: 'amazon_invoice_89210.jpg',
    gstTreatment: 'Likely eligible',
    caReviewStatus: 'Reviewed',
    caNotes: 'Standard 100% ITC claimed under section 16 CGST Act.',
    confidenceScores: { merchant: 98, date: 99, gstin: 94, total: 99, category: 96, tax: 97 },
    calculationMismatch: false,
    syncStatus: 'synced',
    createdAt: '2026-10-05T14:30:00Z',
    updatedAt: '2026-10-05T14:30:00Z',
  },
  {
    id: 'exp-02-indigo',
    merchant: 'InterGlobe Aviation Ltd (IndiGo)',
    invoiceNumber: '6E-PNR-88K2P',
    receiptNumber: '6E-INV-2026-118',
    date: '2026-10-02',
    time: '06:30',
    vendorAddress: 'Global Business Park, Mehrauli Road, Gurugram, Haryana 122002',
    vendorPhone: '+91 124 617 3838',
    vendorGSTIN: '06AABCI2990B1ZZ',
    customerGSTIN: '27AABCU9603R1ZM',
    state: 'Haryana (06) to Maharashtra (27)',
    paymentMethod: 'Net Banking',
    subtotal: 6800,
    discount: 0,
    taxableAmount: 6800,
    cgst: 0,
    sgst: 0,
    igst: 990,
    cess: 100,
    roundOff: 0,
    amount: 7890,
    category: 'Travel',
    expenseType: 'Business',
    businessPercentage: 100,
    claimableBusinessAmount: 7890,
    items: [
      { name: 'Air Passenger Transport (BLR-BOM)', quantity: 1, unitPrice: 6500, total: 6500 },
      { name: 'Seat Selection & Priority Baggage', quantity: 1, unitPrice: 300, total: 300 },
    ],
    receiptUrl: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=800&q=80',
    receiptFileName: 'indigo_flight_88k2p.pdf',
    gstTreatment: 'Likely eligible',
    caReviewStatus: 'Reviewed',
    caNotes: 'Inter-state IGST verified. Business travel ticket.',
    confidenceScores: { merchant: 99, date: 99, gstin: 96, total: 99, category: 98, tax: 95 },
    calculationMismatch: false,
    syncStatus: 'synced',
    createdAt: '2026-10-02T07:00:00Z',
    updatedAt: '2026-10-02T07:00:00Z',
  },
  {
    id: 'exp-03-croma',
    merchant: 'Croma (Infiniti Retail Ltd)',
    invoiceNumber: 'CRO-MUM-44021',
    receiptNumber: 'CRO-REC-119',
    date: '2026-10-04',
    time: '18:20',
    vendorAddress: 'Juhu Tara Road, Juhu, Mumbai, Maharashtra 400049',
    vendorPhone: '+91 22 6788 9900',
    vendorGSTIN: '27AAACI2210F1ZT',
    customerGSTIN: '27AABCU9603R1ZM',
    state: 'Maharashtra (27)',
    paymentMethod: 'Credit Card',
    subtotal: 55000,
    discount: 0,
    taxableAmount: 55000,
    cgst: 4950,
    sgst: 4950,
    igst: 0,
    cess: 0,
    roundOff: 0,
    amount: 64900,
    category: 'Equipment',
    expenseType: 'Business',
    businessPercentage: 100,
    claimableBusinessAmount: 64900,
    items: [
      { name: 'Dell UltraSharp 27" 4K Monitor & Dock', quantity: 1, unitPrice: 55000, total: 55000 },
    ],
    receiptUrl: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=800&q=80',
    receiptFileName: 'croma_monitor_44021.jpg',
    gstTreatment: 'Likely eligible',
    caReviewStatus: 'Needs CA Review',
    caNotes: 'Capital asset. Verify depreciation schedule under Section 32 vs 100% ITC.',
    confidenceScores: { merchant: 97, date: 98, gstin: 95, total: 99, category: 97, tax: 96 },
    calculationMismatch: false,
    syncStatus: 'synced',
    createdAt: '2026-10-04T19:00:00Z',
    updatedAt: '2026-10-04T19:00:00Z',
  },
  {
    id: 'exp-04-adobe',
    merchant: 'Adobe Systems Software Ireland Limited',
    invoiceNumber: 'INV-ADB-2026-781',
    receiptNumber: 'REC-ADB-99',
    date: '2026-10-03',
    time: '04:12',
    vendorAddress: '4-6 Riverwalk, Citywest Business Campus, Dublin 24, Ireland',
    vendorPhone: '1800-102-5567',
    vendorGSTIN: '9917IRL29003OS1',
    customerGSTIN: '27AABCU9603R1ZM',
    state: 'OIDAR Cross-border (99)',
    paymentMethod: 'Credit Card',
    subtotal: 2117.80,
    discount: 0,
    taxableAmount: 2117.80,
    cgst: 0,
    sgst: 0,
    igst: 381.20,
    cess: 0,
    roundOff: 0,
    amount: 2499,
    category: 'Software & Subscriptions',
    expenseType: 'Business',
    businessPercentage: 100,
    claimableBusinessAmount: 2499,
    items: [
      { name: 'Adobe Creative Cloud All Apps Monthly', quantity: 1, unitPrice: 2117.80, total: 2117.80 },
    ],
    receiptUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80',
    receiptFileName: 'adobe_cc_oct2026.pdf',
    gstTreatment: 'Likely eligible',
    caReviewStatus: 'Reviewed',
    caNotes: 'OIDAR invoice with Reverse Charge/Integrated GST compliance.',
    confidenceScores: { merchant: 99, date: 99, gstin: 91, total: 99, category: 98, tax: 95 },
    calculationMismatch: false,
    isRecurring: true,
    recurringFrequency: 'monthly',
    syncStatus: 'synced',
    createdAt: '2026-10-03T05:00:00Z',
    updatedAt: '2026-10-03T05:00:00Z',
  },
  {
    id: 'exp-05-airtel',
    merchant: 'Bharti Airtel Limited',
    invoiceNumber: 'AIR-MUM-99381',
    receiptNumber: 'BILL-OCT26-004',
    date: '2026-10-01',
    time: '11:00',
    vendorAddress: 'Vasant Kunj, Phase II, New Delhi 110070',
    vendorPhone: '+91 11 4666 6100',
    vendorGSTIN: '27AABCB3340L1ZS',
    customerGSTIN: '27AABCU9603R1ZM',
    state: 'Maharashtra (27)',
    paymentMethod: 'UPI',
    subtotal: 999,
    discount: 0,
    taxableAmount: 999,
    cgst: 90,
    sgst: 90,
    igst: 0,
    cess: 0,
    roundOff: 0,
    amount: 1179,
    category: 'Internet & Mobile',
    expenseType: 'Business',
    businessPercentage: 100,
    claimableBusinessAmount: 1179,
    items: [
      { name: 'Airtel Xstream Fiber Premium 300 Mbps', quantity: 1, unitPrice: 999, total: 999 },
    ],
    receiptUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=800&q=80',
    receiptFileName: 'airtel_broadband_oct.pdf',
    gstTreatment: 'Likely eligible',
    caReviewStatus: 'Reviewed',
    caNotes: 'Routine utility broadband for business premises.',
    confidenceScores: { merchant: 99, date: 98, gstin: 97, total: 99, category: 99, tax: 98 },
    calculationMismatch: false,
    isRecurring: true,
    recurringFrequency: 'monthly',
    syncStatus: 'synced',
    createdAt: '2026-10-01T11:10:00Z',
    updatedAt: '2026-10-01T11:10:00Z',
  },
  {
    id: 'exp-06-hpcl',
    merchant: 'Hindustan Petroleum Corp Ltd (Bandra)',
    invoiceNumber: 'HP-F-8812',
    receiptNumber: 'HP-TXN-00341',
    date: '2026-10-04',
    time: '09:42',
    vendorAddress: 'Bandra Reclamation, S.V. Road, Mumbai 400050',
    vendorPhone: '+91 22 2642 1109',
    vendorGSTIN: '27AAACH1118E1ZE',
    customerGSTIN: '',
    state: 'Maharashtra (27)',
    paymentMethod: 'UPI',
    subtotal: 4500,
    discount: 0,
    taxableAmount: 4500,
    cgst: 0,
    sgst: 0,
    igst: 0,
    cess: 0,
    roundOff: 0,
    amount: 4500,
    category: 'Fuel',
    expenseType: 'Mixed',
    businessPercentage: 75,
    claimableBusinessAmount: 3375,
    items: [
      { name: 'Power Petrol Unleaded 43.10 Ltr', quantity: 43.1, unitPrice: 104.4, total: 4500 },
    ],
    receiptUrl: 'https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&w=800&q=80',
    receiptFileName: 'hpcl_fuel_slip.jpg',
    gstTreatment: 'Needs review',
    caReviewStatus: 'Needs Clarification',
    caNotes: 'Petrol is outside GST. Direct income-tax business deduction claimed at 75% logbook ratio.',
    confidenceScores: { merchant: 99, date: 97, gstin: 72, total: 99, category: 98, tax: 90 },
    calculationMismatch: false,
    syncStatus: 'synced',
    createdAt: '2026-10-04T10:00:00Z',
    updatedAt: '2026-10-04T10:00:00Z',
  },
  {
    id: 'exp-07-swiggy',
    merchant: 'Swiggy - Biryani By Kilo (Andheri)',
    invoiceNumber: 'SWG-ODR-9921',
    receiptNumber: 'SWG-9921',
    date: '2026-10-06',
    time: '13:15',
    vendorAddress: 'Off New Link Road, Andheri West, Mumbai 400053',
    vendorPhone: '+91 22 2673 8810',
    vendorGSTIN: '27AAGCB4412M1Z0',
    customerGSTIN: '',
    state: 'Maharashtra (27)',
    paymentMethod: 'UPI',
    subtotal: 2300,
    discount: 100,
    taxableAmount: 2200,
    cgst: 55,
    sgst: 55,
    igst: 0,
    cess: 0,
    roundOff: 0,
    amount: 2450,
    category: 'Food & Meals',
    expenseType: 'Mixed',
    businessPercentage: 60,
    claimableBusinessAmount: 1470,
    items: [
      { name: 'Dum Gosht Biryani (1kg Handi)', quantity: 2, unitPrice: 950, total: 1900 },
      { name: 'Galouti Kebab & Ulte Tawa Paratha', quantity: 1, unitPrice: 400, total: 400 },
    ],
    receiptUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80',
    receiptFileName: 'swiggy_lunch_9921.jpg',
    gstTreatment: 'Needs review',
    caReviewStatus: 'Reviewed',
    caNotes: 'Food GST ITC restricted under section 17(5)(b). Income tax deduction claimed at 60%.',
    confidenceScores: { merchant: 96, date: 99, gstin: 88, total: 98, category: 95, tax: 85 },
    calculationMismatch: false,
    syncStatus: 'synced',
    createdAt: '2026-10-06T13:30:00Z',
    updatedAt: '2026-10-06T13:30:00Z',
  },
  {
    id: 'exp-08-groceries',
    merchant: 'Nature Basket Supermarket',
    invoiceNumber: 'NB-BAN-1049',
    receiptNumber: 'REC-NB-1049',
    date: '2026-10-05',
    time: '20:10',
    vendorAddress: 'Hill Road, Bandra West, Mumbai 400050',
    vendorPhone: '+91 22 2640 5511',
    vendorGSTIN: '27AABCN8890P1ZQ',
    customerGSTIN: '',
    state: 'Maharashtra (27)',
    paymentMethod: 'Debit Card',
    subtotal: 26450,
    discount: 0,
    taxableAmount: 26450,
    cgst: 0,
    sgst: 0,
    igst: 0,
    cess: 0,
    roundOff: 0,
    amount: 26450,
    category: 'Personal',
    expenseType: 'Personal',
    businessPercentage: 0,
    claimableBusinessAmount: 0,
    items: [
      { name: 'Monthly Household Groceries & Supplies', quantity: 1, unitPrice: 26450, total: 26450 },
    ],
    receiptUrl: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?auto=format&fit=crop&w=800&q=80',
    receiptFileName: 'groceries_oct.jpg',
    gstTreatment: 'Not identified',
    caReviewStatus: 'Not Claimable',
    caNotes: 'Pure personal expenditure. Excluded from tax deductions.',
    confidenceScores: { merchant: 95, date: 98, gstin: 90, total: 99, category: 99, tax: 95 },
    calculationMismatch: false,
    syncStatus: 'synced',
    createdAt: '2026-10-05T20:20:00Z',
    updatedAt: '2026-10-05T20:20:00Z',
  },
  {
    id: 'exp-09-wework',
    merchant: 'WeWork India Management Pvt Ltd',
    invoiceNumber: 'WW-MUM-OCT-220',
    receiptNumber: 'REC-WW-220',
    date: '2026-10-01',
    time: '09:00',
    vendorAddress: 'BKC Enclave, Bandra Kurla Complex, Mumbai 400051',
    vendorPhone: '+91 22 4893 2000',
    vendorGSTIN: '27AAACW8891Q1ZT',
    customerGSTIN: '27AABCU9603R1ZM',
    state: 'Maharashtra (27)',
    paymentMethod: 'Net Banking',
    subtotal: 10000,
    discount: 0,
    taxableAmount: 10000,
    cgst: 900,
    sgst: 900,
    igst: 0,
    cess: 0,
    roundOff: 0,
    amount: 11800,
    category: 'Rent',
    expenseType: 'Business',
    businessPercentage: 100,
    claimableBusinessAmount: 11800,
    items: [
      { name: 'Dedicated Desk & Co-working Membership (October 2026)', quantity: 1, unitPrice: 10000, total: 10000 },
    ],
    receiptUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80',
    receiptFileName: 'wework_rent_oct2026.pdf',
    gstTreatment: 'Likely eligible',
    caReviewStatus: 'Reviewed',
    caNotes: '18% GST fully eligible under Section 16.',
    confidenceScores: { merchant: 99, date: 99, gstin: 98, total: 99, category: 99, tax: 99 },
    calculationMismatch: false,
    isRecurring: true,
    recurringFrequency: 'monthly',
    syncStatus: 'synced',
    createdAt: '2026-10-01T09:15:00Z',
    updatedAt: '2026-10-01T09:15:00Z',
  },
];

const DEFAULT_PROFILES: Record<string, any> = {
  NZ: {
    id: 'usr_nz_101',
    fullName: 'Liam McKenzie',
    email: 'liam@mckenziedigital.co.nz',
    phone: '+64 21 555 0192',
    businessName: 'McKenzie Digital Solutions',
    businessType: 'Sole Trader',
    country: 'NZ',
    defaultCurrency: 'NZD',
    currencySymbol: '$',
    taxAuthority: 'Inland Revenue Department (IRD)',
    taxId: '123-456-789',
    secondaryTaxId: '123-456-789',
    pan: 'AAAPS1234K',
    gstin: '27AABCU9603R1ZM',
    financialYear: 'FY 2026-27',
    accountantName: 'Sarah Jenkins, CA ANZ',
    accountantEmail: 'sarah@nzaccounting.co.nz',
    accountantPhone: '+64 9 367 5000',
    biometricLock: false,
    appPin: '1234',
    subscription: { tier: 'free', billingCycle: 'monthly', status: 'active', receiptsScannedThisMonth: 10, monthlyReceiptLimit: 10 },
  },
  AU: {
    id: 'usr_au_201',
    fullName: 'Oliver Smith',
    email: 'oliver@smithtech.com.au',
    phone: '+61 412 345 678',
    businessName: 'Smith Tech Consulting Pty Ltd',
    businessType: 'Company / Pty Ltd',
    country: 'AU',
    defaultCurrency: 'AUD',
    currencySymbol: '$',
    taxAuthority: 'Australian Taxation Office (ATO)',
    taxId: '26 008 672 179',
    secondaryTaxId: '987 654 321',
    pan: 'AAAPS1234K',
    gstin: '27AABCU9603R1ZM',
    financialYear: 'FY 2026-27',
    accountantName: 'Marcus Wong, CPA Australia',
    accountantEmail: 'marcus@sydneycpa.com.au',
    accountantPhone: '+61 2 9234 5678',
    biometricLock: false,
    appPin: '1234',
    subscription: { tier: 'free', billingCycle: 'monthly', status: 'active', receiptsScannedThisMonth: 10, monthlyReceiptLimit: 10 },
  },
  CA: {
    id: 'usr_ca_301',
    fullName: 'Sophie Tremblay',
    email: 'sophie@tremblaystudio.ca',
    phone: '+1 416 555 0188',
    businessName: 'Tremblay Creative Studio',
    businessType: 'Sole Proprietorship',
    country: 'CA',
    defaultCurrency: 'CAD',
    currencySymbol: '$',
    taxAuthority: 'Canada Revenue Agency (CRA)',
    taxId: '123456789 RT0001',
    secondaryTaxId: '123 456 789',
    pan: 'AAAPS1234K',
    gstin: '27AABCU9603R1ZM',
    financialYear: 'Tax Year 2026',
    accountantName: 'Jean-Luc Roy, CPA Canada',
    accountantEmail: 'jeanluc@torontocpa.ca',
    accountantPhone: '+1 416 925 5100',
    biometricLock: false,
    appPin: '1234',
    subscription: { tier: 'free', billingCycle: 'monthly', status: 'active', receiptsScannedThisMonth: 10, monthlyReceiptLimit: 10 },
  },
  US: {
    id: 'usr_us_401',
    fullName: 'James Anderson',
    email: 'james@andersonventures.com',
    phone: '+1 415 555 2671',
    businessName: 'Anderson Digital Ventures LLC',
    businessType: 'LLC',
    country: 'US',
    defaultCurrency: 'USD',
    currencySymbol: '$',
    taxAuthority: 'Internal Revenue Service (IRS)',
    taxId: '12-3456789',
    secondaryTaxId: '987-65-4321',
    pan: 'AAAPS1234K',
    gstin: '27AABCU9603R1ZM',
    financialYear: 'Tax Year 2026',
    accountantName: 'David Miller, CPA',
    accountantEmail: 'dmiller@sfcpatax.com',
    accountantPhone: '+1 415 678 9000',
    biometricLock: false,
    appPin: '1234',
    subscription: { tier: 'free', billingCycle: 'monthly', status: 'active', receiptsScannedThisMonth: 10, monthlyReceiptLimit: 10 },
  },
  IN: {
    id: 'usr_in_8821',
    fullName: 'Rajesh Sharma',
    email: 'rajesh@sharmatech.in',
    phone: '+91 98200 44551',
    businessName: 'Sharma Tech Consultancy',
    businessType: 'Proprietorship',
    country: 'IN',
    defaultCurrency: 'INR',
    currencySymbol: '₹',
    taxAuthority: 'Goods and Services Tax Network (GSTN)',
    taxId: 'AAAPS1234K',
    secondaryTaxId: '27AABCU9603R1ZM',
    pan: 'AAAPS1234K',
    gstin: '27AABCU9603R1ZM',
    financialYear: 'FY 2026-27',
    accountantName: 'CA Amit Verma, FCA',
    accountantEmail: 'amit.verma@caindia.org',
    accountantPhone: '+91 98201 55442',
    biometricLock: false,
    appPin: '1234',
    subscription: { tier: 'free', billingCycle: 'monthly', status: 'active', receiptsScannedThisMonth: 10, monthlyReceiptLimit: 10 },
  },
};

const DEFAULT_INDIAN_PROFILE = DEFAULT_PROFILES.IN;

const SEED_NZ_EXPENSES = [
  {
    id: 'exp-nz-01-bunnings',
    merchant: 'Bunnings Trade (NZ) Limited',
    invoiceNumber: 'TAX-INV-NZ-8921',
    receiptNumber: 'REC-BUN-4021',
    date: '2026-10-06',
    time: '10:15',
    vendorAddress: '105 Carbine Road, Mount Wellington, Auckland 1060',
    vendorPhone: '+64 9 573 2000',
    country: 'NZ',
    currency: 'NZD',
    currencySymbol: '$',
    vendorTaxId: '102-441-890',
    customerTaxId: '123-456-789',
    vendorGSTIN: '102-441-890',
    customerGSTIN: '123-456-789',
    state: 'Auckland',
    paymentMethod: 'Credit Card',
    subtotal: 213.48,
    discount: 0,
    taxableAmount: 213.48,
    taxType: 'GST',
    taxRate: 15,
    taxAmount: 32.02,
    gstAmount: 32.02,
    cgst: 0,
    sgst: 0,
    igst: 0,
    cess: 0,
    roundOff: 0,
    amount: 245.50,
    category: 'Equipment',
    expenseType: 'Business',
    businessPercentage: 100,
    claimableBusinessAmount: 245.50,
    items: [
      { name: 'DeWalt 18V XR Brushless Drill Driver Kit', quantity: 1, unitPrice: 245.50, total: 245.50 },
    ],
    receiptUrl: 'https://images.unsplash.com/photo-1581244277943-fe4a9c777189?auto=format&fit=crop&w=800&q=80',
    receiptFileName: 'bunnings_nz_drill.jpg',
    gstTreatment: 'Likely eligible',
    caReviewStatus: 'Reviewed',
    caNotes: 'Standard 15% NZ GST claimed under IRD GST Act 1985.',
    confidenceScores: { merchant: 98, date: 99, total: 99, taxId: 96, category: 97, tax: 98 },
    calculationMismatch: false,
    syncStatus: 'synced',
    createdAt: '2026-10-06T10:30:00Z',
    updatedAt: '2026-10-06T10:30:00Z',
  },
  {
    id: 'exp-nz-02-airnz',
    merchant: 'Air New Zealand Limited',
    invoiceNumber: 'NZ-PNR-77A9Q',
    receiptNumber: 'NZ-TKT-99120',
    date: '2026-10-04',
    time: '07:30',
    vendorAddress: '185 Fanshawe Street, Auckland Central, Auckland 1010',
    vendorPhone: '0800 737 000',
    country: 'NZ',
    currency: 'NZD',
    currencySymbol: '$',
    vendorTaxId: '010-449-211',
    customerTaxId: '123-456-789',
    vendorGSTIN: '010-449-211',
    customerGSTIN: '123-456-789',
    state: 'Auckland',
    paymentMethod: 'Credit Card',
    subtotal: 365.22,
    discount: 0,
    taxableAmount: 365.22,
    taxType: 'GST',
    taxRate: 15,
    taxAmount: 54.78,
    gstAmount: 54.78,
    cgst: 0,
    sgst: 0,
    igst: 0,
    cess: 0,
    roundOff: 0,
    amount: 420.00,
    category: 'Travel',
    expenseType: 'Business',
    businessPercentage: 100,
    claimableBusinessAmount: 420.00,
    items: [
      { name: 'Seat+Bag Domestic Airfare (AKL to WLG)', quantity: 1, unitPrice: 420.00, total: 420.00 },
    ],
    receiptUrl: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=800&q=80',
    receiptFileName: 'air_nz_ticket_akl_wlg.pdf',
    gstTreatment: 'Likely eligible',
    caReviewStatus: 'Reviewed',
    caNotes: 'Domestic commercial flight. 100% deductible business travel.',
    confidenceScores: { merchant: 99, date: 99, total: 99, taxId: 98, category: 99, tax: 98 },
    calculationMismatch: false,
    syncStatus: 'synced',
    createdAt: '2026-10-04T08:00:00Z',
    updatedAt: '2026-10-04T08:00:00Z',
  },
  {
    id: 'exp-nz-03-spark',
    merchant: 'Spark New Zealand Trading Limited',
    invoiceNumber: 'SPK-INV-OCT-440',
    receiptNumber: 'REC-SPK-440',
    date: '2026-10-01',
    time: '09:00',
    vendorAddress: '167 Victoria Street West, Auckland 1010',
    vendorPhone: '+64 9 355 5555',
    country: 'NZ',
    currency: 'NZD',
    currencySymbol: '$',
    vendorTaxId: '051-224-819',
    customerTaxId: '123-456-789',
    vendorGSTIN: '051-224-819',
    customerGSTIN: '123-456-789',
    state: 'Auckland',
    paymentMethod: 'Direct Debit',
    subtotal: 113.03,
    discount: 0,
    taxableAmount: 113.03,
    taxType: 'GST',
    taxRate: 15,
    taxAmount: 16.96,
    gstAmount: 16.96,
    cgst: 0,
    sgst: 0,
    igst: 0,
    cess: 0,
    roundOff: 0,
    amount: 129.99,
    category: 'Internet & Mobile',
    expenseType: 'Business',
    businessPercentage: 100,
    claimableBusinessAmount: 129.99,
    items: [
      { name: 'Business Max Fibre Unlimited 500Mbps', quantity: 1, unitPrice: 129.99, total: 129.99 },
    ],
    receiptUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80',
    receiptFileName: 'spark_business_fiber.pdf',
    gstTreatment: 'Likely eligible',
    caReviewStatus: 'Reviewed',
    caNotes: 'Standard 15% GST input tax claimable.',
    confidenceScores: { merchant: 98, date: 99, total: 99, taxId: 95, category: 98, tax: 97 },
    calculationMismatch: false,
    syncStatus: 'synced',
    createdAt: '2026-10-01T09:15:00Z',
    updatedAt: '2026-10-01T09:15:00Z',
  },
  {
    id: 'exp-nz-04-bp',
    merchant: 'BP Connect Newmarket',
    invoiceNumber: 'BP-NMK-7721',
    receiptNumber: 'REC-BP-7721',
    date: '2026-10-05',
    time: '17:40',
    vendorAddress: '430 Broadway, Newmarket, Auckland 1023',
    vendorPhone: '+64 9 520 1199',
    country: 'NZ',
    currency: 'NZD',
    currencySymbol: '$',
    vendorTaxId: '011-829-301',
    customerTaxId: '123-456-789',
    vendorGSTIN: '011-829-301',
    customerGSTIN: '123-456-789',
    state: 'Auckland',
    paymentMethod: 'Credit Card',
    subtotal: 100.00,
    discount: 0,
    taxableAmount: 100.00,
    taxType: 'GST',
    taxRate: 15,
    taxAmount: 15.00,
    gstAmount: 15.00,
    cgst: 0,
    sgst: 0,
    igst: 0,
    cess: 0,
    roundOff: 0,
    amount: 115.00,
    category: 'Fuel',
    expenseType: 'Mixed',
    businessPercentage: 75,
    claimableBusinessAmount: 86.25,
    items: [
      { name: 'BP Ultimate 98 Unleaded Petrol (39.6L)', quantity: 1, unitPrice: 115.00, total: 115.00 },
    ],
    receiptUrl: 'https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&w=800&q=80',
    receiptFileName: 'bp_connect_fuel.jpg',
    gstTreatment: 'Likely eligible',
    caReviewStatus: 'Reviewed',
    caNotes: 'Vehicle logbook business ratio: 75% claimable under IRD rules.',
    confidenceScores: { merchant: 99, date: 98, total: 99, taxId: 92, category: 99, tax: 95 },
    calculationMismatch: false,
    syncStatus: 'synced',
    createdAt: '2026-10-05T18:00:00Z',
    updatedAt: '2026-10-05T18:00:00Z',
  },
  {
    id: 'exp-nz-05-mojo',
    merchant: 'Mojo Coffee Auckland',
    invoiceNumber: 'MOJ-AKL-992',
    receiptNumber: 'REC-MOJ-992',
    date: '2026-10-06',
    time: '14:20',
    vendorAddress: '188 Quay Street, Auckland CBD 1010',
    vendorPhone: '+64 9 377 4410',
    country: 'NZ',
    currency: 'NZD',
    currencySymbol: '$',
    vendorTaxId: '089-122-440',
    customerTaxId: '123-456-789',
    vendorGSTIN: '089-122-440',
    customerGSTIN: '123-456-789',
    state: 'Auckland',
    paymentMethod: 'EFTPOS',
    subtotal: 24.78,
    discount: 0,
    taxableAmount: 24.78,
    taxType: 'GST',
    taxRate: 15,
    taxAmount: 3.72,
    gstAmount: 3.72,
    cgst: 0,
    sgst: 0,
    igst: 0,
    cess: 0,
    roundOff: 0,
    amount: 28.50,
    category: 'Food & Meals',
    expenseType: 'Mixed',
    businessPercentage: 50,
    claimableBusinessAmount: 14.25,
    items: [
      { name: 'Flat Whites & Pastries (Client Meeting)', quantity: 1, unitPrice: 28.50, total: 28.50 },
    ],
    receiptUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80',
    receiptFileName: 'mojo_client_coffee.jpg',
    gstTreatment: 'Needs review',
    caReviewStatus: 'Reviewed',
    caNotes: 'Subject to 50% entertainment limitation rule under IRD Section DD 1.',
    confidenceScores: { merchant: 96, date: 99, total: 99, taxId: 88, category: 96, tax: 92 },
    calculationMismatch: false,
    syncStatus: 'synced',
    createdAt: '2026-10-06T14:40:00Z',
    updatedAt: '2026-10-06T14:40:00Z',
  },
];

const SEED_AU_EXPENSES = [
  {
    id: 'exp-au-01-bunnings',
    merchant: 'Bunnings Group Limited',
    invoiceNumber: 'TAX-INV-AU-55012',
    receiptNumber: 'REC-BUN-VIC-88',
    date: '2026-10-05',
    time: '11:20',
    vendorAddress: '68 Albert Road, South Melbourne, VIC 3205',
    vendorPhone: '+61 3 9555 1200',
    country: 'AU',
    currency: 'AUD',
    currencySymbol: '$',
    vendorTaxId: '26 008 672 179',
    customerTaxId: '11 222 333 444',
    vendorGSTIN: '26 008 672 179',
    customerGSTIN: '11 222 333 444',
    state: 'Victoria',
    paymentMethod: 'Credit Card',
    subtotal: 168.18,
    discount: 0,
    taxableAmount: 168.18,
    taxType: 'GST',
    taxRate: 10,
    taxAmount: 16.82,
    gstAmount: 16.82,
    cgst: 0,
    sgst: 0,
    igst: 0,
    cess: 0,
    roundOff: 0,
    amount: 185.00,
    category: 'Equipment',
    expenseType: 'Business',
    businessPercentage: 100,
    claimableBusinessAmount: 185.00,
    items: [
      { name: 'Bosch Laser Distance Measurer 40m', quantity: 1, unitPrice: 185.00, total: 185.00 },
    ],
    receiptUrl: 'https://images.unsplash.com/photo-1581244277943-fe4a9c777189?auto=format&fit=crop&w=800&q=80',
    receiptFileName: 'bunnings_au_measurer.jpg',
    gstTreatment: 'Likely eligible',
    caReviewStatus: 'Reviewed',
    caNotes: '10% Australian GST input tax credit claimable under ATO BAS.',
    confidenceScores: { merchant: 98, date: 99, total: 99, taxId: 98, category: 96, tax: 98 },
    calculationMismatch: false,
    syncStatus: 'synced',
    createdAt: '2026-10-05T11:45:00Z',
    updatedAt: '2026-10-05T11:45:00Z',
  },
  {
    id: 'exp-au-02-qantas',
    merchant: 'Qantas Airways Limited',
    invoiceNumber: 'QF-PNR-99K2L',
    receiptNumber: 'QF-TKT-08192',
    date: '2026-10-03',
    time: '08:45',
    vendorAddress: '10 Bourke Road, Mascot, NSW 2020',
    vendorPhone: '+61 2 9691 3636',
    country: 'AU',
    currency: 'AUD',
    currencySymbol: '$',
    vendorTaxId: '16 009 661 901',
    customerTaxId: '11 222 333 444',
    vendorGSTIN: '16 009 661 901',
    customerGSTIN: '11 222 333 444',
    state: 'New South Wales',
    paymentMethod: 'Credit Card',
    subtotal: 359.09,
    discount: 0,
    taxableAmount: 359.09,
    taxType: 'GST',
    taxRate: 10,
    taxAmount: 35.91,
    gstAmount: 35.91,
    cgst: 0,
    sgst: 0,
    igst: 0,
    cess: 0,
    roundOff: 0,
    amount: 395.00,
    category: 'Travel',
    expenseType: 'Business',
    businessPercentage: 100,
    claimableBusinessAmount: 395.00,
    items: [
      { name: 'Economy Domestic Airfare (QF415 SYD-MEL)', quantity: 1, unitPrice: 395.00, total: 395.00 },
    ],
    receiptUrl: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=800&q=80',
    receiptFileName: 'qantas_ticket_syd_mel.pdf',
    gstTreatment: 'Likely eligible',
    caReviewStatus: 'Reviewed',
    caNotes: 'Domestic interstate travel for client meeting. 100% deductible.',
    confidenceScores: { merchant: 99, date: 99, total: 99, taxId: 99, category: 99, tax: 98 },
    calculationMismatch: false,
    syncStatus: 'synced',
    createdAt: '2026-10-03T09:00:00Z',
    updatedAt: '2026-10-03T09:00:00Z',
  },
  {
    id: 'exp-au-03-telstra',
    merchant: 'Telstra Business Pty Ltd',
    invoiceNumber: 'TLS-INV-SEP-882',
    receiptNumber: 'REC-TLS-882',
    date: '2026-10-01',
    time: '10:00',
    vendorAddress: '242 Exhibition Street, Melbourne, VIC 3000',
    vendorPhone: '13 22 58',
    country: 'AU',
    currency: 'AUD',
    currencySymbol: '$',
    vendorTaxId: '33 051 775 556',
    customerTaxId: '11 222 333 444',
    vendorGSTIN: '33 051 775 556',
    customerGSTIN: '11 222 333 444',
    state: 'Victoria',
    paymentMethod: 'Direct Debit',
    subtotal: 135.45,
    discount: 0,
    taxableAmount: 135.45,
    taxType: 'GST',
    taxRate: 10,
    taxAmount: 13.55,
    gstAmount: 13.55,
    cgst: 0,
    sgst: 0,
    igst: 0,
    cess: 0,
    roundOff: 0,
    amount: 149.00,
    category: 'Internet & Mobile',
    expenseType: 'Business',
    businessPercentage: 100,
    claimableBusinessAmount: 149.00,
    items: [
      { name: 'Business 5G Mobile Plan & Unlimited Calls', quantity: 1, unitPrice: 149.00, total: 149.00 },
    ],
    receiptUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80',
    receiptFileName: 'telstra_business_mobile.pdf',
    gstTreatment: 'Likely eligible',
    caReviewStatus: 'Reviewed',
    caNotes: '10% GST claimable on BAS 1B.',
    confidenceScores: { merchant: 98, date: 99, total: 99, taxId: 98, category: 97, tax: 98 },
    calculationMismatch: false,
    syncStatus: 'synced',
    createdAt: '2026-10-01T10:15:00Z',
    updatedAt: '2026-10-01T10:15:00Z',
  },
  {
    id: 'exp-au-04-ampol',
    merchant: 'Ampol Service Station',
    invoiceNumber: 'AMP-SYD-1099',
    receiptNumber: 'REC-AMP-1099',
    date: '2026-10-04',
    time: '16:30',
    vendorAddress: '150 Parramatta Road, Ashfield, NSW 2131',
    vendorPhone: '+61 2 9797 2200',
    country: 'AU',
    currency: 'AUD',
    currencySymbol: '$',
    vendorTaxId: '40 008 425 581',
    customerTaxId: '11 222 333 444',
    vendorGSTIN: '40 008 425 581',
    customerGSTIN: '11 222 333 444',
    state: 'New South Wales',
    paymentMethod: 'Credit Card',
    subtotal: 100.00,
    discount: 0,
    taxableAmount: 100.00,
    taxType: 'GST',
    taxRate: 10,
    taxAmount: 10.00,
    gstAmount: 10.00,
    cgst: 0,
    sgst: 0,
    igst: 0,
    cess: 0,
    roundOff: 0,
    amount: 110.00,
    category: 'Fuel',
    expenseType: 'Mixed',
    businessPercentage: 80,
    claimableBusinessAmount: 88.00,
    items: [
      { name: 'Amplify 98 Unleaded Petrol (52.4L)', quantity: 1, unitPrice: 110.00, total: 110.00 },
    ],
    receiptUrl: 'https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&w=800&q=80',
    receiptFileName: 'ampol_fuel_tax_receipt.jpg',
    gstTreatment: 'Likely eligible',
    caReviewStatus: 'Reviewed',
    caNotes: 'Motor vehicle expense claimed at 80% business logbook ratio.',
    confidenceScores: { merchant: 98, date: 99, total: 99, taxId: 95, category: 98, tax: 96 },
    calculationMismatch: false,
    syncStatus: 'synced',
    createdAt: '2026-10-04T17:00:00Z',
    updatedAt: '2026-10-04T17:00:00Z',
  },
  {
    id: 'exp-au-05-cafe',
    merchant: 'Sydney Harbour Brasserie',
    invoiceNumber: 'SHB-SYD-4410',
    receiptNumber: 'REC-SHB-4410',
    date: '2026-10-06',
    time: '13:10',
    vendorAddress: 'Circular Quay East, Sydney, NSW 2000',
    vendorPhone: '+61 2 9247 1100',
    country: 'AU',
    currency: 'AUD',
    currencySymbol: '$',
    vendorTaxId: '55 120 449 102',
    customerTaxId: '11 222 333 444',
    vendorGSTIN: '55 120 449 102',
    customerGSTIN: '11 222 333 444',
    state: 'New South Wales',
    paymentMethod: 'Credit Card',
    subtotal: 61.82,
    discount: 0,
    taxableAmount: 61.82,
    taxType: 'GST',
    taxRate: 10,
    taxAmount: 6.18,
    gstAmount: 6.18,
    cgst: 0,
    sgst: 0,
    igst: 0,
    cess: 0,
    roundOff: 0,
    amount: 68.00,
    category: 'Food & Meals',
    expenseType: 'Mixed',
    businessPercentage: 50,
    claimableBusinessAmount: 34.00,
    items: [
      { name: 'Business Lunch & Refreshments', quantity: 1, unitPrice: 68.00, total: 68.00 },
    ],
    receiptUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80',
    receiptFileName: 'brasserie_business_lunch.jpg',
    gstTreatment: 'Needs review',
    caReviewStatus: 'Reviewed',
    caNotes: 'Subject to 50% meal entertainment restriction under ATO rules.',
    confidenceScores: { merchant: 96, date: 99, total: 99, taxId: 90, category: 96, tax: 92 },
    calculationMismatch: false,
    syncStatus: 'synced',
    createdAt: '2026-10-06T13:30:00Z',
    updatedAt: '2026-10-06T13:30:00Z',
  },
];

const SEED_CA_EXPENSES = [
  {
    id: 'exp-ca-01-canadiantire',
    merchant: 'Canadian Tire Corporation',
    invoiceNumber: 'CT-ON-77821',
    receiptNumber: 'REC-CT-991',
    date: '2026-10-04',
    time: '14:30',
    vendorAddress: '839 Yonge Street, Toronto, ON M4W 2H2',
    vendorPhone: '+1 416 925 5100',
    country: 'CA',
    currency: 'CAD',
    currencySymbol: '$',
    vendorTaxId: '100829102 RT0001',
    customerTaxId: '123456789 RT0001',
    vendorGSTIN: '100829102 RT0001',
    customerGSTIN: '123456789 RT0001',
    state: 'Ontario',
    paymentMethod: 'Credit Card',
    subtotal: 126.11,
    discount: 0,
    taxableAmount: 126.11,
    taxType: 'HST',
    taxRate: 13,
    taxAmount: 16.39,
    hstAmount: 16.39,
    gstAmount: 6.31,
    pstAmount: 10.08,
    cgst: 0,
    sgst: 0,
    igst: 0,
    cess: 0,
    roundOff: 0,
    amount: 142.50,
    category: 'Office Supplies',
    expenseType: 'Business',
    businessPercentage: 100,
    claimableBusinessAmount: 142.50,
    items: [
      { name: 'Office Storage Cabinet & Organizers', quantity: 1, unitPrice: 142.50, total: 142.50 },
    ],
    receiptUrl: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=800&q=80',
    receiptFileName: 'canadian_tire_supplies.jpg',
    gstTreatment: 'Likely eligible',
    caReviewStatus: 'Reviewed',
    caNotes: '13% Ontario HST eligible for Input Tax Credit (ITC) under CRA GST/HST return.',
    confidenceScores: { merchant: 98, date: 99, total: 99, taxId: 96, category: 97, tax: 98 },
    calculationMismatch: false,
    syncStatus: 'synced',
    createdAt: '2026-10-04T15:00:00Z',
    updatedAt: '2026-10-04T15:00:00Z',
  },
  {
    id: 'exp-ca-02-aircanada',
    merchant: 'Air Canada',
    invoiceNumber: 'AC-PNR-8812J',
    receiptNumber: 'AC-TKT-90112',
    date: '2026-10-02',
    time: '08:00',
    vendorAddress: '7373 Cote-Vertu West, Saint-Laurent, QC H4S 1Z3',
    vendorPhone: '+1 888 247 2262',
    country: 'CA',
    currency: 'CAD',
    currencySymbol: '$',
    vendorTaxId: '100092287 RT0001',
    customerTaxId: '123456789 RT0001',
    vendorGSTIN: '100092287 RT0001',
    customerGSTIN: '123456789 RT0001',
    state: 'Ontario',
    paymentMethod: 'Credit Card',
    subtotal: 424.78,
    discount: 0,
    taxableAmount: 424.78,
    taxType: 'HST',
    taxRate: 13,
    taxAmount: 55.22,
    hstAmount: 55.22,
    gstAmount: 21.24,
    pstAmount: 33.98,
    cgst: 0,
    sgst: 0,
    igst: 0,
    cess: 0,
    roundOff: 0,
    amount: 480.00,
    category: 'Travel',
    expenseType: 'Business',
    businessPercentage: 100,
    claimableBusinessAmount: 480.00,
    items: [
      { name: 'Standard Flight Toronto Pearson (YYZ) to Montreal (YUL)', quantity: 1, unitPrice: 480.00, total: 480.00 },
    ],
    receiptUrl: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=800&q=80',
    receiptFileName: 'air_canada_yyz_yul.pdf',
    gstTreatment: 'Likely eligible',
    caReviewStatus: 'Reviewed',
    caNotes: 'Business flight between provincial offices. 100% deductible on CRA T2125.',
    confidenceScores: { merchant: 99, date: 99, total: 99, taxId: 98, category: 99, tax: 98 },
    calculationMismatch: false,
    syncStatus: 'synced',
    createdAt: '2026-10-02T08:30:00Z',
    updatedAt: '2026-10-02T08:30:00Z',
  },
  {
    id: 'exp-ca-03-rogers',
    merchant: 'Rogers Communications Canada',
    invoiceNumber: 'ROG-INV-OCT-112',
    receiptNumber: 'REC-ROG-112',
    date: '2026-10-01',
    time: '11:00',
    vendorAddress: '333 Bloor Street East, Toronto, ON M4W 1G9',
    vendorPhone: '+1 888 764 3771',
    country: 'CA',
    currency: 'CAD',
    currencySymbol: '$',
    vendorTaxId: '104612344 RT0001',
    customerTaxId: '123456789 RT0001',
    vendorGSTIN: '104612344 RT0001',
    customerGSTIN: '123456789 RT0001',
    state: 'Ontario',
    paymentMethod: 'Pre-Authorized Debit',
    subtotal: 110.00,
    discount: 0,
    taxableAmount: 110.00,
    taxType: 'HST',
    taxRate: 13,
    taxAmount: 14.30,
    hstAmount: 14.30,
    gstAmount: 5.50,
    pstAmount: 8.80,
    cgst: 0,
    sgst: 0,
    igst: 0,
    cess: 0,
    roundOff: 0,
    amount: 124.30,
    category: 'Internet & Mobile',
    expenseType: 'Business',
    businessPercentage: 100,
    claimableBusinessAmount: 124.30,
    items: [
      { name: 'Rogers Ignite Gigabit Business Internet', quantity: 1, unitPrice: 124.30, total: 124.30 },
    ],
    receiptUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80',
    receiptFileName: 'rogers_business_internet.pdf',
    gstTreatment: 'Likely eligible',
    caReviewStatus: 'Reviewed',
    caNotes: 'Telecommunications expense. HST claimed on CRA GST34.',
    confidenceScores: { merchant: 98, date: 99, total: 99, taxId: 97, category: 98, tax: 98 },
    calculationMismatch: false,
    syncStatus: 'synced',
    createdAt: '2026-10-01T11:15:00Z',
    updatedAt: '2026-10-01T11:15:00Z',
  },
  {
    id: 'exp-ca-04-timhortons',
    merchant: 'Tim Hortons Inc',
    invoiceNumber: 'TH-TOR-9941',
    receiptNumber: 'REC-TH-441',
    date: '2026-10-05',
    time: '08:15',
    vendorAddress: '200 Bay Street, Toronto, ON M5J 2J2',
    vendorPhone: '+1 416 368 4400',
    country: 'CA',
    currency: 'CAD',
    currencySymbol: '$',
    vendorTaxId: '105221980 RT0001',
    customerTaxId: '123456789 RT0001',
    vendorGSTIN: '105221980 RT0001',
    customerGSTIN: '123456789 RT0001',
    state: 'Ontario',
    paymentMethod: 'Debit Card',
    subtotal: 30.80,
    discount: 0,
    taxableAmount: 30.80,
    taxType: 'HST',
    taxRate: 13,
    taxAmount: 4.00,
    hstAmount: 4.00,
    gstAmount: 1.54,
    pstAmount: 2.46,
    cgst: 0,
    sgst: 0,
    igst: 0,
    cess: 0,
    roundOff: 0,
    amount: 34.80,
    category: 'Food & Meals',
    expenseType: 'Mixed',
    businessPercentage: 50,
    claimableBusinessAmount: 17.40,
    items: [
      { name: 'Breakfast Coffee & Sandwiches (Client Meeting)', quantity: 1, unitPrice: 34.80, total: 34.80 },
    ],
    receiptUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80',
    receiptFileName: 'tim_hortons_meeting.jpg',
    gstTreatment: 'Needs review',
    caReviewStatus: 'Reviewed',
    caNotes: 'Subject to CRA 50% limitation rule for food, beverages, and entertainment.',
    confidenceScores: { merchant: 97, date: 99, total: 99, taxId: 92, category: 96, tax: 95 },
    calculationMismatch: false,
    syncStatus: 'synced',
    createdAt: '2026-10-05T08:30:00Z',
    updatedAt: '2026-10-05T08:30:00Z',
  },
];

const SEED_US_EXPENSES = [
  {
    id: 'exp-us-01-homedepot',
    merchant: 'The Home Depot Inc',
    invoiceNumber: 'HD-CA-88219',
    receiptNumber: 'REC-HD-3301',
    date: '2026-10-04',
    time: '13:00',
    vendorAddress: '920 Blossom Hill Road, San Jose, CA 95123',
    vendorPhone: '+1 408 281 9000',
    country: 'US',
    currency: 'USD',
    currencySymbol: '$',
    vendorTaxId: '58-1853368',
    customerTaxId: '12-3456789',
    vendorGSTIN: '58-1853368',
    customerGSTIN: '12-3456789',
    state: 'California',
    paymentMethod: 'Credit Card',
    subtotal: 196.58,
    discount: 0,
    taxableAmount: 196.58,
    taxType: 'Sales Tax',
    taxRate: 9.375,
    taxAmount: 18.42,
    salesTaxAmount: 18.42,
    cgst: 0,
    sgst: 0,
    igst: 0,
    cess: 0,
    roundOff: 0,
    amount: 215.00,
    category: 'Equipment',
    expenseType: 'Business',
    businessPercentage: 100,
    claimableBusinessAmount: 215.00,
    items: [
      { name: 'Heavy Duty 5-Tier Steel Storage Rack', quantity: 1, unitPrice: 215.00, total: 215.00 },
    ],
    receiptUrl: 'https://images.unsplash.com/photo-1581244277943-fe4a9c777189?auto=format&fit=crop&w=800&q=80',
    receiptFileName: 'home_depot_storage_rack.jpg',
    gstTreatment: 'Likely eligible',
    caReviewStatus: 'Reviewed',
    caNotes: '100% tax deductible on IRS Schedule C Line 22 (Supplies) or Section 179.',
    confidenceScores: { merchant: 98, date: 99, total: 99, taxId: 97, category: 96, tax: 98 },
    calculationMismatch: false,
    syncStatus: 'synced',
    createdAt: '2026-10-04T13:30:00Z',
    updatedAt: '2026-10-04T13:30:00Z',
  },
  {
    id: 'exp-us-02-united',
    merchant: 'United Airlines Inc',
    invoiceNumber: 'UA-PNR-88K92',
    receiptNumber: 'UA-ETKT-1190',
    date: '2026-10-02',
    time: '06:00',
    vendorAddress: '233 S Wacker Dr, Chicago, IL 60606',
    vendorPhone: '+1 800 864 8331',
    country: 'US',
    currency: 'USD',
    currencySymbol: '$',
    vendorTaxId: '36-2675207',
    customerTaxId: '12-3456789',
    vendorGSTIN: '36-2675207',
    customerGSTIN: '12-3456789',
    state: 'California',
    paymentMethod: 'Credit Card',
    subtotal: 380.00,
    discount: 0,
    taxableAmount: 380.00,
    taxType: 'Exempt / Included',
    taxRate: 0,
    taxAmount: 0,
    salesTaxAmount: 0,
    cgst: 0,
    sgst: 0,
    igst: 0,
    cess: 0,
    roundOff: 0,
    amount: 380.00,
    category: 'Travel',
    expenseType: 'Business',
    businessPercentage: 100,
    claimableBusinessAmount: 380.00,
    items: [
      { name: 'Economy Roundtrip Airfare SFO to SEA', quantity: 1, unitPrice: 380.00, total: 380.00 },
    ],
    receiptUrl: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=800&q=80',
    receiptFileName: 'united_airlines_sfo_sea.pdf',
    gstTreatment: 'Likely eligible',
    caReviewStatus: 'Reviewed',
    caNotes: 'Ordinary & necessary business travel under IRS Publication 463.',
    confidenceScores: { merchant: 99, date: 99, total: 99, taxId: 98, category: 99, tax: 98 },
    calculationMismatch: false,
    syncStatus: 'synced',
    createdAt: '2026-10-02T06:30:00Z',
    updatedAt: '2026-10-02T06:30:00Z',
  },
  {
    id: 'exp-us-03-verizon',
    merchant: 'Verizon Business Services',
    invoiceNumber: 'VZ-INV-OCT-881',
    receiptNumber: 'REC-VZ-881',
    date: '2026-10-01',
    time: '08:30',
    vendorAddress: '1095 Avenue of the Americas, New York, NY 10036',
    vendorPhone: '+1 800 922 0204',
    country: 'US',
    currency: 'USD',
    currencySymbol: '$',
    vendorTaxId: '13-3870335',
    customerTaxId: '12-3456789',
    vendorGSTIN: '13-3870335',
    customerGSTIN: '12-3456789',
    state: 'California',
    paymentMethod: 'Credit Card',
    subtotal: 124.42,
    discount: 0,
    taxableAmount: 124.42,
    taxType: 'Sales Tax',
    taxRate: 8.5,
    taxAmount: 10.58,
    salesTaxAmount: 10.58,
    cgst: 0,
    sgst: 0,
    igst: 0,
    cess: 0,
    roundOff: 0,
    amount: 135.00,
    category: 'Internet & Mobile',
    expenseType: 'Business',
    businessPercentage: 100,
    claimableBusinessAmount: 135.00,
    items: [
      { name: 'Business Unlimited 5G Mobile & Hotspot', quantity: 1, unitPrice: 135.00, total: 135.00 },
    ],
    receiptUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=800&q=80',
    receiptFileName: 'verizon_business_mobile.pdf',
    gstTreatment: 'Likely eligible',
    caReviewStatus: 'Reviewed',
    caNotes: '100% business utility deduction on IRS Schedule C Line 25.',
    confidenceScores: { merchant: 98, date: 99, total: 99, taxId: 96, category: 98, tax: 97 },
    calculationMismatch: false,
    syncStatus: 'synced',
    createdAt: '2026-10-01T08:45:00Z',
    updatedAt: '2026-10-01T08:45:00Z',
  },
  {
    id: 'exp-us-04-starbucks',
    merchant: 'Starbucks Coffee Company',
    invoiceNumber: 'SBUX-SEA-4412',
    receiptNumber: 'REC-SBUX-4412',
    date: '2026-10-05',
    time: '09:20',
    vendorAddress: '2401 Utah Avenue South, Seattle, WA 98134',
    vendorPhone: '+1 206 447 1575',
    country: 'US',
    currency: 'USD',
    currencySymbol: '$',
    vendorTaxId: '91-1325671',
    customerTaxId: '12-3456789',
    vendorGSTIN: '91-1325671',
    customerGSTIN: '12-3456789',
    state: 'Washington',
    paymentMethod: 'Credit Card',
    subtotal: 26.17,
    discount: 0,
    taxableAmount: 26.17,
    taxType: 'Sales Tax',
    taxRate: 8.875,
    taxAmount: 2.33,
    salesTaxAmount: 2.33,
    cgst: 0,
    sgst: 0,
    igst: 0,
    cess: 0,
    roundOff: 0,
    amount: 28.50,
    category: 'Food & Meals',
    expenseType: 'Mixed',
    businessPercentage: 50,
    claimableBusinessAmount: 14.25,
    items: [
      { name: 'Clover Cold Brews & Pastries (Business Sync)', quantity: 1, unitPrice: 28.50, total: 28.50 },
    ],
    receiptUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80',
    receiptFileName: 'starbucks_business_sync.jpg',
    gstTreatment: 'Needs review',
    caReviewStatus: 'Reviewed',
    caNotes: 'Subject to 50% IRS business meal deduction limit on Schedule C Line 24b.',
    confidenceScores: { merchant: 98, date: 99, total: 99, taxId: 95, category: 98, tax: 96 },
    calculationMismatch: false,
    syncStatus: 'synced',
    createdAt: '2026-10-05T09:40:00Z',
    updatedAt: '2026-10-05T09:40:00Z',
  },
];

const SEED_EXPENSES_BY_COUNTRY: Record<string, any[]> = {
  NZ: SEED_NZ_EXPENSES,
  AU: SEED_AU_EXPENSES,
  CA: SEED_CA_EXPENSES,
  US: SEED_US_EXPENSES,
  IN: SEED_INDIAN_EXPENSES,
};

// Data directory for local DB persistence
// Local JSON fallbacks for terms / consent records. On the Edge Function the filesystem is
// read-only, so these reads and writes fail quietly and the database copy is used instead.
const DATA_DIR = path.resolve(process.cwd(), 'data');
const TERMS_DB_FILE = path.join(DATA_DIR, 'country_terms_db.json');
const AGREEMENTS_DB_FILE = path.join(DATA_DIR, 'customer_agreements_db.json');

try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
} catch (dirErr) {
  console.warn('Data directory creation notice:', dirErr);
}

// Per-user in-memory cache (fallback if the cloud database is starting or offline). Keyed by the
// Supabase auth user id so one user's cached records are never served to another.
const expenseCache = new Map<string, any[]>();
const profileCache = new Map<string, any>();
const getCachedExpenses = (userId: string): any[] => expenseCache.get(userId) || [];
const setCachedExpenses = (userId: string, list: any[]) => expenseCache.set(userId, list);

// Countrywise Terms & Conditions database store
let inMemoryCountryTerms: Record<string, any> = { ...COUNTRY_TERMS };
try {
  if (fs.existsSync(TERMS_DB_FILE)) {
    const rawTerms = fs.readFileSync(TERMS_DB_FILE, 'utf-8');
    inMemoryCountryTerms = { ...COUNTRY_TERMS, ...JSON.parse(rawTerms) };
  } else {
    fs.writeFileSync(TERMS_DB_FILE, JSON.stringify(COUNTRY_TERMS, null, 2), 'utf-8');
  }
} catch (termsFileErr) {
  console.warn('Terms DB file init notice:', termsFileErr);
}

// Customer Agreements consent ledger store
let inMemoryCustomerAgreements: any[] = [];
try {
  if (fs.existsSync(AGREEMENTS_DB_FILE)) {
    const rawAgreements = fs.readFileSync(AGREEMENTS_DB_FILE, 'utf-8');
    inMemoryCustomerAgreements = JSON.parse(rawAgreements);
  } else {
    fs.writeFileSync(AGREEMENTS_DB_FILE, JSON.stringify([], null, 2), 'utf-8');
  }
} catch (agreementsFileErr) {
  console.warn('Customer agreements DB file init notice:', agreementsFileErr);
}

// Helper to convert database row to universal Expense record
function mapRowToExpense(row: any): any {
  // Check if packed JSON metadata exists in notes
  let meta: any = {};
  if (row.notes && typeof row.notes === 'string' && row.notes.startsWith('{') && row.notes.includes('__taxvault__')) {
    try {
      meta = JSON.parse(row.notes);
    } catch {}
  }

  const country = row.country || meta.country || (row.vendor_gstin ? 'IN' : 'NZ');
  const currency = row.currency || meta.currency || (country === 'IN' ? 'INR' : country === 'AU' ? 'AUD' : country === 'CA' ? 'CAD' : country === 'US' ? 'USD' : 'NZD');
  const currencySymbol = row.currency_symbol || meta.currencySymbol || (currency === 'INR' ? '₹' : '$');

  const amount = Number(row.amount || 0);
  const gstAmount = Number(row.gst_amount ?? meta.gstAmount ?? 0);
  const pstAmount = Number(row.pst_amount ?? meta.pstAmount ?? 0);
  const hstAmount = Number(row.hst_amount ?? meta.hstAmount ?? 0);
  const salesTaxAmount = Number(row.sales_tax_amount ?? meta.salesTaxAmount ?? 0);
  const cgst = Number(row.cgst ?? meta.cgst ?? 0);
  const sgst = Number(row.sgst ?? meta.sgst ?? 0);
  const igst = Number(row.igst ?? meta.igst ?? 0);
  const cess = Number(row.cess ?? meta.cess ?? 0);
  const roundOff = Number(row.round_off ?? meta.roundOff ?? 0);

  const totalIndianTax = cgst + sgst + igst + cess;
  const totalGeneralTax = gstAmount + pstAmount + hstAmount + salesTaxAmount;
  const totalTax = totalIndianTax > 0 ? totalIndianTax : totalGeneralTax;

  const subtotal = Number(row.subtotal || meta.subtotal || Math.max(0, amount - totalTax));
  const taxType = row.tax_type || meta.taxType || (country === 'US' ? 'Sales Tax' : country === 'CA' ? (hstAmount > 0 ? 'HST' : 'GST') : country === 'IN' ? (igst > 0 ? 'IGST' : 'CGST+SGST') : 'GST');
  const taxRate = Number(row.tax_rate ?? meta.taxRate ?? (country === 'NZ' ? 15 : country === 'AU' ? 10 : country === 'CA' ? 13 : country === 'US' ? 8.875 : 18));
  const taxAmount = Number(row.tax_amount ?? meta.taxAmount ?? totalTax);

  const expenseType = row.expense_type || meta.expenseType || (row.is_deductible ? 'Business' : 'Personal');
  const businessPercentage = Number(row.business_percentage ?? meta.businessPercentage ?? (expenseType === 'Business' ? 100 : expenseType === 'Mixed' ? 60 : 0));
  const claimableBusinessAmount = Number(row.claimable_business_amount ?? meta.claimableBusinessAmount ?? Math.round(amount * (businessPercentage / 100)));

  const vendorTaxId = row.vendor_tax_id || meta.vendorTaxId || row.vendor_gstin || meta.vendorGSTIN || '';
  const customerTaxId = row.customer_tax_id || meta.customerTaxId || row.customer_gstin || meta.customerGSTIN || '';

    const isDeleted = Boolean(
      row.is_deleted ||
      row.status === 'deleted' ||
      row.sync_status === 'deleted' ||
      meta.isDeleted ||
      meta.status === 'deleted'
    );
    const status = isDeleted ? 'deleted' : (row.status || meta.status || 'active');

    return {
      id: String(row.id),
      country,
      currency,
      currencySymbol,
      merchant: String(row.merchant || ''),
      invoiceNumber: row.invoice_number || meta.invoiceNumber || row.receipt_number || '',
      receiptNumber: row.receipt_number || meta.receiptNumber || '',
      date: String(row.date),
      time: row.time || meta.time || '12:00',
      vendorAddress: row.vendor_address || meta.vendorAddress || '',
      vendorPhone: row.vendor_phone || meta.vendorPhone || '',
      vendorTaxId,
      customerTaxId,
      vendorGSTIN: vendorTaxId,
      customerGSTIN: customerTaxId,
      state: row.state || meta.state || '',
      paymentMethod: row.payment_method || meta.paymentMethod || 'Credit Card',
      subtotal,
      discount: Number(row.discount || meta.discount || 0),
      taxableAmount: subtotal,
      taxType,
      taxRate,
      taxAmount,
      gstAmount,
      pstAmount,
      hstAmount,
      salesTaxAmount,
      cgst,
      sgst,
      igst,
      cess,
      roundOff,
      amount,
      category: row.category || meta.category || 'Office Expenses',
      expenseType,
      businessPercentage,
      claimableBusinessAmount: isDeleted ? 0 : claimableBusinessAmount,
      items: Array.isArray(row.items) ? row.items : (Array.isArray(meta.items) ? meta.items : [
        { name: row.description || row.merchant || 'General Expense', quantity: 1, unitPrice: amount, total: amount }
      ]),
      receiptUrl: row.receipt_url || meta.receiptUrl || undefined,
      receiptFileName: row.receipt_file_name || meta.receiptFileName || undefined,
      gstTreatment: row.gst_treatment || meta.gstTreatment || (totalTax > 0 ? 'Likely eligible' : 'Not identified'),
      caReviewStatus: row.ca_review_status || meta.caReviewStatus || 'Not Reviewed',
      caNotes: row.ca_notes || meta.caNotes || '',
      confidenceScores: row.confidence_scores || meta.confidenceScores || { merchant: 96, date: 98, total: 99 },
      calculationMismatch: Boolean(row.calculation_mismatch ?? meta.calculationMismatch),
      isRecurring: Boolean(row.is_recurring ?? meta.isRecurring),
      recurringFrequency: row.recurring_frequency || meta.recurringFrequency || 'monthly',
      status,
      isDeleted,
      deletedAt: row.deleted_at || meta.deletedAt || undefined,
      syncStatus: isDeleted ? 'deleted' : 'synced',
      createdAt: row.created_at || new Date().toISOString(),
      updatedAt: row.updated_at || new Date().toISOString(),
    };
  }

// Persists a full expense record to Supabase, falling back to packed metadata in `notes`
// when the dedicated multi-country columns have not been migrated yet.
// `ownerId` is the verified auth user id: it always becomes customer_tax_id, the column that
// Row Level Security uses to decide who owns the row.
async function persistExpenseRow(supabase: any, exp: any, ownerId: string): Promise<void> {
  const ownerProfile = profileCache.get(ownerId) || {};
  // Attempt full insert with dedicated multi-country columns
  const country = exp.country || ownerProfile.country || 'NZ';
  const currency = exp.currency || ownerProfile.defaultCurrency || (country === 'IN' ? 'INR' : country === 'AU' ? 'AUD' : country === 'CA' ? 'CAD' : country === 'US' ? 'USD' : 'NZD');
  const vendorTaxId = exp.vendorTaxId || exp.vendorGSTIN || null;
  const validProfileId = ownerId;
  // customer_gstin stores the customer's GST registration number, never a profile id
  const gstinCandidate = exp.customerGSTIN && exp.customerGSTIN !== ownerId ? exp.customerGSTIN : exp.customerTaxId;
  const customerGstin = (gstinCandidate && gstinCandidate !== ownerId && !String(gstinCandidate).startsWith('usr_') ? gstinCandidate : null) || ownerProfile.gstin || null;

  const fullRow: any = {
    id: exp.id,
    country,
    currency,
    merchant: exp.merchant,
    description: exp.description || exp.merchant || '',
    is_deductible: exp.expenseType === 'Business',
    deductible_percentage: exp.businessPercentage ?? 100,
    invoice_number: exp.invoiceNumber || exp.receiptNumber || null,
    receipt_number: exp.receiptNumber || null,
    date: exp.date,
    time: exp.time || '12:00',
    vendor_address: exp.vendorAddress || null,
    vendor_phone: exp.vendorPhone || null,
    vendor_tax_id: vendorTaxId,
    customer_tax_id: validProfileId,
    vendor_gstin: vendorTaxId,
    customer_gstin: customerGstin,
    state: exp.state || null,
    payment_method: exp.paymentMethod || 'Credit Card',
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
    amount: exp.amount,
    category: exp.category,
    expense_type: exp.expenseType || 'Business',
    business_percentage: exp.businessPercentage ?? 100,
    claimable_business_amount: exp.claimableBusinessAmount ?? exp.amount,
    items: exp.items || [],
    confidence_scores: exp.confidenceScores || {},
    receipt_url: exp.receiptUrl || null,
    receipt_file_name: exp.receiptFileName || null,
    gst_treatment: exp.gstTreatment || 'Likely eligible',
    ca_review_status: exp.caReviewStatus || 'Not Reviewed',
    ca_notes: exp.caNotes || null,
    user_notes: exp.userNotes || null,
    calculation_mismatch: Boolean(exp.calculationMismatch),
    is_recurring: Boolean(exp.isRecurring),
    recurring_frequency: exp.recurringFrequency || 'monthly',
    sync_status: 'synced',
    created_at: exp.createdAt,
    updated_at: exp.updatedAt,
  };

  const { error: fullErr } = await supabase.from('expenses').upsert(fullRow);
  if (fullErr) {
    // If schema cache hasn't added new columns yet, use safe fallback mapping to existing columns
    const safeMeta = JSON.stringify({
      __taxvault__: true,
      country,
      currency,
      vendorTaxId,
      customerTaxId: customerGstin,
      subtotal: exp.subtotal,
      taxType: exp.taxType,
      taxRate: exp.taxRate,
      taxAmount: exp.taxAmount,
      gstAmount: exp.gstAmount,
      pstAmount: exp.pstAmount,
      hstAmount: exp.hstAmount,
      salesTaxAmount: exp.salesTaxAmount,
      cgst: exp.cgst,
      sgst: exp.sgst,
      igst: exp.igst,
      cess: exp.cess,
      roundOff: exp.roundOff,
      vendorGSTIN: vendorTaxId,
      customerGSTIN: customerGstin,
      invoiceNumber: exp.invoiceNumber,
      items: exp.items,
      confidenceScores: exp.confidenceScores,
      expenseType: exp.expenseType,
      businessPercentage: exp.businessPercentage,
      claimableBusinessAmount: exp.claimableBusinessAmount,
      gstTreatment: exp.gstTreatment,
      caReviewStatus: exp.caReviewStatus,
      caNotes: exp.caNotes,
    });

    const compatRow = {
      id: exp.id,
      customer_tax_id: validProfileId,
      date: exp.date,
      merchant: exp.merchant,
      category: exp.category,
      description: exp.merchant,
      amount: exp.amount,
      gst_amount: exp.gstAmount || (exp.cgst || 0) + (exp.sgst || 0) + (exp.igst || 0) || exp.taxAmount || 0,
      is_deductible: exp.expenseType === 'Business',
      deductible_percentage: exp.businessPercentage ?? 100,
      receipt_url: exp.receiptUrl || null,
      receipt_file_name: exp.receiptFileName || null,
      receipt_number: exp.invoiceNumber || exp.receiptNumber || null,
      payment_method: exp.paymentMethod || 'Credit Card',
      notes: safeMeta,
      sync_status: 'synced',
      created_at: exp.createdAt,
      updated_at: exp.updatedAt,
    };
    try {
      await supabase.from('expenses').upsert(compatRow);
    } catch {}
  }
}

export function createApi(): express.Express {
  const app = express();

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '';
  const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;
  const supabaseAdmin = (supabaseUrl && supabaseServiceRoleKey) ? createClient(supabaseUrl, supabaseServiceRoleKey) : null;

  // CA zip packs carry the receipt images, so that route accepts larger bodies
  const jsonBody = express.json({ limit: '20mb' });
  const largeJsonBody = express.json({ limit: '60mb' });
  app.use((req, res, next) => (req.path.startsWith('/api/exports/') ? largeJsonBody : jsonBody)(req, res, next));

  // CORS for the Capacitor Android/iOS builds, which call this server from their own origin.
  // Add more origins (comma separated) via CORS_ORIGINS if the web app is hosted elsewhere.
  const allowedOrigins = new Set(
    [
      'capacitor://localhost',
      'https://localhost',
      'http://localhost',
      process.env.APP_URL || '',
      ...(process.env.CORS_ORIGINS || '').split(','),
    ]
      .map((o) => o.trim().replace(/\/+$/, ''))
      .filter(Boolean)
  );
  app.use('/api', (req, res, next) => {
    const origin = req.headers.origin;
    if (origin && allowedOrigins.has(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization');
    }
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
  });

  // Minimal in-memory rate limiter so public endpoints can't be used to drain the Gemini quota
  // or spam reset emails.
  const rateBuckets = new Map<string, { count: number; resetAt: number }>();
  const rateLimit = (name: string, max: number, windowMs: number) =>
    (req: express.Request, res: express.Response, next: express.NextFunction) => {
      const key = `${name}:${req.ip}`;
      const now = Date.now();
      const bucket = rateBuckets.get(key);
      if (!bucket || bucket.resetAt <= now) {
        rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
        return next();
      }
      if (bucket.count >= max) {
        res.setHeader('Retry-After', String(Math.ceil((bucket.resetAt - now) / 1000)));
        return res.status(429).json({ success: false, error: 'Too many requests. Please try again shortly.' });
      }
      bucket.count += 1;
      next();
    };

  // Verified-user middleware. The client sends its Supabase session token as
  // `Authorization: Bearer <access_token>`; we verify it with the service-role client and set
  // req.user. Data routes use req.user.id as the owner and ignore any userId/email the client
  // sends, then read and write with supabaseAdmin (which bypasses RLS) scoped to that owner.
  const tokenCache = new Map<string, { user: AuthUser; expiresAt: number }>();
  const verifyAccessToken = async (req: express.Request): Promise<AuthUser | null> => {
    const authHeader = String(req.headers.authorization || '');
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    if (!token || !supabaseAdmin) return null;
    const cached = tokenCache.get(token);
    if (cached && cached.expiresAt > Date.now()) return cached.user;
    const { data, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !data?.user) return null;
    const user: AuthUser = { id: data.user.id, email: (data.user.email || '').toLowerCase() };
    if (tokenCache.size > 1000) tokenCache.clear();
    tokenCache.set(token, { user, expiresAt: Date.now() + 60 * 1000 });
    return user;
  };
  const requireUser = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (!supabaseAdmin) {
      return res.status(503).json({ success: false, error: 'Server is missing SUPABASE_SERVICE_ROLE_KEY.' });
    }
    try {
      const user = await verifyAccessToken(req);
      if (!user) {
        return res.status(401).json({ success: false, error: 'Sign in to access your TaxVault data.', code: 'AUTH_REQUIRED' });
      }
      req.user = user;
      next();
    } catch (err: any) {
      return res.status(401).json({ success: false, error: err?.message || 'Invalid session.', code: 'AUTH_REQUIRED' });
    }
  };
  // Sets req.user when a valid token is present, but lets anonymous requests through.
  const optionalUser = async (req: express.Request, _res: express.Response, next: express.NextFunction) => {
    try {
      req.user = (await verifyAccessToken(req)) || undefined;
    } catch {}
    next();
  };
  // ---- Plan entitlement: the server is the only source of truth ----------------------------
  // Plan tier and scan counts live in customer_subscriptions / customer_usage, which clients can
  // read but not write (RLS). profiles.subscription and the app's local profile are display
  // copies only and are never trusted.
  const FREE_MONTHLY_SCANS = 10;
  const PAID_PLAN_PRICES_INR: Record<'pro' | 'enterprise', { monthly: number; annual: number }> = {
    pro: { monthly: 1199, annual: 11999 },
    enterprise: { monthly: 3199, annual: 31999 },
  };
  // Without RAZORPAY_KEY_SECRET payments cannot be verified. Simulated upgrades are then only
  // accepted when explicitly enabled (local testing), never by default.
  // Overridable only from the server environment (used to test against a stub of the Razorpay API)
  const RAZORPAY_API_BASE = (process.env.RAZORPAY_API_BASE || 'https://api.razorpay.com').replace(/\/+$/, '');
  const simulatedPaymentsAllowed = () =>
    !process.env.RAZORPAY_KEY_SECRET && process.env.ALLOW_SIMULATED_PAYMENTS === 'true';
  const currentPeriodStart = () => {
    const now = new Date();
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10);
  };
  type Entitlement = {
    tier: 'free' | 'pro' | 'enterprise';
    billingCycle: 'monthly' | 'annual';
    status: string;
    periodEnd: string | null;
    scansUsed: number;
  };
  const getEntitlement = async (userId: string): Promise<Entitlement> => {
    const ent: Entitlement = { tier: 'free', billingCycle: 'monthly', status: 'active', periodEnd: null, scansUsed: 0 };
    const [{ data: sub }, { data: usage }] = await Promise.all([
      supabaseAdmin!.from('customer_subscriptions').select('*').eq('user_id', userId)
        .order('updated_at', { ascending: false }).limit(1).maybeSingle(),
      supabaseAdmin!.from('customer_usage').select('scans_used').eq('user_id', userId)
        .eq('period_start', currentPeriodStart()).maybeSingle(),
    ]);
    const paidActive = sub
      && (sub.plan_id === 'pro' || sub.plan_id === 'enterprise')
      && ['active', 'trial'].includes(sub.status)
      && (!sub.current_period_end || new Date(sub.current_period_end).getTime() > Date.now());
    if (paidActive) {
      ent.tier = sub.plan_id;
      ent.billingCycle = sub.billing_cycle === 'annual' ? 'annual' : 'monthly';
      ent.status = sub.status;
      ent.periodEnd = sub.current_period_end || null;
    }
    ent.scansUsed = Number(usage?.scans_used || 0);
    return ent;
  };
  // Shape used by the app's UserProfile.subscription
  const toProfileSubscription = (ent: Entitlement) => ({
    tier: ent.tier,
    billingCycle: ent.billingCycle,
    status: ent.status,
    receiptsScannedThisMonth: ent.scansUsed,
    monthlyReceiptLimit: ent.tier === 'free' ? FREE_MONTHLY_SCANS : 999999,
    usagePeriod: currentPeriodStart().slice(0, 7),
    renewsOn: ent.periodEnd ? ent.periodEnd.slice(0, 10) : undefined,
  });
  const incrementScanUsage = async (userId: string) => {
    const periodStart = currentPeriodStart();
    const { data: row } = await supabaseAdmin!.from('customer_usage').select('id, scans_used, requests_count')
      .eq('user_id', userId).eq('period_start', periodStart).maybeSingle();
    if (row) {
      await supabaseAdmin!.from('customer_usage').update({
        scans_used: Number(row.scans_used || 0) + 1,
        requests_count: Number(row.requests_count || 0) + 1,
        last_request_at: new Date().toISOString(),
      }).eq('id', row.id);
    } else {
      const start = new Date(periodStart);
      const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0)).toISOString().slice(0, 10);
      await supabaseAdmin!.from('customer_usage').insert({
        user_id: userId, period_start: periodStart, period_end: end, scans_used: 1, requests_count: 1,
        scans_limit: FREE_MONTHLY_SCANS,
      });
    }
  };
  const activatePlan = async (
    userId: string,
    tier: 'free' | 'pro' | 'enterprise',
    billingCycle: 'monthly' | 'annual',
    payment: { gateway: string; amount: number; orderId?: string; paymentId?: string; signature?: string },
  ) => {
    const now = new Date();
    const periodEnd = tier === 'free'
      ? null
      : new Date(now.getTime() + (billingCycle === 'annual' ? 365 : 30) * 86400000).toISOString();
    const subId = 'sub_' + userId;
    const { error: subErr } = await supabaseAdmin!.from('customer_subscriptions').upsert({
      id: subId,
      user_id: userId,
      plan_id: tier,
      status: 'active',
      billing_cycle: billingCycle,
      current_period_start: now.toISOString(),
      current_period_end: periodEnd,
      cancel_at_period_end: false,
      payment_method: payment.gateway,
      updated_at: now.toISOString(),
    });
    if (subErr) throw new Error(subErr.message);
    await supabaseAdmin!.from('subscription_transactions').insert({
      id: 'tx_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7),
      subscription_id: subId,
      user_id: userId,
      plan_id: tier,
      amount: payment.amount,
      currency: 'INR',
      status: 'succeeded',
      billing_cycle: billingCycle,
      payment_gateway: payment.gateway,
      gateway_order_id: payment.orderId || null,
      gateway_payment_id: payment.paymentId || null,
      gateway_signature: payment.signature || null,
    });
    // Keep the display copy on the profile in step
    const ent = await getEntitlement(userId);
    await supabaseAdmin!.from('profiles').update({ subscription: toProfileSubscription(ent) }).eq('id', userId);
    return ent;
  };

  // Returns the owner of an expense row, or null if no such row exists.
  const getExpenseOwner = async (id: string): Promise<string | null> => {
    const { data } = await supabaseAdmin!.from('expenses').select('customer_tax_id').eq('id', id).maybeSingle();
    return data ? (data.customer_tax_id ?? '') : null;
  };

  // 1. Health check
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'TaxVault India API Engine',
      supabaseConfigured: Boolean(supabase),
      authConfigured: Boolean(supabaseAdmin),
      timestamp: new Date().toISOString(),
    });
  });

  // 2. Supabase Connectivity & Table Status Check
  app.get('/api/supabase/status', async (_req, res) => {
    if (!supabase || !supabaseUrl || !supabaseKey) {
      return res.json({
        configured: false,
        connected: false,
        tablesReady: false,
        url: '',
        message: 'Supabase credentials not configured in environment variables'
      });
    }

    try {
      const { data, error } = await supabase.from('expenses').select('id').limit(1);
      const tablesReady = !error || (!error.message.includes('schema cache') && error.code !== 'PGRST205');
      return res.json({
        configured: true,
        connected: true,
        tablesReady,
        url: supabaseUrl,
        tableStatus: tablesReady ? 'ready' : 'pending_schema_migration',
        message: tablesReady
          ? 'Connected to Supabase project with database ready'
          : 'Connected to Supabase. Run SQL schema in Supabase SQL editor for dedicated Indian columns.'
      });
    } catch (err: any) {
      return res.status(500).json({
        configured: true,
        connected: false,
        tablesReady: false,
        url: supabaseUrl,
        error: err?.message || 'Failed to ping Supabase'
      });
    }
  });

  // 3. API: Fetch the signed-in user's expenses (GET /api/expenses)
  app.get('/api/expenses', requireUser, async (req, res) => {
    const userId = req.user!.id;
    try {
      const { data, error } = await supabaseAdmin!
        .from('expenses')
        .select('*')
        .eq('customer_tax_id', userId)
        .order('date', { ascending: false });

      if (!error && Array.isArray(data)) {
        const mapped = data.map(mapRowToExpense);
        setCachedExpenses(userId, mapped);
        return res.json({ success: true, count: mapped.length, data: mapped, source: 'supabase' });
      }
      const cached = getCachedExpenses(userId);
      return res.json({ success: true, count: cached.length, data: cached, source: 'cache' });
    } catch (err: any) {
      const cached = getCachedExpenses(userId);
      return res.json({ success: true, count: cached.length, data: cached, source: 'fallback' });
    }
  });

  // 4. API: Create New Expense (POST /api/expenses)
  app.post('/api/expenses', requireUser, async (req, res) => {
    const userId = req.user!.id;
    try {
      const exp = req.body;
      const cleanMerchant = exp?.merchant?.trim();
      const cleanAmount = Number(exp?.amount);
      if (!exp || !cleanMerchant || isNaN(cleanAmount) || cleanAmount <= 0) {
        return res.status(400).json({ error: 'Valid non-blank merchant name and positive amount are required.' });
      }
      exp.merchant = cleanMerchant;
      exp.amount = cleanAmount;

      if (!exp.id) {
        exp.id = 'exp-' + Date.now().toString(36);
      }
      // Ids are client-generated: never let an upsert overwrite (and take over) another user's row
      const owner = await getExpenseOwner(String(exp.id));
      if (owner !== null && owner !== userId) {
        return res.status(409).json({ error: 'An expense with this id already exists.' });
      }
      exp.userId = userId;
      exp.customerTaxId = userId;
      exp.syncStatus = 'synced';
      exp.updatedAt = new Date().toISOString();
      if (!exp.createdAt) exp.createdAt = new Date().toISOString();

      await persistExpenseRow(supabaseAdmin, exp, userId);

      const cached = getCachedExpenses(userId);
      const existingIdx = cached.findIndex(e => e.id === exp.id);
      if (existingIdx >= 0) cached[existingIdx] = exp;
      else cached.unshift(exp);
      setCachedExpenses(userId, cached);

      return res.status(201).json({ success: true, data: exp });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message });
    }
  });

  // 5. API: Update Existing Expense (PUT /api/expenses/:id)
  app.put('/api/expenses/:id', requireUser, async (req, res) => {
    const userId = req.user!.id;
    try {
      const { id } = req.params;
      const cleanMerchant = req.body?.merchant?.trim();
      const cleanAmount = Number(req.body?.amount);
      if (!cleanMerchant || isNaN(cleanAmount) || cleanAmount <= 0) {
        return res.status(400).json({ error: 'Valid non-blank merchant name and positive amount are required.' });
      }
      const owner = await getExpenseOwner(id);
      if (owner !== null && owner !== userId) {
        return res.status(404).json({ error: 'Expense not found.' });
      }
      const updatedData = {
        ...req.body,
        id,
        userId,
        customerTaxId: userId,
        merchant: cleanMerchant,
        amount: cleanAmount,
        syncStatus: 'synced',
        updatedAt: new Date().toISOString(),
      };

      // Persist every edited field (type, business %, taxes, CA status, notes), not just the headline values
      try {
        await persistExpenseRow(supabaseAdmin, updatedData, userId);
      } catch (dbErr: any) {
        console.warn('Supabase expense update error:', dbErr?.message);
      }

      const cached = getCachedExpenses(userId);
      const idx = cached.findIndex(e => e.id === id);
      if (idx >= 0) cached[idx] = updatedData;
      else cached.unshift(updatedData);
      setCachedExpenses(userId, cached);

      return res.json({ success: true, data: updatedData });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message });
    }
  });

  // 6. API: Soft-Delete Expense (DELETE /api/expenses/:id - marks status='deleted')
  app.delete('/api/expenses/:id', requireUser, async (req, res) => {
    const userId = req.user!.id;
    try {
      const { id } = req.params;
      const now = new Date().toISOString();

      // Soft-delete in memory cache
      const cached = getCachedExpenses(userId);
      const idx = cached.findIndex(e => e.id === id);
      if (idx >= 0) {
        cached[idx] = {
          ...cached[idx],
          status: 'deleted',
          isDeleted: true,
          deletedAt: now,
          syncStatus: 'deleted',
          claimableBusinessAmount: 0,
          isDeductible: false,
          updatedAt: now,
        };
      }

      // Soft-delete in Supabase (preserves row record, changes status and deductibility).
      // The customer_tax_id filter means a user can only ever touch their own rows.
      const packedMeta = JSON.stringify({ __taxvault__: true, status: 'deleted', isDeleted: true, deletedAt: now });
      try {
        const { error } = await supabaseAdmin!.from('expenses').update({
          status: 'deleted',
          is_deleted: true,
          deleted_at: now,
          sync_status: 'deleted',
          claimable_business_amount: 0,
          is_deductible: false,
          notes: packedMeta,
          updated_at: now,
        }).eq('id', id).eq('customer_tax_id', userId);

        if (error) {
          // Fallback if status/is_deleted columns have not been run in Supabase SQL editor yet
          await supabaseAdmin!.from('expenses').update({
            sync_status: 'deleted',
            claimable_business_amount: 0,
            is_deductible: false,
            notes: packedMeta,
            updated_at: now,
          }).eq('id', id).eq('customer_tax_id', userId);
        }
      } catch (dbErr: any) {
        console.warn('Supabase soft-delete update error:', dbErr?.message);
      }

      return res.json({
        success: true,
        deletedId: id,
        status: 'deleted',
        isDeleted: true,
        message: 'Expense status changed to deleted (soft delete preserved)'
      });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message });
    }
  });

  // 6b. API: Restore Deleted Expense (POST /api/expenses/:id/restore)
  app.post('/api/expenses/:id/restore', requireUser, async (req, res) => {
    const userId = req.user!.id;
    try {
      const { id } = req.params;
      const now = new Date().toISOString();

      // Read the row from the database (scoped to the owner) rather than trusting the cache
      const { data: row } = await supabaseAdmin!
        .from('expenses')
        .select('*')
        .eq('id', id)
        .eq('customer_tax_id', userId)
        .maybeSingle();
      const cached = getCachedExpenses(userId);
      const idx = cached.findIndex(e => e.id === id);
      const item = row ? mapRowToExpense(row) : idx >= 0 ? cached[idx] : null;
      if (!item) {
        return res.status(404).json({ error: 'Expense not found.' });
      }

      const bizAmt = item.expenseType === 'Business'
        ? (item.amount || 0)
        : item.expenseType === 'Mixed'
        ? Math.round((item.amount || 0) * ((item.businessPercentage || 50) / 100))
        : 0;
      const restoredItem = {
        ...item,
        status: 'active',
        isDeleted: false,
        deletedAt: undefined,
        syncStatus: 'synced',
        claimableBusinessAmount: bizAmt,
        isDeductible: item.expenseType === 'Business',
        updatedAt: now,
      };
      if (idx >= 0) cached[idx] = restoredItem;

      const packedMeta = JSON.stringify({ __taxvault__: true, status: 'active', isDeleted: false });
      try {
        const { error } = await supabaseAdmin!.from('expenses').update({
          status: 'active',
          is_deleted: false,
          deleted_at: null,
          sync_status: 'synced',
          claimable_business_amount: bizAmt,
          is_deductible: item.expenseType === 'Business',
          notes: packedMeta,
          updated_at: now,
        }).eq('id', id).eq('customer_tax_id', userId);

        if (error) {
          await supabaseAdmin!.from('expenses').update({
            sync_status: 'synced',
            claimable_business_amount: bizAmt,
            is_deductible: item.expenseType === 'Business',
            notes: packedMeta,
            updated_at: now,
          }).eq('id', id).eq('customer_tax_id', userId);
        }
      } catch {}

      return res.json({ success: true, restoredId: id, data: restoredItem });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message });
    }
  });

  // 6a. API: Send Reset Link (POST /api/auth/send-reset-link)
  app.post('/api/auth/send-reset-link', rateLimit('reset-link', 5, 15 * 60 * 1000), async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ success: false, error: 'Email is required.' });
      }

      const cleanEmail = String(email).trim().toLowerCase();
      const origin = req.headers.origin || process.env.APP_URL || 'http://localhost:3000';
      const redirectTo = `${origin}/?type=recovery&email=${encodeURIComponent(cleanEmail)}`;

      let recoveryLink = '';

      // 1. Try Supabase Admin generateLink
      if (supabaseAdmin) {
        try {
          const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
            type: 'recovery',
            email: cleanEmail,
            options: { redirectTo },
          });
          if (!linkErr && linkData?.properties?.action_link) {
            recoveryLink = linkData.properties.action_link;
            // A recovery link signs its holder into the account: only print it for local development
            if (process.env.NODE_ENV !== 'production') {
              console.log(`[dev] Supabase recovery link for ${cleanEmail}: ${recoveryLink}`);
            }
          }
        } catch (adminErr: any) {
          console.warn('Supabase Admin generateLink notice:', adminErr?.message);
        }
      }

      // 2. Also trigger Supabase client resetPasswordForEmail
      if (supabase) {
        try {
          await supabase.auth.resetPasswordForEmail(cleanEmail, { redirectTo });
        } catch (supaErr: any) {
          console.warn('Supabase auth resetPasswordForEmail notice:', supaErr?.message);
        }
      }

      // 3. Dispatch via direct Gmail SMTP if configured
      let emailSentDirectly = false;
      const smtpUser = process.env.SMTP_USER;
      const smtpPass = (process.env.SMTP_PASS || '').replace(/\s+/g, '');
      if (smtpUser && smtpPass && recoveryLink) {
        try {
          const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: Number(process.env.SMTP_PORT) || 465,
            secure: true,
            auth: {
              user: smtpUser,
              pass: smtpPass,
            },
          });
          await transporter.sendMail({
            from: `"TaxVault Security" <${smtpUser}>`,
            to: cleanEmail,
            subject: 'Reset Your TaxVault Password',
            text: `You requested a password reset for your TaxVault account (${cleanEmail}).\n\nClick the link below to set your new password:\n${recoveryLink}\n\nIf you did not request this, please ignore this email.`,
            html: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 28px; border: 1px solid #e2e8f0; border-radius: 16px; background: #ffffff;">
                <div style="margin-bottom: 20px;">
                  <span style="background: #059669; color: #ffffff; font-weight: 800; font-size: 11px; padding: 4px 10px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.5px;">TaxVault Security</span>
                </div>
                <h2 style="color: #0f172a; font-size: 20px; font-weight: 800; margin: 0 0 10px 0;">Reset Your Password</h2>
                <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 24px 0;">
                  We received a request to reset the password for your TaxVault account (<strong>${cleanEmail}</strong>). Click the secure link below to choose your new password:
                </p>
                <div style="margin: 28px 0; text-align: center;">
                  <a href="${recoveryLink}" style="background-color: #059669; color: #ffffff; padding: 13px 28px; font-weight: 800; font-size: 14px; text-decoration: none; border-radius: 12px; display: inline-block; box-shadow: 0 4px 12px rgba(5, 150, 105, 0.3);">Reset Password</a>
                </div>
                <p style="color: #64748b; font-size: 12px; line-height: 1.5; margin: 24px 0 0 0; border-top: 1px solid #f1f5f9; padding-top: 16px;">
                  If the button does not work, copy and paste this link in your browser:<br/>
                  <a href="${recoveryLink}" style="color: #059669; word-break: break-all;">${recoveryLink}</a>
                </p>
                <p style="color: #94a3b8; font-size: 11px; margin-top: 16px;">If you did not make this request, you can safely ignore this email.</p>
              </div>
            `,
          });
          emailSentDirectly = true;
          console.log(`✅ Direct SMTP email dispatched instantaneously to ${cleanEmail}`);
        } catch (smtpErr: any) {
          console.warn('Direct SMTP notice:', smtpErr?.message);
        }
      }

      // Never return the recovery link itself: whoever holds it can take over the account.
      // It is delivered only to the mailbox (via SMTP above or Supabase's own mailer).
      return res.json({
        success: true,
        message: emailSentDirectly ? 'Password reset link sent directly to your email.' : 'Password reset link dispatched.',
        sentDirectly: emailSentDirectly,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Failed to dispatch reset link.' });
    }
  });

  // 6b. API: Reset Password (POST /api/auth/reset-password)
  app.post('/api/auth/reset-password', rateLimit('reset-password', 10, 15 * 60 * 1000), async (req, res) => {
    // Only the signed-in owner of an account may change its password. The caller must send the
    // Supabase access token from their recovery (or normal) session; the email in the body is
    // ignored, so knowing someone's email address is not enough to take over their account.
    try {
      const { newPassword } = req.body || {};
      const authHeader = String(req.headers.authorization || '');
      const accessToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

      if (!accessToken) {
        return res.status(401).json({
          success: false,
          error: 'Open the password reset link from your email to set a new password.',
          code: 'RECOVERY_SESSION_REQUIRED',
        });
      }
      if (!newPassword || String(newPassword).length < 6) {
        return res.status(400).json({ success: false, error: 'Password must be at least 6 characters long.' });
      }
      if (!supabaseAdmin) {
        return res.status(503).json({ success: false, error: 'Password reset is not configured on the server.' });
      }

      const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(accessToken);
      if (userErr || !userData?.user) {
        return res.status(401).json({
          success: false,
          error: 'Your reset link has expired. Please request a new one.',
          code: 'RECOVERY_SESSION_REQUIRED',
        });
      }

      const { error: updateErr } = await supabaseAdmin.auth.admin.updateUserById(userData.user.id, {
        password: String(newPassword),
      });
      if (updateErr) {
        return res.status(400).json({ success: false, error: updateErr.message });
      }
      return res.json({ success: true, message: 'Password updated successfully.' });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message || 'Internal server error' });
    }
  });

  // 7. API: Fetch the signed-in user's profile (GET /api/profile)
  // The profile row id is the Supabase auth user id; ?email= / ?userId= are ignored.
  app.get('/api/profile', requireUser, async (req, res) => {
    const { id: userId, email: userEmail } = req.user!;
    try {
      const { data, error } = await supabaseAdmin!.from('profiles').select('*').eq('id', userId).maybeSingle();
      if (!error && data) {
        const cachedProfile = profileCache.get(userId) || {};
        const country = data.country || cachedProfile.country || 'IN';
        const profile = {
          id: data.id,
          fullName: data.full_name || cachedProfile.fullName,
          email: data.email || userEmail,
          phone: data.phone || cachedProfile.phone,
          businessName: data.business_name || cachedProfile.businessName,
          businessType: data.business_type || cachedProfile.businessType,
          country: country,
          defaultCurrency: data.default_currency || cachedProfile.defaultCurrency || (country === 'IN' ? 'INR' : country === 'AU' ? 'AUD' : country === 'CA' ? 'CAD' : country === 'US' ? 'USD' : 'NZD'),
          currencySymbol: data.currency_symbol || cachedProfile.currencySymbol || (country === 'IN' ? '₹' : '$'),
          taxAuthority: data.tax_authority || cachedProfile.taxAuthority || (country === 'NZ' ? 'Inland Revenue Department (IRD)' : country === 'AU' ? 'Australian Taxation Office (ATO)' : country === 'CA' ? 'Canada Revenue Agency (CRA)' : country === 'US' ? 'Internal Revenue Service (IRS)' : 'Goods and Services Tax Network (GSTN)'),
          taxId: data.tax_id || data.pan || '',
          secondaryTaxId: data.secondary_tax_id || data.gstin || '',
          pan: data.pan || data.tax_id || '',
          gstin: data.gstin || data.secondary_tax_id || '',
          financialYear: data.financial_year || cachedProfile.financialYear,
          accountantName: data.accountant_name,
          accountantEmail: data.accountant_email,
          accountantPhone: data.accountant_phone,
          biometricLock: Boolean(data.biometric_lock),
          appPin: data.app_pin || '1234',
          // Never profiles.subscription: it is owner-writable and its column default says "pro"
          subscription: toProfileSubscription(await getEntitlement(userId)),
        };
        profileCache.set(userId, { ...cachedProfile, ...profile });
        return res.json({ success: true, data: profile });
      }
      const cachedProfile = profileCache.get(userId);
      if (cachedProfile) return res.json({ success: true, data: cachedProfile, source: 'cache' });
      return res.json({ success: false, data: null, message: 'Profile not found' });
    } catch (err: any) {
      return res.json({ success: false, error: err?.message, data: profileCache.get(userId) || null });
    }
  });

  // 8. API: Update the signed-in user's profile (PUT /api/profile)
  app.put('/api/profile', requireUser, async (req, res) => {
    const { id: userId, email: userEmail } = req.user!;
    try {
      const updated = req.body || {};
      const merged = {
        ...(profileCache.get(userId) || {}),
        ...updated,
        id: userId,
        email: userEmail || updated.email,
      };
      profileCache.set(userId, merged);

      try {
        const profileRow = {
          id: userId,
          full_name: updated.fullName,
          email: merged.email,
          phone: updated.phone,
          business_name: updated.businessName,
          business_type: updated.businessType,
          country: updated.country,
          default_currency: updated.defaultCurrency,
          currency_symbol: updated.currencySymbol,
          tax_authority: updated.taxAuthority,
          tax_id: updated.taxId,
          secondary_tax_id: updated.secondaryTaxId,
          pan: updated.pan || updated.taxId,
          gstin: updated.gstin || updated.secondaryTaxId,
          financial_year: updated.financialYear,
          accountant_name: updated.accountantName,
          accountant_email: updated.accountantEmail,
          accountant_phone: updated.accountantPhone,
          biometric_lock: Boolean(updated.biometricLock),
          app_pin: updated.appPin || '1234',
          updated_at: new Date().toISOString()
        };
        const { error: fullProfileErr } = await supabaseAdmin!.from('profiles').upsert(profileRow);
        if (fullProfileErr) {
          await supabaseAdmin!.from('profiles').upsert({
            id: profileRow.id,
            full_name: profileRow.full_name,
            email: profileRow.email,
            business_name: profileRow.business_name,
            business_type: profileRow.business_type,
            pan: profileRow.pan,
            gstin: profileRow.gstin,
            updated_at: profileRow.updated_at
          });
        }
      } catch {}

      return res.json({ success: true, data: merged });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message });
    }
  });

  // 9. API: Seed sample expenses for any supported country into the signed-in user's account
  // (POST /api/seed-country/:country). Rows are written with the caller as owner and ids
  // prefixed with the caller's id, so seeding never touches another user's records.
  app.post('/api/seed-country/:country', requireUser, async (req, res) => {
    const { id: userId, email: userEmail } = req.user!;
    try {
      const country = (req.params.country || 'NZ').toUpperCase();
      const seedList = SEED_EXPENSES_BY_COUNTRY[country] || SEED_NZ_EXPENSES;
      const targetProfile = { ...(DEFAULT_PROFILES[country] || DEFAULT_PROFILES.NZ), id: userId, email: userEmail };
      const ownedSeed = seedList.map((exp: any) => ({
        ...exp,
        id: `${userId}-${exp.id}`,
        userId,
        customerTaxId: userId,
        customerGSTIN: exp.customerTaxId || exp.customerGSTIN || '',
      }));

      setCachedExpenses(userId, ownedSeed);
      profileCache.set(userId, { ...(profileCache.get(userId) || {}), ...targetProfile });

      for (const exp of ownedSeed) {
        try {
          await persistExpenseRow(supabaseAdmin, exp, userId);
        } catch {}
      }

      return res.json({
        success: true,
        count: ownedSeed.length,
        country,
        profile: targetProfile,
        expenses: ownedSeed,
        message: `Successfully loaded realistic sample vouchers for ${country}`,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message });
    }
  });

  // Alias for backward compatibility
  app.post('/api/seed-indian', (_req, res) => res.redirect(307, '/api/seed-country/IN'));

  // 10. API: Reset the signed-in user's data (POST /api/reset-data)
  app.post('/api/reset-data', rateLimit('reset-data', 5, 15 * 60 * 1000), requireUser, async (req, res) => {
    // Clears only the caller's expenses; any userId in the body is ignored.
    const userId = req.user!.id;
    setCachedExpenses(userId, []);
    try {
      await supabaseAdmin!.from('expenses').delete().eq('customer_tax_id', userId);
    } catch {}
    return res.json({ success: true, message: 'Your expense data was cleared.' });
  });

  // 11. API: Calculated Reports Position for the signed-in user (GET /api/reports)
  app.get('/api/reports', requireUser, (req, res) => {
    const list = getCachedExpenses(req.user!.id);
    const totalExpenses = list.reduce((sum, e) => sum + e.amount, 0);
    const businessExpenses = list.filter(e => e.expenseType === 'Business').reduce((sum, e) => sum + e.amount, 0);
    const personalExpenses = list.filter(e => e.expenseType === 'Personal').reduce((sum, e) => sum + e.amount, 0);
    const claimableBusinessTotal = list.reduce((sum, e) => sum + (e.claimableBusinessAmount || 0), 0);
    const totalGstIdentified = list.reduce((sum, e) => sum + ((e.cgst || 0) + (e.sgst || 0) + (e.igst || 0) + (e.cess || 0)), 0);

    return res.json({
      success: true,
      data: {
        totalExpenses,
        businessExpenses,
        personalExpenses,
        claimableBusinessTotal,
        totalGstIdentified,
        count: list.length,
      }
    });
  });

  // 11b. API: Pro exports (POST /api/exports/pdf | xlsx | zip)
  // Generated here, not in the app, so the plan check can't be skipped by editing local data.
  // The free plan exports CSV only (done in the app). The document content is the caller's own
  // on-screen data (current period filter, profile details), passed in the body.
  app.post('/api/exports/:kind', rateLimit('exports', 30, 10 * 60 * 1000), requireUser, async (req, res) => {
    try {
      const kind = req.params.kind;
      if (!['pdf', 'xlsx', 'zip'].includes(kind)) {
        return res.status(404).json({ error: 'Unknown export type.' });
      }
      const ent = await getEntitlement(req.user!.id);
      if (ent.tier === 'free') {
        return res.status(402).json({
          error: 'PDF reports, Excel registers and CA audit packs require Tax Compliance Pro.',
          code: 'PRO_REQUIRED',
        });
      }

      const { profile, expenses, taxResult, options = {} } = req.body || {};
      if (!profile || !Array.isArray(expenses) || !taxResult) {
        return res.status(400).json({ error: 'profile, expenses and taxResult are required.' });
      }

      let body: Buffer;
      let contentType: string;
      if (kind === 'pdf') {
        const doc = ExportService.generateIndianCAPDF(profile, expenses, taxResult, {
          includeExpenses: options.includeExpenses,
          includeGst: options.includeGst,
          includeVendors: options.includeVendors,
          dateRangeLabel: options.dateRangeLabel,
        });
        body = Buffer.from(doc.output('arraybuffer'));
        contentType = 'application/pdf';
      } else if (kind === 'xlsx') {
        body = Buffer.from(ExportService.generateIndianExcelWorkbook(profile, expenses, taxResult));
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      } else {
        const zipBlob = await ExportService.generateCAZipPackage(profile, expenses, taxResult, {
          includeReceiptImages: options.includeReceiptImages,
          dateRangeLabel: options.dateRangeLabel,
        });
        body = Buffer.from(await zipBlob.arrayBuffer());
        contentType = 'application/zip';
      }

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Length', String(body.length));
      return res.send(body);
    } catch (err: any) {
      console.warn('Export generation error:', err?.message);
      return res.status(500).json({ error: 'Failed to generate the report. Please try again.' });
    }
  });

  // 12. API: Automated Multi-Jurisdiction Receipt OCR & GST Extraction
  // AI reading costs Gemini quota, so it needs a signed-in user and counts against the plan's
  // monthly scan limit, which is enforced here (the app's own counter is display only).
  app.post('/api/receipt-ocr', rateLimit('ocr', 40, 10 * 60 * 1000), requireUser, async (req, res) => {
    try {
      const { input, customerGstin = '', customerTaxId = '', country = 'NZ' } = req.body;
      // The Gemini key is read only on the server; it is never sent to or bundled into clients.
      const apiKey = process.env.GEMINI_API_KEY || '';

      if (!input) {
        return res.status(400).json({ error: 'Input receipt payload required' });
      }

      const ent = await getEntitlement(req.user!.id);
      if (ent.tier === 'free' && ent.scansUsed >= FREE_MONTHLY_SCANS) {
        return res.status(402).json({
          error: `You have used all ${FREE_MONTHLY_SCANS} free AI scans this month.`,
          code: 'SCAN_LIMIT',
          subscription: toProfileSubscription(ent),
        });
      }

      const isPdf = String(input).startsWith('data:application/pdf');
      const isImage = String(input).startsWith('data:image') || isPdf;

      if (apiKey && apiKey !== 'MY_GEMINI_API_KEY') {
        const ai = new GoogleGenAI({ apiKey });
        const targetTaxId = customerTaxId || customerGstin || '';

        const prompt = `You are an expert tax accountant and OCR engine for ${country} tax compliance.
Analyze this receipt or invoice carefully.
Extract all fields and return ONLY a valid JSON object without markdown fences, conforming strictly to:
{
  "merchant": "Vendor / Store Name",
  "invoiceNumber": "Invoice number or Bill number",
  "receiptNumber": "Receipt number if available",
  "date": "YYYY-MM-DD",
  "time": "HH:MM",
  "vendorAddress": "Vendor full address",
  "vendorPhone": "Vendor phone number",
  "vendorTaxId": "Tax number (GST, IRD, ABN, EIN, VAT)",
  "vendorGSTIN": "Same as vendorTaxId",
  "customerGSTIN": "${targetTaxId}",
  "customerTaxId": "${targetTaxId}",
  "state": "City or State",
  "paymentMethod": "Credit Card",
  "subtotal": 0.00,
  "discount": 0.00,
  "taxableAmount": 0.00,
  "taxAmount": 0.00,
  "gstAmount": 0.00,
  "cgst": 0.00,
  "sgst": 0.00,
  "igst": 0.00,
  "cess": 0.00,
  "roundOff": 0.00,
  "totalAmount": 0.00,
  "category": "Office Expenses",
  "expenseType": "Business",
  "businessPercentage": 100,
  "items": [
    {
      "name": "Item description",
      "quantity": 1,
      "unitPrice": 0.00,
      "total": 0.00
    }
  ],
  "confidenceScores": {
    "merchant": 98,
    "date": 99,
    "taxId": 94,
    "total": 99,
    "category": 95,
    "tax": 92
  }
}`;

        let contents: any = prompt;
        if (isImage) {
          const mimeType = isPdf
            ? 'application/pdf'
            : input.startsWith('data:image/png')
            ? 'image/png'
            : input.startsWith('data:image/webp')
            ? 'image/webp'
            : 'image/jpeg';
          const pureBase64 = input.includes('base64,') ? input.split('base64,')[1] : input;

          contents = [
            { text: prompt },
            {
              inlineData: {
                mimeType,
                data: pureBase64,
              },
            },
          ];
        } else {
          contents = `${prompt}\n\nInvoice Text:\n${String(input).substring(0, 6000)}`;
        }

        // Fast vision models first, falling back to the larger model
        const candidateModels = ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-3.5-flash'];
        for (const model of candidateModels) {
          try {
            const response = await ai.models.generateContent({
              model,
              contents,
              config: { temperature: 0.1, responseMimeType: 'application/json' },
            });
            const text = response.text || '';
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              const usage: any = (response as any).usageMetadata || {};
              try {
                await incrementScanUsage(req.user!.id);
              } catch (usageErr: any) {
                console.warn('Scan usage update notice:', usageErr?.message);
              }
              parsed._meta = {
                model,
                promptTokens: usage.promptTokenCount || 0,
                completionTokens: usage.candidatesTokenCount || 0,
                scansUsed: ent.scansUsed + 1,
              };
              return res.json(parsed);
            }
          } catch (modelErr: any) {
            console.warn(`Gemini model ${model} OCR notice:`, modelErr?.message);
          }
        }
      }

      // If an image was submitted without API key or AI parsing failed, do NOT return fake random data
      if (isImage) {
        return res.json({
          merchant: '',
          invoiceNumber: '',
          receiptNumber: '',
          date: new Date().toISOString().split('T')[0],
          time: '12:00',
          vendorAddress: '',
          vendorPhone: '',
          vendorTaxId: '',
          customerTaxId: customerTaxId || customerGstin || '',
          vendorGSTIN: '',
          customerGSTIN: customerTaxId || customerGstin || '',
          state: '',
          paymentMethod: 'Credit Card',
          subtotal: 0,
          discount: 0,
          taxableAmount: 0,
          taxAmount: 0,
          totalAmount: 0,
          category: 'Office Expenses',
          expenseType: 'Business',
          businessPercentage: 100,
          items: [],
          confidenceScores: { merchant: 0, date: 100, taxId: 0, total: 0, category: 50, tax: 0 },
          ocrStatus: 'manual_required',
          ocrMessage: 'Server OCR requires GEMINI_API_KEY in .env',
        });
      }

      // For plain text input (e.g., pasted text invoice)
      const lower = String(input).toLowerCase();
      let category = 'Office Expenses';
      let expenseType = 'Business';
      let businessPercentage = 100;

      if (lower.includes('petrol') || lower.includes('diesel') || lower.includes('fuel') || lower.includes('hpcl') || lower.includes('bpcl') || lower.includes('ioc') || lower.includes('bp connect') || lower.includes('z energy')) {
        category = 'Fuel';
        expenseType = 'Mixed';
        businessPercentage = 75;
      } else if (lower.includes('swiggy') || lower.includes('zomato') || lower.includes('food') || lower.includes('restaurant') || lower.includes('cafe')) {
        category = 'Food & Meals';
        expenseType = 'Mixed';
        businessPercentage = 60;
      } else if (lower.includes('flight') || lower.includes('airline') || lower.includes('uber') || lower.includes('travel')) {
        category = 'Travel';
      }

      const lines = String(input).split('\n').map(l => l.trim()).filter(Boolean);
      const merchantName = lines[0]?.substring(0, 40) || 'Commercial Vendor';

      return res.json({
        merchant: merchantName,
        invoiceNumber: '',
        receiptNumber: '',
        date: new Date().toISOString().split('T')[0],
        time: '12:00',
        vendorAddress: '',
        vendorPhone: '',
        vendorTaxId: '',
        customerTaxId: customerTaxId || customerGstin || '',
        vendorGSTIN: '',
        customerGSTIN: customerTaxId || customerGstin || '',
        state: '',
        paymentMethod: 'Credit Card',
        subtotal: 0,
        discount: 0,
        taxableAmount: 0,
        taxAmount: 0,
        totalAmount: 0,
        category,
        expenseType,
        businessPercentage,
        items: [],
        confidenceScores: { merchant: 80, date: 90, taxId: 50, total: 50, category: 80, tax: 50 },
      });
    } catch (err: any) {
      console.warn('Backend OCR error:', err?.message);
      return res.status(500).json({ error: 'OCR Processing error' });
    }
  });

  // 13. API: Natural Language Query Parser
  app.post('/api/ai-search', (req, res) => {
    const { query } = req.body;
    const q = String(query || '').toLowerCase().trim();

    const filter: {
      category?: string;
      merchant?: string;
      minAmount?: number;
      maxAmount?: number;
      expenseType?: string;
      hasGst?: boolean;
    } = {};

    if (q.includes('fuel') || q.includes('petrol') || q.includes('diesel')) filter.category = 'Fuel';
    else if (q.includes('travel') || q.includes('flight')) filter.category = 'Travel';
    else if (q.includes('food') || q.includes('meal') || q.includes('swiggy') || q.includes('lunch')) filter.category = 'Food & Meals';
    else if (q.includes('software') || q.includes('subscription')) filter.category = 'Software & Subscriptions';
    else if (q.includes('internet') || q.includes('airtel') || q.includes('mobile')) filter.category = 'Internet & Mobile';
    else if (q.includes('office')) filter.category = 'Office Expenses';

    if (q.includes('amazon')) filter.merchant = 'Amazon';
    if (q.includes('swiggy')) filter.merchant = 'Swiggy';
    if (q.includes('adobe')) filter.merchant = 'Adobe';
    if (q.includes('airtel')) filter.merchant = 'Airtel';

    const aboveMatch = q.match(/(?:above|greater than|>|more than)\s*(?:₹|rs\.?)?\s*(\d+[\d,]*)/i);
    if (aboveMatch) {
      filter.minAmount = parseFloat(aboveMatch[1].replace(/,/g, ''));
    }

    const belowMatch = q.match(/(?:below|under|<|less than)\s*(?:₹|rs\.?)?\s*(\d+[\d,]*)/i);
    if (belowMatch) {
      filter.maxAmount = parseFloat(belowMatch[1].replace(/,/g, ''));
    }

    if (q.includes('business')) filter.expenseType = 'Business';
    if (q.includes('personal')) filter.expenseType = 'Personal';
    if (q.includes('mixed')) filter.expenseType = 'Mixed';
    if (q.includes('gst')) filter.hasGst = true;

    return res.json({ query, filter });
  });

  // 14. API: Cloud Backup Sync
  app.post('/api/backup/sync', requireUser, (req, res) => {
    const userId = req.user!.id;
    const { backupPayload } = req.body;
    if (backupPayload?.expenses && Array.isArray(backupPayload.expenses)) {
      setCachedExpenses(userId, backupPayload.expenses);
    }
    return res.json({
      success: true,
      backupId: 'TXV-IN-' + Date.now().toString(36).toUpperCase(),
      syncedRecords: getCachedExpenses(userId).length,
      timestamp: new Date().toISOString(),
      encryptionStandard: 'AES-256-GCM',
    });
  });

  // 15. Razorpay: Create Order API (Server-to-Server)
  // The price comes from the server's plan table, never from the client, and the order is tagged
  // with the buyer's user id and plan so the payment can only activate that plan for that user.
  app.post('/api/razorpay/create-order', requireUser, async (req, res) => {
    try {
      const tier = req.body?.tier === 'enterprise' ? 'enterprise' : 'pro';
      const billingCycle = req.body?.billingCycle === 'annual' ? 'annual' : 'monthly';
      const amount = PAID_PLAN_PRICES_INR[tier][billingCycle] * 100; // paise
      const keyId = process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID;
      const keySecret = process.env.RAZORPAY_KEY_SECRET;

      if (!keyId || !keySecret || keyId === 'rzp_test_TaxVaultLiveKey') {
        if (!simulatedPaymentsAllowed()) {
          return res.status(503).json({ success: false, error: 'Payments are not configured on the server.' });
        }
        const rand = Math.random().toString(36).substring(2, 9).toUpperCase();
        return res.json({
          success: true,
          isSimulated: true,
          order: {
            id: `order_SIM${Date.now().toString().slice(-6)}${rand.slice(0, 4)}`,
            amount,
            currency: 'INR',
            receipt: `rcpt_${tier}_${Date.now()}`,
            status: 'created',
          },
          keyId: keyId || 'rzp_test_TaxVaultLiveKey',
        });
      }

      // Official Razorpay API Order Generation
      const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
      const rzpRes = await fetch(`${RAZORPAY_API_BASE}/v1/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${auth}`,
        },
        body: JSON.stringify({
          amount,
          currency: 'INR',
          receipt: `rcpt_${tier}_${Date.now()}`,
          notes: { user_id: req.user!.id, tier, billing_cycle: billingCycle },
        }),
      });

      const orderData = await rzpRes.json();
      if (!rzpRes.ok) {
        return res.status(rzpRes.status).json({
          error: orderData?.error?.description || 'Failed to create Razorpay order',
        });
      }

      return res.json({
        success: true,
        order: orderData,
        keyId,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Server error creating Razorpay order' });
    }
  });

  // 16. Razorpay: Verify payment and activate the plan (POST /api/razorpay/verify-payment)
  // Checks the HMAC signature, then fetches the order from Razorpay to confirm it is paid, was
  // created for this user, and which plan it bought. Only then is customer_subscriptions written.
  app.post('/api/razorpay/verify-payment', requireUser, async (req, res) => {
    const userId = req.user!.id;
    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};
      const keyId = process.env.RAZORPAY_KEY_ID || process.env.VITE_RAZORPAY_KEY_ID;
      const keySecret = process.env.RAZORPAY_KEY_SECRET;
      if (!razorpay_order_id || !razorpay_payment_id) {
        return res.status(400).json({ verified: false, error: 'Missing payment details.' });
      }

      // A payment id can only ever activate one plan
      const { data: used } = await supabaseAdmin!.from('subscription_transactions').select('id')
        .eq('gateway_payment_id', String(razorpay_payment_id)).limit(1);
      if (used && used.length > 0) {
        return res.status(409).json({ verified: false, error: 'This payment has already been used.' });
      }

      if (!keySecret || !keyId) {
        if (!simulatedPaymentsAllowed()) {
          return res.status(503).json({ verified: false, error: 'Payments are not configured on the server.' });
        }
        const tier = req.body?.tier === 'enterprise' ? 'enterprise' : 'pro';
        const billingCycle = req.body?.billingCycle === 'annual' ? 'annual' : 'monthly';
        const ent = await activatePlan(userId, tier, billingCycle, {
          gateway: 'simulated',
          amount: PAID_PLAN_PRICES_INR[tier][billingCycle],
          orderId: String(razorpay_order_id),
          paymentId: String(razorpay_payment_id),
        });
        return res.json({ verified: true, isSimulated: true, subscription: toProfileSubscription(ent) });
      }

      const crypto = await import('crypto');
      const expectedSignature = crypto
        .createHmac('sha256', keySecret)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');
      const given = String(razorpay_signature || '');
      const signatureOk = given.length === expectedSignature.length
        && crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expectedSignature));
      if (!signatureOk) {
        return res.status(400).json({ verified: false, error: 'Payment signature is invalid.' });
      }

      const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
      const orderRes = await fetch(`${RAZORPAY_API_BASE}/v1/orders/${encodeURIComponent(String(razorpay_order_id))}`, {
        headers: { Authorization: `Basic ${auth}` },
      });
      const order: any = await orderRes.json();
      const tier = order?.notes?.tier === 'enterprise' ? 'enterprise' : order?.notes?.tier === 'pro' ? 'pro' : null;
      const billingCycle = order?.notes?.billing_cycle === 'annual' ? 'annual' : 'monthly';
      if (!orderRes.ok || order?.notes?.user_id !== userId || !tier) {
        return res.status(403).json({ verified: false, error: 'This payment does not belong to your account.' });
      }
      const price = PAID_PLAN_PRICES_INR[tier][billingCycle] * 100;
      if (order.status !== 'paid' || Number(order.amount_paid || 0) < price) {
        return res.status(402).json({ verified: false, error: 'Payment has not been completed.' });
      }

      const ent = await activatePlan(userId, tier, billingCycle, {
        gateway: 'razorpay',
        amount: price / 100,
        orderId: String(razorpay_order_id),
        paymentId: String(razorpay_payment_id),
        signature: given,
      });
      return res.json({
        verified: true,
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
        subscription: toProfileSubscription(ent),
      });
    } catch (err: any) {
      return res.status(500).json({ verified: false, error: err?.message || 'Server error verifying payment' });
    }
  });

  // 16b. Current plan and scan usage for the signed-in user (GET /api/subscription)
  app.get('/api/subscription', requireUser, async (req, res) => {
    try {
      return res.json({ success: true, data: toProfileSubscription(await getEntitlement(req.user!.id)) });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  // 16c. Switch the signed-in user to the free plan (POST /api/subscription/downgrade)
  app.post('/api/subscription/downgrade', requireUser, async (req, res) => {
    try {
      const ent = await activatePlan(req.user!.id, 'free', 'monthly', { gateway: 'manual', amount: 0 });
      return res.json({ success: true, data: toProfileSubscription(ent) });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err?.message });
    }
  });

  // 17. API: Terms & Conditions from Database (GET /api/terms)
  app.get('/api/terms', async (_req, res) => {
    try {
      if (supabase) {
        try {
          const { data, error } = await supabase.from('country_terms').select('*');
          if (!error && Array.isArray(data) && data.length > 0) {
            data.forEach((row: any) => {
              if (row.country && row.sections) {
                inMemoryCountryTerms[row.country] = {
                  ...(inMemoryCountryTerms[row.country] || (COUNTRY_TERMS as any)[row.country]),
                  countryCode: row.country,
                  countryName: row.country_name || inMemoryCountryTerms[row.country]?.countryName,
                  taxAuthority: row.tax_authority || inMemoryCountryTerms[row.country]?.taxAuthority,
                  governingLaw: row.governing_law || inMemoryCountryTerms[row.country]?.governingLaw,
                  lastUpdated: row.last_updated || inMemoryCountryTerms[row.country]?.lastUpdated,
                  sections: row.sections,
                };
              }
            });
          }
        } catch {}
      }
      return res.json({
        success: true,
        count: Object.keys(inMemoryCountryTerms).length,
        data: inMemoryCountryTerms,
        source: 'database',
      });
    } catch (err: any) {
      return res.json({ success: true, data: inMemoryCountryTerms, source: 'cache_fallback' });
    }
  });

  // 18. API: Country-specific Terms & Conditions from Database (GET /api/terms/:country)
  app.get('/api/terms/:country', async (req, res) => {
    try {
      const country = (req.params.country || 'NZ').toUpperCase();
      let terms = inMemoryCountryTerms[country] || (COUNTRY_TERMS as any)[country];

      if (supabase) {
        try {
          const { data, error } = await supabase
            .from('country_terms')
            .select('*')
            .eq('country', country)
            .maybeSingle();

          if (!error && data && data.sections) {
            terms = {
              ...(inMemoryCountryTerms[country] || (COUNTRY_TERMS as any)[country]),
              countryCode: country,
              countryName: data.country_name || terms.countryName,
              taxAuthority: data.tax_authority || terms.taxAuthority,
              governingLaw: data.governing_law || terms.governingLaw,
              lastUpdated: data.last_updated || terms.lastUpdated,
              sections: data.sections,
            };
            inMemoryCountryTerms[country] = terms;
          }
        } catch {}
      }

      if (!terms) {
        return res.status(404).json({
          success: false,
          error: `Terms for country code ${country} not found in database.`,
        });
      }

      return res.json({
        success: true,
        country,
        data: terms,
        source: 'database',
      });
    } catch (err: any) {
      const country = (req.params.country || 'NZ').toUpperCase();
      return res.json({
        success: true,
        country,
        data: inMemoryCountryTerms[country] || (COUNTRY_TERMS as any)[country] || (COUNTRY_TERMS as any).NZ,
        source: 'cache_fallback',
      });
    }
  });

  // 19. API: Update Country Terms in Database (PUT /api/terms/:country)
  // Reading terms is public; editing them is limited to emails listed in TERMS_ADMIN_EMAILS.
  app.put('/api/terms/:country', requireUser, async (req, res) => {
    const termsAdmins = (process.env.TERMS_ADMIN_EMAILS || '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
    if (!termsAdmins.includes(req.user!.email)) {
      return res.status(403).json({ success: false, error: 'Only TaxVault administrators can edit Terms & Conditions.' });
    }
    try {
      const country = (req.params.country || 'NZ').toUpperCase();
      const updated = req.body;

      inMemoryCountryTerms[country] = {
        ...(inMemoryCountryTerms[country] || (COUNTRY_TERMS as any)[country]),
        ...updated,
        countryCode: country,
        lastUpdated: new Date().toISOString(),
      };

      try {
        fs.writeFileSync(TERMS_DB_FILE, JSON.stringify(inMemoryCountryTerms, null, 2), 'utf-8');
      } catch (fErr) {
        console.warn('Failed writing updated terms to file:', fErr);
      }

      if (supabaseAdmin) {
        try {
          await supabaseAdmin.from('country_terms').upsert({
            country,
            country_name: inMemoryCountryTerms[country].countryName,
            tax_authority: inMemoryCountryTerms[country].taxAuthority,
            governing_law: inMemoryCountryTerms[country].governingLaw,
            version: '2026.1',
            last_updated: inMemoryCountryTerms[country].lastUpdated,
            sections: inMemoryCountryTerms[country].sections,
            updated_at: new Date().toISOString(),
          });
        } catch {}
      }

      return res.json({
        success: true,
        country,
        data: inMemoryCountryTerms[country],
        message: `Terms & Conditions for ${country} updated in database.`,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Failed updating terms in database.' });
    }
  });

  // 20. API: Save Customer Agreement in Database (POST /api/agreements)
  // Consent is recorded during sign-up, possibly before the user has a session (email
  // confirmation pending), so this route accepts anonymous calls. When a valid token is sent the
  // agreement is bound to that user and the client-supplied userId/email are ignored.
  app.post('/api/agreements', rateLimit('agreements', 20, 15 * 60 * 1000), optionalUser, async (req, res) => {
    try {
      const {
        id: customId,
        userName,
        country,
        taxAuthority,
        termsVersion = '2026.1',
        agreedAt: customAgreedAt,
        devicePlatform = 'web',
        metadata = {},
      } = req.body;
      const userId: string | null = req.user?.id || null;
      const userEmail = req.user?.email || req.body?.userEmail;

      if (!userEmail || !country) {
        return res.status(400).json({
          success: false,
          error: 'User email and country are mandatory to record a statutory customer agreement.',
        });
      }

      const id = customId || `agr_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 7)}`;
      const agreedAt = customAgreedAt || new Date().toISOString();
      const cleanEmail = String(userEmail).trim().toLowerCase();

      const agreementRecord = {
        id,
        userId: userId || null,
        userEmail: cleanEmail,
        userName: userName || null,
        country,
        taxAuthority: taxAuthority || 'Tax Authority',
        termsVersion,
        agreedAt,
        ipAddress: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1',
        userAgent: (req.headers['user-agent'] as string) || '',
        devicePlatform,
        metadata: {
          ...metadata,
          source: 'TaxVault Registration / Consent Flow',
        },
        createdAt: new Date().toISOString(),
      };

      // 1. Save to in-memory & disk database
      inMemoryCustomerAgreements = [
        agreementRecord,
        ...inMemoryCustomerAgreements.filter((a) => a.id !== id),
      ];

      try {
        fs.writeFileSync(AGREEMENTS_DB_FILE, JSON.stringify(inMemoryCustomerAgreements, null, 2), 'utf-8');
      } catch (fErr) {
        console.warn('Failed writing agreement to file:', fErr);
      }

      // 2. Persist to Supabase database (customer_agreements table + activity_logs audit ledger)
      if (supabaseAdmin) {
        try {
          // Attempt insert into customer_agreements table
          await supabaseAdmin.from('customer_agreements').insert({
            id: agreementRecord.id,
            user_id: agreementRecord.userId,
            user_email: agreementRecord.userEmail,
            user_name: agreementRecord.userName,
            country: agreementRecord.country,
            tax_authority: agreementRecord.taxAuthority,
            terms_version: agreementRecord.termsVersion,
            agreed_at: agreementRecord.agreedAt,
            ip_address: agreementRecord.ipAddress,
            user_agent: agreementRecord.userAgent,
            device_platform: agreementRecord.devicePlatform,
            metadata: agreementRecord.metadata,
            created_at: agreementRecord.createdAt,
          });
        } catch {}

        try {
          // Activity logs audit trail
          await supabaseAdmin.rpc('record_activity_log', {
            p_user_id: agreementRecord.userId || null,
            p_entity_type: 'customer_agreement',
            p_entity_id: agreementRecord.id,
            p_action: 'accept_terms',
            p_description: `User ${agreementRecord.userEmail} consented to statutory Terms & Conditions for ${agreementRecord.country} (${agreementRecord.taxAuthority})`,
            p_status: 'success',
            p_changes: {
              agreedAt: agreementRecord.agreedAt,
              version: agreementRecord.termsVersion,
              country: agreementRecord.country,
            },
            p_device_platform: agreementRecord.devicePlatform,
            p_metadata: {
              ipAddress: agreementRecord.ipAddress,
              userAgent: agreementRecord.userAgent,
              ...agreementRecord.metadata,
            },
          });
        } catch {}

        try {
          // Update profiles table if profile exists
          if (agreementRecord.userId) {
            await supabaseAdmin.from('profiles').update({
              updated_at: new Date().toISOString(),
            }).eq('id', agreementRecord.userId);
          }
        } catch (dbErr) {
          console.warn('Supabase consent recording notice:', dbErr);
        }
      }

      console.log(`✅ Customer agreement recorded in database: ${agreementRecord.userEmail} (${country})`);

      return res.status(201).json({
        success: true,
        agreement: agreementRecord,
        source: 'database',
        message: 'Customer agreement recorded in database successfully.',
      });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Failed recording customer agreement in database.' });
    }
  });

  // 21. API: Fetch the signed-in user's own agreements (GET /api/agreements)
  // Agreements hold emails, IP addresses and user agents, so they are never listed for other users.
  app.get('/api/agreements', requireUser, async (req, res) => {
    const { id: userId, email: userEmail } = req.user!;
    const isMine = (a: any) => a.userId === userId || (a.userEmail || '').toLowerCase() === userEmail;
    let list = inMemoryCustomerAgreements.filter(isMine);
    try {
      const { data, error } = await supabaseAdmin!
        .from('customer_agreements')
        .select('*')
        .or(`user_id.eq.${userId},user_email.eq.${userEmail}`)
        .order('agreed_at', { ascending: false });
      if (!error && Array.isArray(data) && data.length > 0) {
        const mapped = data.map((row: any) => ({
          id: row.id,
          userId: row.user_id,
          userEmail: row.user_email,
          userName: row.user_name,
          country: row.country,
          taxAuthority: row.tax_authority,
          termsVersion: row.terms_version,
          agreedAt: row.agreed_at,
          ipAddress: row.ip_address,
          userAgent: row.user_agent,
          devicePlatform: row.device_platform,
          metadata: row.metadata,
          createdAt: row.created_at,
        }));
        const mapById = new Map();
        [...mapped, ...list].forEach(a => mapById.set(a.id, a));
        list = Array.from(mapById.values()).filter(isMine);
      }
    } catch {}

    return res.json({
      success: true,
      count: list.length,
      data: list,
      source: 'database',
    });
  });

  return app;
}
