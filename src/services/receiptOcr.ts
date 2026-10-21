import {
  ExpenseCategory,
  ExpenseType,
  FieldConfidence,
  GSTTreatment,
  PaymentMethod,
  ReceiptItem,
  SupportedCountry,
} from '../types';
import { CATEGORY_MAP, validateCalculation, formatCurrency } from './taxRules';
import { usageTrackingService } from './usageTrackingService';
import { activityLogService } from './activityLogService';
import { authedFetch } from './apiBase';

export interface ExtractedReceiptData {
  merchant: string;
  invoiceNumber: string;
  receiptNumber: string;
  date: string;
  time: string;
  vendorAddress: string;
  vendorPhone: string;
  
  // Multi-country identifiers
  country?: SupportedCountry;
  currency?: string;
  currencySymbol?: string;
  vendorTaxId?: string;
  customerTaxId?: string;
  vendorGSTIN: string; // Alias
  customerGSTIN: string; // Alias
  state: string;
  paymentMethod: PaymentMethod;

  subtotal: number;
  discount: number;
  taxableAmount: number;
  taxType?: string;
  taxRate?: number;
  taxAmount?: number;
  
  // Specific country breakdown
  gstAmount?: number;
  pstAmount?: number;
  hstAmount?: number;
  salesTaxAmount?: number;
  cgst: number;
  sgst: number;
  igst: number;
  cess: number;
  roundOff: number;
  totalAmount: number;

  category: ExpenseCategory;
  expenseType: ExpenseType;
  businessPercentage: number;
  claimableBusinessAmount: number;

  items: ReceiptItem[];
  confidenceScores: FieldConfidence;
  gstTreatment: GSTTreatment;
  calculationMismatch: boolean;
  mismatchReason?: string;
  originalImage?: string;
  receiptFileName?: string;
  ocrStatus?: string;
  ocrMessage?: string;
  isManualEntry?: boolean;
}

export interface SampleReceipt {
  id: string;
  name: string;
  tag: string;
  amountFormatted: string;
  image: string;
  extracted: ExtractedReceiptData;
}

// 1. New Zealand Samples (IRD 15% GST)
export const SAMPLE_NZ_RECEIPTS: SampleReceipt[] = [
  {
    id: 'sample-nz-bunnings',
    name: 'Bunnings Trade Mt Wellington',
    tag: 'Tools & Hardware · 15% GST',
    amountFormatted: '$245.50',
    image: 'https://images.unsplash.com/photo-1581244277943-fe4a9c777189?auto=format&fit=crop&w=800&q=80',
    extracted: {
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
      totalAmount: 245.50,
      category: 'Equipment',
      expenseType: 'Business',
      businessPercentage: 100,
      claimableBusinessAmount: 245.50,
      items: [
        { name: 'Makita 18V Cordless Drill Driver Kit', quantity: 1, unitPrice: 195.50, total: 195.50 },
        { name: 'Stanley Heavy Duty Tool Box 19"', quantity: 1, unitPrice: 50.00, total: 50.00 },
      ],
      confidenceScores: { merchant: 98, date: 99, total: 99, taxId: 96, category: 97, tax: 98 },
      gstTreatment: 'Likely eligible',
      calculationMismatch: false,
    },
  },
  {
    id: 'sample-nz-airnz',
    name: 'Air New Zealand (AKL-WLG)',
    tag: 'Travel · Business Domestic',
    amountFormatted: '$345.00',
    image: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=800&q=80',
    extracted: {
      merchant: 'Air New Zealand Limited',
      invoiceNumber: 'NZ-PNR-77W2B',
      receiptNumber: 'ETKT-0862910',
      date: '2026-10-04',
      time: '07:30',
      vendorAddress: '185 Fanshawe Street, Auckland Central, Auckland 1010',
      vendorPhone: '+64 9 336 2400',
      country: 'NZ',
      currency: 'NZD',
      currencySymbol: '$',
      vendorTaxId: '010-221-509',
      customerTaxId: '123-456-789',
      vendorGSTIN: '010-221-509',
      customerGSTIN: '123-456-789',
      state: 'Auckland to Wellington',
      paymentMethod: 'Credit Card',
      subtotal: 300.00,
      discount: 0,
      taxableAmount: 300.00,
      taxType: 'GST',
      taxRate: 15,
      taxAmount: 45.00,
      gstAmount: 45.00,
      cgst: 0,
      sgst: 0,
      igst: 0,
      cess: 0,
      roundOff: 0,
      totalAmount: 345.00,
      category: 'Travel',
      expenseType: 'Business',
      businessPercentage: 100,
      claimableBusinessAmount: 345.00,
      items: [
        { name: 'Domestic Air Transport (NZ421 AKL-WLG)', quantity: 1, unitPrice: 345.00, total: 345.00 },
      ],
      confidenceScores: { merchant: 99, date: 99, total: 99, taxId: 98, category: 99, tax: 98 },
      gstTreatment: 'Likely eligible',
      calculationMismatch: false,
    },
  },
  {
    id: 'sample-nz-spark',
    name: 'Spark New Zealand Business Fiber',
    tag: 'Internet & Mobile · Monthly',
    amountFormatted: '$129.99',
    image: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=800&q=80',
    extracted: {
      merchant: 'Spark New Zealand Trading Limited',
      invoiceNumber: 'SPK-INV-99381',
      receiptNumber: 'SPK-BILL-OCT26',
      date: '2026-10-01',
      time: '09:00',
      vendorAddress: 'Spark City, 167 Victoria Street West, Auckland 1010',
      vendorPhone: '+64 9 359 8000',
      country: 'NZ',
      currency: 'NZD',
      currencySymbol: '$',
      vendorTaxId: '044-889-102',
      customerTaxId: '123-456-789',
      vendorGSTIN: '044-889-102',
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
      totalAmount: 129.99,
      category: 'Internet & Mobile',
      expenseType: 'Business',
      businessPercentage: 100,
      claimableBusinessAmount: 129.99,
      items: [
        { name: 'Business Max Fibre Unlimited 500Mbps', quantity: 1, unitPrice: 129.99, total: 129.99 },
      ],
      confidenceScores: { merchant: 98, date: 99, total: 99, taxId: 95, category: 98, tax: 97 },
      gstTreatment: 'Likely eligible',
      calculationMismatch: false,
    },
  },
];

