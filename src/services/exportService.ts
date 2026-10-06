import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { AccountantShareToken, ExpenseRecord, IncomeRecord, TaxCalculationResult, UserProfile } from '../types';
import { TAX_CONFIGS } from './taxRules';

export class ExportService {
  /**
   * Generates an official, publication-grade Chartered Accountant Tax Audit Report in PDF format
   */
  public static generateAccountantTaxPDF(
    profile: UserProfile,
    expenses: ExpenseRecord[],
    incomes: IncomeRecord[],
    taxResult: TaxCalculationResult
  ) {
    const config = TAX_CONFIGS[profile.country] || TAX_CONFIGS.NZ;
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const primaryColor: [number, number, number] = [15, 23, 42]; // Slate 900
    const accentGreen: [number, number, number] = [5, 150, 105]; // Emerald 600

    // Header Background
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, 210, 40, 'F');

    // Title & Brand
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.text('TAX COMPLIANCE & FINANCIAL AUDIT PACK', 14, 18);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(203, 213, 225);
    doc.text(`Prepared for Chartered Accountant Tax Filing · ${config.taxAuthority}`, 14, 25);
    doc.text(`Financial Year End: ${profile.financialYearEnding} · Generated: ${new Date().toLocaleDateString('en-GB')}`, 14, 31);

    // Entity & Taxpayer Information Box
    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('1. TAXPAYER & REGULATORY REGISTRATION', 14, 49);

    const taxpayerInfo = [
      ['Taxpayer / Trading Entity:', profile.fullName, 'Entity Classification:', profile.entityType.toUpperCase().replace('_', ' ')],
      ['Tax ID Number (IRD/TFN):', profile.taxNumber || 'Not Stated', 'GST / VAT Registered:', profile.gstRegistered ? `YES (GST No: ${profile.gstNumber || profile.taxNumber})` : 'NO'],
      ['Reporting Jurisdiction:', `${config.countryName} (${config.countryCode})`, 'Base Accounting Currency:', `${config.currencyCode} (${config.currencySymbol})`],
      ['Accountant / CA Advisor:', profile.accountantName || 'Assigned Reviewer', 'Advisor Email:', profile.accountantEmail || 'ca@review.tax'],
    ];

