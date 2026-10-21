import {
  ExpenseRecord,
  IncomeRecord,
  UserProfile,
  MileageTrip,
  BankTransaction,
  ClientInvoice,
  SupportedCountry,
} from '../types';

const STORAGE_KEYS = {
  USER_PROFILE: 'taxvault_user_profile_v3',
  EXPENSES: 'taxvault_expenses_v3',
  INCOMES: 'taxvault_incomes_v3',
  APP_LOCKED: 'taxvault_app_locked_v3',
  LAST_BACKUP: 'taxvault_last_backup_v3',
  MILEAGE_TRIPS: 'taxvault_mileage_trips_v3',
  BANK_TRANSACTIONS: 'taxvault_bank_transactions_v3',
  CLIENT_INVOICES: 'taxvault_client_invoices_v3',
  AUTH_STATUS: 'taxvault_is_authenticated_v3',
};

export const DEFAULT_INDIAN_PROFILE: UserProfile = {
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
  subscription: {
    tier: 'free',
    billingCycle: 'monthly',
    status: 'active',
    receiptsScannedThisMonth: 0,
    monthlyReceiptLimit: 10,
    renewsOn: '2026-11-01',
  },
  entityType: 'Proprietorship',
  taxNumber: 'AAAPS1234K',
  gstRegistered: true,
  gstNumber: '27AABCU9603R1ZM',
  baseCurrency: 'INR',
  financialYearEnding: '2027-03-31',
  mfaEnabled: false,
  biometricEnabled: false,
  devicePlatform: 'android',
  authProvider: 'google',
};

export const DEFAULT_PROFILES: Record<string, UserProfile> = {
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
    subscription: { tier: 'free', billingCycle: 'monthly', status: 'active', receiptsScannedThisMonth: 0, monthlyReceiptLimit: 10 },
    entityType: 'Sole Trader',
    taxNumber: '123-456-789',
    gstRegistered: true,
    gstNumber: '123-456-789',
    baseCurrency: 'NZD',
    financialYearEnding: '2027-03-31',
    mfaEnabled: false,
    biometricEnabled: false,
    devicePlatform: 'ios',
    authProvider: 'apple',
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
    subscription: { tier: 'free', billingCycle: 'monthly', status: 'active', receiptsScannedThisMonth: 0, monthlyReceiptLimit: 10 },
    entityType: 'Company / Pty Ltd',
    taxNumber: '26 008 672 179',
    gstRegistered: true,
    gstNumber: '26 008 672 179',
    baseCurrency: 'AUD',
    financialYearEnding: '2027-06-30',
    mfaEnabled: false,
    biometricEnabled: false,
    devicePlatform: 'ios',
    authProvider: 'google',
  },
  CA: {
    id: 'usr_ca_301',
    fullName: 'Sophie Tremblay',
    email: 'sophie@tremblaystudio.ca',
    phone: '+1 416 555 0188',
    businessName: 'Tremblay Creative Studio',
    businessType: 'Sole Proprietorship' as any,
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
    subscription: { tier: 'free', billingCycle: 'monthly', status: 'active', receiptsScannedThisMonth: 0, monthlyReceiptLimit: 10 },
    entityType: 'Sole Trader',
    taxNumber: '123456789 RT0001',
    gstRegistered: true,
    gstNumber: '123456789 RT0001',
    baseCurrency: 'CAD',
    financialYearEnding: '2026-12-31',
    mfaEnabled: false,
    biometricEnabled: false,
    devicePlatform: 'ios',
    authProvider: 'google',
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
    subscription: { tier: 'free', billingCycle: 'monthly', status: 'active', receiptsScannedThisMonth: 0, monthlyReceiptLimit: 10 },
    entityType: 'LLC',
    taxNumber: '12-3456789',
    gstRegistered: true,
    gstNumber: '12-3456789',
    baseCurrency: 'USD',
    financialYearEnding: '2026-12-31',
    mfaEnabled: false,
    biometricEnabled: false,
    devicePlatform: 'ios',
    authProvider: 'apple',
  },
  IN: DEFAULT_INDIAN_PROFILE,
};

export function createCleanUserProfile(
  email: string,
  fullName?: string,
  country: SupportedCountry = 'IN',
  userId?: string
): UserProfile {
  const defaultProfile = DEFAULT_PROFILES[country] || DEFAULT_INDIAN_PROFILE;
  const username = (fullName || email.split('@')[0] || 'User').replace(/[._]/g, ' ').trim();
  const cleanName = username ? username.charAt(0).toUpperCase() + username.slice(1) : 'TaxVault User';

  return {
    ...defaultProfile,
    id: userId || `usr_${country.toLowerCase()}_${Date.now().toString(36)}`,
    fullName: cleanName,
    email: email.trim().toLowerCase(),
    phone: '',
    businessName: `${cleanName}'s Business`,
    taxId: '',
    secondaryTaxId: '',
    pan: country === 'IN' ? '' : defaultProfile.pan,
    gstin: country === 'IN' ? '' : defaultProfile.gstin,
    gstRegistered: false,
    gstNumber: '',
    taxNumber: '',
    accountantName: undefined,
    accountantEmail: undefined,
    accountantPhone: undefined,
    biometricLock: false,
    authProvider: 'email',
    subscription: {
      tier: 'free',
      billingCycle: 'monthly',
      status: 'active',
      receiptsScannedThisMonth: 0,
      monthlyReceiptLimit: 10,
      renewsOn: '2026-11-01',
    },
  };
}