// 2. Australia Samples (ATO 10% GST)
export const SAMPLE_AU_RECEIPTS: SampleReceipt[] = [
  {
    id: 'sample-au-bunnings',
    name: 'Bunnings Warehouse Melbourne',
    tag: 'Equipment · 10% GST',
    amountFormatted: '$185.00',
    image: 'https://images.unsplash.com/photo-1581244277943-fe4a9c777189?auto=format&fit=crop&w=800&q=80',
    extracted: {
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
      vendorTaxId: '26 008 672 179', // ABN
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
      totalAmount: 185.00,
      category: 'Equipment',
      expenseType: 'Business',
      businessPercentage: 100,
      claimableBusinessAmount: 185.00,
      items: [
        { name: 'Bosch Laser Distance Measurer 40m', quantity: 1, unitPrice: 185.00, total: 185.00 },
      ],
      confidenceScores: { merchant: 98, date: 99, total: 99, taxId: 98, category: 96, tax: 98 },
      gstTreatment: 'Likely eligible',
      calculationMismatch: false,
    },
  },
  {
    id: 'sample-au-qantas',
    name: 'Qantas Airways (SYD-MEL)',
    tag: 'Travel · Business Domestic',
    amountFormatted: '$395.00',
    image: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=800&q=80',
    extracted: {
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
      vendorTaxId: '16 009 661 901', // ABN
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
      totalAmount: 395.00,
      category: 'Travel',
      expenseType: 'Business',
      businessPercentage: 100,
      claimableBusinessAmount: 395.00,
      items: [
        { name: 'Economy Domestic Airfare (QF415 SYD-MEL)', quantity: 1, unitPrice: 395.00, total: 395.00 },
      ],
      confidenceScores: { merchant: 99, date: 99, total: 99, taxId: 99, category: 99, tax: 98 },
      gstTreatment: 'Likely eligible',
      calculationMismatch: false,
    },
  },
];

// 3. Canada Samples (CRA GST/HST)
export const SAMPLE_CA_RECEIPTS: SampleReceipt[] = [
  {
    id: 'sample-ca-canadiantire',
    name: 'Canadian Tire Toronto',
    tag: 'Supplies · 13% Ontario HST',
    amountFormatted: '$142.50',
    image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=800&q=80',
    extracted: {
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
      vendorTaxId: '100829102 RT0001', // CRA BN
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
      totalAmount: 142.50,
      category: 'Office Supplies',
      expenseType: 'Business',
      businessPercentage: 100,
      claimableBusinessAmount: 142.50,
      items: [
        { name: 'Office Storage Cabinet & Organizers', quantity: 1, unitPrice: 142.50, total: 142.50 },
      ],
      confidenceScores: { merchant: 98, date: 99, total: 99, taxId: 96, category: 97, tax: 98 },
      gstTreatment: 'Likely eligible',
      calculationMismatch: false,
    },
  },
  {
    id: 'sample-ca-timhortons',
    name: 'Tim Hortons Coffee Meeting',
    tag: 'Meals · 50% Deductible CRA',
    amountFormatted: '$34.80',
    image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80',
    extracted: {
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
      totalAmount: 34.80,
      category: 'Food & Meals',
      expenseType: 'Mixed',
      businessPercentage: 50,
      claimableBusinessAmount: 17.40,
      items: [
        { name: 'Breakfast Coffee & Sandwiches (Client Meeting)', quantity: 1, unitPrice: 34.80, total: 34.80 },
      ],
      confidenceScores: { merchant: 97, date: 99, total: 99, taxId: 92, category: 96, tax: 95 },
      gstTreatment: 'Needs review',
      calculationMismatch: false,
    },
  },
];

// 4. United States Samples (IRS Schedule C & Sales Tax)
export const SAMPLE_US_RECEIPTS: SampleReceipt[] = [
  {
    id: 'sample-us-homedepot',
    name: 'Home Depot San Jose',
    tag: 'Supplies · 9.375% Sales Tax',
    amountFormatted: '$215.00',
    image: 'https://images.unsplash.com/photo-1581244277943-fe4a9c777189?auto=format&fit=crop&w=800&q=80',
    extracted: {
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
      vendorTaxId: '58-1853368', // EIN
      customerTaxId: '12-3456789',
      vendorGSTIN: '58-1853368',
      customerGSTIN: '12-3456789',
      state: 'California',
      paymentMethod: 'Credit Card',
      subtotal: 196.57,
      discount: 0,
      taxableAmount: 196.57,
      taxType: 'Sales Tax',
      taxRate: 9.375,
      taxAmount: 18.43,
      salesTaxAmount: 18.43,
      cgst: 0,
      sgst: 0,
      igst: 0,
      cess: 0,
      roundOff: 0,
      totalAmount: 215.00,
      category: 'Equipment',
      expenseType: 'Business',
      businessPercentage: 100,
      claimableBusinessAmount: 215.00,
      items: [
        { name: 'Dewalt 20V Max Cordless Tool Combo Kit', quantity: 1, unitPrice: 215.00, total: 215.00 },
      ],
      confidenceScores: { merchant: 99, date: 99, total: 99, taxId: 98, category: 97, tax: 98 },
      gstTreatment: 'Likely eligible',
      calculationMismatch: false,
    },
  },
  {
    id: 'sample-us-starbucks',
    name: 'Starbucks Coffee NYC',
    tag: 'Meals · 50% IRS Deduction',
    amountFormatted: '$28.50',
    image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80',
    extracted: {
      merchant: 'Starbucks Corporation',
      invoiceNumber: 'SBUX-NYC-4402',
      receiptNumber: 'REC-SBUX-119',
      date: '2026-10-05',
      time: '09:20',
      vendorAddress: '1500 Broadway, New York, NY 10036',
      vendorPhone: '+1 212 921 5400',
      country: 'US',
      currency: 'USD',
      currencySymbol: '$',
      vendorTaxId: '91-1325671',
      customerTaxId: '12-3456789',
      vendorGSTIN: '91-1325671',
      customerGSTIN: '12-3456789',
      state: 'New York',
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
      totalAmount: 28.50,
      category: 'Food & Meals',
      expenseType: 'Mixed',
      businessPercentage: 50,
      claimableBusinessAmount: 14.25,
      items: [
        { name: 'Clover Cold Brews & Pastries (Business Sync)', quantity: 1, unitPrice: 28.50, total: 28.50 },
      ],
      confidenceScores: { merchant: 98, date: 99, total: 99, taxId: 95, category: 98, tax: 96 },
      gstTreatment: 'Needs review',
      calculationMismatch: false,
    },
  },
];