    autoTable(doc, {
      startY: 53,
      body: taxpayerInfo,
      theme: 'plain',
      styles: { fontSize: 8.5, cellPadding: 1.5, textColor: [51, 65, 85] },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 50 },
        1: { cellWidth: 55 },
        2: { fontStyle: 'bold', cellWidth: 45 },
        3: { cellWidth: 40 },
      },
    });

    // Tax Position & IRD Compliance Summary
    const finalY1 = (doc as any).lastAutoTable.finalY + 6;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.text(`2. FINANCIAL YEAR POSITION (${config.currencyCode})`, 14, finalY1);

    const summaryData = [
      ['Gross Operating Revenue (excl. GST)', `${config.currencySymbol}${taxResult.totalGrossIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}`],
      ['Total Allowable Deductible Expenses', `(${config.currencySymbol}${taxResult.totalDeductibleExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 })})`],
      ['Net Taxable Income / Profit', `${config.currencySymbol}${taxResult.netTaxableIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}`],
      ['Estimated Progressive Income Tax', `${config.currencySymbol}${taxResult.estimatedIncomeTax.toLocaleString('en-US', { minimumFractionDigits: 2 })}`],
      ['Effective Tax Rate', `${(taxResult.effectiveTaxRate * 100).toFixed(1)}%`],
      ['GST / VAT Collected on Sales', `${config.currencySymbol}${taxResult.totalGstCollected.toLocaleString('en-US', { minimumFractionDigits: 2 })}`],
      ['GST / VAT Paid on Business Purchases', `${config.currencySymbol}${taxResult.totalGstPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })}`],
      [
        taxResult.netGstPayableOrRefund >= 0 ? 'Net GST Payable to Revenue' : 'Net GST Refund Due from Revenue',
        `${config.currencySymbol}${Math.abs(taxResult.netGstPayableOrRefund).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
      ],
    ];

    autoTable(doc, {
      startY: finalY1 + 3,
      head: [['Statutory Reporting Metric', 'Amount']],
      body: summaryData,
      theme: 'striped',
      headStyles: { fillColor: primaryColor, textColor: 255, fontSize: 8.5, fontStyle: 'bold' },
      styles: { fontSize: 8.5, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 130 },
        1: { cellWidth: 50, halign: 'right', fontStyle: 'bold' },
      },
    });

    // Categorized Schedule of Deductible Expenses
    const finalY2 = (doc as any).lastAutoTable.finalY + 6;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.text('3. ITEMISED EXPENSES & AUDIT TRAIL', 14, finalY2);

    const expenseRows = expenses.map(exp => [
      exp.date,
      exp.merchant,
      exp.category,
      exp.receiptNumber || 'None',
      `${config.currencySymbol}${exp.amount.toFixed(2)}`,
      `${config.currencySymbol}${exp.gstAmount.toFixed(2)}`,
      `${exp.deductiblePercentage}%`,
      `${config.currencySymbol}${((exp.amount - (profile.gstRegistered ? exp.gstAmount : 0)) * (exp.deductiblePercentage / 100)).toFixed(2)}`,
    ]);

    autoTable(doc, {
      startY: finalY2 + 3,
      head: [['Date', 'Merchant / Payee', 'Category', 'Receipt #', 'Gross Total', 'GST', 'Deduct %', 'Tax Claim']],
      body: expenseRows,
      theme: 'striped',
      headStyles: { fillColor: [51, 65, 85], textColor: 255, fontSize: 8 },
      styles: { fontSize: 7.5, cellPadding: 1.8 },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 42 },
        2: { cellWidth: 34 },
        3: { cellWidth: 24 },
        4: { cellWidth: 20, halign: 'right' },
        5: { cellWidth: 16, halign: 'right' },
        6: { cellWidth: 16, halign: 'center' },
        7: { cellWidth: 22, halign: 'right', fontStyle: 'bold' },
      },
    });

    // CA Sign-off Block on footer or last page
    const finalY3 = (doc as any).lastAutoTable.finalY + 8;
    if (finalY3 < 250) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text('CHARTERED ACCOUNTANT COMPLIANCE VERIFICATION', 14, finalY3);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text('I confirm that I have reviewed the supporting receipt vouchers and statutory calculations in accordance with local Tax Acts.', 14, finalY3 + 4);
      doc.line(14, finalY3 + 14, 90, finalY3 + 14);
      doc.text('Authorized CA Signature', 14, finalY3 + 18);
      doc.line(120, finalY3 + 14, 180, finalY3 + 14);
      doc.text('Practicing Certificate / Member No.', 120, finalY3 + 18);
    }

    doc.save(`TaxVault_${profile.country}_TaxReport_${new Date().toISOString().split('T')[0]}.pdf`);
  }

  /**
   * Generates a multi-sheet Microsoft Excel (.xlsx) workbook for Chartered Accountants
   */
  public static generateAccountantExcel(
    profile: UserProfile,
    expenses: ExpenseRecord[],
    incomes: IncomeRecord[],
    taxResult: TaxCalculationResult
  ) {
    const config = TAX_CONFIGS[profile.country] || TAX_CONFIGS.NZ;
    const wb = XLSX.utils.book_new();

    // 1. Tax Summary Sheet
    const summarySheetData = [
      ['TAX COMPLIANCE REPORT', ''],
      ['Tax Authority:', config.taxAuthority],
      ['Taxpayer Name:', profile.fullName],
      ['Tax / IRD Number:', profile.taxNumber],
      ['GST Registered:', profile.gstRegistered ? 'YES' : 'NO'],
      ['Financial Year End:', profile.financialYearEnding],
      ['Base Currency:', config.currencyCode],
      ['', ''],
      ['FINANCIAL SUMMARY', 'AMOUNT (' + config.currencyCode + ')'],
      ['Gross Operating Revenue (excl GST)', taxResult.totalGrossIncome],
      ['Total Allowable Deductible Expenses', taxResult.totalDeductibleExpenses],
      ['Net Taxable Income / Profit', taxResult.netTaxableIncome],
      ['Estimated Income Tax Liability', taxResult.estimatedIncomeTax],
      ['Effective Tax Rate', `${(taxResult.effectiveTaxRate * 100).toFixed(2)}%`],
      ['Total GST Collected on Sales', taxResult.totalGstCollected],
      ['Total GST Paid on Expenses', taxResult.totalGstPaid],
      ['Net GST Position (Payable/Refund)', taxResult.netGstPayableOrRefund],
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summarySheetData);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Tax Summary');

    // 2. Expenses Schedule Sheet
    const expensesSheetData = [
      [
        'ID',
        'Date',
        'Merchant',
        'Category',
        'Description',
        `Gross Total (${config.currencyCode})`,
        `GST Included (${config.currencyCode})`,
        'Net (excl GST)',
        'Deductible %',
        'Allowable Tax Claim',
        'Payment Method',
        'Receipt Voucher #',
        'Original Foreign Currency',
        'Notes',
      ],
      ...expenses.map(e => {
        const net = profile.gstRegistered ? e.amount - e.gstAmount : e.amount;
        const claim = net * (e.deductiblePercentage / 100);
        return [
          e.id,
          e.date,
          e.merchant,
          e.category,
          e.description,
          e.amount,
          e.gstAmount,
          net,
          `${e.deductiblePercentage}%`,
          claim,
          e.paymentMethod,
          e.receiptNumber || '',
          e.originalCurrency ? `${e.originalCurrency} ${e.originalAmount}` : '',
          e.notes || '',
        ];
      }),
    ];
    const wsExpenses = XLSX.utils.aoa_to_sheet(expensesSheetData);
    XLSX.utils.book_append_sheet(wb, wsExpenses, 'All Expenses Audit');

    // 3. Revenue Sheet
    const incomeSheetData = [
      ['Date', 'Client / Payer', 'Description', `Gross Revenue (${config.currencyCode})`, 'GST Collected', 'Invoice Ref #'],
      ...incomes.map(inc => [inc.date, inc.client, inc.description, inc.amount, inc.gstAmount, inc.invoiceNumber || '']),
    ];
    const wsIncome = XLSX.utils.aoa_to_sheet(incomeSheetData);
    XLSX.utils.book_append_sheet(wb, wsIncome, 'Revenue Schedule');

    // Write file
    XLSX.writeFile(wb, `TaxVault_CA_Audit_${profile.country}_${new Date().toISOString().split('T')[0]}.xlsx`);
  }

  /**
   * Generates standard CSV for Xero, MYOB, or IRD upload
   */
  public static generateCSV(expenses: ExpenseRecord[]) {
    const headers = ['Date', 'Merchant', 'Category', 'Description', 'Amount', 'GST', 'DeductiblePercent', 'ReceiptNumber', 'PaymentMethod'];
    const rows = expenses.map(e => [
      e.date,
      `"${e.merchant.replace(/"/g, '""')}"`,
      `"${e.category}"`,
      `"${(e.description || '').replace(/"/g, '""')}"`,
      e.amount.toFixed(2),
      e.gstAmount.toFixed(2),
      e.deductiblePercentage,
      `"${e.receiptNumber || ''}"`,
      `"${e.paymentMethod}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `TaxVault_Expenses_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Creates a secure sharing token with access PIN for chartered accountants
   */
  public static createAccountantShareToken(): AccountantShareToken {
    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    const token = 'CA-' + Math.random().toString(36).substring(2, 10).toUpperCase() + '-' + Date.now().toString(36).toUpperCase();
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 30); // 30 days access

    return {
      token,
      pin,
      expiryDate: expiry.toISOString().split('T')[0],
      createdAt: new Date().toISOString(),
      readOnly: true,
      includeReceiptImages: true,
    };
  }
}
