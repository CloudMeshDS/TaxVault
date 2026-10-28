import { SupportedCountry } from '../types';

export interface CountryLegalSection {
  id: string;
  title: string;
  summary: string;
  content: string[];
  highlights?: string[];
}

export interface CountryTermsData {
  countryCode: SupportedCountry;
  countryName: string;
  flag: string;
  currency: string;
  taxAuthority: string;
  taxAuthorityPortal: string;
  governingLaw: string;
  retentionRequirement: string;
  lastUpdated: string;
  shortNotice: string;
  sections: CountryLegalSection[];
}

export const COUNTRY_TERMS: Record<SupportedCountry, CountryTermsData> = {
  NZ: {
    countryCode: 'NZ',
    countryName: 'New Zealand',
    flag: '🇳🇿',
    currency: 'NZD ($)',
    taxAuthority: 'Inland Revenue Department (Te Tari Taake / IRD)',
    taxAuthorityPortal: 'https://www.ird.govt.nz',
    governingLaw: 'Laws of New Zealand (Tax Administration Act 1994, Privacy Act 2020, Goods and Services Tax Act 1985)',
    retentionRequirement: '7 Years Statutory Retention under Section 22 of the Tax Administration Act 1994',
    lastUpdated: 'October 2026',
    shortNotice:
      'By using TaxVault New Zealand, you agree that TaxVault is an automated record-keeping tool, not an authorized IRD tax agent or legal advisory firm. You must verify all GST101 and IR3 claim calculations before filing.',
    sections: [
      {
        id: 'disclaimer',
        title: '1. Non-Advisory Notice & IRD Compliance Disclaimer',
        summary: 'TaxVault provides software tools for expense organization, not certified tax advice.',
        highlights: [
          'TaxVault is NOT a chartered accountant firm or registered NZ tax agent.',
          'GST eligibility rules (15%) and business percentages are algorithmic estimates.',
          'You must independently verify all figures before submitting GST101, IR3, or IR10 returns.',
        ],
        content: [
          'TaxVault is a digital receipt-organization, mileage-tracking, and bookkeeping assistant designed to facilitate record management for New Zealand sole traders, small companies, and independent contractors.',
          'TaxVault does NOT offer formal legal, financial, or tax advisory services under New Zealand law. The software does not act as an authorized tax agent registered with the Inland Revenue Department (IRD).',
          'While TaxVault applies standard New Zealand tax rules (such as 15% Goods and Services Tax, 50% entertainment deduction limitations, and IRD approved vehicle mileage rates), all tax calculations, deductions, and classification outputs are estimates for reference only. You remain personally responsible for reviewing and verifying every voucher before submitting your returns to Te Tari Taake (IRD).',
        ],
      },
      {
        id: 'record_retention',
        title: '2. 7-Year Statutory Record Keeping (Section 22 Tax Administration Act)',
        summary: 'Under New Zealand law, all expense receipts, tax invoices, and logbooks must be kept for 7 years.',
        highlights: [
          'Maintain original or digital tax invoices for 7 years from the end of the tax year.',
          'Tax invoices over NZ$50 must display supplier name, GST number, and date.',
          'TaxVault provides tamper-evident digital backup storage and exportable logs to satisfy IRD audit requests.',
        ],
        content: [
          'Under Section 22 of the New Zealand Tax Administration Act 1994, every person carrying on a business or taxable activity must keep sufficient records in English or Māori to enable the Commissioner to ascertain readily the taxable income, allowable deductions, and GST payable or refundable.',
          'All records, invoices, receipts, and vehicle logbook entries must be retained for at least 7 years after the end of the tax year to which they relate.',
          'TaxVault stores digitized copies of your receipts and extracts relevant audit fields (vendor GST numbers, taxable supplies, GST amounts). You agree that maintaining offline backups (via TaxVault export tools or downloaded spreadsheets) is your shared responsibility in the event of an IRD dispute or audit.',
        ],
      },
      {
        id: 'privacy',
        title: '3. Privacy & Data Protection (NZ Privacy Act 2020)',
        summary: 'Your financial information and uploaded receipts are protected under New Zealand privacy principles.',
        highlights: [
          'Compliance with the 13 Information Privacy Principles (IPPs) of the Privacy Act 2020.',
          'Data is encrypted in transit (HTTPS/TLS) and at rest by our cloud database provider.',
          'You may export, download, or delete your receipts and profile data at any time.',
        ],
        content: [
          'We collect and process your personal and business data strictly in accordance with the New Zealand Privacy Act 2020 and its 13 Information Privacy Principles (IPPs).',
          'Information collected includes your business name, IRD number, email address, receipt images, mileage routes, and transaction amounts necessary to organize your personal finance records.',
          'We will never sell, rent, or trade your personal receipt records to third-party advertisers. Your data is synced to your signed-in devices over encrypted (HTTPS) connections.',
        ],
      },
      {
        id: 'ocr_accuracy',
        title: '4. AI & OCR Data Extraction Notice',
        summary: 'Receipt OCR is automated and must be human-verified before accounting entry.',
        highlights: [
          'AI confidence scores highlight potential scanning mismatches.',
          'You must inspect amounts, invoice numbers, and dates before marking expenses claimable.',
          'TaxVault accepts no liability for OCR misinterpretations.',
        ],
        content: [
          'TaxVault employs optical character recognition (OCR) and machine learning algorithms to scan and parse receipt text, line items, and totals.',
          'While our system incorporates multi-point mathematical cross-checks (subtotal + tax = total), OCR results can be affected by crumpled paper, low lighting, faded thermal ink, or handwritten notations.',
          'The user acknowledges and agrees that all parsed information must be inspected during the review screen before committing to storage.',
        ],
      },
      {
        id: 'subscription_refunds',
        title: '5. Subscriptions, Scan Limits & Cancellation',
        summary: 'Transparent usage limits, monthly allowances, and flexible cancellation rules.',
        highlights: [
          'Free tier includes 10 receipt scans each calendar month.',
          'Pro tier grants unlimited receipt scans, multi-currency exports, and CA audit exports.',
          'You may cancel subscriptions anytime; access continues through the paid billing cycle.',
        ],
        content: [
          'TaxVault operates on monthly or annual subscription plans. The free plan provides basic bookkeeping and up to 10 automated scans per calendar month.',
          'Paid subscriptions (Pro and Enterprise) renew automatically unless cancelled prior to the renewal date. Billing fees are in NZD or your selected local billing currency.',
          'Refund requests are evaluated on a case-by-case basis in compliance with the New Zealand Consumer Guarantees Act 1993 and Fair Trading Act 1986.',
        ],
      },
      {
        id: 'liability',
        title: '6. Limitation of Liability',
        summary: 'TaxVault provides software on an as-is basis with statutory limits on liability.',
        highlights: [
          'TaxVault is not liable for IRD penalties, late filing fees, or audit adjustments.',
          'Maximum liability is limited to the subscription fees paid in the preceding 12 months.',
        ],
        content: [
          'To the maximum extent permitted by New Zealand law, TaxVault and its developers shall not be liable for any penalties, shortfall interest, late filing fees, or disallowed deductions assessed by the Inland Revenue Department resulting from user data entry errors or software inaccuracies.',
          'Our total aggregate liability under these terms shall not exceed the total fees paid by you to TaxVault in the 12 months prior to the claim.',
        ],
      },
    ],
  },

  AU: {
    countryCode: 'AU',
    countryName: 'Australia',
    flag: '🇦🇺',
    currency: 'AUD ($)',
    taxAuthority: 'Australian Taxation Office (ATO)',
    taxAuthorityPortal: 'https://www.ato.gov.au',
    governingLaw: 'Laws of the Commonwealth of Australia (Taxation Administration Act 1953, Privacy Act 1988)',
    retentionRequirement: '5 Years Statutory Retention under ATO Record Keeping Regulations',
    lastUpdated: 'October 2026',
    shortNotice:
      'By using TaxVault Australia, you acknowledge that TaxVault is an automated digital logbook and receipt manager, not a registered BAS Agent or Australian Tax Agent.',
    sections: [
      {
        id: 'disclaimer',
        title: '1. Non-Advisory Notice & ATO Disclaimer',
        summary: 'TaxVault is an administrative expense tool, not a registered Australian Tax Agent or BAS Agent.',
        highlights: [
          'TaxVault is not registered under the Tax Agent Services Act 2009 (TASA).',
          'GST (10%) input tax credit calculations and business percentages are estimates.',
          'Consult a registered tax practitioner before lodging Business Activity Statements (BAS) or Income Tax Returns.',
        ],
        content: [
          'TaxVault provides digital tools to capture receipts, log cents-per-kilometre vehicle mileage, and categorize tax deductions for Australian sole traders, contractors, and Pty Ltd companies.',
          'TaxVault is NOT a registered Tax Agent or BAS Agent under the Tax Agent Services Act 2009 (TASA). Nothing within the app constitutes formal tax advice.',
          'You are advised to engage a registered Australian tax agent or CPA to review your records before lodging your quarterly Business Activity Statement (BAS) or annual income tax return with the Australian Taxation Office (ATO).',
        ],
      },
      {
        id: 'record_retention',
        title: '2. 5-Year ATO Record Keeping Compliance',
        summary: 'Australian tax laws require retaining written evidence for at least 5 years.',
        highlights: [
          'Written evidence must be kept for 5 years from the date you lodge your tax return.',
          'Receipts must show vendor name, ABN, date of expense, and GST component.',
          'Digital scans stored in TaxVault satisfy ATO electronic record-keeping criteria if legible.',
        ],
        content: [
          'Under Australian taxation law, you must keep written evidence of business expenses, capital acquisitions, and claims for at least 5 years from the date you lodge your tax return.',
          'If you claim deductions under the logbook method for motor vehicles, logbooks must be maintained for a continuous 12-week period and kept for 5 years.',
          'TaxVault electronic records are designed to preserve digital copies of receipts in accordance with ATO guidelines for electronic record-keeping (TR 2018/2).',
        ],
      },
      {
        id: 'privacy',
        title: '3. Australian Privacy Principles (Privacy Act 1988)',
        summary: 'Your information is governed by the 13 Australian Privacy Principles.',
        highlights: [
          'Strict compliance with the Australian Privacy Act 1988 (Cth).',
          'ABN and financial data are encrypted in transit (HTTPS/TLS) and at rest by our cloud database provider.',
          'You have the right to request access to and correction of your personal information.',
        ],
        content: [
          'We collect and manage your personal data in accordance with the Australian Privacy Principles (APPs) set out in the Privacy Act 1988 (Cth).',
          'Your data is stored in secure database facilities with access restricted to authenticated user sessions.',
          'You may request access to your stored data or request complete account deletion at any time through our in-app settings.',
        ],
      },
      {
        id: 'ocr_accuracy',
        title: '4. Receipt Capture & OCR Notice',
        summary: 'Users must verify OCR output against physical receipts or invoices.',
        highlights: [
          'Automated ABN lookup and GST 10% separation are advisory.',
          'Always verify fuel, meal, and equipment totals before saving.',
        ],
        content: [
          'TaxVault utilizes automated image analysis to extract vendor names, ABNs, and GST amounts. Users are responsible for confirming that extracted records accurately mirror the underlying tax invoice before relying on them for tax deductions.',
        ],
      },
      {
        id: 'subscription_refunds',
        title: '5. Subscriptions & Australian Consumer Law',
        summary: 'Consumer rights under the Australian Consumer Law (ACL).',
        highlights: [
          'Our services come with guarantees that cannot be excluded under the Australian Consumer Law.',
          'Subscriptions can be cancelled at any time without exit penalties.',
        ],
        content: [
          'Subscriptions are billed monthly or annually in advance. In the event of a major failure of the service, you are entitled to cancel your service contract and receive a refund for the unused portion under the Australian Consumer Law (Competition and Consumer Act 2010).',
        ],
      },
      {
        id: 'liability',
        title: '6. Limitation of Liability',
        summary: 'Liability capped to the statutory minimum allowable under Australian law.',
        highlights: [
          'TaxVault is not liable for ATO audit penalties or administrative penalties for false or misleading statements.',
        ],
        content: [
          'To the extent permitted by law, TaxVault excludes liability for any penalties, general interest charges (GIC), or shortfall interest charges (SIC) imposed by the ATO resulting from incorrect expense claims.',
        ],
      },
    ],
  },

  CA: {
    countryCode: 'CA',
    countryName: 'Canada',
    flag: '🇨🇦',
    currency: 'CAD ($)',
    taxAuthority: 'Canada Revenue Agency (CRA) / Revenu Québec',
    taxAuthorityPortal: 'https://www.canada.ca/en/revenue-agency.html',
    governingLaw: 'Laws of Canada and the Provinces (Income Tax Act, PIPEDA, Excise Tax Act)',
    retentionRequirement: '6 Years Statutory Retention from end of relevant tax year',
    lastUpdated: 'October 2026',
    shortNotice:
      'By using TaxVault Canada, you understand that TaxVault is an automated digital expense organizer, not a Chartered Professional Accountant (CPA) firm or registered tax preparer.',
    sections: [
      {
        id: 'disclaimer',
        title: '1. CRA Non-Advisory Notice & Tax Disclaimer',
        summary: 'TaxVault is a self-employment expense utility, not a certified Canadian CPA firm.',
        highlights: [
          'TaxVault is not a Chartered Professional Accountant (CPA) firm.',
          'GST/HST/PST/QST calculations and T2125 categorizations are advisory.',
          'Users must review figures before filing Form T2125 or GST34 returns with the CRA.',
        ],
        content: [
          'TaxVault provides automated receipt digitization and logbook tracking for Canadian sole proprietors, incorporated businesses, and gig workers.',
          'TaxVault is NOT a licensed Canadian accounting firm. We do not provide formal tax representation or certification.',
          'Canadian tax calculations involve dual federal (5% GST) and provincial (HST/PST/QST) tax regimes. While TaxVault assists in separating eligible input tax credits (ITCs), users are responsible for validating claims with a designated CPA before filing.',
        ],
      },
      {
        id: 'record_retention',
        title: '2. 6-Year CRA Record Retention Rule',
        summary: 'The CRA requires maintaining all books, records, and source receipts for 6 years.',
        highlights: [
          'Keep all tax invoices, receipts, and motor vehicle logbooks for 6 years.',
          'Electronic images must be true copies that are readable and reproducible upon CRA request.',
        ],
        content: [
          'Under Section 230(4) of the Canadian Income Tax Act and Section 286(3) of the Excise Tax Act, you must keep all books of account, records, receipts, and supporting source documents for at least six years from the end of the tax year to which they relate.',
          'TaxVault stores electronic images in high resolution to comply with CRA Information Circular IC78-10R5 regarding books and records retention.',
        ],
      },
      {
        id: 'privacy',
        title: '3. Privacy & PIPEDA Compliance',
        summary: 'Personal and financial data is handled under PIPEDA principles.',
        highlights: [
          'Compliance with Canada’s Personal Information Protection and Electronic Documents Act (PIPEDA).',
          'CRA Business Numbers and financial logs are encrypted in transit (HTTPS/TLS) and at rest by our cloud database provider.',
        ],
        content: [
          'Your personal information is collected, used, and disclosed in compliance with the Personal Information Protection and Electronic Documents Act (PIPEDA) and applicable provincial privacy legislation (such as Quebec Law 25, BC PIPA, and Alberta PIPA).',
          'We do not sell personal data. You retain ownership of all uploaded receipts, business numbers, and mileage data.',
        ],
      },
      {
        id: 'ocr_accuracy',
        title: '4. OCR & Food / Entertainment Limitations',
        summary: 'Advisory on the 50% deduction limit for food and beverages under Canadian law.',
        highlights: [
          'Food and beverage expenses are automatically subject to the 50% deduction limit under subsection 67.1(1).',
          'Users must verify bilingual receipts (English / French).',
        ],
        content: [
          'Under subsection 67.1(1) of the Canadian Income Tax Act, the maximum deductible amount for food, beverages, and entertainment is generally 50% of the lesser of the actual expense or a reasonable amount.',
          'TaxVault automatically flags food/meal expenses with a 50% deductible cap for user review.',
        ],
      },
      {
        id: 'subscription_refunds',
        title: '5. Subscriptions & Terms of Sale',
        summary: 'Monthly and annual subscription policies for Canadian users.',
        highlights: [
          'Billed in CAD or USD as selected during checkout.',
          'Cancel anytime; subscription remains active until the end of the current billing cycle.',
        ],
        content: [
          'Subscription fees are charged at the start of each billing period. Applicable federal (GST/HST) and provincial taxes will be collected where mandated by Canadian tax laws.',
        ],
      },
      {
        id: 'liability',
        title: '6. Limitation of Liability',
        summary: 'No liability for CRA reassessments, audit interest, or penalties.',
        highlights: [
          'TaxVault does not represent users during CRA audits or appeals.',
        ],
        content: [
          'To the fullest extent permitted under Canadian law, TaxVault disclaims all liability for penalties, arrears interest, or disallowed business expenses resulting from CRA reassessments.',
        ],
      },
    ],
  },

  US: {
    countryCode: 'US',
    countryName: 'United States',
    flag: '🇺🇸',
    currency: 'USD ($)',
    taxAuthority: 'Internal Revenue Service (IRS) & State Revenue Departments',
    taxAuthorityPortal: 'https://www.irs.gov',
    governingLaw: 'Federal Laws of the United States and State Jurisdiction (Internal Revenue Code, State Privacy Laws)',
    retentionRequirement: '3 to 7 Years Statutory Retention under Internal Revenue Code Section 6001',
    lastUpdated: 'October 2026',
    shortNotice:
      'By using TaxVault United States, you confirm that TaxVault is an expense-tracking utility, not a Certified Public Accountant (CPA), Enrolled Agent (EA), or registered tax preparer.',
    sections: [
      {
        id: 'disclaimer',
        title: '1. IRS Circular 230 Notice & Non-Advisory Disclaimer',
        summary: 'TaxVault provides record-keeping assistance, not professional legal or tax advice.',
        highlights: [
          'TaxVault is NOT a CPA, Enrolled Agent, or legal practice.',
          'IRS Circular 230: Content cannot be used to avoid tax penalties under the Internal Revenue Code.',
          'Schedule C, 1099, and Form 8829 calculations are illustrative estimates.',
        ],
        content: [
          'TaxVault is an administrative productivity application for tracking business deductions, receipt vouchers, vehicle mileage, and contractor invoicing.',
          'IRS Circular 230 Disclosure: Nothing contained in this application or its exported reports is intended or written to be used, and cannot be used, for the purpose of avoiding tax-related penalties under the Internal Revenue Code or promoting, marketing, or recommending to another party any tax-related transaction.',
          'Users are urged to consult a qualified CPA or licensed tax professional before filing federal Form 1040 (Schedule C), Form 1120, or state tax returns.',
        ],
      },
      {
        id: 'record_retention',
        title: '2. IRS Record Retention Guidelines (Section 6001)',
        summary: 'The IRS requires retaining books and records for 3, 6, or 7 years depending on claims.',
        highlights: [
          'General tax records must be retained for at least 3 years from the date of filing.',
          'Records relating to bad debts or worthless securities must be retained for 7 years.',
          'Property, vehicle, and asset records must be retained until the period of limitations expires for the year you dispose of the property.',
        ],
        content: [
          'Under Section 6001 of the Internal Revenue Code, any person subject to tax must keep permanent books of account or records sufficient to establish the amount of gross income, deductions, and credits.',
          'Revenue Procedure 97-22 permits electronic storage of receipts and books of account, provided the electronic storage system ensures accurate and complete recording and produces clear, legible reproductions.',
          'TaxVault stores digital scans with cryptographic hashes to help users maintain compliant electronic records.',
        ],
      },
      {
        id: 'privacy',
        title: '3. Data Privacy & US State Consumer Rights',
        summary: 'Commitment to data privacy under California (CCPA/CPRA) and state regulations.',
        highlights: [
          'We do not sell your personal financial records or contact info.',
          'Data is encrypted in transit (HTTPS/TLS) and at rest by our cloud database provider.',
          'Users can request a copy of their data or delete their accounts at any time.',
        ],
        content: [
          'TaxVault complies with applicable US state privacy laws, including the California Consumer Privacy Act (CCPA) as amended by the CPRA, Virginia VCDPA, and Colorado CPA.',
          'We collect business receipt data solely for providing bookkeeping and expense classification services. We never sell or share personal information with data brokers.',
        ],
      },
      {
        id: 'ocr_accuracy',
        title: '4. AI OCR & 50% Meals / Zero Entertainment Rule',
        summary: 'Tax Cuts and Jobs Act (TCJA) business meals and entertainment rules.',
        highlights: [
          'Under the TCJA, entertainment expenses are non-deductible.',
          'Business meals are generally 50% deductible if ordinary and necessary.',
          'Standard mileage rate (67c/mile) requires a contemporaneous log.',
        ],
        content: [
          'The Tax Cuts and Jobs Act (TCJA) eliminated deductions for most business entertainment expenses and preserved the 50% limitation on business meals.',
          'TaxVault automatically tags entertainment and food expenses with applicable limitations for review. You must maintain a contemporaneous mileage log for audit protection.',
        ],
      },
      {
        id: 'subscription_refunds',
        title: '5. Subscriptions, Payments & Auto-Renewal',
        summary: 'Billing rules for US monthly and annual subscriptions.',
        highlights: [
          'Recurring billing until cancelled.',
          'Cancel via account settings anytime to stop future renewals.',
        ],
        content: [
          'All subscriptions renew automatically unless cancelled before the renewal date. Prices are listed in USD and exclude applicable state and local sales taxes.',
        ],
      },
      {
        id: 'liability',
        title: '6. Limitation of Liability & Arbitration Agreement',
        summary: 'Resolution of disputes through binding individual arbitration.',
        highlights: [
          'Any dispute arising under these terms shall be resolved by binding individual arbitration.',
          'Class action waiver: Claims must be brought on an individual basis.',
        ],
        content: [
          'To the fullest extent permitted by law, you agree that any dispute or claim arising out of your use of TaxVault shall be resolved through binding, individual arbitration rather than in court.',
          'Neither you nor TaxVault may act as a class representative or participate as a member of a class of claimants in any arbitration.',
        ],
      },
    ],
  },

  IN: {
    countryCode: 'IN',
    countryName: 'India',
    flag: '🇮🇳',
    currency: 'INR (₹)',
    taxAuthority: 'Goods and Services Tax Network (GSTN) / Income Tax Department',
    taxAuthorityPortal: 'https://www.gst.gov.in',
    governingLaw: 'Laws of India (CGST Act 2017, Income-tax Act 1961, DPDP Act 2023, IT Act 2000)',
    retentionRequirement: '72 Months (6 Years) Statutory Retention under Section 36 of the CGST Act 2017',
    lastUpdated: 'October 2026',
    shortNotice:
      'By using TaxVault India, you acknowledge that TaxVault is an automated digital invoicing, expense tracking, and GST categorization utility, NOT a Chartered Accountant (CA) firm.',
    sections: [
      {
        id: 'disclaimer',
        title: '1. Non-Chartered Accountant (CA) Disclaimer & GST Notice',
        summary: 'TaxVault is a bookkeeping assistant, not a Chartered Accountant or legal firm.',
        highlights: [
          'TaxVault is NOT a Chartered Accountant firm registered under the ICAI.',
          'Input Tax Credit (ITC) eligibility indicators under Section 16(2) of CGST Act are advisory.',
          'GSTR-1, GSTR-3B, and Income Tax Return figures must be vetted by a licensed CA before filing.',
        ],
        content: [
          'TaxVault is a specialized digital receipt-vault, expense categorization, and business accounting tool designed for Indian MSMEs, freelancers, LLPs, and Private Limited companies.',
          'TaxVault does NOT provide certified Chartered Accountant (CA) audit or legal advisory services under the Chartered Accountants Act 1949 or Advocates Act 1961.',
          'All GST breakdown components (CGST, SGST, IGST, Cess) and Input Tax Credit (ITC) eligibility statuses are algorithmic suggestions based on vendor GSTINs and expense categories. Users must conduct GSTR-2B reconciliations and consult a practicing CA before claiming ITC on GSTR-3B.',
        ],
      },
      {
        id: 'record_retention',
        title: '2. 72-Month (6-Year) Statutory Retention (Section 36 CGST Act 2017)',
        summary: 'Indian GST law requires preserving tax invoices and books of account for 72 months.',
        highlights: [
          'Section 36 of CGST Act: Maintain tax invoices, vouchers, and accounts for 72 months from annual return due date.',
          'Section 44AA of Income-tax Act: Prescribe books of account for business and profession.',
          'TaxVault stores digital records in compliance with Rule 56 of CGST Rules 2017.',
        ],
        content: [
          'Under Section 36 of the Central Goods and Services Tax Act 2017, every registered person must keep and maintain books of account and other records until the expiry of seventy-two months (6 years) from the due date of furnishing the annual return for the year pertaining to such accounts.',
          'Under Section 44AA of the Income-tax Act 1961, persons carrying on specified business or profession must keep and maintain books of account and documents that enable the Assessing Officer to compute total income.',
          'TaxVault provides secure, searchable digital storage of original tax invoices, vendor GST numbers, and payment receipts to facilitate GST and Income Tax departmental audits.',
        ],
      },
      {
        id: 'privacy',
        title: '3. Data Protection (DPDP Act 2023 & Information Technology Act 2000)',
        summary: 'Protection of personal and business data under Indian data protection laws.',
        highlights: [
          'Compliance with Digital Personal Data Protection Act 2023 (DPDP) and IT Act 2000.',
          'PAN, GSTIN and banking transactions are encrypted in transit (HTTPS/TLS) and at rest by our cloud database provider.',
          'Right to data summary, correction, and account erasure.',
        ],
        content: [
          'TaxVault processes digital personal and financial data in accordance with the Digital Personal Data Protection Act 2023 (DPDP Act) and the Information Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules 2011.',
          'Your PAN, GSTIN, business bank statements, and receipt images are stored in secure cloud infrastructure with access restricted to authenticated user credentials.',
          'We do not monetize or sell your sensitive financial data to loan aggregators or marketing third parties.',
        ],
      },
      {
        id: 'ocr_accuracy',
        title: '4. AI OCR & Blocked ITC Notice (Section 17(5) CGST Act)',
        summary: 'Automated warnings regarding blocked Input Tax Credit items.',
        highlights: [
          'Certain expenses (motor vehicles, food & beverages, outdoor catering) have blocked ITC under Section 17(5).',
          'TaxVault flags potential Section 17(5) blocked credits for CA verification.',
          'Users must review OCR-read GSTINs against the official GST portal.',
        ],
        content: [
          'Under Section 17(5) of the CGST Act 2017, Input Tax Credit is blocked for specific categories including motor vehicles (with exceptions), food and beverages, outdoor catering, beauty treatment, and health services.',
          'While TaxVault flags suspected blocked items, users must exercise due diligence and verify that ITC is not claimed on ineligible supplies.',
        ],
      },
      {
        id: 'subscription_refunds',
        title: '5. Subscriptions, UPI / Razorpay Payments & Refunds',
        summary: 'Billing in Indian Rupees via UPI, cards, and net banking.',
        highlights: [
          'All pricing displayed in INR inclusive of applicable 18% GST.',
          'Razorpay & UPI recurring mandate cancellation rules.',
        ],
        content: [
          'Subscriptions can be paid using UPI, RuPay/Visa/MasterCard debit or credit cards, and net banking via authorized RBI-licensed payment gateways (Razorpay).',
          'Users can cancel recurring e-mandates at any time through the in-app subscription portal before the renewal date.',
        ],
      },
      {
        id: 'liability',
        title: '6. Limitation of Liability & Indian Legal Jurisdiction',
        summary: 'Exclusion of liability for tax penalties and exclusive jurisdiction.',
        highlights: [
          'TaxVault is not liable for GST interest under Section 50, late filing fees under Section 47, or tax audit penalties.',
          'Disputes governed by the laws of India and subject to arbitration in New Delhi or Mumbai.',
        ],
        content: [
          'To the fullest extent permitted by Indian law, TaxVault and its developers shall not be liable for any interest under Section 50, late filing fees under Section 47 of the CGST Act, or penalties under Section 270A of the Income-tax Act resulting from user filings.',
          'Any dispute arising out of these terms shall be governed by the laws of the Republic of India and subject to arbitration under the Arbitration and Conciliation Act 1996.',
        ],
      },
    ],
  },
};