// 5. India Samples (GST 18% / 12% / 5%)
export const SAMPLE_INDIAN_RECEIPTS: SampleReceipt[] = [
  {
    id: 'sample-amazon',
    name: 'Amazon India (Office Chair)',
    tag: 'Office Supplies · GST 18%',
    amountFormatted: '₹10,620.00',
    image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=800&q=80',
    extracted: {
      merchant: 'Amazon Seller Services India',
      invoiceNumber: 'INV-DEL-89210',
      receiptNumber: 'REC-AZN-2026-99',
      date: '2026-10-05',
      time: '14:25',
      vendorAddress: 'Brigade Gateway, Bengaluru, Karnataka 560055',
      vendorPhone: '+91 80 4123 4567',
      country: 'IN',
      currency: 'INR',
      currencySymbol: '₹',
      vendorTaxId: '29AABCS1429B1ZB',
      customerTaxId: '27AABCU9603R1ZM',
      vendorGSTIN: '29AABCS1429B1ZB',
      customerGSTIN: '27AABCU9603R1ZM',
      state: 'Karnataka (29)',
      paymentMethod: 'Credit Card',
      subtotal: 9000,
      discount: 0,
      taxableAmount: 9000,
      taxType: 'CGST+SGST',
      taxRate: 18,
      taxAmount: 1620,
      cgst: 810,
      sgst: 810,
      igst: 0,
      cess: 0,
      roundOff: 0,
      totalAmount: 10620,
      category: 'Office Expenses',
      expenseType: 'Business',
      businessPercentage: 100,
      claimableBusinessAmount: 10620,
      items: [
        { name: 'Ergonomic Office Chair', quantity: 1, unitPrice: 8500, total: 8500 },
        { name: 'Delivery Charges', quantity: 1, unitPrice: 500, total: 500 },
      ],
      confidenceScores: { merchant: 98, date: 99, total: 99, gstin: 94, category: 96, tax: 97 },
      gstTreatment: 'Likely eligible',
      calculationMismatch: false,
    },
  },
  {
    id: 'sample-hpcl',
    name: 'HPCL Auto Fuel Pump',
    tag: 'Fuel · Mixed 75%',
    amountFormatted: '₹4,500.00',
    image: 'https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&w=800&q=80',
    extracted: {
      merchant: 'Hindustan Petroleum Corp Ltd (Bandra)',
      invoiceNumber: 'HP-F-8812',
      receiptNumber: 'HP-TXN-00341',
      date: '2026-10-04',
      time: '09:42',
      vendorAddress: 'Bandra Reclamation, Mumbai 400050',
      vendorPhone: '+91 22 2642 1109',
      country: 'IN',
      currency: 'INR',
      currencySymbol: '₹',
      vendorTaxId: '27AAACH1118E1ZE',
      customerTaxId: '',
      vendorGSTIN: '27AAACH1118E1ZE',
      customerGSTIN: '',
      state: 'Maharashtra (27)',
      paymentMethod: 'UPI',
      subtotal: 4500,
      discount: 0,
      taxableAmount: 4500,
      taxType: 'Exempt',
      taxRate: 0,
      taxAmount: 0,
      cgst: 0,
      sgst: 0,
      igst: 0,
      cess: 0,
      roundOff: 0,
      totalAmount: 4500,
      category: 'Fuel',
      expenseType: 'Mixed',
      businessPercentage: 75,
      claimableBusinessAmount: 3375,
      items: [
        { name: 'Power Petrol Unleaded 43.10 Ltr @ ₹104.40', quantity: 43.1, unitPrice: 104.4, total: 4500 },
      ],
      confidenceScores: { merchant: 99, date: 97, total: 99, gstin: 72, category: 98, tax: 90 },
      gstTreatment: 'Needs review',
      calculationMismatch: false,
    },
  },
];

export const SAMPLE_RECEIPTS_BY_COUNTRY: Record<SupportedCountry, SampleReceipt[]> = {
  NZ: SAMPLE_NZ_RECEIPTS,
  AU: SAMPLE_AU_RECEIPTS,
  CA: SAMPLE_CA_RECEIPTS,
  US: SAMPLE_US_RECEIPTS,
  IN: SAMPLE_INDIAN_RECEIPTS,
};

export function getSampleReceiptsForCountry(country: SupportedCountry = 'NZ'): SampleReceipt[] {
  return SAMPLE_RECEIPTS_BY_COUNTRY[country] || SAMPLE_NZ_RECEIPTS;
}