const PENDING_SIGNUP_KEY = 'taxvault_pending_signup_profile_v1';

/**
 * Sign-up details (name, business, country) entered before the account has a session. With
 * email confirmation on, sign-up returns no session, so the profile can't be saved yet under
 * Row Level Security; it is kept here and written on the first sign-in instead.
 */
export function savePendingSignupProfile(profile: UserProfile): void {
  try {
    localStorage.setItem(PENDING_SIGNUP_KEY, JSON.stringify(profile));
  } catch {}
}

/** Returns (and clears) the pending sign-up profile for this email, re-keyed to the auth user id. */
export function takePendingSignupProfile(email: string, userId?: string): UserProfile | null {
  try {
    const raw = localStorage.getItem(PENDING_SIGNUP_KEY);
    if (!raw) return null;
    const pending: UserProfile = JSON.parse(raw);
    if ((pending.email || '').toLowerCase() !== email.toLowerCase()) return null;
    localStorage.removeItem(PENDING_SIGNUP_KEY);
    return { ...pending, id: userId || pending.id, email: email.toLowerCase() };
  } catch {
    return null;
  }
}

export const INITIAL_SAMPLE_EXPENSES: ExpenseRecord[] = [
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
    id: 'exp-08-personal-groceries',
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

class StorageService {
  constructor() {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        // One-time cleanup of legacy seeded sample data from v1/v2
        localStorage.removeItem('taxvault_india_expenses_v2');
        localStorage.removeItem('taxvault_india_incomes_v2');
        localStorage.removeItem('taxvault_mileage_trips_v1');
        localStorage.removeItem('taxvault_bank_transactions_v1');
        localStorage.removeItem('taxvault_client_invoices_v1');
      }
    } catch {
      // ignore
    }
  }

  public getUserProfile(): UserProfile {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
      if (stored) {
        const p: UserProfile = JSON.parse(stored);
        if (!p.authProvider && p.email) {
          p.authProvider = 'google';
        }
        return p;
      }
    } catch {
      // ignore
    }
    return DEFAULT_INDIAN_PROFILE;
  }

  public isAuthenticated(): boolean {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return localStorage.getItem(STORAGE_KEYS.AUTH_STATUS) === 'true';
      }
    } catch {
      // ignore
    }
    return false;
  }

  public setAuthenticated(status: boolean): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        if (status) {
          localStorage.setItem(STORAGE_KEYS.AUTH_STATUS, 'true');
        } else {
          localStorage.removeItem(STORAGE_KEYS.AUTH_STATUS);
        }
      }
    } catch {
      // ignore
    }
  }

  public saveUserProfile(profile: UserProfile): void {
    try {
      localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(profile));
    } catch {
      // ignore
    }
  }

  public clearUserProfile(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.USER_PROFILE);
    } catch {
      // ignore
    }
  }

  public getExpenses(): ExpenseRecord[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.EXPENSES);
      if (stored !== null) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          // Filter out any blank or zero-amount expenses
          const valid = parsed.filter(
            (e) => e && typeof e.merchant === 'string' && e.merchant.trim().length > 0 && Number(e.amount) > 0
          );
          if (valid.length !== parsed.length) {
            this.saveExpenses(valid);
          }
          return valid;
        }
      }
    } catch {
      // ignore
    }
    return [];
  }

  public saveExpenses(expenses: ExpenseRecord[]): void {
    try {
      const valid = (expenses || []).filter(
        (e) => e && typeof e.merchant === 'string' && e.merchant.trim().length > 0 && Number(e.amount) > 0
      );
      try {
        localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(valid));
      } catch {
        // localStorage is ~5MB; inline base64 receipt images fill it after a handful of scans.
        // Keep the records themselves and drop only the embedded image data from the offline cache.
        const slim = valid.map((e) =>
          typeof e.receiptUrl === 'string' && e.receiptUrl.startsWith('data:') ? { ...e, receiptUrl: undefined } : e
        );
        localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(slim));
        console.warn('Offline cache full: stored expenses without embedded receipt images.');
      }
    } catch (err) {
      console.warn('Failed to cache expenses locally:', err);
    }
  }

  public addExpense(expense: ExpenseRecord): void {
    if (!expense || !expense.merchant?.trim() || Number(expense.amount) <= 0) return;
    const list = this.getExpenses();
    const updated = [expense, ...list];
    this.saveExpenses(updated);
  }

  public updateExpense(expense: ExpenseRecord): void {
    if (!expense || !expense.merchant?.trim() || Number(expense.amount) <= 0) return;
    const list = this.getExpenses();
    const updated = list.map(e => (e.id === expense.id ? expense : e));
    this.saveExpenses(updated);
  }

  public deleteExpense(id: string): void {
    const list = this.getExpenses();
    const updated = list.map((e) =>
      e.id === id
        ? {
            ...e,
            status: 'deleted' as const,
            isDeleted: true,
            deletedAt: new Date().toISOString(),
            syncStatus: 'deleted' as const,
            claimableBusinessAmount: 0,
            isDeductible: false,
          }
        : e
    );
    this.saveExpenses(updated);
  }

  public restoreExpense(id: string): void {
    const list = this.getExpenses();
    const updated = list.map((e) => {
      if (e.id === id) {
        const isBiz = e.expenseType === 'Business';
        const isMixed = e.expenseType === 'Mixed';
        const claimable = isBiz
          ? e.amount
          : isMixed
          ? Math.round(e.amount * ((e.businessPercentage || 50) / 100))
          : 0;
        return {
          ...e,
          status: 'active' as const,
          isDeleted: false,
          deletedAt: undefined,
          syncStatus: 'synced' as const,
          claimableBusinessAmount: claimable,
          isDeductible: isBiz,
        };
      }
      return e;
    });
    this.saveExpenses(updated);
  }

  public getIncomes(): IncomeRecord[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.INCOMES);
      if (stored !== null) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return [];
  }

  public saveIncomes(incomes: IncomeRecord[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.INCOMES, JSON.stringify(incomes));
    } catch {
      // ignore
    }
  }

  public resetToSampleData(): void {
    this.saveUserProfile(DEFAULT_INDIAN_PROFILE);
    this.saveExpenses(INITIAL_SAMPLE_EXPENSES);
  }

  public clearAllData(): void {
    this.saveExpenses([]);
    this.saveIncomes([]);
    this.saveBankTransactions([]);
    this.saveClientInvoices([]);
    this.saveMileageTrips([]);
    try {
      localStorage.removeItem('taxvault_india_expenses_v2');
      localStorage.removeItem('taxvault_india_incomes_v2');
      localStorage.removeItem('taxvault_mileage_trips_v1');
      localStorage.removeItem('taxvault_bank_transactions_v1');
      localStorage.removeItem('taxvault_client_invoices_v1');
    } catch {
      // ignore
    }
  }

  public generateBackupPayload() {
    return {
      version: '2.0-india',
      exportedAt: new Date().toISOString(),
      profile: this.getUserProfile(),
      expenses: this.getExpenses(),
      incomes: this.getIncomes(),
    };
  }

  public setLastBackupTimestamp(timestamp: string): void {
    localStorage.setItem(STORAGE_KEYS.LAST_BACKUP, timestamp);
  }

  public restoreFromPayload(payload: any): boolean {
    try {
      if (payload?.profile) this.saveUserProfile(payload.profile);
      if (Array.isArray(payload?.expenses)) this.saveExpenses(payload.expenses);
      if (Array.isArray(payload?.incomes)) this.saveIncomes(payload.incomes);
      return true;
    } catch {
      return false;
    }
  }

  // --- MILEAGE & VEHICLE LOGBOOK ---
  public getMileageTrips(_country: SupportedCountry = 'NZ'): MileageTrip[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.MILEAGE_TRIPS);
      if (stored !== null) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return [];
  }

  public saveMileageTrips(trips: MileageTrip[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.MILEAGE_TRIPS, JSON.stringify(trips));
    } catch {
      // ignore
    }
  }

  public addMileageTrip(trip: MileageTrip): void {
    const list = this.getMileageTrips();
    this.saveMileageTrips([trip, ...list]);
  }

  public deleteMileageTrip(id: string): void {
    const list = this.getMileageTrips();
    this.saveMileageTrips(list.filter(t => t.id !== id));
  }

  // --- BANK RECONCILIATION ---
  public getBankTransactions(): BankTransaction[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.BANK_TRANSACTIONS);
      if (stored !== null) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return [];
  }

  public saveBankTransactions(txs: BankTransaction[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.BANK_TRANSACTIONS, JSON.stringify(txs));
    } catch {
      // ignore
    }
  }

  // --- CLIENT INVOICING ---
  public getClientInvoices(_currencySymbol: string = '$'): ClientInvoice[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CLIENT_INVOICES);
      if (stored !== null) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return [];
  }

  public saveClientInvoices(invoices: ClientInvoice[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.CLIENT_INVOICES, JSON.stringify(invoices));
    } catch {
      // ignore
    }
  }

  public addClientInvoice(invoice: ClientInvoice): void {
    const list = this.getClientInvoices();
    this.saveClientInvoices([invoice, ...list]);
  }
}

export const storageService = new StorageService();
