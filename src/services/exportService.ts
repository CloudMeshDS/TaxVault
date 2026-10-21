import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { ExpenseRecord, TaxCalculationResult, UserProfile } from '../types';
import { formatCurrency, formatINR, TAX_CONFIGS, calculateQuarterlyBreakdown } from './taxRules';

/**
 * PDF / Excel / CA zip generators for the Pro exports. Server-only: imported by server.ts for
 * POST /api/exports/:kind, which checks the user's plan first. The app must not import this file
 * (that would put the Pro generators back into the bundle); it uses exportClient.ts instead.
 */
export class ExportService {
  /**
   * Generates a Tax Audit Report in PDF format adapting to NZ, AU, CA, US, and IN
   */
  public static generateIndianCAPDF(
    profile: UserProfile,
    expenses: ExpenseRecord[],
    taxResult: TaxCalculationResult,
    options: {
      includeExpenses?: boolean;
      includeGst?: boolean;
      includeVendors?: boolean;
      dateRangeLabel?: string;
    } = {}
  ): jsPDF {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const country = profile?.country || 'NZ';
    const config = TAX_CONFIGS[country] || TAX_CONFIGS['NZ'];
    const curr = profile?.defaultCurrency || config.currencyCode;
    const sym = profile?.currencySymbol || config.currencySymbol;
    const fmt = (val: number) => formatCurrency(Number(val) || 0, curr, sym, true);

    const primaryColor: [number, number, number] = [15, 23, 42]; // Slate 900
    const emeraldAccent: [number, number, number] = [16, 185, 129]; // Emerald 500

    // Top Header Banner
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, 210, 38, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(255, 255, 255);
    doc.text(`TAXVAULT · ${profile?.taxAuthority || config.taxAuthority} REPORT`, 14, 16);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(203, 213, 225);
    doc.text(`Prepared for ${config.countryName} Compliance · Tax Year: ${profile?.financialYear || config.taxYearLabel}`, 14, 23);
    doc.text(`Period: ${options.dateRangeLabel || 'Full Period'} · Generated: ${new Date().toLocaleDateString()}`, 14, 29);

    // Business & Taxpayer Details Box
    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('1. TAXPAYER & REGISTRATION PARTICULARS', 14, 46);

    const primaryTaxLabel =
      country === 'NZ' ? 'IRD Number:' :
      country === 'AU' ? 'ABN Number:' :
      country === 'CA' ? 'CRA Business No:' :
      country === 'US' ? 'EIN / SSN:' :
      'PAN Number:';
    const secondaryTaxLabel =
      country === 'NZ' ? 'GST Number:' :
      country === 'AU' ? 'TFN Number:' :
      country === 'CA' ? 'Provincial ID:' :
      country === 'US' ? 'State Tax ID:' :
      'GSTIN:';

    const taxpayerDetails = [
      ['Taxpayer / Business Name:', profile?.businessName || profile?.fullName || 'Business Entity', 'Entity Type:', profile?.businessType || 'Proprietorship'],
      ['Proprietor / Signatory:', profile?.fullName || 'Primary Account Holder', primaryTaxLabel, profile?.taxId || profile?.pan || 'Not Provided'],
      [secondaryTaxLabel, profile?.secondaryTaxId || profile?.gstin || 'Unregistered', 'Jurisdiction:', config.countryName],
      ['Tax Advisor / Accountant:', profile?.accountantName || 'Assigned Reviewer', 'Advisor Contact:', profile?.accountantPhone || profile?.accountantEmail || '-'],
    ];

    autoTable(doc, {
      startY: 50,
      body: taxpayerDetails,
      theme: 'plain',
      styles: { fontSize: 8, cellPadding: 1.5, textColor: [51, 65, 85] },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 48 },
        1: { cellWidth: 55 },
        2: { fontStyle: 'bold', cellWidth: 42 },
        3: { cellWidth: 45 },
      },
    });

    // Financial Year Summary Position
    const finalY1 = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 6 : 82;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text('2. EXPENSE & TAX DEDUCTION METRICS', 14, finalY1);

    const taxLabelName = country === 'US' ? 'Sales Tax' : country === 'CA' ? 'GST/HST/PST' : 'GST';

    const metricsData = [
      ['Total Gross Expenses Incurred', fmt(taxResult?.totalExpenses || 0)],
      ['100% Direct Business Expenses', fmt(taxResult?.businessExpenses || 0)],
      ['Mixed Usage Expenses (Apportioned)', fmt(taxResult?.mixedExpenses || 0)],
      ['Total Allowable Business Tax Deduction', fmt(taxResult?.claimableBusinessTotal || 0)],
      ['Personal / Non-Deductible Expenses', fmt(taxResult?.personalExpenses || 0)],
      [`Total ${taxLabelName} Identified`, fmt(taxResult?.totalGstIdentified || 0)],
      [`Eligible ${country === 'US' ? 'Tax Deduction' : 'Input Tax Credit (ITC)'}`, fmt(taxResult?.eligibleGstItc || 0)],
      [`Tax Marked "Needs Review" / Ineligible`, fmt(taxResult?.needsReviewGst || 0)],
    ];

    autoTable(doc, {
      startY: finalY1 + 3,
      head: [['Financial Position Metric', `Amount (${curr})`]],
      body: metricsData,
      theme: 'striped',
      headStyles: { fillColor: primaryColor, textColor: 255, fontSize: 8, fontStyle: 'bold' },
      styles: { fontSize: 8, cellPadding: 1.8 },
      columnStyles: {
        0: { cellWidth: 130 },
        1: { cellWidth: 50, halign: 'right', fontStyle: 'bold' },
      },
    });

    // Itemized Expense Records Table
    if (options.includeExpenses !== false && expenses.length > 0) {
      const finalY2 = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 8 : 150;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('3. DETAILED EXPENSE & INVOICE SCHEDULE', 14, finalY2);

      const tableRows = expenses.map(e => {
        const cgst = Number(e.cgst) || 0;
        const sgst = Number(e.sgst) || 0;
        const igst = Number(e.igst) || 0;
        const cess = Number(e.cess) || 0;
        const taxAmt = (cgst + sgst + igst + cess) || Number(e.taxAmount) || Number(e.gstAmount) || Number(e.salesTaxAmount) || 0;
        const amt = Number(e.amount) || 0;
        const claimable = Number(e.claimableBusinessAmount) || amt;

        return [
          e.date || '-',
          (e.merchant || 'Unknown Vendor').substring(0, 22),
          e.invoiceNumber || '-',
          e.vendorTaxId || e.vendorGSTIN || '-',
          (e.category || 'Other').substring(0, 16),
          e.expenseType || 'Business',
          (e.businessPercentage ?? 100) + '%',
          fmt(taxAmt),
          fmt(amt),
          fmt(claimable),
        ];
      });

      const taxHeader = country === 'US' ? 'Tax' : 'GST';
      const idHeader = country === 'US' ? 'EIN' : country === 'IN' ? 'GSTIN' : country === 'AU' ? 'ABN' : country === 'NZ' ? 'IRD' : 'BN';

      autoTable(doc, {
        startY: finalY2 + 3,
        head: [['Date', 'Vendor', 'Inv #', idHeader, 'Category', 'Type', 'Biz %', taxHeader, 'Total', 'Claimable']],
        body: tableRows,
        theme: 'striped',
        headStyles: { fillColor: primaryColor, textColor: 255, fontSize: 7, fontStyle: 'bold' },
        styles: { fontSize: 6.8, cellPadding: 1.5 },
        columnStyles: {
          0: { cellWidth: 16 },
          1: { cellWidth: 32 },
          2: { cellWidth: 18 },
          3: { cellWidth: 26 },
          4: { cellWidth: 24 },
          5: { cellWidth: 14 },
          6: { cellWidth: 12, halign: 'center' },
          7: { cellWidth: 15, halign: 'right' },
          8: { cellWidth: 16, halign: 'right' },
          9: { cellWidth: 17, halign: 'right', fontStyle: 'bold' },
        },
      });
    }

    // Footer with statutory disclaimer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `TaxVault · Generated for compliance review. Compiled from digitized vouchers. Page ${i} of ${pageCount}`,
        14,
        288
      );
    }

    return doc;
  }

  /**
   * Generates a multi-sheet Microsoft Excel (.xlsx) workbook for CA audit
   */
  public static generateIndianExcelWorkbook(
    profile: UserProfile,
    expenses: ExpenseRecord[],
    taxResult: TaxCalculationResult
  ): ArrayBuffer {
    const wb = XLSX.utils.book_new();
    const country = profile?.country || 'NZ';
    const config = TAX_CONFIGS[country] || TAX_CONFIGS['NZ'];
    const curr = profile?.defaultCurrency || config.currencyCode;
    const sym = profile?.currencySymbol || config.currencySymbol;
    const taxLabel = country === 'US' ? 'Sales Tax' : 'GST';

    // Sheet 1: Detailed Expense Register
    const expenseRows = expenses.map(e => {
      const cgst = Number(e.cgst) || 0;
      const sgst = Number(e.sgst) || 0;
      const igst = Number(e.igst) || 0;
      const cess = Number(e.cess) || 0;
      const taxAmt = (cgst + sgst + igst + cess) || Number(e.taxAmount) || Number(e.gstAmount) || Number(e.salesTaxAmount) || 0;
      const totalAmt = Number(e.amount) || 0;
      const claimable = Number(e.claimableBusinessAmount) || totalAmt;
      const taxable = Number(e.taxableAmount) || Number(e.subtotal) || totalAmt;

      return {
        'Expense ID': e.id || '',
        'Status': (e.status === 'deleted' || e.isDeleted) ? 'Deleted / Void' : 'Active',
        'Invoice Date': e.date || '',
        'Merchant / Vendor': e.merchant || 'Unknown Vendor',
        'Invoice Number': e.invoiceNumber || '',
        'Vendor Tax ID': e.vendorTaxId || e.vendorGSTIN || '',
        'State / Region': e.state || '',
        'Category': e.category || 'Other',
        'Expense Type': e.expenseType || 'Business',
        'Business Usage %': `${e.businessPercentage ?? 100}%`,
        [`Taxable Subtotal (${sym})`]: taxable,
        'Tax Rate %': Number(e.taxRate) || 0,
        [`Tax Amount (${sym})`]: taxAmt,
        [`Total Amount (${sym})`]: totalAmt,
        [`Claimable Business Deduction (${sym})`]: claimable,
        'Tax Treatment': e.gstTreatment || 'Likely eligible',
        'Review Status': e.caReviewStatus || 'Reviewed',
        'Reviewer Notes': e.caNotes || '',
        'Payment Method': e.paymentMethod || 'Other',
      };
    });
    const wsExpenses = XLSX.utils.json_to_sheet(expenseRows.length > 0 ? expenseRows : [{ 'Notice': 'No expenses recorded for this period' }]);
    XLSX.utils.book_append_sheet(wb, wsExpenses, 'Expense Register');

    // Sheet 2: Tax / GST ITC Summary
    const gstSummaryRows = [
      { 'Statutory Metric': 'Total Invoices Count', 'Value': expenses.length },
      { 'Statutory Metric': `Total Gross Value (${sym})`, 'Value': Number(taxResult?.totalExpenses) || 0 },
      { 'Statutory Metric': `Direct Business Expenses (${sym})`, 'Value': Number(taxResult?.businessExpenses) || 0 },
      { 'Statutory Metric': `Mixed Expenses (Apportioned) (${sym})`, 'Value': Number(taxResult?.mixedExpenses) || 0 },
      { 'Statutory Metric': `Total Allowable Tax Deduction (${sym})`, 'Value': Number(taxResult?.claimableBusinessTotal) || 0 },
      { 'Statutory Metric': `Total ${taxLabel} Paid (${sym})`, 'Value': Number(taxResult?.totalGstIdentified) || 0 },
      { 'Statutory Metric': `Eligible ${country === 'US' ? 'Tax Deduction' : 'Input Tax Credit'} (${sym})`, 'Value': Number(taxResult?.eligibleGstItc) || 0 },
      { 'Statutory Metric': `Tax Under Review / Ineligible (${sym})`, 'Value': Number(taxResult?.needsReviewGst) || 0 },
    ];
    const wsGst = XLSX.utils.json_to_sheet(gstSummaryRows);
    XLSX.utils.book_append_sheet(wb, wsGst, `${taxLabel} Summary`);

    // Sheet 3: Category Breakdown
    const catMap: Record<string, { total: number; business: number; gst: number; count: number }> = {};
    for (const e of expenses) {
      const cat = e.category || 'Other';
      if (!catMap[cat]) catMap[cat] = { total: 0, business: 0, gst: 0, count: 0 };
      const cgst = Number(e.cgst) || 0;
      const sgst = Number(e.sgst) || 0;
      const igst = Number(e.igst) || 0;
      const cess = Number(e.cess) || 0;
      const taxAmt = (cgst + sgst + igst + cess) || Number(e.taxAmount) || Number(e.gstAmount) || Number(e.salesTaxAmount) || 0;
      const totalAmt = Number(e.amount) || 0;
      const claimable = Number(e.claimableBusinessAmount) || totalAmt;

      catMap[cat].total += totalAmt;
      catMap[cat].business += claimable;
      catMap[cat].gst += taxAmt;
      catMap[cat].count += 1;
    }
    const catRows = Object.keys(catMap).map(cat => ({
      'Category': cat,
      'Invoices Count': catMap[cat].count,
      [`Total Spent (${sym})`]: catMap[cat].total,
      [`Claimable Business (${sym})`]: catMap[cat].business,
      [`${taxLabel} Included (${sym})`]: catMap[cat].gst,
    }));
    const wsCategory = XLSX.utils.json_to_sheet(catRows.length > 0 ? catRows : [{ 'Notice': 'No category spend recorded' }]);
    XLSX.utils.book_append_sheet(wb, wsCategory, 'Category Breakdown');

    // Sheet 4: Vendor Summary
    const vendorMap: Record<string, { total: number; taxId: string; count: number }> = {};
    for (const e of expenses) {
      const v = e.merchant || 'Unknown Vendor';
      if (!vendorMap[v]) vendorMap[v] = { total: 0, taxId: e.vendorTaxId || e.vendorGSTIN || '', count: 0 };
      vendorMap[v].total += Number(e.amount) || 0;
      vendorMap[v].count += 1;
    }
    const vendorRows = Object.keys(vendorMap).map(v => ({
      'Vendor': v,
      'Tax ID': vendorMap[v].taxId,
      'Bills Count': vendorMap[v].count,
      [`Total Spend (${sym})`]: vendorMap[v].total,
    }));
    const wsVendor = XLSX.utils.json_to_sheet(vendorRows.length > 0 ? vendorRows : [{ 'Notice': 'No vendor spend recorded' }]);
    XLSX.utils.book_append_sheet(wb, wsVendor, 'Vendor Summary');

    // Sheet 5: Quarterly Summary
    try {
      const quarterly = calculateQuarterlyBreakdown(expenses, profile?.financialYear || 'FY 2026-27', country);
      const quarterRows = quarterly.quarters.map(q => ({
        'Quarter': q.quarter,
        'Date Range': `${q.info.start} to ${q.info.end}`,
        'Months': q.info.monthsLabel,
        'Receipts Count': q.expenseCount || 0,
        [`Total Spend (${sym})`]: q.totalExpenses || 0,
        [`Claimable Business (${sym})`]: q.claimableBusinessTotal || 0,
        [`${taxLabel} Identified (${sym})`]: q.totalTaxIdentified || 0,
        [`Eligible ITC (${sym})`]: q.eligibleGstItc || 0,
        '% of Annual Spend': `${Number(q.percentageOfAnnual || 0).toFixed(1)}%`,
      }));
      const wsQuarter = XLSX.utils.json_to_sheet(quarterRows);
      XLSX.utils.book_append_sheet(wb, wsQuarter, 'Quarterly Summary');
    } catch (err) {
      console.warn('Quarterly sheet generation skipped:', err);
    }

    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    return wbout;
  }

  /**
   * Generates a complete ZIP archive containing:
   * - Official Tax Audit PDF
   * - Itemized Excel spreadsheet
   * - Original receipt files or vouchers
   * - Readme instructions for the Tax Advisor / Accountant
   */
  public static async generateCAZipPackage(
    profile: UserProfile,
    expenses: ExpenseRecord[],
    taxResult: TaxCalculationResult,
    options: {
      includeReceiptImages?: boolean;
      dateRangeLabel?: string;
    } = {}
  ): Promise<Blob> {
    const zip = new JSZip();
    const country = profile?.country || 'NZ';
    const config = TAX_CONFIGS[country] || TAX_CONFIGS['NZ'];
    const curr = profile?.defaultCurrency || config.currencyCode;
    const sym = profile?.currencySymbol || config.currencySymbol;
    const fmt = (val: number) => formatCurrency(Number(val) || 0, curr, sym, true);

    // 1. Add PDF Report
    const pdfDoc = this.generateIndianCAPDF(profile, expenses, taxResult, {
      includeExpenses: true,
      includeGst: true,
      includeVendors: true,
      dateRangeLabel: options.dateRangeLabel,
    });
    const pdfBlob = pdfDoc.output('blob');
    zip.file(`TaxVault_Tax_Report_${(profile?.financialYear || 'Current').replace(/\s+/g, '_')}.pdf`, pdfBlob);

    // 2. Add Excel Workbook
    const excelBuffer = this.generateIndianExcelWorkbook(profile, expenses, taxResult);
    zip.file(`TaxVault_Expense_Register_${(profile?.financialYear || 'Current').replace(/\s+/g, '_')}.xlsx`, excelBuffer);

    // 3. Add Readme for Advisor
    const readmeContent = `TAXVAULT COMPLIANCE PACK (${config.countryName.toUpperCase()})
=====================================================
Client: ${profile?.businessName || profile?.fullName || 'Business Entity'}
Primary Tax ID: ${profile?.taxId || profile?.pan || 'N/A'}
Secondary Tax ID: ${profile?.secondaryTaxId || profile?.gstin || 'N/A'}
Tax Authority: ${config.taxAuthority}
Financial / Tax Year: ${profile?.financialYear || config.taxYearLabel}
Period: ${options.dateRangeLabel || 'Full Period'}
Total Expenses: ${fmt(taxResult?.totalExpenses || 0)}
Business Claimable: ${fmt(taxResult?.claimableBusinessTotal || 0)}
Total ${country === 'US' ? 'Sales Tax' : 'GST/HST'} Identified: ${fmt(taxResult?.totalGstIdentified || 0)}
Eligible ${country === 'US' ? 'Tax Deduction' : 'Input Tax Credit'}: ${fmt(taxResult?.eligibleGstItc || 0)}

Files Included in this archive:
1. TaxVault_Tax_Report.pdf - Executive summary, category schedules, and itemized invoice list
2. TaxVault_Expense_Register.xlsx - Detailed multi-tab workbook
3. Receipts/ - Original digitized high-resolution vouchers (if attached)
=====================================================
Generated by TaxVault Universal Accounting Engine (${config.countryName})`;

    zip.file('README_TAX_ADVISOR.txt', readmeContent);

    // 4. Add Receipt Images folder
    if (options.includeReceiptImages !== false) {
      const receiptsFolder = zip.folder('Receipts');
      if (receiptsFolder) {
        for (let idx = 0; idx < expenses.length; idx++) {
          const exp = expenses[idx];
          const fileName = exp.receiptFileName || `Receipt_${idx + 1}_${(exp.merchant || 'Merchant').replace(/[^a-zA-Z0-9]/g, '_')}.txt`;

          if (exp.receiptUrl && exp.receiptUrl.startsWith('data:image')) {
            const base64Data = exp.receiptUrl.split(',')[1];
            receiptsFolder.file(fileName, base64Data, { base64: true });
          } else {
            const vCurr = exp.currency || curr;
            const vSym = exp.currencySymbol || sym;
            const taxAmt = (Number(exp.cgst) || 0) + (Number(exp.sgst) || 0) + (Number(exp.igst) || 0) || Number(exp.taxAmount) || Number(exp.gstAmount) || Number(exp.salesTaxAmount) || 0;
            const voucherText = `VOUCHER #${exp.invoiceNumber || exp.id}
Date: ${exp.date || '-'}
Merchant: ${exp.merchant || 'Unknown'}
Tax ID: ${exp.vendorTaxId || exp.vendorGSTIN || 'N/A'}
Total Amount: ${formatCurrency(Number(exp.amount) || 0, vCurr, vSym, true)}
Tax Total: ${formatCurrency(taxAmt, vCurr, vSym, true)}
Category: ${exp.category || 'Other'}
Expense Type: ${exp.expenseType || 'Business'} (${exp.businessPercentage ?? 100}%)
Claimable Amount: ${formatCurrency(Number(exp.claimableBusinessAmount) || Number(exp.amount) || 0, vCurr, vSym, true)}
Review Status: ${exp.caReviewStatus || 'Reviewed'}
Notes: ${exp.caNotes || 'No notes'}`;
            receiptsFolder.file(`${fileName}.txt`, voucherText);
          }
        }
      }
    }

    return await zip.generateAsync({ type: 'blob' });
  }
}