export function classifyExpenseCategory(text: string): ExpenseCategory {
  const lower = text.toLowerCase();

  if (lower.includes('petrol') || lower.includes('diesel') || lower.includes('fuel') || lower.includes('gas') || lower.includes('oil')) {
    return 'Fuel';
  }
  if (lower.includes('airline') || lower.includes('flight') || lower.includes('air nz') || lower.includes('qantas') || lower.includes('indigo') || lower.includes('delta')) {
    return 'Travel';
  }
  if (lower.includes('hotel') || lower.includes('motel') || lower.includes('marriott') || lower.includes('hilton') || lower.includes('airbnb')) {
    return 'Hotel & Accommodation';
  }
  if (lower.includes('coffee') || lower.includes('cafe') || lower.includes('starbucks') || lower.includes('tim hortons') || lower.includes('restaurant') || lower.includes('swiggy') || lower.includes('lunch') || lower.includes('dinner')) {
    return 'Food & Meals';
  }
  if (lower.includes('broadband') || lower.includes('internet') || lower.includes('fiber') || lower.includes('spark') || lower.includes('telstra') || lower.includes('rogers') || lower.includes('verizon') || lower.includes('airtel')) {
    return 'Internet & Mobile';
  }
  if (lower.includes('software') || lower.includes('adobe') || lower.includes('aws') || lower.includes('google cloud') || lower.includes('microsoft') || lower.includes('saas') || lower.includes('subscription')) {
    return 'Software & Subscriptions';
  }
  if (lower.includes('tools') || lower.includes('hardware') || lower.includes('bunnings') || lower.includes('home depot') || lower.includes('canadian tire') || lower.includes('laptop') || lower.includes('monitor') || lower.includes('croma')) {
    return 'Equipment';
  }
  if (lower.includes('stationery') || lower.includes('paper') || lower.includes('officeworks') || lower.includes('warehouse stationery') || lower.includes('staples')) {
    return 'Office Supplies';
  }
  if (lower.includes('rent') || lower.includes('wework') || lower.includes('lease') || lower.includes('coworking')) {
    return 'Rent';
  }
  if (lower.includes('legal') || lower.includes('accounting') || lower.includes('audit') || lower.includes('lawyer') || lower.includes('consultant')) {
    return 'Professional Services';
  }

  return 'Office Expenses';
}

/**
 * Universal OCR & AI Processing Pipeline:
 * Dispatches to Gemini 2.5 Flash / server endpoint with country context,
 * and uses resilient country-specific heuristic fallbacks.
 */
// Gemini AI Key Helpers for Client-Side OCR
// The shared TaxVault Gemini key lives only on the server (GEMINI_API_KEY) and is used via
// POST /api/receipt-ocr. This returns only a personal key the user saved on their own device.
export function getGeminiApiKey(): string | null {
  try {
    const local = localStorage.getItem('taxvault_gemini_api_key');
    if (local && local.trim() && local !== 'MY_GEMINI_API_KEY') return local.trim();
  } catch {}

  return null;
}

export function setGeminiApiKey(key: string): void {
  try {
    if (key && key.trim()) {
      localStorage.setItem('taxvault_gemini_api_key', key.trim());
    } else {
      localStorage.removeItem('taxvault_gemini_api_key');
    }
  } catch {}
}

/**
 * Fast client-side image compression & downscaling:
 * Reduces 10-25MB camera captures to crisp ~150-250KB JPEG for sub-second uploads.
 */
export async function optimizeReceiptImage(dataUrl: string, maxDim = 1280, quality = 0.82): Promise<string> {
  if (!dataUrl || !dataUrl.startsWith('data:image')) return dataUrl;
  if (typeof Image === 'undefined' || typeof document === 'undefined') return dataUrl;

  return new Promise((resolve) => {
    // 2.5s safety timeout so mobile canvas decoding can never hang
    const timer = setTimeout(() => resolve(dataUrl), 2500);

    const img = new Image();
    img.onload = () => {
      clearTimeout(timer);
      try {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL('image/jpeg', quality);
        resolve(compressed);
      } catch {
        resolve(dataUrl);
      }
    };
    img.onerror = () => {
      clearTimeout(timer);
      resolve(dataUrl);
    };
    img.src = dataUrl;
  });
}

/**
 * Direct Gemini Multimodal Vision Client Call:
 * Sends image or PDF document directly to Google Generative Language API without needing local server.
 * Uses fastest responsive models (gemini-3.5-flash-lite, gemini-3.1-flash-lite, gemini-3.5-flash).
 */
export async function callGeminiVision(
  imageDataUrl: string,
  country: SupportedCountry = 'NZ',
  customerTaxId: string = '',
  apiKeyOverride?: string
): Promise<ExtractedReceiptData | null> {
  const apiKey = apiKeyOverride || getGeminiApiKey();
  if (!apiKey) return null;

  try {
    const isPdf =
      imageDataUrl.startsWith('data:application/pdf') ||
      imageDataUrl.startsWith('JVBERi');

    // 1. Optimize images (compress to ~150KB for fast transfer); pass PDFs through directly
    const optimizedImage = isPdf
      ? imageDataUrl
      : await optimizeReceiptImage(imageDataUrl, 1280, 0.82);

    let mimeType = 'image/jpeg';
    if (isPdf) {
      mimeType = 'application/pdf';
    } else if (optimizedImage.startsWith('data:image/png') || optimizedImage.startsWith('iVBOR')) {
      mimeType = 'image/png';
    } else if (optimizedImage.startsWith('data:image/webp')) {
      mimeType = 'image/webp';
    } else if (optimizedImage.startsWith('data:image/gif')) {
      mimeType = 'image/gif';
    }

    const pureBase64 = optimizedImage.includes('base64,')
      ? optimizedImage.split('base64,')[1]
      : optimizedImage;

    const currencyMap: Record<string, { code: string; symbol: string; taxRate: number; taxName: string }> = {
      NZ: { code: 'NZD', symbol: '$', taxRate: 15, taxName: 'New Zealand GST (15%)' },
      AU: { code: 'AUD', symbol: '$', taxRate: 10, taxName: 'Australia GST (10%)' },
      CA: { code: 'CAD', symbol: '$', taxRate: 13, taxName: 'Canada GST/HST/PST' },
      UK: { code: 'GBP', symbol: '£', taxRate: 20, taxName: 'UK VAT (20%)' },
      US: { code: 'USD', symbol: '$', taxRate: 8.875, taxName: 'US State & Local Sales Tax' },
      IN: { code: 'INR', symbol: '₹', taxRate: 18, taxName: 'Indian GST (CGST/SGST/IGST)' },
    };
    const cInfo = currencyMap[country] || currencyMap['NZ'];

    const prompt = `You are an expert automated receipt, invoice, bill, and document OCR reader for ${country} tax compliance (${cInfo.taxName}, currency ${cInfo.code} ${cInfo.symbol}).
Analyze this document, receipt, or invoice photo/PDF very carefully and extract all transaction details.

Instructions:
1. "merchant": The business, supplier, vendor, store, institution, utility provider, or issuer name (e.g. Bunnings, Shell, Countdown, AWS, Vodafone, Spark, Genesis Energy, etc.). If no store name, use the prominent document header or company name. If still unclear, use "Tax Invoice / Vendor". DO NOT return empty string if any company/issuer is visible.
2. "date": The transaction or invoice date formatted strictly as YYYY-MM-DD. If year is missing, assume 2026.
3. "time": Transaction time formatted as HH:MM if visible, else "12:00".
4. "invoiceNumber": The invoice number, receipt number, docket number, or tax invoice #.
5. "vendorTaxId": The business tax registration number (GST #, IRD #, ABN, GSTIN, EIN, VAT).
6. "subtotal": Pre-tax / taxable amount as a number.
7. "taxAmount": Total tax / GST / VAT / HST / Sales Tax amount as a number.
8. "totalAmount": Final grand total paid or balance due as a positive number.
9. "category": Choose the best matching category from: Office Expenses, Fuel, Travel, Food & Meals, Utilities, Technology & Software, Advertising & Marketing, Professional Fees, Vehicle Expenses, Equipment & Hardware, Subscriptions, Insurance, or Miscellaneous.
10. "expenseType": "Business", "Mixed", or "Personal".
11. "items": Array of purchased items [{ "name": "Item description", "quantity": 1, "unitPrice": 0.00, "total": 0.00 }].

Return ONLY a valid JSON object matching this structure:
{
  "merchant": "Store or Vendor Name",
  "invoiceNumber": "INV-1234",
  "receiptNumber": "REC-1234",
  "date": "YYYY-MM-DD",
  "time": "HH:MM",
  "vendorAddress": "Address if visible",
  "vendorPhone": "Phone if visible",
  "vendorTaxId": "Tax / GST number",
  "vendorGSTIN": "Same as vendorTaxId",
  "customerGSTIN": "${customerTaxId}",
  "state": "City or State",
  "paymentMethod": "Credit Card, Debit Card, Cash, EFTPOS, UPI, or Bank Transfer",
  "subtotal": 0.00,
  "discount": 0.00,
  "taxableAmount": 0.00,
  "taxAmount": 0.00,
  "gstAmount": 0.00,
  "cgst": 0.00,
  "sgst": 0.00,
  "igst": 0.00,
  "roundOff": 0.00,
  "totalAmount": 0.00,
  "category": "Office Expenses",
  "expenseType": "Business",
  "businessPercentage": 100,
  "items": [],
  "confidenceScores": {
    "merchant": 98,
    "date": 99,
    "taxId": 95,
    "total": 99,
    "category": 95,
    "tax": 95
  }
}`;

    // Fast, responsive, vision-enabled models tested & prioritized for low latency (<2s)
    const candidateModels = [
      'gemini-3.5-flash-lite',
      'gemini-3.1-flash-lite',
      'gemini-3.5-flash',
      'gemini-3.1-flash-lite-preview',
    ];
    let candidateText: string | null = null;

    for (const model of candidateModels) {
      try {
        const attemptStart = Date.now();
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: prompt },
                  {
                    inline_data: {
                      mime_type: mimeType,
                      data: pureBase64,
                    },
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.1,
              responseMimeType: 'application/json',
            },
          }),
          signal: AbortSignal.timeout(6500),
        });

        if (res.ok) {
          const jsonRes = await res.json();
          const text = jsonRes?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            candidateText = text;
            const latency = Date.now() - attemptStart;
            const usageMeta = jsonRes?.usageMetadata;
            const promptToks = usageMeta?.promptTokenCount || 380;
            const compToks = usageMeta?.candidatesTokenCount || 140;

            usageTrackingService.recordAIRequest({
              requestType: 'receipt_ocr',
              modelName: model,
              promptTokens: promptToks,
              completionTokens: compToks,
              latencyMs: latency,
              status: 'success',
              metadata: { country, model, tokens: promptToks + compToks },
            });

            activityLogService.logActivity({
              entityType: 'ai_scan',
              action: 'scan_receipt',
              description: `AI OCR extracted receipt (${model}, ${promptToks + compToks} tokens in ${latency}ms)`,
              status: 'success',
              metadata: { model, promptTokens: promptToks, completionTokens: compToks, latencyMs: latency },
            });
            break;
          }
        } else {
          console.warn(`Gemini model ${model} status: ${res.status}`);
        }
      } catch (e) {
        console.warn(`Gemini model ${model} attempt error:`, e);
      }
    }

    if (!candidateText) return null;

    let cleanJson = candidateText.trim();
    if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    }
    const firstBrace = cleanJson.indexOf('{');
    const lastBrace = cleanJson.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      cleanJson = cleanJson.slice(firstBrace, lastBrace + 1);
    }

    const parsed = JSON.parse(cleanJson);
    parsed.country = country;
    parsed.currency = cInfo.code;
    parsed.currencySymbol = cInfo.symbol;
    parsed.originalImage = imageDataUrl;
    parsed.ocrStatus = 'ai_extracted';
    return normalizeExtractedResult(parsed, imageDataUrl, customerTaxId, country);
  } catch (err) {
    console.warn('callGeminiVision exception:', err);
    return null;
  }
}

/**
 * Server-side OCR (POST /api/receipt-ocr): the server holds the Gemini key, so it never
 * ships inside the web bundle or the APK. Images are compressed first to keep uploads small.
 */
async function callServerOcr(
  inputPayload: string,
  country: SupportedCountry,
  customerTaxId: string
): Promise<ExtractedReceiptData | null> {
  try {
    const isPdf = inputPayload.startsWith('data:application/pdf') || inputPayload.startsWith('JVBERi');
    const payload = isPdf ? inputPayload : await optimizeReceiptImage(inputPayload, 1280, 0.82);
    const started = Date.now();
    const res = await authedFetch('/api/receipt-ocr', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ input: payload, customerTaxId, country }),
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) {
      console.warn(`Server OCR status: ${res.status}`);
      return null;
    }
    const json = await res.json();
    if (!json || json.ocrStatus === 'manual_required') return null;

    const meta = json._meta || {};
    const promptTokens = Number(meta.promptTokens) || 0;
    const completionTokens = Number(meta.completionTokens) || 0;
    usageTrackingService.recordAIRequest({
      requestType: 'receipt_ocr',
      modelName: meta.model || 'server',
      promptTokens,
      completionTokens,
      latencyMs: Date.now() - started,
      status: 'success',
      metadata: { country, model: meta.model, tokens: promptTokens + completionTokens },
    });
    activityLogService.logActivity({
      entityType: 'ai_scan',
      action: 'scan_receipt',
      description: `AI OCR extracted receipt (${meta.model || 'server'})`,
      status: 'success',
      metadata: { model: meta.model, promptTokens, completionTokens },
    });

    delete json._meta;
    json.country = country;
    json.ocrStatus = 'ai_extracted';
    json.originalImage = inputPayload;
    return normalizeExtractedResult(json, inputPayload, customerTaxId, country);
  } catch (err) {
    console.warn('Server OCR unavailable:', err);
    return null;
  }
}

/**
 * Clean manual entry template when no OCR engine is available.
 * Keeps the receipt image in place, sets clean empty merchant & 0 amount,
 * never showing raw base64 or fake random data.
 */
function createManualEntryFallback(
  imageOrInput: string,
  customerTaxId: string,
  country: SupportedCountry,
  reason: string
): ExtractedReceiptData {
  const currencyMap: Record<string, { code: string; symbol: string; taxRate: number }> = {
    NZ: { code: 'NZD', symbol: '$', taxRate: 15 },
    AU: { code: 'AUD', symbol: '$', taxRate: 10 },
    CA: { code: 'CAD', symbol: '$', taxRate: 13 },
    UK: { code: 'GBP', symbol: '£', taxRate: 20 },
    US: { code: 'USD', symbol: '$', taxRate: 8.875 },
    IN: { code: 'INR', symbol: '₹', taxRate: 18 },
  };
  const cInfo = currencyMap[country] || currencyMap['NZ'];

  return {
    merchant: '',
    invoiceNumber: '',
    receiptNumber: '',
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().slice(0, 5),
    vendorAddress: '',
    vendorPhone: '',
    country,
    currency: cInfo.code,
    currencySymbol: cInfo.symbol,
    vendorTaxId: '',
    customerTaxId,
    vendorGSTIN: '',
    customerGSTIN: customerTaxId,
    state: country === 'NZ' ? 'Auckland' : country === 'AU' ? 'Sydney' : (country as string) === 'UK' ? 'London' : country === 'US' ? 'California' : 'Delhi',
    paymentMethod: 'Credit Card',
    subtotal: 0,
    discount: 0,
    taxableAmount: 0,
    taxType: country === 'US' ? 'Sales Tax' : 'GST',
    taxRate: cInfo.taxRate,
    taxAmount: 0,
    gstAmount: 0,
    salesTaxAmount: 0,
    cgst: 0,
    sgst: 0,
    igst: 0,
    cess: 0,
    roundOff: 0,
    totalAmount: 0,
    category: 'Office Expenses',
    expenseType: 'Business',
    businessPercentage: 100,
    claimableBusinessAmount: 0,
    items: [],
    confidenceScores: {
      merchant: 0,
      date: 100,
      taxId: 0,
      total: 0,
      category: 50,
      tax: 0,
    },
    gstTreatment: 'Not identified',
    calculationMismatch: false,
    originalImage:
      imageOrInput.startsWith('data:') ||
      imageOrInput.startsWith('JVBERi') ||
      imageOrInput.startsWith('/9j/') ||
      imageOrInput.startsWith('iVBOR')
        ? imageOrInput
        : undefined,
    ocrStatus: 'manual_required',
    ocrMessage: reason,
  };
}

/**
 * Universal OCR & AI Processing Pipeline:
 * Dispatches images and PDF documents directly to Gemini Vision AI with country context,
 * and uses resilient country-specific heuristic fallbacks.
 */
export async function parseReceiptData(
  inputPayload: string,
  customerTaxId: string = '',
  country: SupportedCountry = 'NZ'
): Promise<ExtractedReceiptData> {
  const isDocumentOrImage =
    inputPayload.startsWith('data:image') ||
    inputPayload.startsWith('data:application/pdf') ||
    inputPayload.startsWith('data:application/') ||
    inputPayload.startsWith('JVBERi') ||
    inputPayload.startsWith('/9j/') ||
    inputPayload.startsWith('iVBOR');

  // 1. Check if matches a preset sample (by id or exact preset image)
  const allSamples = [
    ...SAMPLE_NZ_RECEIPTS,
    ...SAMPLE_AU_RECEIPTS,
    ...SAMPLE_CA_RECEIPTS,
    ...SAMPLE_US_RECEIPTS,
    ...SAMPLE_INDIAN_RECEIPTS,
  ];

  const foundSample = allSamples.find(
    s => s.id === inputPayload || s.image === inputPayload || (!isDocumentOrImage && s.extracted.merchant.toLowerCase().includes(inputPayload.toLowerCase()))
  );

  if (foundSample) {
    const data = { ...foundSample.extracted };
    if (customerTaxId) {
      data.customerTaxId = customerTaxId;
      data.customerGSTIN = customerTaxId;
    }
    data.originalImage = foundSample.image;
    data.country = country;
    return data;
  }

  // 2. If it's an image or PDF document, read it with Gemini via the TaxVault server
  if (isDocumentOrImage) {
    const isUsable = (r: ExtractedReceiptData | null): r is ExtractedReceiptData =>
      Boolean(r && (r.merchant || r.totalAmount > 0 || (r.items && r.items.length > 0)));

    let result: ExtractedReceiptData | null = await callServerOcr(inputPayload, country, customerTaxId);

    // Optional: a personal Gemini key saved on this device (never the shared app key)
    if (!isUsable(result)) {
      const personalKey = getGeminiApiKey();
      if (personalKey) {
        result = await callGeminiVision(inputPayload, country, customerTaxId, personalKey);
      }
    }

    if (isUsable(result)) {
      if (!result.merchant || !result.merchant.trim()) {
        result.merchant = 'Document / Invoice';
      }
      return result;
    }

    // 3. Clean manual entry template with original image or document
    return createManualEntryFallback(
      inputPayload,
      customerTaxId,
      country,
      'Could not read this receipt automatically. Please enter merchant & total.'
    );
  }

  // 4. If input is text/invoice content (not base64 document), use text parser
  return parseWithClientEngine(inputPayload, customerTaxId, country);
}

function normalizeExtractedResult(
  raw: any,
  rawInput: string,
  customerTaxId: string,
  country: SupportedCountry
): ExtractedReceiptData {
  const totalAmount = typeof raw.totalAmount === 'number' ? raw.totalAmount : Number(raw.totalAmount) || 0;

  // Sanitize merchant to ensure base64 strings never leak as merchant names
  const candidateMerchant = String(raw.merchant || '').trim();
  const isBase64OrCorrupt =
    candidateMerchant.startsWith('data:') ||
    candidateMerchant.includes('base64') ||
    candidateMerchant.length > 70;
  let merchant = isBase64OrCorrupt ? '' : candidateMerchant;
  if (!merchant && totalAmount > 0) {
    merchant = 'Tax Invoice / Vendor';
  }

  const category = (raw.category as ExpenseCategory) || classifyExpenseCategory(merchant || rawInput);
  const catInfo = CATEGORY_MAP[category] || CATEGORY_MAP['Office Expenses'];

  const taxRate = Number(raw.taxRate ?? (country === 'NZ' ? 15 : country === 'AU' ? 10 : country === 'CA' ? 13 : country === 'US' ? 8.875 : 18));
  const subtotal = Number(raw.subtotal) || Math.round((totalAmount / (1 + (taxRate / 100))) * 100) / 100;
  const taxAmount = Number(raw.taxAmount) || Math.round((totalAmount - subtotal) * 100) / 100;

  const expenseType: ExpenseType = (raw.expenseType as ExpenseType) || catInfo.defaultType;
  const businessPercentage = raw.businessPercentage !== undefined ? Number(raw.businessPercentage) : (expenseType === 'Business' ? 100 : expenseType === 'Mixed' ? 50 : 0);
  const claimableBusinessAmount = Math.round(totalAmount * (businessPercentage / 100) * 100) / 100;

  const vendorTaxId = raw.vendorTaxId || raw.vendorGSTIN || '';

  return {
    merchant: merchant || (rawInput.startsWith('data:') ? 'Document / Invoice' : 'Commercial Vendor'),
    invoiceNumber: raw.invoiceNumber || '',
    receiptNumber: raw.receiptNumber || '',
    date: raw.date || new Date().toISOString().split('T')[0],
    time: raw.time || '12:00',
    vendorAddress: raw.vendorAddress || '',
    vendorPhone: raw.vendorPhone || '',
    country,
    currency: raw.currency || (country === 'IN' ? 'INR' : country === 'AU' ? 'AUD' : country === 'CA' ? 'CAD' : country === 'US' ? 'USD' : 'NZD'),
    currencySymbol: raw.currencySymbol || (country === 'IN' ? '₹' : '$'),
    vendorTaxId,
    customerTaxId: raw.customerTaxId || customerTaxId,
    vendorGSTIN: vendorTaxId,
    customerGSTIN: raw.customerTaxId || customerTaxId,
    state: raw.state || '',
    paymentMethod: (raw.paymentMethod as PaymentMethod) || 'Credit Card',
    subtotal,
    discount: Number(raw.discount || 0),
    taxableAmount: subtotal,
    taxType: raw.taxType || (country === 'US' ? 'Sales Tax' : 'GST'),
    taxRate,
    taxAmount,
    gstAmount: country !== 'US' ? taxAmount : 0,
    salesTaxAmount: country === 'US' ? taxAmount : 0,
    cgst: Number(raw.cgst || (country === 'IN' ? taxAmount / 2 : 0)),
    sgst: Number(raw.sgst || (country === 'IN' ? taxAmount / 2 : 0)),
    igst: Number(raw.igst || 0),
    cess: Number(raw.cess || 0),
    roundOff: Number(raw.roundOff || 0),
    totalAmount,
    category,
    expenseType,
    businessPercentage,
    claimableBusinessAmount,
    items: Array.isArray(raw.items) && raw.items.length > 0 ? raw.items : [
      { name: merchant || 'General Expense Item', quantity: 1, unitPrice: subtotal, total: subtotal }
    ],
    confidenceScores: raw.confidenceScores || {
      merchant: merchant ? 96 : 0,
      date: 98,
      taxId: vendorTaxId ? 92 : 0,
      total: totalAmount > 0 ? 99 : 0,
      category: 95,
      tax: 90,
    },
    gstTreatment: vendorTaxId ? 'Likely eligible' : 'Not identified',
    calculationMismatch: false,
    originalImage: raw.originalImage || (rawInput.startsWith('data:image') ? rawInput : undefined),
    ocrStatus: raw.ocrStatus || 'ai_extracted',
    ocrMessage: raw.ocrMessage,
  };
}

function parseWithClientEngine(input: string, customerTaxId: string, country: SupportedCountry): ExtractedReceiptData {
  // If accidentally passed an image base64, NEVER treat it as text
  if (input.startsWith('data:image')) {
    return createManualEntryFallback(input, customerTaxId, country, 'Manual entry required for image.');
  }

  const text = input;
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  let merchant = lines[0] || 'Merchant Store';
  if (merchant.length > 40) merchant = merchant.substring(0, 40);

  // Extract Tax ID based on country pattern
  let vendorTaxId = '';
  if (country === 'NZ') {
    const match = text.match(/\b\d{2,3}[- ]?\d{3}[- ]?\d{3}\b/);
    if (match) vendorTaxId = match[0];
  } else if (country === 'AU') {
    const match = text.match(/\b\d{2}\s?\d{3}\s?\d{3}\s?\d{3}\b/);
    if (match) vendorTaxId = match[0];
  } else if (country === 'CA') {
    const match = text.match(/\b\d{9}(?:\s?RT\s?\d{4})?\b/i);
    if (match) vendorTaxId = match[0];
  } else if (country === 'US') {
    const match = text.match(/\b\d{2}-\d{7}\b/);
    if (match) vendorTaxId = match[0];
  } else {
    // IN GSTIN
    const match = text.match(/\b\d{2}[A-Z]{5}\d{4}[A-Z]{1}[A-Z\d]{1}[Z]{1}[A-Z\d]{1}\b/);
    if (match) vendorTaxId = match[0];
  }

  // Extract amounts
  const amountRegex = /(?:[\$₹]|rs\.?|total|amount|due)[:\s]*([\d,]+(?:\.\d{1,2})?)/gi;
  let highestAmount = 0;
  let match;
  while ((match = amountRegex.exec(text)) !== null) {
    const num = parseFloat(match[1].replace(/,/g, ''));
    if (!isNaN(num) && num > highestAmount) {
      highestAmount = num;
    }
  }

  const totalAmount = highestAmount > 0 ? highestAmount : 0;
  const category = classifyExpenseCategory(text);
  const catInfo = CATEGORY_MAP[category] || CATEGORY_MAP['Office Expenses'];

  const taxRate = country === 'NZ' ? 15 : country === 'AU' ? 10 : country === 'CA' ? 13 : country === 'US' ? 8.875 : 18;
  const subtotal = Math.round((totalAmount / (1 + (taxRate / 100))) * 100) / 100;
  const taxAmount = Math.round((totalAmount - subtotal) * 100) / 100;

  const expenseType: ExpenseType = catInfo.defaultType;
  const businessPercentage = expenseType === 'Business' ? 100 : expenseType === 'Mixed' ? 50 : 0;
  const claimableBusinessAmount = Math.round(totalAmount * (businessPercentage / 100) * 100) / 100;

  return {
    merchant,
    invoiceNumber: '',
    receiptNumber: '',
    date: new Date().toISOString().split('T')[0],
    time: '12:00',
    vendorAddress: '',
    vendorPhone: '',
    country,
    currency: country === 'IN' ? 'INR' : country === 'AU' ? 'AUD' : country === 'CA' ? 'CAD' : country === 'US' ? 'USD' : 'NZD',
    currencySymbol: country === 'IN' ? '₹' : '$',
    vendorTaxId,
    customerTaxId,
    vendorGSTIN: vendorTaxId,
    customerGSTIN: customerTaxId,
    state: '',
    paymentMethod: 'Credit Card',
    subtotal,
    discount: 0,
    taxableAmount: subtotal,
    taxType: country === 'US' ? 'Sales Tax' : 'GST',
    taxRate,
    taxAmount,
    gstAmount: country !== 'US' ? taxAmount : 0,
    salesTaxAmount: country === 'US' ? taxAmount : 0,
    cgst: country === 'IN' ? Math.round(taxAmount / 2 * 100) / 100 : 0,
    sgst: country === 'IN' ? Math.round(taxAmount / 2 * 100) / 100 : 0,
    igst: 0,
    cess: 0,
    roundOff: 0,
    totalAmount,
    category,
    expenseType,
    businessPercentage,
    claimableBusinessAmount,
    items: [
      { name: `${category} purchase`, quantity: 1, unitPrice: subtotal, total: subtotal }
    ],
    confidenceScores: {
      merchant: 90,
      date: 92,
      taxId: vendorTaxId ? 85 : 55,
      total: 95,
      category: 90,
      tax: 88,
    },
    gstTreatment: vendorTaxId ? 'Likely eligible' : 'Not identified',
    calculationMismatch: false,
  };
}
